// app/api/push/carpool/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type CarpoolAction = "request" | "offer"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i += 1) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 12000 + Math.abs(h % 100000)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const action: CarpoolAction | null = body?.action ?? null
    const matchId: string | null = body?.match_id ?? null
    const teamId: string | null = body?.team_id ?? null
    const seats = Number(body?.seats ?? 0)
    const meetingPoint = String(body?.meeting_point ?? "").trim()
    const departureTime = String(body?.departure_time ?? "").trim()

    if (!action || !["request", "offer"].includes(action) || !matchId || !teamId) {
      return NextResponse.json({ success: false, error: "Missing or invalid params" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const { data: authData, error: authError } = await supabase.auth.getUser(bearer)
    const authUserId = authData?.user?.id

    if (authError || !authUserId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const { data: senderProfile } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("user_id", authUserId)
      .maybeSingle()

    if (!senderProfile?.player_id) {
      return NextResponse.json({ success: false, error: "No player profile" }, { status: 403 })
    }

    const [{ data: senderMembership }, { data: match }, { data: team }, { data: senderPlayer }] =
      await Promise.all([
        supabase
          .from("team_members")
          .select("player_id")
          .eq("team_id", teamId)
          .eq("player_id", senderProfile.player_id)
          .is("left_at", null)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id,home_team_id,away_team_id,home_team_type,away_team_type")
          .eq("id", matchId)
          .maybeSingle(),
        supabase.from("teams").select("id,name,chat_room_id").eq("id", teamId).maybeSingle(),
        supabase.from("club_players").select("id,name").eq("id", senderProfile.player_id).maybeSingle(),
      ])

    if (!senderMembership) {
      return NextResponse.json({ success: false, error: "Not a team member" }, { status: 403 })
    }

    if (!match || !team) {
      return NextResponse.json({ success: false, error: "Match or team not found" }, { status: 404 })
    }

    const teamIsInMatch =
      (match.home_team_type === "own" && match.home_team_id === teamId) ||
      (match.away_team_type === "own" && match.away_team_id === teamId)

    if (!teamIsInMatch) {
      return NextResponse.json({ success: false, error: "Team does not belong to this match" }, { status: 400 })
    }

    const { data: teamMembers, error: membersError } = await supabase
      .from("team_members")
      .select("player_id")
      .eq("team_id", teamId)
      .is("left_at", null)

    if (membersError) throw membersError

    const playerIds = Array.from(
      new Set(((teamMembers as any[]) || []).map((x) => x.player_id).filter(Boolean)),
    )

    if (!playerIds.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id,player_id")
      .in("player_id", playerIds)

    if (profilesError) throw profilesError

    const recipientUserIds = Array.from(
      new Set(
        ((profiles as any[]) || [])
          .map((x) => x.user_id)
          .filter((id) => id && id !== authUserId),
      ),
    ) as string[]

    if (!recipientUserIds.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 })
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", recipientUserIds)

    if (tokenError) throw tokenError

    const tokens = Array.from(
      new Set(((tokenRows as any[]) || []).map((x) => x.token).filter(Boolean)),
    ) as string[]

    if (!tokens.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 })
    }

    const senderName = senderPlayer?.name || "Jemand aus deinem Team"
    const roomId = team.chat_room_id ? String(team.chat_room_id) : ""
    const clickUrl = roomId
      ? `/chat-app?scope=team&room_id=${encodeURIComponent(roomId)}`
      : `/chat-app?tab=chats`

    const tag = `emd-carpool:${teamId}:${matchId}:${action}:${authUserId}`

    const conversation = action === "offer" ? "🚗 Fahrgemeinschaft" : "🙋 Mitfahrt gesucht"

    const pushBody =
      action === "offer"
        ? `${senderName} bietet eine Fahrt an · ${Math.max(1, seats || 1)} Platz${Math.max(1, seats || 1) === 1 ? "" : "plätze"} frei${departureTime ? ` · ${departureTime} Uhr` : ""}${meetingPoint ? ` · ${meetingPoint}` : ""}`
        : `${senderName} braucht eine Mitfahrgelegenheit.`

    // DATA-ONLY: damit der vorhandene native MessagingService den Klick
    // wieder korrekt in den EMD Messenger / Teamchat leitet.
    const multicast = await getFirebaseAdmin().messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "carpool",
        action,
        match_id: String(matchId),
        team_id: String(teamId),
        clickUrl,
        url: clickUrl,
        conversation,
        body: pushBody,
        tag,
        notif_id: String(stableNotifIdFromTag(tag)),
        ts: String(Date.now()),
      },
      android: {
        priority: "high",
      },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
      targetedUsers: recipientUserIds.length,
      targetedDevices: tokens.length,
    })
  } catch (error: any) {
    console.error("[carpool-push] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Carpool push failed" },
      { status: 500 },
    )
  }
}

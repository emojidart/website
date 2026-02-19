// app/api/push/lineup/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type LineupAction = "confirmed" | "changed"

function normalizePreview(text: string) {
  const t = (text || "").trim()
  if (!t) return ""
  return t.length > 240 ? t.slice(0, 240) + "…" : t
}

function makeLineupTag(team_id: string, match_id: string, action: LineupAction) {
  return `lineup:${action}:${team_id}:${match_id}`
}

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) | 0
  }
  return 3000 + Math.abs(h % 100000)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const team_id: string | null = body?.team_id ?? null
    const match_id: string | null = body?.match_id ?? null
    const action: LineupAction | null = body?.action ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null
    const note: string | null = body?.note ?? null // optional

    if (!team_id || !match_id || !action || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      },
    )

    // Token validieren
    const { data: senderAuth, error: authErr } = await supabase.auth.getUser(bearer)
    if (authErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
    const senderAuthUserId = senderAuth.user.id

    // Sender Profile check (wie bei dir im Chat)
    const { data: senderProfile } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("id", sender_profile_id)
      .maybeSingle()

    if (!senderProfile) {
      return NextResponse.json({ success: false, error: "Sender profile not found" }, { status: 400 })
    }
    if ((senderProfile as any).user_id !== senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    // Sender Name
    let senderName = "Jemand"
    const senderPlayerId = (senderProfile as any).player_id
    if (senderPlayerId) {
      const { data: cp } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderPlayerId)
        .maybeSingle()
      if ((cp as any)?.name) senderName = (cp as any).name
    }

    // Team info (für Titel/Icon)
    const { data: teamRow } = await supabase
      .from("teams")
      .select("id,name,logo_url")
      .eq("id", team_id)
      .maybeSingle()

    const teamName = (teamRow as any)?.name ?? "Team"
    const iconUrl: string | null = (teamRow as any)?.logo_url ?? null

    // Match info (für Datum etc. optional)
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id,match_date,match_time,venue")
      .eq("id", match_id)
      .maybeSingle()

    const when = (matchRow as any)?.match_date ? String((matchRow as any).match_date) : ""

    // Targets: alle Team-Mitglieder
    const { data: mems } = await supabase
      .from("team_members")
      .select("player_id")
      .eq("team_id", team_id)
      .is("left_at", null)

    const playerIds = Array.from(new Set(((mems as any[]) || []).map((m) => m.player_id).filter(Boolean)))

    const { data: profs } = await supabase
      .from("user_profiles")
      .select("user_id")
      .in("player_id", playerIds)

    let targetAuthUserIds = Array.from(new Set(((profs as any[]) || []).map((p) => p.user_id).filter(Boolean)))

    // nicht an mich selbst
    targetAuthUserIds = targetAuthUserIds.filter((uid) => uid !== senderAuthUserId)

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const { data: rows } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    const tokens = Array.from(new Set(((rows as any[]) || []).map((r) => r.token).filter(Boolean)))

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Text bauen
    const title = `📋 ${teamName}`
    const bodyLine =
      action === "confirmed"
        ? `${senderName} hat die Aufstellung bestätigt.`
        : `${senderName} hat die Aufstellung geändert (neu bestätigen).`

    const extra = normalizePreview(note || "")
    const message = extra ? `${bodyLine}\n${extra}` : bodyLine

    // Click URL: wohin soll die App springen?
    // -> passe das an deine echte Seite an (z.B. /member-availability-app oder dein Dialog deep link)
    const clickUrl = `/member-availability-app?match_id=${encodeURIComponent(match_id)}&team_id=${encodeURIComponent(team_id)}`

    const tag = makeLineupTag(team_id, match_id, action)
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()
    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "lineup",
        action: String(action),
        team_id: String(team_id),
        match_id: String(match_id),
        clickUrl,
        conversation: String(title),
        senderName: String(senderName),
        message: String(message),
        body: String(message),
        tag: String(tag),
        notif_id: String(notif_id),
        iconUrl: iconUrl || "",
        when,
        ts: String(Date.now()),
      },
      android: { priority: "high" },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
    })
  } catch (e: any) {
    console.error("[push-lineup-fcm] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}

// app/api/push/lineup-confirmation-alert/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type RecipientMode = "captain" | "co_captain" | "both"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i += 1) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 9000 + Math.abs(h % 100000)
}

function formatDate(dateString?: string | null) {
  if (!dateString) return ""
  const d = new Date(`${dateString}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("de-AT") : String(dateString)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const matchId: string | null = body?.match_id ?? null
    const teamId: string | null = body?.team_id ?? null
    const recipient: RecipientMode | null = body?.recipient ?? null

    if (!matchId || !teamId || !recipient || !["captain", "co_captain", "both"].includes(recipient)) {
      return NextResponse.json({ success: false, error: "Missing or invalid params" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null
    if (!bearer) return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const { data: authData, error: authError } = await supabase.auth.getUser(bearer)
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from("user_profiles")
      .select("id,is_admin")
      .eq("user_id", authData.user.id)
      .maybeSingle()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const [{ data: match }, { data: team }] = await Promise.all([
      supabase
        .from("matches")
        .select("id,match_date,match_time,home_team_id,away_team_id,home_team_type,away_team_type,home_opponent_team_id,away_opponent_team_id")
        .eq("id", matchId)
        .maybeSingle(),
      supabase.from("teams").select("id,name").eq("id", teamId).maybeSingle(),
    ])

    if (!match) return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 })
    if (!team) return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 })

    const teamIsInMatch =
      (match.home_team_type === "own" && match.home_team_id === teamId) ||
      (match.away_team_type === "own" && match.away_team_id === teamId)

    if (!teamIsInMatch) {
      return NextResponse.json({ success: false, error: "Team does not belong to this match" }, { status: 400 })
    }

    const { data: header } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .maybeSingle()

    const alreadyConfirmed =
      header?.status === "confirmed" &&
      header?.confirmed_version != null &&
      header?.confirmed_version === header?.current_version

    if (alreadyConfirmed) {
      return NextResponse.json({ success: false, error: "Die Aufstellung ist bereits bestätigt." }, { status: 409 })
    }

    const roles =
      recipient === "captain"
        ? ["Captain"]
        : recipient === "co_captain"
          ? ["Co-Captain"]
          : ["Captain", "Co-Captain"]

    const { data: leaders, error: leadersError } = await supabase
      .from("team_members")
      .select("player_id,role,club_players:club_players!team_members_player_id_fkey(name)")
      .eq("team_id", teamId)
      .is("left_at", null)
      .in("role", roles)

    if (leadersError) throw leadersError

    const playerIds = Array.from(new Set(((leaders as any[]) || []).map((x) => x.player_id).filter(Boolean)))
    const recipientNames = Array.from(
      new Set(
        ((leaders as any[]) || [])
          .map((x) => x?.club_players?.name)
          .filter(Boolean),
      ),
    ) as string[]

    if (playerIds.length === 0) {
      await supabase.from("emd_lineup_alert_log").insert({
        sent_by_user_id: authData.user.id,
        sent_by_profile_id: adminProfile.id,
        match_id: matchId,
        team_id: teamId,
        recipient_mode: recipient,
        recipient_user_ids: [],
        recipient_player_ids: [],
        recipient_names: [],
        targeted_users: 0,
        targeted_devices: 0,
        sent_count: 0,
        failed_count: 0,
        status: "no_recipient",
        error_message: "Keine passende Führungsrolle gefunden.",
      })

      return NextResponse.json({ success: true, sent: 0, failed: 0, recipient })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id,player_id")
      .in("player_id", playerIds)

    if (profilesError) throw profilesError

    const userIds = Array.from(new Set(((profiles as any[]) || []).map((x) => x.user_id).filter(Boolean)))
    if (userIds.length === 0) {
      await supabase.from("emd_lineup_alert_log").insert({
        sent_by_user_id: authData.user.id,
        sent_by_profile_id: adminProfile.id,
        match_id: matchId,
        team_id: teamId,
        recipient_mode: recipient,
        recipient_user_ids: [],
        recipient_player_ids: playerIds,
        recipient_names: recipientNames,
        targeted_users: 0,
        targeted_devices: 0,
        sent_count: 0,
        failed_count: 0,
        status: "no_user",
        error_message: "Kein Benutzerkonto für die ausgewählte Führungsrolle gefunden.",
      })

      return NextResponse.json({ success: true, sent: 0, failed: 0, recipient })
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", userIds)

    if (tokenError) throw tokenError

    const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((x) => x.token).filter(Boolean))) as string[]
    if (tokens.length === 0) {
      await supabase.from("emd_lineup_alert_log").insert({
        sent_by_user_id: authData.user.id,
        sent_by_profile_id: adminProfile.id,
        match_id: matchId,
        team_id: teamId,
        recipient_mode: recipient,
        recipient_user_ids: userIds,
        recipient_player_ids: playerIds,
        recipient_names: recipientNames,
        targeted_users: userIds.length,
        targeted_devices: 0,
        sent_count: 0,
        failed_count: 0,
        status: "no_token",
        error_message: "Kein registriertes Push-Gerät vorhanden.",
      })

      return NextResponse.json({ success: true, sent: 0, failed: 0, recipient })
    }

    let homeName = "Heimteam"
    let awayName = "Gastteam"

    if (match.home_team_type === "own" && match.home_team_id) {
      const { data } = await supabase.from("teams").select("name").eq("id", match.home_team_id).maybeSingle()
      if (data?.name) homeName = data.name
    } else if (match.home_opponent_team_id) {
      const { data } = await supabase.from("opponent_teams").select("name").eq("id", match.home_opponent_team_id).maybeSingle()
      if (data?.name) homeName = data.name
    }

    if (match.away_team_type === "own" && match.away_team_id) {
      const { data } = await supabase.from("teams").select("name").eq("id", match.away_team_id).maybeSingle()
      if (data?.name) awayName = data.name
    } else if (match.away_opponent_team_id) {
      const { data } = await supabase.from("opponent_teams").select("name").eq("id", match.away_opponent_team_id).maybeSingle()
      if (data?.name) awayName = data.name
    }

    const dateText = formatDate(match.match_date)
    const timeText = match.match_time ? `${String(match.match_time).slice(0, 5)} Uhr` : ""
    const whenText = [dateText, timeText].filter(Boolean).join(" · ")

    const clickUrl =
      `/member-availability?match_id=${encodeURIComponent(matchId)}` +
      `&team_id=${encodeURIComponent(teamId)}` +
      `&emd_alert=lineup-confirmation`

    const tag = `emd-lineup-confirmation:${teamId}:${matchId}:${recipient}`

    const multicast = await getFirebaseAdmin().messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "🚨 EMD ALERT",
        body: `Aufstellung noch nicht bestätigt · ${team.name} · ${whenText}`,
      },
      data: {
        type: "lineup_confirmation_alert",
        match_id: String(matchId),
        team_id: String(teamId),
        recipient: String(recipient),
        clickUrl,
        url: clickUrl,
        conversation: "🚨 EMD ALERT",
        body: `Aufstellung noch nicht bestätigt!\n${homeName} vs. ${awayName}\n${whenText}`,
        tag,
        notif_id: String(stableNotifIdFromTag(tag)),
        ts: String(Date.now()),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "emd_alert_v2",
          sound: "emd_alert_siren",
          color: "#ef4444",
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          notificationCount: 1,
        },
      },
    })

    const logStatus =
      multicast.successCount > 0 && multicast.failureCount === 0
        ? "sent"
        : multicast.successCount > 0
          ? "partial"
          : "failed"

    await supabase.from("emd_lineup_alert_log").insert({
      sent_by_user_id: authData.user.id,
      sent_by_profile_id: adminProfile.id,
      match_id: matchId,
      team_id: teamId,
      recipient_mode: recipient,
      recipient_user_ids: userIds,
      recipient_player_ids: playerIds,
      recipient_names: recipientNames,
      targeted_users: userIds.length,
      targeted_devices: tokens.length,
      sent_count: multicast.successCount,
      failed_count: multicast.failureCount,
      status: logStatus,
      error_message:
        multicast.failureCount > 0
          ? "Mindestens ein Gerät konnte nicht erreicht werden."
          : null,
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
      recipient,
      recipientNames,
      targetedUsers: userIds.length,
      targetedDevices: tokens.length,
    })
  } catch (error: any) {
    console.error("[lineup-confirmation-alert] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "EMD Alert failed" },
      { status: 500 },
    )
  }
}

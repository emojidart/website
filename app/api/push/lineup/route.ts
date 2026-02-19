// app/api/push/lineup/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type LineupAction = "confirmed" | "changed"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) | 0
  }
  return 3000 + Math.abs(h % 100000)
}

function makeLineupTag(team_id: string, match_id: string, action: LineupAction) {
  return `lineup:${action}:${team_id}:${match_id}`
}

function asBullets(names: string[]) {
  if (!names || names.length === 0) return "—"
  return names.map((n) => `• ${n}`).join("\n")
}

function formatDateDE(dateString: string) {
  const d = new Date(`${dateString}T00:00:00`)
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${wd} ${day}.${month}`
}

function formatTimeHHMM(timeString?: string | null) {
  if (!timeString) return ""
  const parts = String(timeString).split(":")
  if (parts.length < 2) return ""
  return `${parts[0]}:${parts[1]}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const team_id: string | null = body?.team_id ?? null
    const match_id: string | null = body?.match_id ?? null
    const action: LineupAction | null = body?.action ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!team_id || !match_id || !action || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    // ---- Bearer Token prüfen ----
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
      }
    )

    // ---- Token validieren ----
    const { data: senderAuth, error: authErr } = await supabase.auth.getUser(bearer)
    if (authErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
    const senderAuthUserId = senderAuth.user.id

    // ---- Sender Profile check ----
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

    // ---- Sender Name ----
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

    // ---- Team Infos (Icon) ----
    const { data: teamRow } = await supabase
      .from("teams")
      .select("id,name,logo_url")
      .eq("id", team_id)
      .maybeSingle()

    const teamName = (teamRow as any)?.name ?? "Team"
    const iconUrl: string | null = (teamRow as any)?.logo_url ?? null

    // ---- Match holen (mit team_type + IDs) ----
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select(`
        id,
        match_date,
        match_time,
        home_team_type,
        away_team_type,
        home_team_id,
        away_team_id,
        home_opponent_team_id,
        away_opponent_team_id
      `)
      .eq("id", match_id)
      .maybeSingle()

    if (matchErr || !match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 400 })
    }

    const dateLine = match.match_date ? formatDateDE(String(match.match_date)) : ""
    const timeHHMM = formatTimeHHMM((match as any).match_time ?? null)
    const timeBadge = timeHHMM ? `🕒 ${timeHHMM}` : "" // "Badge" Style

    // ---- Namen auflösen nach team_type ----
    let homeName: string | null = null
    let awayName: string | null = null

    if ((match as any).home_team_type === "own") {
      if ((match as any).home_team_id) {
        const { data: t } = await supabase.from("teams").select("name").eq("id", (match as any).home_team_id).maybeSingle()
        homeName = (t as any)?.name ?? null
      }
    } else if ((match as any).home_team_type === "opponent") {
      if ((match as any).home_opponent_team_id) {
        const { data: o } = await supabase.from("opponent_teams").select("name").eq("id", (match as any).home_opponent_team_id).maybeSingle()
        homeName = (o as any)?.name ?? null
      }
    }

    if ((match as any).away_team_type === "own") {
      if ((match as any).away_team_id) {
        const { data: t } = await supabase.from("teams").select("name").eq("id", (match as any).away_team_id).maybeSingle()
        awayName = (t as any)?.name ?? null
      }
    } else if ((match as any).away_team_type === "opponent") {
      if ((match as any).away_opponent_team_id) {
        const { data: o } = await supabase.from("opponent_teams").select("name").eq("id", (match as any).away_opponent_team_id).maybeSingle()
        awayName = (o as any)?.name ?? null
      }
    }

    homeName = homeName ?? "Heimteam"
    awayName = awayName ?? "Gastteam"

    // ---- Lineup laden (einmal) ----
    const { data: lu } = await supabase
      .from("match_lineups")
      .select("player_id, position, is_substitute, club_players:club_players(name)")
      .eq("match_id", match_id)
      .eq("team_id", team_id)
      .order("is_substitute", { ascending: true })
      .order("position", { ascending: true })

    const rows = (lu as any[]) || []

    const starters = rows
      .filter((r) => !r.is_substitute)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((r) => r.club_players?.name)
      .filter(Boolean) as string[]

    const subs = rows
      .filter((r) => r.is_substitute)
      .map((r) => r.club_players?.name)
      .filter(Boolean) as string[]

    // ---- Header schön: Datum + Badge, darunter Teams ----
    const headerLine1 = [dateLine, timeBadge].filter(Boolean).join("  ")
    const headerLine2 = `${homeName} vs ${awayName}`

    const statusLine =
      action === "confirmed"
        ? `${senderName} hat die Aufstellung bestätigt ✅`
        : `${senderName} hat die Aufstellung geändert ⚠️`

    const bodyText =
      `${headerLine1}\n${headerLine2}\n\n` +
      `${statusLine}\n\n` +
      `🎯 Fix (Stamm):\n${asBullets(starters)}\n\n` +
      `🔁 Ersatz:\n${asBullets(subs)}`

    // ---- Targets: Team-Mitglieder (ohne Sender) ----
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
    targetAuthUserIds = targetAuthUserIds.filter((uid) => uid !== senderAuthUserId)

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean)))
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // ---- FCM senden ----
    const admin = getFirebaseAdmin()

    const clickUrl = `/member-availability`
    const tag = makeLineupTag(team_id, match_id, action)
    const notif_id = stableNotifIdFromTag(tag)

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "lineup",
        action: String(action),
        team_id: String(team_id),
        match_id: String(match_id),

        clickUrl: String(clickUrl),
        conversation: `📋 Aufstellung • ${teamName}`,
        body: String(bodyText),

        tag: String(tag),
        notif_id: String(notif_id),
        iconUrl: iconUrl || "",
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

// app/api/push/availability-reminder/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 4000 + Math.abs(h % 100000)
}

function formatDateWithYear(dateString: string) {
  const d = new Date(`${dateString}T00:00:00`)
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear())
  return `${wd}, ${day}.${month}.${year}`
}

function formatTimePlain(timeString?: string | null) {
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
    const target_player_id: string | null = body?.target_player_id ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!team_id || !match_id || !target_player_id || !sender_profile_id) {
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
	
		// 🔒 30 Minuten Cooldown prüfen
const { data: lastReminder, error: lastErr } = await supabase
  .from("match_availability_reminders")
  .select("sent_at")
  .eq("match_id", match_id)
  .eq("team_id", team_id)
  .eq("player_id", target_player_id)
  .order("sent_at", { ascending: false })
  .limit(1)
  .maybeSingle()

if (lastErr) {
  console.error("[availability-reminder] cooldown lookup failed:", lastErr)
}

if (lastReminder?.sent_at) {
  const last = new Date(lastReminder.sent_at).getTime()
  const now = Date.now()
  const diffMinutes = (now - last) / 1000 / 60

  if (diffMinutes < 30) {
    return NextResponse.json({
      success: false,
      cooldown: true,
      minutes_left: Math.ceil(30 - diffMinutes),
    })
  }
}
	

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

    const senderPlayerId = (senderProfile as any).player_id as string | null

    // ---- Nur Captain / Co-Captain darf erinnern ----
    if (!senderPlayerId) {
      return NextResponse.json({ success: false, error: "Sender has no player_id" }, { status: 400 })
    }

    const { data: senderMembership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team_id)
      .eq("player_id", senderPlayerId)
      .is("left_at", null)
      .maybeSingle()

    const role = (senderMembership as any)?.role ?? null
    const isCaptainOrCo = role === "Captain" || role === "Co-Captain"
    if (!isCaptainOrCo) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
    }

    // ---- Sender Name ----
    let senderName = "Captain"
    const { data: senderCp } = await supabase
      .from("club_players")
      .select("name")
      .eq("id", senderPlayerId)
      .maybeSingle()
    if ((senderCp as any)?.name) senderName = (senderCp as any).name

    // ---- Match holen für Text ----
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

    // Teamnamen auflösen (gleiches Prinzip wie bei dir im lineup push)
    let homeName: string | null = null
    let awayName: string | null = null

    if ((match as any).home_team_type === "own" && (match as any).home_team_id) {
      const { data: t } = await supabase.from("teams").select("name").eq("id", (match as any).home_team_id).maybeSingle()
      homeName = (t as any)?.name ?? null
    }
    if ((match as any).home_team_type === "opponent" && (match as any).home_opponent_team_id) {
      const { data: o } = await supabase.from("opponent_teams").select("name").eq("id", (match as any).home_opponent_team_id).maybeSingle()
      homeName = (o as any)?.name ?? null
    }
    if ((match as any).away_team_type === "own" && (match as any).away_team_id) {
      const { data: t } = await supabase.from("teams").select("name").eq("id", (match as any).away_team_id).maybeSingle()
      awayName = (t as any)?.name ?? null
    }
    if ((match as any).away_team_type === "opponent" && (match as any).away_opponent_team_id) {
      const { data: o } = await supabase.from("opponent_teams").select("name").eq("id", (match as any).away_opponent_team_id).maybeSingle()
      awayName = (o as any)?.name ?? null
    }

    homeName = homeName ?? "Heimteam"
    awayName = awayName ?? "Gastteam"

    const dateText = match.match_date ? formatDateWithYear(String(match.match_date)) : ""
    const timeText = formatTimePlain((match as any).match_time ?? null)
    const whenLine = [dateText, timeText].filter(Boolean).join(" • ")
    const teamsLine = `${homeName} vs ${awayName}`

    // ---- Zielprofil (target_player_id -> user_id) ----
    const { data: targetProfile } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("player_id", target_player_id)
      .maybeSingle()

    const targetAuthUserId = (targetProfile as any)?.user_id as string | null
    if (!targetAuthUserId) {
      return NextResponse.json({ success: true, sent: 0, reason: "Target has no user" })
    }

    // Optional: Sender nicht selbst erinnern
    if (targetAuthUserId === senderAuthUserId) {
      return NextResponse.json({ success: true, sent: 0, reason: "Skip self" })
    }

    // ---- FCM Token holen ----
    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", targetAuthUserId)

    const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean)))
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No tokens" })
    }

    // ---- Push Text ----
    const conversation = "⏰ Bitte Verfügbarkeit"
    const bodyText =
      `${senderName}: Bitte gib deine Verfügbarkeit an.\n\n` +
      `${whenLine}\n` +
      `${teamsLine}\n\n` +
      `Öffne „Zusagen & Aufstellung“ und tippe auf Ja / Nur wenn Not am Mann / Nein.`

    const clickUrl = `/member-availability`

    const tag = `availability:reminder:${team_id}:${match_id}:${target_player_id}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "availability_reminder",
        team_id: String(team_id),
        match_id: String(match_id),
        target_player_id: String(target_player_id),

        clickUrl: String(clickUrl),
        conversation: String(conversation),
        body: String(bodyText),

        tag: String(tag),
        notif_id: String(notif_id),
        ts: String(Date.now()),
      },
      android: { priority: "high" },
    })
	
	// ✅ Cooldown speichern (nur wenn wirklich gesendet wurde)
if (multicast.successCount > 0) {
  const { error: insErr } = await supabase.from("match_availability_reminders").insert({
    match_id,
    team_id,
    player_id: target_player_id,
  })
  if (insErr) {
    console.error("[availability-reminder] insert cooldown failed:", insErr)
  }
}

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
    })
  } catch (e: any) {
    console.error("[push-availability-reminder] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
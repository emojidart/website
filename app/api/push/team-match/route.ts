import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createHmac, randomUUID } from "node:crypto"
import { sendPushAndCleanup } from "@/lib/sendPushAndCleanup"

type TeamMatchAction = "publish" | "reminder" | "confirmed"

const MATCH_CARD_PREFIX = "[[EMD_MATCH_CARD|"

function makeChatMatchCardMessage(matchId: string, teamId: string) {
  return `${MATCH_CARD_PREFIX}${matchId}|${teamId}]]`
}

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 7000 + Math.abs(h % 100000)
}

function uniqStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function fmtDate(dateString: string) {
  const d = new Date(`${dateString}T00:00:00`)
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${wd}, ${day}.${month}.${year}`
}

function fmtTime(value?: string | null) {
  if (!value) return ""
  const parts = String(value).split(":")
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : ""
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}

function makeReplyToken(payload: {
  uid: string
  room_id: string
  scope: "team"
  team_id: string
}) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

  const body = base64UrlJson({
    v: 1,
    uid: payload.uid,
    room_id: payload.room_id,
    scope: payload.scope,
    team_id: payload.team_id,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
    jti: randomUUID(),
  })

  const sig = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${sig}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const action: TeamMatchAction | null = body?.action ?? null
    const team_id: string | null = body?.team_id ?? null
    const match_id: string | null = body?.match_id ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null
    const target_player_id: string | null = body?.target_player_id ?? null

    if (!action || !["publish", "reminder", "confirmed"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    if (!team_id || !match_id || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    if (action === "reminder" && !target_player_id) {
      return NextResponse.json({ success: false, error: "Missing target_player_id" }, { status: 400 })
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
      }
    )

    const { data: authData, error: authError } = await supabase.auth.getUser(bearer)
    const senderAuthUserId = authData?.user?.id

    if (authError || !senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const { data: senderProfile, error: senderProfileError } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("id", sender_profile_id)
      .maybeSingle()

    if (senderProfileError || !senderProfile) {
      return NextResponse.json({ success: false, error: "Sender profile not found" }, { status: 403 })
    }

    if ((senderProfile as any).user_id !== senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    const { data: leadership, error: leadershipError } = await supabase
      .from("team_members")
      .select("player_id,role")
      .eq("team_id", team_id)
      .eq("player_id", (senderProfile as any).player_id)
      .in("role", ["Captain", "Co-Captain"])
      .is("left_at", null)
      .maybeSingle()

    if (leadershipError || !leadership) {
      return NextResponse.json(
        { success: false, error: "Nur Captain oder Co-Captain dürfen diese Aktion ausführen." },
        { status: 403 }
      )
    }

    const [{ data: team, error: teamError }, { data: match, error: matchError }] =
      await Promise.all([
        supabase
          .from("teams")
          .select("id,name,chat_room_id,logo_url")
          .eq("id", team_id)
          .maybeSingle(),
        supabase
          .from("matches")
          .select(`
            id,home_team_id,away_team_id,home_team_type,away_team_type,
            home_opponent_team_id,away_opponent_team_id,
            match_date,match_time,venue,status
          `)
          .eq("id", match_id)
          .maybeSingle(),
      ])

    if (teamError || !team?.chat_room_id) {
      return NextResponse.json({ success: false, error: "Team-Chat nicht gefunden." }, { status: 400 })
    }
    if (matchError || !match) {
      return NextResponse.json({ success: false, error: "Spiel nicht gefunden." }, { status: 400 })
    }

    const ownTeamIsInMatch =
      (match as any).home_team_id === team_id || (match as any).away_team_id === team_id
    if (!ownTeamIsInMatch) {
      return NextResponse.json({ success: false, error: "Spiel gehört nicht zu diesem Team." }, { status: 403 })
    }

    const opponentIds = [
      (match as any).home_opponent_team_id,
      (match as any).away_opponent_team_id,
    ].filter(Boolean)

    let opponents: any[] = []
    if (opponentIds.length > 0) {
      const { data: rows } = await supabase
        .from("opponent_teams")
        .select("id,name")
        .in("id", opponentIds)
      opponents = (rows as any[]) || []
    }

    const ownTeamName = (team as any).name || "Team"
    const homeName =
      (match as any).home_team_type === "opponent"
        ? opponents.find((x) => x.id === (match as any).home_opponent_team_id)?.name || "Gegner"
        : (match as any).home_team_id === team_id
          ? ownTeamName
          : "Heim"
    const awayName =
      (match as any).away_team_type === "opponent"
        ? opponents.find((x) => x.id === (match as any).away_opponent_team_id)?.name || "Gegner"
        : (match as any).away_team_id === team_id
          ? ownTeamName
          : "Auswärts"

    const marker = makeChatMatchCardMessage(match_id, team_id)

    // Für publish + confirmed muss die interaktive Karte im Team-Chat existieren.
    let cardCreated = false
    if (action === "publish" || action === "confirmed") {
      const { data: existingCard, error: existingCardError } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("room_id", (team as any).chat_room_id)
        .eq("scope", "team")
        .eq("message", marker)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle()

      if (existingCardError) throw existingCardError

      if (!existingCard?.id) {
        const { error: insertCardError } = await supabase.from("chat_messages").insert({
          user_id: sender_profile_id,
          room_id: (team as any).chat_room_id,
          scope: "team",
          message: marker,
        })
        if (insertCardError) throw insertCardError
        cardCreated = true
      }
    }

    const dateText = fmtDate((match as any).match_date)
    const timeText = fmtTime((match as any).match_time)
    const whenLine = [dateText, timeText].filter(Boolean).join(" • ")
    const matchLine = `${homeName} vs ${awayName}`

    let senderName = "Captain"
    const senderPlayerId = (senderProfile as any).player_id
    if (senderPlayerId) {
      const { data: senderPlayer } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderPlayerId)
        .maybeSingle()
      if ((senderPlayer as any)?.name) senderName = (senderPlayer as any).name
    }

    // Aufstellung bei Bestätigung für Chat + Push laden.
    let starters: string[] = []
    let substitutes: string[] = []
    if (action === "confirmed") {
      const { data: lineup, error: lineupError } = await supabase
        .from("match_lineups")
        .select("player_id,position,is_substitute,club_players:club_players(id,name)")
        .eq("match_id", match_id)
        .eq("team_id", team_id)
        .order("position", { ascending: true })

      if (lineupError) throw lineupError

      starters = ((lineup as any[]) || [])
        .filter((x) => !x.is_substitute)
        .map((x) => x.club_players?.name)
        .filter(Boolean)

      substitutes = ((lineup as any[]) || [])
        .filter((x) => x.is_substitute)
        .map((x) => x.club_players?.name)
        .filter(Boolean)

      const confirmationMessage =
        `✅ Aufstellung bestätigt\n${matchLine}\n${whenLine}\n\n` +
        `🎯 Starter: ${starters.length ? starters.join(" · ") : "—"}` +
        (substitutes.length ? `\n🔁 Ersatz: ${substitutes.join(" · ")}` : "")

      // Bestätigung sichtbar in den normalen Team-Chat posten.
      // Exakten Doppelpost vermeiden, falls dieselbe Bestätigung versehentlich nochmal ausgelöst wird.
      const { data: sameMessage } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("room_id", (team as any).chat_room_id)
        .eq("scope", "team")
        .eq("message", confirmationMessage)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle()

      if (!sameMessage?.id) {
        const { error: confirmationInsertError } = await supabase.from("chat_messages").insert({
          user_id: sender_profile_id,
          room_id: (team as any).chat_room_id,
          scope: "team",
          message: confirmationMessage,
        })
        if (confirmationInsertError) throw confirmationInsertError
      }
    }

    // Zielgruppe bestimmen.
    let targetAuthUserIds: string[] = []

    if (action === "reminder") {
      // 30-Minuten-Cooldown wie bisher.
      const { data: lastReminder, error: lastReminderError } = await supabase
        .from("match_availability_reminders")
        .select("sent_at")
        .eq("match_id", match_id)
        .eq("team_id", team_id)
        .eq("player_id", target_player_id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastReminderError) {
        console.error("[team-match] reminder cooldown lookup failed", lastReminderError)
      }

      if (lastReminder?.sent_at) {
        const last = new Date(lastReminder.sent_at).getTime()
        const diff = Date.now() - last
        const cooldownMs = 30 * 60 * 1000
        if (Number.isFinite(last) && diff < cooldownMs) {
          const minutesLeft = Math.max(1, Math.ceil((cooldownMs - diff) / 60000))
          return NextResponse.json({
            success: true,
            cooldown: true,
            minutes_left: minutesLeft,
            sent: 0,
          })
        }
      }

      const { data: targetProfile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("player_id", target_player_id)
        .maybeSingle()

      if ((targetProfile as any)?.user_id && (targetProfile as any).user_id !== senderAuthUserId) {
        targetAuthUserIds = [String((targetProfile as any).user_id)]
      }
    } else {
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", team_id)
        .is("left_at", null)

      if (membersError) throw membersError

      const playerIds = uniqStrings(((members as any[]) || []).map((m) => m.player_id))
      if (playerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("user_id,player_id")
          .in("player_id", playerIds)

        if (profilesError) throw profilesError
        targetAuthUserIds = uniqStrings(((profiles as any[]) || []).map((p) => p.user_id))
      }

      targetAuthUserIds = targetAuthUserIds.filter((uid) => uid !== senderAuthUserId)
    }

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        created: cardCreated,
      })
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    if (tokenError) throw tokenError

    const tokensByUser = new Map<string, string[]>()
    for (const row of (tokenRows as any[]) || []) {
      const uid = String(row?.user_id || "")
      const token = String(row?.token || "")
      if (!uid || !token) continue
      const arr = tokensByUser.get(uid) ?? []
      arr.push(token)
      tokensByUser.set(uid, arr)
    }

    let pushMessage = ""
    let conversation = `🎯 ${ownTeamName}`

    if (action === "publish") {
      pushMessage =
        `📋 Bitte Verfügbarkeit angeben\n${matchLine}\n${whenLine}\n` +
        `Direkt im EMD Messenger: Zusage / Wenn nötig / Absage`
    } else if (action === "reminder") {
      pushMessage =
        `⏰ ${senderName} erinnert dich an deine Verfügbarkeit\n${matchLine}\n${whenLine}\n` +
        `Bitte kurz antworten.`
    } else {
      pushMessage =
        `✅ Aufstellung bestätigt\n${matchLine}\n${whenLine}\n` +
        `Starter: ${starters.length ? starters.join(" · ") : "—"}` +
        (substitutes.length ? `\nErsatz: ${substitutes.join(" · ")}` : "")
    }

    // Alle diese Pushs führen direkt in "Aufstellung" des Messengers
    // und öffnen dort exakt dieses Spiel.
    const clickUrl =
      `/chat-app?tab=aufstellung&match_id=${encodeURIComponent(match_id)}` +
      `&team_id=${encodeURIComponent(team_id)}`

    const tag =
      action === "reminder"
        ? `chat:availability:${team_id}:${match_id}:${target_player_id}`
        : `chat:team-match:${action}:${team_id}:${match_id}`

    const notif_id = stableNotifIdFromTag(tag)

    let sent = 0
    let failed = 0

    for (const [targetUserId, rawTokens] of tokensByUser.entries()) {
      const tokens = uniqStrings(rawTokens)
      if (tokens.length === 0) continue

      // Weiterhin echte Android-Inline-Antwort möglich.
      const replyToken = makeReplyToken({
        uid: targetUserId,
        room_id: String((team as any).chat_room_id),
        scope: "team",
        team_id,
      })

      const result = await sendPushAndCleanup(tokens, {
        data: {
          room_id: String((team as any).chat_room_id),
          scope: "team",
          clickUrl,
          conversation,
          senderName,
          message: pushMessage,
          body: pushMessage,
          tag,
          notif_id: String(notif_id),
          iconUrl: String((team as any).logo_url || ""),
          avatarUrl: "",
          reply_token: replyToken,
          match_id: String(match_id),
          team_id: String(team_id),
          ts: String(Date.now()),
        },
        android: { priority: "high" },
      })

      sent += Number(result.success || 0)
      failed += Number(result.failed || 0)
    }

    if (action === "reminder" && sent > 0) {
      const { error: cooldownInsertError } = await supabase
        .from("match_availability_reminders")
        .insert({
          match_id,
          team_id,
          player_id: target_player_id,
        })

      if (cooldownInsertError) {
        console.error("[team-match] reminder cooldown insert failed", cooldownInsertError)
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      created: cardCreated,
      action,
    })
  } catch (error: any) {
    console.error("[team-match] error", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: 500 }
    )
  }
}

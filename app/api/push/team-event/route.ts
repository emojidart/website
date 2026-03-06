import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 5000 + Math.abs(h % 100000)
}

function formatDateTimeDE(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear())
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${wd}, ${day}.${month}.${year} • ${hh}:${mm}`
}

function eventTypeLabel(t: string | null) {
  if (t === "double_training") return "Öffentliches Training"
  if (t === "training") return "Team-Training"
  if (t === "special") return "Trainingsturnier"
  if (t === "match") return "Spiel"
  return "Event"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const event_id: string | null = body?.event_id ?? null
    const action: "created" | "updated" | "canceled" | null = body?.action ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!event_id || !action || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: senderAuth, error: authErr } = await supabase.auth.getUser(bearer)
    if (authErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
    const senderAuthUserId = senderAuth.user.id

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
    if (!senderPlayerId) {
      return NextResponse.json({ success: false, error: "Sender has no player_id" }, { status: 400 })
    }

    let senderName = "Spieler"
    const { data: senderCp } = await supabase
      .from("club_players")
      .select("name")
      .eq("id", senderPlayerId)
      .maybeSingle()

    if ((senderCp as any)?.name) senderName = (senderCp as any).name

    const { data: ev, error: evErr } = await supabase
      .from("team_events")
      .select("id, team_id, type, title, start_at, end_at, slot2_start_at, slot2_end_at, venue_name, venue, status, min_yes")
      .eq("id", event_id)
      .maybeSingle()

    if (evErr || !ev) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    const eventType = ((ev as any).type ?? null) as string | null
    const eventTeamId = ((ev as any).team_id ?? null) as string | null

    let userIds: string[] = []

    if (eventType === "training") {
      if (!eventTeamId) {
        return NextResponse.json({ success: false, error: "Team-Training without team_id" }, { status: 400 })
      }

      const { data: senderMembership } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", eventTeamId)
        .eq("player_id", senderPlayerId)
        .is("left_at", null)
        .maybeSingle()

      if (!senderMembership) {
        return NextResponse.json({ success: false, error: "Sender is not member of this team" }, { status: 403 })
      }

      const { data: members } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", eventTeamId)
        .is("left_at", null)

      const memberPlayerIds = Array.from(
        new Set(((members as any[]) || []).map((m) => m.player_id).filter(Boolean))
      )

      if (memberPlayerIds.length == 0) {
        return NextResponse.json({ success: true, sent: 0, reason: "No members" })
      }

      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id, player_id")
        .in("player_id", memberPlayerIds)

      userIds = Array.from(
        new Set(
          ((profs as any[]) || [])
            .map((p) => p.user_id)
            .filter(Boolean)
            .filter((uid) => uid !== senderAuthUserId)
        )
      )
    } else if (eventType === "double_training" || eventType === "special") {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id")

      userIds = Array.from(
        new Set(
          ((profs as any[]) || [])
            .map((p) => p.user_id)
            .filter(Boolean)
            .filter((uid) => uid !== senderAuthUserId)
        )
      )
    } else {
      return NextResponse.json({ success: false, error: "Unsupported event type" }, { status: 400 })
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No recipients" })
    }

    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", userIds)

    const tokens = Array.from(
      new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean))
    )

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No tokens" })
    }

    const typeLabel = eventTypeLabel(eventType)
    const title = (ev as any).title || typeLabel

    const when1 = (ev as any).start_at ? formatDateTimeDE(String((ev as any).start_at)) : ""
    const loc = ((ev as any).venue_name || (ev as any).venue)
      ? `📍 ${(ev as any).venue_name || (ev as any).venue}`
      : ""

    let when2 = ""
    if ((ev as any).type === "double_training" && (ev as any).slot2_start_at) {
      when2 = `\nSlot 2: ${formatDateTimeDE(String((ev as any).slot2_start_at))}`
    }

    const minYes = (ev as any).min_yes ?? 0

    const conversation =
      action === "created"
        ? "📅 Neues Training"
        : action === "updated"
          ? "🔄 Training geändert"
          : "❌ Training abgesagt"

    const actionText =
      action === "created"
        ? "hat ein Training erstellt."
        : action === "updated"
          ? "hat ein Training aktualisiert."
          : "hat ein Training abgesagt."

    const bodyText =
      `${senderName} ${actionText}\n\n` +
      `${title}\n` +
      `${when1}${when2}\n` +
      `${loc}\n` +
      (minYes > 0 ? `\nMindest-Ja: ${minYes}` : "") +
      `\n\nÖffne „Trainingstreff“ und sag bitte zu/ab.`

    const clickUrl =
      eventType === "training"
        ? `/training_event?event_id=${event_id}&team_id=${eventTeamId}`
        : `/training_event?event_id=${event_id}`

    const tag = `team_event:${action}:${event_id}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "team_event",
        action: String(action),
        team_id: String(eventTeamId ?? ""),
        event_id: String(event_id),
        clickUrl: String(clickUrl),
        conversation: String(conversation),
        body: String(bodyText),
        tag: String(tag),
        notif_id: String(notif_id),
        ts: String(Date.now()),
      },
      android: { priority: "high" },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
      recipients: userIds.length,
      tokens: tokens.length,
    })
  } catch (e: any) {
    console.error("[push-team-event] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
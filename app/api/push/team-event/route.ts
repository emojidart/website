import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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
  if (t === "double_training") return "Doppeltraining"
  if (t === "training") return "Training"
  if (t === "match") return "Spiel"
  return "Event"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const team_id: string | null = body?.team_id ?? null
    const event_id: string | null = body?.event_id ?? null
    const action: "created" | "updated" | "canceled" | null = body?.action ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!team_id || !event_id || !action || !sender_profile_id) {
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

    const senderPlayerId = (senderProfile as any).player_id as string | null
    if (!senderPlayerId) {
      return NextResponse.json({ success: false, error: "Sender has no player_id" }, { status: 400 })
    }

    // ---- Nur Captain / Co-Captain darf pushen ----
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

    // ---- Event holen ----
    const { data: ev, error: evErr } = await supabase
      .from("team_events")
      .select("id, team_id, type, title, start_at, end_at, slot2_start_at, slot2_end_at, venue_name, venue, status, min_yes")
      .eq("id", event_id)
      .maybeSingle()

    if (evErr || !ev) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    // Sicherheitscheck: event muss zu team_id passen
    if ((ev as any).team_id !== team_id) {
      return NextResponse.json({ success: false, error: "Team mismatch" }, { status: 403 })
    }

    // ---- Empfänger: alle aktiven Teamspieler ----
    const { data: members } = await supabase
      .from("team_members")
      .select("player_id")
      .eq("team_id", team_id)
      .is("left_at", null)

    const memberPlayerIds = Array.from(
      new Set(((members as any[]) || []).map((m) => m.player_id).filter(Boolean))
    )

    if (memberPlayerIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No members" })
    }

    // ---- Player -> user_id (user_profiles) ----
    const { data: profs } = await supabase
      .from("user_profiles")
      .select("user_id, player_id")
      .in("player_id", memberPlayerIds)

    const userIds = Array.from(
      new Set(
        ((profs as any[]) || [])
          .map((p) => p.user_id)
          .filter(Boolean)
          // Sender raus:
          .filter((uid) => uid !== senderAuthUserId)
      )
    )

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No recipients" })
    }

    // ---- FCM Tokens holen (dein Schema: fcm_tokens) ----
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

    // ---- Push Text bauen ----
    const typeLabel = eventTypeLabel((ev as any).type ?? null)
    const title = (ev as any).title || typeLabel

    const when1 = (ev as any).start_at ? formatDateTimeDE(String((ev as any).start_at)) : ""
    const loc = ((ev as any).venue_name || (ev as any).venue) ? `📍 ${(ev as any).venue_name || (ev as any).venue}` : ""

    let when2 = ""
    if ((ev as any).type === "double_training" && (ev as any).slot2_start_at) {
      when2 = `\nSlot 2: ${formatDateTimeDE(String((ev as any).slot2_start_at))}`
    }

    const minYes = (ev as any).min_yes ?? 0

    const conversation =
      action === "created" ? "📅 Neues Training" :
      action === "updated" ? "🔄 Training geändert" :
      "❌ Training abgesagt"

    const bodyText =
      `${senderName}: ${action === "canceled" ? "hat ein Training abgesagt." : "hat ein Training erstellt/aktualisiert."}\n\n` +
      `${title}\n` +
      `${when1}${when2}\n` +
      `${loc}\n` +
      (minYes > 0 ? `\nMindest-Ja: ${minYes}` : "") +
      `\n\nÖffne „Training & Zusagen“ und sag bitte zu/ab.`

    // Deep link in deine neue Seite
    const clickUrl = `/member-trainings?event_id=${event_id}&team_id=${team_id}`

    const tag = `team_event:${action}:${team_id}:${event_id}`
    const notif_id = stableNotifIdFromTag(tag)

    // ---- Firebase Push ----
    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "team_event",
        action: String(action),
        team_id: String(team_id),
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
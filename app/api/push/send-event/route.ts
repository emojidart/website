// app/api/push/send-event/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type EventPushAction = "created" | "updated"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 2000 + Math.abs(h % 100000)
}

function makeEventTag(event_id: string, action: EventPushAction) {
  return `event:${action}:${event_id}`
}

function formatDateDE(dateString: string) {
  // expects YYYY-MM-DD
  const d = new Date(`${dateString}T00:00:00`)
  return d.toLocaleDateString("de-DE")
}

function formatTimePlain(timeString?: string | null) {
  if (!timeString) return ""
  const parts = String(timeString).split(":")
  if (parts.length < 2) return ""
  return `${parts[0]}:${parts[1]}`
}

function eventTypeLabel(t?: string | null) {
  const v = (t || "").toLowerCase()
  if (v === "party") return "Party"
  if (v === "game_night") return "Spielabend"
  if (v === "meeting") return "Versammlung"
  if (v === "tournament") return "Turnier"
  return "Veranstaltung"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const event_id: string | null = body?.event_id ?? body?.eventId ?? body?.event_id ?? null
    const action: EventPushAction | null = body?.action ?? null // "created" | "updated"
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!event_id || !action || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    // ---- Bearer Token prüfen ----
    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null

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
      const { data: cp } = await supabase.from("club_players").select("name").eq("id", senderPlayerId).maybeSingle()
      if ((cp as any)?.name) senderName = (cp as any).name
    }

    // ---- Event holen ----
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id,name,event_type,event_date,event_time,location,photo_url")
      .eq("id", event_id)
      .maybeSingle()

    if (eventErr || !eventRow) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    const eName = (eventRow as any).name ?? "Veranstaltung"
    const eType = (eventRow as any).event_type ?? null
    const eDate = (eventRow as any).event_date ? formatDateDE(String((eventRow as any).event_date)) : ""
    const eTime = formatTimePlain((eventRow as any).event_time ?? null)
    const eLoc = (eventRow as any).location ? String((eventRow as any).location) : ""
    const iconUrl: string | null = (eventRow as any).photo_url ?? null

    const title =
      action === "created"
        ? `🎉 Neu: ${eventTypeLabel(eType)}`
        : `📢 Update: ${eventTypeLabel(eType)}`

    const whenLine = [eDate, eTime].filter(Boolean).join(" • ")
    const whereLine = eLoc ? `📍 ${eLoc}` : ""
    const actionLine =
      action === "created"
        ? `${senderName} hat eine neue Veranstaltung erstellt ✅`
        : `${senderName} hat eine Veranstaltung geändert ⚠️`

    const bodyText =
      `${eName}\n\n` +
      `${whenLine}\n` +
      `${whereLine}\n\n` +
      `${actionLine}`

    // ---- Targets: ALLE User mit fcm_tokens (ohne Sender) ----
    const { data: tokenRows, error: tokenErr } = await supabase.from("fcm_tokens").select("token,user_id")
    if (tokenErr) {
      return NextResponse.json({ success: false, error: "Token load failed" }, { status: 500 })
    }

    let targets = ((tokenRows as any[]) || []).filter((r) => r?.token && r?.user_id)
    targets = targets.filter((r) => r.user_id !== senderAuthUserId)

    const tokens = Array.from(new Set(targets.map((r) => r.token)))
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // ---- FCM senden ----
    const admin = getFirebaseAdmin()

    const clickUrl = `/events`
    const tag = makeEventTag(event_id, action)
    const notif_id = stableNotifIdFromTag(tag)
    const conversation = "📅 Veranstaltungen"

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "event",
        action: String(action),
        event_id: String(event_id),
        event_type: String(eType ?? ""),

        clickUrl: String(clickUrl),
        conversation: String(conversation),
        title: String(title),
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
    console.error("[push-send-event-fcm] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}

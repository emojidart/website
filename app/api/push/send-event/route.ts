import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type EventPushAction = "created" | "updated"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 2000 + Math.abs(h % 100000)
}

function formatTimePlain(timeString?: string | null) {
  if (!timeString) return ""
  const parts = String(timeString).split(":")
  if (parts.length < 2) return ""
  return `${parts[0]}:${parts[1]}`
}

function trimText(s: string, maxLen: number) {
  const t = (s || "").trim()
  if (!t) return ""
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen - 1).trimEnd() + "…"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const event_id: string | null = body?.event_id ?? body?.eventId ?? null
    const action: EventPushAction = body?.action ?? (body?.updated ? "updated" : "created")

    if (!event_id) {
      return NextResponse.json({ success: false, error: "Missing event_id/eventId" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Event laden
    const { data: eventRow, error: evErr } = await supabase
      .from("events")
      .select("id,name,event_date,event_time,location,details,photo_url")
      .eq("id", event_id)
      .maybeSingle()

    if (evErr || !eventRow) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    // Tokens holen: Mitglieder + Besucher
    const { data: privateRows, error: privateErr } = await supabase
      .from("fcm_tokens")
      .select("token")

    const { data: publicRows, error: publicErr } = await supabase
      .from("public_push_tokens")
      .select("token")

    if (privateErr || publicErr) {
      return NextResponse.json({ success: false, error: "Token load failed" }, { status: 500 })
    }

    const tokens = Array.from(
      new Set(
        [
          ...((privateRows as any[]) || []).map((r) => r.token),
          ...((publicRows as any[]) || []).map((r) => r.token),
        ].filter(Boolean)
      )
    )

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Push Text bauen
    const title = action === "created" ? "🎉 Neue Veranstaltung!" : "📢 Veranstaltung aktualisiert!"

    const dateStr = eventRow.event_date ? String(eventRow.event_date) : ""
    const timeStr = formatTimePlain((eventRow as any).event_time ?? null)
    const when = [dateStr, timeStr].filter(Boolean).join(" • ")

    const whereStr = eventRow.location ? `📍 ${String(eventRow.location)}` : ""
    const detailsStr = eventRow.details ? `ℹ️ ${trimText(String(eventRow.details), 220)}` : ""

    // Flyer / Event-Bild aus DB-Spalte photo_url
    const imageUrl = eventRow.photo_url ? String(eventRow.photo_url) : ""

    const titleStr = String(title)
    const eventNameStr = String(eventRow.name)
    const whenStr = String(when)

    const bodyText = [eventNameStr, whenStr, whereStr, detailsStr].filter(Boolean).join(" • ")

    const tag = `event:${action}:${event_id}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    // Nur DATA senden
    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      android: { priority: "high" },
      data: {
        type: "event",
        action: String(action),
        event_id: String(event_id),
        clickUrl: "/veranstaltungen",

        title: titleStr,
        eventName: eventNameStr,
        when: whenStr,
        where: whereStr,
        details: detailsStr,
        imageUrl: imageUrl,

        conversation: titleStr,
        senderName: "EMD Vereinsapp",
        message: bodyText,
        body: bodyText,
        iconUrl: imageUrl,

        tag: String(tag),
        notif_id: String(notif_id),
        ts: String(Date.now()),
      },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
    })
  } catch (e: any) {
    console.error("[push-send-event] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
// app/api/push/send-event/route.ts
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

    // Event laden (inkl. Foto + Details)
    const { data: eventRow, error: evErr } = await supabase
      .from("events")
      .select("id,name,event_type,event_date,event_time,location,details,photo_url")
      .eq("id", event_id)
      .maybeSingle()

    if (evErr || !eventRow) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    const title = action === "created" ? "🎉 Neue Veranstaltung!" : "📢 Veranstaltung aktualisiert!"

    const dateStr = eventRow.event_date ? String(eventRow.event_date) : ""
    const timeStr = formatTimePlain((eventRow as any).event_time ?? null)
    const when = [dateStr, timeStr].filter(Boolean).join(" • ")
    const where = eventRow.location ? `📍 ${eventRow.location}` : ""
    const details = eventRow.details ? `\n\nℹ️ ${trimText(String(eventRow.details), 260)}` : ""

    const bodyText = `${eventRow.name}\n\n${[when, where].filter(Boolean).join("\n")}${details}`

    // Tokens holen
    const { data: tokenRows, error: tokErr } = await supabase.from("fcm_tokens").select("token")
    if (tokErr) return NextResponse.json({ success: false, error: "Token load failed" }, { status: 500 })

    const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean)))
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const admin = getFirebaseAdmin()

    const tag = `event:${action}:${event_id}`
    const notif_id = stableNotifIdFromTag(tag)

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "event",
        action: String(action),
        event_id: String(event_id),
        clickUrl: "/events",

        title: String(title),
        body: String(bodyText),

        tag: String(tag),
        notif_id: String(notif_id),
        iconUrl: eventRow.photo_url || "", // ✅ Foto wird als iconUrl mitgegeben
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
    console.error("[push-send-event] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}

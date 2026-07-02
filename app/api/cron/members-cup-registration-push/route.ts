//-------------------


import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

const MEMBERS_CUP_SERIES_ID = "baeef5fb-b386-4a75-a1f3-c56090a0ec76"

function todayViennaISO() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value

  return `${y}-${m}-${d}`
}

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 7000 + Math.abs(h % 100000)
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const todayISO = todayViennaISO()

    const { data: events, error: eventErr } = await supabase
      .from("dko_series_events")
      .select("id, title, start_at, is_matchday, is_rescheduled, rescheduled_at")
      .eq("series_id", MEMBERS_CUP_SERIES_ID)
      .eq("is_matchday", true)

    if (eventErr) {
      return NextResponse.json({ success: false, error: "Event lookup failed" }, { status: 500 })
    }

    const todaysEvent = (events || []).find((ev: any) => {
      const effective = ev.is_rescheduled && ev.rescheduled_at ? ev.rescheduled_at : ev.start_at

      const eventDateVienna = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Vienna",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(effective))

      return eventDateVienna === todayISO
    })

    if (!todaysEvent) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason: "Heute ist kein Members-Cup-Spieltag.",
        todayISO,
      })
    }

    const { data: tokenRows, error: tokenErr } = await supabase
      .from("fcm_tokens")
      .select("token")

    if (tokenErr) {
      return NextResponse.json({ success: false, error: "Token lookup failed" }, { status: 500 })
    }

    const tokens = Array.from(
      new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean))
    )

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "Keine Tokens gefunden." })
    }

    const title = "🎯 Members Cup Anmeldung geöffnet"
    const body =
      "Die Anmeldung für den heutigen Members Champion Cup ist ab sofort möglich. Anmeldung bis 17:00 Uhr, Abmeldung bis 14:00 Uhr."

    const tag = `members-cup-registration-open:${todayISO}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      android: { priority: "high" },
      data: {
        type: "members_cup_registration_open",
        clickUrl: "/member-cup-anmeldung",

        title,
        conversation: "EMD Vereinsapp",
        senderName: "EMD Vereinsapp",
        message: body,
        body,

        tag,
        notif_id: String(notif_id),
        ts: String(Date.now()),
      },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
      todayISO,
      event_id: todaysEvent.id,
    })
  } catch (e: any) {
    console.error("[members-cup-registration-push] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
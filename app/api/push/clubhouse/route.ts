import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const openDate = String(body?.open_date || "")

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: opening, error: openingError } = await supabase
      .from("clubhouse_openings")
      .select("open_date,status,opens_at,closes_at,note")
      .eq("open_date", openDate)
      .maybeSingle()

    if (openingError || !opening || !["open", "closed"].includes(String(opening.status))) {
      return NextResponse.json({ success: false, error: "No pushable clubhouse status found" }, { status: 400 })
    }

    // Normalbetrieb: eingeloggte Mitglieder + öffentliche Push-Abonnenten.
    const [{ data: privateRows, error: privateError }, { data: publicRows, error: publicError }] = await Promise.all([
      supabase.from("fcm_tokens").select("token"),
      supabase.from("public_push_tokens").select("token"),
    ])

    if (privateError || publicError) {
      return NextResponse.json({ success: false, error: "Token load failed" }, { status: 500 })
    }

    const tokens = Array.from(
      new Set(
        [
          ...((privateRows as any[]) || []).map((r) => r.token),
          ...((publicRows as any[]) || []).map((r) => r.token),
        ].filter(Boolean),
      ),
    )

    if (!tokens.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 })
    }

    const from = opening.opens_at ? String(opening.opens_at).slice(0, 5) : null
    const until = opening.closes_at ? String(opening.closes_at).slice(0, 5) : null

    let titleText = "🎯 Pfeil OK ist offen!"
    let bodyText = "Pfeil OK ist ab sofort geöffnet."

    if (opening.status === "closed") {
      titleText = "🔴 Pfeil OK ist heute geschlossen"
      bodyText = "Pfeil OK ist heute geschlossen."
    } else {
      const note = opening.note ? ` • ${String(opening.note).slice(0, 160)}` : ""

      if (from && until) bodyText = `Pfeil OK ist von ${from} bis ca. ${until} Uhr geöffnet.`
      else if (from) bodyText = `Pfeil OK ist ab ${from} Uhr geöffnet.`
      else if (until) bodyText = `Pfeil OK ist bis ca. ${until} Uhr geöffnet.`

      bodyText = `${bodyText}${note}`
    }

    const admin = getFirebaseAdmin()
    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      android: { priority: "high" },
      data: {
        type: "clubhouse",
        clickUrl: "/vereinsheim",
        title: titleText,
        message: bodyText,
        body: bodyText,
        conversation: titleText,
        senderName: "EMD Vereinsapp",
        tag: `clubhouse:${opening.status}:${opening.open_date}`,
        ts: String(Date.now()),
      },
    })

    return NextResponse.json({ success: true, sent: multicast.successCount, failed: multicast.failureCount })
  } catch (e: any) {
    console.error("[clubhouse-push] error", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // wichtig: service role
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventId, name, event_type, photo_url, updated } = body

    if (!eventId || !name) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    // Alle Push Tokens holen
    const { data: tokens, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")

    if (error) throw error

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, message: "No subscriptions found" })
    }

    const title = updated
      ? "📢 Veranstaltung aktualisiert!"
      : "🎉 Neue Veranstaltung!"

    const message = updated
      ? `${name} wurde geändert.`
      : `${name} wurde neu erstellt.`

    // Hier dein Push Service (Beispiel WebPush / Expo / etc.)
    // Du musst hier deinen bestehenden Push-Sender einbauen

    for (const sub of tokens) {
      try {
        await fetch(process.env.PUSH_SERVICE_URL!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: sub.subscription,
            title,
            message,
            image: photo_url ?? null,
            url: `/events/${eventId}`,
          }),
        })
      } catch (err) {
        console.error("Push send error:", err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

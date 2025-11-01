import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import webpush from "web-push"

// Konfiguriere web-push mit VAPID-Keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:your-email@example.com", // Ersetze mit deiner E-Mail
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    // Prüfe, ob der Benutzer Admin ist (optional)
    // Du kannst hier eine Admin-Prüfung hinzufügen

    const { title, body, url, targetUserIds } = await request.json()

    // Hole alle Abonnements (oder nur für bestimmte Benutzer)
    let query = supabase.from("push_subscriptions").select("*")

    if (targetUserIds && targetUserIds.length > 0) {
      query = query.in("user_id", targetUserIds)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error("Fehler beim Abrufen der Abonnements:", error)
      return NextResponse.json({ error: "Fehler beim Abrufen der Abonnements" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "Keine Abonnements gefunden" }, { status: 200 })
    }

    const payload = JSON.stringify({
      title: title || "EMD Dart",
      body: body || "Neue Benachrichtigung",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        url: url || "/",
      },
    })

    // Sende Push-Benachrichtigungen an alle Abonnements
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          )
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error("Fehler beim Senden an:", sub.endpoint, error)

          // Lösche ungültige Abonnements
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      }),
    )

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: results.length,
    })
  } catch (error) {
    console.error("Fehler beim Senden der Benachrichtigungen:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}

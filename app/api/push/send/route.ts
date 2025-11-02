import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import webpush from "web-push"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ""
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@emd-dart.de"

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { title, body, data } = await request.json()

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: "VAPID keys not configured" }, { status: 500 })
    }

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

    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*")

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: false, error: "No subscriptions found" }, { status: 400 })
    }

    const payload = JSON.stringify({
      title: title || "EMD Dart",
      body: body || "Neue Benachrichtigung",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data || {},
    })

    let successCount = 0
    let failureCount = 0

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
        }

        await webpush.sendNotification(subscription, payload)
        successCount++
      } catch (err) {
        console.error("[v0] Error sending to subscription:", err)
        failureCount++
      }
    }

    console.log(`[v0] Push sent to ${successCount} devices, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successCount} devices`,
      successCount,
      failureCount,
    })
  } catch (error) {
    console.error("[v0] Error sending push notifications:", error)
    return NextResponse.json({ success: false, error: "Failed to send notifications" }, { status: 500 })
  }
}

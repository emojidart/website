import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

// VAPID keys - Generate these with: npx web-push generate-vapid-keys
// Store these in environment variables in production
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ""
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@emd-dart.de"

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { subscription, title, body, data } = await request.json()

    if (!subscription) {
      return NextResponse.json({ success: false, error: "Subscription required" }, { status: 400 })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: "VAPID keys not configured" }, { status: 500 })
    }

    const payload = JSON.stringify({
      title: title || "EMD Dart",
      body: body || "Neue Benachrichtigung",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data || {},
    })

    await webpush.sendNotification(subscription, payload)

    console.log("[v0] Push notification sent successfully")

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    })
  } catch (error) {
    console.error("[v0] Error sending push notification:", error)
    return NextResponse.json({ success: false, error: "Failed to send notification" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()

    console.log("[v0] Received subscription:", {
      endpoint: subscription.endpoint?.substring(0, 50) + "...",
      hasAuth: !!subscription.keys?.auth,
      hasP256dh: !!subscription.keys?.p256dh,
    })

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

    // Optional: attach subscription to logged-in user (does NOT break existing event pushes)
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const userId = authData?.user?.id ?? null
    if (authError) {
      console.warn("[v0] Could not read auth user for subscription:", authError.message)
    }

    const { endpoint, keys } = subscription

    const { data: existingSubscription, error: selectError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[v0] Error checking existing subscription:", selectError)
      return NextResponse.json({ success: false, error: selectError.message }, { status: 500 })
    }

    let data, error
    if (existingSubscription) {
      console.log("[v0] Subscription already exists, updating...")
      const { data: updateData, error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          auth: keys?.auth,
          p256dh: keys?.p256dh,
          user_id: userId,
          last_used: new Date().toISOString(),
        })
        .eq("endpoint", endpoint)
        .select()

      data = updateData
      error = updateError
    } else {
      console.log("[v0] Subscription is new, inserting...")
      const { data: insertData, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          endpoint,
          auth: keys?.auth,
          p256dh: keys?.p256dh,
          user_id: userId,
          last_used: new Date().toISOString(),
        })
        .select()

      data = insertData
      error = insertError
    }

    if (error) {
      console.error("[v0] Error saving subscription to Supabase:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] Push subscription saved successfully")

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
    })
  } catch (error) {
    console.error("[v0] Error in POST /api/push/subscribe:", error)
    return NextResponse.json({ success: false, error: "Failed to save subscription" }, { status: 500 })
  }
}

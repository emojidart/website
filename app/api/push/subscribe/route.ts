import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()

    console.log("[v0] Received subscription:", {
      endpoint: subscription?.endpoint?.substring?.(0, 50) + "...",
      hasAuth: !!subscription?.keys?.auth,
      hasP256dh: !!subscription?.keys?.p256dh,
    })

    if (!subscription?.endpoint) {
      return NextResponse.json({ success: false, error: "Missing subscription endpoint" }, { status: 400 })
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

    const { endpoint, keys } = subscription

    // Attach to logged-in user when possible.
    // IMPORTANT: many setups use localStorage sessions (no cookies). In that case, the client must send a Bearer token.
    let userId: string | null = null

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const bearer =
      authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null

    if (bearer) {
      const { data, error } = await supabase.auth.getUser(bearer)
      if (error) {
        console.warn("[v0] Could not read auth user from Bearer token:", error.message)
      } else {
        userId = data.user?.id ?? null
      }
    } else {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.warn("[v0] Could not read auth user from cookies:", error.message)
      } else {
        userId = data.user?.id ?? null
      }
    }

    const { data: existingSubscription, error: selectError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle()

    if (selectError) {
      console.error("[v0] Error checking existing subscription:", selectError)
      return NextResponse.json({ success: false, error: selectError.message }, { status: 500 })
    }

    let data, error

    if (existingSubscription?.id) {
      console.log("[v0] Subscription already exists, updating...")
      const { data: updateData, error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          auth: keys?.auth ?? null,
          p256dh: keys?.p256dh ?? null,
          user_id: userId, // can be null (keeps your existing behavior)
          last_used: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)
        .select()

      data = updateData
      error = updateError
    } else {
      console.log("[v0] Subscription is new, inserting...")
      const { data: insertData, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          endpoint,
          auth: keys?.auth ?? null,
          p256dh: keys?.p256dh ?? null,
          user_id: userId, // can be null (keeps your existing behavior)
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

    console.log("[v0] Push subscription saved successfully", {
      hasUserId: !!userId,
    })

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
      hasUserId: !!userId,
    })
  } catch (error) {
    console.error("[v0] Error in POST /api/push/subscribe:", error)
    return NextResponse.json({ success: false, error: "Failed to save subscription" }, { status: 500 })
  }
}

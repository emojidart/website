import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()

    console.log("[v0] Push subscription received:", subscription)

    // TODO: Store subscription in database
    // For now, we'll just acknowledge receipt
    // In production, save this to your database (Supabase, Neon, etc.)

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
    })
  } catch (error) {
    console.error("[v0] Error saving subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to save subscription" }, { status: 500 })
  }
}

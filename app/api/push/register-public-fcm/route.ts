import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const token: string | null = body?.token ?? null
    const platform: string = (body?.platform ?? "android").toLowerCase()
    const topic: string = body?.topic ?? "public_events"

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { error } = await supabase
      .from("public_push_tokens")
      .upsert(
        {
          token,
          platform,
          topic,
          updated_at: now,
        },
        { onConflict: "token" }
      )

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (e: any) {
    console.error("[register-public-fcm] error:", e)

    return NextResponse.json(
      { success: false, error: e?.message || "Server error" },
      { status: 500 }
    )
  }
}
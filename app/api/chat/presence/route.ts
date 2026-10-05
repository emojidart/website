import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_SCOPES = new Set([
  "team",
  "match",
  "captains",
  "club",
  "freizeit",
  "vorstand",
  "community",
  "test",
])

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : ""

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const session_id = String(body?.session_id || "").trim()
    const room_id = String(body?.room_id || "").trim()
    const scope = String(body?.scope || "").trim()
    const active = body?.active === true

    if (!session_id || !room_id || !scope || !ALLOWED_SCOPES.has(scope)) {
      return NextResponse.json({ success: false, error: "Invalid presence payload" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const { data: authData, error: authError } = await supabase.auth.getUser(bearer)
    const userId = authData?.user?.id

    if (authError || !userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const { error } = await supabase
      .from("chat_active_presence")
      .upsert(
        {
          user_id: userId,
          session_id,
          room_id,
          scope,
          is_active: active,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,session_id" },
      )

    if (error) {
      console.error("[chat-presence] upsert failed:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Presence update failed" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[chat-presence] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Presence update failed" },
      { status: 500 },
    )
  }
}

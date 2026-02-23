import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServerSupabaseClient(authHeader: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, anon, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const supabase = getServerSupabaseClient(authHeader)

    // Validate user from JWT
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const reason = String(body?.reason ?? "").trim()
    const contact_email = String(body?.contact_email ?? "").trim() || null
    const app_store = String(body?.app_store ?? "google_play").trim() || "google_play"
    const platform = String(body?.platform ?? "").trim() || null
    const app_version = String(body?.app_version ?? "").trim() || null
    const locale = String(body?.locale ?? "").trim() || null
    const profile_id = body?.profile_id ? String(body.profile_id) : null

    if (!reason) {
      return NextResponse.json({ success: false, error: "Reason is required" }, { status: 400 })
    }
    if (reason.length < 5) {
      return NextResponse.json({ success: false, error: "Reason too short" }, { status: 400 })
    }

    const { error: insErr } = await supabase.from("account_deletion_requests").insert({
      user_id: userData.user.id,
      profile_id,
      reason,
      contact_email,
      app_store,
      platform,
      app_version,
      locale,
      status: "pending",
    })

    if (insErr) {
      return NextResponse.json({ success: false, error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
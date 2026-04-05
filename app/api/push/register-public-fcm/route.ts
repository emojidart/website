import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const token: string | null = body?.token ?? null
    const platform: string = (body?.platform ?? "android").toLowerCase()
    const topic: string = (body?.topic ?? "public_events").toLowerCase()

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1) Prüfen, ob exakt derselbe öffentliche Token schon existiert
    const { data: existingExact, error: existingExactErr } = await supabase
      .from("fcm_tokens")
      .select("token,platform,topic,is_public")
      .eq("token", token)
      .eq("platform", platform)
      .eq("topic", topic)
      .eq("is_public", true)
      .maybeSingle()

    if (existingExactErr) {
      return NextResponse.json({ success: false, error: existingExactErr.message }, { status: 500 })
    }

    // Wenn identisch vorhanden: NICHT neu schreiben
    if (existingExact) {
      return NextResponse.json({ success: true, skipped: true, reason: "unchanged" })
    }

    const now = new Date().toISOString()

    // 2) Nur dann schreiben, wenn wirklich neu/geändert
    const { error: upsertErr } = await supabase
      .from("fcm_tokens")
      .upsert(
        {
          token,
          platform,
          topic,
          is_public: true,
          updated_at: now,
        },
        { onConflict: "token" }
      )

    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, skipped: false })
  } catch (e: any) {
    console.error("[register-public-fcm] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const token: string | null = body?.token ?? null
    const platform: string = (body?.platform ?? "android").toLowerCase()

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 })
    }

    // ✅ Bearer aus Header
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
    const bearer =
      authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // ✅ 1) User mit ANON + bearer validieren
    const supabaseAuth = createClient(url, anonKey)
    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser(bearer)

    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const userId = userRes.user.id

    // ✅ 2) Service-Client (RLS umgehen)
    const supabaseService = createClient(url, serviceKey)

    const now = new Date().toISOString()

    /**
     * Strategie:
     *  A) Token sicher speichern (falls Token schon existiert -> user_id & platform aktualisieren)
     *  B) Danach alle anderen Tokens des Users für dieselbe Plattform löschen
     */

    // A) Upsert nach token (Token ist global unique)
    const { error: upsertErr } = await supabaseService
      .from("fcm_tokens")
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: now,
        },
        { onConflict: "token" }
      )

    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
    }

    // B) Cleanup: alle anderen Tokens des Users (gleiche Plattform) löschen
    const { error: cleanupErr } = await supabaseService
      .from("fcm_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", platform)
      .neq("token", token)

    if (cleanupErr) {
      return NextResponse.json({ success: false, error: cleanupErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[register-fcm] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 })
  }
}
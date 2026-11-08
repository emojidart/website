import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Server-Konfiguration fehlt." }, { status: 503 })
    }

    // Test notifications can target any user; require an authenticated admin.
    // Never expose the service-role key through a cookie-backed browser session.
    const authorization = req.headers.get("authorization") || ""
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Anmeldung erforderlich." }, { status: 401 })
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: "Sitzung ungültig." }, { status: 401 })
    }
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", authData.user.id)
      .maybeSingle()
    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ success: false, error: "Nur Administratoren dürfen Test-Pushs senden." }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : ""
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    if (!userId || !title || !message || title.length > 120 || message.length > 500) {
      return NextResponse.json({ success: false, error: "Empfänger, Titel oder Nachricht ungültig." }, { status: 400 })
    }
    const suppliedData = body?.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? body.data as Record<string, unknown> : {}
    const data = Object.fromEntries(
      Object.entries(suppliedData).slice(0, 20).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    )

    const { data: tokenRow, error } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!tokenRow?.token) {
      return NextResponse.json({ success: false, error: "Für diesen Benutzer ist kein Push-Token vorhanden." }, { status: 404 })
    }

    await getFirebaseAdmin().messaging().send({
      token: tokenRow.token,
      notification: { title, body: message },
      data,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[test-push] Push konnte nicht gesendet werden:", error)
    return NextResponse.json({ success: false, error: "Test-Push konnte nicht gesendet werden." }, { status: 500 })
  }
}

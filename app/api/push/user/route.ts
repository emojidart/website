import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ success: false, error: "Server-Konfiguration fehlt." }, { status: 503 })
    }

    const bearer = req.headers.get("authorization") || ""
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : ""
    if (!token) return NextResponse.json({ success: false, error: "Anmeldung erforderlich." }, { status: 401 })

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth.user) {
      return NextResponse.json({ success: false, error: "Sitzung ungültig." }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : ""
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    if (!userId || !title || !message || title.length > 120 || message.length > 500) {
      return NextResponse.json({ success: false, error: "Ungültige Nachricht." }, { status: 400 })
    }

    // Sending to another member requires admin privileges.
    if (userId !== auth.user.id) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", auth.user.id)
        .maybeSingle()
      if (profileError || !profile?.is_admin) {
        return NextResponse.json({ success: false, error: "Keine Sendeberechtigung." }, { status: 403 })
      }
    }

    const rawData = body?.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? body.data as Record<string, unknown>
      : {}
    const data = Object.fromEntries(
      Object.entries(rawData).slice(0, 20).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    )

    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId)
      .limit(20)
    if (error) throw error
    if (!tokens?.length) {
      return NextResponse.json({ success: false, error: "Kein Push-Token vorhanden." }, { status: 404 })
    }

    const results = await Promise.allSettled(
      tokens.map(({ token: recipientToken }) =>
        getFirebaseAdmin().messaging().send({
          token: recipientToken,
          notification: { title, body: message },
          data,
        }),
      ),
    )
    const sent = results.filter((result) => result.status === "fulfilled").length
    if (!sent) {
      return NextResponse.json({ success: false, error: "Benachrichtigung konnte nicht zugestellt werden." }, { status: 502 })
    }
    return NextResponse.json({ success: true, sent, failed: results.length - sent })
  } catch (error) {
    console.error("[push/user] Versand fehlgeschlagen:", error)
    return NextResponse.json({ success: false, error: "Benachrichtigung konnte nicht versendet werden." }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json()

    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID fehlt" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Registrierung abrufen
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from("campus_registrations")
      .select("*")
      .eq("id", registrationId)
      .single()

    if (fetchError || !registration) {
      return NextResponse.json({ error: "Registrierung nicht gefunden" }, { status: 404 })
    }

    // E-Mail mit Supabase Admin API versenden
    // Nutzt das "Invite user" Template von Supabase
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      registration.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/campus`,
        data: {
          child_first_name: registration.child_first_name,
          child_last_name: registration.child_last_name,
          parent_first_name: registration.parent_first_name,
          parent_last_name: registration.parent_last_name,
          age_group: registration.age_group,
          type: "campus_confirmation",
        },
      },
    )

    if (inviteError) {
      console.error("Fehler beim Versenden der E-Mail:", inviteError)
      return NextResponse.json({ error: `Fehler beim Versenden: ${inviteError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Bestätigungs-E-Mail erfolgreich versendet",
    })
  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json({ error: error.message || "Interner Server-Fehler" }, { status: 500 })
  }
}

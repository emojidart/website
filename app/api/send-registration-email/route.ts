import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { email, registrationData } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "E-Mail ist erforderlich" }, { status: 400 })
    }

    // Supabase Admin Client erstellen
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      },
    )

    // Temporäres Passwort generieren (wird bei erster Anmeldung geändert)
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!"

    // User mit Admin API erstellen
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: false, // E-Mail muss bestätigt werden
      user_metadata: {
        registration_id: registrationData?.id,
        child_first_name: registrationData?.child_first_name,
        child_last_name: registrationData?.child_last_name,
      },
    })

    if (authError) {
      console.error("[v0] Error creating user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Invite-E-Mail senden (verwendet das "Invite user" Template)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    })

    if (inviteError) {
      console.error("[v0] Error sending invite:", inviteError)
      // User wurde bereits erstellt, daher ist dies kein kritischer Fehler
      return NextResponse.json(
        {
          success: true,
          warning: "User wurde erstellt, aber E-Mail konnte nicht gesendet werden",
          userId: authData.user.id,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Bestätigungs-E-Mail wurde erfolgreich versendet",
        userId: authData.user.id,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Interner Server-Fehler" }, { status: 500 })
  }
}

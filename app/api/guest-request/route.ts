import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Server-Konfiguration fehlt.")
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const fullName = String(body.fullName || "").trim()
    const playerName = String(body.playerName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const phone = String(body.phone || "").trim()
    const password = String(body.password || "")

    if (fullName.length < 3) {
      return NextResponse.json({ error: "Bitte gib deinen vollständigen Namen ein." }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    const { data: existingRequest } = await supabaseAdmin
      .from("guest_requests")
      .select("id, status")
      .eq("email", email)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: "Für diese E-Mail-Adresse gibt es bereits einen Gastantrag." },
        { status: 409 },
      )
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { error: createUserError?.message || "Gastkonto konnte nicht erstellt werden." },
        { status: 500 },
      )
    }

    const authUserId = createdUser.user.id

    const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
      user_id: authUserId,
      is_guest: true,
      is_admin: false,
      email_confirmed: true,
      is_blocked: true,
      blocked_reason: "Gastzugang wartet auf Admin-Freigabe.",
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: requestError } = await supabaseAdmin.from("guest_requests").insert({
      full_name: fullName,
      player_name: playerName || null,
      email,
      phone: phone || null,
      status: "pending",
      auth_user_id: authUserId,
    })

    if (requestError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: "Dein Gastantrag wurde erfolgreich übermittelt.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unbekannter Fehler." },
      { status: 500 },
    )
  }
}
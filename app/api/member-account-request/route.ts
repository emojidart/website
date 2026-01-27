import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function normalizeCode(v: string) {
  const raw = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")

  if (/^QR[A-Z0-9]{7}$/.test(raw)) {
    return `QR-${raw.slice(2, 6)}-${raw.slice(6)}`
  }
  return raw
}

function normalizeName(v: string) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) throw new Error("Server-Konfiguration fehlt (Supabase Keys).")
  return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error("Server-Konfiguration fehlt (Supabase Keys).")
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

// After email confirmation, user will land on /member-login by default in your project.
// Keep this consistent with your Supabase Auth URL configuration.
const EMAIL_REDIRECT_TO = "https://emojisdartverein.com/member-login"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = normalizeCode(url.searchParams.get("code") || "")
    if (code.length < 8) return NextResponse.json({ error: "Code ungültig." }, { status: 400 })

    const supabaseAdmin = getAdminClient()

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("qr_code_generated")
      .select("id, player_id, code, used_at")
      .eq("code", code)
      .maybeSingle()

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
    if (!invite) return NextResponse.json({ error: "Code nicht gefunden." }, { status: 404 })
    if (invite.used_at) return NextResponse.json({ error: "Dieser Code wurde bereits verwendet." }, { status: 409 })

    const { data: player, error: playerErr } = await supabaseAdmin
      .from("club_players")
      .select("id, name")
      .eq("id", invite.player_id)
      .maybeSingle()

    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 })
    if (!player) return NextResponse.json({ error: "Spieler zu Code nicht gefunden." }, { status: 404 })

    // If user already exists for that player -> block
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, user_id")
      .eq("player_id", invite.player_id)
      .maybeSingle()

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (profile?.user_id) return NextResponse.json({ error: "Für diesen Spieler existiert bereits ein Konto." }, { status: 409 })

    return NextResponse.json({ ok: true, playerId: player.id, fullName: player.name })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}

/**
 * New flow:
 * - User sets password on member-account-request page
 * - We validate code+name
 * - We create a Supabase auth user via signUp(email, password) (sends confirmation email)
 * - We create user_profiles (service role) linking user_id -> player_id
 * - We store member_account_requests for audit
 * - We mark the QR code as used
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; firstName?: string; lastName?: string; email?: string; password?: string }

    const code = normalizeCode(body.code || "")
    const firstName = String(body.firstName || "").trim()
    const lastName = String(body.lastName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (code.length < 8) return NextResponse.json({ error: "Mitglieder‑Code ungültig." }, { status: 400 })
    if (firstName.length < 2) return NextResponse.json({ error: "Vorname ungültig." }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: "E-Mail ungültig." }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben." }, { status: 400 })

    const supabaseAdmin = getAdminClient()

    // 1) Validate code not used
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("qr_code_generated")
      .select("id, player_id, code, used_at")
      .eq("code", code)
      .maybeSingle()

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
    if (!invite) return NextResponse.json({ error: "Code nicht gefunden." }, { status: 404 })
    if (invite.used_at) return NextResponse.json({ error: "Dieser Code wurde bereits verwendet." }, { status: 409 })

    // 2) Player
    const { data: player, error: playerErr } = await supabaseAdmin
      .from("club_players")
      .select("id, name")
      .eq("id", invite.player_id)
      .maybeSingle()

    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 })
    if (!player) return NextResponse.json({ error: "Spieler zu Code nicht gefunden." }, { status: 404 })

    // 3) Name match (supports single-token names)
    const expected = normalizeName(player.name)
    const expectedParts = expected.split(" ").filter(Boolean)
    const provided = normalizeName(`${firstName} ${lastName}`)

    if (expectedParts.length <= 1) {
      if (normalizeName(firstName) !== expected) return NextResponse.json({ error: "Name passt nicht zum Mitglieder‑Code." }, { status: 400 })
    } else {
      if (lastName.length < 2) return NextResponse.json({ error: "Nachname ungültig." }, { status: 400 })
      if (expected !== provided) return NextResponse.json({ error: "Name passt nicht zum Mitglieder‑Code." }, { status: 400 })
    }

    // 4) Ensure player has no account yet
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, user_id")
      .eq("player_id", invite.player_id)
      .maybeSingle()

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (profile?.user_id) return NextResponse.json({ error: "Für diesen Spieler existiert bereits ein Konto." }, { status: 409 })

    // 5) Create auth user via signUp (sends confirm email)
    const supabaseAnon = getAnonClient()
    const { data: signUpData, error: signUpErr } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { player_id: invite.player_id },
        emailRedirectTo: EMAIL_REDIRECT_TO,
      },
    })

    if (signUpErr) {
      // common: "User already registered"
      return NextResponse.json({ error: signUpErr.message }, { status: 409 })
    }

    const userId = signUpData?.user?.id
    if (!userId) return NextResponse.json({ error: "User konnte nicht erstellt werden." }, { status: 500 })

    // 6) Create user profile (service role)
    const { error: upsertProfileErr } = await supabaseAdmin.from("user_profiles").upsert(
      {
        user_id: userId,
        player_id: invite.player_id,
        is_admin: false,
        email_confirmed: false,
      },
      { onConflict: "user_id" },
    )
    if (upsertProfileErr) return NextResponse.json({ error: upsertProfileErr.message }, { status: 500 })

    // 7) Insert request audit row
    const { error: insertErr } = await supabaseAdmin.from("member_account_requests").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      status: "pending_email_confirm",
      invite_code: code,
      player_id: invite.player_id,
      code_valid: true,
      auth_user_id: userId,
    })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // 8) Mark code used (prevents sharing)
    const { error: markErr } = await supabaseAdmin
      .from("qr_code_generated")
      .update({ used_at: new Date().toISOString(), used_by_email: email })
      .eq("id", invite.id)

    if (markErr) console.error("[member-account-request] failed to mark used:", markErr)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}

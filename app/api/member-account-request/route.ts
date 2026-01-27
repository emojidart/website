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

const INVITE_REDIRECT_TO = "https://emojisdartverein.com/auth/callback"

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

    const { data: player, error: playerErr } = await supabaseAdmin.from("club_players").select("id, name").eq("id", invite.player_id).maybeSingle()
    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 })
    if (!player) return NextResponse.json({ error: "Spieler zu Code nicht gefunden." }, { status: 404 })

    const { data: profile, error: profileErr } = await supabaseAdmin.from("user_profiles").select("id, user_id").eq("player_id", invite.player_id).maybeSingle()
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (profile?.user_id) return NextResponse.json({ error: "Für diesen Spieler existiert bereits ein Konto." }, { status: 409 })

    return NextResponse.json({ ok: true, playerId: player.id, fullName: player.name })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any
    const supabaseAdmin = getAdminClient()

    // Resend flow (best-effort):
    // We try to re-send invite email for an already created invited user.
    // If Supabase returns an error like "User already registered", show a friendly message.
    if (body?.action === "resend") {
      const email = String(body.email || "").trim().toLowerCase()
      if (!isValidEmail(email)) return NextResponse.json({ error: "E-Mail ungültig." }, { status: 400 })

      // ensure we have an invited request in our table (prevents random resends)
      const { data: reqRow, error: reqErr } = await supabaseAdmin
        .from("member_account_requests")
        .select("id, status")
        .eq("email", email)
        .in("status", ["invited", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })
      if (!reqRow) return NextResponse.json({ error: "Keine offene Einladung für diese E‑Mail gefunden." }, { status: 404 })

      const { error: resendErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: INVITE_REDIRECT_TO })
      if (resendErr) {
        return NextResponse.json(
          { error: "Konnte nicht erneut senden. Falls du schon registriert bist: Bitte „Passwort vergessen“ verwenden oder den Vorstand kontaktieren." },
          { status: 409 },
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Normal request flow (auto-invite)
    const code = normalizeCode(body.code || "")
    const firstName = String(body.firstName || "").trim()
    const lastName = String(body.lastName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()

    if (code.length < 8) return NextResponse.json({ error: "Mitglieder‑Code ungültig." }, { status: 400 })
    if (firstName.length < 2) return NextResponse.json({ error: "Vorname ungültig." }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: "E-Mail ungültig." }, { status: 400 })

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("qr_code_generated")
      .select("id, player_id, code, used_at")
      .eq("code", code)
      .maybeSingle()

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
    if (!invite) return NextResponse.json({ error: "Code nicht gefunden." }, { status: 404 })
    if (invite.used_at) return NextResponse.json({ error: "Dieser Code wurde bereits verwendet." }, { status: 409 })

    const { data: player, error: playerErr } = await supabaseAdmin.from("club_players").select("id, name").eq("id", invite.player_id).maybeSingle()
    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 })
    if (!player) return NextResponse.json({ error: "Spieler zu Code nicht gefunden." }, { status: 404 })

    const expected = normalizeName(player.name)
    const expectedParts = expected.split(" ").filter(Boolean)
    const provided = normalizeName(`${firstName} ${lastName}`)

    if (expectedParts.length <= 1) {
      if (normalizeName(firstName) !== expected) return NextResponse.json({ error: "Name passt nicht zum Mitglieder‑Code." }, { status: 400 })
    } else {
      if (lastName.length < 2) return NextResponse.json({ error: "Nachname ungültig." }, { status: 400 })
      if (expected !== provided) return NextResponse.json({ error: "Name passt nicht zum Mitglieder‑Code." }, { status: 400 })
    }

    const { data: profile, error: profileErr } = await supabaseAdmin.from("user_profiles").select("id, user_id").eq("player_id", invite.player_id).maybeSingle()
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (profile?.user_id) return NextResponse.json({ error: "Für diesen Spieler existiert bereits ein Konto." }, { status: 409 })

    // create auth invite
    const { data: inviteAuthData, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: INVITE_REDIRECT_TO,
      data: { player_id: invite.player_id },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 409 })

    const authUserId = inviteAuthData?.user?.id
    if (!authUserId) return NextResponse.json({ error: "Invite konnte nicht erstellt werden." }, { status: 500 })

    // upsert profile
    const { error: upsertProfileErr } = await supabaseAdmin.from("user_profiles").upsert(
      { user_id: authUserId, player_id: invite.player_id, is_admin: false, email_confirmed: false },
      { onConflict: "user_id" },
    )
    if (upsertProfileErr) return NextResponse.json({ error: upsertProfileErr.message }, { status: 500 })

    // insert request row (audit)
    const { error: insertErr } = await supabaseAdmin.from("member_account_requests").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      status: "invited",
      invite_code: code,
      player_id: invite.player_id,
      code_valid: true,
      auth_user_id: authUserId,
      invited_at: new Date().toISOString(),
    })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // mark code used
    const { error: markErr } = await supabaseAdmin.from("qr_code_generated").update({ used_at: new Date().toISOString(), used_by_email: email }).eq("id", invite.id)
    if (markErr) console.error("[member-account-request] failed to mark used:", markErr)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}

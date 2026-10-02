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

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin ||
    "https://emojisdartverein.com"
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

async function sendConfirmationMail({
  email,
  fullName,
  actionLink,
}: {
  email: string
  fullName: string
  actionLink: string
}) {
  const resendApiKey =
    process.env.GUEST_RESEND_API_KEY ||
    process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("Mail-Konfiguration fehlt.")
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "EMD VereinsApp <noreply@emojisdartverein.com>"

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
      <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
        <div style="background:#fff;border:1px solid #e4e4e7;border-radius:22px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 24px;text-align:center;color:#fff;">
            <div style="font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">EMD VereinsApp</div>
            <h1 style="margin:12px 0 0;font-size:28px;">E-Mail bestätigen</h1>
          </div>
          <div style="padding:28px 24px;">
            <p style="font-size:16px;line-height:1.6;">Hallo <strong>${escapeHtml(fullName)}</strong>,</p>
            <p style="font-size:16px;line-height:1.6;">bestätige bitte kurz deine E-Mail-Adresse. Danach ist dein kostenloses Gastkonto direkt aktiv.</p>
            <div style="margin:26px 0;text-align:center;">
              <a href="${actionLink}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:900;">
                E-Mail bestätigen
              </a>
            </div>
            <p style="font-size:13px;line-height:1.6;color:#71717a;">
              Eine spätere Vereinsmitgliedschaft ist davon getrennt und wird weiterhin vom Verein geprüft und bestätigt.
            </p>
          </div>
        </div>
      </div>
    </div>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: "EMD Gastkonto – E-Mail bestätigen",
      html,
      text: `Hallo ${fullName}, bestätige bitte deine E-Mail-Adresse: ${actionLink}`,
    }),
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      responseData?.message ||
      responseData?.error?.message ||
      "Bestätigungs-E-Mail konnte nicht gesendet werden.",
    )
  }
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
      return NextResponse.json(
        { error: "Bitte gib deinen vollständigen Namen ein." },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 },
      )
    }

    const supabaseAdmin = getAdminClient()

    const { data: existingRequest } = await supabaseAdmin
      .from("guest_requests")
      .select("id,status")
      .eq("email", email)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: "Für diese E-Mail-Adresse gibt es bereits ein Gastkonto." },
        { status: 409 },
      )
    }

    const redirectTo = `${getBaseUrl(request)}/guest-login?confirmed=1`

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo,
          data: {
            full_name: fullName,
            account_type: "guest",
          },
        },
      })

    if (linkError || !linkData?.user || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message || "Gastkonto konnte nicht erstellt werden." },
        { status: 500 },
      )
    }

    const authUserId = linkData.user.id

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: authUserId,
        is_guest: true,
        is_admin: false,
        email_confirmed: false,
        is_blocked: false,
        blocked_reason: null,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: requestError } = await supabaseAdmin
      .from("guest_requests")
      .insert({
        full_name: fullName,
        player_name: playerName || null,
        email,
        phone: phone || null,
        status: "approved",
        auth_user_id: authUserId,
        approved_at: new Date().toISOString(),
      })

    if (requestError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    try {
      await sendConfirmationMail({
        email,
        fullName,
        actionLink: linkData.properties.action_link,
      })
    } catch (mailError: any) {
      await supabaseAdmin
        .from("guest_requests")
        .delete()
        .eq("auth_user_id", authUserId)

      await supabaseAdmin
        .from("user_profiles")
        .delete()
        .eq("user_id", authUserId)

      await supabaseAdmin.auth.admin.deleteUser(authUserId)

      return NextResponse.json(
        {
          error:
            mailError?.message ||
            "Bestätigungs-E-Mail konnte nicht gesendet werden.",
        },
        { status: 500 },
      )
    }

    try {
      const notificationUrl = new URL("/api/notify-new-request", request.url)

      const notifyResponse = await fetch(notificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "guest_request",
          fullName,
          playerName,
          email,
          phone,
        }),
      })

      if (!notifyResponse.ok) {
        console.warn("[guest-request] Admin-Info konnte nicht gesendet werden.")
      }
    } catch (notifyError) {
      console.warn("[guest-request] Admin-Info Fehler:", notifyError)
    }

    return NextResponse.json({
      ok: true,
      message:
        "Bestätigungs-E-Mail wurde gesendet. Nach der Bestätigung ist dein Gastkonto direkt aktiv.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unbekannter Fehler." },
      { status: 500 },
    )
  }
}

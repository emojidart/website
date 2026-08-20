import { NextResponse } from "next/server"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://emojisdartverein.com"
  )
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      fullName?: string
    }

    const email = String(body.email || "").trim().toLowerCase()
    const fullName = String(body.fullName || "").trim()

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "E-Mail-Adresse ungültig." },
        { status: 400 },
      )
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Name fehlt." },
        { status: 400 },
      )
    }

    const resendApiKey =
      process.env.RESEND_API_KEY ||
      process.env.GUEST_RESEND_API_KEY

    if (!resendApiKey) {
      console.error("[guest-approved-mail] RESEND_API_KEY / GUEST_RESEND_API_KEY fehlt.")
      return NextResponse.json(
        { error: "Mail-Konfiguration fehlt." },
        { status: 500 },
      )
    }

    const baseUrl = getBaseUrl()
    const loginUrl = `${baseUrl}/guest-login`

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>"

    const subject = "Dein Gastzugang wurde freigeschaltet"

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
        <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 16px 45px rgba(15,23,42,0.10);">
            
            <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);border-radius:18px;padding:12px 16px;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                EMD VereinsApp
              </div>
              <h1 style="margin:18px 0 0 0;color:#ffffff;font-size:28px;line-height:1.15;font-weight:900;">
                Gastzugang freigeschaltet
              </h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.92);font-size:15px;line-height:1.5;">
                Dein Zugang wurde vom Verein geprüft und aktiviert.
              </p>
            </div>

            <div style="padding:28px 24px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                Hallo <strong>${escapeHtml(fullName)}</strong>,
              </p>

              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                dein Gastzugang für die <strong>EMD VereinsApp</strong> wurde freigeschaltet.
              </p>

              <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;">
                Du kannst dich ab sofort mit deiner E-Mail-Adresse und deinem Passwort im Gastbereich anmelden.
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a href="${loginUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:15px 24px;border-radius:14px;box-shadow:0 12px 26px rgba(249,115,22,0.28);">
                  Zum Gast-Login
                </a>
              </div>

              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin-top:22px;">
                <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.55;font-weight:700;">
                  Hinweis: Falls der Button nicht funktioniert, öffne die EMD VereinsApp und gehe auf „Gast-Login“.
                </p>
              </div>

              <p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;">
                Viel Spaß und Good Darts!<br />
                <strong>Emoj’s Dartverein</strong>
              </p>
            </div>

            <div style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px;text-align:center;">
              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
                Diese Nachricht wurde automatisch gesendet. Bitte nicht direkt auf diese E-Mail antworten.
              </p>
            </div>
          </div>
        </div>
      </div>
    `

    const text = `
Hallo ${fullName},

dein Gastzugang für die EMD VereinsApp wurde freigeschaltet.

Du kannst dich ab sofort mit deiner E-Mail-Adresse und deinem Passwort anmelden.

Gast-Login:
${loginUrl}

Viel Spaß und Good Darts!
Emoj’s Dartverein
    `.trim()

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html,
        text,
      }),
    })

    const resendData = await resendResponse.json().catch(() => null)

    if (!resendResponse.ok) {
      console.error("[guest-approved-mail] Resend Fehler:", resendData)

      const resendMessage =
        resendData?.message ||
        resendData?.error?.message ||
        resendData?.error ||
        "Unbekannter Resend-Fehler"

      return NextResponse.json(
        {
          error: `Mail konnte nicht gesendet werden: ${resendMessage}`,
          resend: resendData,
        },
        { status: resendResponse.status || 500 },
      )
    }

    console.log("[guest-approved-mail] Mail erfolgreich gesendet:", {
      to: email,
      id: resendData?.id || null,
    })

    return NextResponse.json({ ok: true, id: resendData?.id || null })
  } catch (error: any) {
    console.error("[guest-approved-mail] Fehler:", error)
    return NextResponse.json(
      { error: error?.message || "Unbekannter Fehler." },
      { status: 500 },
    )
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      organizerName?: string
      eventName?: string
      eventId?: string
    }

    const email = String(body.email || "").trim().toLowerCase()
    const organizerName = String(body.organizerName || "").trim()
    const eventName = String(body.eventName || "").trim()
    const eventId = String(body.eventId || "").trim()

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "E-Mail-Adresse ungültig." },
        { status: 400 },
      )
    }

    if (!eventName) {
      return NextResponse.json(
        { error: "Veranstaltungsname fehlt." },
        { status: 400 },
      )
    }

    const resendApiKey = process.env.GUEST_RESEND_API_KEY

    if (!resendApiKey) {
      console.error("[dach-event-approved-mail] GUEST_RESEND_API_KEY fehlt.")
      return NextResponse.json(
        { error: "Mail-Konfiguration fehlt." },
        { status: 500 },
      )
    }

    const baseUrl = getBaseUrl().replace(/\/$/, "")
    const eventUrl = eventId
      ? `${baseUrl}/dach-veranstaltungen/${eventId}`
      : `${baseUrl}/dach-veranstaltungen`

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>"

    const safeName = escapeHtml(organizerName || "Veranstalter")
    const safeEventName = escapeHtml(eventName)

    const subject = `Veranstaltung freigegeben: ${eventName}`

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
        <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 16px 45px rgba(15,23,42,0.10);">

            <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);border-radius:18px;padding:12px 16px;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                EMD VereinsApp
              </div>
              <h1 style="margin:18px 0 0 0;color:#ffffff;font-size:28px;line-height:1.15;font-weight:900;">
                Veranstaltung freigegeben
              </h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.92);font-size:15px;line-height:1.5;">
                Deine Veranstaltung ist jetzt öffentlich sichtbar.
              </p>
            </div>

            <div style="padding:28px 24px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                Hallo <strong>${safeName}</strong>,
              </p>

              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                deine Veranstaltung <strong>„${safeEventName}“</strong> wurde geprüft und freigegeben.
              </p>

              <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;">
                Sie ist ab sofort im DACH-Veranstaltungskalender sichtbar.
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a href="${eventUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:15px 24px;border-radius:14px;box-shadow:0 12px 26px rgba(22,163,74,0.24);">
                  Veranstaltung ansehen
                </a>
              </div>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:16px 18px;margin-top:22px;">
                <p style="margin:0;color:#166534;font-size:14px;line-height:1.55;font-weight:700;">
                  Änderungen werden erneut zur Prüfung eingereicht.
                </p>
              </div>

              <p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;">
                Viele Grüße und Good Darts!<br />
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
Hallo ${organizerName || "Veranstalter"},

deine Veranstaltung „${eventName}“ wurde geprüft und freigegeben.

Sie ist jetzt öffentlich im DACH-Veranstaltungskalender sichtbar:
${eventUrl}

Änderungen werden erneut zur Prüfung eingereicht.

Viele Grüße und Good Darts!
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
      console.error("[dach-event-approved-mail] Resend Fehler:", resendData)
      return NextResponse.json(
        { error: "Mail konnte nicht gesendet werden." },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[dach-event-approved-mail] Fehler:", error)
    return NextResponse.json(
      { error: error?.message || "Unbekannter Fehler." },
      { status: 500 },
    )
  }
}

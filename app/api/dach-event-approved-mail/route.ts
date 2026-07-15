import { NextResponse } from "next/server"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://emojisdartverein.com"
  ).replace(/\/$/, "")
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      fullName?: string
      eventTitle?: string
      eventId?: string | number
      eventSlug?: string
    }

    const email = String(body.email || "")
      .trim()
      .toLowerCase()

    const fullName = String(body.fullName || "").trim()
    const eventTitle = String(body.eventTitle || "").trim()
    const eventId = String(body.eventId || "").trim()
    const eventSlug = String(body.eventSlug || "").trim()

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "E-Mail-Adresse ungültig.",
        },
        {
          status: 400,
        },
      )
    }

    if (!eventTitle) {
      return NextResponse.json(
        {
          error: "Veranstaltungsname fehlt.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Verwendet denselben Resend-Key wie die bereits
     * funktionierende Gast-Freigabe-Mail.
     */
    const resendApiKey =
      process.env.GUEST_RESEND_API_KEY ||
      process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error(
        "[dach-event-approved-mail] GUEST_RESEND_API_KEY und RESEND_API_KEY fehlen.",
      )

      return NextResponse.json(
        {
          error: "Mail-Konfiguration fehlt.",
        },
        {
          status: 500,
        },
      )
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>"

    const baseUrl = getBaseUrl()

    /*
     * Funktioniert sowohl mit eventSlug als auch eventId.
     * Falls beides nicht vorhanden ist, führt der Link
     * zur allgemeinen Veranstaltungsübersicht.
     */
    const eventIdentifier = eventSlug || eventId

    const eventUrl = eventIdentifier
      ? `${baseUrl}/dach-veranstaltungen/${encodeURIComponent(eventIdentifier)}`
      : `${baseUrl}/dach-veranstaltungen`

    const safeFullName = fullName
      ? escapeHtml(fullName)
      : ""

    const safeEventTitle = escapeHtml(eventTitle)

    const greeting = safeFullName
      ? `Hallo <strong>${safeFullName}</strong>,`
      : "Hallo,"

    const subject = `Deine Veranstaltung „${eventTitle}“ wurde freigegeben`

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
        <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 16px 45px rgba(15,23,42,0.10);">

            <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);border-radius:18px;padding:12px 16px;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                DACH Dart Turniere
              </div>

              <h1 style="margin:18px 0 0 0;color:#ffffff;font-size:28px;line-height:1.15;font-weight:900;">
                Veranstaltung freigegeben
              </h1>

              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.92);font-size:15px;line-height:1.5;">
                Deine Veranstaltung wurde geprüft und veröffentlicht.
              </p>
            </div>

            <div style="padding:28px 24px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                ${greeting}
              </p>

              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                deine Veranstaltung
                <strong>„${safeEventTitle}“</strong>
                wurde freigegeben.
              </p>

              <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;">
                Sie ist ab sofort im Veranstaltungskalender sichtbar.
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a
                  href="${eventUrl}"
                  style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:15px 24px;border-radius:14px;box-shadow:0 12px 26px rgba(220,38,38,0.28);"
                >
                  Veranstaltung ansehen
                </a>
              </div>

              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:16px;padding:16px 18px;margin-top:22px;">
                <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.55;font-weight:700;">
                  Änderungen oder eine Absage kannst du weiterhin über deinen Veranstalterbereich vornehmen.
                </p>
              </div>

              <p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;">
                Viel Erfolg bei deiner Veranstaltung und Good Darts!<br />
                <strong>DACH Dart Turniere</strong>
              </p>
            </div>

            <div style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px;text-align:center;">
              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
                Diese Nachricht wurde automatisch gesendet. Bitte antworte nicht direkt auf diese E-Mail.
              </p>
            </div>

          </div>
        </div>
      </div>
    `

    const text = `
${fullName ? `Hallo ${fullName},` : "Hallo,"}

deine Veranstaltung „${eventTitle}“ wurde freigegeben.

Sie ist ab sofort im Veranstaltungskalender sichtbar.

Veranstaltung ansehen:
${eventUrl}

Änderungen oder eine Absage kannst du weiterhin über deinen Veranstalterbereich vornehmen.

Viel Erfolg bei deiner Veranstaltung und Good Darts!
DACH Dart Turniere
    `.trim()

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
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
      },
    )

    const resendData = await resendResponse
      .json()
      .catch(() => null)

    if (!resendResponse.ok) {
      console.error(
        "[dach-event-approved-mail] Resend Fehler:",
        resendData,
      )

      const resendMessage =
        resendData?.message ||
        resendData?.error?.message ||
        "Mail konnte nicht gesendet werden."

      return NextResponse.json(
        {
          error: resendMessage,
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      ok: true,
      id: resendData?.id || null,
    })
  } catch (error: unknown) {
    console.error(
      "[dach-event-approved-mail] Fehler:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unbekannter Fehler beim Mailversand.",
      },
      {
        status: 500,
      },
    )
  }
}
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

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName.trim()
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

    // Gleiche Resend-Konfiguration wie bei der bestehenden Gast-Freigabemail.
    const resendApiKey =
      process.env.GUEST_RESEND_API_KEY ||
      process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error("[club-join-approved-mail] RESEND_API_KEY / GUEST_RESEND_API_KEY fehlt.")
      return NextResponse.json(
        { error: "Mail-Konfiguration fehlt." },
        { status: 500 },
      )
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>"

    const subject = "Willkommen im Emojis Dartverein 🎯"
    const safeName = escapeHtml(firstName(fullName))

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
        <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 16px 45px rgba(15,23,42,0.10);">

            <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:34px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:9px 14px;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                EMD VereinsApp
              </div>

              <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.15;font-weight:900;">
                Willkommen im Verein 🎯
              </h1>

              <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:15px;line-height:1.5;">
                Deine Beitrittsanfrage wurde bestätigt.
              </p>
            </div>

            <div style="padding:30px 26px;">
              <p style="margin:0 0 18px;font-size:17px;line-height:1.6;">
                Hallo <strong>${safeName}</strong>,
              </p>

              <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#3f3f46;">
                herzlich willkommen im <strong style="color:#18181b;">Emojis Dartverein</strong>!
                Dein Vereinszugang wurde freigeschaltet.
              </p>

              <div style="margin:24px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;">
                <div style="font-size:14px;font-weight:900;color:#9a3412;margin-bottom:6px;">
                  Dein nächster Schritt
                </div>
                <div style="font-size:15px;line-height:1.6;color:#7c2d12;">
                  Öffne die EMD VereinsApp und wähle dort unter
                  <strong>„Meine Mitgliedschaft“</strong> deine gewünschten Pakete und Module aus.
                </div>
              </div>
<p style="margin:0;font-size:16px;line-height:1.6;color:#3f3f46;">
                Wir freuen uns, dich im Verein dabei zu haben.<br /><br />
                <strong style="color:#18181b;">Good Darts!</strong><br />
                Emojis Dartverein
              </p>
            </div>

            <div style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px;text-align:center;">
              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
                Diese Nachricht wurde automatisch von der EMD VereinsApp gesendet.
              </p>
            </div>
          </div>
        </div>
      </div>
    `

    const text = `
Hallo ${firstName(fullName)},

deine Beitrittsanfrage wurde bestätigt.
Herzlich willkommen im Emojis Dartverein!

Dein Vereinszugang wurde freigeschaltet.

Öffne jetzt die EMD VereinsApp und wähle dort unter „Meine Mitgliedschaft“ deine gewünschten Pakete und Module aus.


Wir freuen uns, dich im Verein dabei zu haben.

Good Darts!
Emojis Dartverein
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
      console.error("[club-join-approved-mail] Resend Fehler:", resendData)

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

    console.log("[club-join-approved-mail] Mail erfolgreich gesendet:", {
      to: email,
      id: resendData?.id || null,
    })

    return NextResponse.json({ ok: true, id: resendData?.id || null })
  } catch (error: any) {
    console.error("[club-join-approved-mail] Fehler:", error)
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

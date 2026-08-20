import { NextResponse } from "next/server"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function getRecipients() {
  return String(process.env.JOIN_REQUEST_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const type = String(body.type || "").trim()
    const fullName = String(body.fullName || "").trim()
    const email = String(body.email || "").trim()
    const phone = String(body.phone || "").trim()
    const playerName = String(body.playerName || "").trim()

    if (!fullName) {
      return NextResponse.json({ error: "Name fehlt." }, { status: 400 })
    }

    if (type !== "guest_request" && type !== "club_join_request") {
      return NextResponse.json({ error: "Ungültiger Benachrichtigungstyp." }, { status: 400 })
    }

    const recipients = getRecipients()

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "JOIN_REQUEST_NOTIFICATION_EMAILS fehlt." },
        { status: 500 },
      )
    }

    const resendApiKey =
      process.env.GUEST_RESEND_API_KEY ||
      process.env.RESEND_API_KEY

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY / GUEST_RESEND_API_KEY fehlt." },
        { status: 500 },
      )
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "EMD VereinsApp <noreply@emojisdartverein.com>"

    const isGuest = type === "guest_request"

    const subject = isGuest
      ? `Neuer Gastantrag: ${fullName}`
      : `Neue Beitrittsanfrage: ${fullName}`

    const title = isGuest
      ? "Neuer Gastantrag"
      : "Neue Beitrittsanfrage"

    const description = isGuest
      ? "In der EMD VereinsApp wurde ein neuer Gastzugang beantragt."
      : "In der EMD VereinsApp wurde eine neue Beitrittsanfrage gestellt."

    const html = `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
        <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
          <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden;">
            <div style="background:#f97316;padding:24px;color:#ffffff;">
              <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
                EMD VereinsApp
              </div>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">
                ${title}
              </h1>
            </div>

            <div style="padding:24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52525b;">
                ${description}
              </p>

              <div style="border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
                <div style="padding:12px 14px;border-bottom:1px solid #e4e4e7;">
                  <strong>Name:</strong> ${escapeHtml(fullName)}
                </div>

                ${
                  playerName
                    ? `<div style="padding:12px 14px;border-bottom:1px solid #e4e4e7;">
                         <strong>Spielername:</strong> ${escapeHtml(playerName)}
                       </div>`
                    : ""
                }

                ${
                  email
                    ? `<div style="padding:12px 14px;border-bottom:1px solid #e4e4e7;">
                         <strong>E-Mail:</strong> ${escapeHtml(email)}
                       </div>`
                    : ""
                }

                ${
                  phone
                    ? `<div style="padding:12px 14px;">
                         <strong>Telefon:</strong> ${escapeHtml(phone)}
                       </div>`
                    : ""
                }
              </div>

              <p style="margin:18px 0 0;font-size:13px;color:#71717a;">
                Diese Nachricht wurde automatisch von der EMD VereinsApp gesendet.
              </p>
            </div>
          </div>
        </div>
      </div>
    `

    const text = [
      title,
      "",
      description,
      "",
      `Name: ${fullName}`,
      playerName ? `Spielername: ${playerName}` : "",
      email ? `E-Mail: ${email}` : "",
      phone ? `Telefon: ${phone}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html,
        text,
      }),
    })

    const resendData = await resendResponse.json().catch(() => null)

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          error:
            resendData?.message ||
            resendData?.error?.message ||
            "Info-Mail konnte nicht gesendet werden.",
        },
        { status: resendResponse.status || 500 },
      )
    }

    return NextResponse.json({ ok: true, id: resendData?.id || null })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unbekannter Fehler." },
      { status: 500 },
    )
  }
}

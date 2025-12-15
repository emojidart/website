import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Starting email send process...")

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[v0] RESEND_API_KEY is missing!")
      return NextResponse.json({ error: "Server-Konfigurationsfehler: API-Schlüssel fehlt" }, { status: 500 })
    }

    let Resend
    try {
      const resendModule = await import("resend")
      Resend = resendModule.Resend
    } catch (importError: any) {
      console.error("[v0] Failed to import Resend:", importError)
      return NextResponse.json(
        { error: "Server-Konfigurationsfehler: Resend-Modul konnte nicht geladen werden" },
        { status: 500 },
      )
    }

    const resend = new Resend(apiKey)
    console.log("[v0] Resend client initialized")

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { email, child_first_name, child_last_name, parent_first_name } = body

    // Validierung
    if (!email || !child_first_name || !child_last_name) {
      console.error("[v0] Missing required fields")
      return NextResponse.json({ error: "Fehlende Daten" }, { status: 400 })
    }

    console.log("[v0] Sending email to:", email)

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Bestätigung Ihrer Campus-Anmeldung",
      html: `
        <h2>Willkommen bei Emojis Dartverein!</h2>
        <p>Hallo ${parent_first_name || ""}!</p>
        <p>Die Campus-Anmeldung für <strong>${child_first_name} ${child_last_name}</strong> wurde erfolgreich bestätigt.</p>
        <p>Ihre E-Mail-Adresse: <strong>${email}</strong></p>
        <p>Wir freuen uns darauf, ${child_first_name} bald bei uns zu begrüßen!</p>
        <p>Mit sportlichen Grüßen,<br>Ihr Emoji's Dartverein Team</p>
      `,
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return NextResponse.json({ error: error.message || "Fehler beim Email-Versand" }, { status: 500 })
    }

    console.log("[v0] Email sent successfully:", data)
    return NextResponse.json({
      success: true,
      message: "Bestätigungs-E-Mail erfolgreich versendet",
      data,
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json(
      {
        error: error.message || "Unerwarteter Fehler beim E-Mail-Versand",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

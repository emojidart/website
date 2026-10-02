import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.NEXT_PUBLIC_APP_URL || "https://emojisdartverein.com"
}

function clean(v: unknown) { return typeof v === "string" ? v.trim() : "" }
function emailOk(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex") }
function esc(v: string) { return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;") }

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId")
  if (!eventId) return NextResponse.json({ error: "eventId fehlt." }, { status: 400 })

  const supabase = adminClient()

  const { data: event, error } = await supabase
    .from("dach_events")
    .select("id,name,event_date,start_date,end_date,event_time,max_participants,registration_enabled,registration_mode,show_participants,event_status,internal_event_id,entry_fee")
    .eq("id", eventId)
    .eq("event_status", "approved")
    .maybeSingle()

  if (error || !event) {
    return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 })
  }

  // EMD-interne Turniere verwenden ausschließlich das neue zentrale Turniersystem.
  if (event.internal_event_id) {
    const { data: centralEvent, error: centralEventError } = await supabase
      .from("central_tournament_events")
      .select("id,entry_fee")
      .eq("source_event_id", event.internal_event_id)
      .maybeSingle()

    if (centralEventError) {
      return NextResponse.json({ error: "Turnieranmeldung konnte nicht geladen werden." }, { status: 500 })
    }

    if (centralEvent?.id) {
      const { data: regs, error: regsError } = await supabase
        .from("central_tournament_registrations")
        .select("id,player_name_snapshot,registered_at,status")
        .eq("event_id", centralEvent.id)
        .eq("status", "registered")
        .order("registered_at", { ascending: true })

      if (regsError) {
        return NextResponse.json({ error: "Teilnehmer konnten nicht geladen werden." }, { status: 500 })
      }

      const participants = event.show_participants
        ? (regs || []).map((r: any) => ({
            id: r.id,
            name: r.player_name_snapshot || "Teilnehmer",
          }))
        : []

      return NextResponse.json({
        event: {
          ...event,
          entry_fee: Number(centralEvent.entry_fee ?? event.entry_fee ?? 0),
        },
        participantCount: (regs || []).length,
        participants,
        registrationSource: "central",
        centralEventId: centralEvent.id,
      })
    }
  }

  // Fallback nur für externe / nicht intern verknüpfte DACH-Turniere.
  const { data: regs } = await supabase
    .from("public_event_registrations")
    .select("id,full_name,player_name,registered_at")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("registered_at", { ascending: true })

  const participants = event.show_participants
    ? (regs || []).map((r: any) => ({
        id: r.id,
        name: r.player_name || r.full_name,
      }))
    : []

  return NextResponse.json({
    event,
    participantCount: (regs || []).length,
    participants,
    registrationSource: "legacy-external",
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventId = clean(body.eventId)
    const fullName = clean(body.fullName)
    const playerName = clean(body.playerName)
    const email = clean(body.email).toLowerCase()
    const phone = clean(body.phone)

    if (!eventId || !fullName || !emailOk(email)) {
      return NextResponse.json(
        { error: "Bitte Name und gültige E-Mail angeben." },
        { status: 400 },
      )
    }

    const supabase = adminClient()

    const { data: event } = await supabase
      .from("dach_events")
      .select("id,name,start_date,event_date,event_time,max_participants,registration_enabled,registration_mode,event_status,internal_event_id,entry_fee")
      .eq("id", eventId)
      .eq("event_status", "approved")
      .maybeSingle()

    if (
      !event ||
      !event.registration_enabled ||
      event.registration_mode !== "public_form"
    ) {
      return NextResponse.json(
        { error: "Die Online-Anmeldung ist für dieses Turnier nicht geöffnet." },
        { status: 400 },
      )
    }

    const displayName = playerName || fullName

    // EMD-interne Turniere: ausschließlich neues zentrales Turniersystem.
    if (event.internal_event_id) {
      const { data: centralEvent, error: centralEventError } = await supabase
        .from("central_tournament_events")
        .select("id,max_participants,status,entry_fee")
        .eq("source_event_id", event.internal_event_id)
        .maybeSingle()

      if (centralEventError || !centralEvent?.id) {
        return NextResponse.json(
          { error: "Die zentrale Turnieranmeldung wurde noch nicht vorbereitet." },
          { status: 409 },
        )
      }

      if (["completed", "cancelled", "started"].includes(String(centralEvent.status || ""))) {
        return NextResponse.json(
          { error: "Die Anmeldung für dieses Turnier ist nicht mehr geöffnet." },
          { status: 409 },
        )
      }

      const { count: registeredCount } = await supabase
        .from("central_tournament_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", centralEvent.id)
        .eq("status", "registered")

      const limit = centralEvent.max_participants || event.max_participants || null
      if (limit && (registeredCount || 0) >= limit) {
        return NextResponse.json({ error: "Das Turnier ist bereits voll." }, { status: 409 })
      }

      const { data: existingRows, error: existingError } = await supabase
        .from("central_tournament_registrations")
        .select("id,status,contact_email,player_name_snapshot")
        .eq("event_id", centralEvent.id)
        .order("registered_at", { ascending: false })

      if (existingError) {
        return NextResponse.json(
          { error: "Anmeldung konnte nicht geprüft werden." },
          { status: 500 },
        )
      }

      const normalizedName = displayName.trim().toLocaleLowerCase("de")
      const existing = (existingRows || []).find((row: any) => {
        const sameEmail =
          email &&
          String(row.contact_email || "").trim().toLocaleLowerCase("de") === email
        const sameName =
          String(row.player_name_snapshot || "").trim().toLocaleLowerCase("de") ===
          normalizedName
        return sameEmail || sameName
      })

      if (existing?.status === "registered") {
        return NextResponse.json(
          { error: "Für diese Person besteht bereits eine Anmeldung." },
          { status: 409 },
        )
      }

      const now = new Date().toISOString()
      const entryFee = Math.max(0, Number(centralEvent.entry_fee ?? event.entry_fee ?? 0))
      const centralRow = {
        event_id: centralEvent.id,
        player_name_snapshot: displayName,
        status: "registered",
        paid: entryFee <= 0,
        source: "public",
        contact_email: email,
        contact_phone: phone || null,
        registered_at: now,
        updated_at: now,
        entry_no: 1,
        entry_fee: entryFee,
        payment_method: entryFee <= 0 ? "free" : "on_site",
        deducted_from_credit: false,
        credit_transaction_id: null,
      }

      let saveError: any = null

      if (existing?.id) {
        const result = await supabase
          .from("central_tournament_registrations")
          .update(centralRow)
          .eq("id", existing.id)
        saveError = result.error
      } else {
        const result = await supabase
          .from("central_tournament_registrations")
          .insert(centralRow)
        saveError = result.error
      }

      if (saveError) {
        return NextResponse.json(
          { error: "Anmeldung konnte nicht gespeichert werden." },
          { status: 500 },
        )
      }

      await sendConfirmationMail({
        fullName,
        email,
        event,
      })

      return NextResponse.json({ ok: true, registrationSource: "central" })
    }

    // Fallback ausschließlich für externe / nicht intern verknüpfte DACH-Turniere.
    const { count } = await supabase
      .from("public_event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "active")

    if (event.max_participants && (count || 0) >= event.max_participants) {
      return NextResponse.json({ error: "Das Turnier ist bereits voll." }, { status: 409 })
    }

    const { data: existing } = await supabase
      .from("public_event_registrations")
      .select("id,status")
      .eq("event_id", eventId)
      .ilike("email", email)
      .maybeSingle()

    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "Mit dieser E-Mail besteht bereits eine Anmeldung." },
        { status: 409 },
      )
    }

    const rawToken = randomBytes(32).toString("hex")
    const row = {
      event_id: eventId,
      full_name: fullName,
      player_name: playerName || null,
      email,
      phone: phone || null,
      status: "active",
      cancellation_token_hash: tokenHash(rawToken),
      registered_at: new Date().toISOString(),
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    }

    let dbError
    if (existing?.id) {
      ;({ error: dbError } = await supabase
        .from("public_event_registrations")
        .update(row)
        .eq("id", existing.id))
    } else {
      ;({ error: dbError } = await supabase
        .from("public_event_registrations")
        .insert(row))
    }

    if (dbError) {
      return NextResponse.json(
        { error: "Anmeldung konnte nicht gespeichert werden." },
        { status: 500 },
      )
    }

    await sendConfirmationMail({
      fullName,
      email,
      event,
    })

    return NextResponse.json({ ok: true, registrationSource: "legacy-external" })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unerwarteter Fehler." },
      { status: 500 },
    )
  }
}

async function sendConfirmationMail({
  fullName,
  email,
  event,
}: {
  fullName: string
  email: string
  event: {
    name: string
    start_date: string | null
    event_date: string
    event_time: string | null
  }
}) {
  const resendKey = process.env.GUEST_RESEND_API_KEY || process.env.RESEND_API_KEY
  if (!resendKey) return

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "EMD VereinsApp <noreply@emojisdartverein.com>"

  const date = new Date(
    `${event.start_date || event.event_date}T12:00:00`,
  ).toLocaleDateString("de-DE")

  const html = `<div style="margin:0;background:#f4f4f5;padding:28px 16px;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden"><div style="padding:30px 24px;text-align:center;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">EMD Turnieranmeldung</div><h1 style="margin:14px 0 0;font-size:28px">Du bist angemeldet 🎯</h1></div><div style="padding:28px 24px"><p>Hallo <strong>${esc(fullName)}</strong>,</p><p>deine Anmeldung für <strong>${esc(event.name)}</strong> wurde erfolgreich gespeichert.</p><div style="background:#f8fafc;border-radius:16px;padding:16px;margin:20px 0"><strong>${date}</strong>${event.event_time ? ` · ${String(event.event_time).slice(0, 5)} Uhr` : ""}</div><p>Wir freuen uns auf deine Teilnahme.</p><p>Good Darts!<br><strong>Emoj’s Dartverein</strong></p></div></div></div>`

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Anmeldebestätigung – ${event.name}`,
      html,
      text: `Du bist für ${event.name} am ${date} angemeldet.`,
    }),
  })
}

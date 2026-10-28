import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !secret || !publicKey) {
    return NextResponse.json({ error: "Supabase-Konfiguration fehlt." }, { status: 500 })
  }

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await auth.auth.getUser(token)
  if (userError || !userData.user) return NextResponse.json({ error: "Sitzung ungültig." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const eventId = typeof body?.eventId === "string" ? body.eventId : ""
  if (!/^[a-f0-9-]{36}$/i.test(eventId)) return NextResponse.json({ error: "Ungültige Veranstaltungs-ID." }, { status: 400 })

  const { data: event, error: eventError } = await admin.from("events")
    .select("id,user_id,name,event_type,event_date,start_date,event_time,location,entry_fee,max_participants,access_type,is_emd_organizer")
    .eq("id", eventId).maybeSingle()
  if (eventError || !event) return NextResponse.json({ error: "Veranstaltung nicht gefunden." }, { status: 404 })
  if (event.user_id !== userData.user.id) return NextResponse.json({ error: "Keine Berechtigung für diese Veranstaltung." }, { status: 403 })

  const { data: dach, error: dachError } = await admin.from("dach_events")
    .select("id,registration_enabled,registration_mode,entry_fee,event_status")
    .eq("internal_event_id", eventId).maybeSingle()
  if (dachError) return NextResponse.json({ error: "DACH-Verknüpfung konnte nicht geprüft werden." }, { status: 500 })
  if (event.event_type !== "tournament" || event.is_emd_organizer === false || !dach ||
    dach.registration_enabled !== true || dach.registration_mode !== "public_form") {
    return NextResponse.json({ skipped: true })
  }

  const fee = Number(event.entry_fee ?? dach.entry_fee ?? 0)
  if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "Ungültiges Startgeld." }, { status: 400 })
  const patch = {
    title: event.name,
    event_date: event.start_date || event.event_date,
    start_time: event.event_time || null,
    location: event.location || null,
    max_participants: event.max_participants || null,
    entry_fee: fee,
    access_type: "public",
  }

  const { data: existing, error: findError } = await admin.from("central_tournament_events")
    .select("id,status").eq("source_event_id", eventId).maybeSingle()
  if (findError) return NextResponse.json({ error: "Zentrales Turnier konnte nicht geprüft werden." }, { status: 500 })
  if (existing) {
    const { error } = await admin.from("central_tournament_events")
      .update(patch).eq("id", existing.id)
    if (error) return NextResponse.json({ error: `Zentrales Turnier konnte nicht aktualisiert werden: ${error.message}` }, { status: 500 })
    return NextResponse.json({ ok: true, centralEventId: existing.id, updated: true })
  }

  const { data: created, error: createError } = await admin.from("central_tournament_events")
    .insert({ ...patch, source_event_id: eventId, status: "open", is_spontaneous: false,
      created_by: userData.user.id })
    .select("id").single()
  if (createError || !created) return NextResponse.json({ error: `Zentrales Turnier konnte nicht angelegt werden: ${createError?.message || "Unbekannter Fehler"}` }, { status: 500 })
  return NextResponse.json({ ok: true, centralEventId: created.id, created: true })
}

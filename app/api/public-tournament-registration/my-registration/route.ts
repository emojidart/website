import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

async function identity(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  const db = admin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user || !user.email) return null
  const { data: profile } = await db.from("user_profiles").select("player_id").eq("user_id", user.id).maybeSingle()
  let playerId: string | null = null
  if (profile?.player_id) {
    const { data: club } = await db.from("club_players").select("spieldatenbank_id").eq("id", profile.player_id).maybeSingle()
    playerId = club?.spieldatenbank_id || null
  }
  return { db, email: user.email.toLowerCase(), playerId }
}

async function lookup(request: Request, eventId: string) {
  const who = await identity(request)
  if (!who) return { error: NextResponse.json({ error: "Bitte einloggen." }, { status: 401 }) }
  const { data: event } = await who.db.from("dach_events").select("id,internal_event_id").eq("id", eventId).maybeSingle()
  if (!event?.internal_event_id) return { error: NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 }) }
  const { data: central } = await who.db.from("central_tournament_events").select("id,status").eq("source_event_id", event.internal_event_id).maybeSingle()
  if (!central) return { error: NextResponse.json({ error: "Zentrales Turnier fehlt." }, { status: 404 }) }
  const { data: registrations, error } = await who.db.from("central_tournament_registrations")
    .select("id,player_id,player_name_snapshot,contact_email,status,paid,payment_method,entry_fee")
    .eq("event_id", central.id).eq("status", "registered")
  if (error) return { error: NextResponse.json({ error: "Anmeldung konnte nicht geprüft werden." }, { status: 500 }) }
  const mine = (registrations || []).find(r =>
    (who.playerId && r.player_id === who.playerId) ||
    (r.contact_email && r.contact_email.toLowerCase() === who.email)
  )
  return { who, central, mine }
}

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId") || ""
  if (!eventId) return NextResponse.json({ error: "eventId fehlt." }, { status: 400 })
  const result = await lookup(request, eventId)
  if (result.error) return result.error
  return NextResponse.json({ registered: Boolean(result.mine), name: result.mine?.player_name_snapshot || null,
    canCancel: Boolean(result.mine && !result.mine.paid && result.mine.payment_method !== "credit" && result.central?.status === "open") })
}

export async function DELETE(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId") || ""
  if (!eventId) return NextResponse.json({ error: "eventId fehlt." }, { status: 400 })
  const result = await lookup(request, eventId)
  if (result.error) return result.error
  if (!result.mine) return NextResponse.json({ error: "Keine aktive Anmeldung gefunden." }, { status: 404 })
  if (result.central?.status !== "open") return NextResponse.json({ error: "Abmeldung ist nach Turnierbeginn nicht möglich." }, { status: 409 })
  if (result.mine.paid || result.mine.payment_method === "credit") return NextResponse.json({ error: "Bei bereits bezahlten Anmeldungen bitte an die Turnierleitung wenden." }, { status: 409 })
  const { data, error } = await result.who!.db.from("central_tournament_registrations")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", result.mine.id).eq("status", "registered").select("id").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "Abmeldung konnte nicht gespeichert werden." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

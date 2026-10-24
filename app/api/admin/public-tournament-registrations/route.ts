import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

async function adminFrom(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : ""

  if (!token) return null

  const s = client()
  const { data: u } = await s.auth.getUser(token)
  if (!u.user) return null

  const { data: p } = await s
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", u.user.id)
    .maybeSingle()

  return p?.is_admin ? u.user : null
}

export async function GET(request: Request) {
  if (!(await adminFrom(request))) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 })
  }

  const s = client()

  const { data: events, error } = await s
    .from("dach_events")
    .select(
      "id,name,start_date,event_date,event_time,location,city,max_participants,registration_enabled,registration_mode,show_participants,event_status,internal_event_id,registration_split_by_gender,men_max_participants,women_max_participants,men_reserved_slots,women_reserved_slots",
    )
    .eq("registration_mode", "public_form")
    .order("start_date", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized: any[] = []

  const { data: legacyRegs, error: legacyError } = await s
    .from("public_event_registrations")
    .select(
      "id,event_id,full_name,player_name,email,phone,status,registered_at,cancelled_at,division",
    )
    .order("registered_at", { ascending: false })

  if (legacyError) {
    return NextResponse.json({ error: legacyError.message }, { status: 500 })
  }

  for (const r of legacyRegs || []) {
    normalized.push({
      ...r,
      source: "legacy",
    })
  }

  const internalIds = (events || [])
    .map((e: any) => e.internal_event_id)
    .filter(Boolean)

  if (internalIds.length) {
    const { data: centralEvents, error: centralEventsError } = await s
      .from("central_tournament_events")
      .select("id,source_event_id")
      .in("source_event_id", internalIds)

    if (centralEventsError) {
      return NextResponse.json(
        { error: centralEventsError.message },
        { status: 500 },
      )
    }

    const centralById = new Map(
      (centralEvents || []).map((ce: any) => [ce.id, ce.source_event_id]),
    )

    const sourceToDach = new Map(
      (events || [])
        .filter((e: any) => e.internal_event_id)
        .map((e: any) => [e.internal_event_id, e.id]),
    )

    const centralIds = (centralEvents || []).map((ce: any) => ce.id)

    if (centralIds.length) {
      const { data: centralRegs, error: centralRegsError } = await s
        .from("central_tournament_registrations")
        .select(
          "id,event_id,player_name_snapshot,contact_email,contact_phone,status,registered_at,updated_at,division",
        )
        .in("event_id", centralIds)
        .order("registered_at", { ascending: false })

      if (centralRegsError) {
        return NextResponse.json(
          { error: centralRegsError.message },
          { status: 500 },
        )
      }

      for (const r of centralRegs || []) {
        const sourceEventId = centralById.get(r.event_id)
        const dachEventId = sourceToDach.get(sourceEventId)

        if (!dachEventId) continue

        normalized.push({
          id: r.id,
          event_id: dachEventId,
          full_name: r.player_name_snapshot || "Teilnehmer",
          player_name: null,
          email: r.contact_email || "",
          phone: r.contact_phone || null,
          status: r.status === "registered" ? "active" : "cancelled",
          registered_at: r.registered_at,
          cancelled_at: null,
          division: r.division || null,
          source: "central",
        })
      }
    }
  }

  // Doppelte Alt-/Zentral-Anmeldungen ausblenden:
  // Wenn derselbe Spieler im zentralen Turniersystem vorhanden ist,
  // hat dieser Eintrag Vorrang vor dem alten Legacy-Eintrag.
  const dedupedByEventAndName = new Map<string, any>()

  for (const r of normalized) {
    const key = `${r.event_id}::${String(r.full_name || "")
      .trim()
      .toLocaleLowerCase("de-DE")}`

    const existing = dedupedByEventAndName.get(key)

    if (!existing) {
      dedupedByEventAndName.set(key, r)
      continue
    }

    if (r.source === "central" && existing.source !== "central") {
      dedupedByEventAndName.set(key, r)
      continue
    }

    if (
      r.source === existing.source &&
      new Date(r.registered_at).getTime() >
        new Date(existing.registered_at).getTime()
    ) {
      dedupedByEventAndName.set(key, r)
    }
  }

  const registrations = Array.from(dedupedByEventAndName.values()).sort(
    (a, b) =>
      new Date(b.registered_at).getTime() -
      new Date(a.registered_at).getTime(),
  )

  return NextResponse.json({
    events: events || [],
    registrations,
  })
}

export async function PATCH(request: Request) {
  if (!(await adminFrom(request))) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 })
  }

  const b = await request.json().catch(() => null)
  const s = client()

  if (b?.type === "event") {
    const patch: any = {}

    if (typeof b.registration_enabled === "boolean") {
      patch.registration_enabled = b.registration_enabled
    }

    if (typeof b.show_participants === "boolean") {
      patch.show_participants = b.show_participants
    }

    const { error } = await s
      .from("dach_events")
      .update(patch)
      .eq("id", b.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (b?.type === "capacity") {
    const menReserved = Math.max(0, Number(b.men_reserved_slots || 0))
    const womenReserved = Math.max(0, Number(b.women_reserved_slots || 0))

    const { data: event, error: eventError } = await s
      .from("dach_events")
      .select("men_max_participants,women_max_participants")
      .eq("id", b.id)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json(
        { error: eventError?.message || "Turnier nicht gefunden." },
        { status: 404 },
      )
    }

    const menMax = Math.max(0, Number(event.men_max_participants || 0))
    const womenMax = Math.max(0, Number(event.women_max_participants || 0))

    if (menReserved > menMax || womenReserved > womenMax) {
      return NextResponse.json(
        { error: "Reservierte Plätze dürfen das jeweilige Maximum nicht überschreiten." },
        { status: 400 },
      )
    }

    const { error } = await s
      .from("dach_events")
      .update({
        men_reserved_slots: menReserved,
        women_reserved_slots: womenReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (b?.type === "division") {
    const division =
      b.division === "men"
        ? "men"
        : b.division === "women"
          ? "women"
          : null

    if (!division) {
      return NextResponse.json(
        { error: "Ungültiger Bewerb." },
        { status: 400 },
      )
    }

    const table =
      b.source === "central"
        ? "central_tournament_registrations"
        : "public_event_registrations"

    const { error } = await s
      .from(table)
      .update({
        division,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (b?.type === "registration") {
    const active = b.status === "active"
    const now = new Date().toISOString()

    if (b.source === "central") {
      const { error } = await s
        .from("central_tournament_registrations")
        .update({
          status: active ? "registered" : "withdrawn",
          updated_at: now,
        })
        .eq("id", b.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await s
        .from("public_event_registrations")
        .update({
          status: active ? "active" : "cancelled",
          cancelled_at: active ? null : now,
          updated_at: now,
        })
        .eq("id", b.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 })
}

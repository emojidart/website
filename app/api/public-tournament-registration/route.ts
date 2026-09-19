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
  const { data: event, error } = await supabase.from("dach_events")
    .select("id,name,event_date,start_date,end_date,event_time,max_participants,registration_enabled,registration_mode,show_participants,event_status")
    .eq("id", eventId).eq("event_status", "approved").maybeSingle()
  if (error || !event) return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 })

  const { data: regs } = await supabase.from("public_event_registrations")
    .select("id,full_name,player_name,registered_at")
    .eq("event_id", eventId).eq("status", "active").order("registered_at", { ascending: true })

  const participants = event.show_participants ? (regs || []).map((r:any) => ({ id:r.id, name:r.player_name || r.full_name })) : []
  return NextResponse.json({ event, participantCount:(regs || []).length, participants })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventId = clean(body.eventId)
    const fullName = clean(body.fullName)
    const playerName = clean(body.playerName)
    const email = clean(body.email).toLowerCase()
    const phone = clean(body.phone)
    if (!eventId || !fullName || !emailOk(email)) return NextResponse.json({ error:"Bitte Name und gültige E-Mail angeben." }, { status:400 })

    const supabase = adminClient()
    const { data:event } = await supabase.from("dach_events")
      .select("id,name,start_date,event_date,event_time,max_participants,registration_enabled,registration_mode,event_status")
      .eq("id",eventId).eq("event_status","approved").maybeSingle()
    if (!event || !event.registration_enabled || event.registration_mode !== "public_form") return NextResponse.json({ error:"Die Online-Anmeldung ist für dieses Turnier nicht geöffnet." }, { status:400 })

    const { count } = await supabase.from("public_event_registrations").select("id", { count:"exact", head:true }).eq("event_id",eventId).eq("status","active")
    if (event.max_participants && (count || 0) >= event.max_participants) return NextResponse.json({ error:"Das Turnier ist bereits voll." }, { status:409 })

    const { data:existing } = await supabase.from("public_event_registrations").select("id,status").eq("event_id",eventId).ilike("email",email).maybeSingle()
    if (existing?.status === "active") return NextResponse.json({ error:"Mit dieser E-Mail besteht bereits eine Anmeldung." }, { status:409 })

    const rawToken = randomBytes(32).toString("hex")
    const row = { event_id:eventId, full_name:fullName, player_name:playerName || null, email, phone:phone || null, status:"active", cancellation_token_hash:tokenHash(rawToken), registered_at:new Date().toISOString(), cancelled_at:null, updated_at:new Date().toISOString() }
    let dbError
    if (existing?.id) ({ error:dbError } = await supabase.from("public_event_registrations").update(row).eq("id",existing.id))
    else ({ error:dbError } = await supabase.from("public_event_registrations").insert(row))
    if (dbError) return NextResponse.json({ error:"Anmeldung konnte nicht gespeichert werden." }, { status:500 })

    const resendKey = process.env.GUEST_RESEND_API_KEY || process.env.RESEND_API_KEY
    if (resendKey) {
      const cancelUrl = `${baseUrl()}/turnier-anmeldung/abmelden?token=${encodeURIComponent(rawToken)}`
      const from = process.env.RESEND_FROM_EMAIL || "EMD VereinsApp <noreply@emojisdartverein.com>"
      const date = new Date(`${event.start_date || event.event_date}T12:00:00`).toLocaleDateString("de-DE")
      const html = `<div style="margin:0;background:#f4f4f5;padding:28px 16px;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden"><div style="padding:30px 24px;text-align:center;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">EMD Turnieranmeldung</div><h1 style="margin:14px 0 0;font-size:28px">Du bist angemeldet 🎯</h1></div><div style="padding:28px 24px"><p>Hallo <strong>${esc(fullName)}</strong>,</p><p>deine Anmeldung für <strong>${esc(event.name)}</strong> wurde erfolgreich gespeichert.</p><div style="background:#f8fafc;border-radius:16px;padding:16px;margin:20px 0"><strong>${date}</strong>${event.event_time ? ` · ${String(event.event_time).slice(0,5)} Uhr` : ""}</div><p>Falls du doch nicht teilnehmen kannst, kannst du dich über diesen persönlichen Link wieder abmelden:</p><p style="margin:24px 0"><a href="${cancelUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:800;padding:13px 18px;border-radius:12px">Von Turnier abmelden</a></p><p>Good Darts!<br><strong>Emoj’s Dartverein</strong></p></div></div></div>`
      await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${resendKey}`, "Content-Type":"application/json" }, body:JSON.stringify({ from, to:email, subject:`Anmeldebestätigung – ${event.name}`, html, text:`Du bist für ${event.name} am ${date} angemeldet. Abmelden: ${cancelUrl}` }) })
    }

    return NextResponse.json({ ok:true })
  } catch (e:any) {
    return NextResponse.json({ error:e?.message || "Unerwarteter Fehler." }, { status:500 })
  }
}

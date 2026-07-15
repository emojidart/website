"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, Loader2, Save, ShieldAlert } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const REGIONS: Record<string, string[]> = {
  AT: ["Burgenland","Kärnten","Niederösterreich","Oberösterreich","Salzburg","Steiermark","Tirol","Vorarlberg","Wien"],
  DE: ["Baden-Württemberg","Bayern","Berlin","Brandenburg","Bremen","Hamburg","Hessen","Mecklenburg-Vorpommern","Niedersachsen","Nordrhein-Westfalen","Rheinland-Pfalz","Saarland","Sachsen","Sachsen-Anhalt","Schleswig-Holstein","Thüringen"],
  CH: ["Aargau","Appenzell Ausserrhoden","Appenzell Innerrhoden","Basel-Landschaft","Basel-Stadt","Bern","Freiburg","Genf","Glarus","Graubünden","Jura","Luzern","Neuenburg","Nidwalden","Obwalden","Schaffhausen","Schwyz","Solothurn","St. Gallen","Tessin","Thurgau","Uri","Waadt","Wallis","Zug","Zürich"],
}
const POSTAL: Record<string, RegExp> = { AT: /^\d{4}$/, DE: /^\d{5}$/, CH: /^\d{4}$/ }

type Form = {
  name: string; start_date: string; end_date: string; event_time: string; country_code: string;
  postal_code: string; city: string; street: string; region: string; discipline: string; format: string;
  entry_fee: string; max_participants: string; organizer_name: string; organizer_email: string;
  organizer_phone: string; registration_url: string; startgeld_details: string; details: string;
  photo_url: string | null; event_status: string;
}

export default function BearbeitenPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [flyer, setFlyer] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => { void load() }, [id])
  async function load() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push("/guest-login"); return }
    const { data, error } = await supabase.from("dach_events").select("*").eq("id", id).eq("created_by", auth.user.id).maybeSingle()
    if (error || !data) { setMessage(error?.message || "Veranstaltung nicht gefunden."); setLoading(false); return }
    if (data.event_status === "cancelled") { setMessage("Abgesagte Veranstaltungen zuerst unter ‘Meine Veranstaltungen’ neu einreichen."); setLoading(false); return }
    setForm({
      name:data.name||"", start_date:data.start_date||"", end_date:data.end_date||data.start_date||"", event_time:(data.event_time||"").slice(0,5),
      country_code:data.country_code||"AT", postal_code:data.postal_code||"", city:data.city||"", street:data.street||"", region:data.region||"",
      discipline:data.discipline||"both", format:data.format||"single", entry_fee:data.entry_fee?.toString()||"", max_participants:data.max_participants?.toString()||"",
      organizer_name:data.organizer_name||"", organizer_email:data.organizer_email||"", organizer_phone:data.organizer_phone||"", registration_url:data.registration_url||"",
      startgeld_details:data.startgeld_details||"", details:data.details||"", photo_url:data.photo_url||null, event_status:data.event_status,
    }); setLoading(false)
  }

  const setField = (key: keyof Form, value: string) => setForm(old => old ? ({...old,[key]:value}) : old)

  async function upload(userId: string) {
    if (!flyer) return form?.photo_url || null
    const ext = flyer.name.split(".").pop() || "jpg"
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from("dach-event-flyers").upload(path, flyer, { contentType: flyer.type || undefined })
    if (error) throw error
    return supabase.storage.from("dach-event-flyers").getPublicUrl(path).data.publicUrl
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form) return; setSaving(true); setMessage("")
    try {
      const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error("Bitte neu anmelden.")
      if (!form.name.trim() || !form.start_date || !form.city.trim() || !form.organizer_name.trim()) throw new Error("Bitte Name, Datum, Ort und Veranstalter ausfüllen.")
      if (!POSTAL[form.country_code].test(form.postal_code)) throw new Error("Bitte eine gültige PLZ eingeben.")
      if (!form.region) throw new Error("Bitte Bundesland bzw. Kanton auswählen.")
      if (form.end_date < form.start_date) throw new Error("Enddatum darf nicht vor dem Startdatum liegen.")
      const photo_url = await upload(auth.user.id)
      const location = [form.street.trim(), `${form.postal_code} ${form.city.trim()}`, form.country_code].filter(Boolean).join(", ")
      const { error } = await supabase.from("dach_events").update({
        name:form.name.trim(), event_date:form.start_date, start_date:form.start_date, end_date:form.end_date || form.start_date,
        event_time:form.event_time || null, country_code:form.country_code, postal_code:form.postal_code, city:form.city.trim(), street:form.street.trim() || null,
        region:form.region, location, discipline:form.discipline, mode:form.discipline, format:form.format,
        entry_fee:form.entry_fee ? Number(form.entry_fee.replace(",",".")) : null, max_participants:form.max_participants ? Number(form.max_participants) : null,
        organizer_name:form.organizer_name.trim(), organizer_email:form.organizer_email.trim() || null, organizer_phone:form.organizer_phone.trim() || null,
        registration_url:form.registration_url.trim() || null, startgeld_details:form.startgeld_details.trim() || null, details:form.details.trim() || null,
        photo_url, event_status:"pending",
      }).eq("id", id).eq("created_by", auth.user.id)
      if (error) throw error
      router.push("/dach-veranstaltungen/meine")
    } catch (err:any) { setMessage(err?.message || "Änderungen konnten nicht gespeichert werden.") }
    finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen bg-gray-50"><Header/><div className="pt-32 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-600"/></div></div>
  if (!form) return <div className="min-h-screen bg-gray-50"><Header/><main className="pt-24 px-4"><Card className="max-w-lg mx-auto rounded-3xl"><CardContent className="p-7 text-center"><ShieldAlert className="w-10 h-10 mx-auto text-orange-600"/><p className="font-bold mt-4">{message}</p><Button className="mt-5" onClick={()=>router.push('/dach-veranstaltungen/meine')}>Zurück</Button></CardContent></Card></main></div>

  return <div className="min-h-screen bg-gray-50 pb-24"><Header/><main className="max-w-4xl mx-auto px-4 pt-20">
    <Button variant="outline" onClick={()=>router.push('/dach-veranstaltungen/meine')} className="rounded-xl mb-4"><ArrowLeft className="w-4 h-4 mr-2"/>Zurück</Button>
    <Card className="rounded-3xl"><CardContent className="p-6"><div className="mb-6"><div className="text-sm font-bold text-orange-600 uppercase">Bearbeiten</div><h1 className="text-3xl font-black">Veranstaltung ändern</h1><p className="text-sm text-gray-600 mt-2">Nach dem Speichern wird die Veranstaltung erneut geprüft.</p></div>
      <form onSubmit={save} className="space-y-5">
        <Field label="Veranstaltungsname"><Input value={form.name} onChange={e=>setField('name',e.target.value)} required/></Field>
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Startdatum"><Input type="date" value={form.start_date} onChange={e=>setField('start_date',e.target.value)} required/></Field><Field label="Enddatum"><Input type="date" value={form.end_date} onChange={e=>setField('end_date',e.target.value)} required/></Field><Field label="Uhrzeit"><Input type="time" value={form.event_time} onChange={e=>setField('event_time',e.target.value)}/></Field></div>
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Land"><Select value={form.country_code} onValueChange={v=>setForm({...form,country_code:v,region:'',postal_code:''})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="AT">Österreich</SelectItem><SelectItem value="DE">Deutschland</SelectItem><SelectItem value="CH">Schweiz</SelectItem></SelectContent></Select></Field><Field label="PLZ"><Input inputMode="numeric" value={form.postal_code} onChange={e=>setField('postal_code',e.target.value.replace(/\D/g,''))}/></Field><Field label="Ort"><Input value={form.city} onChange={e=>setField('city',e.target.value)} required/></Field></div>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Straße / Lokal"><Input value={form.street} onChange={e=>setField('street',e.target.value)}/></Field><Field label="Bundesland / Kanton"><Select value={form.region} onValueChange={v=>setField('region',v)}><SelectTrigger><SelectValue placeholder="Auswählen"/></SelectTrigger><SelectContent>{REGIONS[form.country_code].map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></Field></div>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Dartart"><Select value={form.discipline} onValueChange={v=>setField('discipline',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="edart">E-Dart</SelectItem><SelectItem value="steeldart">Steel-Dart</SelectItem><SelectItem value="both">Beides</SelectItem></SelectContent></Select></Field><Field label="Format"><Select value={form.format} onValueChange={v=>setField('format',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="single">Einzel</SelectItem><SelectItem value="double">Doppel</SelectItem><SelectItem value="team">Mannschaft</SelectItem><SelectItem value="other">Sonstiges</SelectItem></SelectContent></Select></Field></div>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Startgeld"><Input value={form.entry_fee} onChange={e=>setField('entry_fee',e.target.value)}/></Field><Field label="Max. Teilnehmer"><Input type="number" value={form.max_participants} onChange={e=>setField('max_participants',e.target.value)}/></Field></div>
        <Field label="Veranstalter"><Input value={form.organizer_name} onChange={e=>setField('organizer_name',e.target.value)} required/></Field>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="E-Mail"><Input type="email" value={form.organizer_email} onChange={e=>setField('organizer_email',e.target.value)}/></Field><Field label="Telefon"><Input value={form.organizer_phone} onChange={e=>setField('organizer_phone',e.target.value)}/></Field></div>
        <Field label="Anmeldelink"><Input value={form.registration_url} onChange={e=>setField('registration_url',e.target.value)}/></Field>
        <Field label="Startgeld-Details"><Input value={form.startgeld_details} onChange={e=>setField('startgeld_details',e.target.value)}/></Field>
        <Field label="Beschreibung"><Textarea rows={5} value={form.details} onChange={e=>setField('details',e.target.value)}/></Field>
        <Field label="Neuen Flyer auswählen (optional)"><Input type="file" accept="image/*,application/pdf" onChange={e=>setFlyer(e.target.files?.[0] || null)}/></Field>
        {message && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{message}</div>}
        <Button disabled={saving} className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700"><Save className="w-4 h-4 mr-2"/>{saving ? 'Speichert …' : 'Änderungen einreichen'}</Button>
      </form>
    </CardContent></Card>
  </main><MobileBottomNav/></div>
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="space-y-2"><label className="text-sm font-bold text-gray-700">{label}</label>{children}</div> }

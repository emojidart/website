"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { CalendarDays, CheckCircle2, Clock3, Edit3, Eye, Loader2, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, Trash2, XCircle } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Status = "draft" | "pending" | "approved" | "rejected" | "cancelled"
type EventRow = {
  id: string; name: string; start_date: string; end_date: string; event_time: string | null;
  city: string; country_code: string; discipline: string | null; photo_url: string | null;
  event_status: Status; rejection_reason: string | null; cancellation_reason: string | null; cancelled_at: string | null; created_at: string; updated_at: string;
}

const statusConfig: Record<Status, { label: string; className: string; hint: string }> = {
  draft: { label: "Entwurf", className: "bg-gray-100 text-gray-700 border-gray-200", hint: "Noch nicht zur Prüfung eingereicht." },
  pending: { label: "In Prüfung", className: "bg-amber-50 text-amber-800 border-amber-200", hint: "Wartet auf die Freigabe durch den Verein." },
  approved: { label: "Freigegeben", className: "bg-green-50 text-green-800 border-green-200", hint: "Öffentlich sichtbar." },
  rejected: { label: "Änderung nötig", className: "bg-red-50 text-red-800 border-red-200", hint: "Bitte Hinweis prüfen und erneut einreichen." },
  cancelled: { label: "Abgesagt", className: "bg-slate-100 text-slate-700 border-slate-200", hint: "Die Veranstaltung ist als abgesagt markiert." },
}

function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("de-AT") }

export default function MeineDachVeranstaltungenPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState("")
  const [cancelEvent, setCancelEvent] = useState<EventRow | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  async function loadEvents() {
    setLoading(true); setMessage("")
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { router.push("/guest-login"); return }
    const { data, error } = await supabase.from("dach_events")
      .select("id,name,start_date,end_date,event_time,city,country_code,discipline,photo_url,event_status,rejection_reason,cancellation_reason,cancelled_at,created_at,updated_at")
      .eq("created_by", auth.user.id).order("created_at", { ascending: false })
    if (error) setMessage(error.message)
    setEvents((data || []) as EventRow[]); setLoading(false)
  }

  useEffect(() => { void loadEvents() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => !q || `${e.name} ${e.city} ${e.country_code} ${statusConfig[e.event_status].label}`.toLowerCase().includes(q))
  }, [events, query])

  const counts = useMemo(() => ({
    all: events.length,
    pending: events.filter(e => e.event_status === "pending").length,
    approved: events.filter(e => e.event_status === "approved").length,
    cancelled: events.filter(e => e.event_status === "cancelled").length,
  }), [events])

  async function cancelSelectedEvent() {
    if (!cancelEvent) return

    setSavingId(cancelEvent.id)
    setMessage("")

    const { error } = await supabase
      .from("dach_events")
      .update({
        event_status: "cancelled",
        cancellation_reason: cancellationReason.trim() || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", cancelEvent.id)

    if (error) {
      setMessage(error.message)
    } else {
      setCancelEvent(null)
      setCancellationReason("")
      await loadEvents()
    }

    setSavingId(null)
  }

  async function reactivateEvent(id: string) {
    setSavingId(id)
    setMessage("")

    const { error } = await supabase
      .from("dach_events")
      .update({
        event_status: "pending",
        cancellation_reason: null,
        cancelled_at: null,
      })
      .eq("id", id)

    if (error) setMessage(error.message)
    else await loadEvents()

    setSavingId(null)
  }

  async function removeEvent(id: string) {
    if (!window.confirm("Diese Veranstaltung wirklich dauerhaft löschen?")) return
    setSavingId(id)
    const { error } = await supabase.from("dach_events").delete().eq("id", id)
    if (error) setMessage(error.message); else await loadEvents()
    setSavingId(null)
  }

  return <div className="min-h-screen bg-gray-50 pb-24"><Header />
    <main className="mx-auto max-w-6xl px-4 pt-20 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><div className="text-sm font-bold text-orange-300 uppercase">DACH-Veranstaltungen</div><h1 className="text-3xl font-black mt-1">Meine Veranstaltungen</h1><p className="text-slate-300 mt-2">Einreichen, Status verfolgen, bearbeiten oder absagen.</p></div>
          <Button asChild className="rounded-2xl bg-orange-600 hover:bg-orange-700"><Link href="/dach-veranstaltungen/neu"><Plus className="w-4 h-4 mr-2" />Neue Veranstaltung</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Gesamt', counts.all, CalendarDays], ['In Prüfung', counts.pending, Clock3], ['Freigegeben', counts.approved, CheckCircle2], ['Abgesagt', counts.cancelled, XCircle]].map(([label,value,Icon]: any) => <Card key={label} className="rounded-2xl"><CardContent className="p-4"><Icon className="w-5 h-5 text-orange-600"/><div className="text-2xl font-black mt-2">{value}</div><div className="text-xs font-bold text-gray-500 uppercase">{label}</div></CardContent></Card>)}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, Ort oder Status suchen …" className="pl-9 h-11 rounded-2xl bg-white"/></div>
        <Button variant="outline" onClick={()=>void loadEvents()} className="rounded-2xl"><RefreshCw className="w-4 h-4 mr-2"/>Neu laden</Button>
      </div>

      {message && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{message}</div>}
      {loading ? <div className="py-16 flex justify-center"><Loader2 className="w-9 h-9 animate-spin text-orange-600"/></div> : filtered.length === 0 ? <Card className="rounded-3xl"><CardContent className="p-10 text-center"><ShieldAlert className="w-10 h-10 mx-auto text-gray-400"/><div className="font-black mt-3">Noch keine Veranstaltung vorhanden</div><Button asChild className="mt-5 rounded-2xl"><Link href="/dach-veranstaltungen/neu">Erste Veranstaltung anlegen</Link></Button></CardContent></Card> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(event => { const cfg = statusConfig[event.event_status]; const busy = savingId === event.id; return <Card key={event.id} className="rounded-3xl overflow-hidden border-gray-200 shadow-sm"><CardContent className="p-0">
          <div className="flex">
            <div className="w-28 sm:w-36 bg-slate-100 flex-shrink-0">{event.photo_url ? <img src={event.photo_url} alt="" className="w-full h-full min-h-44 object-cover"/> : <div className="h-full min-h-44 flex items-center justify-center"><CalendarDays className="w-9 h-9 text-slate-400"/></div>}</div>
            <div className="p-4 min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="font-black text-lg leading-tight truncate">{event.name}</div><Badge variant="outline" className={cfg.className}>{cfg.label}</Badge></div>
              <div className="text-sm text-gray-600 mt-2">{formatDate(event.start_date)}{event.end_date !== event.start_date ? ` – ${formatDate(event.end_date)}` : ''}{event.event_time ? ` · ${event.event_time.slice(0,5)} Uhr` : ''}</div>
              <div className="text-sm font-semibold text-gray-700 mt-1">{event.city} · {event.country_code}</div><div className="text-xs text-gray-500 mt-2">{cfg.hint}</div>
              {event.event_status === 'rejected' && event.rejection_reason && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800">Hinweis: {event.rejection_reason}</div>}
              {event.event_status === 'cancelled' && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800">
                  <div className="font-black uppercase">Veranstaltung abgesagt</div>
                  {event.cancellation_reason ? (
                    <div className="mt-1">Grund: {event.cancellation_reason}</div>
                  ) : (
                    <div className="mt-1">Es wurde kein Absagegrund angegeben.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="border-t bg-gray-50 p-3 flex flex-wrap gap-2">
            {event.event_status === 'approved' && <Button asChild size="sm" variant="outline" className="rounded-xl"><Link href={`/dach-veranstaltungen/${event.id}`}><Eye className="w-4 h-4 mr-1"/>Ansehen</Link></Button>}
            {event.event_status !== 'cancelled' && <Button asChild size="sm" variant="outline" className="rounded-xl"><Link href={`/dach-veranstaltungen/${event.id}/bearbeiten`}><Edit3 className="w-4 h-4 mr-1"/>Bearbeiten</Link></Button>}
            {event.event_status !== 'cancelled' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setCancelEvent(event)
                  setCancellationReason("")
                }}
                className="rounded-xl text-red-700 border-red-200"
              >
                <XCircle className="w-4 h-4 mr-1"/>
                Absagen
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void reactivateEvent(event.id)}
                className="rounded-xl"
              >
                <RotateCcw className="w-4 h-4 mr-1"/>
                Neu einreichen
              </Button>
            )}
            {['draft','rejected','cancelled'].includes(event.event_status) && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>void removeEvent(event.id)} className="rounded-xl text-red-600"><Trash2 className="w-4 h-4 mr-1"/>Löschen</Button>}
          </div>
        </CardContent></Card>})}
      </div>}
    </main>

    <AlertDialog
      open={Boolean(cancelEvent)}
      onOpenChange={(open) => {
        if (!open && !savingId) {
          setCancelEvent(null)
          setCancellationReason("")
        }
      }}
    >
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
  <AlertDialogTitle>
    Veranstaltung absagen?
  </AlertDialogTitle>

  <AlertDialogDescription>
    Möchtest du{" "}
    <span className="font-bold text-gray-900">
      „{cancelEvent?.name}“
    </span>{" "}
    wirklich absagen?
  </AlertDialogDescription>
</AlertDialogHeader>

<div className="space-y-2">
  <label className="text-sm font-black text-gray-900">
    Grund für die Absage (optional)
  </label>

  <Textarea
    value={cancellationReason}
    onChange={(e) => setCancellationReason(e.target.value)}
    placeholder="z. B. zu wenige Anmeldungen, technische Probleme, Ausfall des Veranstaltungsortes oder unvorhersehbare organisatorische Gründe."
    className="min-h-[100px] rounded-xl"
  />

  <p className="text-xs text-gray-500">
    Dieser Hinweis wird bei der Veranstaltung angezeigt.
  </p>
</div>

<AlertDialogFooter>
  <AlertDialogCancel disabled={Boolean(savingId)}>
    Zurück
  </AlertDialogCancel>

  <AlertDialogAction
    onClick={(e) => {
      e.preventDefault()
      void cancelSelectedEvent()
    }}
    disabled={Boolean(savingId)}
    className="bg-red-600 hover:bg-red-700"
  >
    {savingId ? (
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
    ) : (
      <XCircle className="w-4 h-4 mr-2" />
    )}

    Veranstaltung absagen
  </AlertDialogAction>
</AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <MobileBottomNav />
  </div>
}


"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin, Swords, Target, Users, X, ZoomIn, FileText } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type DachEvent = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  country_code: string
  postal_code: string | null
  city: string
  street: string | null
  organizer_name: string
  organizer_email: string | null
  organizer_phone: string | null
  registration_url: string | null
  registration_deadline: string | null
  entry_fee: number | null
  max_participants: number | null
  details: string | null
  photo_url: string | null
  discipline: string | null
  format: string | null
  startgeld_details: string | null
}

function dateDE(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE")
}

function disciplineLabel(value: string | null) {
  if (value === "edart") return "E-Dart"
  if (value === "steeldart") return "Steel-Dart"
  if (value === "both") return "E-Dart & Steel-Dart"
  return "Dart"
}

export default function DachVeranstaltungDetailPage() {
  const params = useParams<{ id: string }>()
  const [event, setEvent] = useState<DachEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [flyerOpen, setFlyerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("dach_events")
        .select("*")
        .eq("id", params.id)
        .eq("event_status", "approved")
        .maybeSingle()

      if (error) setError(error.message)
      setEvent((data as DachEvent | null) ?? null)
      setLoading(false)
    }
    if (params.id) void load()
  }, [params.id])

  const location = event
    ? [event.street, [event.postal_code, event.city].filter(Boolean).join(" "), event.country_code]
        .filter(Boolean)
        .join(", ")
    : ""

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-20">
        <Button asChild variant="outline" className="mb-4 rounded-xl">
          <Link href="/dach-veranstaltungen"><ArrowLeft className="mr-2 h-4 w-4" />Zur Übersicht</Link>
        </Button>

        {loading ? <div className="py-20 text-center">Veranstaltung wird geladen…</div> : null}
        {error ? <div className="py-20 text-center text-red-600">{error}</div> : null}
        {!loading && !error && !event ? <div className="py-20 text-center">Veranstaltung nicht gefunden.</div> : null}

        {event ? (
          <Card className="overflow-hidden rounded-3xl">
            {event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf") ? (
              <button
                type="button"
                onClick={() => setFlyerOpen(true)}
                className="group relative h-72 w-full bg-gray-200"
                aria-label="Flyer vergrößern"
              >
                <Image src={event.photo_url} alt={event.name} fill className="object-contain" />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white">
                  <ZoomIn className="h-4 w-4" />
                  Flyer vergrößern
                </div>
              </button>
            ) : event.photo_url ? (
              <button
                type="button"
                onClick={() => setFlyerOpen(true)}
                className="flex h-40 w-full flex-col items-center justify-center gap-3 bg-slate-900 text-white"
              >
                <FileText className="h-10 w-10" />
                <span className="font-black">PDF-Flyer anzeigen</span>
              </button>
            ) : null}
            <CardContent className="p-6 sm:p-8">
              <h1 className="text-3xl font-black">{event.name}</h1>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex gap-2"><CalendarDays className="h-4 w-4 text-orange-600" />{dateDE(event.start_date)}{event.end_date !== event.start_date ? ` – ${dateDE(event.end_date)}` : ""}</div>
                <div className="flex gap-2"><Clock className="h-4 w-4 text-orange-600" />{event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : "Uhrzeit offen"}</div>
                <div className="flex gap-2"><MapPin className="h-4 w-4 text-orange-600" />{location || event.location}</div>
                <div className="flex gap-2">{event.discipline === "edart" ? <Target className="h-4 w-4" /> : event.discipline === "steeldart" ? <Swords className="h-4 w-4" /> : <Users className="h-4 w-4" />}{disciplineLabel(event.discipline)}</div>
              </div>

              <div className="mt-6 grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2">
                <p><strong>Veranstalter:</strong><br />{event.organizer_name}</p>
                <p><strong>Startgeld:</strong><br />{event.startgeld_details || (event.entry_fee != null ? `€ ${event.entry_fee}` : "Keine Angabe")}</p>
                <p><strong>Teilnehmer:</strong><br />{event.max_participants ? `Maximal ${event.max_participants}` : "Keine Begrenzung angegeben"}</p>
                <p><strong>Kontakt:</strong><br />{event.organizer_email || event.organizer_phone || "Keine Angabe"}</p>
              </div>

              {event.details ? <p className="mt-6 whitespace-pre-line text-gray-700">{event.details}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {event.registration_url ? <Button asChild><a href={event.registration_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Zur Anmeldung</a></Button> : null}
                {event.photo_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFlyerOpen(true)}
                  >
                    <ZoomIn className="mr-2 h-4 w-4" />
                    Flyer anzeigen
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>

      {mounted && flyerOpen && event?.photo_url
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-3"
              role="dialog"
              aria-modal="true"
              onClick={() => setFlyerOpen(false)}
            >
              <div
                className="relative h-[92vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setFlyerOpen(false)}
                  className="absolute right-3 top-3 z-[100000] inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-gray-900 shadow-lg ring-1 ring-gray-300 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                  Schließen
                </button>

                {event.photo_url.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={event.photo_url}
                    title={`Flyer: ${event.name}`}
                    className="h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black p-4">
                    <img
                      src={event.photo_url}
                      alt={`Flyer: ${event.name}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      <MobileBottomNav />
    </div>
  )
}

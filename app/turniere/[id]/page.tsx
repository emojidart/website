"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { CalendarDays, Clock, ExternalLink, MapPin, Swords, Target, Users, X, ZoomIn, FileText } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PublicTournamentRegistration } from "@/components/public-tournament-registration"

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
  registration_mode: "external_url" | "public_form" | "none"
  registration_enabled: boolean
  show_participants: boolean
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header variant="app" title="Turnierdetails" subtitle="Öffentliche Turniere" backHref="/turniere/entdecken" />
      
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.32]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.12),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto max-w-[var(--emd-content-max)] px-3 pb-24 pt-20 sm:px-5 sm:pt-24">

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="rounded-[24px] border border-white/10 bg-black/35 px-6 py-5 text-center text-sm font-bold text-white/55 backdrop-blur-xl">
              Veranstaltung wird geladen…
            </div>
          </div>
        ) : null}
        {error ? <div className="py-20 text-center font-semibold text-red-200">{error}</div> : null}
        {!loading && !error && !event ? <div className="py-20 text-center text-white/45">Veranstaltung nicht gefunden.</div> : null}

        {event ? (
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
            {event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf") ? (
              <button
                type="button"
                onClick={() => setFlyerOpen(true)}
                className="group relative h-72 w-full border-b border-white/10 bg-black/30 sm:h-[420px]"
                aria-label="Flyer vergrößern"
              >
                <Image src={event.photo_url} alt={event.name} fill className="object-contain" />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/15" />
                <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
                  <ZoomIn className="h-4 w-4" />
                  Flyer vergrößern
                </div>
              </button>
            ) : event.photo_url ? (
              <button
                type="button"
                onClick={() => setFlyerOpen(true)}
                className="flex h-44 w-full flex-col items-center justify-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,.08),rgba(249,115,22,.08))] text-white transition hover:bg-white/5"
              >
                <FileText className="h-10 w-10" />
                <span className="font-black">PDF-Flyer anzeigen</span>
              </button>
            ) : null}
            <CardContent className="p-5 sm:p-7 lg:p-8">
              <div className="mb-6">
                <div className="text-[10px] font-black uppercase tracking-[0.20em] text-sky-200/60">
                  DACH Turnier
                </div>
                <h1 className="mt-1.5 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  {event.name}
                </h1>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/28">Datum</div>
                    <div className="mt-1 font-bold text-white/80">{dateDE(event.start_date)}{event.end_date !== event.start_date ? ` – ${dateDE(event.end_date)}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/28">Beginn</div>
                    <div className="mt-1 font-bold text-white/80">{event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : "Uhrzeit offen"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/28">Ort</div>
                    <div className="mt-1 font-bold text-white/80">{location || event.location}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mt-0.5 text-violet-200">
                    {event.discipline === "edart" ? <Target className="h-4 w-4" /> : event.discipline === "steeldart" ? <Swords className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/28">Dartart</div>
                    <div className="mt-1 font-bold text-white/80">{disciplineLabel(event.discipline)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-[22px] border border-white/10 bg-black/25 p-4 sm:grid-cols-2">
                <p className="text-white/55"><strong className="text-white/80">Veranstalter</strong><br />{event.organizer_name}</p>
                <p className="text-white/55"><strong className="text-white/80">Startgeld</strong><br />{event.startgeld_details || (event.entry_fee != null ? `€ ${event.entry_fee}` : "Keine Angabe")}</p>
                <p className="text-white/55"><strong className="text-white/80">Teilnehmer</strong><br />{event.max_participants ? `Maximal ${event.max_participants}` : "Keine Begrenzung angegeben"}</p>
                <p className="text-white/55"><strong className="text-white/80">Kontakt</strong><br />{event.organizer_email || event.organizer_phone || "Keine Angabe"}</p>
              </div>

              {event.details ? <p className="mt-6 whitespace-pre-line text-white/55">{event.details}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {event.registration_mode !== "public_form" && event.registration_url ? <Button asChild className="rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"><a href={event.registration_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Zur Anmeldung</a></Button> : null}
                {event.photo_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFlyerOpen(true)}
                    className="rounded-xl border-white/[0.10] bg-white/5 text-white hover:bg-white/[0.08] hover:text-white"
                  >
                    <ZoomIn className="mr-2 h-4 w-4" />
                    Flyer anzeigen
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {event?.registration_mode === "public_form" ? (
          <PublicTournamentRegistration eventId={event.id} />
        ) : null}
      </main>

      {flyerOpen && event?.photo_url ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setFlyerOpen(false)}
        >
          <div
            className="relative h-[90vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFlyerOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-xl"
            >
              <X className="mr-2 h-4 w-4" />
              Schließen
            </Button>

            {event.photo_url.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={event.photo_url}
                title={`Flyer: ${event.name}`}
                className="h-full w-full bg-black/25"
              />
            ) : (
              <Image
                src={event.photo_url}
                alt={`Flyer: ${event.name}`}
                fill
                className="object-contain"
                draggable={false}
              />
            )}
          </div>
        </div>
      ) : null}

      <MobileBottomNav />
    </div>
  )
}

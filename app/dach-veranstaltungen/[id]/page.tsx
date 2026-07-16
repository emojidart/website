"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Swords,
  Target,
  Ticket,
  Trophy,
  UserRound,
  Users,
  X,
  ZoomIn,
} from "lucide-react"

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
  event_status: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
}

const countryNames: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
}

function dateDE(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function disciplineLabel(value: string | null) {
  if (value === "edart") return "E-Dart"
  if (value === "steeldart") return "Steel-Dart"
  if (value === "both") return "E-Dart & Steel-Dart"
  return "Dart"
}

function formatLabel(value: string | null) {
  if (value === "single") return "Einzel"
  if (value === "double") return "Doppel"
  if (value === "team") return "Mannschaft"
  if (value === "mixed") return "Gemischt / Sonstiges"
  return null
}

function eventTypeLabel(value: string) {
  if (value === "party") return "Vereinsfest / Party"
  if (value === "announcement") return "Ankündigung"
  return "Turnier"
}

function registrationDeadlineLabel(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-bold leading-relaxed text-slate-800">
          {value}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="h-72 animate-pulse bg-slate-200" />
      <div className="space-y-5 p-6 sm:p-8">
        <div className="h-8 w-3/4 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
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
    if (!flyerOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") setFlyerOpen(false)
    }

    window.addEventListener("keydown", closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [flyerOpen])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError("")

      const { data, error } = await supabase
        .from("dach_events")
        .select("*")
        .eq("id", params.id)
        .in("event_status", ["approved", "cancelled"])
        .maybeSingle()

      if (!active) return

      if (error) setError(error.message)
      setEvent((data as DachEvent | null) ?? null)
      setLoading(false)
    }

    if (params.id) void load()

    return () => {
      active = false
    }
  }, [params.id])

  const location = event
    ? [
        event.street,
        [event.postal_code, event.city].filter(Boolean).join(" "),
        countryNames[event.country_code] || event.country_code,
      ]
        .filter(Boolean)
        .join(", ")
    : ""

  const dateRange = event
    ? event.end_date !== event.start_date
      ? `${dateDE(event.start_date)} – ${dateDE(event.end_date)}`
      : dateDE(event.start_date)
    : ""

  const deadline = registrationDeadlineLabel(event?.registration_deadline || null)
  const format = formatLabel(event?.format || null)
  const isCancelled = event?.event_status === "cancelled"

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-28 text-slate-950">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-20 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            className="-ml-2 rounded-xl text-slate-600 hover:bg-white hover:text-slate-950"
          >
            <Link href="/dach-veranstaltungen">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Übersicht
            </Link>
          </Button>

          {event ? (
            isCancelled ? (
              <span className="hidden items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 sm:inline-flex">
                <X className="h-4 w-4" />
                ABGESAGT
              </span>
            ) : (
              <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 sm:inline-flex">
                <CheckCircle2 className="h-4 w-4" />
                Freigegeben
              </span>
            )
          ) : null}
        </div>

        {loading ? <Skeleton /> : null}

        {error ? (
          <Card className="rounded-[2rem] border-red-200 bg-white shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <X className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-xl font-black">Veranstaltung konnte nicht geladen werden</h1>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && !event ? (
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="p-10 text-center sm:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CalendarDays className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-black">Veranstaltung nicht gefunden</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Die Veranstaltung wurde möglicherweise entfernt oder ist noch nicht freigegeben.
              </p>
              <Button asChild className="mt-6 rounded-xl">
                <Link href="/dach-veranstaltungen">Alle Veranstaltungen ansehen</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {event ? (
          <article
            className={`overflow-hidden rounded-[2rem] border bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.35)] ${
              isCancelled
                ? "border-red-400 ring-2 ring-red-100"
                : "border-slate-200"
            }`}
          >
            <div className="relative overflow-hidden bg-slate-950">
              {event.photo_url && !event.photo_url.toLowerCase().endsWith(".pdf") ? (
                <button
                  type="button"
                  onClick={() => setFlyerOpen(true)}
                  className="group relative block h-[300px] w-full sm:h-[420px] lg:h-[500px]"
                  aria-label="Flyer vergrößern"
                >
                  <Image
                    src={event.photo_url}
                    alt={event.name}
                    fill
                    priority
                    className="object-contain transition duration-500 group-hover:scale-[1.015]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/10" />
                  <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3.5 py-2 text-xs font-black text-white shadow-lg backdrop-blur-md transition group-hover:bg-slate-950/90">
                    <ZoomIn className="h-4 w-4" />
                    Flyer vergrößern
                  </div>
                </button>
              ) : event.photo_url ? (
                <button
                  type="button"
                  onClick={() => setFlyerOpen(true)}
                  className="group flex min-h-64 w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-6 text-white"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                    <FileText className="h-8 w-8" />
                  </span>
                  <div className="text-center">
                    <p className="text-xl font-black">PDF-Flyer verfügbar</p>
                    <p className="mt-1 text-sm text-white/60">Antippen, um den Flyer zu öffnen</p>
                  </div>
                </button>
              ) : (
                <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-6 py-12 text-white sm:min-h-72">
                  <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orange-500/15 blur-3xl" />
                  <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
                  <div className="relative flex h-full min-h-40 flex-col items-center justify-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
                      <Trophy className="h-8 w-8 text-orange-400" />
                    </span>
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-orange-300">
                      DACH Dart Event
                    </p>
                  </div>
                </div>
              )}
              {isCancelled ? (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-red-950/30" />
                  <div className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border-2 border-white/80 bg-red-600/95 px-5 py-4 text-center shadow-2xl backdrop-blur-sm sm:inset-x-auto sm:left-1/2 sm:w-[520px] sm:-translate-x-1/2">
                    <div className="text-3xl font-black tracking-[0.18em] text-white sm:text-4xl">
                      ABGESAGT
                    </div>
                    <div className="mt-2 text-sm font-bold text-red-50">
                      Diese Veranstaltung findet nicht statt
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="relative p-5 sm:p-8 lg:p-10">
              <div
                className={`absolute left-0 top-0 h-1 w-full ${
                  isCancelled
                    ? "bg-gradient-to-r from-red-600 via-red-500 to-red-400"
                    : "bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300"
                }`}
              />

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 ring-1 ring-inset ring-orange-200">
                      {eventTypeLabel(event.event_type)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-inset ring-slate-200">
                      {disciplineLabel(event.discipline)}
                    </span>
                    {format ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-inset ring-slate-200">
                        {format}
                      </span>
                    ) : null}
                  </div>

                  {isCancelled ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                          <X className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-black uppercase tracking-wide text-red-700">
                            Veranstaltung abgesagt
                          </div>
                          <p className="mt-1 text-sm font-semibold leading-relaxed text-red-600">
                            Bitte nicht anreisen. Die Veranstaltung wurde abgesagt.
                          </p>

                          <div className="mt-3 rounded-xl border border-red-200 bg-white p-3">
                            <div className="text-xs font-black uppercase tracking-wide text-red-500">
                              Absagegrund
                            </div>
                            <div className="mt-1 whitespace-pre-line text-sm font-bold leading-relaxed text-red-800">
                              {event.cancellation_reason?.trim() ||
                                "Es wurde kein Absagegrund angegeben."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <h1
                    className={`mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl ${
                      isCancelled
                        ? "text-red-700 line-through decoration-4"
                        : "text-slate-950"
                    }`}
                  >
                    {event.name}
                  </h1>
                  <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                    {location || event.location || "Veranstaltungsort folgt"}
                  </p>
                </div>

                {event.registration_url && !isCancelled ? (
                  <Button asChild size="lg" className="h-12 shrink-0 rounded-2xl px-6 font-black shadow-lg shadow-orange-500/15">
                    <a href={event.registration_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Jetzt anmelden
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Datum"
                  value={dateRange}
                />
                <InfoItem
                  icon={<Clock className="h-5 w-5" />}
                  label="Beginn"
                  value={event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : "Uhrzeit offen"}
                />
                <InfoItem
                  icon={
                    event.discipline === "edart" ? (
                      <Target className="h-5 w-5" />
                    ) : event.discipline === "steeldart" ? (
                      <Swords className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )
                  }
                  label="Disziplin"
                  value={disciplineLabel(event.discipline)}
                />
                <InfoItem
                  icon={<Users className="h-5 w-5" />}
                  label="Teilnehmer"
                  value={event.max_participants ? `Maximal ${event.max_participants}` : "Keine Begrenzung angegeben"}
                />
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
                <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm ring-1 ring-slate-200">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Informationen</p>
                      <h2 className="text-lg font-black text-slate-950">Über die Veranstaltung</h2>
                    </div>
                  </div>

                  {event.details ? (
                    <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
                      {event.details}
                    </p>
                  ) : (
                    <p className="mt-5 text-sm leading-7 text-slate-500">
                      Für diese Veranstaltung wurde noch keine zusätzliche Beschreibung hinterlegt.
                    </p>
                  )}
                </section>

                <aside className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Organisiert von</p>
                        <h2 className="font-black text-slate-950">{event.organizer_name}</h2>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      {event.organizer_email ? (
                        <a
                          href={`mailto:${event.organizer_email}`}
                          className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-orange-600" />
                          <span className="min-w-0 break-all">{event.organizer_email}</span>
                        </a>
                      ) : null}

                      {event.organizer_phone ? (
                        <a
                          href={`tel:${event.organizer_phone.replace(/\s/g, "")}`}
                          className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-orange-600" />
                          <span>{event.organizer_phone}</span>
                        </a>
                      ) : null}

                      {!event.organizer_email && !event.organizer_phone ? (
                        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-slate-500">Keine Kontaktdaten angegeben</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                        <Ticket className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Teilnahme</p>
                        <h2 className="font-black">Startgeld & Anmeldung</h2>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/45">Startgeld</p>
                        <p className="mt-1 text-lg font-black">
                          {event.startgeld_details ||
                            (event.entry_fee != null ? `€ ${event.entry_fee.toLocaleString("de-DE")}` : "Keine Angabe")}
                        </p>
                      </div>

                      {deadline ? (
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-white/45">Anmeldeschluss</p>
                          <p className="mt-1 font-bold">{deadline} Uhr</p>
                        </div>
                      ) : null}

                      {event.registration_url && !isCancelled ? (
                        <Button asChild className="h-11 w-full rounded-xl font-black">
                          <a href={event.registration_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Zur Anmeldung
                          </a>
                        </Button>
                      ) : isCancelled ? (
                        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-200">
                          Anmeldung geschlossen – Veranstaltung abgesagt.
                        </p>
                      ) : (
                        <p className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/60">
                          Kein externer Anmeldelink hinterlegt.
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>

              {event.photo_url ? (
                <div className="mt-7 border-t border-slate-200 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFlyerOpen(true)}
                    className="h-11 rounded-xl border-slate-300 font-bold"
                  >
                    {event.photo_url.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="mr-2 h-4 w-4" />
                    ) : (
                      <ZoomIn className="mr-2 h-4 w-4" />
                    )}
                    Flyer anzeigen
                  </Button>
                </div>
              ) : null}
            </div>
          </article>
        ) : null}
      </main>

      {mounted && flyerOpen && event?.photo_url
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/95 p-2 backdrop-blur-sm sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`Flyer: ${event.name}`}
              onClick={() => setFlyerOpen(false)}
            >
              <div
                className="relative h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl sm:rounded-3xl"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
              >
                <div className="absolute left-3 top-3 z-[100000] max-w-[calc(100%-7rem)] rounded-xl bg-slate-950/75 px-3 py-2 text-sm font-black text-white shadow-lg backdrop-blur sm:left-4 sm:top-4">
                  <span className="line-clamp-1">{event.name}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setFlyerOpen(false)}
                  className="absolute right-3 top-3 z-[100000] inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white font-bold text-slate-900 shadow-lg ring-1 ring-slate-200 transition hover:scale-105 hover:bg-slate-100 sm:right-4 sm:top-4"
                  aria-label="Flyer schließen"
                >
                  <X className="h-5 w-5" />
                </button>

                {event.photo_url.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={event.photo_url}
                    title={`Flyer: ${event.name}`}
                    className="h-full w-full border-0 bg-white pt-16"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-950 p-3 pt-16 sm:p-6 sm:pt-20">
                    {/* Normales img ist hier sinnvoll, da der Flyer seine natürliche Größe behalten soll. */}
                    <img
                      src={event.photo_url}
                      alt={`Flyer: ${event.name}`}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
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

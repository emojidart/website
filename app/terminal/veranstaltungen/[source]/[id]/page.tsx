"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  PartyPopper,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type EventData = {
  id: string
  source: "internal" | "external"
  name: string
  event_type: string | null
  event_date?: string | null
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  city?: string | null
  region?: string | null
  country_code?: string | null
  street?: string | null
  organizer_name?: string | null
  organizer_email?: string | null
  organizer_phone?: string | null
  entry_fee?: number | null
  startgeld_details?: string | null
  max_participants?: number | null
  details?: string | null
  photo_url?: string | null
  mode?: string | null
  discipline?: string | null
  format?: string | null
  registration_url?: string | null
  registration_mode?: string | null
  event_status?: string | null
}

function eventTypeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase()
  if (v.includes("tournament") || v.includes("turnier")) return "Turnier"
  if (v.includes("party")) return "Party"
  if (v.includes("gaming") || v.includes("console")) return "Gaming"
  if (v.includes("versammlung")) return "Versammlung"
  if (v.includes("announcement")) return "Ankündigung"
  return "Veranstaltung"
}

function TypeIcon({ value }: { value?: string | null }) {
  const v = String(value || "").toLowerCase()
  if (v.includes("tournament") || v.includes("turnier")) return <Trophy className="h-5 w-5" />
  if (v.includes("party")) return <PartyPopper className="h-5 w-5" />
  return <CalendarDays className="h-5 w-5" />
}

function dateDE(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function dateRange(event: EventData) {
  return event.start_date === event.end_date
    ? dateDE(event.start_date)
    : `${dateDE(event.start_date)} – ${dateDE(event.end_date)}`
}

function dartLabel(value?: string | null) {
  const v = String(value || "").toLowerCase()
  if (v === "edart") return "E-Dart"
  if (v === "steeldart") return "Steel-Dart"
  if (v === "both") return "E-Dart & Steel-Dart"
  return "Dart"
}

function DartIcon({ value }: { value?: string | null }) {
  const v = String(value || "").toLowerCase()
  if (v === "edart") return <Target className="h-5 w-5" />
  if (v === "steeldart") return <Swords className="h-5 w-5" />
  return <Users className="h-5 w-5" />
}

function locationText(event: EventData) {
  if (event.source === "external") {
    return [
      event.street,
      event.location,
      [event.city, event.region].filter(Boolean).join(", "),
      event.country_code,
    ].filter(Boolean).join(" · ") || "Ort offen"
  }
  return event.location || "Ort offen"
}

export default function TerminalEventDetailPage() {
  const params = useParams<{ source: string; id: string }>()
  const source = params?.source === "external" ? "external" : "internal"
  const id = params?.id

  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      setError("")

      if (source === "external") {
        const { data, error } = await supabase
          .from("dach_events")
          .select("*")
          .eq("id", id)
          .maybeSingle()

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        if (data) {
          setEvent({
            ...(data as any),
            source: "external",
            start_date: (data as any).start_date || (data as any).event_date,
            end_date: (data as any).end_date || (data as any).event_date,
          })
        }
      } else {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .maybeSingle()

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        if (data) {
          setEvent({
            ...(data as any),
            source: "internal",
            start_date: (data as any).start_date || (data as any).event_date,
            end_date: (data as any).end_date || (data as any).event_date,
          })
        }
      }

      setLoading(false)
    }

    void load()
  }, [id, source])

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.48]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.55),rgba(4,6,9,.82)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink
            href="/terminal/veranstaltungen"
            label="Veranstaltungen werden geöffnet"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/80">
              Veranstaltungen
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              Details
            </h1>
          </div>
        </header>

        {loading && (
          <div className="mt-8 rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
            <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
            </div>
            <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
              Veranstaltung wird geladen
            </div>
          </div>
        )}

        {!loading && (error || !event) && (
          <div className="mt-8 rounded-[30px] border border-rose-400/15 bg-rose-500/[0.05] p-10 text-center">
            <div className="text-xl font-black text-rose-100">Veranstaltung nicht gefunden</div>
            {error && <div className="mt-2 text-sm text-white/35">{error}</div>}
          </div>
        )}

        {event && (
          <div className="mt-7 space-y-5">
            <section className="overflow-hidden rounded-[34px] border border-white/[0.09] bg-black/30 backdrop-blur-2xl">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] p-4 sm:p-5">
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                  event.source === "internal"
                    ? "border-orange-300/25 bg-orange-500/14 text-orange-100"
                    : "border-cyan-200/25 bg-cyan-400/12 text-cyan-100"
                }`}>
                  {event.source === "internal" ? "Intern" : "Extern"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  <TypeIcon value={event.event_type} />
                  {eventTypeLabel(event.event_type)}
                </span>
                {event.event_status === "cancelled" && (
                  <span className="rounded-full border border-rose-300/25 bg-rose-500/16 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-100">
                    Abgesagt
                  </span>
                )}
              </div>

              {event.photo_url ? (
                event.photo_url.toLowerCase().endsWith(".pdf") ? (
                  <div className="h-[72vh] min-h-[560px] bg-black">
                    <iframe
                      src={event.photo_url}
                      title={`Flyer: ${event.name}`}
                      className="h-full w-full bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center bg-black/65 p-4 sm:min-h-[620px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.photo_url}
                      alt={`Flyer: ${event.name}`}
                      className="max-h-[78vh] w-full object-contain"
                    />
                  </div>
                )
              ) : (
                <div className="flex min-h-[320px] items-center justify-center bg-black/45">
                  <div className="text-center">
                    <FileText className="mx-auto h-14 w-14 text-white/15" />
                    <div className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white/25">
                      Kein Flyer hinterlegt
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-white/[0.09] bg-black/30 p-5 backdrop-blur-2xl sm:p-7">
              <div className="flex min-h-[84px] items-center sm:min-h-[104px]">
                <h2 className="line-clamp-2 max-w-5xl text-3xl font-black leading-[1.08] tracking-[-0.045em] sm:text-4xl">
                  {event.name}
                </h2>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    <CalendarDays className="h-4 w-4 text-orange-300" /> Datum
                  </div>
                  <div className="mt-2 font-black">{dateRange(event)}</div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    <Clock className="h-4 w-4 text-cyan-200" /> Uhrzeit
                  </div>
                  <div className="mt-2 font-black">
                    {event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : "Offen"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    <MapPin className="h-4 w-4 text-orange-300" /> Ort
                  </div>
                  <div className="mt-2 font-black">{locationText(event)}</div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    <DartIcon value={event.discipline || event.mode} /> Disziplin
                  </div>
                  <div className="mt-2 font-black">{dartLabel(event.discipline || event.mode)}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-orange-300/10 bg-orange-500/[0.04] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100/40">Startgeld</div>
                  <div className="mt-2 font-black">
                    {event.startgeld_details ||
                      (event.entry_fee != null ? `€ ${event.entry_fee}` : "Keine Angabe")}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Teilnehmer</div>
                  <div className="mt-2 font-black">
                    {event.max_participants ? `Maximal ${event.max_participants}` : "Keine Begrenzung angegeben"}
                  </div>
                </div>

                {event.organizer_name && (
                  <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/40">Veranstalter</div>
                    <div className="mt-2 font-black text-cyan-50">{event.organizer_name}</div>
                  </div>
                )}
              </div>

              {event.details && (
                <div className="mt-5 whitespace-pre-line rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm font-semibold leading-7 text-white/60">
                  {event.details}
                </div>
              )}

              {event.source === "external" && event.registration_url && (
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"
                >
                  Zur Anmeldung <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

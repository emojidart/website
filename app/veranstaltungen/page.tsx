"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  PartyPopper,
  Gamepad2,
  MessageSquare,
  Info,
  Filter,
  Search,
  Target,
  Swords,
  Users,
  Image as ImageIcon,
} from "lucide-react"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type TimeFilter = "upcoming" | "past" | "all"

type EventRow = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_date: string | null
  end_date: string | null
  event_time: string | null
  location: string | null

  entry_fee: number | null
  max_participants: number | null
  details: string | null
  photo_url: string | null

  mode: string | null
  startgeld_details: string | null

  source: string | null // Ort/Art: "internal" | "external"
  access_type: "public" | "club" | null
}

function getEventTypeIcon(eventType: string) {
  const t = (eventType || "").toLowerCase()
  if (t === "tournament") return Trophy
  if (t === "party") return PartyPopper
  if (t === "console" || t === "gaming") return Gamepad2
  if (t === "announcement") return MessageSquare
  return Info
}

function getEventTypeLabel(eventType: string) {
  const t = (eventType || "").toLowerCase()
  if (t === "tournament") return "Turnier"
  if (t === "party") return "Party"
  if (t === "console" || t === "gaming") return "Konsole"
  if (t === "announcement") return "Ankündigung"
  return eventType || "Event"
}

function formatDateDE(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
}


function formatDateRangeDE(startIso: string | null, endIso: string | null, fallbackIso: string) {
  const start = startIso || fallbackIso
  const end = endIso || fallbackIso

  const startText = new Date(start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  if (start === end) return startText

  const endText = new Date(end).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return `${startText} – ${endText}`
}






function formatTimeDE(time: string | null) {
  const raw = (time || "19:00").toString()
  return raw.length >= 5 ? raw.slice(0, 5) : raw
}

function toDateTime(e: Pick<EventRow, "start_date" | "event_date" | "event_time">) {
  const raw = (e.event_time || "19:00").toString()
  const time = raw.length === 5 ? `${raw}:00` : raw
  const date = e.start_date || e.event_date
  return new Date(`${date}T${time}`)
}

function toEventEndDateTime(e: Pick<EventRow, "end_date" | "event_date" | "event_time">) {
  const raw = (e.event_time || "23:59").toString()
  const time = raw.length === 5 ? `${raw}:00` : raw
  const date = e.end_date || e.event_date
  return new Date(`${date}T${time}`)
}

function ModeIcon({ mode }: { mode: string | null }) {
  const m = (mode || "").toLowerCase()
  if (m === "edart") return <Target className="w-3.5 h-3.5" />
  if (m === "steeldart") return <Swords className="w-3.5 h-3.5" />
  return <Users className="w-3.5 h-3.5" />
}

function modeLabel(mode: string | null) {
  const m = (mode || "").toLowerCase()
  if (m === "edart") return "E-Dart"
  if (m === "steeldart") return "Steel Dart"
  if (m === "both") return "Beide"
  return mode || "—"
}

function formatEuro(value: number) {
  return `€ ${value.toFixed(2)}`
}

function formatEuroCompact(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9
  return isInt ? `€ ${Math.round(n)}` : `€ ${n.toFixed(2)}`
}

function parseStartgeld(details: string | null) {
  if (!details) return null
  const m = details.replace(",", ".").match(/(\d+(\.\d{1,2})?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function DummyCover({ label }: { label?: string }) {
  return (
    <div className="relative h-28 border-b border-border bg-secondary">
      <div className="relative h-full flex items-center justify-center text-white">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10  border border-white/10">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">{label || "Event"}</span>
        </div>
      </div>
    </div>
  )
}

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "orange" | "blue" | "emerald" | "amber" | "slate"
}) {
  const cls =
    tone === "orange"
      ? "bg-orange-400/10 text-orange-200 border-orange-400/25"
      : tone === "blue"
        ? "bg-sky-400/10 text-sky-200 border-sky-400/25"
        : tone === "emerald"
          ? "bg-emerald-400/10 text-emerald-200 border-emerald-400/25"
          : tone === "amber"
            ? "bg-amber-400/10 text-amber-200 border-amber-400/25"
            : tone === "slate"
              ? "bg-white/5 text-white/65 border-white/10"
              : "bg-white/5 text-white/75 border-white/10"

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

export default function VeranstaltungenPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [query, setQuery] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
       const { data, error } = await supabase
  .from("events")
  .select(
    "id,name,event_type,event_date,start_date,end_date,event_time,location,entry_fee,max_participants,details,photo_url,mode,startgeld_details,source,access_type"
  )
  .order("start_date", { ascending: true })
  .order("event_time", { ascending: true })

        if (error) throw error
        if (!cancelled) setEvents((data as EventRow[]) || [])
      } catch (e: any) {
        console.error("Error loading events:", e)
        if (!cancelled) setError(e?.message ? String(e.message) : "Fehler beim Laden der Veranstaltungen")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const distinctTypes = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) s.add((e.event_type || "").toLowerCase())
    return Array.from(s).filter(Boolean).sort()
  }, [events])

  const filtered = useMemo(() => {
    const nowTs = Date.now()
    const q = query.trim().toLowerCase()

    return events
      .filter((e) => {
  const startTs = toDateTime(e).getTime()
  const endTs = toEventEndDateTime(e).getTime()

  if (timeFilter === "upcoming") return endTs >= nowTs
  if (timeFilter === "past") return endTs < nowTs
  return true
})
      .filter((e) => {
        if (typeFilter === "all") return true
        return (e.event_type || "").toLowerCase() === typeFilter
      })
      .filter((e) => {
        if (sourceFilter === "all") return true
        return (e.source || "internal").toLowerCase() === sourceFilter
      })
      .filter((e) => {
        if (!q) return true
        const hay = [
          e.name,
          e.location,
          e.details,
          e.event_type,
          e.mode,
          e.startgeld_details,
          e.entry_fee != null ? String(e.entry_fee) : null,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const ta = toDateTime(a).getTime()
        const tb = toDateTime(b).getTime()

        if (timeFilter === "past") return tb - ta
        if (timeFilter === "upcoming") return ta - tb

        const aIsPast = ta < nowTs
        const bIsPast = tb < nowTs
        if (aIsPast !== bIsPast) return aIsPast ? 1 : -1
        return aIsPast ? tb - ta : ta - tb
      })
  }, [events, timeFilter, typeFilter, sourceFilter, query])

  const navigateEvent = (href: string) => {
    window.dispatchEvent(new CustomEvent("emd:route-start", { detail: { href } }))
    router.push(href)
  }

  const openEventDetails = async (event: EventRow) => {
    const isTournament = (event.event_type || "").toLowerCase() === "tournament"

    if (isTournament) {
      const { data: dachEvent, error: dachEventError } = await supabase
        .from("dach_events")
        .select("id")
        .eq("internal_event_id", event.id)
        .eq("event_status", "approved")
        .maybeSingle()

      if (!dachEventError && dachEvent?.id) {
        navigateEvent(`/dach-veranstaltungen/${dachEvent.id}`)
        return
      }
    }

    navigateEvent(`/veranstaltungen/${event.id}`)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white font-sans">
      <Header />

      {/* Veranstaltungssuche und Vereinskalender */}


      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <div className="w-full">
          <section className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Vereinsleben</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Veranstaltungen</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Deine nächsten Turniere und Vereinstermine. Finde heraus, was bei EMD ansteht.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
              Gemeinsam am Oche
            </div>
          </section>

          {/* Filters (sticky like app) */}
          <div className="z-20 mt-4 sm:mt-5 lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top))]">
            <Card className="rounded-2xl border border-white/10 bg-card shadow-sm ">
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Segmented Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={timeFilter === "upcoming" ? "default" : "outline"}
                      onClick={() => setTimeFilter("upcoming")}
                      aria-pressed={timeFilter === "upcoming"}
                      className={timeFilter === "upcoming" ? "rounded-xl border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "rounded-xl border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}
                    >
                      Anstehend
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "past" ? "default" : "outline"}
                      onClick={() => setTimeFilter("past")}
                      aria-pressed={timeFilter === "past"}
                      className={timeFilter === "past" ? "rounded-xl border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "rounded-xl border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}
                    >
                      Abgelaufen
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "all" ? "default" : "outline"}
                      onClick={() => setTimeFilter("all")}
                      aria-pressed={timeFilter === "all"}
                      className={timeFilter === "all" ? "rounded-xl border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "rounded-xl border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}
                    >
                      Alle
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      aria-label="Veranstaltungen durchsuchen"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Suchen (Name, Ort, Details …)"
                      className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Selects */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger aria-label="Veranstaltungstyp" className="h-11 min-w-0 rounded-xl border-border bg-background text-foreground">
                          <SelectValue placeholder="Typ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Typen</SelectItem>
                          {distinctTypes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {getEventTypeLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger aria-label="Veranstaltungsort" className="h-11 min-w-0 rounded-xl border-border bg-background text-foreground">
                          <SelectValue placeholder="Ort / Art" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Intern + Extern</SelectItem>
                          <SelectItem value="internal">Vereinslokal / intern</SelectItem>
                          <SelectItem value="external">Anderer Ort / extern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div role="status" aria-live="polite" className="text-xs font-medium text-muted-foreground md:col-span-2">
                    {loading ? "Lade…" : `${filtered.length} ${filtered.length === 1 ? "Veranstaltung" : "Veranstaltungen"}`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          <div className="mt-4">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-busy="true" aria-label="Veranstaltungen werden geladen">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} aria-hidden="true" className="overflow-hidden rounded-2xl border border-white/10 bg-card">
                    <div className="h-40 animate-pulse bg-white/[0.075] sm:h-44" />
                    <div className="space-y-4 p-5">
                      <div className="h-6 w-4/5 animate-pulse rounded bg-white/10" />
                      <div className="flex gap-2">
                        <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                        <div className="h-6 w-24 animate-pulse rounded-full bg-white/10" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                      </div>
                      <div className="h-11 w-full animate-pulse rounded-xl bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-12 text-center text-red-300">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-muted-foreground"><Search className="mx-auto mb-3 h-7 w-7 text-primary" aria-hidden="true" /><p className="font-medium text-foreground">Keine passenden Veranstaltungen</p><p className="mt-2 text-sm">Ändere deine Suche oder die Filter, um weitere Termine zu entdecken.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((e) => {
                  const dt = toDateTime(e)
const endDt = toEventEndDateTime(e)
const isPast = endDt.getTime() < Date.now()
                  const isTournament = (e.event_type || "").toLowerCase() === "tournament"
                  const isExternal = (e.source || "internal").toLowerCase() === "external"
                  const Icon = getEventTypeIcon(e.event_type)

                  const hasEintritt = (e.entry_fee ?? 0) > 0
                  const hasStartgeldDetails = Boolean(e.startgeld_details && e.startgeld_details.trim().length > 0)
                  const startgeldAmount = parseStartgeld(e.startgeld_details)

                  return (
                    <Card key={e.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-sm  transition hover:-translate-y-0.5 hover:border-orange-400/30">
                      {e.photo_url ? (
                        <div className="relative h-40 bg-card sm:h-44">
                          <Image src={e.photo_url} alt={e.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <DummyCover label={getEventTypeLabel(e.event_type)} />
                      )}

                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold leading-snug line-clamp-2">{e.name}</CardTitle>

                            <div className="flex flex-wrap gap-2 mt-2">
                              <Chip tone="gray">
                                <Icon className="w-3.5 h-3.5" />
                                {getEventTypeLabel(e.event_type)}
                              </Chip>

                              <Chip tone={(e.access_type || "public") === "club" ? "orange" : "blue"}>
                                {(e.access_type || "public") === "club" ? "Nur Verein" : "Öffentlich"}
                              </Chip>

                              <Chip tone={isExternal ? "amber" : "emerald"}>
                                {isExternal ? "Extern" : "Intern"}
                              </Chip>

                              <Chip tone={isPast ? "slate" : "blue"}>{isPast ? "Abgelaufen" : "Anstehend"}</Chip>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col pt-0">
                        <div className="space-y-2.5 text-sm text-white/70">
                          <div className="flex items-center gap-2">
  <Calendar className="w-4 h-4 text-muted-foreground" />
  <span className="font-medium">{formatDateRangeDE(e.start_date, e.end_date, e.event_date)}</span>
</div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{formatTimeDE(e.event_time)} Uhr</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="line-clamp-1">{e.location || "Wird bekannt gegeben"}</span>
                          </div>

                          {isTournament ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Chip tone="orange">
                                <ModeIcon mode={e.mode} />
                                {modeLabel(e.mode)}
                              </Chip>

                              {hasStartgeldDetails ? (
                                <Chip tone="orange">
                                  <span className="font-semibold">Startgeld:</span>{" "}
                                  {startgeldAmount != null ? formatEuroCompact(startgeldAmount) : e.startgeld_details}
                                </Chip>
                              ) : null}

                              {hasEintritt ? (
                                <Chip tone="gray">
                                  <span className="font-semibold">Eintritt:</span> {formatEuro(e.entry_fee ?? 0)}
                                </Chip>
                              ) : null}
                            </div>
                          ) : hasEintritt ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Chip tone="gray">
                                <span className="font-semibold">Eintritt:</span> {formatEuro(e.entry_fee ?? 0)}
                              </Chip>
                            </div>
                          ) : null}

                          {e.details ? <div className="line-clamp-3 pt-1 text-sm leading-relaxed text-muted-foreground">{e.details}</div> : null}
                        </div>

                        <div className="mt-auto pt-5">
                          <Button
                            type="button"
                            className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                            onClick={() => void openEventDetails(e)}
                          >
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <FAQChatWidget />
      <MobileBottomNav />
    </div>
  )
}
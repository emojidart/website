"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
    <div className="relative h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="absolute inset-0 opacity-25">
        <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.12),transparent_45%)]" />
      </div>
      <div className="relative h-full flex items-center justify-center text-white">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10">
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
        window.location.href = `/dach-veranstaltungen/${dachEvent.id}`
        return
      }
    }

    window.location.href = `/veranstaltungen/${event.id}`
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* Stabiler Hintergrund wie im Member-Profil – ohne Lade-/Fade-Effekt */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <div className="w-full">
          {/* Page Header Card */}
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
            <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
            <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
            <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Calendar className="h-6 w-6 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55"><span className="h-2 w-2 rounded-full bg-orange-400" />Vereinsleben · Events</div>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Veranstaltungen</h1>
                  <p className="mt-2 text-sm font-medium text-white/55 sm:text-base">Turniere, Partys und mehr – alles auf einen Blick.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Filters (sticky like app) */}
          <div className="sticky top-[60px] z-20 mt-4 sm:mt-5">
            <Card className="rounded-[24px] border border-white/10 bg-black/40 shadow-[0_24px_80px_-52px_rgba(0,0,0,.95)] backdrop-blur-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Segmented Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={timeFilter === "upcoming" ? "default" : "outline"}
                      onClick={() => setTimeFilter("upcoming")}
                      className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 data-[state=active]:bg-orange-500"
                    >
                      Anstehend
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "past" ? "default" : "outline"}
                      onClick={() => setTimeFilter("past")}
                      className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 data-[state=active]:bg-orange-500"
                    >
                      Abgelaufen
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "all" ? "default" : "outline"}
                      onClick={() => setTimeFilter("all")}
                      className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 data-[state=active]:bg-orange-500"
                    >
                      Alle
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Suchen (Name, Ort, Details …)"
                      className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35"
                    />
                  </div>

                  {/* Selects */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-white/45" />
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 text-white">
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
                      <Filter className="w-4 h-4 text-white/45" />
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="rounded-xl border-white/10 bg-white/5 text-white">
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

                  <div className="text-xs font-semibold text-white/45">
                    {loading ? "Lade…" : `${filtered.length} Ergebnis(se)`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          <div className="mt-4">
            {loading ? (
              <div className="rounded-[22px] border border-white/10 bg-white/5 py-12 text-center text-white/55">Lade Veranstaltungen…</div>
            ) : error ? (
              <div className="rounded-[22px] border border-red-400/20 bg-red-400/10 py-12 text-center text-red-300">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[22px] border border-white/10 bg-white/5 py-12 text-center text-white/55">Keine passenden Veranstaltungen gefunden.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Card key={e.id} className="group overflow-hidden rounded-[24px] border border-white/10 bg-black/35 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-400/30">
                      {e.photo_url ? (
                        <div className="relative h-40 bg-black/40 sm:h-44">
                          <Image src={e.photo_url} alt={e.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <DummyCover label={getEventTypeLabel(e.event_type)} />
                      )}

                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-black leading-snug line-clamp-2">{e.name}</CardTitle>

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

                      <CardContent className="pt-0">
                        <div className="space-y-2.5 text-sm text-white/70">
                          <div className="flex items-center gap-2">
  <Calendar className="w-4 h-4 text-white/45" />
  <span className="font-medium">{formatDateRangeDE(e.start_date, e.end_date, e.event_date)}</span>
</div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-white/45" />
                            <span>{formatTimeDE(e.event_time)} Uhr</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-white/45" />
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
                                  <span className="font-bold">Startgeld:</span>{" "}
                                  {startgeldAmount != null ? formatEuroCompact(startgeldAmount) : e.startgeld_details}
                                </Chip>
                              ) : null}

                              {hasEintritt ? (
                                <Chip tone="gray">
                                  <span className="font-bold">Eintritt:</span> {formatEuro(e.entry_fee ?? 0)}
                                </Chip>
                              ) : null}
                            </div>
                          ) : hasEintritt ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Chip tone="gray">
                                <span className="font-bold">Eintritt:</span> {formatEuro(e.entry_fee ?? 0)}
                              </Chip>
                            </div>
                          ) : null}

                          {e.details ? <div className="line-clamp-3 pt-1 text-sm leading-relaxed text-white/50">{e.details}</div> : null}
                        </div>

                        <div className="mt-4">
                          <Button
                            type="button"
                            className="h-11 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600"
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
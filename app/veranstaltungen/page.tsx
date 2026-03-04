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
  event_time: string | null
  location: string | null

  entry_fee: number | null
  max_participants: number | null
  details: string | null
  photo_url: string | null

  mode: string | null
  startgeld_details: string | null

  source: string | null // "internal" | "external"
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

function formatTimeDE(time: string | null) {
  const raw = (time || "19:00").toString()
  return raw.length >= 5 ? raw.slice(0, 5) : raw
}

function toDateTime(e: Pick<EventRow, "event_date" | "event_time">) {
  const raw = (e.event_time || "19:00").toString()
  const time = raw.length === 5 ? `${raw}:00` : raw
  return new Date(`${e.event_date}T${time}`)
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
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : tone === "amber"
            ? "bg-amber-50 text-amber-900 border-amber-200"
            : tone === "slate"
              ? "bg-slate-50 text-slate-800 border-slate-200"
              : "bg-gray-50 text-gray-800 border-gray-200"

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
            "id,name,event_type,event_date,event_time,location,entry_fee,max_participants,details,photo_url,mode,startgeld_details,source",
          )
          .order("event_date", { ascending: true })
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
        const dt = toDateTime(e).getTime()
        if (timeFilter === "upcoming") return dt >= nowTs
        if (timeFilter === "past") return dt < nowTs
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          {/* Page Header Card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
            <div className="p-4 flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black">Veranstaltungen</h1>
                <p className="text-sm text-gray-600 mt-1">Turniere, Partys und mehr – alles auf einen Blick.</p>
              </div>
            </div>
          </div>

          {/* Filters (sticky like app) */}
          <div className="sticky top-[56px] z-20 mt-4">
            <Card className="border border-gray-200 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Segmented Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={timeFilter === "upcoming" ? "default" : "outline"}
                      onClick={() => setTimeFilter("upcoming")}
                      className="rounded-xl"
                    >
                      Anstehend
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "past" ? "default" : "outline"}
                      onClick={() => setTimeFilter("past")}
                      className="rounded-xl"
                    >
                      Abgelaufen
                    </Button>
                    <Button
                      size="sm"
                      variant={timeFilter === "all" ? "default" : "outline"}
                      onClick={() => setTimeFilter("all")}
                      className="rounded-xl"
                    >
                      Alle
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Suchen (Name, Ort, Details …)"
                      className="pl-9 rounded-xl"
                    />
                  </div>

                  {/* Selects */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="rounded-xl">
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
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Quelle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Intern + Extern</SelectItem>
                          <SelectItem value="internal">Nur intern</SelectItem>
                          <SelectItem value="external">Nur extern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    {loading ? "Lade…" : `${filtered.length} Ergebnis(se)`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          <div className="mt-4">
            {loading ? (
              <div className="text-center text-gray-600 py-12">Lade Veranstaltungen…</div>
            ) : error ? (
              <div className="text-center text-red-600 py-12">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-600 py-12">Keine passenden Veranstaltungen gefunden.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((e) => {
                  const dt = toDateTime(e)
                  const isPast = dt.getTime() < Date.now()
                  const isTournament = (e.event_type || "").toLowerCase() === "tournament"
                  const isExternal = (e.source || "internal").toLowerCase() === "external"
                  const Icon = getEventTypeIcon(e.event_type)

                  const hasEintritt = (e.entry_fee ?? 0) > 0
                  const hasStartgeldDetails = Boolean(e.startgeld_details && e.startgeld_details.trim().length > 0)
                  const startgeldAmount = parseStartgeld(e.startgeld_details)

                  return (
                    <Card key={e.id} className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                      {e.photo_url ? (
                        <div className="relative h-36 bg-gray-200">
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

                              <Chip tone={isExternal ? "amber" : "emerald"}>{isExternal ? "Extern" : "Intern"}</Chip>

                              <Chip tone={isPast ? "slate" : "blue"}>{isPast ? "Abgelaufen" : "Anstehend"}</Chip>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{formatDateDE(e.event_date)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{formatTimeDE(e.event_time)} Uhr</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
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

                          {e.details ? <div className="text-sm text-gray-600 line-clamp-3 pt-1">{e.details}</div> : null}
                        </div>

                        <div className="mt-4">
                          <Button asChild className="w-full rounded-xl">
                            <Link href={`/veranstaltungen/${e.id}`}>Details</Link>
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
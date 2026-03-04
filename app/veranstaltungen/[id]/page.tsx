"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  PartyPopper,
  Gamepad2,
  MessageSquare,
  Info,
  Target,
  Swords,
  Users,
  Image as ImageIcon,
  X,
  ZoomIn,
} from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type EventRow = {
  id: string
  name: string
  event_type: string
  event_date: string
  event_time: string | null
  location: string | null
  entry_fee: number | null
  details: string | null
  photo_url: string | null
  mode: string | null
  startgeld_details: string | null
  source: string | null
  max_participants: number | null
}

/* ---------------- helpers ---------------- */

function getEventTypeIcon(type: string) {
  const t = (type || "").toLowerCase()
  if (t === "tournament") return Trophy
  if (t === "party") return PartyPopper
  if (t === "console" || t === "gaming") return Gamepad2
  if (t === "announcement") return MessageSquare
  return Info
}

function getEventTypeLabel(type: string) {
  const t = (type || "").toLowerCase()
  if (t === "tournament") return "Turnier"
  if (t === "party") return "Party"
  if (t === "console" || t === "gaming") return "Konsole"
  if (t === "announcement") return "Ankündigung"
  return "Event"
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

function parseStartgeld(details: string | null) {
  if (!details) return null
  const m = details.replace(",", ".").match(/(\d+(\.\d{1,2})?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function euro(n: number) {
  return `€ ${n.toFixed(2)}`
}

function euroCompact(n: number) {
  const isInt = Math.abs(n - Math.round(n)) < 1e-9
  return isInt ? `€ ${Math.round(n)}` : `€ ${n.toFixed(2)}`
}

function ModeIcon({ mode }: { mode: string | null }) {
  const m = (mode || "").toLowerCase()
  if (m === "edart") return <Target className="w-4 h-4" />
  if (m === "steeldart") return <Swords className="w-4 h-4" />
  return <Users className="w-4 h-4" />
}

function modeLabel(mode: string | null) {
  const m = (mode || "").toLowerCase()
  if (m === "edart") return "E-Dart"
  if (m === "steeldart") return "Steel Dart"
  if (m === "both") return "Beide"
  return mode || "—"
}

function DummyCover({ label, title }: { label: string; title: string }) {
  return (
    <div className="relative h-52 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="absolute inset-0 opacity-25">
        <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.12),transparent_45%)]" />
      </div>
      <div className="relative h-full flex flex-col items-center justify-center text-white px-5 text-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="text-xl font-black leading-tight line-clamp-2">{title}</div>
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

/* ---------------- lightbox (mobile friendly) ---------------- */

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute top-3 right-3 z-10">
        <Button variant="secondary" className="gap-2 rounded-xl" onClick={onClose} type="button">
          <X className="w-4 h-4" />
          Schließen
        </Button>
      </div>

      <div
        className="relative w-[96vw] h-[86vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Image src={src} alt={alt} fill className="object-contain" draggable={false} />
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */

export default function VeranstaltungDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [event, setEvent] = useState<EventRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openImg, setOpenImg] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("events")
          .select(
            "id,name,event_type,event_date,event_time,location,entry_fee,details,photo_url,mode,startgeld_details,source,max_participants",
          )
          .eq("id", id)
          .maybeSingle()

        if (error) throw error
        if (!cancelled) setEvent((data as EventRow) || null)
      } catch (e: any) {
        console.error(e)
        if (!cancelled) setError(e?.message ? String(e.message) : "Fehler beim Laden")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const view = useMemo(() => {
    if (!event) return null
    const isTournament = (event.event_type || "").toLowerCase() === "tournament"
    const isExternal = (event.source || "internal").toLowerCase() === "external"
    const Icon = getEventTypeIcon(event.event_type)
    const startgeldAmount = parseStartgeld(event.startgeld_details)
    const hasStartgeld = Boolean(event.startgeld_details && event.startgeld_details.trim())
    const hasEintritt = (event.entry_fee ?? 0) > 0
    const isPast = toDateTime(event).getTime() < Date.now()
    return { isTournament, isExternal, Icon, startgeldAmount, hasStartgeld, hasEintritt, isPast }
  }, [event])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-28 overflow-x-hidden">
      <Header />

      {/* App-like content width */}
      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          {/* Sticky top bar (app feel) */}
          <div className="sticky top-[56px] z-20 mb-4">
            <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm px-3 py-2 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="gap-2 rounded-xl"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>

              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/veranstaltungen">Übersicht</Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Lade Veranstaltung…</div>
          ) : error ? (
            <div className="py-16 text-center text-red-600">{error}</div>
          ) : !event ? (
            <div className="py-16 text-center text-gray-600">Nicht gefunden.</div>
          ) : (
            <>
              <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {event.photo_url ? (
                  <button
                    type="button"
                    className="relative h-52 bg-gray-200 w-full group"
                    onClick={() => setOpenImg(true)}
                    aria-label="Flyer vergrößern"
                  >
                    <Image src={event.photo_url} alt={event.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

                    <div className="absolute right-3 top-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-black/55 text-white">
                      <ZoomIn className="w-4 h-4" />
                      Zoomen
                    </div>
                  </button>
                ) : (
                  <DummyCover label={getEventTypeLabel(event.event_type)} title={event.name} />
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl sm:text-2xl font-black leading-tight">{event.name}</CardTitle>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Chip tone="gray">
                      {view?.Icon ? <view.Icon className="w-3.5 h-3.5" /> : null}
                      {getEventTypeLabel(event.event_type)}
                    </Chip>

                    <Chip tone={view?.isExternal ? "amber" : "emerald"}>{view?.isExternal ? "Extern" : "Intern"}</Chip>

                    <Chip tone={view?.isPast ? "slate" : "blue"}>{view?.isPast ? "Abgelaufen" : "Anstehend"}</Chip>

                    {view?.isTournament && view?.hasStartgeld ? (
                      <Chip tone="orange">
                        <span className="font-bold">Startgeld:</span>{" "}
                        {view.startgeldAmount != null ? euroCompact(view.startgeldAmount) : event.startgeld_details}
                      </Chip>
                    ) : null}

                    {view?.hasEintritt ? (
                      <Chip tone="gray">
                        <span className="font-bold">Eintritt:</span> {euro(event.entry_fee ?? 0)}
                      </Chip>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="pt-2 pb-5">
                  {/* Info cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{formatDateDE(event.event_date)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{formatTimeDE(event.event_time)} Uhr</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="line-clamp-2">{event.location || "Wird bekannt gegeben"}</span>
                        </div>

                        {view?.isTournament ? (
                          <div className="flex items-center gap-2">
                            <ModeIcon mode={event.mode} />
                            <span>
                              <span className="font-semibold">Modus:</span> {modeLabel(event.mode)}
                            </span>
                          </div>
                        ) : null}

                        {event.max_participants ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>
                              <span className="font-semibold">Max. Teilnehmer:</span> {event.max_participants}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Details</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {event.details?.trim() ? event.details : "Keine weiteren Details."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sticky bottom actions (app feel) */}
              <div className="fixed left-0 right-0 bottom-16 z-30 px-4">
                <div className="mx-auto max-w-2xl">
                  <div className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-lg p-3 flex gap-2">
                    <Button asChild variant="outline" className="w-full rounded-xl">
                      <Link href="/veranstaltungen">Zur Übersicht</Link>
                    </Button>

                    {event.photo_url ? (
                      <Button className="w-full rounded-xl" onClick={() => setOpenImg(true)} type="button">
                        <ZoomIn className="w-4 h-4 mr-2" />
                        Flyer
                      </Button>
                    ) : (
                      <Button className="w-full rounded-xl" onClick={() => router.back()} type="button">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {openImg && event.photo_url ? (
                <Lightbox src={event.photo_url} alt={event.name} onClose={() => setOpenImg(false)} />
              ) : null}
            </>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
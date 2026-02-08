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

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  return new Date(dateIso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
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
    <div className="relative h-[320px] sm:h-56 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.12),transparent_45%)]" />
      </div>
      <div className="relative h-full flex flex-col items-center justify-center text-white px-6 text-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-black leading-tight line-clamp-2">{title}</div>
      </div>
    </div>
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
        <Button variant="secondary" className="gap-2" onClick={onClose} type="button">
          <X className="w-4 h-4" />
          Schließen
        </Button>
      </div>

      {/* ✅ Kein 16:9 mehr – nutzt fast den ganzen Screen */}
      <div
        className="relative w-[96vw] h-[88vh] sm:w-[90vw] sm:h-[88vh] bg-black rounded-xl overflow-hidden shadow-2xl"
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
            "id,name,event_type,event_date,event_time,location,entry_fee,details,photo_url,mode,startgeld_details,source,max_participants"
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Button variant="outline" onClick={() => router.back()} className="gap-2" type="button">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>

          <Button asChild variant="outline">
            <Link href="/veranstaltungen">Alle Veranstaltungen</Link>
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-600">Lade Veranstaltung…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">{error}</div>
        ) : !event ? (
          <div className="py-16 text-center text-gray-600">Nicht gefunden.</div>
        ) : (
          <>
            <Card className="border-0 shadow-xl overflow-hidden">
              {event.photo_url ? (
                <button
                  type="button"
                  className="relative h-[320px] sm:h-56 bg-gray-200 w-full group"
                  onClick={() => setOpenImg(true)}
                  aria-label="Flyer vergrößern"
                >
                  <Image src={event.photo_url} alt={event.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                  <div className="absolute right-3 top-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-black/55 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <ZoomIn className="w-4 h-4" />
                    Tippen zum Zoomen
                  </div>
                </button>
              ) : (
                <DummyCover label={getEventTypeLabel(event.event_type)} title={event.name} />
              )}

              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-black leading-tight">{event.name}</CardTitle>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
                    {view?.Icon ? <view.Icon className="w-3.5 h-3.5" /> : null}
                    {getEventTypeLabel(event.event_type)}
                  </span>

                  <span
                    className={
                      "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full " +
                      (view?.isExternal ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900")
                    }
                  >
                    {view?.isExternal ? "Extern" : "Intern"}
                  </span>

                  <span
                    className={
                      "inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full " +
                      (view?.isPast ? "bg-slate-100 text-slate-700" : "bg-blue-100 text-blue-900")
                    }
                  >
                    {view?.isPast ? "Abgelaufen" : "Anstehend"}
                  </span>

                  {view?.isTournament && view?.hasStartgeld ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-900 border border-orange-200">
                      <span className="font-bold">Startgeld:</span>{" "}
                      {view.startgeldAmount != null ? euroCompact(view.startgeldAmount) : event.startgeld_details}
                    </span>
                  ) : null}

                  {view?.hasEintritt ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-900 border border-slate-200">
                      <span className="font-bold">Eintritt:</span> {euro(event.entry_fee ?? 0)}
                    </span>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{formatDateDE(event.event_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{formatTimeDE(event.event_time)} Uhr</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{event.location || "Wird bekannt gegeben"}</span>
                    </div>

                    {view?.isTournament ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <ModeIcon mode={event.mode} />
                        <span>
                          <span className="font-semibold">Modus:</span> {modeLabel(event.mode)}
                        </span>
                      </div>
                    ) : null}

                    {event.max_participants ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>
                          <span className="font-semibold">Max. Teilnehmer:</span> {event.max_participants}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-800 mb-2">Details</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap rounded-xl bg-white border p-4">
                      {event.details?.trim() ? event.details : "Keine weiteren Details."}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/veranstaltungen">Zur Übersicht</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {openImg && event.photo_url ? (
              <Lightbox src={event.photo_url} alt={event.name} onClose={() => setOpenImg(false)} />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

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
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { saveEventParticipation } from "@/actions/event-participation"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

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
  details: string | null
  photo_url: string | null
  mode: string | null
  startgeld_details: string | null
  source: string | null
  access_type: "public" | "club" | null
  max_participants: number | null
}

type ParticipantStatus = "going" | "maybe" | "declined"

type EventParticipantRow = {
  id: string
  event_id: string
  user_id: string
  player_id: string | null
  status: ParticipantStatus
  created_at: string
  updated_at: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
  } | null
}


type GuestRequestRow = {
  auth_user_id: string | null
  full_name: string | null
  player_name: string | null
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

function toEventEndDateTime(e: Pick<EventRow, "end_date" | "event_date" | "event_time">) {
  const raw = (e.event_time || "23:59").toString()
  const time = raw.length >= 5 ? raw.slice(0, 5) : raw
  const date = e.end_date || e.event_date
  return new Date(`${date}T${time}:00`)
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
  if (m === "both") return <Users className="w-4 h-4" />
  return <Users className="w-4 h-4" />
}

function modeLabel(mode: string | null) {
  const m = (mode || "").toLowerCase()
  if (m === "edart") return "E-Dart"
  if (m === "steeldart") return "Steel Dart"
  if (m === "both") return "Beide"
  return mode || "—"
}

function getParticipantStatusLabel(status: ParticipantStatus) {
  if (status === "going") return "Dabei"
  if (status === "maybe") return "Vielleicht"
  return "Abgesagt"
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

/* ---------------- lightbox ---------------- */

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
        <Button variant="secondary" className="gap-2 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onClose} type="button">
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<EventParticipantRow[]>([])
  const [savingStatus, setSavingStatus] = useState(false)
  const [guestNameMap, setGuestNameMap] = useState<Record<string, string>>({})
  const { loading: membershipLoading, hasModule } = useMembershipAccess()

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id ?? null
      if (cancelled) return

      setCurrentUserId(uid)

      if (!uid) {
        setCurrentPlayerId(null)
        return
      }

      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", uid)
        .maybeSingle()

      if (!cancelled) {
        setCurrentPlayerId(profileRow?.player_id ?? null)
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])
  
  
  
  

async function loadParticipants(eventId: string) {
  const { data, error } = await supabase
    .from("event_participants")
    .select(`
      id,
      event_id,
      user_id,
      player_id,
      status,
      created_at,
      updated_at,
      club_players (
        id,
        name,
        photo_url
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error loading participants:", error)
    return
  }

  const rows = (data as EventParticipantRow[]) || []
  setParticipants(rows)

  const guestUserIds = rows
    .filter((p) => !p.club_players?.name)
    .map((p) => p.user_id)
    .filter(Boolean)

  if (guestUserIds.length === 0) {
    setGuestNameMap({})
    return
  }

  const { data: guestData, error: guestError } = await supabase
    .from("guest_requests")
    .select("auth_user_id, full_name, player_name")
    .in("auth_user_id", guestUserIds)

  if (guestError) {
    console.error("Error loading guest names:", guestError)
    setGuestNameMap({})
    return
  }

  const map: Record<string, string> = {}

  ;((guestData as GuestRequestRow[]) || []).forEach((g) => {
    if (!g.auth_user_id) return

    const name = g.full_name?.trim() || g.player_name?.trim() || ""

    if (name) {
      map[g.auth_user_id] = name
    }
  })

  setGuestNameMap(map)
}
  
  
  

  async function saveParticipation(status: ParticipantStatus) {
    if (!id || !currentUserId || !event) return

    try {
      setSavingStatus(true)

      const result = await saveEventParticipation(id, status)

      if (!result.success) {
        setError(result.message)
        return
      }

      setError(null)
      await loadParticipants(id)
    } catch (e: any) {
      console.error("Error saving participation:", e)
      setError(e?.message || "Teilnahmestatus konnte nicht gespeichert werden.")
    } finally {
      setSavingStatus(false)
    }
  }

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
            "id,name,event_type,event_date,start_date,end_date,event_time,location,entry_fee,details,photo_url,mode,startgeld_details,source,access_type,max_participants",
          )
          .eq("id", id)
          .maybeSingle()

        if (error) throw error

        if (!cancelled) {
          setEvent((data as EventRow) || null)
        }

        if (data?.id) {
          await loadParticipants(data.id)
        }
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
    const isPast = toEventEndDateTime(event).getTime() < Date.now()
    return { isTournament, isExternal, Icon, startgeldAmount, hasStartgeld, hasEintritt, isPast }
  }, [event])

  const myParticipation = useMemo(() => {
    if (!currentUserId) return null
    return participants.find((p) => p.user_id === currentUserId) || null
  }, [participants, currentUserId])

  const goingParticipants = useMemo(() => participants.filter((p) => p.status === "going"), [participants])
  const maybeParticipants = useMemo(() => participants.filter((p) => p.status === "maybe"), [participants])
  const declinedParticipants = useMemo(() => participants.filter((p) => p.status === "declined"), [participants])

  const isClubOnlyEvent = (event?.access_type || "public") === "club"
  const requiredEventModule =
    event?.source === "external" ? "external_events" : "club_events"
  const requiredEventPackageLabel =
    event?.source === "external" ? "Externe Veranstaltungen" : "Vereinsveranstaltungen"
  const hasRequiredEventPackage =
    !isClubOnlyEvent || hasModule(requiredEventModule as any)
  const canRespondToEvent =
    !membershipLoading && hasRequiredEventPackage

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

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-44 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <div className="w-full">
          <div className="sticky top-[56px] z-20 mb-4">
            <div className="flex items-center justify-between gap-2 rounded-[20px] border border-white/10 bg-black/45 px-3 py-2 shadow-[0_18px_60px_-46px_rgba(0,0,0,.95)] backdrop-blur-2xl">
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

              <Button asChild variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link href="/veranstaltungen">Übersicht</Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[22px] border border-white/10 bg-white/5 py-16 text-center text-white/55">Lade Veranstaltung…</div>
          ) : error ? (
            <div className="rounded-[22px] border border-red-400/20 bg-red-400/10 py-16 text-center text-red-300">{error}</div>
          ) : !event ? (
            <div className="rounded-[22px] border border-white/10 bg-white/5 py-16 text-center text-white/55">Nicht gefunden.</div>
          ) : (
            <>
              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
                {event.photo_url ? (
                  <button
                    type="button"
                    className="group relative h-56 w-full bg-black/40 sm:h-72 lg:h-80"
                    onClick={() => setOpenImg(true)}
                    aria-label="Flyer vergrößern"
                  >
                    <Image src={event.photo_url} alt={event.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

                    <div className="absolute right-3 top-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-black/55 text-white">
                      <ZoomIn className="w-4 h-4" />
                      Zoomen
                    </div>
                  </button>
                ) : (
                  <DummyCover label={getEventTypeLabel(event.event_type)} title={event.name} />
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl font-black leading-tight tracking-[-0.035em] text-white sm:text-4xl">{event.name}</CardTitle>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Chip tone="gray">
                      {view?.Icon ? <view.Icon className="w-3.5 h-3.5" /> : null}
                      {getEventTypeLabel(event.event_type)}
                    </Chip>

                    <Chip tone={(event.access_type || "public") === "club" ? "orange" : "blue"}>
                      {(event.access_type || "public") === "club" ? "Nur Verein" : "Öffentlich"}
                    </Chip>

                    <Chip tone={view?.isExternal ? "amber" : "emerald"}>
                      {view?.isExternal ? "Extern" : "Intern"}
                    </Chip>

                    <Chip tone={view?.isPast ? "slate" : "blue"}>
                      {view?.isPast ? "Abgelaufen" : "Anstehend"}
                    </Chip>

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

                <CardContent className="pt-2 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-42px_rgba(0,0,0,.95)]">
                      <div className="space-y-3 text-sm text-white/70">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-300" />
                          <span className="font-medium">
                            {formatDateRangeDE(event.start_date, event.end_date, event.event_date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-300" />
                          <span>{formatTimeDE(event.event_time)} Uhr</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-300" />
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
                            <Users className="w-4 h-4 text-orange-300" />
                            <span>
                              <span className="font-semibold">Max. Teilnehmer:</span> {event.max_participants}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-42px_rgba(0,0,0,.95)]">
                      <div className="mb-2 text-sm font-black text-white">Details</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">
                        {event.details?.trim() ? event.details : "Keine weiteren Details."}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-42px_rgba(0,0,0,.95)]">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-sm font-black text-white">Teilnahme</div>
                        <div className="text-xs text-white/45">
                          {goingParticipants.length + maybeParticipants.length + declinedParticipants.length} Antwort(en)
                        </div>
                      </div>

                      {!currentUserId ? (
                        <div className="rounded-2xl border border-orange-400/25 bg-orange-400/10 px-4 py-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 shadow-sm">
                              <Info className="h-5 w-5 text-orange-300" />
                            </div>

                            <div className="min-w-0">
                              <div className="text-base font-black text-orange-100">Login erforderlich</div>
                              <div className="mt-1 text-sm text-orange-200 leading-relaxed">
                                Bitte einloggen, um für dieses Event zuzusagen, vielleicht anzugeben oder abzusagen.
                              </div>

                              <div className="mt-3">
                                <Button asChild className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                                  <Link href="/member-login">Jetzt einloggen</Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : membershipLoading ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/55">
                          Berechtigung wird geprüft…
                        </div>
                      ) : isClubOnlyEvent && !hasRequiredEventPackage ? (
                        <div className="rounded-2xl border border-orange-400/25 bg-orange-400/10 px-4 py-4">
                          <div className="font-black text-orange-100">
                            Paket „{requiredEventPackageLabel}“ erforderlich
                          </div>
                          <div className="mt-1 text-sm font-semibold text-orange-200">
                            Diese Veranstaltung ist nur für Vereinsmitglieder mit diesem Paket freigeschaltet.
                          </div>
                          <Button asChild variant="outline" className="mt-3 rounded-xl border-orange-400/30 bg-white/5 font-bold text-white hover:bg-white/10">
                            <Link href="/member-membership">Mitgliedschaft ansehen</Link>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Button
                              type="button"
                              variant={myParticipation?.status === "going" ? "default" : "outline"}
                              className={`rounded-xl font-semibold ${
                                myParticipation?.status === "going" ? "bg-green-600 hover:bg-green-700 text-white" : ""
                              }`}
                              disabled={savingStatus || !!view?.isPast || !canRespondToEvent}
                              onClick={() => saveParticipation("going")}
                            >
                              Dabei
                            </Button>

                            <Button
                              type="button"
                              variant={myParticipation?.status === "maybe" ? "default" : "outline"}
                              className={`rounded-xl font-semibold ${
                                myParticipation?.status === "maybe" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                              }`}
                              disabled={savingStatus || !!view?.isPast || !canRespondToEvent}
                              onClick={() => saveParticipation("maybe")}
                            >
                              Vielleicht
                            </Button>

                            <Button
                              type="button"
                              variant={myParticipation?.status === "declined" ? "default" : "outline"}
                              className={`rounded-xl font-semibold ${
                                myParticipation?.status === "declined" ? "bg-red-600 hover:bg-red-700 text-white" : ""
                              }`}
                              disabled={savingStatus || !!view?.isPast || !canRespondToEvent}
                              onClick={() => saveParticipation("declined")}
                            >
                              Absage
                            </Button>
                          </div>

                          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65">
                            Dein Status:{" "}
                            <span className="font-semibold text-white">
                              {myParticipation ? getParticipantStatusLabel(myParticipation.status) : "Noch keine Antwort"}
                            </span>
                          </div>

                          {(event.access_type || "public") === "public" ? (
                            <div className="mt-2 text-xs font-semibold text-sky-300">
                              Öffentliche Veranstaltung – kein Veranstaltungspaket erforderlich.
                            </div>
                          ) : null}

                          {view?.isPast ? (
                            <div className="mt-2 text-xs text-white/40">
                              Für vergangene Events kann nichts mehr geändert werden.
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-42px_rgba(0,0,0,.95)]">
                      <div className="mb-3 text-sm font-black text-white">Teilnehmer</div>

                      <div className="space-y-4">
                        <div>
                          <div className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 px-2.5 py-1 text-xs font-bold mb-2">
                            Dabei ({goingParticipants.length})
                          </div>

                          {goingParticipants.length === 0 ? (
                            <div className="text-sm text-white/40">Noch niemand.</div>
                          ) : (
                            <div className="space-y-2">
                              {goingParticipants.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
                                    {p.club_players?.photo_url ? (
                                      <img
                                        src={p.club_players.photo_url}
                                        alt={p.club_players.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Users className="w-4 h-4 text-white/40" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-white/85">
                                    {p.club_players?.name || guestNameMap[p.user_id] || "Unbekannt"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-200 px-2.5 py-1 text-xs font-bold mb-2">
                            Vielleicht ({maybeParticipants.length})
                          </div>

                          {maybeParticipants.length === 0 ? (
                            <div className="text-sm text-white/40">Niemand.</div>
                          ) : (
                            <div className="space-y-2">
                              {maybeParticipants.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
                                    {p.club_players?.photo_url ? (
                                      <img
                                        src={p.club_players.photo_url}
                                        alt={p.club_players.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Users className="w-4 h-4 text-white/40" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-white/85">
                                    {p.club_players?.name || guestNameMap[p.user_id] || "Unbekannt"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="inline-flex items-center rounded-full border border-red-400/25 bg-red-400/10 text-red-200 px-2.5 py-1 text-xs font-bold mb-2">
                            Abgesagt ({declinedParticipants.length})
                          </div>

                          {declinedParticipants.length === 0 ? (
                            <div className="text-sm text-white/40">Niemand.</div>
                          ) : (
                            <div className="space-y-2">
                              {declinedParticipants.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
                                    {p.club_players?.photo_url ? (
                                      <img
                                        src={p.club_players.photo_url}
                                        alt={p.club_players.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Users className="w-4 h-4 text-white/40" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-white/85">
                                    {p.club_players?.name || guestNameMap[p.user_id] || "Unbekannt"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="fixed inset-x-0 z-30 px-3 sm:px-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6">
                <div className="mx-auto max-w-3xl">
                  <div className="rounded-3xl border border-white/10 bg-black/70 p-3 shadow-[0_24px_80px_-42px_rgba(0,0,0,.98)] backdrop-blur-2xl">
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10">
                        <Link href="/veranstaltungen">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Übersicht
                        </Link>
                      </Button>

                      {event.photo_url ? (
                        <Button
                          className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                          onClick={() => setOpenImg(true)}
                          type="button"
                        >
                          <ZoomIn className="w-4 h-4 mr-2" />
                          Flyer
                        </Button>
                      ) : (
                        <Button
                          className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                          onClick={() => router.back()}
                          type="button"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Zurück
                        </Button>
                      )}
                    </div>
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
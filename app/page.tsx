"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { PushEnableBanner } from "@/components/push-enable-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"
import {
  Trophy,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Calendar,
  MapPin,
  Clock,
  Info,
  Euro,
  Target,
  Swords,
  Users,
  PartyPopper,
  Gamepad2,
  X,
  Zap,
  CheckCircle2,
  Download,
  Loader2,
  Timer,
  LogOut,
  UserPlus,
} from "lucide-react"
import Image from "next/image"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
import { PushNotificationDialog } from "@/components/push-notification-dialog"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

//-----------------

interface Match {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_score: number | null
  away_score: number | null
  match_date: string
  matchday: number
  status: string
  match_time?: string
  home_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_team?: {
    id: string
    name: string
    logo_url?: string
  }
  home_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
}

interface Tournament {
  id: string
  name: string
  date: string
  time: string
  location: string
  entry_fee: number
  mode: string
  details: string | null
  photo_url: string | null
}

interface Event {
  id: string
  name: string
  event_date: string
  start_date: string | null
  end_date: string | null
  event_time: string | null
  location: string | null
  event_type: string
  description: string | null
  photo_url: string | null
  max_participants: number | null
}

interface CombinedEvent {
  id: string
  name: string
  date: string
  start_date?: string | null
  end_date?: string | null
  time: string
  location: string
  details: string | null
  photo_url: string | null
  type: "tournament" | "event"
  eventType?: string
  entry_fee?: number | null
  startgeld_details?: string | null
  mode?: string | null
  max_participants?: number | null
}

interface LionCupEvent {
  id: string
  name: string
  event_date: string
  event_time: string | null
  event_type: string
  description: string | null
  matchday?: number | null
}

type DkoSeriesEventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string // timestamptz
  is_matchday: boolean
  registration_cutoff_minutes: number | null
  is_rescheduled?: boolean | null
  rescheduled_at?: string | null
}

type UiDkoEvent = {
  id: string
  series_id: string
  title: string | null
  is_matchday: boolean
  cutoffMinutes: number
  originalDT: Date
  effectiveDT: Date
  effectiveISODate: string // YYYY-MM-DD
  effectiveTimeHHMM: string // HH:MM
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

interface ActiveTournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  status: string
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 text-center">
      <div>
        <div className="text-2xl sm:text-3xl lg:text-5xl font-black">{timeLeft.days}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Tage</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-5xl font-black">{timeLeft.hours}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Std</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-5xl font-black">{timeLeft.minutes}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Min</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-5xl font-black">{timeLeft.seconds}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Sek</div>
      </div>
    </div>
  )
}

function getEventTypeIcon(eventType: string) {
  const type = eventType.toLowerCase()
  if (type.includes("party")) return PartyPopper
  if (type.includes("spiel")) return Gamepad2
  if (type.includes("turnier")) return Trophy
  return Users
}

function getEventTypeLabel(eventType: string) {
  const type = eventType.toLowerCase()
  if (type.includes("party")) return "Party"
  if (type.includes("spiel")) return "Spielabend"
  if (type.includes("turnier")) return "Turnier"
  if (type.includes("versammlung")) return "Versammlung"
  return eventType
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function formatGermanShortDateFromISO(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((x) => Number.parseInt(x, 10))
  const months = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."]
  const mm = Number.isFinite(m) ? m - 1 : 0
  return `${pad2(d)}. ${months[mm] || "Jan."} ${y}`
}


function formatGermanDateRange(startIso: string | null | undefined, endIso: string | null | undefined, fallbackIso: string) {
  const start = startIso || fallbackIso
  const end = endIso || fallbackIso

  const startText = new Date(start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  if (start === end) return startText

  const endText = new Date(end).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return `${startText} – ${endText}`
}


function ensureUhr(time: string) {
  const t = time.replace("Uhr", "").trim()
  return t.includes(":") ? `${t} Uhr` : `${t}:00 Uhr`
}

function parseTimeToHHMM(time: string) {
  return time.replace("Uhr", "").trim()
}

function getStartDateTimeFromISO(isoDate: string, time: string): Date {
  const t = parseTimeToHHMM(time)
  return new Date(`${isoDate}T${t}:00`)
}

function formatHoursMinutesSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return `${hours} Std ${pad2(minutes)} Min ${pad2(seconds)} Sek`
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [cupPrizePool, setCupPrizePool] = useState<number>(0)
  const [lionTop5, setLionTop5] = useState<
    Array<{ player_name: string; total_points: number; original_total_points: number; tournaments_played: number }>
  >([])
  const [lionTop5Loading, setLionTop5Loading] = useState<boolean>(true)
  const [lionHalvingActive, setLionHalvingActive] = useState<boolean>(false)
  const [combinedEvents, setCombinedEvents] = useState<CombinedEvent[]>([])
  const [nextEvent, setNextEvent] = useState<LionCupEvent | null>(null)
  const [nextTournamentEvent, setNextTournamentEvent] = useState<LionCupEvent | null>(null)
  const [lionCupLoading, setLionCupLoading] = useState(true)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const handleApkDownload = () => {
  const a = document.createElement("a")
  a.href = APK_URL
  a.download = "EMD-Vereinsapp.apk"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

  // --- DKO Self Registration (Turniertag-Box) ---
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [seriesStartgeldById, setSeriesStartgeldById] = useState<Record<string, number>>({})

  const ensureStartgeldForSeriesId = async (seriesId: string): Promise<number> => {
    const cached = seriesStartgeldById[seriesId]
    if (typeof cached === "number") return cached

    const { data, error } = await supabase.from("dko_series").select("startgeld").eq("id", seriesId).limit(1).single()
    if (error) {
      console.warn("ensureStartgeldForSeriesId error:", error)
      return 0
    }

    const sg = Number((data as any)?.startgeld ?? 0)
    setSeriesStartgeldById((prev) => ({ ...prev, [seriesId]: sg }))
    return sg
  }

  type DkoModalState = {
    isOpen: boolean
    title: string
    dateLabel: string
    timeLabel: string
    seriesId: string | null
    startgeld: number | null
  }

  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    title: "",
    dateLabel: "",
    timeLabel: "",
    seriesId: null,
    startgeld: null,
  })

  const [liveInfoOpen, setLiveInfoOpen] = useState(false)

  const [dkoRegistered, setDkoRegistered] = useState(false)
  const [dkoRegLoading, setDkoRegLoading] = useState(false)

  // ✅ Modal Auto-Close Guard + Success Toast
  const modalOpenedAtRef = useRef<number>(0)
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" })
  const showToast = (text: string) => {
    setToast({ show: true, text })
    window.setTimeout(() => setToast({ show: false, text: "" }), 2500)
  }
  // Tick für Countdown (Turniertag-Box)
  const [nowTick, setNowTick] = useState<number>(() => Date.now())

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallButton(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  // DKO: Sekunden-Tick für Countdown
  useEffect(() => {
  return () => {}
}, [])

  // DKO: Auth User id (für Self-Registration)
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setAuthUserId(data.session?.user?.id ?? null)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Installation nicht verfügbar. Auf iOS: Teilen-Menü → Zum Home-Bildschirm hinzufügen")
      return
    }

    deferredPrompt.prompt()

    await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const { data: opponentTeamsData } = await supabase.from("opponent_teams").select("*")

        const now = new Date()
        const today = now.toISOString().split("T")[0]

        const { data: matchesData } = await supabase
          .from("matches")
          .select(
            `
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
          `,
          )
          .eq("status", "scheduled")
          .gte("match_date", today)
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true })
          .limit(4)

        if (matchesData) {
          const enrichedMatches =
            matchesData?.map((match: any) => {
              const homeOpponentTeam = match.home_opponent_team_id
                ? opponentTeamsData?.find((team: any) => team.id === match.home_opponent_team_id)
                : null
              const awayOpponentTeam = match.away_opponent_team_id
                ? opponentTeamsData?.find((team: any) => team.id === match.away_opponent_team_id)
                : null

              return {
                ...match,
                home_opponent_team: homeOpponentTeam,
                away_opponent_team: awayOpponentTeam,
              }
            }) || []

          setMatches(enrichedMatches)
        }
      } catch (error) {
        console.error("Error loading matches:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [])

  useEffect(() => {
    const fetchCupData = async () => {
      try {
        const { data, error } = await supabase.from("tournament_series_aggregated").select("player_name, tournaments_played")

        if (error) {
          throw error
        }

        const totalParticipants = data?.length || 0
        const totalAppearances = data?.reduce((sum: number, player: any) => sum + player.tournaments_played, 0) || 0

        const prizePoolFromParticipants = totalParticipants * 5
        const prizePoolFromAppearances = totalAppearances * 4

        let hostSponsoring = 0
        if (totalAppearances >= 501) {
          hostSponsoring = 250
        } else if (totalAppearances >= 500) {
          hostSponsoring = 100
        }

        const totalPrizePool = prizePoolFromParticipants + prizePoolFromAppearances + hostSponsoring

        setCupPrizePool(totalPrizePool)
      } catch (error) {
        console.error("Error fetching cup data:", error)
        setCupPrizePool(0)
      }
    }

    fetchCupData()
  }, [])

  useEffect(() => {
    const fetchLionTop5 = async () => {
      try {
        setLionTop5Loading(true)

        const { data: settings } = await supabase.from("season_settings").select("halving_active, halving_date").single()

        const halvingActive = Boolean(settings?.halving_active)
        const halvingDate = settings?.halving_date ? new Date(settings.halving_date).getTime() : null

        const { data: entries, error } = await supabase
          .from("tournament_series_standings")
          .select("player_name, placement_points, bonus_points, legs_won, tournament_date")

        if (error) throw error

        const stats = new Map<
          string,
          {
            current_total: number
            original_total: number
            current_legs_won: number
            current_placement_points: number
            tournaments: number
          }
        >()

        ;(entries || []).forEach((e: any) => {
          const name = String(e.player_name || "").trim()
          if (!name) return

          const placement = Number(e.placement_points || 0)
          const bonus = Number(e.bonus_points || 0)
          const legsWon = Number(e.legs_won || 0)
          const entryTotal = placement + bonus + legsWon

          let multiplier = 1
          if (halvingActive && halvingDate && e.tournament_date) {
            const t = new Date(e.tournament_date).getTime()
            if (!Number.isNaN(t) && t < halvingDate) multiplier = 0.5
          }

          const prev =
            stats.get(name) ||
            ({
              current_total: 0,
              original_total: 0,
              current_legs_won: 0,
              current_placement_points: 0,
              tournaments: 0,
            } as const)

          stats.set(name, {
            current_total: prev.current_total + entryTotal * multiplier,
            original_total: prev.original_total + entryTotal,
            current_legs_won: prev.current_legs_won + legsWon * multiplier,
            current_placement_points: prev.current_placement_points + placement * multiplier,
            tournaments: prev.tournaments + 1,
          })
        })

        const top5 = Array.from(stats.entries())
          .map(([player_name, v]) => ({
            player_name,
            total_points: Math.round(v.current_total * 100) / 100,
            original_total_points: Math.round(v.original_total * 100) / 100,
            tournaments_played: v.tournaments,
            _legs: v.current_legs_won,
            _placement: v.current_placement_points,
          }))
          .sort((a, b) => {
            if (b.total_points !== a.total_points) return b.total_points - a.total_points
            if (b._legs !== a._legs) return b._legs - a._legs
            if (b._placement !== a._placement) return b._placement - a._placement
            return a.tournaments_played - b.tournaments_played
          })
          .slice(0, 5)
          .map(({ _legs, _placement, ...rest }) => rest)

        setLionHalvingActive(halvingActive)
        setLionTop5(top5)
      } catch (e) {
        console.error("Error fetching Lion Top5:", e)
        setLionTop5([])
        setLionHalvingActive(false)
      } finally {
        setLionTop5Loading(false)
      }
    }

    fetchLionTop5()
  }, [])

  useEffect(() => {
    const fetchEventsAndTournaments = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const { data: tournamentsData, error: tournamentsError } = await supabase
  .from("events")
  .select("*")
  .eq("event_type", "tournament")
  .gte("end_date", today)
  .order("start_date", { ascending: true })
  .order("event_time", { ascending: true })

        if (tournamentsError) {
          console.error("Error fetching tournaments:", tournamentsError)
        }

        const { data: eventsData, error: eventsError } = await supabase
  .from("events")
  .select("*")
  .neq("event_type", "tournament")
  .not("name", "ilike", "%LION%")
  .gte("end_date", today)
  .order("start_date", { ascending: true })
  .order("event_time", { ascending: true })

        if (eventsError) {
          console.error("Error fetching events:", eventsError)
        }

        const combined: CombinedEvent[] = []

       if (tournamentsData) {
  tournamentsData.forEach((tournament: any) => {
    combined.push({
      id: tournament.id,
      name: tournament.name,
      date: tournament.start_date || tournament.event_date,
      start_date: tournament.start_date || tournament.event_date,
      end_date: tournament.end_date || tournament.event_date,
      time: tournament.event_time || "19:00",
      location: tournament.location || "Ort folgt",
      details: tournament.details ?? tournament.description ?? null,
      photo_url: tournament.photo_url,
      type: "tournament",
      entry_fee: tournament.entry_fee ?? null,
      startgeld_details: tournament.startgeld_details ?? null,
      max_participants: tournament.max_participants ?? null,
      mode: tournament.mode ?? null,
    })
  })
}

        if (eventsData) {
  eventsData.forEach((event: any) => {
    combined.push({
      id: event.id,
      name: event.name,
      date: event.start_date || event.event_date,
      start_date: event.start_date || event.event_date,
      end_date: event.end_date || event.event_date,
      time: event.event_time || "19:00",
      location: event.location || "Wird bekannt gegeben",
      details: event.details ?? event.description ?? null,
      photo_url: event.photo_url,
      type: "event",
      eventType: event.event_type,
      max_participants: event.max_participants,
    })
  })
}

        combined.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`)
          const dateB = new Date(`${b.date}T${b.time}`)
          return dateA.getTime() - dateB.getTime()
        })

        setCombinedEvents(combined.slice(0, 6))
      } catch (error) {
        console.error("Error fetching events and tournaments:", error)
      }
    }

    fetchEventsAndTournaments()
  }, [])
  
  
  
  
  

useEffect(() => {
  const loadActiveTournament = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_name, tournament_type, status")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error loading active tournament:", error)
        setActiveTournament(null)
        return
      }

      if (!data) {
        setActiveTournament(null)
        return
      }

      setActiveTournament({
        tournament_id: data.tournament_id,
        tournament_name: data.tournament_name,
        tournament_type: data.tournament_type,
        status: data.status,
      })
    } catch (error) {
      console.error("Error loading active tournament:", error)
      setActiveTournament(null)
    }
  }

  loadActiveTournament()

  const channel = supabase
    .channel("tournament_status_home")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tournaments_status",
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const data = payload.new as any
          if (data.status === "active") {
            setActiveTournament({
              tournament_id: data.tournament_id,
              tournament_name: data.tournament_name,
              tournament_type: data.tournament_type,
              status: data.status,
            })
          } else if (data.status === "cancelled" || data.status === "completed") {
            setActiveTournament(null)
          }
        } else if (payload.eventType === "DELETE") {
          setActiveTournament(null)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
  
  
  
  

  useEffect(() => {
    const fetchFromDb = async () => {
      try {
        setLionCupLoading(true)

        // Serien (fixe ID)
        const LION_SERIES_ID = "bae7b8fe-7013-4160-8a85-f46ac765e003"

        
        const { data: seriesRows, error: seriesErr } = await supabase
          .from("dko_series")
          .select("id,startgeld")
          .in("id", [LION_SERIES_ID])

        if (!seriesErr && seriesRows) {
          const map: Record<string, number> = {}
          for (const r of seriesRows as any[]) {
            map[String((r as any).id)] = Number((r as any).startgeld ?? 0)
          }
          setSeriesStartgeldById(map)
        }

        const fetchEvents = async (seriesId: string) => {
          const { data, error } = await supabase
            .from("dko_series_events")
            .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
            .eq("series_id", seriesId)
            .order("start_at", { ascending: true })

          if (error) throw error
          return (data || []) as DkoSeriesEventRow[]
        }

        const [lionRows] = await Promise.all([fetchEvents(LION_SERIES_ID)])

        const mapRow = (r: DkoSeriesEventRow): UiDkoEvent => {
          const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
          const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
          const effectiveDT = new Date(effectiveIso)
          const originalDT = new Date(r.start_at)
          const cutoffMinutes = Number(r.registration_cutoff_minutes ?? 10) || 10

          return {
            id: r.id,
            series_id: r.series_id,
            title: r.title,
            is_matchday: !!r.is_matchday,
            cutoffMinutes,
            originalDT,
            effectiveDT,
            effectiveISODate: toISODate(effectiveDT),
            effectiveTimeHHMM: toHHMM(effectiveDT),
          }
        }

        const lionEvents = lionRows.map(mapRow)

        // Ab heute (inkl. heute)
        const today0 = startOfDay(new Date()).getTime()

        const lionUpcoming = lionEvents
          .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        // --- LION: nächstes Event (inkl. Spielfrei) ---
        if (lionUpcoming.length > 0) {
          const first = lionUpcoming[0]
          setNextEvent({
            id: first.id,
            name: "EMD LION CUP",
            event_date: first.effectiveISODate,
            event_time: first.effectiveTimeHHMM,
            event_type: first.is_matchday ? "Turnier" : "Spielfrei",
            description: null,
          })
        } else {
          setNextEvent(null)
        }

        // --- LION: nächstes Turnier (matchday) ---
        const lionNextMatchday = lionUpcoming.find((e) => e.is_matchday) ?? null
        if (lionNextMatchday) {
          const allMatchdaysSorted = lionEvents
            .filter((e) => e.is_matchday)
            .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

          const idx = allMatchdaysSorted.findIndex((e) => e.id === lionNextMatchday.id)
          const matchday = idx >= 0 ? idx + 1 : 1

          setNextTournamentEvent({
            id: lionNextMatchday.id,
            name: "EMD LION CUP",
            event_date: lionNextMatchday.effectiveISODate,
            event_time: lionNextMatchday.effectiveTimeHHMM,
            event_type: "Turnier",
            matchday,
            description: null,
          })
        } else {
          setNextTournamentEvent(null)
        }
      } catch (error) {
        console.error("Error fetching DKO schedules from DB:", error)
        setNextEvent(null)
        setNextTournamentEvent(null)
      } finally {
        setLionCupLoading(false)
      }
    }

    fetchFromDb()
  }, [])

  const getTeamName = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
    } else {
      return match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"
    }
  }

  const getTeamLogo = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team?.logo_url || match.home_opponent_team?.logo_url
    } else {
      return match.away_team?.logo_url || match.away_opponent_team?.logo_url
    }
  }

  const createEventDate = (event: LionCupEvent | null) => {
    if (!event) return new Date("2025-11-15T19:00:00")
    const time = event.event_time || "19:00:00"
    return new Date(`${event.event_date}T${time}`)
  }

  const lionCupNextDate = createEventDate(nextTournamentEvent)
  const isNextEventSpielfrei = nextEvent?.event_type?.toLowerCase() === "spielfrei"

  // --- Turniertag (Lion) Self-Registration Box ---
  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const liveSelfRegEvent = useMemo(() => {
    const lionToday =
      nextTournamentEvent &&
      nextTournamentEvent.event_type?.toLowerCase() === "turnier" &&
      nextTournamentEvent.event_date === todayISO

    if (lionToday) {
      return {
        title: "Anmeldung geöffnet • LION CUP",
        isoDate: nextTournamentEvent!.event_date,
        time: nextTournamentEvent!.event_time || "19:30",
      }
    }

    return null
  }, [nextTournamentEvent, todayISO])

  const liveStartDT = liveSelfRegEvent ? getStartDateTimeFromISO(liveSelfRegEvent.isoDate, liveSelfRegEvent.time) : null
  const liveCutoffDT = liveStartDT ? new Date(liveStartDT.getTime() - 10 * 60 * 1000) : null
  const liveSecondsLeft = liveCutoffDT ? Math.ceil((liveCutoffDT.getTime() - nowTick) / 1000) : null
  const liveRegOpen = liveSelfRegEvent && (liveSecondsLeft ?? 0) > 0

  const liveDateLabel = liveSelfRegEvent ? formatGermanShortDateFromISO(liveSelfRegEvent.isoDate) : ""
  const liveTimeLabel = liveSelfRegEvent ? ensureUhr(liveSelfRegEvent.time) : ""

  const fetchDkoRegStatus = async () => {
    setDkoRegLoading(true)
    setDkoRegistered(false)

    try {
      if (!liveSelfRegEvent) return
      if (!authUserId) return

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("club_players(spieldatenbank_id)")
        .eq("user_id", authUserId)
        .single()

      if (profErr) throw profErr

      const clubPlayersRel: any = (profile as any)?.club_players
      const spieldatenbankId = Array.isArray(clubPlayersRel)
        ? clubPlayersRel?.[0]?.spieldatenbank_id
        : clubPlayersRel?.spieldatenbank_id
      if (!spieldatenbankId) return

      const pid = String(spieldatenbankId)

      const { data: reg, error: regErr } = await supabase.from("dko_tournament_registration").select("id").eq("player_id", pid).limit(1)

      if (regErr) throw regErr

      setDkoRegistered((reg?.length ?? 0) > 0)
    } catch (e) {
      console.error("DKO registration status error:", e)
    } finally {
      setDkoRegLoading(false)
    }
  }

  useEffect(() => {
    fetchDkoRegStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, liveSelfRegEvent])

  useEffect(() => {
    if (!authUserId || !liveSelfRegEvent) return

    const channel = supabase
      .channel("dko-registration-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
        fetchDkoRegStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, liveSelfRegEvent])

  

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Abstand für fixed Header */}
<div className="h-12 sm:h-14" aria-hidden="true" />

<PushEnableBanner />

      <PushNotificationDialog />



{activeTournament && (
  <div className="sticky top-12 sm:top-14 z-40">
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon bubble */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-700" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600" />
                    Live
                  </span>
                  <span className="hidden sm:inline text-[11px] font-bold text-gray-500">
                    Turnier läuft gerade
                  </span>
                </div>

                <div className="text-sm sm:text-base font-black text-gray-900 truncate">
                  {activeTournament.tournament_name}
                </div>

                <div className="text-[11px] sm:text-xs text-gray-600 truncate">
                  {activeTournament.tournament_type.replaceAll("_", " ").toUpperCase()}
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              size="sm"
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm px-3 sm:px-4"
              onClick={() => (window.location.href = "/live-all-app")}
            >
             <span className="hidden sm:inline">Live öffnen</span>
<span className="sm:hidden">Live</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      
	  
	  
	 {liveSelfRegEvent && (
  <div className="sticky top-12 sm:top-14 z-40">
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        {/* Accent bar */}
        <div
          className={`h-1.5 ${
            dkoRegistered
              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"
              : "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"
          }`}
        />

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left */}
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative flex-shrink-0 mt-0.5">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                    dkoRegistered ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <Timer className={`w-5 h-5 ${dkoRegistered ? "text-emerald-700" : "text-orange-700"}`} />
                </div>

                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white animate-pulse ${
                    liveRegOpen ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    LION CUP
                  </span>

                  <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-800 border border-gray-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    TURNIERTAG
                  </span>

                  {dkoRegistered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Angemeldet
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm sm:text-base font-black text-gray-900 truncate">
                  {liveSelfRegEvent.title}
                </div>

                <div className="mt-0.5 text-[11px] sm:text-xs text-gray-600 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    {liveDateLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    {liveTimeLabel}
                  </span>
                </div>

                <div className="mt-2 text-[11px] sm:text-xs text-gray-700 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  {liveRegOpen ? (
                    <span className="font-bold">
                      Anmeldung noch: {formatHoursMinutesSeconds(liveSecondsLeft ?? 0)}
                      <span className="font-semibold text-gray-500"> (schließt 10 Min vor Start)</span>
                    </span>
                  ) : (
                    <span className="font-bold">
                      Anmeldung geschlossen <span className="font-semibold text-gray-500">(10 Min vor Start)</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setLiveInfoOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] sm:text-xs text-orange-700 font-bold hover:text-orange-800"
                >
                  <Info className="w-3.5 h-3.5" />
                  Infos zu Abmeldung & Rückerstattung
                </button>
              </div>
            </div>

            {/* Right CTA */}
            <div className="flex-shrink-0">
              <Button
                size="sm"
                disabled={!liveRegOpen || dkoRegLoading}
                className={`rounded-xl font-black shadow-sm px-3 sm:px-4 disabled:opacity-60 disabled:cursor-not-allowed ${
                  dkoRegistered
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
                onClick={async () => {
                  modalOpenedAtRef.current = Date.now()

                  const seriesId = "bae7b8fe-7013-4160-8a85-f46ac765e003"
                  const startgeld = await ensureStartgeldForSeriesId(seriesId)

                  setDkoModal({
                    isOpen: true,
                    title: "LION CUP • Anmeldung",
                    dateLabel: liveDateLabel,
                    timeLabel: liveTimeLabel,
                    seriesId,
                    startgeld,
                  })
                }}
              >
                {dkoRegLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ...
                  </span>
                ) : dkoRegistered ? (
                  <>
                    <span className="hidden sm:inline">Anmeldung verwalten</span>
                    <span className="sm:hidden">Verwalten</span>
                  </>
                ) : liveRegOpen ? (
                  <>
                    <span className="hidden sm:inline">Jetzt anmelden</span>
                    <span className="sm:hidden">Anmelden</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Geschlossen</span>
                    <span className="sm:hidden">Zu</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)} 
	  
	  
	  
	  
	  
	  
	  
	  
	  

      <section className="container mx-auto px-4 py-8 lg:py-12 overflow-x-hidden">
        <div className="grid lg:grid-cols-2 gap-6">
  {/* LION CUP CARD */}
  <div className="overflow-hidden rounded-2xl shadow-2xl lg:col-span-2 border border-gray-200 bg-white">
    {/* TOP HERO (ORANGE) */}
    <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white">
     <div className="absolute inset-0 opacity-10" />

      <div className="relative p-4 sm:p-6 lg:p-10">
        <div className="w-full mx-auto flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center mb-5 sm:mb-7">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center">
              <Image
                src="/images/logo1.png"
                alt="Logo 1"
                width={90}
                height={90}
                className="object-contain p-2"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-950 px-3 py-1.5 rounded-full font-black text-xs mb-3">
              <Trophy className="w-3.5 h-3.5" />
              <span>TURNIERSERIE 2025/26</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2">
              EMD - LION CUP
            </h1>

            {/* Spieltag / Spielfrei */}
            <div className="min-h-[40px] flex items-center justify-center mb-2">
              {nextTournamentEvent?.matchday ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                    <span className="text-orange-100">
                      Spieltag {nextTournamentEvent.matchday}
                    </span>
                  </div>
                </div>
              ) : null}

              {isNextEventSpielfrei && nextEvent ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-yellow-300" />
                    <span className="text-orange-100">
                      Spielfrei am{" "}
                      {new Date(nextEvent.event_date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                      })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">
              Nächstes Turnier
            </p>
            <p className="text-sm lg:text-base text-orange-200">
              {nextTournamentEvent
                ? `${new Date(lionCupNextDate).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })} • ${nextTournamentEvent.event_time || "19:30"} Uhr`
                : "15. November 2025 • 19:30 Uhr"}
            </p>
          </div>

          {/* Countdown (im orange Bereich, aber als Glass Box) */}
          <div className="mt-5 sm:mt-7 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 sm:px-6 lg:px-10 py-3 sm:py-4 border border-white/20">
              <CountdownTimer targetDate={lionCupNextDate} />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* BOTTOM CONTENT (WHITE) */}
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* TOP 5 */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-600" />
              <span className="text-gray-900 text-xs sm:text-sm font-black uppercase tracking-wider">
                Top 5 aktuell
              </span>
            </div>
            {lionTop5Loading ? (
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold">
                Lade…
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {!lionTop5Loading && lionTop5.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-600">
                Keine Daten verfügbar.
              </div>
            ) : null}

            {lionTop5.map((p, idx) => (
              <div
                key={p.player_name}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[11px] font-black">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-gray-900 truncate max-w-[180px] sm:max-w-[260px]">
                      {p.player_name}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500">
                      Antritte:{" "}
                      <span className="font-black text-gray-900">
                        {p.tournaments_played}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {lionHalvingActive && p.original_total_points !== p.total_points ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-400 line-through">
                        {p.original_total_points}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-orange-700">
                        {p.total_points}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm font-black text-orange-700">
                      {p.total_points}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500">Punkte</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRIZE POOL */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span className="text-gray-900 text-xs sm:text-sm font-black uppercase tracking-wider">
                Aktuelles Preisgeld
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-700">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs font-bold">
                +€4 pro Teilnahme
              </span>
            </div>
          </div>

          <div className="text-center rounded-2xl bg-white border border-orange-200 p-4 sm:p-5">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-1">
              €{cupPrizePool.toFixed(2)}
            </div>
            <p className="text-gray-600 text-xs sm:text-sm">
              Wächst mit jedem Teilnehmer und jeder Teilnahme
            </p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-xl w-full sm:w-auto"
          onClick={() => (window.location.href = "/tournament-series-app")}
        >
          Zur Gesamtwertung
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
          onClick={() => (window.location.href = "/lion-cup-regelwerk")}
        >
          Regelwerk
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
          onClick={() => (window.location.href = "/upcoming-tournaments-app")}
        >
          Anmelden
        </Button>
      </div>
    </div>
  </div>
</div>
 </section>

      <div className="container mx-auto px-4 py-6 sm:py-10">
  <div className="space-y-8">
    {/* ================= NÄCHSTE SPIELE ================= */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900">Nächste Spiele</h2>
          <p className="text-xs sm:text-sm text-gray-500">Die nächsten angesetzten Begegnungen</p>
        </div>

        <Button
          variant="ghost"
          className="h-9 px-3 text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-bold"
          onClick={() => (window.location.href = "/liga-statistiken-app")}
        >
          Alle
        </Button>
      </div>

      {/* Mobile: horizontal scroll / Desktop: grid */}
      {matches.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <p className="text-gray-600 font-semibold">Keine anstehenden Spiele</p>
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {matches.slice(0, 4).map((match) => (
              <div
                key={match.id}
                className="min-w-[280px] sm:min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>

                    {match.match_time ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {String(match.match_time).slice(0, 5)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {/* Home */}
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      {getTeamLogo(match, true) ? (
                        <img
                          src={getTeamLogo(match, true) || "/placeholder.svg"}
                          alt={getTeamName(match, true)}
                          className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mb-2"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2 border border-gray-200">
                          <Trophy className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <p className="font-black text-xs text-center text-gray-900 truncate w-full">
                        {getTeamName(match, true)}
                      </p>
                    </div>

                    <div className="text-xs font-black text-gray-400">VS</div>

                    {/* Away */}
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      {getTeamLogo(match, false) ? (
                        <img
                          src={getTeamLogo(match, false) || "/placeholder.svg"}
                          alt={getTeamName(match, false)}
                          className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mb-2"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2 border border-gray-200">
                          <Trophy className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <p className="font-black text-xs text-center text-gray-900 truncate w-full">
                        {getTeamName(match, false)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      {match.venue ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {match.venue}
                        </span>
                      ) : (
                        "Ort folgt"
                      )}
                    </span>

                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                      onClick={() => (window.location.href = "/liga-statistiken-app")}
                    >
                      Öffnen
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>

    {/* ================= EVENTS & TURNIERE ================= */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900">Turniere & Veranstaltungen</h2>
          <p className="text-xs sm:text-sm text-gray-500">Alles was als nächstes ansteht</p>
        </div>

        <Button
          variant="ghost"
          className="h-9 px-3 text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-bold"
          onClick={() => (window.location.href = "/veranstaltungen")}
        >
          Alle
        </Button>
      </div>

      {combinedEvents.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <Info className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-semibold">Derzeit sind keine weiteren Turniere oder Veranstaltungen geplant.</p>
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
		  
		  
		  
		  
		  
            {combinedEvents.map((item) => {
  const EventIcon = item.type === "event" && item.eventType ? getEventTypeIcon(item.eventType) : Trophy
  const badgeText = item.type === "tournament" ? "TURNIER" : getEventTypeLabel(item.eventType || "").toUpperCase()

  return (
    <Dialog key={item.id}>
      <DialogTrigger asChild>
        <div className="min-w-[300px] sm:min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer active:scale-[0.99]">
          {/* Image / Header */}
          <div className="relative h-40 bg-gray-100">
            {item.photo_url ? (
              <Image
                src={item.photo_url || "/placeholder.svg"}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                <EventIcon className="h-12 w-12 text-orange-600" />
              </div>
            )}

            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-black text-gray-900 border border-gray-200">
                {badgeText}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
           <p className="text-[11px] text-gray-500 font-bold mb-1">
  {formatGermanDateRange(item.start_date, item.end_date, item.date)}
  {item.time ? ` • ${item.time.slice(0,5)} Uhr` : ""}
</p>

            <h3 className="font-black text-gray-900 mb-1 line-clamp-2">{item.name}</h3>

            <p className="text-sm text-gray-600 line-clamp-2">
  {item.type === "tournament" ? (
    <>
      {item.details && <span>{item.details} • </span>}

      {item.startgeld_details && (
        <span>Startgeld: {item.startgeld_details} • </span>
      )}

      {typeof item.entry_fee === "number" && item.entry_fee > 0 && (
        <span>Eintritt: €{item.entry_fee.toFixed(2)} • </span>
      )}

      {item.mode === "edart"
        ? "E-Dart"
        : item.mode === "steeldart"
        ? "Steel Dart"
        : item.mode === "both"
        ? "Beide Modi"
        : ""}
    </>
  ) : (
    item.details || `${getEventTypeLabel(item.eventType || "")} • ${item.location}`
  )}
</p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                {item.location || "Wird bekannt gegeben"}
              </span>

              <span className="inline-flex items-center gap-1 text-orange-700 text-xs font-black">
                Details
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </DialogTrigger>

      {/* MOBILE: fullscreen sheet | DESKTOP: card modal */}
     {/* */}
<DialogContent
  className={[
    // Layout / Größe
    "p-0 gap-0",
    "w-[calc(100vw-16px)] sm:w-full sm:max-w-3xl",
    
    "max-h-[90svh] sm:max-h-[92vh]",
    
    "overflow-hidden",
    
    "flex flex-col",
    
    "rounded-3xl",
  ].join(" ")}
>
  {/* Sticky Header */}
  <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
    <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
      <DialogHeader className="space-y-1">
        <DialogTitle className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">
          {item.name}
        </DialogTitle>

        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-600 font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5">
            <EventIcon className="w-3.5 h-3.5" />
            {badgeText}
          </span>
         <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5">
  <Calendar className="w-3.5 h-3.5" />
  {formatGermanDateRange(item.start_date, item.end_date, item.date)}
</span>
          {item.time ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5">
              <Clock className="w-3.5 h-3.5" />
              {item.time?.slice(0,5)} Uhr
            </span>
          ) : null}
        </div>
      </DialogHeader>

      {/* CLOSE: immer sichtbar */}
      <DialogClose asChild>
        <button
          type="button"
          className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 active:scale-[0.98]"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </DialogClose>
    </div>
  </div>

  {/* ✅ Scrollbarer Body */}
  <div
    className={[
      "flex-1", 
      "overflow-y-auto",
      "overscroll-contain", 
      "px-4 sm:px-6 py-4 sm:py-6",
      "space-y-4 sm:space-y-6",
      "bg-gray-50",
      // iOS safe area unten
      "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
    ].join(" ")}
  >
    {/* Photo */}
    {item.photo_url ? (
      <div
        className="relative w-full h-52 sm:h-72 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm cursor-pointer"
        onClick={() => setFullscreenPhoto(item.photo_url)}
      >
        <Image
          src={item.photo_url || "/placeholder.svg"}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
        />
      </div>
    ) : (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
          <EventIcon className="w-5 h-5 text-orange-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900">Keine Foto-Vorschau</p>
          <p className="text-xs text-gray-600">Details findest du weiter unten.</p>
        </div>
      </div>
    )}

    {/* Info Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Ort</p>
        <p className="mt-1 text-sm font-bold text-gray-900 line-clamp-2">
          {item.location || "Wird bekannt gegeben"}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Typ</p>
        <p className="mt-1 text-sm font-bold text-gray-900">
          {item.type === "tournament" ? "Turnier" : getEventTypeLabel(item.eventType || "")}
        </p>
      </div>

      {item.type === "tournament" ? (
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Infos</p>

    <p className="mt-1 text-sm font-bold text-gray-900">
      {item.mode === "edart"
        ? "E-Dart"
        : item.mode === "steeldart"
        ? "Steel Dart"
        : "Beide Modi"}

      {item.startgeld_details
  ? ` • Startgeld: ${
      isNaN(Number(item.startgeld_details))
        ? item.startgeld_details
        : `€ ${Number(item.startgeld_details).toFixed(2)}`
    }`
  : ""}
    </p>
  </div>
) : null}
    </div>

    {/* Details */}
    {item.details ? (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-600" />
          <p className="text-sm font-black text-gray-900">Beschreibung</p>
        </div>
        <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.details}</p>
      </div>
    ) : null}

    {/* Bottom Close Button */}
    <div className="pt-1">
      <DialogClose asChild>
        <Button className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-gray-900/90 text-white font-black">
          Schließen
        </Button>
      </DialogClose>
    </div>
  </div>
</DialogContent>
    </Dialog>
  )
})}
          </div>
        </div>
      )}
    </section>
  </div>
</div>
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
<section className="py-8 sm:py-10">
  <div className="container mx-auto px-4">
    {/* Header */}
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-orange-600">Unsere Partner</p>
        <h2 className="text-base sm:text-lg font-black text-gray-900">Gemeinsam für den Dartsport</h2>
        <p className="text-sm text-gray-600 mt-1">
          Danke an Sponsoren & Partner für die Unterstützung.
        </p>
      </div>

      <Button
        variant="ghost"
        className="h-9 px-3 text-orange-700 hover:bg-orange-50 font-bold"
        onClick={() => (window.location.href = "/sponsoring")}
      >
        Sponsor werden
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>

    {/* Hauptsponsor */}
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-3 text-xs font-black">
            Hauptsponsor
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex items-center justify-center">
          <Image
  src="/images/sponsoren/sponsor1.png"
  alt="Hauptsponsor"
  width={260}
  height={110}
  className="h-auto object-contain"
  style={{ width: "100%", height: "auto", maxWidth: "260px" }}
  priority
/>
        </div>
      </div>
    </div>

    {/* Premium Partner (App Carousel) */}
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-gray-900">Premium Partner</h3>
        <span className="text-xs text-gray-500"></span>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3">
          {[2, 3, 4].map((num) => (
            <div
              key={num}
              className="min-w-[170px] rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center justify-center"
            >
              <Image
  src={`/images/sponsoren/sponsor${num}.png`}
  alt={`Premium Partner ${num}`}
  width={160}
  height={70}
  className="h-auto object-contain"
  style={{ width: "100%", height: "auto", maxWidth: "160px" }}
/>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* */}
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-gray-900">Offizielle Partner</h3>
        <span className="text-xs text-gray-500"></span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
          <div
            key={num}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 flex items-center justify-center"
          >
            <Image
  src={`/images/sponsoren/sponsor${num}.png`}
  alt={`Partner ${num}`}
  width={140}
  height={60}
  className="h-auto object-contain"
  style={{ width: "100%", height: "auto", maxWidth: "140px" }}
/>
          </div>
        ))}
      </div>
    </div>

    {/*  */}
    <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-black text-gray-900">Partner werden</h4>
          <p className="text-sm text-gray-700 mt-1">
            Interesse an einer Partnerschaft? Schreib uns – wir melden uns schnell.
          </p>
        </div>

        <Button
          className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black px-4"
          onClick={() => (window.location.href = "/sponsoring")}
        >
          Sponsoring
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  </div>
</section>

<FAQChatWidget />





<section className="relative overflow-hidden py-10 sm:py-14 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-3xl mx-4 sm:mx-6 shadow-2xl">

  {/* Soft Glow */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-yellow-300/20 blur-[120px] rounded-full"></div>
  </div>

  <div className="relative mx-auto max-w-2xl px-4 text-center text-white">

    {/* Badge */}
    <span className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-white/15 text-xs font-bold backdrop-blur">
      🚀 Jetzt verfügbar
    </span>

    {/* Headline */}
    <h2 className="text-2xl sm:text-3xl font-black leading-tight">
      EMD Vereinsapp
    </h2>

    {/* Text */}
    <p className="mt-4 text-sm sm:text-base text-orange-50/90">
      Alles rund um Liga, Turniere und Vereinsnews –
      modern, schnell und direkt auf deinem Smartphone.
    </p>

    {/* Feature Chips */}
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {["Live-Scores", "Turniere", "Push-News", "Statistiken"].map((item) => (
        <span
          key={item}
          className="px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold backdrop-blur"
        >
          {item}
        </span>
      ))}
    </div>

    {/* Google Play Badge */}
    <div className="mt-8 flex justify-center">
      <a
        href="https://play.google.com/store/apps/details?id=com.emojisdartverein.app"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-transform duration-300 active:scale-95"
      >
        <Image
          src="/images/google-play-badge.png"
          alt="Jetzt bei Google Play herunterladen"
          width={200}
          height={60}
          className="h-14 w-auto drop-shadow-xl"
          priority
        />
      </a>
    </div>

   

  </div>
</section>







<footer className="mt-10 border-t border-gray-200 bg-white">
  <div className="container mx-auto px-4 py-6">
    {/* Social row */}
    <div className="flex flex-wrap items-center justify-center gap-2">
      {[
        { href: "https://www.facebook.com/groups/1902196843213608", label: "Facebook", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )},
        { href: "https://www.instagram.com/emojsdartverein/", label: "Instagram", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        )},
        { href: "https://www.youtube.com/@emojsdartvereinev.9194", label: "YouTube", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        )},
        { href: "https://www.tiktok.com/@emojizyy3md?_t=8ahlStO563y&_r=1", label: "TikTok", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        )},
        { href: "https://api.whatsapp.com/send/?phone=436604696464&text&type=phone_number&app_absent=0", label: "WhatsApp", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        )},
      ].map((s) => (
        <a
          key={s.href}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 text-gray-700 shadow-sm active:scale-[0.98]"
        >
          <span className="text-orange-600">{s.icon}</span>
          <span className="text-xs font-bold">{s.label}</span>
        </a>
      ))}
    </div>

    {/* Links */}
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
      <a href="/impressum" className="text-gray-600 hover:text-orange-700 font-semibold">
        Impressum
      </a>
      <a href="/datenschutz" className="text-gray-600 hover:text-orange-700 font-semibold">
        Datenschutz
      </a>
      <a href="/kontakt" className="text-gray-600 hover:text-orange-700 font-semibold">
        Kontakt
      </a>
    </div>

    {/* Copyright */}
    <div className="mt-5 text-center">
      <p className="text-xs text-gray-500">
        © {new Date().getFullYear()} EMD Salzburg • Erstellt von <span className="font-bold text-gray-700">Grafikguru</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-1">Alle Rechte vorbehalten.</p>
    </div>
  </div>
</footer>





      

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation()
              setFullscreenPhoto(null)
            }}
            aria-label="Foto schließen"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="relative w-full h-full max-w-7xl max-h-[90vh]">
            <Image src={fullscreenPhoto || "/placeholder.svg"} alt="Vollbild" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}






      <Dialog open={liveInfoOpen} onOpenChange={setLiveInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hinweis</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 leading-relaxed">
            Abmeldungen sind jederzeit bis 10 Minuten vor Turnierbeginn möglich, solange die Anmeldung offen ist. Wenn du
            bis Turnierbeginn nicht anwesend bist, wird deine Anmeldung storniert und der Betrag bei vorab bezahlter
            Startgebühr rückerstattet.
          </div>
        </DialogContent>
      </Dialog>

      <DKOSelfRegistrationModal
        isOpen={dkoModal.isOpen}
        onClose={() => setDkoModal((prev) => ({ ...prev, isOpen: false }))}
        title={dkoModal.title}
        dateLabel={dkoModal.dateLabel}
        timeLabel={dkoModal.timeLabel}
        seriesId={dkoModal.seriesId}
        startgeld={dkoModal.startgeld}
        onRegistrationChanged={(isReg: boolean) => {
          setDkoRegistered(isReg)

          const delta = Date.now() - (modalOpenedAtRef.current || 0)
          if (delta < 900) return

          setDkoModal((prev) => ({ ...prev, isOpen: false }))
          showToast(isReg ? "✅ Erfolgreich angemeldet!" : "✅ Erfolgreich abgemeldet!")
        }}
      />

      {toast.show && (
        <div className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2">
          <div className="rounded-full bg-black/85 text-white px-4 py-2 text-sm font-semibold shadow-lg">{toast.text}</div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}

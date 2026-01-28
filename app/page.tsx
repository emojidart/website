"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  Lock,
  LogOut,
  UserPlus,
} from "lucide-react"
import Image from "next/image"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DKOSelfRegistrationModal } from "@/components/dko-self-registration-modal"
import { PushNotificationDialog } from "@/components/push-notification-dialog"
import { Confetti, CarnivalBanner } from "@/components/confetti"

function DebugViewportOverlay() {
  const [info, setInfo] = useState(() => ({
    innerWidth: "-",
    innerHeight: "-",
    clientWidth: "-",
    clientHeight: "-",
    devicePixelRatio: "-",
    visualScale: "-",
    userAgent: "-",
    viewportMeta: "-",
  }))

  useEffect(() => {
    const read = () => {
      const docEl = document.documentElement
      const vv = window.visualViewport
      const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
      setInfo({
        innerWidth: String(window.innerWidth),
        innerHeight: String(window.innerHeight),
        clientWidth: String(docEl?.clientWidth ?? "-"),
        clientHeight: String(docEl?.clientHeight ?? "-"),
        devicePixelRatio: String(window.devicePixelRatio ?? "-"),
        visualScale: vv ? String(vv.scale) : "-",
        userAgent: navigator.userAgent,
        viewportMeta: meta?.content ?? "(kein meta viewport gefunden)",
      })
    }

    read()
    window.addEventListener("resize", read)
    window.visualViewport?.addEventListener("resize", read)
    window.visualViewport?.addEventListener("scroll", read)

    return () => {
      window.removeEventListener("resize", read)
      window.visualViewport?.removeEventListener("resize", read)
      window.visualViewport?.removeEventListener("scroll", read)
    }
  }, [])

  return (
    <div
      className="fixed bottom-2 left-2 z-[99999] max-w-[92vw] rounded-lg bg-black/80 text-white px-3 py-2 text-[11px] leading-snug shadow-lg"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="font-bold mb-1">Debug (Viewport)</div>
      <div>innerWidth/Height: {info.innerWidth} × {info.innerHeight}</div>
      <div>clientWidth/Height: {info.clientWidth} × {info.clientHeight}</div>
      <div>dpr: {info.devicePixelRatio} · visualViewport.scale: {info.visualScale}</div>
      <div className="mt-1 break-words opacity-90">
        <span className="font-semibold">meta viewport:</span> {info.viewportMeta}
      </div>
      <div className="mt-1 break-words opacity-80">
        <span className="font-semibold">UA:</span> {info.userAgent}
      </div>
    </div>
  )
}

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
  time: string
  location: string
  details: string | null
  photo_url: string | null
  type: "tournament" | "event"
  eventType?: string
  entry_fee?: number
  mode?: string
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

interface BuffaloCupEvent {
  id: string
  name: string
  event_date: string
  event_time: string | null
  matchday: number
  description: string | null
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
  // iso: YYYY-MM-DD -> "DD. Mon. YYYY"
  const [y, m, d] = isoDate.split("-").map((x) => Number.parseInt(x, 10))
  const months = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."]
  const mm = Number.isFinite(m) ? m - 1 : 0
  return `${pad2(d)}. ${months[mm] || "Jan."} ${y}`
}

function ensureUhr(time: string) {
  // "19:30" or "19:30 Uhr" -> "19:30 Uhr"
  const t = time.replace("Uhr", "").trim()
  return t.includes(":") ? `${t} Uhr` : `${t}:00 Uhr`
}

function parseTimeToHHMM(time: string) {
  // "19:30" or "19:30 Uhr" -> "19:30"
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
  // Anzeige: "17 Std 33 Min 12 Sek"
  return `${hours} Std ${pad2(minutes)} Min ${pad2(seconds)} Sek`
}


export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [cupPrizePool, setCupPrizePool] = useState<number>(0)
  const [lionTop5, setLionTop5] = useState<Array<{ player_name: string; total_points: number; original_total_points: number; tournaments_played: number }>>([])
  const [lionTop5Loading, setLionTop5Loading] = useState<boolean>(true)
  const [lionHalvingActive, setLionHalvingActive] = useState<boolean>(false)
  const [buffaloPrizePool, setBuffaloPrizePool] = useState<number>(0)
  const [buffaloTop5, setBuffaloTop5] = useState<Array<{ player_name: string; total_points: number; tournaments_played: number }>>([])
  const [buffaloTop5Loading, setBuffaloTop5Loading] = useState<boolean>(true)
  const [combinedEvents, setCombinedEvents] = useState<CombinedEvent[]>([])
  const [nextEvent, setNextEvent] = useState<LionCupEvent | null>(null)
  const [nextTournamentEvent, setNextTournamentEvent] = useState<LionCupEvent | null>(null)
  const [nextBuffaloCupEvent, setNextBuffaloCupEvent] = useState<BuffaloCupEvent | null>(null)
  const [lionCupLoading, setLionCupLoading] = useState(true)
  const [buffaloCupLoading, setBuffaloCupLoading] = useState(true)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

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

    // Check if app is already installed
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
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
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

    const { outcome } = await deferredPrompt.userChoice

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
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
          `)
          .eq("status", "scheduled")
          .gte("match_date", today)
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true })
          .limit(4)

        if (matchesData) {
          const enrichedMatches =
            matchesData?.map((match) => {
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
        const { data, error } = await supabase
          .from("tournament_series_aggregated")
          .select("player_name, tournaments_played")

        if (error) {
          throw error
        }

        const totalParticipants = data?.length || 0
        const totalAppearances = data?.reduce((sum, player) => sum + player.tournaments_played, 0) || 0

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

  
      const { data: settings } = await supabase
        .from("season_settings")
        .select("halving_active, halving_date")
        .single()

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
          stats.get(name) || ({
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
  const fetchBuffaloTop5 = async () => {
    try {
      setBuffaloTop5Loading(true)

      const { data, error } = await supabase
        .from("buffalo_steel_cup_aggregated")
        .select("player_name, placement_points, bonus_points, total_legs_won, tournaments_played")

      if (error) throw error

      const top5 =
        (data || [])
          .map((row: any) => ({
            player_name: row.player_name,
            total_points:
              Number(row.placement_points || 0) +
              Number(row.bonus_points || 0) +
              Number(row.total_legs_won || 0),
            tournaments_played: Number(row.tournaments_played || 0),
            _legs: Number(row.total_legs_won || 0),
            _placement: Number(row.placement_points || 0),
          }))
          .sort((a, b) => {
            if (b.total_points !== a.total_points) return b.total_points - a.total_points
            if (b._legs !== a._legs) return b._legs - a._legs
            if (b._placement !== a._placement) return b._placement - a._placement
            return a.tournaments_played - b.tournaments_played
          })
          .slice(0, 5)
          .map(({ _legs, _placement, ...rest }) => rest)

      setBuffaloTop5(top5)
    } catch (e) {
      console.error("Error fetching Buffalo Top5:", e)
      setBuffaloTop5([])
    } finally {
      setBuffaloTop5Loading(false)
    }
  }

  fetchBuffaloTop5()
}, [])


  useEffect(() => {
    const fetchBuffaloPrizePool = async () => {
      try {
        const { data, error } = await supabase
          .from("buffalo_steel_cup_aggregated")
          .select("player_name, tournaments_played")

        if (error) throw error

        const totalParticipants = data?.length || 0
        const totalAppearances = data?.reduce((sum, p) => sum + (p.tournaments_played || 0), 0) || 0

        // 10€ einmalig pro Spieler + 5€ pro Antritt
        const pool = totalParticipants * 10 + totalAppearances * 5
        setBuffaloPrizePool(pool)
      } catch (e) {
        console.error("Error fetching buffalo prize pool:", e)
        setBuffaloPrizePool(0)
      }
    }

    fetchBuffaloPrizePool()
  }, [])
useEffect(() => {
    const fetchEventsAndTournaments = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from("tournaments")
          .select("*")
          .gte("date", today)
          .order("date", { ascending: true })
          .order("time", { ascending: true })

        if (tournamentsError) {
          console.error("Error fetching tournaments:", tournamentsError)
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .not("name", "ilike", "%LION%")
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })

        if (eventsError) {
          console.error("Error fetching events:", eventsError)
        }

        const combined: CombinedEvent[] = []

        if (tournamentsData) {
          tournamentsData.forEach((tournament) => {
            combined.push({
              id: tournament.id,
              name: tournament.name,
              date: tournament.date,
              time: tournament.time,
              location: tournament.location,
              details: tournament.details,
              photo_url: tournament.photo_url,
              type: "tournament",
              entry_fee: tournament.entry_fee,
              mode: tournament.mode,
            })
          })
        }

        if (eventsData) {
          eventsData.forEach((event) => {
            combined.push({
              id: event.id,
              name: event.name,
              date: event.event_date,
              time: event.event_time || "19:00",
              location: event.location || "Wird bekannt gegeben",
              details: event.description,
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
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("Error loading active tournament:", error)
          return
        }

        if (data) {
          setActiveTournament({
            tournament_id: data.tournament_id,
            tournament_name: data.tournament_name,
            tournament_type: data.tournament_type,
            status: data.status,
          })
        } else {
          setActiveTournament(null)
        }
      } catch (error) {
        console.error("Error loading active tournament:", error)
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
      setBuffaloCupLoading(true)

      // Serien (fixe IDs)
      const LION_SERIES_ID = "bae7b8fe-7013-4160-8a85-f46ac765e003"
      const BUFFALO_SERIES_ID = "747ec150-ea0d-44ba-bcb1-f323f532f122"

// ✅ Startgeld je Serie laden (wichtig für Guthaben-Zahlung im Modal)
const { data: seriesRows, error: seriesErr } = await supabase
  .from("dko_series")
  .select("id,startgeld")
  .in("id", [LION_SERIES_ID, BUFFALO_SERIES_ID])

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

      const [lionRows, buffaloRows] = await Promise.all([
        fetchEvents(LION_SERIES_ID),
        fetchEvents(BUFFALO_SERIES_ID),
      ])

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
      const buffaloEvents = buffaloRows.map(mapRow)

      // Ab heute (inkl. heute)
      const today0 = startOfDay(new Date()).getTime()

      const lionUpcoming = lionEvents
        .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
        .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

      const buffaloUpcoming = buffaloEvents
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

      // --- BUFFALO: nächstes Turnier + matchday (Spielfrei wird NICHT als Spieltag gezählt) ---
      const buffaloNext = buffaloUpcoming.find((e) => e.is_matchday) ?? null

      if (buffaloNext) {
        const allMatchdaysSorted = buffaloEvents
          .filter((e) => e.is_matchday)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        const idx = allMatchdaysSorted.findIndex((e) => e.id === buffaloNext.id)
        const matchday = idx >= 0 ? idx + 1 : 1

        setNextBuffaloCupEvent({
          id: buffaloNext.id,
          name: "EMD BUFFALO STEEL CUP",
          event_date: buffaloNext.effectiveISODate,
          event_time: buffaloNext.effectiveTimeHHMM,
          matchday,
          description: null,
        })
      } else {
        setNextBuffaloCupEvent(null)
      }
    } catch (error) {
      console.error("Error fetching DKO schedules from DB:", error)
      setNextEvent(null)
      setNextTournamentEvent(null)
      setNextBuffaloCupEvent(null)
    } finally {
      setLionCupLoading(false)
      setBuffaloCupLoading(false)
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

  const createBuffaloCupEventDate = (event: BuffaloCupEvent | null) => {
    if (!event) return new Date("2026-01-23T19:30:00")
    const time = event.event_time || "19:30:00"
    return new Date(`${event.event_date}T${time}`)
  }

  const lionCupNextDate = createEventDate(nextTournamentEvent)
  const buffaloCupNextDate = createBuffaloCupEventDate(nextBuffaloCupEvent)
  const isNextEventSpielfrei = nextEvent?.event_type?.toLowerCase() === "spielfrei"


  // --- Turniertag (Lion/Buffalo) Self-Registration Box ---
  const now = new Date()
const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`


  const liveSelfRegEvent = useMemo(() => {
    const lionToday =
      nextTournamentEvent &&
      nextTournamentEvent.event_type?.toLowerCase() === "turnier" &&
      nextTournamentEvent.event_date === todayISO

    if (lionToday) {
      return {
        cup: "lion" as const,
        title: "Anmeldung geöffnet • LION CUP",
        isoDate: nextTournamentEvent!.event_date,
        time: nextTournamentEvent!.event_time || "19:30",
      }
    }

    const buffaloToday = nextBuffaloCupEvent && nextBuffaloCupEvent.event_date === todayISO
    if (buffaloToday) {
      return {
        cup: "buffalo" as const,
        title: "Anmeldung geöffnet • BUFFALO STEEL CUP",
        isoDate: nextBuffaloCupEvent!.event_date,
        time: nextBuffaloCupEvent!.event_time || "19:30",
      }
    }

    return null
  }, [nextTournamentEvent, nextBuffaloCupEvent, todayISO])

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

      // club_players kann als Array oder Objekt kommen
      const clubPlayersRel: any = (profile as any)?.club_players
      const spieldatenbankId = Array.isArray(clubPlayersRel) ? clubPlayersRel?.[0]?.spieldatenbank_id : clubPlayersRel?.spieldatenbank_id
      if (!spieldatenbankId) return

      const pid = String(spieldatenbankId)

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("player_id", pid)
        .limit(1)

      if (regErr) throw regErr

      setDkoRegistered((reg?.length ?? 0) > 0)
    } catch (e) {
      console.error("DKO registration status error:", e)
    } finally {
      setDkoRegLoading(false)
    }
  }

  // DKO: Status ob User bereits in dko_tournament_registration ist (für grüne Box)
  useEffect(() => {
    fetchDkoRegStatus()
  }, [authUserId, liveSelfRegEvent])

  // ✅ Realtime: wenn sich jemand an-/abmeldet, Status live aktualisieren (ohne Refresh)
  useEffect(() => {
    if (!authUserId || !liveSelfRegEvent) return

    const channel = supabase
      .channel("dko-registration-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dko_tournament_registration" },
        () => {
          // einfache, robuste Variante: Status neu laden
          fetchDkoRegStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authUserId, liveSelfRegEvent])


  if (loading || lionCupLoading || buffaloCupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-16 lg:pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Lade Daten...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Confetti />
      <Header />
      <CarnivalBanner />
      <DebugViewportOverlay />

      {/*  */}
      <div className="h-3 sm:h-4" aria-hidden="true" />

      <PushNotificationDialog />

      {activeTournament && (
        <div className="bg-red-600 border-b-4 border-red-700 shadow-md">
          <div className="container mx-auto px-4 py-3 sm:py-4 mt-4 lg:mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                </div>
                <div className="text-white flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-white/20 backdrop-blur-sm uppercase tracking-wider">
                      LIVE
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-lg font-bold leading-tight truncate">
                    {activeTournament.tournament_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90">
                    {activeTournament.tournament_type.replace("_", " ").toUpperCase()}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-white text-red-600 hover:bg-red-50 font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
                onClick={() => (window.location.href = "/live-all-app")}
              >
                <span className="hidden sm:inline">Jetzt Live</span>
                <span className="sm:hidden">Live</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {liveSelfRegEvent && (
  <div
    className={`border-b shadow-md ${
      dkoRegistered
        ? "bg-gradient-to-r from-green-600 to-emerald-700 border-green-800"
        : liveSelfRegEvent.cup === "lion"
          ? "bg-gradient-to-r from-orange-600 to-orange-700 border-orange-800"
          : "bg-gradient-to-r from-slate-700 to-slate-900 border-slate-950"
    } border-b-4`}
  >
    <div className="container mx-auto px-4 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
          </div>

          <div className="text-white flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-black backdrop-blur-sm uppercase tracking-wider ${
                  liveSelfRegEvent.cup === "lion" ? "bg-orange-200 text-orange-950" : "bg-slate-200 text-slate-950"
                }`}
              >
                {liveSelfRegEvent.cup === "lion" ? "LION CUP" : "BUFFALO STEEL CUP"}
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-white/20 backdrop-blur-sm uppercase tracking-wider">
                TURNIERTAG
              </span>

              {dkoRegistered && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-white/20 backdrop-blur-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Du bist angemeldet
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-lg font-black leading-tight truncate">{liveSelfRegEvent.title}</h3>

            <p className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {liveDateLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {liveTimeLabel}
              </span>
            </p>

            <div className="mt-2 text-[11px] sm:text-xs text-white/90 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              {liveRegOpen ? (
                <span className="font-semibold">
                  Anmeldung noch: {formatHoursMinutesSeconds(liveSecondsLeft ?? 0)} (schließt 10 Minuten vor Start)
                </span>
              ) : (
                <span className="font-semibold">Anmeldung geschlossen (10 Minuten vor Start)</span>
              )}
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setLiveInfoOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-white/90 underline underline-offset-4 hover:text-white"
              >
                <Info className="w-3.5 h-3.5" />
                Infos zu Abmeldung & Rückerstattung
              </button>
            </div>


            

          </div>
        </div>

        {/* Mobile action (shows below content) */}
        <div className="sm:hidden mt-3">
          <Button
            size="sm"
            disabled={!liveRegOpen || dkoRegLoading}
            className={`w-full font-black shadow-lg hover:shadow-xl transition-all duration-200 text-xs px-3 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${
              dkoRegistered
                ? "bg-white text-gray-900 hover:bg-white/90"
                : liveSelfRegEvent.cup === "lion"
                  ? "bg-orange-200 text-orange-950 hover:bg-orange-100"
                  : "bg-slate-200 text-slate-950 hover:bg-slate-100"
            }`}
            onClick={async () => {
              
modalOpenedAtRef.current = Date.now()

const seriesId =
  liveSelfRegEvent.cup === "lion"
    ? "bae7b8fe-7013-4160-8a85-f46ac765e003"
    : "747ec150-ea0d-44ba-bcb1-f323f532f122"

const startgeld = await ensureStartgeldForSeriesId(seriesId)

setDkoModal({
  isOpen: true,
  title: liveSelfRegEvent.cup === "lion" ? "LION CUP • Anmeldung" : "BUFFALO STEEL CUP • Anmeldung",
  dateLabel: liveDateLabel,
  timeLabel: liveTimeLabel,
  seriesId,
  startgeld,
})}}
          >
            {dkoRegLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                ...
              </span>
            ) : dkoRegistered ? (
              "Anmeldung verwalten"
            ) : liveRegOpen ? (
              "Jetzt anmelden"
            ) : (
              "Anmeldung geschlossen"
            )}
          </Button>
        </div>


        <Button
          size="sm"
          disabled={!liveRegOpen || dkoRegLoading}
          className={`hidden sm:inline-flex font-black shadow-lg hover:shadow-xl transition-all duration-200 flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${
            dkoRegistered
              ? "bg-white text-gray-900 hover:bg-white/90"
              : liveSelfRegEvent.cup === "lion"
                ? "bg-orange-200 text-orange-950 hover:bg-orange-100"
                : "bg-slate-200 text-slate-950 hover:bg-slate-100"
          }` }
          onClick={async () => {
            
modalOpenedAtRef.current = Date.now()

const seriesId =
  liveSelfRegEvent.cup === "lion"
    ? "bae7b8fe-7013-4160-8a85-f46ac765e003"
    : "747ec150-ea0d-44ba-bcb1-f323f532f122"

const startgeld = await ensureStartgeldForSeriesId(seriesId)

setDkoModal({
  isOpen: true,
  title: liveSelfRegEvent.cup === "lion" ? "LION CUP • Anmeldung" : "BUFFALO STEEL CUP • Anmeldung",
  dateLabel: liveDateLabel,
  timeLabel: liveTimeLabel,
  seriesId,
  startgeld,
})}}
        >
          {dkoRegLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              ...
            </span>
          ) : dkoRegistered ? (
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Abmelden
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Anmelden
            </span>
          )}
        </Button>
      </div>
    </div>
  </div>
)}


      <section className="container mx-auto px-4 py-8 lg:py-12 overflow-x-hidden">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white overflow-hidden rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-[url('/stadium-crowd-atmosphere.jpg')] bg-cover bg-center opacity-10" />

            <div className="relative p-4 sm:p-6 lg:p-10 flex flex-col min-h-full">
              <div className="w-full mx-auto flex-1 flex flex-col">
                <div className="flex items-center justify-center mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Image src="/images/logo1.png" alt="Logo 1" width={96} height={96} className="object-contain p-2" />
                  </div>
                </div>

                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-900 px-3 py-1.5 rounded-full font-bold text-xs mb-3">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>TURNIERSERIE 2025/26</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-1">EMD - LION CUP</h1>
                  <div className="h-10 flex items-center justify-center mb-1">                    {nextTournamentEvent?.matchday && (
                      <div className="inline-block mr-2">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                          <div className="flex items-center gap-2 text-xs">
                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-orange-100">Spieltag {nextTournamentEvent.matchday}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isNextEventSpielfrei && nextEvent && (
                                          <div className="inline-block">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                              <div className="flex items-center gap-2 text-xs">
                                                <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                                                <span className="text-orange-100">
                                                  Spielfrei am{" "}
                                                  {new Date(nextEvent.event_date).toLocaleDateString("de-DE", {
                                                    day: "2-digit",
                                                    month: "long",
                                                  })}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}</div>
                  <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">Nächstes Turnier</p>
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

                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 sm:px-4 lg:px-8 py-3 sm:py-4 border border-white/20">
                    <CountdownTimer targetDate={lionCupNextDate} />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6 flex-1 flex flex-col justify-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 border border-white/20">
<div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-300" />
                          <span className="text-yellow-200 text-xs lg:text-sm font-bold uppercase tracking-wider">
                            Top 5 aktuell
                          </span>
                        </div>
                        {lionTop5Loading && <span className="text-[10px] sm:text-xs text-orange-200 font-bold">Lade…</span>}
                      </div>
                    
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/15 overflow-hidden">
                        {!lionTop5Loading && lionTop5.length === 0 && (
                          <div className="px-3 py-2 text-xs text-orange-200">Keine Daten verfügbar.</div>
                        )}
                    
                        {lionTop5.map((p, idx) => (
                          <div key={p.player_name} className="flex items-center justify-between px-3 py-2 border-b border-white/10 last:border-b-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-black text-white">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-[260px]">
                                  {p.player_name}
                                </div>
                                <div className="text-[10px] sm:text-xs text-orange-200">
                                  Antritte: <span className="font-black text-white">{p.tournaments_played}</span>
                                </div>
                              </div>
                            </div>
                    
                            <div className="text-right flex-shrink-0">
                              {lionHalvingActive && p.original_total_points !== p.total_points ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-orange-200 line-through">{p.original_total_points}</span>
                        <span className="text-xs sm:text-sm font-black text-yellow-200">{p.total_points}</span>
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-black text-yellow-200">{p.total_points}</div>
                    )}
                              <div className="text-[10px] text-orange-200">Punkte</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        <span className="text-yellow-300 text-xs lg:text-sm font-bold uppercase tracking-wider">
                          Aktuelles Preisgeld
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-green-300">
                        <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs font-bold">+€4 pro Teilnahme</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1">€{cupPrizePool.toFixed(2)}</div>
                      <p className="text-orange-200 text-xs lg:text-sm">
                        Wächst mit jedem Teilnehmer und jeder Teilnahme
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    className="bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl w-full sm:w-auto"
                    onClick={() => (window.location.href = "/tournament-series-app")}
                  >
                    Zur Gesamtertung
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl backdrop-blur-sm w-full sm:w-auto"
                    onClick={() => (window.location.href = "/lion-cup-regelwerk")}
                  >
                    Regelwerk
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl backdrop-blur-sm w-full sm:w-auto"
                    onClick={() => (window.location.href = "/upcoming-tournaments-app")}
                  >
                    Anmelden
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white overflow-hidden rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-[url('/stadium-crowd-atmosphere.jpg')] bg-cover bg-center opacity-5" />

            <div className="relative p-4 sm:p-6 lg:p-10 flex flex-col min-h-full">
              <div className="w-full mx-auto flex-1 flex flex-col">
                <div className="flex items-center justify-center mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <Image src="/images/logo2.png" alt="Logo 2" width={96} height={96} className="object-contain p-2" />
                  </div>
                </div>
				
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-slate-400 text-slate-900 px-3 py-1.5 rounded-full font-bold text-xs mb-3">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>TURNIERSERIE 2026</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-1">EMD-BUFFALO-STEEL</h1>
                  <div className="h-10 flex items-center justify-center mb-1">
                    {nextBuffaloCupEvent && (
                      <div className="inline-block">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                          <div className="flex items-center gap-2 text-xs">
                            <Trophy className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-300">Spieltag {nextBuffaloCupEvent.matchday}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-300 mb-2"></h2>
                  <p className="text-base sm:text-lg lg:text-xl text-slate-200 mb-1">Nächstes Turnier</p>
                  <p className="text-sm lg:text-base text-slate-300">
                    {nextBuffaloCupEvent
                      ? `${new Date(buffaloCupNextDate).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })} • ${nextBuffaloCupEvent.event_time || "19:30"} Uhr`
                      : "22. Jänner 2026 • 19:30 Uhr"}
                  </p>
                </div>

                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 sm:px-4 lg:px-8 py-3 sm:py-4 border border-white/20">
                    <CountdownTimer targetDate={buffaloCupNextDate} />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6 flex-1 flex flex-col justify-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 border border-white/20">

<div className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
      <span className="text-blue-200 text-xs lg:text-sm font-bold uppercase tracking-wider">
        Top 5 AKTUELL
      </span>
    </div>
    {buffaloTop5Loading && (
      <span className="text-[10px] sm:text-xs text-orange-200 font-bold">Lade…</span>
    )}
  </div>

  <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/15 overflow-hidden">
    {!buffaloTop5Loading && buffaloTop5.length === 0 && (
      <div className="px-3 py-2 text-xs text-orange-200">Keine Daten verfügbar.</div>
    )}

    {buffaloTop5.map((p, idx) => (
      <div
        key={p.player_name}
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 last:border-b-0"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-black text-white">
            {idx + 1}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-[260px]">
              {p.player_name}
            </div>
            <div className="text-[10px] sm:text-xs text-orange-200">
              Antritte: <span className="font-black text-white">{p.tournaments_played}</span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs sm:text-sm font-black text-blue-200">{p.total_points}</div>
          <div className="text-[10px] text-orange-200">Punkte</div>
        </div>
      </div>
    ))}
  </div>
</div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        <span className="text-yellow-300 text-xs lg:text-sm font-bold uppercase tracking-wider">
                          Aktuelles Preisgeld
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-green-300">
                        <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs font-bold">+€5 pro Teilnahme</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1">€{buffaloPrizePool.toFixed(2)}</div>
                      <p className="text-orange-200 text-xs lg:text-sm">
                        Wächst mit jedem Teilnehmer und jeder Teilnahme
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    className="bg-slate-400 hover:bg-slate-500 text-slate-900 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl w-full sm:w-auto"
                    onClick={() => (window.location.href = "/buffalo_steel_cup_tabelle")}
                  >
                    Zur Gesamtertung
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl backdrop-blur-sm w-full sm:w-auto"
                    onClick={() => (window.location.href = "/buffalo-steel-cup")}
                  >
                    Regelwerk
                    
                  </Button>
                <Button
  size="lg"
  variant="outline"
  className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-2xl backdrop-blur-sm w-full sm:w-auto"
  onClick={() => (window.location.href = "/upcoming-tournaments-app")}
>
  Anmelden
</Button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Nächste Spiele</h2>
              <Button
                variant="ghost"
                className="text-primary font-semibold"
                onClick={() => (window.location.href = "/liga-statistiken-app")}
              >
                Alle Spiele
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {matches.slice(0, 4).map((match) => (
                <Card key={match.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col items-center flex-1">
                        {getTeamLogo(match, true) ? (
                          <img
                            src={getTeamLogo(match, true) || "/placeholder.svg"}
                            alt={getTeamName(match, true)}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 mb-2"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Trophy className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <p className="font-semibold text-sm text-center">{getTeamName(match, true)}</p>
                      </div>
                      <div className="text-2xl font-bold text-gray-400">vs</div>
                      <div className="flex flex-col items-center flex-1">
                        {getTeamLogo(match, false) ? (
                          <img
                            src={getTeamLogo(match, false) || "/placeholder.svg"}
                            alt={getTeamName(match, false)}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 mb-2"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Trophy className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <p className="font-semibold text-sm text-center">{getTeamName(match, false)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {matches.length === 0 && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">Keine anstehenden Spiele</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Turniere & Veranstaltungen</h2>
              <Button
                variant="ghost"
                className="text-primary font-semibold"
                onClick={() => (window.location.href = "/veranstaltungen")}
              >
                Alle Veranstaltungen
              </Button>
            </div>

            {combinedEvents.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Derzeit sind keine weiteren Turniere oder Veranstaltungen geplant.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {combinedEvents.map((item) => {
                  const EventIcon = item.type === "event" && item.eventType ? getEventTypeIcon(item.eventType) : Trophy

                  return (
                    <Dialog key={item.id}>
                      <DialogTrigger asChild>
                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer">
                          <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                            {item.photo_url ? (
                              <Image
                                src={item.photo_url || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                                <EventIcon className="h-16 w-16 text-primary" />
                              </div>
                            )}
                            <div className="absolute top-4 left-4">
                              <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                                {item.type === "tournament"
                                  ? "TURNIER"
                                  : getEventTypeLabel(item.eventType || "").toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-500 mb-2">
                              {new Date(item.date)
                                .toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                                .toUpperCase()}
                            </p>
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {item.details ||
                                `${
                                  item.type === "tournament"
                                    ? `${item.mode === "edart" ? "E-Dart" : item.mode === "steeldart" ? "Steel Dart" : "Beide Modi"} Turnier`
                                    : getEventTypeLabel(item.eventType || "")
                                } um ${item.time} Uhr`}
                            </p>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl sm:text-3xl font-black text-primary">
                            {item.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 sm:space-y-6">
                          {item.photo_url && (
                            <div
                              className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden cursor-pointer group"
                              onClick={() => setFullscreenPhoto(item.photo_url)}
                            >
                              <Image
                                src={item.photo_url || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, 800px"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3">
                                  <svg
                                    className="w-6 h-6 text-gray-900"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 sm:p-6 border border-orange-200">
                            <div className="flex items-center gap-3 mb-4">
                              <EventIcon className="w-8 h-8 text-orange-600" />
                              <div>
                                <h4 className="text-xl font-bold text-gray-900">
                                  {item.type === "tournament" ? "Turnierinformationen" : "Info"}
                                </h4>
                                <p className="text-sm text-gray-700">Alle wichtigen Details auf einen Blick</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Calendar className="w-5 h-5 text-orange-600 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-900">Datum</p>
                                <p className="text-gray-700">
                                  {new Date(item.date).toLocaleDateString("de-DE", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Clock className="w-5 h-5 text-orange-600 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-900">Uhrzeit</p>
                                <p className="text-gray-700">{item.time} Uhr</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-orange-600 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-900">Ort</p>
                                <p className="text-gray-700">{item.location}</p>
                              </div>
                            </div>

                            {item.type === "tournament" && (
                              <>
                                <div className="flex items-start gap-3">
                                  {item.mode === "edart" ? (
                                    <Target className="w-5 h-5 text-orange-600 mt-1" />
                                  ) : item.mode === "steeldart" ? (
                                    <Swords className="w-5 h-5 text-orange-600 mt-1" />
                                  ) : (
                                    <Users className="w-5 h-5 text-orange-600 mt-1" />
                                  )}
                                  <div>
                                    <p className="font-semibold text-gray-900">Modus</p>
                                    <p className="text-gray-700">
                                      {item.mode === "edart"
                                        ? "E-Dart"
                                        : item.mode === "steeldart"
                                          ? "Steel Dart"
                                          : "Beide Modi"}
                                    </p>
                                  </div>
                                </div>
                                {item.entry_fee !== undefined && (
                                  <div className="flex items-start gap-3">
                                    <Euro className="w-5 h-5 text-orange-600 mt-1" />
                                    <div>
                                      <p className="font-semibold text-gray-900">Startgeld</p>
                                      <p className="text-gray-700">€{item.entry_fee.toFixed(2)}</p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {item.type === "event" && item.eventType && (
                              <div className="flex items-start gap-3">
                                <EventIcon className="w-5 h-5 text-orange-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-gray-900">Art der Veranstaltung</p>
                                  <p className="text-gray-700">{getEventTypeLabel(item.eventType)}</p>
                                </div>
                              </div>
                            )}

                            {item.max_participants && (
                              <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-orange-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-gray-900">Max. Teilnehmer</p>
                                  <p className="text-gray-700">{item.max_participants}</p>
                                </div>
                              </div>
                            )}

                            {item.details && (
                              <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-orange-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-gray-900">Details</p>
                                  <p className="text-gray-700">{item.details}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-base sm:text-lg py-4 sm:py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (item.type === "tournament") {
                                window.location.href = `/veranstaltungen/${item.id}/anmeldung`
                              }
                            }}
                            disabled={item.type === "event"}
                          >
                            {item.type === "tournament" ? "Jetzt anmelden" : "Nur für Turniere"}
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="bg-white py-16 lg:py-24 border-y border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-orange-600 font-bold text-sm uppercase tracking-wider mb-3">Unsere Partner</p>
            <h2 className="text-3xl lg:text-5xl font-black text-gray-900 mb-4">Gemeinsam für den Dartsport</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Wir danken unseren Sponsoren und Partnern für ihre Unterstützung und ihr Vertrauen in EMD Dart
            </p>
          </div>

          <div className="mb-16">
            <div className="text-center mb-8">
              <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg">
                Hauptsponsor
              </span>
            </div>
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-12 shadow-xl border-2 border-gray-200 hover:shadow-2xl hover:border-orange-300 transition-all duration-500 group hover:scale-105">
                <div className="relative h-32 flex items-center justify-center">
                  <Image
                    src="/images/sponsoren/sponsor1.png"
                    alt="Hauptsponsor"
                    width={280}
                    height={120}
                    className="object-contain transition-all duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <div className="text-center mb-8">
              <span className="inline-block bg-slate-700 text-white px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-md">
                Premium Partner
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[2, 3, 4].map((num) => (
                <div
                  key={num}
                  className="bg-white rounded-xl p-8 shadow-md border border-gray-200 hover:shadow-xl hover:border-orange-400 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="relative h-24 flex items-center justify-center">
                    <Image
                      src={`/images/sponsoren/sponsor${num}.png`}
                      alt={`Premium Partner ${num}`}
                      width={200}
                      height={80}
                      className="object-contain transition-all duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-center mb-8">
              <span className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider">
                Offizielle Partner
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {[5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <div
                  key={num}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-300 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className="relative h-16 flex items-center justify-center">
                    <Image
                      src={`/images/sponsoren/sponsor${num}.png`}
                      alt={`Partner ${num}`}
                      width={120}
                      height={60}
                      className="object-contain transition-all duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 rounded-2xl p-8 lg:p-12 border-2 border-orange-200 shadow-lg">
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                Werden Sie Teil unserer Erfolgsgeschichte
              </h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Interessiert an einer Partnerschaft? Kontaktieren Sie uns und profitieren Sie von unserer wachsenden
                Community.
              </p>
              <Button
                size="lg"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-6 text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick={() => (window.location.href = "/sponsoring")}
              >
                Sponsor werden
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <FAQChatWidget />

      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              {showInstallButton ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <Download className="w-12 h-12 text-yellow-400" />
                    <h2 className="text-4xl lg:text-5xl font-black">Lade dir die EMD Dart App runter</h2>
                  </div>
                  <p className="text-lg lg:text-xl text-orange-100 mb-8 leading-relaxed">
                    Bleib immer auf dem Laufenden mit Live-Scores, Turnierergebnissen, Spielplänen und exklusiven News.
                    Verfolge deine Lieblingsspieler und Teams in Echtzeit!
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                    <h2 className="text-4xl lg:text-5xl font-black">App bereits installiert!</h2>
                  </div>
                  <p className="text-lg lg:text-xl text-orange-100 mb-8 leading-relaxed">
                    Super! Du nutzt bereits die EMD Dart App. Bleib immer auf dem Laufenden mit Live-Scores,
                    Turnierergebnissen, Spielplänen und exklusiven News.
                  </p>
                </>
              )}

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-900" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Live-Scores & Ergebnisse</h3>
                    <p className="text-orange-100">Verfolge alle Spiele in Echtzeit</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-900" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Turnier-Anmeldungen</h3>
                    <p className="text-orange-100">Melde dich direkt über die App an</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-orange-900" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Push-Benachrichtigungen</h3>
                    <p className="text-orange-100">Verpasse keine wichtigen Updates</p>
                  </div>
                </div>
              </div>

              {showInstallButton ? (
                <>
                  <Button
                    onClick={handleInstallClick}
                    size="lg"
                    className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold text-base lg:text-lg px-8 py-6 shadow-2xl hover:shadow-3xl transition-all duration-300 mb-6"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Jetzt installieren
                  </Button>
                </>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h3 className="font-bold text-lg mb-3">Du nutzt die App bereits!</h3>
                  <p className="text-sm text-orange-100">
                    Genieße alle Vorteile der EMD Dart App direkt auf deinem Gerät.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                <Image
                  src="/images/emd-app.png"
                  alt="EMD Dart App auf Handy"
                  width={1800}
                  height={1800}
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-white mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/groups/1902196843213608"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/emojsdartverein/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@emojsdartvereinev.9194"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@emojizyy3md?_t=8ahlStO563y&_r=1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
              <a
                href="https://api.whatsapp.com/send/?phone=436604696464&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a href="/impressum" className="text-slate-300 hover:text-orange-500 transition-colors">
                Impressum
              </a>
              <a href="/datenschutz" className="text-slate-300 hover:text-orange-500 transition-colors">
                Datenschutz
              </a>
              <a href="/kontakt" className="text-slate-300 hover:text-orange-500 transition-colors">
                Kontakt
              </a>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-slate-400">
                &copy; {new Date().getFullYear()} EMD Salzburg – Erstellt von <strong>Grafikguru</strong>.
              </p>
              <p className="text-xs text-slate-500">Alle Rechte vorbehalten.</p>
            </div>
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
            <Image
              src={fullscreenPhoto || "/placeholder.svg"}
              alt="Vollbild"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      <Dialog open={liveInfoOpen} onOpenChange={setLiveInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hinweis</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 leading-relaxed">
            Abmeldungen sind jederzeit bis 10 Minuten vor Turnierbeginn möglich, solange die Anmeldung offen ist. Wenn du bis Turnierbeginn nicht anwesend bist, wird deine Anmeldung storniert und der Betrag bei vorab bezahlter Startgebühr rückerstattet.
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
    // Status immer übernehmen
    setDkoRegistered(isReg)

    // Wenn Callback zu schnell nach Öffnen kommt => Initial Sync => NICHT schließen
    const delta = Date.now() - (modalOpenedAtRef.current || 0)
    if (delta < 900) return

    // Echte Aktion => Toast + schließen
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

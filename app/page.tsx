"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { PushEnableBanner } from "@/components/push-enable-banner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Bell,
  Download,
  Loader2,
  Timer,
  LogOut,
  UserPlus,
  ShoppingBag,
} from "lucide-react"
import Image from "next/image"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useMembershipAccess } from "@/hooks/use-membership-access"
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
  dart_type?: string | null
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
  sourceKind?: "internal" | "dach"
  internalEventId?: string | null
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

type BirthdayPlayer = {
  id: string
  name: string
  birthdate: string
  age: number | null
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
  const type = String(eventType || "").toLowerCase()

  if (type.includes("party")) return "Party"
  if (type.includes("spiel")) return "Spielabend"
  if (type.includes("turnier") || type === "tournament") return "Turnier"
  if (type.includes("versammlung")) return "Versammlung"
  if (type === "other") return "Veranstaltung"
  if (type === "announcement") return "Ankündigung"
  if (type === "console" || type === "gaming") return "Konsole"

  return "Veranstaltung"
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
  const raw = String(time || "19:00").replace("Uhr", "").trim()
  const t = raw.length >= 5 ? raw.slice(0, 5) : raw
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


type HomeLeagueMatch = Match & {
  my_team_id: string
  my_status: "none" | "yes" | "maybe" | "no"
}


function getLeagueDartTypeForMyTeam(match: any, myTeamIds: string[]) {
  if (match?.home_team_id && myTeamIds.includes(match.home_team_id)) {
    return String(match?.home_team?.dart_type || match?.dart_type || "").toLowerCase()
  }

  if (match?.away_team_id && myTeamIds.includes(match.away_team_id)) {
    return String(match?.away_team?.dart_type || match?.dart_type || "").toLowerCase()
  }

  return String(match?.dart_type || "").toLowerCase()
}

export default function Home() {
  const { loading: membershipLoading, hasModule } = useMembershipAccess()
  const canSeeEDartLeague = hasModule("edart_league")
  const canSeeSteeldartLeague = hasModule("steeldart_league")
  const hasLeaguePackage = canSeeEDartLeague || canSeeSteeldartLeague

  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myLeagueMatches, setMyLeagueMatches] = useState<HomeLeagueMatch[]>([])
  const [myLeagueLoading, setMyLeagueLoading] = useState(false)
  const [myLeagueSaving, setMyLeagueSaving] = useState<string>("")

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [cupPrizePool, setCupPrizePool] = useState<number>(0)
  const [summerPrizePool, setSummerPrizePool] = useState<number>(0)
  const [membersPrizePool, setMembersPrizePool] = useState<number>(0)
 const [lionTop5, setLionTop5] = useState<
  Array<{ player_name: string; total_points: number; original_total_points: number; tournaments_played: number }>
>([])

const [lionTop5Loading, setLionTop5Loading] = useState<boolean>(true)
  

  
  
    
  const [lionHalvingActive, setLionHalvingActive] = useState<boolean>(false)
  const [combinedEvents, setCombinedEvents] = useState<CombinedEvent[]>([])
  const [nextEvent, setNextEvent] = useState<LionCupEvent | null>(null)
  const [nextTournamentEvent, setNextTournamentEvent] = useState<LionCupEvent | null>(null)
  const [lionCupLoading, setLionCupLoading] = useState(true)
  const [nextSummerTournamentEvent, setNextSummerTournamentEvent] = useState<LionCupEvent | null>(null)
const [summerSpecialLoading, setSummerSpecialLoading] = useState(true)
const [nextMembersChampionEvent, setNextMembersChampionEvent] = useState<LionCupEvent | null>(null)
const [membersChampionLoading, setMembersChampionLoading] = useState(true)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const [birthdayPlayers, setBirthdayPlayers] = useState<BirthdayPlayer[]>([])
const [birthdayLoading, setBirthdayLoading] = useState(true)
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
  const [membersCupRegistered, setMembersCupRegistered] = useState(false)
const [membersCupRegLoading, setMembersCupRegLoading] = useState(false)

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
  const id = window.setInterval(() => {
    setNowTick(Date.now())
  }, 1000)

  return () => window.clearInterval(id)
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

  useEffect(() => {
    if (membershipLoading) return

    const loadMyLeagueMatches = async () => {
      if (!authUserId || !hasLeaguePackage) {
        setMyPlayerId(null)
        setMyLeagueMatches([])
        return
      }

      try {
        setMyLeagueLoading(true)

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", authUserId)
          .maybeSingle()

        if (profileError) throw profileError

        const playerId = (profileData as any)?.player_id as string | undefined
        if (!playerId) {
          setMyPlayerId(null)
          setMyLeagueMatches([])
          return
        }

        setMyPlayerId(playerId)

        const { data: teamRows, error: teamError } = await supabase
          .from("team_members")
          .select("team_id, teams(id,name,dart_type)")
          .eq("player_id", playerId)
          .is("left_at", null)

        if (teamError) throw teamError

        const eligibleTeams = ((teamRows as any[]) || []).filter((row: any) => {
          const dartType = String(row?.teams?.dart_type || "").toLowerCase()
          if (dartType === "edart") return canSeeEDartLeague
          if (dartType === "steeldart") return canSeeSteeldartLeague
          return false
        })

        const teamIds = eligibleTeams.map((row: any) => row.team_id).filter(Boolean)
        if (teamIds.length === 0) {
          setMyLeagueMatches([])
          return
        }

        const today = new Date().toISOString().split("T")[0]

        const [{ data: upcoming, error: matchError }, { data: opponentTeamsData }] = await Promise.all([
          supabase
            .from("matches")
            .select(`
              *,
              home_team:teams!matches_home_team_id_fkey(id,name,logo_url,dart_type),
              away_team:teams!matches_away_team_id_fkey(id,name,logo_url,dart_type)
            `)
            .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
            .gte("match_date", today)
            .neq("status", "completed")
            .order("match_date", { ascending: true })
            .order("match_time", { ascending: true })
            .limit(30),
          supabase.from("opponent_teams").select("*"),
        ])

        if (matchError) throw matchError

        const eligibleMatches = ((upcoming as any[]) || []).filter((match: any) => {
          const dartType = getLeagueDartTypeForMyTeam(match, teamIds)

          if (dartType === "edart") return canSeeEDartLeague
          if (dartType === "steeldart") return canSeeSteeldartLeague

          return false
        })

        const selected: any[] = []

        if (canSeeEDartLeague) {
          const next = eligibleMatches.find(
            (match: any) => getLeagueDartTypeForMyTeam(match, teamIds) === "edart",
          )
          if (next) selected.push(next)
        }

        if (canSeeSteeldartLeague) {
          const next = eligibleMatches.find(
            (match: any) => getLeagueDartTypeForMyTeam(match, teamIds) === "steeldart",
          )
          if (next) selected.push(next)
        }

        const enriched: HomeLeagueMatch[] = []

        for (const match of selected) {
          const myTeamId = teamIds.includes(match.home_team_id)
            ? match.home_team_id
            : match.away_team_id

          const { data: availability } = await supabase
            .from("match_availability")
            .select("status")
            .eq("match_id", match.id)
            .eq("player_id", playerId)
            .maybeSingle()

          const homeOpponentTeam = match.home_opponent_team_id
            ? (opponentTeamsData as any[])?.find((team: any) => team.id === match.home_opponent_team_id)
            : null
          const awayOpponentTeam = match.away_opponent_team_id
            ? (opponentTeamsData as any[])?.find((team: any) => team.id === match.away_opponent_team_id)
            : null

          enriched.push({
            ...match,
            dart_type: getLeagueDartTypeForMyTeam(match, teamIds),
            home_opponent_team: homeOpponentTeam,
            away_opponent_team: awayOpponentTeam,
            my_team_id: myTeamId,
            my_status: ((availability as any)?.status || "none") as "none" | "yes" | "maybe" | "no",
          })
        }

        enriched.sort((a, b) => {
          const aKey = `${a.match_date}T${a.match_time || "23:59"}`
          const bKey = `${b.match_date}T${b.match_time || "23:59"}`
          return aKey.localeCompare(bKey)
        })

        setMyLeagueMatches(enriched)
      } catch (error) {
        console.error("loadMyLeagueMatches error:", error)
        setMyLeagueMatches([])
      } finally {
        setMyLeagueLoading(false)
      }
    }

    void loadMyLeagueMatches()
  }, [
    authUserId,
    membershipLoading,
    canSeeEDartLeague,
    canSeeSteeldartLeague,
    hasLeaguePackage,
  ])

  const setHomeLeagueAvailability = async (
    match: HomeLeagueMatch,
    status: "yes" | "maybe" | "no",
  ) => {
    if (!myPlayerId) return

    try {
      setMyLeagueSaving(`${match.id}-${status}`)

      const { error } = await supabase.from("match_availability").upsert(
        {
          match_id: match.id,
          team_id: match.my_team_id,
          player_id: myPlayerId,
          status,
          note: null,
        },
        { onConflict: "match_id,player_id" },
      )

      if (error) throw error

      setMyLeagueMatches((prev) =>
        prev.map((item) =>
          item.id === match.id ? { ...item, my_status: status } : item,
        ),
      )
    } catch (error) {
      console.error("setHomeLeagueAvailability error:", error)
    } finally {
      setMyLeagueSaving("")
    }
  }

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
        const { data: activeSeries, error: seriesError } = await supabase
          .from("dko_series")
          .select("id")
          .eq("series_type", "lion_cup")
          .eq("is_active", true)
          .maybeSingle()

        if (seriesError) throw seriesError
        if (!activeSeries?.id) {
          setCupPrizePool(0)
          return
        }

        const { data, error } = await supabase
          .from("tournament_series_standings")
          .select("player_name,tournament_id")
          .eq("series_id", activeSeries.id)

        if (error) throw error

        const participants = new Set(
          (data || []).map((r: any) => String(r.player_name || "").trim()).filter(Boolean)
        )
        const appearances = new Set(
          (data || [])
            .filter((r: any) => r?.player_name && r?.tournament_id)
            .map((r: any) => `${String(r.player_name).trim()}:${String(r.tournament_id)}`)
        )

        const totalParticipants = participants.size
        const totalAppearances = appearances.size

        const prizePoolFromParticipants = totalParticipants * 5
        const prizePoolFromAppearances = totalAppearances * 4

        let hostSponsoring = 0
        if (totalAppearances >= 501) hostSponsoring = 250
        else if (totalAppearances >= 500) hostSponsoring = 100

        setCupPrizePool(prizePoolFromParticipants + prizePoolFromAppearances + hostSponsoring)
      } catch (error) {
        console.error("Error fetching cup data:", error)
        setCupPrizePool(0)
      }
    }

    fetchCupData()
  }, [])











useEffect(() => {
  const fetchSummerPrizePool = async () => {
    try {
      const { data, error } = await supabase
        .from("summer_special_total_standings")
        .select("tournaments_played")

      if (error) throw error

      const totalParticipants = data?.length || 0

      const totalAppearances =
        data?.reduce(
          (sum: number, player: any) =>
            sum + Number(player.tournaments_played || 0),
          0
        ) || 0

      const participationFees = totalParticipants * 10
      const tournamentFees = totalAppearances * 5

      const totalPrizePool =
        participationFees + tournamentFees

      setSummerPrizePool(totalPrizePool)
    } catch (e) {
      console.error("Error fetching Summer prize pool:", e)
      setSummerPrizePool(0)
    }
  }

  fetchSummerPrizePool()
}, [])

useEffect(() => {
  const fetchMembersPrizePool = async () => {
    try {
      const { data, error } = await supabase
        .from("members_cup_results")
        .select("round_robin_id, player_id")

      if (error) throw error

      // Pro Spieler und gespieltem Qualifikationsturnier fließen € 10,00
      // aus dem Startgeld in den Finalpreisfonds.
      const uniqueAppearances = new Set(
        (data || [])
          .filter((row: any) => row?.round_robin_id && row?.player_id)
          .map((row: any) => `${row.round_robin_id}:${row.player_id}`)
      )

      setMembersPrizePool(uniqueAppearances.size * 10)
    } catch (error) {
      console.error("Error fetching Members Champion prize pool:", error)
      setMembersPrizePool(0)
    }
  }

  fetchMembersPrizePool()
}, [])



















  useEffect(() => {
    const fetchEventsAndTournaments = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const [tournamentsRes, eventsRes, dachRes] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .eq("event_type", "tournament")
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),

          supabase
            .from("events")
            .select("*")
            .neq("event_type", "tournament")
            .not("name", "ilike", "%LION%")
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),

          supabase
            .from("dach_events")
            .select("id,internal_event_id,name,event_type,event_date,start_date,end_date,event_time,location,details,photo_url,entry_fee,startgeld_details,max_participants,mode,event_status")
            .eq("event_type", "tournament")
            .in("event_status", ["approved"])
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),
        ])

        if (tournamentsRes.error) console.error("Error fetching tournaments:", tournamentsRes.error)
        if (eventsRes.error) console.error("Error fetching events:", eventsRes.error)
        if (dachRes.error) console.error("Error fetching DACH tournaments:", dachRes.error)

        const tournamentsData = tournamentsRes.data || []
        const eventsData = eventsRes.data || []
        const dachData = dachRes.data || []

        const linkedInternalIds = new Set(
          dachData
            .map((event: any) => event.internal_event_id)
            .filter(Boolean)
            .map(String),
        )

        const combined: CombinedEvent[] = []

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
            sourceKind: "internal",
            internalEventId: tournament.id,
          })
        })

        dachData
          .filter((event: any) => !event.internal_event_id || !tournamentsData.some((t: any) => String(t.id) === String(event.internal_event_id)))
          .forEach((event: any) => {
            combined.push({
              id: event.id,
              name: event.name,
              date: event.start_date || event.event_date,
              start_date: event.start_date || event.event_date,
              end_date: event.end_date || event.event_date,
              time: event.event_time || "19:00",
              location: event.location || "Ort folgt",
              details: event.details ?? null,
              photo_url: event.photo_url,
              type: "tournament",
              entry_fee: event.entry_fee ?? null,
              startgeld_details: event.startgeld_details ?? null,
              max_participants: event.max_participants ?? null,
              mode: event.mode ?? null,
              sourceKind: "dach",
              internalEventId: event.internal_event_id ?? null,
            })
          })

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
            sourceKind: "internal",
            internalEventId: event.id,
          })
        })

        combined.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`)
          const dateB = new Date(`${b.date}T${b.time}`)
          return dateA.getTime() - dateB.getTime()
        })

        setCombinedEvents(combined.slice(0, 12))
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

        // Aktuelle Lion-Cup-Serie automatisch laden
        const { data: activeLionSeries, error: seriesErr } = await supabase
          .from("dko_series")
          .select("id,name,startgeld")
          .eq("series_type", "lion_cup")
          .eq("is_active", true)
          .maybeSingle()

        if (seriesErr) throw seriesErr

        if (!activeLionSeries?.id) {
          setNextEvent(null)
          setNextTournamentEvent(null)
          return
        }

        const LION_SERIES_ID = String(activeLionSeries.id)

        setSeriesStartgeldById((prev) => ({
          ...prev,
          [LION_SERIES_ID]: Number(activeLionSeries.startgeld ?? 0),
        }))

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
  
  
  
  
  
  useEffect(() => {
  const fetchSummerSpecialFromDb = async () => {
    try {
      setSummerSpecialLoading(true)

      const SUMMER_SPECIAL_SERIES_ID = "ff1badbe-0d2c-4bd2-a877-9f1009579599"

      const { data, error } = await supabase
        .from("dko_series_events")
        .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
        .eq("series_id", SUMMER_SPECIAL_SERIES_ID)
        .order("start_at", { ascending: true })

      if (error) throw error

      const summerEvents = ((data || []) as DkoSeriesEventRow[]).map((r) => {
        const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
        const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
        const effectiveDT = new Date(effectiveIso)

        return {
          id: r.id,
          series_id: r.series_id,
          title: r.title,
          is_matchday: !!r.is_matchday,
          cutoffMinutes: Number(r.registration_cutoff_minutes ?? 10) || 10,
          originalDT: new Date(r.start_at),
          effectiveDT,
          effectiveISODate: toISODate(effectiveDT),
          effectiveTimeHHMM: toHHMM(effectiveDT),
        }
      })

      const today0 = startOfDay(new Date()).getTime()

      const summerUpcoming = summerEvents
        .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
        .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

      const summerNextMatchday = summerUpcoming.find((e) => e.is_matchday) ?? null

      if (summerNextMatchday) {
        const allMatchdaysSorted = summerEvents
          .filter((e) => e.is_matchday)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        const idx = allMatchdaysSorted.findIndex((e) => e.id === summerNextMatchday.id)
        const matchday = idx >= 0 ? idx + 1 : 1

        setNextSummerTournamentEvent({
          id: summerNextMatchday.id,
          name: "EMD Summer Special | Steeldart",
          event_date: summerNextMatchday.effectiveISODate,
          event_time: summerNextMatchday.effectiveTimeHHMM,
          event_type: "Turnier",
          matchday,
          description: null,
        })
      } else {
        setNextSummerTournamentEvent(null)
      }
    } catch (error) {
      console.error("Error fetching Summer Special schedule from DB:", error)
      setNextSummerTournamentEvent(null)
    } finally {
      setSummerSpecialLoading(false)
    }
  }

  fetchSummerSpecialFromDb()
}, [])
  
  
  
  
  useEffect(() => {
  const fetchMembersChampionFromDb = async () => {
    try {
      setMembersChampionLoading(true)

      const MEMBERS_CHAMPION_SERIES_ID = "baeef5fb-b386-4a75-a1f3-c56090a0ec76"

      const { data, error } = await supabase
        .from("dko_series_events")
        .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
        .eq("series_id", MEMBERS_CHAMPION_SERIES_ID)
        .order("start_at", { ascending: true })

      if (error) throw error

      const events = ((data || []) as DkoSeriesEventRow[]).map((r) => {
        const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
        const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
        const effectiveDT = new Date(effectiveIso)

        return {
          id: r.id,
          series_id: r.series_id,
          title: r.title,
          is_matchday: !!r.is_matchday,
          cutoffMinutes: Number(r.registration_cutoff_minutes ?? 10) || 10,
          originalDT: new Date(r.start_at),
          effectiveDT,
          effectiveISODate: toISODate(effectiveDT),
          effectiveTimeHHMM: toHHMM(effectiveDT),
        }
      })

      const today0 = startOfDay(new Date()).getTime()

      const upcoming = events
        .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
        .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

      const nextMatchday = upcoming.find((e) => e.is_matchday) ?? null

      if (nextMatchday) {
        const allMatchdaysSorted = events
          .filter((e) => e.is_matchday)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        const idx = allMatchdaysSorted.findIndex((e) => e.id === nextMatchday.id)
        const matchday = idx >= 0 ? idx + 1 : 1

        setNextMembersChampionEvent({
          id: nextMatchday.id,
          name: "EMD Members Champions Cup",
          event_date: nextMatchday.effectiveISODate,
          event_time: nextMatchday.effectiveTimeHHMM,
          event_type: "Turnier",
          matchday,
          description: null,
        })
      } else {
        setNextMembersChampionEvent(null)
      }
    } catch (error) {
      console.error("Error fetching Members Champions Cup schedule from DB:", error)
      setNextMembersChampionEvent(null)
    } finally {
      setMembersChampionLoading(false)
    }
  }

  fetchMembersChampionFromDb()
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
  const summerSpecialNextDate = createEventDate(nextSummerTournamentEvent)
  const membersChampionNextDate = createEventDate(nextMembersChampionEvent)
  const isNextEventSpielfrei = nextEvent?.event_type?.toLowerCase() === "spielfrei"

  // --- Turniertag (Lion) Self-Registration Box ---
  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  
  
  const todaysEvents = useMemo(() => {
  return combinedEvents.filter((event) => {
    const start = event.start_date || event.date
    const end = event.end_date || event.date

    if (!start || !end) return false

    return todayISO >= start && todayISO <= end
  })
}, [combinedEvents, todayISO])

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
  
  // --- MEMBERS CHAMPIONS CUP Anmeldung oben auf Startseite ---
const liveMembersSelfRegEvent = useMemo(() => {
  const membersToday =
    nextMembersChampionEvent &&
    nextMembersChampionEvent.event_type?.toLowerCase() === "turnier" &&
    nextMembersChampionEvent.event_date === todayISO

  if (membersToday) {
    return {
      title: "Anmeldung geöffnet • MEMBERS CHAMPIONS CUP",
      isoDate: nextMembersChampionEvent!.event_date,
      time: nextMembersChampionEvent!.event_time || "19:30",
    }
  }

  return null
}, [nextMembersChampionEvent, todayISO])

const liveMembersRegCloseDT = liveMembersSelfRegEvent
  ? new Date(`${liveMembersSelfRegEvent.isoDate}T17:00:00`)
  : null


const liveMembersUnregCloseDT = liveMembersSelfRegEvent
  ? new Date(`${liveMembersSelfRegEvent.isoDate}T14:00:00`)
  : null

const liveMembersSecondsLeft = liveMembersRegCloseDT
  ? Math.ceil((liveMembersRegCloseDT.getTime() - nowTick) / 1000)
  : null

const liveMembersUnregSecondsLeft = liveMembersUnregCloseDT
  ? Math.ceil((liveMembersUnregCloseDT.getTime() - nowTick) / 1000)
  : null

const liveMembersRegOpen = liveMembersSelfRegEvent && (liveMembersSecondsLeft ?? 0) > 0
const liveMembersUnregOpen = liveMembersSelfRegEvent && (liveMembersUnregSecondsLeft ?? 0) > 0

const liveMembersDateLabel = liveMembersSelfRegEvent
  ? formatGermanShortDateFromISO(liveMembersSelfRegEvent.isoDate)
  : ""

const liveMembersTimeLabel = liveMembersSelfRegEvent
  ? ensureUhr(liveMembersSelfRegEvent.time)
  : ""
  
  // --- SUMMER SPECIAL Anmeldung oben auf Startseite ---
const liveSummerSelfRegEvent = useMemo(() => {
  const summerToday =
    nextSummerTournamentEvent &&
    nextSummerTournamentEvent.event_type?.toLowerCase() === "turnier" &&
    nextSummerTournamentEvent.event_date === todayISO

  if (summerToday) {
    return {
      title: "Anmeldung geöffnet • SUMMER SPECIAL",
      isoDate: nextSummerTournamentEvent!.event_date,
      time: nextSummerTournamentEvent!.event_time || "19:00",
    }
  }

  return null
}, [nextSummerTournamentEvent, todayISO])

const liveSummerStartDT = liveSummerSelfRegEvent
  ? getStartDateTimeFromISO(
      liveSummerSelfRegEvent.isoDate,
      liveSummerSelfRegEvent.time
    )
  : null

const liveSummerRegCloseDT = liveSummerStartDT
  ? new Date(liveSummerStartDT.getTime() - 10 * 60 * 1000)
  : null

const liveSummerSecondsLeft = liveSummerRegCloseDT
  ? Math.ceil((liveSummerRegCloseDT.getTime() - nowTick) / 1000)
  : null

const liveSummerRegOpen =
  liveSummerSelfRegEvent && (liveSummerSecondsLeft ?? 0) > 0

const liveSummerDateLabel = liveSummerSelfRegEvent
  ? formatGermanShortDateFromISO(liveSummerSelfRegEvent.isoDate)
  : ""

const liveSummerTimeLabel = liveSummerSelfRegEvent
  ? ensureUhr(liveSummerSelfRegEvent.time)
  : ""

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



const fetchMembersCupRegStatus = async () => {
  setMembersCupRegLoading(true)
  setMembersCupRegistered(false)

  try {
    if (!liveMembersSelfRegEvent) return
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

    const { data: reg, error: regErr } = await supabase
      .from("dko_tournament_registration")
      .select("id")
      .eq("player_id", pid)
      .limit(1)

    if (regErr) throw regErr

    setMembersCupRegistered((reg?.length ?? 0) > 0)
  } catch (e) {
    console.error("Members Cup registration status error:", e)
  } finally {
    setMembersCupRegLoading(false)
  }
}

useEffect(() => {
  fetchMembersCupRegStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [authUserId, liveMembersSelfRegEvent])

useEffect(() => {
  if (!authUserId || !liveMembersSelfRegEvent) return

  const channel = supabase
    .channel("members-cup-registration-realtime-home")
    .on("postgres_changes", { event: "*", schema: "public", table: "dko_tournament_registration" }, () => {
      fetchMembersCupRegStatus()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [authUserId, liveMembersSelfRegEvent])


useEffect(() => {
  const loadTodayBirthdays = async () => {
    try {
      setBirthdayLoading(true)

      const today = new Date()
      const todayMonth = String(today.getMonth() + 1).padStart(2, "0")
      const todayDay = String(today.getDate()).padStart(2, "0")

      const { data, error } = await supabase
        .from("club_players")
        .select("id, name, birthdate")
        .not("birthdate", "is", null)

      if (error) throw error

      const birthdays =
        (data || [])
          .filter((player: any) => {
            if (!player.birthdate || !player.name) return false

            const birthdate = String(player.birthdate).slice(0, 10)
            const parts = birthdate.split("-")

            if (parts.length !== 3) return false

            const month = parts[1]
            const day = parts[2]

            return month === todayMonth && day === todayDay
          })
          .map((player: any) => {
            const birthdate = String(player.birthdate).slice(0, 10)
            const birthYear = Number(birthdate.split("-")[0])
            const currentYear = today.getFullYear()

            return {
              id: String(player.id),
              name: String(player.name),
              birthdate,
              age: Number.isFinite(birthYear) ? currentYear - birthYear : null,
            }
          })
          .sort((a: BirthdayPlayer, b: BirthdayPlayer) => a.name.localeCompare(b.name, "de"))

      setBirthdayPlayers(birthdays)
    } catch (error) {
      console.error("Error loading birthdays:", error)
      setBirthdayPlayers([])
    } finally {
      setBirthdayLoading(false)
    }
  }

  loadTodayBirthdays()
}, [])

  

  const emdUpcomingEvents = combinedEvents
    .filter((item) => item.sourceKind === "internal")
    .slice(0, 2)

  const emdHomepageKeys = new Set(
    emdUpcomingEvents.map((item) => `${item.sourceKind}:${item.id}`),
  )

  const discoverTournaments = combinedEvents
    .filter((item) => item.type === "tournament")
    .filter((item) => !emdHomepageKeys.has(`${item.sourceKind}:${item.id}`))
    .slice(0, 2)

  const renderHomeEventCard = (item: CombinedEvent) => {

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

  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Abstand für fixed Header */}
<div className="h-12 sm:h-14" aria-hidden="true" />

<PushEnableBanner />

      <PushNotificationDialog />

      {/* WICHTIG: persönliche Ligaspiele ganz oben auf der Startseite */}
      <div className="container mx-auto px-4 pt-4 sm:pt-5">
        <div className="space-y-4">
          {/* ================= DEINE LIGASPIELE ================= */}
    {authUserId && hasLeaguePackage ? (
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
              <Swords className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                Liga
              </div>
              <h2 className="text-lg font-black leading-tight text-gray-950 sm:text-xl">
                Deine nächsten Spiele
              </h2>
            </div>
          </div>

          <Button
            variant="ghost"
            className="h-9 rounded-xl px-3 font-bold text-gray-600 hover:bg-white hover:text-orange-700"
            onClick={() => (window.location.href = "/member-availability")}
          >
            Alle
          </Button>
        </div>

        {myLeagueLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Deine Ligaspiele werden geladen...
            </div>
          </div>
        ) : myLeagueMatches.length === 0 ? (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-3 font-bold text-gray-800">
              Aktuell kein Ligaspiel geplant
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Sobald ein neues Spiel angesetzt ist, erscheint es hier.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myLeagueMatches.map((match) => {
              const dartType = String(match.dart_type || "").toLowerCase()
              const isSteel = dartType === "steeldart"

              return (
                <div
                  key={match.id}
                  className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        isSteel
                          ? "rounded-full border-slate-200 bg-slate-900 px-3 py-1 text-[11px] font-black tracking-wide text-white"
                          : "rounded-full border-orange-200 bg-orange-600 px-3 py-1 text-[11px] font-black tracking-wide text-white"
                      }
                    >
                      {isSteel ? "STEELDART" : "E-DART"}
                    </Badge>

                    <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                      <Calendar className="h-3.5 w-3.5 text-orange-600" />
                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {match.match_time ? ` · ${String(match.match_time).slice(0, 5)}` : ""}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-xl font-black leading-tight tracking-tight text-gray-950">
                      {getTeamName(match, true)}{" "}
                      <span className="font-semibold text-gray-400">vs</span>{" "}
                      {getTeamName(match, false)}
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 px-3.5 py-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Deine Antwort
                      </div>
                      <div className="mt-1">
                        {match.my_status === "yes" ? (
                          <Badge className="rounded-full bg-green-600 text-white">Zugesagt ✓</Badge>
                        ) : match.my_status === "maybe" ? (
                          <Badge className="rounded-full bg-yellow-600 text-white">Vielleicht</Badge>
                        ) : match.my_status === "no" ? (
                          <Badge className="rounded-full bg-red-600 text-white">Abgesagt</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-full border-amber-300 bg-amber-50 text-amber-800"
                          >
                            Noch keine Antwort
                          </Badge>
                        )}
                      </div>
                    </div>

                    {match.my_status === "none" ? (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-bold text-amber-900">
                        <Bell className="h-4 w-4 shrink-0" />
                        Bitte noch zu- oder absagen – wichtig für die Aufstellung.
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!!myLeagueSaving}
                        onClick={() => void setHomeLeagueAvailability(match, "yes")}
                        className="rounded-2xl bg-green-600 px-2 font-bold text-white hover:bg-green-700"
                      >
                        {myLeagueSaving === `${match.id}-yes` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Zusage"
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!!myLeagueSaving}
                        onClick={() => void setHomeLeagueAvailability(match, "maybe")}
                        className="rounded-2xl bg-yellow-600 px-2 font-bold text-white hover:bg-yellow-700"
                      >
                        {myLeagueSaving === `${match.id}-maybe` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Vielleicht"
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!!myLeagueSaving}
                        onClick={() => void setHomeLeagueAvailability(match, "no")}
                        className="rounded-2xl bg-red-600 px-2 font-bold text-white hover:bg-red-700"
                      >
                        {myLeagueSaving === `${match.id}-no` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Absage"
                        )}
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full rounded-2xl font-bold"
                      onClick={() =>
                        (window.location.href = `/member-availability?match_id=${match.id}&team_id=${match.my_team_id}`)
                      }
                    >
                      Details & Aufstellung
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    ) : null}

        </div>
      </div>
	  
	  
	  {todaysEvents.length > 0 && (
  <div className="mx-4 sm:mx-6 mt-3">
    <div className="rounded-2xl border border-blue-200 bg-white shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-500" />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-blue-700" />
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-700">
                Heute im Verein
              </div>

              <div className="text-lg sm:text-xl font-black text-gray-900">
                {todaysEvents.length === 1
                  ? todaysEvents[0].name
                  : `${todaysEvents.length} Veranstaltungen heute`}
              </div>

              <div className="mt-2 space-y-2">
                {todaysEvents.map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2"
                  >
                    <div className="text-sm font-black text-gray-900">
                      {event.name}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                        {ensureUhr(event.time)}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-700" />
                        {event.location}
                      </span>

                      {event.type === "tournament" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-orange-800 font-black">
                          Turnier
                        </span>
                      )}

                      {event.type === "event" && event.eventType && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-blue-200 px-2 py-0.5 text-blue-800 font-black">
                          {getEventTypeLabel(event.eventType)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
  type="button"
  className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm"
  onClick={() => {
    if (todaysEvents.length === 1) {
      window.location.href = todaysEvents[0].sourceKind === "dach" ? `/dach-veranstaltungen/${todaysEvents[0].id}` : `/veranstaltungen/${todaysEvents[0].internalEventId || todaysEvents[0].id}`
      return
    }

    window.location.href = "/turniere"
  }}
>
  Details ansehen
  <ArrowRight className="w-4 h-4 ml-2" />
</Button>
        </div>
      </div>
    </div>
  </div>
)}
	  
	  
	  {!birthdayLoading && birthdayPlayers.length > 0 && (
  <div className="mx-4 sm:mx-6 mt-3">
    <div className="rounded-2xl border border-pink-200 bg-white shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-pink-500 via-rose-400 to-orange-500" />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
              <PartyPopper className="w-6 h-6 text-pink-700" />
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wider text-pink-700">
                Geburtstag im Verein
              </div>

              <div className="text-lg sm:text-xl font-black text-gray-900">
                Heute feiern wir{" "}
                {birthdayPlayers.length === 1
                  ? birthdayPlayers[0].name
                  : `${birthdayPlayers.length} Vereinsmitglieder`}
                🎉
              </div>

              <div className="mt-1 text-sm font-semibold text-gray-600">
                {birthdayPlayers.length === 1 ? (
                  <>
                    Alles Gute zum Geburtstag,{" "}
                    <span className="font-black text-gray-900">{birthdayPlayers[0].name}</span>
                    {birthdayPlayers[0].age ? (
                      <> zum {birthdayPlayers[0].age}. Geburtstag</>
                    ) : null}
                    !
                  </>
                ) : (
                  <>
                    Alles Gute an{" "}
                    <span className="font-black text-gray-900">
                      {birthdayPlayers.map((p) => p.name).join(", ")}
                    </span>
                    !
                  </>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {birthdayPlayers.map((player) => (
                  <span
                    key={player.id}
                    className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-3 py-1 text-xs font-black text-pink-800"
                  >
                    🎂 {player.name}
                    {player.age ? ` • ${player.age}` : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center text-4xl">
            🎁
          </div>
        </div>
      </div>
    </div>
  </div>
)}
	  
	  
	  


{/* GASTZUGANG KOMPAKT */}
<div className="mx-4 sm:mx-6 mt-3">
  <div className="rounded-2xl border border-orange-200 bg-white shadow-md overflow-hidden">
    <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-orange-700" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-orange-700">
            Auch für Gäste
          </div>
          <div className="text-base sm:text-lg font-black text-gray-900">
            EMD VereinsApp kostenlos kennenlernen
          </div>
          <div className="text-sm font-semibold text-gray-600">
            Dartprofil, Turniere, Community und mehr.
          </div>
        </div>
      </div>

      <Button
        className="w-full sm:w-auto rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
        onClick={() => (window.location.href = "/gastzugang-info")}
      >
        Mehr erfahren
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </div>
</div>

{/* DARTBÖRSE KOMPAKT */}
<div className="mx-4 sm:mx-6 mt-3">
  <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
    <div className="h-1.5 bg-gradient-to-r from-slate-800 via-orange-500 to-slate-900" />

    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-orange-700" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-orange-700">
            Dartbörse DACH
          </div>
          <div className="text-base sm:text-lg font-black text-gray-900">
            Darts kaufen & verkaufen
          </div>
          <div className="text-sm font-semibold text-gray-600">
            Darts, Barrels, Boards & Zubehör aus Österreich, Deutschland und der Schweiz.
          </div>
        </div>
      </div>

      <Button
        className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-sm"
        onClick={() => (window.location.href = "/dartboerse")}
      >
        Zur Dartbörse
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </div>
</div>

{/* DACH TURNIERE KOMPAKT */}
<div className="mx-4 sm:mx-6 mt-3">
  <div className="rounded-2xl border border-orange-200 bg-white shadow-md overflow-hidden">
    <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-orange-700" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-orange-700">
            DACH Turniere
          </div>
          <div className="text-base sm:text-lg font-black text-gray-900">
            Dart-Turniere entdecken
          </div>
          <div className="text-sm font-semibold text-gray-600">
            Turniere aus Österreich, Deutschland und der Schweiz finden und eintragen.
          </div>
        </div>
      </div>

      <Button
        className="w-full sm:w-auto rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
        onClick={() => (window.location.href = "/turniere")}
      >
        Zu den Turnieren
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </div>
</div>

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
                onClick={() => (window.location.href = "/lion-cup/anmeldung")}
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



	  
	  
	  
	{liveMembersSelfRegEvent && (
  <div className="sticky top-12 sm:top-14 z-40">
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        <div
          className={`h-1.5 ${
            membersCupRegistered
              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"
              : "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"
          }`}
        />

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative flex-shrink-0 mt-0.5">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                    membersCupRegistered
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <UserPlus
                    className={`w-5 h-5 ${
                      membersCupRegistered ? "text-emerald-700" : "text-orange-700"
                    }`}
                  />
                </div>

                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white animate-pulse ${
                    liveMembersRegOpen ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    MEMBERS CUP
                  </span>

                  <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-800 border border-gray-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    TURNIERTAG
                  </span>

                  {membersCupRegistered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Angemeldet
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm sm:text-base font-black text-gray-900 truncate">
                  {liveMembersSelfRegEvent.title}
                </div>

                <div className="mt-0.5 text-[11px] sm:text-xs text-gray-600 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    {liveMembersDateLabel}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    {liveMembersTimeLabel}
                  </span>
                </div>

                <div className="mt-2 text-[11px] sm:text-xs text-gray-700 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-gray-400" />

                  {liveMembersRegOpen ? (
  <span className="font-bold">
    Anmeldung noch: {formatHoursMinutesSeconds(liveMembersSecondsLeft ?? 0)}
    <span className="font-semibold text-gray-500">
      {" "}
      (schließt um 17:00 Uhr)
    </span>
  </span>
) : (
  <span className="font-bold">
    Anmeldung geschlossen{" "}
    <span className="font-semibold text-gray-500">
      (17:00 Uhr)
    </span>
  </span>
)}
                </div>

                {liveMembersUnregOpen ? (
                  <div className="mt-1 text-[11px] sm:text-xs text-red-700 font-bold">
                    Abmeldung möglich bis 14:00 Uhr.
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] sm:text-xs text-red-700 font-bold">
                    Abmeldung geschlossen.
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                size="sm"
                disabled={!liveMembersRegOpen}
                className={`rounded-xl font-black shadow-sm px-3 sm:px-4 disabled:opacity-60 disabled:cursor-not-allowed ${
                  membersCupRegistered
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
                onClick={() => (window.location.href = "/member-cup-anmeldung")}
              >
                {membersCupRegLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ...
                  </span>
                ) : membersCupRegistered ? (
                  <>
                    <span className="hidden sm:inline">Anmeldung verwalten</span>
                    <span className="sm:hidden">Verwalten</span>
                  </>
                ) : liveMembersRegOpen ? (
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
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  {liveSummerSelfRegEvent && (
  <div className="sticky top-12 sm:top-14 z-40">
    <div className="mx-4 sm:mx-6 mt-3">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        <div
          className={`h-1.5 ${
            liveSummerRegOpen
              ? "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"
              : "bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300"
          }`}
        />

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative flex-shrink-0 mt-0.5">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                    liveSummerRegOpen
                      ? "bg-orange-50 border-orange-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <UserPlus
                    className={`w-5 h-5 ${
                      liveSummerRegOpen ? "text-orange-700" : "text-gray-500"
                    }`}
                  />
                </div>

                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white animate-pulse ${
                    liveSummerRegOpen ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    SUMMER SPECIAL
                  </span>

                  <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-800 border border-gray-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    TURNIERTAG
                  </span>
                </div>

                <div className="mt-1 text-sm sm:text-base font-black text-gray-900 truncate">
                  {liveSummerSelfRegEvent.title}
                </div>

                <div className="mt-0.5 text-[11px] sm:text-xs text-gray-600 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    {liveSummerDateLabel}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    {liveSummerTimeLabel}
                  </span>
                </div>

                <div className="mt-2 text-[11px] sm:text-xs text-gray-700 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-gray-400" />

                  {liveSummerRegOpen ? (
                    <span className="font-bold">
                      An- und Abmeldung noch:{" "}
                      {formatHoursMinutesSeconds(liveSummerSecondsLeft ?? 0)}
                      <span className="font-semibold text-gray-500">
                        {" "}
                        (schließt 10 Min vor Start)
                      </span>
                    </span>
                  ) : (
                    <span className="font-bold">
                      An- und Abmeldung geschlossen{" "}
                      <span className="font-semibold text-gray-500">
                        (10 Min vor Start)
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                size="sm"
                disabled={!liveSummerRegOpen}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm px-3 sm:px-4 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => (window.location.href = "/summer-special/anmeldung")}
              >
                {liveSummerRegOpen ? (
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
		
		
		
	




		
{/* SUMMER SPECIAL CARD */}
<div className="overflow-hidden rounded-2xl shadow-2xl lg:col-span-2 border border-gray-200 bg-white">
  <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white">
    <div className="absolute inset-0 opacity-10" />

    <div className="relative p-4 sm:p-6 lg:p-10">
      <div className="w-full mx-auto flex flex-col">
        <div className="flex items-center justify-center mb-5 sm:mb-7">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center">
            <Image src="/images/logo4.png" alt="EMD Summer Special" width={90} height={90} className="object-contain p-2" />
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-950 px-3 py-1.5 rounded-full font-black text-xs mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>STEELDART SERIE 2026</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2">EMD Summer Special</h1>
          <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">Steeldart Tournament Competition Cup K26</p>

          <div className="min-h-[40px] flex items-center justify-center mb-2">
            {nextSummerTournamentEvent?.matchday ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <div className="flex items-center gap-2 text-xs">
                  <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="text-orange-100">Spieltag {nextSummerTournamentEvent.matchday}</span>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">Nächstes Turnier</p>

          <p className="text-sm lg:text-base text-orange-200">
            {nextSummerTournamentEvent
              ? `${new Date(summerSpecialNextDate).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })} • ${nextSummerTournamentEvent.event_time || "19:00"} Uhr`
              : summerSpecialLoading
                ? "Lade Termin..."
                : "Noch kein Termin eingetragen"}
          </p>
        </div>

        <div className="mt-5 sm:mt-7 flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 sm:px-6 lg:px-10 py-3 sm:py-4 border border-white/20">
            <CountdownTimer targetDate={summerSpecialNextDate} />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="p-4 sm:p-6 lg:p-8">
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-orange-600" />
        <span className="text-gray-900 text-xs sm:text-sm font-black uppercase tracking-wider">Preisgeld</span>
      </div>

      <div className="text-center rounded-2xl bg-white border border-orange-200 p-4 sm:p-5">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-1">
          €{summerPrizePool.toFixed(2)}
        </div>
        <p className="text-gray-600 text-xs sm:text-sm">Wächst mit jedem Teilnehmer und jeder Teilnahme</p>
      </div>
    </div>

    <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        size="lg"
        className="bg-orange-600 hover:bg-orange-700 text-white font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-xl w-full sm:w-auto"
        onClick={() => (window.location.href = "/summer-special")}
      >
        Zur Gesamtwertung
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
        onClick={() => (window.location.href = "/steeldart-competition-regelwerk")}
      >
        Regelwerk
      </Button>

     <Button
  size="lg"
  variant="outline"
  className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
  onClick={() => (window.location.href = "/summer-special/anmeldung")}
>
  Zur Anmeldung
  <ArrowRight className="w-4 h-4 ml-2" />
</Button>
    </div>
  </div>
</div>
		






















	
		
		
		
		
		
{/* MEMBERS CHAMPIONS CUP CARD */}
<div className="overflow-hidden rounded-2xl shadow-2xl lg:col-span-2 border border-gray-200 bg-white">
  <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white">
    <div className="absolute inset-0 opacity-10" />

    <div className="relative p-4 sm:p-6 lg:p-10">
      <div className="w-full mx-auto flex flex-col">
        <div className="flex items-center justify-center mb-5 sm:mb-7">
          <div className="w-32 h-32 sm:w-44 sm:h-44 lg:w-56 lg:h-56 flex items-center justify-center">
            <Image
              src="/images/logo5.png"
              alt="EMD Members Champions Cup"
              width={280}
              height={280}
              className="object-contain"
            />
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-950 px-3 py-1.5 rounded-full font-black text-xs mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>MEMBERS CHAMPIONS CUP 2026/27</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2">
            EMD Members Champions Cup
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">
            Offizielle Vereinsserie 2026/27
          </p>

          <div className="min-h-[40px] flex items-center justify-center mb-2">
            {nextMembersChampionEvent?.matchday ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <div className="flex items-center gap-2 text-xs">
                  <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="text-orange-100">
                    Spieltag {nextMembersChampionEvent.matchday}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-1">
            Nächstes Turnier
          </p>

          <p className="text-sm lg:text-base text-orange-200">
            {nextMembersChampionEvent
              ? `${new Date(membersChampionNextDate).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })} • ${nextMembersChampionEvent.event_time || "19:00"} Uhr`
              : membersChampionLoading
                ? "Lade Termin..."
                : "Noch kein Termin eingetragen"}
          </p>
        </div>

        <div className="mt-5 sm:mt-7 flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 sm:px-6 lg:px-10 py-3 sm:py-4 border border-white/20">
            <CountdownTimer targetDate={membersChampionNextDate} />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="p-4 sm:p-6 lg:p-8">
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-orange-600" />
        <span className="text-gray-900 text-xs sm:text-sm font-black uppercase tracking-wider">
          Finalpreisfonds
        </span>
      </div>

      <div className="rounded-2xl bg-white border border-orange-200 p-4 sm:p-5">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900">
            €{membersPrizePool.toFixed(2)}
          </div>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-600">
            Aktueller Finalpreisfonds
          </p>
        </div>

        <div className="mt-5 border-t border-orange-100 pt-4">
          <p className="text-center text-sm font-bold text-gray-700">
            Startgeld: <span className="font-black text-orange-700">€ 15,00</span> pro Spieler und Turniertag
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-orange-700">€ 10,00</div>
              <div className="mt-1 text-[11px] sm:text-xs font-bold text-gray-600">
                fließen in den Finalpreisfonds
              </div>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-yellow-700">€ 5,00</div>
              <div className="mt-1 text-[11px] sm:text-xs font-bold text-gray-600">
                werden am jeweiligen Turniertag ausgeschüttet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        size="lg"
        className="bg-orange-600 hover:bg-orange-700 text-white font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-xl w-full sm:w-auto"
        onClick={() => (window.location.href = "/members-champion-cup-tabelle")}
      >
        Zur Gesamtwertung
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
        onClick={() => (window.location.href = "/emd-champions-cup-regelwerk")}
      >
        Regelwerk
      </Button>
	  
	  <Button
  size="lg"
  variant="outline"
  className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
  onClick={() => (window.location.href = "/member-cup-einstufung")}
>
  Einstufung
</Button>

      <Button
  size="lg"
  variant="outline"
  className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
  onClick={() => (window.location.href = "/member-cup-anmeldung")}
>
  Anmelden
</Button>
    </div>
  </div>
</div>
		
		
		
		
		
		
		
		
		

		
		
		
		
		
		
		
		
		
		
		
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
              <span>LION CUP PART 3 • HERBST 2026</span>
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
      <div className="grid grid-cols-1 gap-4 lg:gap-6">
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
          onClick={() => (window.location.href = "/lion-cup")}
        >
          Zur Gesamtwertung
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
          onClick={() => (window.location.href = "/lion-cup/regelwerk")}
        >
          Regelwerk
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-sm sm:text-base px-4 sm:px-6 py-4 sm:py-5 shadow-sm w-full sm:w-auto"
          onClick={() => (window.location.href = "/lion-cup/anmeldung")}
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

    {/* ================= DEMNÄCHST BEI EMD ================= */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900">Demnächst bei EMD</h2>
          <p className="text-xs sm:text-sm text-gray-500">Turniere, Spielabende, Partys & Vereinsveranstaltungen</p>
        </div>

        <Button
          variant="ghost"
          className="h-9 px-3 text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-bold"
          onClick={() => (window.location.href = "/veranstaltungen")}
        >
          Alle
        </Button>
      </div>

      {emdUpcomingEvents.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <Info className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-semibold">Derzeit sind keine EMD-Veranstaltungen geplant.</p>
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 sm:gap-6">
            {emdUpcomingEvents.map((item) => renderHomeEventCard(item))}
          </div>
        </div>
      )}
    </section>

    {/* ================= DART-TURNIERE ENTDECKEN ================= */}
    <section className="mt-7 sm:mt-9">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-gray-900">Dart-Turniere entdecken</h2>
            <span className="hidden sm:inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
              DACH
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">Österreich, Deutschland & Schweiz</p>
        </div>

        <Button
          variant="ghost"
          className="h-9 px-3 text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-bold"
          onClick={() => (window.location.href = "/turniere")}
        >
          Alle Turniere
        </Button>
      </div>

      {discoverTournaments.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-semibold">Derzeit sind keine weiteren DACH-Turniere verfügbar.</p>
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 sm:gap-6">
            {discoverTournaments.map((item) => renderHomeEventCard(item))}
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

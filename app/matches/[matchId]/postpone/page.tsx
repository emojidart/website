"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  CalendarClock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Home,
  Bus,
  ListChecks,
  PartyPopper,
  Palmtree,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type Opp = { id: string; name: string }

type MatchLite = {
  id: string
  match_date: string
  match_time: string | null
  venue: string
  week_number: number
  status: string
  original_date: string | null
  postponement_reason: string | null

  home_team_id: string
  away_team_id: string

  home_team_type: "own" | "opponent" | "club_team"
  away_team_type: "own" | "opponent" | "club_team"

  home_team: { id: string; name: string } | null
  away_team: { id: string; name: string } | null

  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_opponent_team: { id: string; name: string } | null
  away_opponent_team: { id: string; name: string } | null
}

type EventLite = {
  id: string
  name: string
  event_type: string | null
  event_date: string
  event_time: string | null
  source: "internal" | "external" | string
}

type VacationLite = {
  id: string
  user_name: string
  start_date: string
  end_date: string
  note: string | null
  created_at: string | null
  user_id: string
}

type TeamMemberLite = {
  id: string
  team_id: string
  player_id: string
  left_at: string | null
}

type ClubPlayerLite = {
  id: string
  user_id: string | null
}

type LionCupEventLite = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  location: string | null
  is_matchday: boolean | null
  registration_cutoff_minutes: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  rescheduled_at: string | null
  is_rescheduled: boolean | null
  reschedule_reason: string | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

function formatMatchDate(dateString: string) {
  const d = new Date(dateString)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function hhmm(timeString: string | null) {
  if (!timeString) return ""
  const parts = timeString.split(":")
  return `${parts[0]}:${parts[1]}`
}

function hhmmFromTimestamp(ts: string | null) {
  if (!ts) return ""
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function dayRangeISO(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`).toISOString()
  const end = new Date(`${dateStr}T23:59:59.999Z`).toISOString()
  return { start, end }
}

export default function MatchPostponePage() {
  const router = useRouter()
  const params = useParams<{ matchId: string }>()
  const search = useSearchParams()

  const { session, loading: authLoading } = useAuth()

  const matchId = params?.matchId
  const backHref = search.get("back") || "/member-profile-app"
  const backLabel = search.get("backLabel") || "Zurück"

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [match, setMatch] = useState<MatchLite | null>(null)
  const [opponents, setOpponents] = useState<Opp[]>([])

  const [postponeData, setPostponeData] = useState({
    newDate: "",
    newTime: "",
    reason: "",
  })

  // Planung: Spiele + Events + Urlaube + Lion Cup am Tag
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)
  const [dayMatches, setDayMatches] = useState<MatchLite[]>([])
  const [dayEvents, setDayEvents] = useState<EventLite[]>([])
  const [dayVacations, setDayVacations] = useState<VacationLite[]>([])
  const [dayLionCup, setDayLionCup] = useState<LionCupEventLite[]>([])

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, session, router])

  const getTeamDisplayName = (m: MatchLite | null, isHome: boolean) => {
    if (!m) return "Unbekannt"
    if (isHome) {
      if (m.home_team_type === "own" && m.home_team) return m.home_team.name
      if (m.home_team_type === "opponent" && m.home_opponent_team) return m.home_opponent_team.name
      return m.home_team?.name ?? m.home_opponent_team?.name ?? "Unbekannt"
    } else {
      if (m.away_team_type === "own" && m.away_team) return m.away_team.name
      if (m.away_team_type === "opponent" && m.away_opponent_team) return m.away_opponent_team.name
      return m.away_team?.name ?? m.away_opponent_team?.name ?? "Unbekannt"
    }
  }

  const enrichWithOpponentNames = (m: any, opps: Opp[]): MatchLite => {
    const homeOpp = m?.home_opponent_team_id ? opps.find((o) => o.id === m.home_opponent_team_id) : null
    const awayOpp = m?.away_opponent_team_id ? opps.find((o) => o.id === m.away_opponent_team_id) : null
    return {
      ...m,
      home_opponent_team: homeOpp,
      away_opponent_team: awayOpp,
    }
  }

  const canEdit = useMemo(() => {
    if (!match) return false
    // TODO: echte Rollenprüfung (Captain/Co-Captain)
    return true
  }, [match])

  const relevantOwnTeamIds = useMemo(() => {
    if (!match) return []
    const ids: string[] = []
    if (match.home_team_type === "own" && match.home_team_id) ids.push(match.home_team_id)
    if (match.away_team_type === "own" && match.away_team_id) ids.push(match.away_team_id)
    return Array.from(new Set(ids))
  }, [match])

  // LOAD: Match + Opponents
  useEffect(() => {
    if (!session?.user || !matchId) return

    ;(async () => {
      setLoading(true)
      setError(null)
      setOk(false)

      try {
        const [matchRes, oppRes] = await Promise.all([
          supabase
            .from("matches")
            .select(
              `
              id,
              match_date,
              match_time,
              venue,
              week_number,
              status,
              original_date,
              postponement_reason,

              home_team_id,
              away_team_id,

              home_team_type,
              away_team_type,

              home_opponent_team_id,
              away_opponent_team_id,

              home_team:teams!matches_home_team_id_fkey(id,name),
              away_team:teams!matches_away_team_id_fkey(id,name)
            `,
            )
            .eq("id", matchId)
            .maybeSingle(),
          supabase.from("opponent_teams").select("id,name"),
        ])

        if (matchRes.error) throw matchRes.error
        if (oppRes.error) throw oppRes.error

        const opps = (oppRes.data || []) as Opp[]
        setOpponents(opps)

        const m = matchRes.data as any
        const enriched: MatchLite | null = m ? enrichWithOpponentNames(m, opps) : null
        setMatch(enriched)

        // Prefill form
        if (enriched) {
          setPostponeData({
            newDate: enriched.match_date || "",
            newTime: hhmm(enriched.match_time) || "",
            reason: enriched.postponement_reason || "",
          })
        }
      } catch (e: any) {
        setError(e?.message ?? "Fehler beim Laden des Spiels.")
      } finally {
        setLoading(false)
      }
    })()
  }, [session?.user?.id, matchId])

  // LOAD: Matches + Events + Vacations + Lion Cup for selected day
  useEffect(() => {
    if (!session?.user) return
    if (!postponeData.newDate) {
      setDayMatches([])
      setDayEvents([])
      setDayVacations([])
      setDayLionCup([])
      setDayError(null)
      return
    }

    ;(async () => {
      setDayLoading(true)
      setDayError(null)

      try {
        const { start, end } = dayRangeISO(postponeData.newDate)

        const [matchesRes, eventsRes, teamMembersRes, lionCupRes] = await Promise.all([
          supabase
            .from("matches")
            .select(
              `
              id,
              match_date,
              match_time,
              venue,
              week_number,
              status,
              original_date,
              postponement_reason,

              home_team_id,
              away_team_id,

              home_team_type,
              away_team_type,

              home_opponent_team_id,
              away_opponent_team_id,

              home_team:teams!matches_home_team_id_fkey(id,name),
              away_team:teams!matches_away_team_id_fkey(id,name)
            `,
            )
            .eq("match_date", postponeData.newDate),
          supabase
            .from("events")
            .select("id,name,event_type,event_date,event_time,source")
            .eq("event_date", postponeData.newDate)
            .eq("source", "internal"),
          relevantOwnTeamIds.length > 0
            ? supabase.from("team_members").select("id,team_id,player_id,left_at").in("team_id", relevantOwnTeamIds).is("left_at", null)
            : Promise.resolve({ data: [], error: null } as any),
          // Lion Cup: zeige verschobene Termine korrekt (wenn rescheduled_at gesetzt, zählt der neue Zeitpunkt)
          supabase
            .from("dko_series_events")
            .select(
              "id,series_id,title,start_at,location,is_matchday,registration_cutoff_minutes,notes,created_at,updated_at,rescheduled_at,is_rescheduled,reschedule_reason",
            )
            .or(`start_at.gte.${start},start_at.lte.${end},rescheduled_at.gte.${start},rescheduled_at.lte.${end}`),
        ])

        if (matchesRes.error) throw matchesRes.error
        if (eventsRes.error) throw eventsRes.error
        if (teamMembersRes.error) throw teamMembersRes.error
        if (lionCupRes.error) throw lionCupRes.error

        const rows = (matchesRes.data || []).map((m: any) => enrichWithOpponentNames(m, opponents))
        setDayMatches(rows as MatchLite[])
        setDayEvents((eventsRes.data || []) as EventLite[])

        // Nur Urlaube der Spieler aus dem (eigenen) Team anzeigen
        const members = (teamMembersRes.data || []) as TeamMemberLite[]
        const playerIds = Array.from(new Set(members.map((x) => x.player_id).filter(Boolean)))

        if (playerIds.length === 0) {
          setDayVacations([])
        } else {
          const clubPlayersRes = await supabase.from("club_players").select("id,user_id").in("id", playerIds)
          if (clubPlayersRes.error) throw clubPlayersRes.error

          const userIds = Array.from(
            new Set(
              ((clubPlayersRes.data || []) as ClubPlayerLite[])
                .map((p) => p.user_id)
                .filter((x): x is string => Boolean(x)),
            ),
          )

          if (userIds.length === 0) {
            setDayVacations([])
          } else {
            const vacationsRes = await supabase
              .from("vacations")
              .select("id,user_name,start_date,end_date,note,created_at,user_id")
              .in("user_id", userIds)
              .lte("start_date", postponeData.newDate)
              .gte("end_date", postponeData.newDate)

            if (vacationsRes.error) throw vacationsRes.error
            setDayVacations((vacationsRes.data || []) as VacationLite[])
          }
        }

        // Lion Cup Events (für Anzeige den "effektiven" Termin nutzen)
        const lion = (lionCupRes.data || []) as LionCupEventLite[]
        setDayLionCup(lion)
      } catch (e: any) {
        setDayError(e?.message ?? "Fehler beim Laden (Spiele/Events/Urlaube/Lion Cup).")
        setDayMatches([])
        setDayEvents([])
        setDayVacations([])
        setDayLionCup([])
      } finally {
        setDayLoading(false)
      }
    })()
  }, [session?.user?.id, postponeData.newDate, opponents, relevantOwnTeamIds])

  const disabled = useMemo(() => {
    if (!postponeData.newDate) return true
    if (!postponeData.newTime) return true
    if (!postponeData.reason.trim() || postponeData.reason.trim().length < 3) return true
    if (submitting) return true
    return false
  }, [postponeData, submitting])

  const isHomeGame = useMemo(() => {
    if (!match) return false
    return match.home_team_type === "own"
  }, [match])

  const isAwayGame = useMemo(() => {
    if (!match) return false
    return match.away_team_type === "own"
  }, [match])

  const homeGamesThatDay = useMemo(() => {
    return dayMatches.filter((m) => m.home_team_type === "own")
  }, [dayMatches])

  const homeGamesCount = homeGamesThatDay.length
  const internalEventsCount = dayEvents.length
  const vacationsCount = dayVacations.length

  const lionCupEffectiveForDay = useMemo(() => {
    if (!postponeData.newDate) return []
    const { start, end } = dayRangeISO(postponeData.newDate)
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()

    return dayLionCup
      .map((e) => {
        const effectiveAt = e.is_rescheduled && e.rescheduled_at ? e.rescheduled_at : e.start_at
        return { ...e, effectiveAt }
      })
      .filter((e: any) => {
        const ms = new Date(e.effectiveAt).getTime()
        return ms >= startMs && ms <= endMs
      })
  }, [dayLionCup, postponeData.newDate])

  const lionCupCount = lionCupEffectiveForDay.length

  async function postponeMatch() {
    if (!matchId) return
    if (!match) return
    setSubmitting(true)
    setError(null)
    setOk(false)

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "postponed",
          original_date: match.original_date || match.match_date || null,
          match_date: postponeData.newDate,
          match_time: postponeData.newTime, // falls DB HH:MM:SS braucht: `${postponeData.newTime}:00`
          postponement_reason: postponeData.reason.trim(),
        })
        .eq("id", matchId)

      if (error) throw error
      setOk(true)
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Verschieben.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
        <Header />
        <main className="pt-12 sm:pt-14">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
              <span className="text-base font-medium text-gray-700">Lade…</span>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const homeName = getTeamDisplayName(match, true)
  const awayName = getTeamDisplayName(match, false)
  const oldDate = match?.original_date
    ? formatMatchDate(match.original_date)
    : match?.match_date
      ? formatMatchDate(match.match_date)
      : ""
  const oldTime = hhmm(match?.match_time)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top Card */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Spiel verschieben</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {homeName} <span className="text-gray-400">vs</span> {awayName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Aktuell: <span className="font-semibold text-gray-800">{oldDate}</span>
                    {oldTime ? <span className="text-gray-500"> · {oldTime} Uhr</span> : null}
                  </p>

                  {/* Heim/Auswärts Badge */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isHomeGame ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black border border-green-200 bg-green-50 text-green-800">
                        <Home className="h-3.5 w-3.5" />
                        Heimspiel
                      </span>
                    ) : null}
                    {isAwayGame ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black border border-blue-200 bg-blue-50 text-blue-800">
                        <Bus className="h-3.5 w-3.5" />
                        Auswärtsspiel
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Back Button */}
          <motion.div variants={itemVariants} className="mb-4">
            <Button
              variant="outline"
              onClick={() => router.push(backHref)}
              className="w-full h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
          </motion.div>

          {/* Hinweis */}
          <motion.div variants={itemVariants} className="mb-5">
            <Alert className="rounded-2xl border-orange-200 bg-orange-50/70">
              <ShieldAlert className="h-4 w-4 text-orange-700" />
              <AlertTitle className="text-orange-900 font-black">Hinweis</AlertTitle>
              <AlertDescription className="text-orange-900/80">
                Bitte trage einen echten Grund ein (z.B. „2 Spieler krank“).
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Planung / Heimspiele + interne Events + Urlaube + Lion Cup */}
          <motion.div variants={itemVariants} className="mb-5">
            <Alert className="rounded-2xl border-gray-200 bg-white">
              <ListChecks className="h-4 w-4 text-gray-800" />
              <AlertTitle className="text-gray-900 font-black">
                Planung am {postponeData.newDate ? formatMatchDate(postponeData.newDate) : "…"}
              </AlertTitle>

              <AlertDescription className="text-gray-700">
                {dayLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lade Spiele/Events am Tag…
                  </span>
                ) : dayError ? (
                  <span className="text-orange-700">{dayError}</span>
                ) : (
                  <>
                    {/* Heimspiele Summary */}
                    <div className="mt-1">
                      <span className="font-bold">{homeGamesCount}</span>{" "}
                      {homeGamesCount === 1 ? "Heimspiel" : "Heimspiele"} an diesem Tag.
                      {isAwayGame ? (
                        <span className="block mt-1 text-blue-800">
                          Dieses Spiel ist <span className="font-bold">auswärts</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Heimspiele Liste */}
                    {homeGamesThatDay.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {homeGamesThatDay
                          .slice()
                          .sort((a, b) => (a.match_time || "").localeCompare(b.match_time || ""))
                          .map((m) => {
                            const h = getTeamDisplayName(m, true)
                            const a = getTeamDisplayName(m, false)
                            const t = hhmm(m.match_time) || "—"
                            const isThis = m.id === matchId
                            return (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                                  isThis ? "border-orange-200 bg-orange-50/60" : "border-gray-200 bg-gray-50/50",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-gray-900 truncate">
                                    {h} <span className="text-gray-400">vs</span> {a}
                                    {isThis ? (
                                      <span className="ml-2 text-xs font-black text-orange-700">(dieses Spiel)</span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">{m.venue || "—"}</div>
                                </div>
                                <div className="ml-3 font-black text-gray-900 tabular-nums">{t}</div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-600">Keine Heimspiele an diesem Datum gefunden.</div>
                    )}

                    {/* Interne Events Summary */}
                    <div className="mt-4 flex items-center gap-2">
                      <PartyPopper className="h-4 w-4 text-gray-800" />
                      <div>
                        <span className="font-bold">{internalEventsCount}</span>{" "}
                        {internalEventsCount === 1 ? "internes Event" : "Events"} an diesem Tag.
                      </div>
                    </div>

                    {/* Interne Events Liste */}
                    {dayEvents.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {dayEvents
                          .slice()
                          .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))
                          .map((ev) => {
                            const t = hhmm(ev.event_time) || "—"
                            return (
                              <div
                                key={ev.id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-gray-900 truncate">{ev.name}</div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {ev.event_type ? ev.event_type : "event"}
                                  </div>
                                </div>
                                <div className="ml-3 font-black text-gray-900 tabular-nums">{t}</div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-600"></div>
                    )}

                    {/* Urlaube Summary */}
                    <div className="mt-4 flex items-center gap-2">
                      <Palmtree className="h-4 w-4 text-gray-800" />
                      <div>
                        <span className="font-bold">{vacationsCount}</span>{" "}
                        {vacationsCount === 1 ? "Urlaub" : "Urlaube"} an diesem Tag.
                      </div>
                    </div>

                    {/* Urlaube Liste */}
                    {dayVacations.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {dayVacations
                          .slice()
                          .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""))
                          .map((v) => {
                            const range =
                              v.start_date === v.end_date
                                ? formatMatchDate(v.start_date)
                                : `${formatMatchDate(v.start_date)} – ${formatMatchDate(v.end_date)}`
                            return (
                              <div
                                key={v.id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-gray-900 truncate">{v.user_name}</div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {range}
                                    {v.note ? <span className="text-gray-500"> · {v.note}</span> : null}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-600"></div>
                    )}

                    {/* Lion Cup Summary */}
                    <div className="mt-4 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gray-800" />
                      <div>
                        <span className="font-bold">{lionCupCount}</span>{" "}
                        {lionCupCount === 1 ? "Lion Cup Termin" : "Lion Cup Termine"} an diesem Tag.
                      </div>
                    </div>

                    {/* Lion Cup Liste */}
                    {lionCupEffectiveForDay.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {lionCupEffectiveForDay
                          .slice()
                          .sort((a: any, b: any) => (a.effectiveAt || "").localeCompare(b.effectiveAt || ""))
                          .map((ev: any) => {
                            const t = hhmmFromTimestamp(ev.effectiveAt) || "—"
                            const title = ev.title || "Lion Cup"
                            const showRescheduled = Boolean(ev.is_rescheduled && ev.rescheduled_at)
                            return (
                              <div
                                key={ev.id}
                                className={cn(
                                  "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                                  showRescheduled ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-gray-50/50",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-gray-900 truncate">
                                    {title}
                                    {showRescheduled ? (
                                      <span className="ml-2 text-xs font-black text-orange-700">(verschoben)</span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {ev.location ? ev.location : "—"}
                                    {showRescheduled && ev.reschedule_reason ? (
                                      <span className="text-gray-500"> · {ev.reschedule_reason}</span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="ml-3 font-black text-gray-900 tabular-nums">{t}</div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-600"></div>
                    )}
                  </>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Form Card */}
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Neuer Termin
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {error ? (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-black">Fehler</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                {ok ? (
                  <Alert className="rounded-2xl border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                    <AlertTitle className="text-green-900 font-black">Gespeichert</AlertTitle>
                    <AlertDescription className="text-green-900/80">
                      Das Spiel wurde verschoben. Du kannst jetzt zurück zum Dashboard.
                    </AlertDescription>

                    <div className="mt-3">
                      <Button
                        onClick={() => router.push(backHref)}
                        className="h-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                      >
                        Zurück
                      </Button>
                    </div>
                  </Alert>
                ) : null}

                {/* Datum / Zeit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="newDate" className="text-sm font-bold">
                      Neues Datum <span className="text-orange-700">*</span>
                    </Label>
                    <Input
                      id="newDate"
                      type="date"
                      value={postponeData.newDate}
                      onChange={(e) => setPostponeData((p) => ({ ...p, newDate: e.target.value }))}
                      className="h-11 rounded-2xl"
                      disabled={ok}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newTime" className="text-sm font-bold">
                      Neue Uhrzeit <span className="text-orange-700">*</span>
                    </Label>
                    <Input
                      id="newTime"
                      type="time"
                      value={postponeData.newTime}
                      onChange={(e) => setPostponeData((p) => ({ ...p, newTime: e.target.value }))}
                      className="h-11 rounded-2xl"
                      disabled={ok}
                    />
                  </div>
                </div>

                {/* Grund */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-bold">
                    Grund <span className="text-orange-700">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={postponeData.reason}
                    onChange={(e) => setPostponeData((p) => ({ ...p, reason: e.target.value }))}
                    placeholder='z.B. "2 Spieler krank", "Termin-Kollision"'
                    className={cn(
                      "min-h-[110px] rounded-2xl",
                      postponeData.reason.trim().length > 0 && postponeData.reason.trim().length < 3
                        ? "border-orange-300"
                        : "",
                    )}
                    disabled={ok}
                  />
                  <p className="text-xs text-gray-500">Mindestens 3 Zeichen.</p>
                </div>

                <Separator />

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    onClick={postponeMatch}
                    disabled={disabled || ok || !canEdit}
                    className={cn(
                      "h-11 rounded-2xl font-black",
                      "bg-orange-600 hover:bg-orange-700 text-white",
                      "disabled:opacity-60 disabled:hover:bg-orange-600",
                    )}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Verschieben speichern
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push(backHref)}
                    className="h-11 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                    disabled={submitting}
                  >
                    Abbrechen
                  </Button>
                </div>

                {!canEdit ? (
                  <p className="text-xs text-orange-700">Du hast keine Berechtigung, dieses Spiel zu verschieben.</p>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
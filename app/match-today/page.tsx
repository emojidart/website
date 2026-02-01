"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, Clock, ChevronLeft, ChevronRight, Trophy, Sparkles, Zap, Play, Pause } from "lucide-react"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Match {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  matchday: number
  status: string
  match_time?: string | null
  home_team?: { id: string; name: string; logo_url?: string | null }
  away_team?: { id: string; name: string; logo_url?: string | null }
  home_opponent_team?: { id: string; name: string; logo_url?: string | null }
  away_opponent_team?: { id: string; name: string; logo_url?: string | null }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function toISODateLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function ensureHHMM(time?: string | null) {
  const t = String(time || "").replace("Uhr", "").trim()
  if (!t) return ""
  if (/^\d{1,2}:\d{2}$/.test(t)) return t
  if (/^\d{1,2}$/.test(t)) return `${pad2(Number(t))}:00`
  return t
}

function formatGermanDateLong(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
}

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ")
}

function TeamBlock({
  name,
  logoUrl,
  side,
}: {
  name: string
  logoUrl: string | null
  side: "home" | "away"
}) {
  // gleiche Breite + sauber zentriert
  return (
    <div className="w-full flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Glow */}
        <div
          className={cn(
            "absolute -inset-6 rounded-full blur-3xl",
            side === "home" ? "bg-orange-500/25" : "bg-white/10"
          )}
        />
        {/* Ring */}
        <div className="relative rounded-full p-[2px] bg-gradient-to-b from-white/35 to-white/5">
          <div className="rounded-full bg-white/10 backdrop-blur-sm border border-white/15 p-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-white/10 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center px-2">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight line-clamp-2">
          {name}
        </div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wider text-white/70">
          {side === "home" ? "Heim" : "Gast"}
        </div>
      </div>
    </div>
  )
}

export default function MatchTodayPage() {
  const [loading, setLoading] = useState(true)
  const [matchesToday, setMatchesToday] = useState<Match[]>([])
  const [index, setIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [progress, setProgress] = useState(0)

  const intervalRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

  const [direction, setDirection] = useState<"next" | "prev">("next")

  const todayISO = useMemo(() => toISODateLocal(new Date()), [])
  const current = matchesToday[index] || null
  const next = matchesToday.length > 1 ? matchesToday[(index + 1) % matchesToday.length] : null

  const DURATION_MS = 6500

  const getTeamName = (m: Match, isHome: boolean) =>
    isHome ? m.home_team?.name || m.home_opponent_team?.name || "Unbekannt" : m.away_team?.name || m.away_opponent_team?.name || "Unbekannt"

  const getTeamLogo = (m: Match, isHome: boolean) =>
    isHome ? m.home_team?.logo_url || m.home_opponent_team?.logo_url || null : m.away_team?.logo_url || m.away_opponent_team?.logo_url || null

  const go = (dir: "next" | "prev") => {
    if (!matchesToday.length) return
    setDirection(dir)
    setProgress(0)
    startedAtRef.current = performance.now()
    setIndex((i) => {
      if (dir === "next") return (i + 1) % matchesToday.length
      return (i - 1 + matchesToday.length) % matchesToday.length
    })
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: opponentTeamsData } = await supabase.from("opponent_teams").select("*")

        const { data: matchesData, error } = await supabase
          .from("matches")
          .select(
            `
              *,
              home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
              away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
            `
          )
          .eq("status", "scheduled")
          .eq("match_date", todayISO)
          .order("match_time", { ascending: true })

        if (error) throw error

        const enriched =
          (matchesData || []).map((m: any) => {
            const homeOpponentTeam = m.home_opponent_team_id
              ? opponentTeamsData?.find((t: any) => t.id === m.home_opponent_team_id)
              : null
            const awayOpponentTeam = m.away_opponent_team_id
              ? opponentTeamsData?.find((t: any) => t.id === m.away_opponent_team_id)
              : null
            return { ...m, home_opponent_team: homeOpponentTeam, away_opponent_team: awayOpponentTeam } as Match
          }) || []

        setMatchesToday(enriched)
        setIndex(0)
        setProgress(0)
        startedAtRef.current = performance.now()
      } catch (e) {
        console.error("MatchToday load error:", e)
        setMatchesToday([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [todayISO])

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null

    if (!autoPlay || matchesToday.length <= 1) {
      setProgress(0)
      return
    }

    startedAtRef.current = performance.now()

    const tick = () => {
      const t = performance.now() - startedAtRef.current
      setProgress(Math.min(1, t / DURATION_MS))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    intervalRef.current = window.setInterval(() => go("next"), DURATION_MS)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      intervalRef.current = null
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, matchesToday.length, index])

  const cardVariants = {
    enter: (dir: "next" | "prev") => ({
      x: dir === "next" ? 50 : -50,
      opacity: 0,
      scale: 0.985,
      filter: "blur(10px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 240, damping: 24, mass: 0.9 },
    },
    exit: (dir: "next" | "prev") => ({
      x: dir === "next" ? -50 : 50,
      opacity: 0,
      scale: 0.985,
      filter: "blur(10px)",
      transition: { duration: 0.22, ease: "easeInOut" },
    }),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20 lg:pt-24">
        <div className="container mx-auto px-4">
          {/* HERO */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-950 to-orange-950 text-white">
            <div className="absolute inset-0">
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute inset-0 opacity-10 bg-[url('/stadium-crowd-atmosphere.jpg')] bg-cover bg-center" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,.20),transparent_42%),radial-gradient(circle_at_85%_70%,rgba(249,115,22,.25),transparent_45%)]" />
            </div>

            <div className="relative p-5 sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-yellow-300" />
                    Match Today
                  </div>

                  <h1 className="mt-3 text-2xl sm:text-3xl lg:text-5xl font-black leading-tight">
                    Spiele am {formatGermanDateLong(todayISO)}
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-white/80 max-w-2xl">
                    Große Logos, alles zentriert, echte TV-Animation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => setAutoPlay((v) => !v)}
                    disabled={loading || matchesToday.length <= 1}
                  >
                    {autoPlay ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {autoPlay ? "Auto: AN" : "Auto: AUS"}
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid lg:grid-cols-[1fr,360px] gap-5">
                {/* MAIN */}
                <div className="relative">
                  {loading ? (
                    <Card className="border-0 bg-white/10 text-white shadow-xl">
                      <CardContent className="p-10 text-center">
                        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-white/30 border-b-transparent animate-spin" />
                        <p className="text-white/85 font-semibold">Lade Spiele für heute…</p>
                      </CardContent>
                    </Card>
                  ) : matchesToday.length === 0 ? (
                    <Card className="border-0 bg-white/10 text-white shadow-xl">
                      <CardContent className="p-10 text-center">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-white/70" />
                        <p className="text-lg font-black">Heute keine Spiele</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="relative">
                      {/* progress */}
                      <div className="mb-3">
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-300"
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.round(progress * 100)}%` }}
                            transition={{ duration: 0.08, ease: "linear" }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                          <span className="inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                            {index + 1} / {matchesToday.length}
                          </span>
                          <span>{autoPlay ? "Auto-Wechsel läuft" : "Manuell"}</span>
                        </div>
                      </div>

                      <AnimatePresence mode="popLayout" custom={direction}>
                        <motion.div
                          key={current!.id}
                          custom={direction}
                          variants={cardVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/15 bg-white/10 backdrop-blur-sm"
                        >
                          {/* meta row */}
                          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
                            <div className="flex items-center gap-4 text-sm text-white/85 flex-wrap">
                              <span className="inline-flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(`${current!.match_date}T12:00:00`).toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </span>

                              {current?.match_time && (
                                <span className="inline-flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {ensureHHMM(current.match_time)} Uhr
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                onClick={() => go("prev")}
                                aria-label="Vorheriges Spiel"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                onClick={() => go("next")}
                                aria-label="Nächstes Spiel"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>

                          {/* MATCH BODY (perfekt zentriert) */}
                          <div className="p-6 sm:p-10">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr,220px,1fr] gap-8 items-center">
                              <TeamBlock
                                side="home"
                                name={getTeamName(current!, true)}
                                logoUrl={getTeamLogo(current!, true)}
                              />

                              {/* VS Center */}
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative">
                                  <div className="absolute -inset-14 rounded-full bg-orange-500/25 blur-3xl" />
                                  <motion.div
                                    className="relative text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight"
                                    animate={{ scale: [1, 1.06, 1] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                  >
                                    VS
                                  </motion.div>
                                </div>

                                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs font-black text-white/85">
                                  <Sparkles className="w-4 h-4 text-yellow-300" />
                                  {matchesToday.length} Spiel{matchesToday.length === 1 ? "" : "e"} heute
                                </div>
                              </div>

                              <TeamBlock
                                side="away"
                                name={getTeamName(current!, false)}
                                logoUrl={getTeamLogo(current!, false)}
                              />
                            </div>

                            {/* dots */}
                            <div className="mt-8 flex items-center justify-center gap-2">
                              {matchesToday.map((m, i) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    const dir = i > index ? "next" : "prev"
                                    setDirection(dir)
                                    setProgress(0)
                                    startedAtRef.current = performance.now()
                                    setIndex(i)
                                  }}
                                  className={cn(
                                    "h-2.5 rounded-full transition-all",
                                    i === index ? "w-12 bg-white" : "w-2.5 bg-white/30 hover:bg-white/55"
                                  )}
                                  aria-label={`Spiel ${i + 1}`}
                                  type="button"
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* RIGHT: NEXT UP */}
                <div className="space-y-4">
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-black">
                            <Sparkles className="w-4 h-4 text-yellow-200" />
                            Next Up
                          </div>
                          <div className="text-xs font-bold text-white/85">{autoPlay ? "AUTO" : "MANUELL"}</div>
                        </div>

                        <div className="mt-4">
                          {loading ? (
                            <div className="text-sm text-white/85">Lade…</div>
                          ) : !next ? (
                            <div className="text-sm text-white/85">
                              {matchesToday.length === 1 ? "Nur 1 Spiel heute." : "Keine Preview verfügbar."}
                            </div>
                          ) : (
                            <motion.div
                              key={next.id}
                              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                              className="space-y-3"
                            >
                              <div className="text-sm font-black">
                                {ensureHHMM(next.match_time)} Uhr
                              </div>

                              <div className="text-sm font-black">
                                {getTeamName(next, true)} <span className="text-white/75">vs</span> {getTeamName(next, false)}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => go("prev")}
                            disabled={loading || matchesToday.length <= 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Zurück
                          </Button>
                          <Button
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                            onClick={() => go("next")}
                            disabled={loading || matchesToday.length <= 1}
                          >
                            Weiter
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Übersicht */}
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-gray-900 font-black">
                        <Trophy className="w-5 h-5 text-orange-600" />
                        Heute Übersicht
                      </div>

                      <div className="mt-3 space-y-2">
                        {loading ? (
                          <div className="text-sm text-gray-600">Lade…</div>
                        ) : matchesToday.length === 0 ? (
                          <div className="text-sm text-gray-600">Keine Spiele geplant.</div>
                        ) : (
                          matchesToday.slice(0, 10).map((m, i) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                const dir = i > index ? "next" : "prev"
                                setDirection(dir)
                                setProgress(0)
                                startedAtRef.current = performance.now()
                                setIndex(i)
                              }}
                              className={cn(
                                "w-full text-left rounded-xl border px-3 py-2 transition-all",
                                i === index
                                  ? "border-orange-300 bg-orange-50 shadow-sm"
                                  : "border-gray-200 bg-gray-50 hover:bg-white"
                              )}
                              type="button"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-gray-900 truncate">
                                    {getTeamName(m, true)} <span className="text-gray-400">vs</span>{" "}
                                    {getTeamName(m, false)}
                                  </div>
                                  <div className="text-[11px] text-gray-600 mt-0.5">
                                    {ensureHHMM(m.match_time)} Uhr
                                  </div>
                                </div>
                                <div className="text-[10px] font-black text-gray-500">#{i + 1}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="h-20" />
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}

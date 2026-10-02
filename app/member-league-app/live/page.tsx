"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useAuth } from "@/hooks/use-auth"
import {
  ChevronDown,
  CircleDot,
  Radio,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type LiveGame = {
  gameId: string
  division: string
  weekNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: "started" | "scheduled" | "completed"
}

type PlayerCheck = {
  player: string
  checks: string
}

type BlockMatch = {
  leftPlayer: string
  leftScore: string
  rightScore: string
  rightPlayer: string
}

type MatchBlock = {
  title: string
  matches: BlockMatch[]
}

type GameDetail = {
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  homePlayers: PlayerCheck[]
  awayPlayers: PlayerCheck[]
  blocks: MatchBlock[]
}

type DetailState = {
  loading: boolean
  error: string | null
  data: GameDetail | null
}

export default function MemberLeagueLivePage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [games, setGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "started" | "scheduled" | "completed">("all")
  const [openGameId, setOpenGameId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, DetailState>>({})

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, router, session])

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sportdarts/live", {
        method: "GET",
        cache: "no-store",
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "LIVE-Spiele konnten nicht geladen werden.")
      }

      setGames(payload?.games || [])
    } catch (err: any) {
      setError(err?.message || "LIVE-Spiele konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) void loadGames()
  }, [loadGames, session])

  const loadDetail = useCallback(
    async (gameId: string) => {
      if (details[gameId]?.loading || details[gameId]?.data) return

      setDetails((prev) => ({
        ...prev,
        [gameId]: { loading: true, error: null, data: null },
      }))

      try {
        const response = await fetch(`/api/sportdarts/game/${encodeURIComponent(gameId)}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Spieldetails konnten nicht geladen werden.")
        }

        setDetails((prev) => ({
          ...prev,
          [gameId]: { loading: false, error: null, data: payload },
        }))
      } catch (err: any) {
        setDetails((prev) => ({
          ...prev,
          [gameId]: {
            loading: false,
            error: err?.message || "Spieldetails konnten nicht geladen werden.",
            data: null,
          },
        }))
      }
    },
    [details],
  )

  const toggleDetails = useCallback(
    (gameId: string) => {
      const next = openGameId === gameId ? null : gameId
      setOpenGameId(next)
      if (next) void loadDetail(gameId)
    },
    [loadDetail, openGameId],
  )

  const visibleGames = useMemo(
    () => (filter === "all" ? games : games.filter((game) => game.status === filter)),
    [filter, games],
  )

  const counts = useMemo(
    () => ({
      all: games.length,
      started: games.filter((game) => game.status === "started").length,
      scheduled: games.filter((game) => game.status === "scheduled").length,
      completed: games.filter((game) => game.status === "completed").length,
    }),
    [games],
  )

  if (authLoading) return <div className="min-h-[1px]" aria-hidden="true" />
  if (!session) return null

  const statusLabel = (status: LiveGame["status"]) =>
    status === "started" ? "Gestartet" : status === "scheduled" ? "Noch nicht gestartet" : "Beendet"

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="LIVE-Spiele" subtitle="Ligazentrale" backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
<button
            type="button"
            onClick={() => void loadGames()}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/30 px-4 text-sm font-black text-white/55 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 backdrop-blur-xl">
          <div className="border-b border-white/[0.07] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-red-300/15 bg-red-500/[0.08] text-red-200">
                <Radio className="h-7 w-7" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,.9)]" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300/60">
                  Sportdarts
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                  LIVE-Spiele
                </h1>
                <p className="mt-1 text-sm font-semibold text-white/38">
                  Alle aktuell gelisteten Ligaspiele über alle Divisionen.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.07] bg-black/25 p-1.5 sm:grid-cols-4">
              {[
                ["all", "Alle", counts.all],
                ["started", "Gestartet", counts.started],
                ["scheduled", "Offen", counts.scheduled],
                ["completed", "Beendet", counts.completed],
              ].map(([key, label, count]) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setFilter(key as typeof filter)}
                  className={[
                    "rounded-xl px-2 py-2.5 text-xs font-black transition",
                    filter === key
                      ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,.13)]"
                      : "text-white/42 hover:bg-white/[0.05] hover:text-white/75",
                  ].join(" ")}
                >
                  {label} <span className="ml-1 text-white/45">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <RefreshCw className="h-7 w-7 animate-spin text-orange-300" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-300/10 bg-red-500/[0.05] p-5 text-sm font-semibold text-red-100/70">
                {error}
              </div>
            ) : visibleGames.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
                <Radio className="mx-auto h-7 w-7 text-white/20" />
                <div className="mt-3 text-sm font-black text-white/55">Keine Spiele in diesem Bereich</div>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleGames.map((game) => {
                  const detail = details[game.gameId]

                  return (
                    <div
                      key={game.gameId}
                      className={[
                        "overflow-hidden rounded-2xl border",
                        game.status === "started"
                          ? "border-red-300/[0.14] bg-red-500/[0.035]"
                          : game.status === "completed"
                            ? "border-emerald-300/[0.10] bg-emerald-500/[0.025]"
                            : "border-white/[0.07] bg-white/[0.018]",
                      ].join(" ")}
                    >
                      <div className="p-3.5 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className={[
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                game.status === "started"
                                  ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,.8)]"
                                  : game.status === "completed"
                                    ? "bg-emerald-400"
                                    : "bg-white/25",
                              ].join(" ")}
                            />
                            <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
                              {game.division} · ST {game.weekNumber || "–"}
                            </div>
                          </div>
                          <div
                            className={[
                              "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.07em]",
                              game.status === "started"
                                ? "border-red-300/15 bg-red-400/10 text-red-200"
                                : game.status === "completed"
                                  ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-200"
                                  : "border-white/[0.08] bg-white/[0.03] text-white/35",
                            ].join(" ")}
                          >
                            {statusLabel(game.status)}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-center gap-2">
                          <div className="truncate text-right text-sm font-black text-white/82">
                            {game.homeTeam}
                          </div>
                          <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-2 py-2 text-center text-lg font-black text-white">
                            {game.homeScore ?? "–"} : {game.awayScore ?? "–"}
                          </div>
                          <div className="truncate text-left text-sm font-black text-white/82">
                            {game.awayTeam}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleDetails(game.gameId)}
                          className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left transition hover:bg-white/[0.045]"
                        >
                          <span className="flex items-center gap-2 text-xs font-black text-white/62">
                            <Target className="h-4 w-4 text-orange-300" />
                            Spiel ansehen
                          </span>
                          <ChevronDown
                            className={[
                              "h-4 w-4 text-white/35 transition-transform",
                              openGameId === game.gameId ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </button>
                      </div>

                      {openGameId === game.gameId ? (
                        <div className="border-t border-white/[0.06] bg-black/20 p-3 sm:p-4">
                          {detail?.loading ? (
                            <div className="flex min-h-[120px] items-center justify-center">
                              <RefreshCw className="h-5 w-5 animate-spin text-orange-300" />
                            </div>
                          ) : detail?.error ? (
                            <div className="text-sm font-semibold text-red-200/70">{detail.error}</div>
                          ) : detail?.data ? (
                            <div className="space-y-4">
                              {(detail.data.homePlayers.length > 0 || detail.data.awayPlayers.length > 0) ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[
                                    ["Heim · Checks", detail.data.homePlayers],
                                    ["Gast · Checks", detail.data.awayPlayers],
                                  ].map(([title, players]) => (
                                    <div
                                      key={String(title)}
                                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                                    >
                                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.10em] text-white/30">
                                        {String(title)}
                                      </div>
                                      <div className="space-y-1.5">
                                        {(players as PlayerCheck[]).map((player, index) => (
                                          <div
                                            key={`${player.player}-${index}`}
                                            className="flex items-center justify-between gap-2 text-xs"
                                          >
                                            <span className="truncate font-bold text-white/70">{player.player}</span>
                                            <span className="shrink-0 font-black text-orange-200">{player.checks || "—"}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {detail.data.blocks.map((block, blockIndex) => (
                                <div
                                  key={`${block.title}-${blockIndex}`}
                                  className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.018]"
                                >
                                  <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                                    <Trophy className="h-4 w-4 text-orange-300" />
                                    <span className="text-xs font-black text-white/70">{block.title}</span>
                                  </div>
                                  <div className="divide-y divide-white/[0.05]">
                                    {block.matches.map((match, matchIndex) => (
                                      <div
                                        key={`${match.leftPlayer}-${match.rightPlayer}-${matchIndex}`}
                                        className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5"
                                      >
                                        <div className="break-words text-right text-xs font-bold text-white/65">
                                          {match.leftPlayer}
                                        </div>
                                        <div className="text-center text-sm font-black text-white">
                                          {match.leftScore} : {match.rightScore}
                                        </div>
                                        <div className="break-words text-left text-xs font-bold text-white/65">
                                          {match.rightPlayer}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}

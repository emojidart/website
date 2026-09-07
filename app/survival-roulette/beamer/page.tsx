"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  CheckCircle2,
  Clock3,
  Expand,
  Flame,
  Monitor,
  Radio,
  Trophy,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type PlayerRow = {
  id: string
  player_name: string
  active: boolean
  points: number
  wins: number
  losses: number
  legs_for: number
  legs_against: number
  leg_difference: number
  position: number
}

type MatchRow = {
  id: string
  match_no: number
  machine_number: number | null
  status: "ready" | "live" | "completed" | string
  score1: number
  score2: number
  winner_team: number | null
  team1_player1_id: string
  team1_player2_id: string
  team2_player1_id: string
  team2_player2_id: string
}

type TournamentRow = {
  id: string
  name: string
  current_stage: number
  status: string
}

type StageCut = {
  qualifying_players: number
  rounds_planned: number
}

type IntroItem = {
  key: string
  matchId: string
  matchNo: number
  machineNumber: number
  team1Player1: string
  team1Player2: string
  team2Player1: string
  team2Player2: string
}

type ResultFlash = {
  key: string
  matchNo: number
  machineNumber?: number | null
  winnerTeam: string
  loserTeam: string
  score1: number
  score2: number
  corrected?: boolean
}

const INTRO_MS = 1350
const RESULT_FLASH_MS = 5200

function TeamBlock({
  player1,
  player2,
  align,
}: {
  player1: string
  player2: string
  align: "left" | "right"
}) {
  return (
    <div
      className={`rounded-[30px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur ${
        align === "right"
          ? "animate-[survivalIntroLeft_.42s_cubic-bezier(.2,.8,.2,1)_both] text-right"
          : "animate-[survivalIntroRight_.42s_cubic-bezier(.2,.8,.2,1)_both] text-left"
      }`}
    >
      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        Doppel
      </div>

      <div className="mt-3 break-words text-[clamp(20px,2.5vw,40px)] font-black leading-[0.98] tracking-[-0.045em]">
        {player1}
      </div>

      <div className="mt-2 break-words text-[clamp(18px,2.1vw,34px)] font-black leading-[0.98] tracking-[-0.04em] text-orange-300">
        + {player2}
      </div>
    </div>
  )
}

function MatchIntro({
  item,
  tournamentName,
}: {
  item: IntroItem
  tournamentName: string
}) {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_50%_42%,rgba(16,185,129,.20),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,.10),transparent_42%)]" />

      <div className="relative w-[min(94vw,1550px)]">
        <div className="mb-9 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-black uppercase tracking-[0.18em] text-slate-300">
            <Radio className="h-4 w-4 text-emerald-400" />
            Match {item.matchNo} startet
          </div>

          <div className="mt-3 text-sm font-bold text-slate-500">
            {tournamentName}
          </div>
        </div>

        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <TeamBlock
            player1={item.team1Player1}
            player2={item.team1Player2}
            align="right"
          />

          <div className="animate-[survivalIntroPop_.38s_.08s_cubic-bezier(.2,.9,.2,1.1)_both] text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-emerald-300/20 bg-emerald-400 text-3xl font-black tracking-[-0.06em] text-slate-950 shadow-[0_22px_70px_-20px_rgba(16,185,129,.75)]">
              VS
            </div>

            <div className="mx-auto mt-5 inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <Monitor className="h-5 w-5 text-emerald-400" />
              <span className="text-lg font-black">
                Automat {item.machineNumber}
              </span>
            </div>
          </div>

          <TeamBlock
            player1={item.team2Player1}
            player2={item.team2Player2}
            align="left"
          />
        </div>

        <div className="mx-auto mt-7 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10">
          <div className="h-full origin-left animate-[survivalIntroProgress_1.35s_linear_forwards] rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  )
}

function ResultBanner({ item }: { item: ResultFlash }) {
  return (
    <div className="animate-[survivalResultIn_.22s_cubic-bezier(.2,.9,.2,1)_both] min-w-0 flex-1 lg:max-w-[780px]">
      <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              {item.corrected ? "Ergebnis korrigiert · Gewinner" : "Gewinner"}
            </div>
            <div className="mt-0.5 truncate text-[clamp(12px,1vw,17px)] font-black leading-tight text-white">
              {item.winnerTeam}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600">
              M{item.matchNo}
              {item.machineNumber ? ` · A${item.machineNumber}` : ""}
            </div>
            <div className="mt-0.5 rounded-lg border border-white/10 bg-slate-950/55 px-3 py-1 text-base font-black">
              {item.score1}:{item.score2}
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-rose-300">
              Verlierer
            </div>
            <div className="mt-0.5 truncate text-[clamp(12px,1vw,17px)] font-black leading-tight text-slate-200">
              {item.loserTeam}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LiveMatchCard({
  match,
  names,
}: {
  match: MatchRow
  names: Map<string, string>
}) {
  return (
    <div className="rounded-[24px] border border-emerald-300/25 bg-slate-900/70 p-5 shadow-[0_24px_80px_-50px_rgba(16,185,129,.5)]">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          LIVE · Match {match.match_no}
        </div>

        <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-200">
          Automat {match.machine_number}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="min-w-0 rounded-[18px] border border-white/8 bg-white/[0.025] p-4">
          <div className="truncate text-[clamp(13px,1.05vw,18px)] font-black leading-none text-white">
            {names.get(match.team1_player1_id) || "Spieler"}
          </div>
          <div className="mt-2 truncate text-[clamp(12px,.95vw,16px)] font-black leading-none text-orange-300">
            + {names.get(match.team1_player2_id) || "Spieler"}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-slate-500">
          VS
        </div>

        <div className="min-w-0 rounded-[18px] border border-white/8 bg-white/[0.025] p-4 text-right">
          <div className="truncate text-[clamp(13px,1.05vw,18px)] font-black leading-none text-white">
            {names.get(match.team2_player1_id) || "Spieler"}
          </div>
          <div className="mt-2 truncate text-[clamp(12px,.95vw,16px)] font-black leading-none text-orange-300">
            + {names.get(match.team2_player2_id) || "Spieler"}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SurvivalRouletteBeamerPage() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get("tournamentId") || ""

  const [tournament, setTournament] = useState<TournamentRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([])
  const [finalChampionId, setFinalChampionId] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [cut, setCut] = useState<StageCut | null>(null)
  const [roundNo, setRoundNo] = useState(0)
  const [loading, setLoading] = useState(true)

  const [introQueue, setIntroQueue] = useState<IntroItem[]>([])
  const [activeIntro, setActiveIntro] = useState<IntroItem | null>(null)
  const [resultFlash, setResultFlash] = useState<ResultFlash | null>(null)

  const initializedRef = useRef(false)
  const previousMatchesRef = useRef<Map<string, MatchRow>>(new Map())
  const playersRef = useRef<PlayerRow[]>([])
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cacheKey = `survival_roulette_beamer_${tournamentId}`

  const saveSnapshot = (snapshot: any) => {
    if (typeof window === "undefined" || !tournamentId) return
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ ...snapshot, cachedAt: new Date().toISOString() }),
    )
  }

  const restoreSnapshot = () => {
    if (typeof window === "undefined" || !tournamentId) return false

    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return false

      const snapshot = JSON.parse(raw)

      if (snapshot.tournament) setTournament(snapshot.tournament)
      if (Array.isArray(snapshot.players)) setPlayers(snapshot.players)
      if (Array.isArray(snapshot.allPlayers)) setAllPlayers(snapshot.allPlayers)
      if (Array.isArray(snapshot.matches)) setMatches(snapshot.matches)
      if (snapshot.cut) setCut(snapshot.cut)
      if (typeof snapshot.roundNo === "number") setRoundNo(snapshot.roundNo)

      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    playersRef.current = players
  }, [players])

  const playerNameFrom = useCallback(
    (id: string, rankingRows?: PlayerRow[]) => {
      const source = rankingRows || playersRef.current
      return source.find((p) => p.id === id)?.player_name || "Spieler"
    },
    [],
  )

  const enqueueIntro = useCallback(
    (match: MatchRow, rankingRows?: PlayerRow[]) => {
      if (
        !match.machine_number ||
        match.status !== "live"
      ) {
        return
      }

      const key = `${match.id}-${match.machine_number}`

      setIntroQueue((prev) => {
        if (prev.some((item) => item.key === key)) return prev

        return [
          ...prev,
          {
            key,
            matchId: match.id,
            matchNo: match.match_no,
            machineNumber: match.machine_number!,
            team1Player1: playerNameFrom(
              match.team1_player1_id,
              rankingRows,
            ),
            team1Player2: playerNameFrom(
              match.team1_player2_id,
              rankingRows,
            ),
            team2Player1: playerNameFrom(
              match.team2_player1_id,
              rankingRows,
            ),
            team2Player2: playerNameFrom(
              match.team2_player2_id,
              rankingRows,
            ),
          },
        ]
      })
    },
    [playerNameFrom],
  )

  const showResultFlash = useCallback(
    (
      match: MatchRow,
      previous?: MatchRow,
      rankingRows?: PlayerRow[],
      corrected = false,
    ) => {
      if (match.status !== "completed" || !match.winner_team) return

      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current)
      }

      const t1 = `${playerNameFrom(
        match.team1_player1_id,
        rankingRows,
      )} / ${playerNameFrom(match.team1_player2_id, rankingRows)}`

      const t2 = `${playerNameFrom(
        match.team2_player1_id,
        rankingRows,
      )} / ${playerNameFrom(match.team2_player2_id, rankingRows)}`

      setResultFlash({
        key: `${match.id}-${Date.now()}`,
        matchNo: match.match_no,
        machineNumber:
          previous?.machine_number || match.machine_number || undefined,
        winnerTeam: match.winner_team === 1 ? t1 : t2,
        loserTeam: match.winner_team === 1 ? t2 : t1,
        score1: match.score1,
        score2: match.score2,
        corrected,
      })

      resultTimerRef.current = setTimeout(() => {
        setResultFlash(null)
        resultTimerRef.current = null
      }, RESULT_FLASH_MS)
    },
    [playerNameFrom],
  )

  useEffect(() => {
    if (activeIntro || introQueue.length === 0) return

    const [next, ...rest] = introQueue
    setIntroQueue(rest)
    setActiveIntro(next)
  }, [activeIntro, introQueue])

  useEffect(() => {
    if (!activeIntro) return

    introTimerRef.current = setTimeout(() => {
      setActiveIntro(null)
      introTimerRef.current = null
    }, INTRO_MS)

    return () => {
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current)
        introTimerRef.current = null
      }
    }
  }, [activeIntro])

  const load = useCallback(async () => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      restoreSnapshot()
      setLoading(false)
      return
    }

    try {
      const { data: t, error: tError } = await supabase
        .from("survival_tournaments")
        .select("id,name,current_stage,status")
        .eq("id", tournamentId)
        .single()

      if (tError || !t) throw tError || new Error("Turnier nicht gefunden")

      const [{ data: ranking }, { data: stage }, { data: rounds }] =
        await Promise.all([
          supabase
            .from("survival_ranking")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("position"),
          supabase
            .from("survival_stage_cuts")
            .select("qualifying_players,rounds_planned")
            .eq("tournament_id", tournamentId)
            .eq("stage_no", t.current_stage)
            .single(),
          supabase
            .from("survival_rounds")
            .select("id,round_no,status")
            .eq("tournament_id", tournamentId)
            .eq("stage_no", t.current_stage)
            .order("round_no", { ascending: false })
            .limit(1),
        ])

      const allRankingRows = (ranking || []) as PlayerRow[]
      const rankingRows = allRankingRows.filter((player) => player.active)
      const stageCut = (stage || null) as StageCut | null

      const { data: latestFinalTiebreak } = await supabase
        .from("survival_tiebreaks")
        .select("advancing_player_ids,created_at")
        .eq("tournament_id", tournamentId)
        .eq("stage_no", t.current_stage)
        .eq("open_slots", 1)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const storedChampionId =
        t.status === "completed" &&
        Array.isArray(latestFinalTiebreak?.advancing_player_ids)
          ? String(latestFinalTiebreak.advancing_player_ids[0] || "")
          : ""
      const round = rounds?.[0]

      let matchRows: MatchRow[] = []

      if (round?.id) {
        const { data: m } = await supabase
          .from("survival_matches")
          .select("*")
          .eq("round_id", round.id)
          .order("machine_number", {
            ascending: true,
            nullsFirst: false,
          })
          .order("match_no")

        matchRows = (m || []) as MatchRow[]
      }

      // Polling fallback also detects match transitions.
      // This means the beamer still updates correctly if a realtime event is missed.
      if (initializedRef.current) {
        const previousMap = previousMatchesRef.current

        matchRows.forEach((row) => {
          const previous = previousMap.get(row.id)

          const startsNow = Boolean(
            row.status === "live" &&
              row.machine_number &&
              (!previous ||
                previous.status !== "live" ||
                previous.machine_number !== row.machine_number),
          )

          const justFinished = Boolean(
            row.status === "completed" &&
              previous &&
              previous.status !== "completed",
          )

          const resultCorrected = Boolean(
            row.status === "completed" &&
              previous &&
              previous.status === "completed" &&
              (
                previous.score1 !== row.score1 ||
                previous.score2 !== row.score2 ||
                previous.winner_team !== row.winner_team
              ),
          )

          if (startsNow) {
            enqueueIntro(row, rankingRows)
          }

          if (justFinished) {
            showResultFlash(row, previous, rankingRows, false)
          } else if (resultCorrected) {
            showResultFlash(row, previous, rankingRows, true)
          }
        })
      } else {
        // First load is baseline only, so existing live matches don't replay intros.
        initializedRef.current = true
      }

      setTournament(t as TournamentRow)
      setPlayers(rankingRows)
      setAllPlayers(allRankingRows)
      setFinalChampionId(storedChampionId || null)
      setCut(stageCut)
      setRoundNo(round?.round_no || 0)
      setMatches(matchRows)

      previousMatchesRef.current = new Map(
        matchRows.map((m) => [m.id, m]),
      )

      saveSnapshot({
        tournament: t as TournamentRow,
        players: rankingRows,
        allPlayers: allRankingRows,
        cut: stageCut,
        roundNo: round?.round_no || 0,
        matches: matchRows,
      })
    } catch (error) {
      console.error("[Survival Beamer] Laden fehlgeschlagen:", error)
      restoreSnapshot()
    } finally {
      setLoading(false)
    }
  }, [tournamentId, enqueueIntro, showResultFlash])

  useEffect(() => {
    restoreSnapshot()
    void load()

    if (!tournamentId) return

    const channel = supabase
      .channel(`survival_beamer_dko_style_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload: any) => {
          const row = payload?.new as MatchRow | undefined
          if (!row) {
            void load()
            return
          }

          // We need fresh names + current stage after cuts, but first detect
          // the transition using the locally known previous match.
          const previous = previousMatchesRef.current.get(row.id)

          setMatches((prev) => {
            const next = prev.map((m) => (m.id === row.id ? row : m))
            if (!next.some((m) => m.id === row.id)) next.push(row)
            return next
          })

          const startsNow = Boolean(
            row.status === "live" &&
              row.machine_number &&
              (!previous ||
                previous.status !== "live" ||
                previous.machine_number !== row.machine_number),
          )

          const justFinished = Boolean(
            row.status === "completed" &&
              previous &&
              previous.status !== "completed",
          )

          const resultCorrected = Boolean(
            row.status === "completed" &&
              previous &&
              previous.status === "completed" &&
              (
                previous.score1 !== row.score1 ||
                previous.score2 !== row.score2 ||
                previous.winner_team !== row.winner_team
              ),
          )

          if (initializedRef.current && startsNow) {
            enqueueIntro(row)
          }

          if (initializedRef.current && justFinished) {
            showResultFlash(row, previous, undefined, false)
          } else if (initializedRef.current && resultCorrected) {
            showResultFlash(row, previous, undefined, true)
          }

          previousMatchesRef.current.set(row.id, row)

          // Refresh ranking / stage / queue in background.
          void load()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survival_tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current)
        introTimerRef.current = null
      }
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current)
        resultTimerRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [enqueueIntro, load, showResultFlash, tournamentId])

  useEffect(() => {
    if (!tournamentId) return

    const poll = window.setInterval(() => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        void load()
      }
    }, 1500)

    return () => window.clearInterval(poll)
  }, [load, tournamentId])

  const names = useMemo(
    () => new Map(allPlayers.map((p) => [p.id, p.player_name])),
    [allPlayers],
  )

  const liveMatches = matches.filter(
    (m) =>
      m.status === "live" &&
      m.machine_number,
  )

  const readyMatches = matches.filter(
    (m) => m.status === "ready",
  )

  const completedMatches = matches.filter(
    (m) => m.status === "completed",
  )

  const cutPosition = cut?.qualifying_players || 4
  const isFinalPhase = players.length === 4
  const finalMatch = isFinalPhase && matches.length === 1 ? matches[0] : null
  const finalMatchCompleted = Boolean(
    finalMatch &&
      finalMatch.status === "completed" &&
      finalMatch.winner_team,
  )
  const finalCompleted = Boolean(
    finalMatchCompleted && tournament.status === "completed",
  )

  const finalIndividualStandings = [...players].sort(
    (a, b) =>
      a.position - b.position ||
      b.points - a.points ||
      b.leg_difference - a.leg_difference ||
      b.legs_for - a.legs_for,
  )

  if (finalChampionId) {
    const championIndex = finalIndividualStandings.findIndex(
      (player) => player.id === finalChampionId,
    )
    if (championIndex > 0) {
      const [champion] = finalIndividualStandings.splice(championIndex, 1)
      finalIndividualStandings.unshift(champion)
    }
  }

  const finalLeader = finalIndividualStandings[0]
  const exactFinalLeaderTie = finalLeader
    ? finalIndividualStandings.filter(
        (player) =>
          player.points === finalLeader.points &&
          player.leg_difference === finalLeader.leg_difference &&
          player.legs_for === finalLeader.legs_for,
      )
    : []

  const finalDecisionPending = Boolean(
    finalMatchCompleted &&
      tournament.status !== "completed" &&
      exactFinalLeaderTie.length > 1,
  )

  const podiumPlayers = finalIndividualStandings.slice(0, 3)
  const fourthFinalist = finalIndividualStandings[3] || null

  const eliminatedFinalStandings = allPlayers
    .filter((player) => !player.active)
    .sort((a, b) => a.position - b.position)

  const playerCount = Math.max(players.length, 1)

  const rankingRowHeight = Math.max(
    25,
    Math.min(46, Math.floor(625 / playerCount)),
  )

  const rankingNameFont = Math.max(
    10,
    Math.min(17, Math.floor(rankingRowHeight * 0.38)),
  )

  const rankingSubFont = Math.max(
    7,
    Math.min(10, Math.floor(rankingRowHeight * 0.22)),
  )

  const openFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
          <div className="mt-4 text-sm font-bold text-slate-400">
            Beamer wird verbunden…
          </div>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 text-center">
          <Monitor className="mx-auto h-10 w-10 text-slate-500" />
          <h1 className="mt-4 text-2xl font-black">
            Kein Turnier ausgewählt
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-white">
      {activeIntro ? (
        <MatchIntro
          item={activeIntro}
          tournamentName={tournament.name}
        />
      ) : null}

      <style jsx global>{`
        @keyframes survivalIntroLeft {
          from {
            opacity: 0;
            transform: translate3d(-55px, 0, 0) scale(.985);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes survivalIntroRight {
          from {
            opacity: 0;
            transform: translate3d(55px, 0, 0) scale(.985);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes survivalIntroPop {
          from {
            opacity: 0;
            transform: scale(.72);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes survivalIntroProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        @keyframes survivalResultIn {
          from {
            opacity: 0;
            transform: translateY(-18px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div className="mx-auto flex h-screen w-full max-w-[1920px] flex-col px-5 py-4 lg:px-8">
        <header className="grid shrink-0 items-center gap-4 border-b border-white/10 pb-4 lg:grid-cols-[minmax(250px,.78fr)_minmax(380px,1.35fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">
              <Radio className="h-4 w-4 text-emerald-400" />
              Survival Live
            </div>

            <h1 className="mt-1 truncate text-[clamp(24px,2.5vw,42px)] font-black tracking-[-0.045em]">
              {tournament.name}
            </h1>
          </div>

          <div className="min-w-0">
            {!activeIntro && resultFlash ? (
              <ResultBanner item={resultFlash} />
            ) : (
              <div className="hidden h-[62px] lg:block" />
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                {isFinalPhase ? "Phase" : "Stage"}
              </div>
              <div className="text-xl font-black">
                {isFinalPhase ? "FINAL" : tournament.current_stage}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                {isFinalPhase ? "Finale" : "Runde"}
              </div>
              <div className="text-xl font-black">
                {isFinalPhase ? (roundNo ? "1/1" : "–") : (roundNo || "–")}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-rose-300">
                {isFinalPhase ? "Modus" : "Cut"}
              </div>
              <div className="text-xl font-black text-rose-200">
                {isFinalPhase ? "Einzelwertung" : `Top ${cutPosition}`}
              </div>
            </div>

            <button
              type="button"
              onClick={openFullscreen}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Vollbild"
            >
              <Expand className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mt-4 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "LIVE",
              value: liveMatches.length,
              icon: Activity,
              accent: "text-emerald-400",
            },
            {
              label: "Bereit",
              value: readyMatches.length,
              icon: Clock3,
              accent: "text-sky-400",
            },
            {
              label: "Fertig",
              value: completedMatches.length,
              icon: CheckCircle2,
              accent: "text-slate-300",
            },
            {
              label: "Aktiv",
              value: players.length,
              icon: Users,
              accent: "text-amber-300",
            },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </span>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
              <div className="mt-1 text-2xl font-black tracking-[-0.04em]">
                {value}
              </div>
            </div>
          ))}
        </section>

        <main className="mt-4 grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <section className="flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex shrink-0 items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  {isFinalPhase ? "Survival Finale" : "Live Center"}
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                  {isFinalPhase ? "Finale" : "Laufende Matches"}
                </h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-400">
                {liveMatches.length} aktiv
              </div>
            </div>

            <div
              className={`mt-4 grid min-h-0 flex-1 gap-4 ${
                liveMatches.length <= 2
                  ? "grid-cols-1"
                  : "grid-cols-2"
              }`}
            >
              {liveMatches.length === 0 ? (
                <div className="col-span-full grid min-h-0 place-items-center rounded-[24px] border border-dashed border-white/10 bg-slate-950/30 text-center">
                  <div>
                    {finalCompleted ? (
                      <div className="w-full max-w-[1080px]">
                        <div className="text-center">
                          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] border border-amber-300/20 bg-amber-300/10">
                            <Trophy className="h-8 w-8 text-amber-300" />
                          </div>
                          <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                            Turnier beendet
                          </div>
                          <div className="mt-1 text-[clamp(28px,3.4vw,54px)] font-black tracking-[-0.05em] text-white">
                            Podium
                          </div>
                        </div>

                        <div className="mx-auto mt-7 grid max-w-[1000px] items-end gap-4 sm:grid-cols-3">
                          <div className="order-2 flex min-h-[185px] flex-col justify-between rounded-[24px] border border-slate-300/20 bg-slate-300/[0.05] p-5 text-left sm:order-1">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                2. Platz
                              </div>
                              <div className="mt-3 text-[clamp(19px,2vw,30px)] font-black leading-tight text-white">
                                {podiumPlayers[1]?.player_name || "—"}
                              </div>
                              <div className="mt-2 text-sm font-bold text-slate-500">
                                {podiumPlayers[1]?.points ?? 0} Punkte
                              </div>
                            </div>
                            <div className="mt-5 text-4xl font-black text-slate-500/40">#2</div>
                          </div>

                          <div className="order-1 flex min-h-[245px] flex-col justify-between rounded-[24px] border border-amber-300/30 bg-amber-300/[0.10] p-6 text-left sm:order-2">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                Survival Roulette Sieger
                              </div>
                              <div className="mt-3 text-[clamp(24px,2.7vw,40px)] font-black leading-tight text-white">
                                {podiumPlayers[0]?.player_name || "—"}
                              </div>
                              <div className="mt-2 text-sm font-bold text-amber-200/70">
                                {podiumPlayers[0]?.points ?? 0} Punkte
                              </div>
                            </div>
                            <div className="mt-5 text-5xl font-black text-amber-300/30">#1</div>
                          </div>

                          <div className="order-3 flex min-h-[165px] flex-col justify-between rounded-[24px] border border-orange-300/20 bg-orange-300/[0.05] p-5 text-left">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                                3. Platz
                              </div>
                              <div className="mt-3 text-[clamp(18px,1.9vw,28px)] font-black leading-tight text-white">
                                {podiumPlayers[2]?.player_name || "—"}
                              </div>
                              <div className="mt-2 text-sm font-bold text-slate-500">
                                {podiumPlayers[2]?.points ?? 0} Punkte
                              </div>
                            </div>
                            <div className="mt-5 text-4xl font-black text-orange-300/25">#3</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Flame className="mx-auto h-8 w-8 text-slate-700" />
                        <div className="mt-3 text-base font-black text-slate-400">
                          {isFinalPhase
                            ? finalMatchCompleted
                              ? finalDecisionPending
                                ? "Siegerentscheidung ausständig"
                                : "Endstand wird aktualisiert"
                              : roundNo
                                ? "Finale wartet auf den Matchstart"
                                : "Finaldoppel wird ausgelost"
                            : roundNo
                              ? "Aktuell kein Match gestartet"
                              : tournament.status === "active"
                                ? `Stage ${tournament.current_stage} bereit`
                                : "Turnier wartet auf den Start"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {isFinalPhase
                            ? finalDecisionPending
                              ? "Vollständiger Gleichstand · Stechen oder Auslosung im Admin."
                              : finalMatchCompleted
                                ? "Die Einzelrangliste wird berechnet."
                                : "Das Finale wird als Doppel gespielt · gewertet wird einzeln."
                            : "Der nächste Matchstart erscheint automatisch im Vollbild."}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                liveMatches.map((match) => (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                    names={names}
                  />
                ))
              )}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  {isFinalPhase ? "Finale" : "Survival"}
                </div>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                  {finalCompleted ? "Endstand" : isFinalPhase ? "Finaldoppel" : "Ranking"}
                </h2>
              </div>
              <Trophy className="h-5 w-5 text-amber-300" />
            </div>

            {finalCompleted ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {[
                    ...(fourthFinalist
                      ? [{ ...fourthFinalist, displayPosition: 4 }]
                      : []),
                    ...eliminatedFinalStandings.map((player) => ({
                      ...player,
                      displayPosition: player.position,
                    })),
                  ].map((player) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[34px_1fr_42px] items-center gap-3 rounded-[15px] border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                    >
                      <div className="text-right text-xs font-black text-slate-600">
                        {player.displayPosition}.
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-200">
                          {player.player_name}
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-600">
                          {player.wins} S · {player.losses} N · Legs {player.legs_for}:{player.legs_against}
                        </div>
                      </div>
                      <div className="text-right text-xs font-black text-slate-500">
                        {player.points}P
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isFinalPhase && finalMatch ? (
              <div className="min-h-0 flex-1 p-4">
                <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Doppel 1
                  </div>
                  <div className="mt-3 text-base font-black text-white">
                    {names.get(finalMatch.team1_player1_id)}
                  </div>
                  <div className="mt-1 text-base font-black text-orange-300">
                    + {names.get(finalMatch.team1_player2_id)}
                  </div>
                </div>

                <div className="my-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                  VS
                </div>

                <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Doppel 2
                  </div>
                  <div className="mt-3 text-base font-black text-white">
                    {names.get(finalMatch.team2_player1_id)}
                  </div>
                  <div className="mt-1 text-base font-black text-orange-300">
                    + {names.get(finalMatch.team2_player2_id)}
                  </div>
                </div>

                {finalDecisionPending ? (
                  <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-300/[0.07] p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                      Entscheidung ausständig
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-400">
                      Vollständiger Gleichstand · Stechen oder Auslosung im Admin
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-hidden">
                {players.map((p, index) => (
                  <div key={p.id}>
                    {!isFinalPhase && index === cutPosition ? (
                      <div className="flex h-[18px] items-center justify-center bg-rose-500 px-3 text-[8px] font-black uppercase tracking-[0.22em] text-white">
                        CUT LINE · ELIMINATION ZONE
                      </div>
                    ) : null}
                    <div
                      className={`grid grid-cols-[34px_1fr_44px_52px] items-center gap-2 border-b border-white/[0.055] px-3 ${
                        index < cutPosition ? "bg-white/[0.015]" : "bg-rose-500/[0.045]"
                      }`}
                      style={{ height: `${rankingRowHeight}px` }}
                    >
                      <div className={`font-black ${index < 3 ? "text-amber-300" : "text-slate-500"}`}>
                        {index + 1}.
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-black leading-tight" style={{ fontSize: `${rankingNameFont}px` }}>
                          {p.player_name}
                        </div>
                        <div className="truncate font-bold uppercase tracking-[0.06em] text-slate-600" style={{ fontSize: `${rankingSubFont}px` }}>
                          {p.wins} S · {p.losses} N · Legs {p.legs_for}:{p.legs_against}
                        </div>
                      </div>
                      <div className="text-center font-black text-emerald-300">
                        {p.points}
                      </div>
                      <div className="text-right font-black text-slate-300">
                        {p.leg_difference >= 0 ? "+" : ""}{p.leg_difference}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  )
}

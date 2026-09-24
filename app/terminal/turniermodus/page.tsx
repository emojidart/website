"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Delete,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Target,
  Trophy,
  Volume2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import TerminalLink from "../_components/TerminalLink"
import TerminalLoader from "../_components/TerminalLoader"

type ActiveMatch = {
  member_name: string
  tournament_id: string
  tournament_type: string
  tournament_name: string
  match_id: number
  player1: string
  player2: string
  score1: number
  score2: number
  machine_number: number | null
}


type MatchCall = {
  key: string
  tournamentId: string
  tournamentType: string
  matchId: number
  player1: string
  player2: string
  machineNumber: number
}

const MATCH_CALL_MS = 4200

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export default function TerminalTournamentModePage() {
  const [pin, setPin] = useState("")
  const [pinMessage, setPinMessage] = useState("")
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null)

  const [match, setMatch] = useState<ActiveMatch | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedResult, setSavedResult] = useState<{
    player1: string
    player2: string
    score1: number
    score2: number
  } | null>(null)

  const [externalResult, setExternalResult] = useState<{
    player1: string
    player2: string
    score1: number
    score2: number
  } | null>(null)

  const [matchCallQueue, setMatchCallQueue] = useState<MatchCall[]>([])
  const [activeMatchCall, setActiveMatchCall] = useState<MatchCall | null>(null)
  const activeTournamentKeysRef = useRef<Set<string>>(new Set())
  const knownMatchesRef = useRef<Map<string, { machineNumber: number | null; winner: string | null }>>(new Map())
  const matchCallTimerRef = useRef<number | null>(null)
  const currentMatchRef = useRef<ActiveMatch | null>(null)
  const savingRef = useRef(false)

  const hasBothPlayers = useMemo(() => {
    return Boolean(match?.player1?.trim() && match?.player2?.trim())
  }, [match])

  const matchStarted = useMemo(() => {
    return Boolean(match?.machine_number)
  }, [match])

  const canSubmit = useMemo(() => {
    return !!match && matchStarted && hasBothPlayers && score1 !== score2 && score1 >= 0 && score2 >= 0
  }, [match, matchStarted, hasBothPlayers, score1, score2])

  useEffect(() => {
    currentMatchRef.current = match
  }, [match])


  const terminalBusy = Boolean(match || confirmOpen || saving || loadingLabel || savedResult || externalResult)

  const playMatchCallSound = () => {
    try {
      const AudioContextCtor =
        window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextCtor) return

      const ctx = new AudioContextCtor()
      const now = ctx.currentTime
      const tones = [659.25, 783.99]

      tones.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, now + index * 0.16)
        gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.16 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.14)
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start(now + index * 0.16)
        oscillator.stop(now + index * 0.16 + 0.15)
      })

      window.setTimeout(() => void ctx.close(), 700)
    } catch {
      // Browser/TV may block audio before the first user interaction.
      // The visual match call still works.
    }
  }

  const enqueueMatchCall = (row: any) => {
    const machineNumber = Number(row?.machine_number)
    const matchId = Number(row?.match_id)
    const tournamentId = String(row?.tournament_id || "")
    const tournamentType = String(row?.tournament_type || "")
    const player1 = String(row?.player1 || "").trim()
    const player2 = String(row?.player2 || "").trim()

    if (
      !Number.isFinite(machineNumber) ||
      machineNumber <= 0 ||
      !Number.isFinite(matchId) ||
      matchId <= 0 ||
      !tournamentId ||
      !tournamentType ||
      !player1 ||
      !player2 ||
      row?.winner
    ) {
      return
    }

    const tournamentKey = `${tournamentType}:${tournamentId}`
    if (!activeTournamentKeysRef.current.has(tournamentKey)) return

    const call: MatchCall = {
      key: `${tournamentKey}:${matchId}:${machineNumber}`,
      tournamentId,
      tournamentType,
      matchId,
      player1,
      player2,
      machineNumber,
    }

    setMatchCallQueue((current) => {
      if (
        activeMatchCall?.key === call.key ||
        current.some((item) => item.key === call.key)
      ) {
        return current
      }
      return [...current, call]
    })
  }

  useEffect(() => {
    let mounted = true

    const refreshActiveTournaments = async () => {
      const { data, error } = await supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_type")
        .eq("status", "active")

      if (!mounted || error) return

      const keys = new Set<string>()
      ;(data || []).forEach((row: any) => {
        if (row.tournament_id && row.tournament_type) {
          keys.add(`${String(row.tournament_type)}:${String(row.tournament_id)}`)
        }
      })
      activeTournamentKeysRef.current = keys

      if (keys.size === 0) {
        knownMatchesRef.current.clear()
        return
      }

      const ids = Array.from(
        new Set(
          (data || [])
            .map((row: any) => String(row.tournament_id || ""))
            .filter(Boolean),
        ),
      )

      const { data: matchRows } = await supabase
        .from("dko_match_states")
        .select("tournament_id, tournament_type, match_id, machine_number, winner")
        .in("tournament_id", ids)

      if (!mounted) return

      const nextKnown = new Map<string, { machineNumber: number | null; winner: string | null }>()
      ;(matchRows || []).forEach((row: any) => {
        const key = `${String(row.tournament_type)}:${String(row.tournament_id)}:${Number(row.match_id)}`
        nextKnown.set(key, {
          machineNumber:
            row.machine_number === null || row.machine_number === undefined
              ? null
              : Number(row.machine_number),
          winner: row.winner ? String(row.winner) : null,
        })
      })
      knownMatchesRef.current = nextKnown
    }

    void refreshActiveTournaments()

    const statusChannel = supabase
      .channel("terminal_tournament_status_watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        () => {
          void refreshActiveTournaments()
        },
      )
      .subscribe()

    const matchChannel = supabase
      .channel("terminal_match_call_watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_match_states",
        },
        (payload: any) => {
          if (payload?.eventType === "DELETE") {
            const oldRow = payload?.old
            if (oldRow?.tournament_id && oldRow?.tournament_type && oldRow?.match_id) {
              const key = `${String(oldRow.tournament_type)}:${String(oldRow.tournament_id)}:${Number(oldRow.match_id)}`
              knownMatchesRef.current.delete(key)
            }
            return
          }

          const row = payload?.new
          if (!row) return

          const tournamentKey = `${String(row.tournament_type || "")}:${String(row.tournament_id || "")}`
          if (!activeTournamentKeysRef.current.has(tournamentKey)) return

          const key = `${tournamentKey}:${Number(row.match_id)}`
          const previous = knownMatchesRef.current.get(key)
          const nextMachine =
            row.machine_number === null || row.machine_number === undefined
              ? null
              : Number(row.machine_number)
          const nextWinner = row.winner ? String(row.winner) : null

          const wasRunning = Boolean(previous?.machineNumber && !previous?.winner)
          const startsNow = Boolean(nextMachine && !nextWinner && !wasRunning)

          knownMatchesRef.current.set(key, {
            machineNumber: nextMachine,
            winner: nextWinner,
          })

          const openMatch = currentMatchRef.current
          const isCurrentOpenMatch =
            openMatch &&
            String(openMatch.tournament_id) === String(row.tournament_id) &&
            String(openMatch.tournament_type) === String(row.tournament_type) &&
            Number(openMatch.match_id) === Number(row.match_id)

          // Falls der Gegner erst später aus dem vorherigen Match feststeht,
          // aktualisieren wir den offenen Terminal-Screen live.
          if (isCurrentOpenMatch && !nextWinner) {
            const refreshedMatch: ActiveMatch = {
              ...openMatch,
              player1: String(row.player1 || ""),
              player2: String(row.player2 || ""),
              score1: Number(row.score1 || 0),
              score2: Number(row.score2 || 0),
              machine_number:
                row.machine_number === null || row.machine_number === undefined
                  ? null
                  : Number(row.machine_number),
            }
            currentMatchRef.current = refreshedMatch
            setMatch(refreshedMatch)
            setScore1(refreshedMatch.score1)
            setScore2(refreshedMatch.score2)
          }

          // Wenn Turnierleitung / anderer Client das aktuell geöffnete Match
          // bereits speichert, darf der Terminalbildschirm nicht stale bleiben.
          if (isCurrentOpenMatch && nextWinner && !savingRef.current) {
            const finished = {
              player1: String(row.player1 || openMatch.player1 || ""),
              player2: String(row.player2 || openMatch.player2 || ""),
              score1: Number(row.score1 || 0),
              score2: Number(row.score2 || 0),
            }

            currentMatchRef.current = null
            setConfirmOpen(false)
            setMatch(null)
            setExternalResult(finished)

            window.setTimeout(() => {
              setExternalResult(null)
              setPin("")
              setPinMessage("")
              setScore1(0)
              setScore2(0)
            }, 2400)
          }

          if (startsNow) {
            enqueueMatchCall(row)
          }
        },
      )
      .subscribe()

    return () => {
      mounted = false
      if (matchCallTimerRef.current !== null) {
        window.clearTimeout(matchCallTimerRef.current)
        matchCallTimerRef.current = null
      }
      supabase.removeChannel(statusChannel)
      supabase.removeChannel(matchChannel)
    }
  }, [])

  useEffect(() => {
    if (terminalBusy || activeMatchCall || matchCallQueue.length === 0) return

    const [nextCall, ...rest] = matchCallQueue
    setMatchCallQueue(rest)
    setActiveMatchCall(nextCall)
    playMatchCallSound()

    matchCallTimerRef.current = window.setTimeout(() => {
      setActiveMatchCall(null)
      matchCallTimerRef.current = null
    }, MATCH_CALL_MS)
  }, [terminalBusy, activeMatchCall, matchCallQueue])

  const resetToPin = () => {
    setPin("")
    setPinMessage("")
    setMatch(null)
    setScore1(0)
    setScore2(0)
    setConfirmOpen(false)
    setSaving(false)
    setSavedResult(null)
    setExternalResult(null)
  }

  const addDigit = (digit: string) => {
    if (pin.length >= 4 || loadingLabel) return
    setPin((value) => `${value}${digit}`)
    setPinMessage("")
  }

  const removeDigit = () => {
    if (loadingLabel) return
    setPin((value) => value.slice(0, -1))
    setPinMessage("")
  }

  const loadMatch = async () => {
    if (pin.length !== 4 || loadingLabel) return

    const submittedPin = pin
    setPinMessage("")
    setLoadingLabel("Dein Match wird geladen")

    try {
      const rpcPromise = supabase.rpc("terminal_get_my_active_match", {
        p_pin: submittedPin,
      })
      const [{ data, error }] = await Promise.all([rpcPromise, sleep(2000)])

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : null
      if (!row) {
        setLoadingLabel(null)
        setPin("")
        setPinMessage("Kein offenes Match für diese PIN gefunden.")
        return
      }

      const activeMatch: ActiveMatch = {
        member_name: String(row.member_name || ""),
        tournament_id: String(row.tournament_id),
        tournament_type: String(row.tournament_type),
        tournament_name: String(row.tournament_name || "Aktives Turnier"),
        match_id: Number(row.match_id),
        player1: String(row.player1 || ""),
        player2: String(row.player2 || ""),
        score1: Number(row.score1 || 0),
        score2: Number(row.score2 || 0),
        machine_number:
          row.machine_number === null || row.machine_number === undefined
            ? null
            : Number(row.machine_number),
      }

      setMatch(activeMatch)
      setScore1(activeMatch.score1)
      setScore2(activeMatch.score2)
      setLoadingLabel(null)
    } catch (error: any) {
      console.error("Terminal tournament PIN error:", error)
      setLoadingLabel(null)
      setPin("")
      const msg = String(error?.message || "").toLowerCase()
      setPinMessage(
        msg.includes("rate limited")
          ? "Zu viele Versuche. Bitte in 10 Minuten erneut versuchen."
          : "PIN konnte nicht geprüft werden.",
      )
    }
  }

  const bump = (player: 1 | 2, delta: number) => {
    if (saving) return

    if (player === 1) {
      setScore1((value) => Math.max(0, Math.min(50, value + delta)))
    } else {
      setScore2((value) => Math.max(0, Math.min(50, value + delta)))
    }
  }

  const saveResult = async () => {
    if (!match || !canSubmit || saving) return

    setSaving(true)
    savingRef.current = true

    try {
      const { error } = await supabase.rpc("terminal_save_my_match_result", {
        p_pin: pin,
        p_tournament_id: match.tournament_id,
        p_tournament_type: match.tournament_type,
        p_match_id: match.match_id,
        p_score1: score1,
        p_score2: score2,
      })

      if (error) throw error

      setConfirmOpen(false)
      savingRef.current = false
      setSavedResult({
        player1: match.player1,
        player2: match.player2,
        score1,
        score2,
      })

      await sleep(2600)
      resetToPin()
    } catch (error: any) {
      console.error("Terminal tournament save error:", error)
      const msg = String(error?.message || "").toLowerCase()

      if (msg.includes("already completed")) {
        setPinMessage("Dieses Match wurde bereits gespeichert. Turnierleitung erforderlich.")
      } else if (msg.includes("not a participant")) {
        setPinMessage("Diese PIN gehört nicht zu einem Spieler dieses Matches.")
      } else if (msg.includes("tournament not active")) {
        setPinMessage("Das Turnier ist nicht mehr aktiv.")
      } else if (msg.includes("match not started")) {
        setPinMessage("Das Match wurde noch nicht gestartet. Ergebnis-Eingabe ist gesperrt.")
      } else if (msg.includes("opponent not set")) {
        setPinMessage("Der Gegner steht noch nicht fest.")
      } else {
        setPinMessage("Ergebnis konnte nicht gespeichert werden.")
      }

      setConfirmOpen(false)
      savingRef.current = false
      setSaving(false)
    }
  }

  if (loadingLabel) {
    return <TerminalLoader label={loadingLabel} />
  }

  if (externalResult) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.50]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(14,165,233,.17),transparent_28%),linear-gradient(180deg,rgba(4,6,9,.45),rgba(4,6,9,.90))]" />

        <div className="relative flex min-h-[100svh] items-center justify-center px-5">
          <div className="w-full max-w-3xl rounded-[42px] border border-cyan-300/20 bg-black/42 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-12">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10">
              <CheckCircle2 className="h-12 w-12 text-cyan-200" />
            </div>

            <div className="mt-6 text-[11px] font-black uppercase tracking-[0.32em] text-cyan-100/60">
              Ergebnis bereits eingetragen
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
              Match wurde extern abgeschlossen
            </h1>

            <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-right text-xl font-black sm:text-3xl">{externalResult.player1}</div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-4 text-4xl font-black sm:text-6xl">
                {externalResult.score1} : {externalResult.score2}
              </div>
              <div className="text-left text-xl font-black sm:text-3xl">{externalResult.player2}</div>
            </div>

            <div className="mt-7 text-sm font-semibold text-white/35">
              Terminal wird automatisch zur PIN-Eingabe zurückgesetzt …
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (savedResult) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.54]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(16,185,129,.16),transparent_28%),linear-gradient(180deg,rgba(4,6,9,.42),rgba(4,6,9,.88))]" />

        <div className="relative flex min-h-[100svh] items-center justify-center px-5">
          <div className="w-full max-w-3xl rounded-[42px] border border-emerald-300/20 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-12">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
            </div>

            <div className="mt-6 text-[11px] font-black uppercase tracking-[0.32em] text-emerald-200/60">
              Ergebnis gespeichert
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-right text-2xl font-black sm:text-4xl">{savedResult.player1}</div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-4 text-4xl font-black sm:text-6xl">
                {savedResult.score1} : {savedResult.score2}
              </div>
              <div className="text-left text-2xl font-black sm:text-4xl">{savedResult.player2}</div>
            </div>

            <div className="mt-7 text-sm font-semibold text-white/35">
              Terminal wird automatisch für den nächsten Spieler vorbereitet …
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (match) {
    return (
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.35),rgba(4,6,9,.86)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.17),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_30%)]" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetToPin}
              className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-black text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4" />
              Andere PIN
            </button>

            <div className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              Turniermodus aktiv
            </div>
          </header>

          <section className="mx-auto mt-6 max-w-6xl">
            <div className="text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-300/70">
                {match.tournament_name}
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                Ergebnis eintragen
              </h1>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-white/35">
                <span>Match #{match.match_id}</span>
                <>
                  <span>·</span>
                  {match.machine_number ? (
                    <span className="text-cyan-200/70">Board {match.machine_number}</span>
                  ) : (
                    <span className="text-orange-200/70">Noch nicht gestartet</span>
                  )}
                </>
                <span>·</span>
                <span>angemeldet als {match.member_name}</span>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
              <ScoreCard
                name={match.player1?.trim() || "Gegner offen"}
                score={score1}
                onMinus={() => bump(1, -1)}
                onPlus={() => bump(1, 1)}
                accent="orange"
                disabled={!matchStarted || !hasBothPlayers}
              />

              <div className="flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-xl font-black text-white/35 backdrop-blur-xl">
                  VS
                </div>
              </div>

              <ScoreCard
                name={match.player2?.trim() || "Gegner offen"}
                score={score2}
                onMinus={() => bump(2, -1)}
                onPlus={() => bump(2, 1)}
                accent="cyan"
                disabled={!matchStarted || !hasBothPlayers}
              />
            </div>

            {!matchStarted ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-orange-300/15 bg-orange-500/[0.07] px-4 py-3 text-center text-sm font-bold text-orange-100/75">
                Match noch nicht gestartet. Ergebnis-Eingabe ist erst nach Board-Zuweisung möglich.
              </div>
            ) : !hasBothPlayers ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] px-4 py-3 text-center text-sm font-bold text-cyan-100/75">
                Gegner noch offen. Sobald der Gegner feststeht, wird er automatisch angezeigt.
              </div>
            ) : score1 === score2 ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-orange-300/15 bg-orange-500/[0.07] px-4 py-3 text-center text-sm font-bold text-orange-100/70">
                Ein Unentschieden kann nicht gespeichert werden.
              </div>
            ) : null}

            {pinMessage ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-300/15 bg-red-500/[0.07] px-4 py-3 text-center text-sm font-bold text-red-100/75">
                {pinMessage}
              </div>
            ) : null}

            <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setScore1(0)
                  setScore2(0)
                }}
                className="flex h-16 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-base font-black text-white/55 transition hover:bg-white/[0.07]"
              >
                <RotateCcw className="h-5 w-5" />
                Ergebnis zurücksetzen
              </button>

              <button
                type="button"
                disabled={!canSubmit || saving}
                onClick={() => setConfirmOpen(true)}
                className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-base font-black text-white shadow-[0_18px_45px_-22px_rgba(249,115,22,.8)] transition enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Check className="h-5 w-5" />
                Ergebnis speichern
              </button>
            </div>
          </section>
        </div>

        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 backdrop-blur-md">
            <div className="w-full max-w-xl rounded-[36px] border border-orange-300/20 bg-[#0b0d10] p-6 shadow-2xl sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/10">
                <ShieldCheck className="h-7 w-7 text-orange-300" />
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                Ergebnis wirklich speichern?
              </h2>

              <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="text-right font-black">{match.player1?.trim() || "Gegner offen"}</div>
                  <div className="rounded-2xl bg-black/30 px-4 py-3 text-3xl font-black">
                    {score1} : {score2}
                  </div>
                  <div className="font-black">{match.player2?.trim() || "Gegner offen"}</div>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-white/40">
                Nach dem Speichern kann das Ergebnis am Terminal nicht mehr geändert werden.
                Eine Korrektur erfolgt über die Turnierleitung.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmOpen(false)}
                  className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] font-black text-white/60 transition hover:bg-white/[0.07]"
                >
                  Zurück
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveResult()}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-black text-white transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {saving ? "Wird gespeichert …" : "Ja, speichern"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  if (activeMatchCall && !terminalBusy) {
    return (
      <main className="relative min-h-[100svh] overflow-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.46]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.45),rgba(4,6,9,.90)),radial-gradient(circle_at_50%_32%,rgba(249,115,22,.22),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,.10),transparent_38%)]" />

        <div className="relative flex min-h-[100svh] items-center justify-center px-5">
          <div className="w-full max-w-6xl text-center">
            <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-orange-300/25 bg-orange-500/10 px-5 py-2.5 text-xs font-black uppercase tracking-[0.24em] text-orange-200 backdrop-blur-xl">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,.9)]" />
              Neuer Match-Aufruf
              <Volume2 className="h-4 w-4 text-orange-300/70" />
            </div>

            <div className="mt-7 animate-[terminalBoardPulse_1.05s_ease-in-out_infinite] text-[clamp(64px,10vw,150px)] font-black leading-none tracking-[-0.07em] text-orange-300 drop-shadow-[0_0_36px_rgba(249,115,22,.28)]">
              BOARD {activeMatchCall.machineNumber}
            </div>

            <div className="mx-auto mt-8 grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-5">
              <div className="rounded-[34px] border border-orange-300/18 bg-black/38 p-6 text-right shadow-2xl backdrop-blur-2xl sm:p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/45">
                  Spieler 1
                </div>
                <div className="mt-2 break-words text-[clamp(30px,4vw,66px)] font-black leading-[0.95] tracking-[-0.05em]">
                  {activeMatchCall.player1}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-5 py-4 text-2xl font-black text-white/35">
                VS
              </div>

              <div className="rounded-[34px] border border-cyan-300/18 bg-black/38 p-6 text-left shadow-2xl backdrop-blur-2xl sm:p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">
                  Spieler 2
                </div>
                <div className="mt-2 break-words text-[clamp(30px,4vw,66px)] font-black leading-[0.95] tracking-[-0.05em]">
                  {activeMatchCall.player2}
                </div>
              </div>
            </div>

            <div className="mt-8 text-xl font-black uppercase tracking-[0.24em] text-white/55">
              Bitte zum Board
            </div>

            <div className="mx-auto mt-6 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10">
              <div className="h-full origin-left animate-[terminalCallProgress_4.2s_linear_forwards] rounded-full bg-orange-400" />
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes terminalBoardPulse {
            0%, 100% { opacity: .88; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.025); }
          }
          @keyframes terminalCallProgress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.6]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.32),rgba(4,6,9,.82)),radial-gradient(circle_at_50%_0%,rgba(249,115,22,.18),transparent_32%)]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1500px] flex-col px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <TerminalLink
            href="/terminal/turniere"
            label="Turniermodus wird beendet"
            className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-black text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            Turniermodus beenden
          </TerminalLink>

          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            Turniermodus aktiv
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-3xl rounded-[42px] border border-orange-300/18 bg-black/38 p-6 shadow-2xl backdrop-blur-2xl sm:p-9">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-orange-300/20 bg-orange-500/10">
                <Target className="h-10 w-10 text-orange-300" />
              </div>

              <div className="mt-5 text-[11px] font-black uppercase tracking-[0.32em] text-orange-200/60">
                EMD Match Terminal
              </div>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                PIN eingeben
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-white/38">
                Einer der beiden Spieler gibt seine 4-stellige EMD-PIN ein.
                Das aktuelle offene Match wird automatisch geladen.
              </p>
            </div>

            <div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-5 w-5 rounded-full border transition ${
                    pin.length > index
                      ? "border-orange-300 bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,.55)]"
                      : "border-white/20 bg-white/[0.04]"
                  }`}
                />
              ))}
            </div>

            {pinMessage ? (
              <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-red-300/15 bg-red-500/[0.07] px-4 py-3 text-center text-sm font-bold text-red-100/75">
                {pinMessage}
              </div>
            ) : null}

            <div className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => addDigit(digit)}
                  className="h-18 rounded-[24px] border border-white/10 bg-white/[0.04] text-2xl font-black transition active:scale-95 hover:bg-white/[0.08]"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={removeDigit}
                className="flex h-18 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.04] text-white/45 transition active:scale-95 hover:bg-white/[0.08]"
              >
                <Delete className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={() => addDigit("0")}
                className="h-18 rounded-[24px] border border-white/10 bg-white/[0.04] text-2xl font-black transition active:scale-95 hover:bg-white/[0.08]"
              >
                0
              </button>

              <button
                type="button"
                disabled={pin.length !== 4}
                onClick={() => void loadMatch()}
                className="flex h-18 items-center justify-center rounded-[24px] bg-orange-500 text-white transition active:scale-95 enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-25"
              >
                <ArrowLeft className="h-6 w-6 rotate-180" />
              </button>
            </div>

            <div className="mt-6 text-center text-xs font-semibold text-white/25">
              Die Terminal-PIN wird einmalig in der EMD App im Mitgliederbereich festgelegt.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ScoreCard({
  name,
  score,
  onMinus,
  onPlus,
  accent,
  disabled = false,
}: {
  name: string
  score: number
  onMinus: () => void
  onPlus: () => void
  accent: "orange" | "cyan"
  disabled?: boolean
}) {
  const orange = accent === "orange"

  return (
    <div
      className={`rounded-[36px] border bg-black/35 p-6 text-center backdrop-blur-2xl sm:p-8 ${
        orange ? "border-orange-300/18" : "border-cyan-300/18"
      }`}
    >
      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${orange ? "text-orange-200/55" : "text-cyan-100/55"}`}>
        Spieler
      </div>

      <div className="mt-2 min-h-20 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
        {name}
      </div>

      <div className={`mt-5 text-8xl font-black tracking-[-0.08em] sm:text-9xl ${orange ? "text-orange-300" : "text-cyan-200"}`}>
        {score}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onMinus}
          disabled={disabled}
          className="flex h-18 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95 enabled:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-25"
        >
          <Minus className="h-7 w-7" />
        </button>

        <button
          type="button"
          onClick={onPlus}
          disabled={disabled}
          className={`flex h-18 items-center justify-center rounded-2xl border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 ${
            orange
              ? "border-orange-300/20 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15"
              : "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.12]"
          }`}
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </div>
  )
}

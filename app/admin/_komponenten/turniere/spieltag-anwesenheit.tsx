"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Loader2,
  Play,
  ShieldAlert,
  UserMinus,
  Users,
  UserX,
} from "lucide-react"

type RegistrationRow = {
  id: number
  player_id: string
  player_name: string
  registered_at: string | null
  created_at: string | null
  paid: boolean | null
}

type AttendanceRow = {
  id: string
  player_id: string
  status: "present" | "no_show" | "waiting_exempt"
}

type Props = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  noShowPenaltyMode: "none" | "delete_worst_result"
  requireEvenParticipants: boolean
  oddParticipantPolicy: "allow" | "last_waitlist"
  continueHref: string
  continueLabel: string
}

function ts(row: RegistrationRow) {
  return new Date(row.registered_at || row.created_at || 0).getTime()
}

export function MatchdayAttendance({
  seriesId,
  seriesName,
  eventId,
  eventName,
  noShowPenaltyMode,
  requireEvenParticipants,
  oddParticipantPolicy,
  continueHref,
  continueLabel,
}: Props) {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [existingAttendance, setExistingAttendance] = useState<AttendanceRow[]>([])
  const [noShows, setNoShows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const load = async () => {
    setLoading(true)
    setMessage("")

    try {
      const [{ data: regs, error: regError }, { data: att, error: attError }] = await Promise.all([
        supabase
          .from("dko_tournament_registration")
          .select("id,player_id,player_name,registered_at,created_at,paid")
          .eq("series_id", seriesId)
          .eq("event_id", eventId)
          .order("registered_at", { ascending: true }),
        supabase
          .from("dko_event_attendance")
          .select("id,player_id,status")
          .eq("event_id", eventId),
      ])

      if (regError) throw regError
      if (attError) throw attError

      const regRows = ((regs || []) as RegistrationRow[]).sort((a, b) => ts(a) - ts(b))
      const attRows = (att || []) as AttendanceRow[]

      setRegistrations(regRows)
      setExistingAttendance(attRows)

      const storedNoShows = new Set(
        attRows.filter((row) => row.status === "no_show").map((row) => String(row.player_id)),
      )
      setNoShows(storedNoShows)
    } catch (error: any) {
      setMessage(error?.message || "Anwesenheit konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [seriesId, eventId])

  const activeRegistrations = useMemo(
    () => registrations.filter((row) => !noShows.has(String(row.player_id))),
    [registrations, noShows],
  )

  const waitingPlayer = useMemo(() => {
    if (
      !requireEvenParticipants ||
      oddParticipantPolicy !== "last_waitlist" ||
      activeRegistrations.length === 0 ||
      activeRegistrations.length % 2 === 0
    ) {
      return null
    }

    return [...activeRegistrations].sort((a, b) => ts(a) - ts(b)).at(-1) || null
  }, [activeRegistrations, requireEvenParticipants, oddParticipantPolicy])

  const tournamentPlayers = useMemo(
    () =>
      activeRegistrations.filter(
        (row) => !waitingPlayer || String(row.player_id) !== String(waitingPlayer.player_id),
      ),
    [activeRegistrations, waitingPlayer],
  )

  const finalized =
    registrations.length > 0 &&
    existingAttendance.length >= registrations.length

  function toggleNoShow(playerId: string) {
    setNoShows((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  async function confirmAndContinue() {
    if (registrations.length === 0) {
      setMessage("Es sind keine Spieler für diesen Spieltag angemeldet.")
      return
    }

    if (tournamentPlayers.length < 2) {
      setMessage("Für einen Turnierstart sind zu wenige anwesende Spieler vorhanden.")
      return
    }

    setSaving(true)
    setMessage("")

    try {
      const now = new Date().toISOString()
      const waitingId = waitingPlayer ? String(waitingPlayer.player_id) : null

      const attendanceRows = registrations.map((reg) => {
        const playerId = String(reg.player_id)
        const isNoShow = noShows.has(playerId)
        const isWaiting = waitingId === playerId

        const status: "present" | "no_show" | "waiting_exempt" =
          isNoShow ? "no_show" : isWaiting ? "waiting_exempt" : "present"

        return {
          series_id: seriesId,
          event_id: eventId,
          registration_id: reg.id,
          player_id: reg.player_id,
          player_name: reg.player_name,
          status,
          no_show_penalty_mode:
            status === "no_show" ? noShowPenaltyMode : "none",
          penalty_pending:
            status === "no_show" && noShowPenaltyMode === "delete_worst_result",
          marked_at: now,
          updated_at: now,
        }
      })

      const { error: attendanceError } = await supabase
        .from("dko_event_attendance")
        .upsert(attendanceRows, { onConflict: "event_id,player_id" })

      if (attendanceError) throw attendanceError

      const noShowRows = registrations.filter((reg) => noShows.has(String(reg.player_id)))
      const nonNoShowRows = registrations.filter((reg) => !noShows.has(String(reg.player_id)))

      if (noShowPenaltyMode === "delete_worst_result" && noShowRows.length > 0) {
        const penaltyRows = noShowRows.map((reg) => ({
          series_id: seriesId,
          event_id: eventId,
          player_id: reg.player_id,
          player_name: reg.player_name,
          penalty_type: "delete_worst_result",
          status: "pending",
          source: "no_show",
          updated_at: now,
        }))

        const { error: penaltyError } = await supabase
          .from("dko_series_penalties")
          .upsert(penaltyRows, { onConflict: "event_id,player_id,penalty_type" })

        if (penaltyError) throw penaltyError
      }

      // Falls ein früher markierter No-Show doch anwesend ist, alte Strafe stornieren.
      for (const reg of nonNoShowRows) {
        const { error } = await supabase
          .from("dko_series_penalties")
          .update({ status: "cancelled", updated_at: now })
          .eq("event_id", eventId)
          .eq("player_id", reg.player_id)
          .eq("penalty_type", "delete_worst_result")
          .eq("status", "pending")

        if (error) throw error
      }

      setMessage(
        waitingPlayer
          ? `${tournamentPlayers.length} Spieler starten. ${waitingPlayer.player_name} wartet wegen ungerader Spielerzahl und erhält keine Strafe.`
          : `${tournamentPlayers.length} Spieler starten.`,
      )

      router.push(continueHref)
    } catch (error: any) {
      setMessage(error?.message || "Anwesenheit konnte nicht gespeichert werden.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Anwesenheit wird geladen…
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-fuchsia-300/[0.14] bg-[linear-gradient(135deg,rgba(217,70,239,.07),rgba(0,0,0,.20))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-white">
            <ShieldAlert className="h-4 w-4 text-fuchsia-200" />
            Anwesenheit & Turnierstart
          </div>
          <div className="mt-1 text-xs font-semibold text-white/40">
            {eventName} · {seriesName}
          </div>
        </div>

        <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-white/55">
          {registrations.length} angemeldet
        </div>
      </div>

      {noShowPenaltyMode === "delete_worst_result" ? (
        <div className="mt-3 rounded-xl border border-rose-300/10 bg-rose-500/[0.05] px-3 py-2 text-xs font-semibold text-rose-100/70">
          Nicht angetretene Spieler erhalten die hinterlegte No-Show-Strafe.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {registrations.length === 0 ? (
          <div className="text-sm text-white/40">Keine Anmeldungen für diesen Spieltag.</div>
        ) : (
          registrations.map((reg) => {
            const id = String(reg.player_id)
            const isNoShow = noShows.has(id)
            const isWaiting =
              !isNoShow &&
              !!waitingPlayer &&
              String(waitingPlayer.player_id) === id

            return (
              <div
                key={reg.id}
                className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  isNoShow
                    ? "border-rose-300/15 bg-rose-500/[0.06]"
                    : isWaiting
                      ? "border-orange-300/15 bg-orange-500/[0.06]"
                      : "border-emerald-300/10 bg-emerald-500/[0.04]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white/90">{reg.player_name}</div>
                  <div className="mt-1 text-xs font-semibold">
                    {isNoShow ? (
                      <span className="text-rose-200/80">Nicht angetreten · Strafe</span>
                    ) : isWaiting ? (
                      <span className="text-orange-200/80">Wartet · keine Strafe</span>
                    ) : (
                      <span className="text-emerald-200/75">Anwesend · spielt</span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleNoShow(id)}
                  className={`h-9 rounded-xl ${
                    isNoShow
                      ? "border-emerald-300/20 bg-emerald-500/[0.06] text-emerald-100 hover:bg-emerald-500/[0.10]"
                      : "border-rose-300/20 bg-transparent text-rose-100 hover:bg-rose-500/[0.08]"
                  }`}
                >
                  {isNoShow ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Doch anwesend
                    </>
                  ) : (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Nicht da
                    </>
                  )}
                </Button>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Spielt" value={tournamentPlayers.length} />
        <MiniStat label="No-Show" value={noShows.size} />
        <MiniStat label="Wartet" value={waitingPlayer ? 1 : 0} />
      </div>

      {waitingPlayer ? (
        <div className="mt-3 rounded-xl border border-orange-300/15 bg-orange-500/[0.06] px-3 py-2 text-xs font-semibold text-orange-100/75">
          {waitingPlayer.player_name} war von den anwesenden Spielern zuletzt angemeldet und wartet deshalb. Dafür gibt es ausdrücklich keine Strafe.
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs font-semibold text-white/60">
          {message}
        </div>
      ) : null}

      <Button
        type="button"
        disabled={saving || registrations.length === 0 || tournamentPlayers.length < 2}
        onClick={() => void confirmAndContinue()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300/25 bg-orange-500 py-5 font-black text-white shadow-[0_14px_32px_-20px_rgba(249,115,22,.55)] transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
        {finalized ? continueLabel : `Anwesenheit bestätigen & ${continueLabel}`}
      </Button>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-2.5 text-center">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">{label}</div>
    </div>
  )
}

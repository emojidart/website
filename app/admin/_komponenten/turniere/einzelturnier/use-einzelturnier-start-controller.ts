"use client"

import { useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  buildDkoStartRoute,
  buildTournamentContinueRoute,
  createRoundRobinWithSchedule,
  createTournamentIdCompat,
} from "./einzelturnier-engine"
import { markCentralEventStarted } from "./einzelturnier-central-event"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

type TournamentMode = "dko" | "round_robin"

type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  paid: boolean
}

type Options = {
  registeredPlayers: RegisteredPlayer[]
  tournamentName: string
  tournamentAccessType: TournamentAccessType
  tournamentMode: TournamentMode
  rrGroupCount: number
  tournamentSize: number
  centralEventId: string | null
  seriesId: string | null
  eventId: string | null
  allPlayersPaid: boolean
  setShowNameWarning: (value: boolean) => void
  setShowPaymentWarning: (value: boolean) => void
  push: (url: string) => void
}

export function useEinzelturnierStartController(options: Options) {
  const {
    registeredPlayers,
    tournamentName,
    tournamentAccessType,
    tournamentMode,
    rrGroupCount,
    tournamentSize,
    centralEventId,
    seriesId,
    eventId,
    allPlayersPaid,
    setShowNameWarning,
    setShowPaymentWarning,
    push,
  } = options

  const [startingTournament, setStartingTournament] = useState(false)
  const startClickLock = useRef(false)

  const executeStartTournament = async () => {
    if (registeredPlayers.length === 0) {
      alert("Bitte registriere mindestens einen Spieler!")
      return
    }

    if (!tournamentName.trim()) {
      setShowNameWarning(true)
      return
    }

    if (!tournamentAccessType) {
      alert("Bitte zuerst die Turnierart festlegen.")
      return
    }

    if (!allPlayersPaid) {
      setShowPaymentWarning(true)
      return
    }

    // Serien- und Zentral-Turniere dürfen pro Event nur einen aktiven Lauf haben.
    // Wenn bereits einer existiert (z. B. nach Reload/Seite verlassen), öffnen wir genau diesen wieder.
    if (eventId || centralEventId) {
      let existingQuery = supabase
        .from("tournaments_status")
        .select("tournament_id,tournament_type,tournament_name,access_type")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)

      if (eventId) {
        existingQuery = existingQuery.eq("series_event_id", eventId)
        if (seriesId) existingQuery = existingQuery.eq("series_id", seriesId)
      } else if (centralEventId) {
        existingQuery = existingQuery.eq("central_event_id", centralEventId)
      }

      const { data: existing, error: existingError } = await existingQuery.maybeSingle()
      if (existingError) {
        console.error("Aktives Turnier konnte nicht geprüft werden:", existingError)
        alert("Turnierstatus konnte nicht geprüft werden. Bitte versuche es erneut.")
        return
      }

      if (existing) {
        push(
          buildTournamentContinueRoute({
            tournamentType: existing.tournament_type,
            tournamentId: existing.tournament_id,
            tournamentName: existing.tournament_name || tournamentName.trim(),
            accessType: (existing.access_type || tournamentAccessType || "public") as TournamentAccessType,
            seriesId,
            eventId,
          }),
        )
        return
      }
    }

    const encodedName = encodeURIComponent(tournamentName.trim())

    if (tournamentMode === "round_robin") {
      try {
        setStartingTournament(true)

        const rrPlayers = registeredPlayers
          .filter((player) => player.player_id && player.player_name)
          .map((player) => ({
            id: String(player.player_id),
            name: String(player.player_name),
          }))

        if (rrPlayers.length < 2) {
          alert("Für Round Robin brauchst du mindestens 2 Spieler.")
          return
        }

        const groupCount = Math.max(1, Math.min(8, rrGroupCount || 1))

        const { roundRobinId } = await createRoundRobinWithSchedule({
          name: tournamentName.trim(),
          groupCount,
          players: rrPlayers,
          accessType: tournamentAccessType as Exclude<TournamentAccessType, "">,
          centralEventId,
          seriesId,
          eventId,
        })

        if (centralEventId) {
          await markCentralEventStarted(centralEventId, "round_robin")
        }

        push(
          `/roundrobin?roundRobinId=${roundRobinId}&tournamentName=${encodedName}&accessType=${encodeURIComponent(
            tournamentAccessType,
          )}${seriesId ? `&seriesId=${encodeURIComponent(seriesId)}` : ""}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`,
        )
        return
      } catch (error) {
        console.error("[RR] start error:", error)
        alert(
          "Fehler beim Starten des Round Robin Turniers. Schau Console / Supabase Logs.",
        )
        return
      } finally {
        setStartingTournament(false)
      }
    }

    const tournamentId = createTournamentIdCompat()
    const normalizedTournamentSize = [8, 16, 32, 64, 128].includes(tournamentSize)
      ? tournamentSize
      : 16
    const tournamentType = `${normalizedTournamentSize}er_dko`

    // Den Laufstatus schon VOR dem Seitenwechsel setzen. Dadurch erkennen EMD TV,
    // Terminal und die Turnier-Zentrale das Turnier sofort – auch wenn die DKO-Seite
    // noch lädt oder der Browser direkt danach verlassen wird.
    try {
      const { error: statusError } = await supabase.from("tournaments_status").insert({
        tournament_id: tournamentId,
        tournament_type: tournamentType,
        tournament_name: tournamentName.trim(),
        access_type: tournamentAccessType,
        status: "active",
        central_event_id: centralEventId || null,
        series_id: seriesId || null,
        series_event_id: eventId || null,
      })

      if (statusError && (statusError as any).code === "23505") {
        let duplicateQuery = supabase
          .from("tournaments_status")
          .select("tournament_id,tournament_type,tournament_name,access_type")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)

        if (eventId) {
          duplicateQuery = duplicateQuery.eq("series_event_id", eventId)
          if (seriesId) duplicateQuery = duplicateQuery.eq("series_id", seriesId)
        } else if (centralEventId) {
          duplicateQuery = duplicateQuery.eq("central_event_id", centralEventId)
        } else {
          duplicateQuery = duplicateQuery.eq("tournament_id", tournamentId)
        }

        const { data: existing } = await duplicateQuery.maybeSingle()
        if (existing) {
          push(
            buildTournamentContinueRoute({
              tournamentType: existing.tournament_type,
              tournamentId: existing.tournament_id,
              tournamentName: existing.tournament_name || tournamentName.trim(),
              accessType: (existing.access_type || tournamentAccessType || "public") as TournamentAccessType,
              seriesId,
              eventId,
            }),
          )
          return
        }
      }

      if (statusError) throw statusError
    } catch (error) {
      console.error("Turnier-Laufstatus konnte nicht gesetzt werden:", error)
      alert("Turnier konnte nicht gestartet werden. Bitte versuche es erneut.")
      return
    }

    if (centralEventId) {
      try {
        await markCentralEventStarted(centralEventId, "dko")
      } catch (error) {
        // Kein halbfertiger Zustand: falls die Zentrale nicht auf started gesetzt werden kann,
        // den zuvor erzeugten aktiven Laufstatus wieder zurücknehmen.
        await supabase
          .from("tournaments_status")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("tournament_id", tournamentId)
        console.error("Zentraler Turnierstatus konnte nicht gesetzt werden:", error)
        alert("Turnierstatus konnte nicht gespeichert werden. Bitte versuche es erneut.")
        return
      }
    }

    push(
      buildDkoStartRoute({
        tournamentSize: normalizedTournamentSize,
        tournamentId,
        tournamentName: tournamentName.trim(),
        accessType: tournamentAccessType,
        seriesId,
        eventId,
      }),
    )
  }

  const handleStartTournament = async () => {
    if (startClickLock.current) return
    startClickLock.current = true
    setStartingTournament(true)
    try {
      await executeStartTournament()
    } finally {
      startClickLock.current = false
      setStartingTournament(false)
    }
  }

  return {
    startingTournament,
    handleStartTournament,
  }
}

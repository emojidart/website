"use client"

import { useState } from "react"
import {
  buildDkoStartRoute,
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

  const handleStartTournament = async () => {
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

    if (centralEventId) {
      try {
        await markCentralEventStarted(centralEventId, tournamentMode)
      } catch (error) {
        console.error(
          "Zentraler Turnierstatus konnte nicht gesetzt werden:",
          error,
        )
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
        })

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

    push(
      buildDkoStartRoute({
        tournamentSize,
        tournamentId,
        tournamentName: tournamentName.trim(),
        accessType: tournamentAccessType,
        seriesId,
        eventId,
      }),
    )
  }

  return {
    startingTournament,
    handleStartTournament,
  }
}

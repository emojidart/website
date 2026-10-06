"use client"

import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import {
  fetchFrequentPlayersData,
  fetchPlayersData,
  fetchRegisteredPlayersData,
  fetchSeriesPrefillData,
} from "./einzelturnier-daten"
import {
  getPlayerEligibilityFromMap,
  loadEligibilityMapData,
  verifyPlayerEligibility,
} from "./einzelturnier-berechtigungen"
import type {
  PlayerEligibility,
  TournamentAccessType,
} from "./einzelturnier-berechtigungen"
import { fetchActiveTournamentData } from "./einzelturnier-aktives-turnier"

type Player = {
  id: number
  name: string
}

type PlayerWithFrequency = Player & {
  playCount: number
  lastPlayed: string | null
}

type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid: boolean
  entry_fee: number
  deducted_from_credit?: boolean | string
  payment_method?: string | null
  access_type?: TournamentAccessType | null
}

type ActiveTournament = {
  tournamentId: string
  tournamentName: string
  tournamentType: string
  accessType?: TournamentAccessType | null
  incompleteMatches: number
}

type Options = {
  seriesId: string | null
  eventId: string | null
  centralEventId: string | null
  tournamentName: string
  tournamentEntryFee: string
  tournamentAccessType: TournamentAccessType
  availablePlayers: Player[]
  setAvailablePlayers: Dispatch<SetStateAction<Player[]>>
  setFrequentPlayers: Dispatch<SetStateAction<PlayerWithFrequency[]>>
  setRegisteredPlayers: Dispatch<SetStateAction<RegisteredPlayer[]>>
  setTournamentName: Dispatch<SetStateAction<string>>
  setTournamentEntryFee: Dispatch<SetStateAction<string>>
  setTournamentAccessType: Dispatch<SetStateAction<TournamentAccessType>>
  setSelectedPlayers: Dispatch<SetStateAction<Set<number>>>
  setDoublePlayer1Id: Dispatch<SetStateAction<string>>
  setDoublePlayer2Id: Dispatch<SetStateAction<string>>
  setActiveTournament: Dispatch<SetStateAction<ActiveTournament | null>>
  setLoading: Dispatch<SetStateAction<boolean>>
}

export function useEinzelturnierSetupDaten(options: Options) {
  const {
    seriesId,
    eventId,
    centralEventId,
    tournamentName,
    tournamentEntryFee,
    tournamentAccessType,
    availablePlayers,
    setAvailablePlayers,
    setFrequentPlayers,
    setRegisteredPlayers,
    setTournamentName,
    setTournamentEntryFee,
    setTournamentAccessType,
    setSelectedPlayers,
    setDoublePlayer1Id,
    setDoublePlayer2Id,
    setActiveTournament,
    setLoading,
  } = options

  const [isSeriesPrefilled, setIsSeriesPrefilled] = useState(false)
  const [tournamentFormCompleted, setTournamentFormCompleted] = useState(false)
  const [eligibilityByPlayerId, setEligibilityByPlayerId] = useState<Record<string, PlayerEligibility>>({})
  const [eligibilityLoading, setEligibilityLoading] = useState(false)

  const getPlayerEligibility = (playerId: number | string): PlayerEligibility =>
    getPlayerEligibilityFromMap({
      playerId,
      accessType: tournamentAccessType,
      eligibilityByPlayerId,
      eligibilityLoading,
    })

  const ensurePlayersEligible = async (playerIds: Array<number | string>) => {
    for (const playerId of playerIds) {
      const result = await verifyPlayerEligibility(playerId, tournamentAccessType)
      if (!result.eligible) {
        const player = availablePlayers.find((item) => String(item.id) === String(playerId))
        alert(`${player?.name || "Spieler"} kann nicht hinzugefügt werden: ${result.reason}`)
        return false
      }
    }
    return true
  }

  const fetchPlayers = async () => {
    try {
      setAvailablePlayers(await fetchPlayersData())
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredPlayers = async () => {
    try {
      const rows = await fetchRegisteredPlayersData(centralEventId)
      setRegisteredPlayers(rows)

      const savedAccessType = rows.find((row) => row.access_type)?.access_type
      if (
        !tournamentAccessType &&
        (savedAccessType === "public" ||
          savedAccessType === "club_internal" ||
          savedAccessType === "club_external")
      ) {
        setTournamentAccessType(savedAccessType)
      }
    } catch (error) {
      console.error("Fehler beim Laden der registrierten Spieler:", error)
    }
  }

  const fetchFrequentPlayers = async () => {
    try {
      setFrequentPlayers(await fetchFrequentPlayersData())
    } catch (error) {
      console.error("Fehler beim Laden der häufig gespielten Spieler:", error)
      setFrequentPlayers([])
    }
  }

  const checkForActiveTournament = async () => {
    try {
      setActiveTournament(await fetchActiveTournamentData({ centralEventId, seriesId, eventId }))
    } catch (error) {
      console.error("Fehler beim Prüfen auf aktives Turnier:", error)
      setActiveTournament(null)
    }
  }

  useEffect(() => {
    const prefillFromSeries = async () => {
      if (!seriesId) {
        setIsSeriesPrefilled(false)
        return
      }

      try {
        const data = await fetchSeriesPrefillData(seriesId)
        if (!data) {
          console.warn("[DKO] Keine Series gefunden für seriesId:", seriesId)
          setIsSeriesPrefilled(false)
          return
        }

        if (data.name) setTournamentName(String(data.name))
        if (data.startgeld !== null && data.startgeld !== undefined) {
          setTournamentEntryFee(String(data.startgeld))
        }

        if (
          data.access_type === "public" ||
          data.access_type === "club_internal" ||
          data.access_type === "club_external"
        ) {
          setTournamentAccessType(data.access_type)
        }

        setIsSeriesPrefilled(true)
      } catch (error) {
        console.error("[DKO] Fehler beim Prefill aus Series:", error)
        setIsSeriesPrefilled(false)
      }
    }

    void prefillFromSeries()
  }, [seriesId])

  useEffect(() => {
    void fetchPlayers()
    void fetchRegisteredPlayers()
    void checkForActiveTournament()
    void fetchFrequentPlayers()
    // Bestehendes Verhalten: Initialdaten nur beim Öffnen laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setTournamentFormCompleted(
      tournamentName.trim() !== "" &&
        tournamentEntryFee.trim() !== "" &&
        tournamentAccessType !== "",
    )
  }, [tournamentName, tournamentEntryFee, tournamentAccessType])

  useEffect(() => {
    setSelectedPlayers(new Set())
    setDoublePlayer1Id("")
    setDoublePlayer2Id("")

    const loadEligibility = async () => {
      if (!tournamentAccessType || tournamentAccessType === "public") {
        setEligibilityByPlayerId({})
        setEligibilityLoading(false)
        return
      }

      try {
        setEligibilityLoading(true)
        setEligibilityByPlayerId(await loadEligibilityMapData(tournamentAccessType))
      } catch (error) {
        console.error("Fehler beim Laden der Turnier-Berechtigungen:", error)
        setEligibilityByPlayerId({})
      } finally {
        setEligibilityLoading(false)
      }
    }

    void loadEligibility()
  }, [tournamentAccessType])

  return {
    isSeriesPrefilled,
    tournamentFormCompleted,
    eligibilityLoading,
    getPlayerEligibility,
    ensurePlayersEligible,
    fetchPlayers,
    fetchRegisteredPlayers,
    fetchFrequentPlayers,
  }
}

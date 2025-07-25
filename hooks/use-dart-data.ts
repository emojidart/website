"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface PlayerData {
  id: string
  name: string
  participations: number
  points: number
  legs: number
  totalPoints: number
}

export interface CombinedPlayerData {
  name: string
  edartParticipations: number
  edartPoints: number
  edartLegs: number
  steelParticipations: number
  steelPoints: number
  steelLegs: number
  totalParticipations: number
  totalPoints: number
  totalLegs: number
}

export function useDartData() {
  const [edartPlayers, setEdartPlayers] = useState<PlayerData[]>([])
  const [steelDartPlayers, setSteelDartPlayers] = useState<PlayerData[]>([])
  const [combinedPlayers, setCombinedPlayers] = useState<CombinedPlayerData[]>([])
  const [currentPot, setCurrentPot] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async (tableName: string): Promise<PlayerData[]> => {
    const { data, error } = await supabase.from(tableName).select("*")
    if (error) {
      console.error(`Fehler beim Laden der ${tableName}-Daten:`, error.message)
      setError(error.message)
      return []
    }
    return data
      .map((p) => ({
        ...p,
        totalPoints: p.points + p.legs,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [])

  const fetchAndDisplayPot = useCallback(async () => {
    const { data, error } = await supabase.from("pot_total").select("amount").single()
    if (error) {
      console.error("Fehler beim Laden des Pots:", error.message)
      setError(error.message)
      setCurrentPot(0)
      return
    }
    setCurrentPot(Number.parseFloat(data.amount))
  }, [])

  const fetchAndRenderAllTables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const edartData = await fetchPlayers("edart_players")
      const steelDartData = await fetchPlayers("steel_dart_players")

      setEdartPlayers(edartData)
      setSteelDartPlayers(steelDartData)
      renderCombinedTable(edartData, steelDartData)
      await fetchAndDisplayPot()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchPlayers, fetchAndDisplayPot])

  const renderCombinedTable = useCallback((edartData: PlayerData[], steelDartData: PlayerData[]) => {
    const allPlayersMap = new Map<string, CombinedPlayerData>()

    edartData.forEach((player) => {
      allPlayersMap.set(player.name, {
        name: player.name,
        edartParticipations: player.participations,
        edartPoints: player.points,
        edartLegs: player.legs,
        steelParticipations: 0,
        steelPoints: 0,
        steelLegs: 0,
        totalParticipations: player.participations,
        totalPoints: player.totalPoints,
        totalLegs: player.legs,
      })
    })

    steelDartData.forEach((player) => {
      if (allPlayersMap.has(player.name)) {
        const existingPlayer = allPlayersMap.get(player.name)!
        existingPlayer.steelParticipations += player.participations
        existingPlayer.steelPoints += player.points
        existingPlayer.steelLegs += player.legs
        existingPlayer.totalParticipations += player.participations
        existingPlayer.totalPoints += player.totalPoints
        existingPlayer.totalLegs += player.legs
      } else {
        allPlayersMap.set(player.name, {
          name: player.name,
          edartParticipations: 0,
          edartPoints: 0,
          edartLegs: 0,
          steelParticipations: player.participations,
          steelPoints: player.points,
          steelLegs: player.legs,
          totalParticipations: player.participations,
          totalPoints: player.totalPoints,
          totalLegs: player.legs,
        })
      }
    })

    const combinedPlayersArray = Array.from(allPlayersMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)
    setCombinedPlayers(combinedPlayersArray)
  }, [])

  useEffect(() => {
    fetchAndRenderAllTables()
  }, [fetchAndRenderAllTables])

  return {
    edartPlayers,
    steelDartPlayers,
    combinedPlayers,
    currentPot,
    loading,
    error,
    fetchAndRenderAllTables,
    fetchPlayers, // Expose for player list modal
  }
}

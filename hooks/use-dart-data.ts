"use client"

import { useEffect } from "react"

import { useCallback } from "react"

import { useState } from "react"

import { supabase } from "@/lib/supabase"

export interface PlayerData {
  id: string
  name: string
  points: number
  legs: number
  participations: number
  user_id: string
  created_at: string
  profile_picture_url?: string // Hinzugefügt
}

export interface CombinedPlayerData {
  name: string
  edartPoints: number
  steelPoints: number
  totalPoints: number
  totalParticipations: number
  totalLegs: number
  edartParticipations: number
  steelParticipations: number
  profile_picture_url?: string // Hinzugefügt
}

export interface GameEntry {
  id: string
  player_name: string
  game_type: "edart" | "steeldart"
  points: number
  legs: number
  game_date: string
  user_id: string
  created_at: string
}

// Funktion zur Neuberechnung der Spielerstatistiken
export const recalculatePlayerStats = async (
  playerName: string,
  gameType: "edart" | "steeldart",
  newProfilePictureUrl?: string | null, // Neuer optionaler Parameter
) => {
  try {
    const tableName = gameType === "edart" ? "edart_players" : "steel_dart_players"

    // Alle Spieleinträge für diesen Spieler und Spieltyp abrufen
    const { data: gameEntries, error: entriesError } = await supabase
      .from("game_entries")
      .select("points, legs")
      .eq("player_name", playerName)
      .eq("game_type", gameType)

    if (entriesError) throw entriesError

    let totalPoints = 0
    let totalLegs = 0
    let totalParticipations = 0

    if (gameEntries && gameEntries.length > 0) {
      totalPoints = gameEntries.reduce((sum, entry) => sum + entry.points, 0)
      totalLegs = gameEntries.reduce((sum, entry) => sum + entry.legs, 0)
      totalParticipations = gameEntries.length
    }

    // Spieler in der Haupttabelle suchen
    const { data: existingPlayer, error: fetchPlayerError } = await supabase
      .from(tableName)
      .select("*") // Geändert von "id" zu "*"
      .eq("name", playerName)
      .single()

    if (fetchPlayerError && fetchPlayerError.code !== "PGRST116") {
      // PGRST116 means "no rows found"
      throw fetchPlayerError
    }

    const updateData: {
      points: number
      legs: number
      participations: number
      profile_picture_url?: string | null // Bedingt hinzufügen
    } = {
      points: totalPoints,
      legs: totalLegs,
      participations: totalParticipations,
    }

    // Nur aktualisieren, wenn newProfilePictureUrl explizit übergeben wird (kann auch null sein, um zu löschen)
    if (newProfilePictureUrl !== undefined) {
      updateData.profile_picture_url = newProfilePictureUrl
    }

    if (existingPlayer) {
      // Spieler existiert, aktualisieren
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData) // updateData verwenden
        .eq("id", existingPlayer.id)

      if (updateError) throw updateError
    } else {
      // Spieler existiert nicht, neu anlegen (sollte durch AdminPanel verhindert werden, aber als Fallback)
      const { error: insertError } = await supabase.from(tableName).insert([
        {
          name: playerName,
          points: totalPoints,
          legs: totalLegs,
          participations: totalParticipations,
          profile_picture_url: newProfilePictureUrl || null, // Für neue Spieler
          // user_id: (optional, if needed for initial player creation)
        },
      ])
      if (insertError) throw insertError
    }
  } catch (error) {
    console.error("Fehler beim Neuberechnen der Spielerstatistiken:", error)
    throw error
  }
}

const fetchCombinedPlayers = async (): Promise<CombinedPlayerData[]> => {
  try {
    // Select profile_picture_url as well
    const [edartData, steelData] = await Promise.all([
      supabase.from("edart_players").select("*, profile_picture_url"),
      supabase.from("steel_dart_players").select("*, profile_picture_url"),
    ])

    if (edartData.error) throw edartData.error
    if (steelData.error) throw steelData.error

    const playerMap = new Map<string, CombinedPlayerData>()

    // Process E-Dart players
    edartData.data?.forEach((player) => {
      playerMap.set(player.name, {
        name: player.name,
        edartPoints: player.points || 0,
        steelPoints: 0,
        totalPoints: player.points || 0, // Use player.points for totalPoints initially
        totalParticipations: player.participations || 0, // Use player.participations for totalParticipations initially
        totalLegs: player.legs || 0, // Use player.legs for totalLegs initially
        edartParticipations: player.participations || 0,
        steelParticipations: 0,
        profile_picture_url: player.profile_picture_url || undefined, // Pass the URL
      })
    })

    // Process Steel Dart players
    steelData.data?.forEach((player) => {
      const existing = playerMap.get(player.name)
      if (existing) {
        existing.steelPoints = player.points || 0
        existing.totalPoints = (existing.edartPoints || 0) + (player.points || 0) // Sum points from both types
        existing.totalParticipations = (existing.edartParticipations || 0) + (player.participations || 0) // Sum participations
        existing.totalLegs = (existing.totalLegs || 0) + (player.legs || 0) // Sum legs
        existing.steelParticipations = player.participations || 0
        // Prioritize steel dart profile picture if edart didn't have one, or if it's newer/preferred
        if (player.profile_picture_url) {
          existing.profile_picture_url = player.profile_picture_url
        }
      } else {
        playerMap.set(player.name, {
          name: player.name,
          edartPoints: 0,
          steelPoints: player.points || 0,
          totalPoints: player.points || 0,
          totalParticipations: player.participations || 0,
          totalLegs: player.legs || 0,
          edartParticipations: 0,
          steelParticipations: player.participations || 0,
          profile_picture_url: player.profile_picture_url || undefined,
        })
      }
    })

    return Array.from(playerMap.values())
  } catch (error) {
    console.error("Error fetching combined players:", error)
    throw error
  }
}

export const useDartData = () => {
  const [edartPlayers, setEdartPlayers] = useState<PlayerData[]>([])
  const [steelDartPlayers, setSteelDartPlayers] = useState<PlayerData[]>([])
  const [combinedPlayers, setCombinedPlayers] = useState<CombinedPlayerData[]>([])
  const [currentPot, setCurrentPot] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = async (tableName: string): Promise<PlayerData[]> => {
    // Select profile_picture_url here too
    const { data, error } = await supabase
      .from(tableName)
      .select("*, profile_picture_url")
      .order("points", { ascending: false })
    if (error) throw error
    return data || []
  }

  const fetchPot = async () => {
    const { data, error } = await supabase.from("pot_total").select("amount").single()
    if (error) throw error
    return data.amount || 0
  }

  const fetchAndRenderAllTables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [edart, steel, pot, combined] = await Promise.all([
        fetchPlayers("edart_players"),
        fetchPlayers("steel_dart_players"),
        fetchPot(),
        fetchCombinedPlayers(),
      ])
      setEdartPlayers(edart)
      setSteelDartPlayers(steel)
      setCurrentPot(pot)
      setCombinedPlayers(combined)
    } catch (err: any) {
      console.error("Failed to fetch dart data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
    fetchPlayers, // Expose fetchPlayers for PlayerListModal
    recalculatePlayerStats, // Expose recalculatePlayerStats
  }
}

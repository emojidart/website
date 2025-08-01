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
  edartLegs: number // Neu: Legs für E-Dart
  steelLegs: number // Neu: Legs für Steel Dart
  totalLegs: number // Vorhanden, aber sicherstellen, dass es korrekt summiert wird
  totalParticipations: number
  combinedScore: number // Neu: Punkte + Legs
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

// Neue Interfaces für die Turnierhistorie
export interface HistoricalPlayerResult {
  player_name: string;
  points: number;
  legs: number;
  combinedScore: number; // points + legs for this specific game entry
  profile_picture_url?: string;
}

export interface TournamentSummary {
  date: string;
  gameType: "edart" | "steeldart";
  totalParticipants: number;
  totalPoints: number;
  totalLegs: number;
  rankedPlayers: HistoricalPlayerResult[]; // Players ranked for this specific tournament
}

export interface GroupedTournamentHistory {
  edart?: TournamentSummary[];
  steeldart?: TournamentSummary[];
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
        edartLegs: player.legs || 0, // E-Dart Legs
        steelLegs: 0,
        totalPoints: player.points || 0,
        totalParticipations: player.participations || 0,
        totalLegs: player.legs || 0, // Initial total legs from E-Dart
        combinedScore: (player.points || 0) + (player.legs || 0), // Initial combined score
        edartParticipations: player.participations || 0,
        steelParticipations: 0,
        profile_picture_url: player.profile_picture_url || undefined,
      })
    })

    // Process Steel Dart players
    steelData.data?.forEach((player) => {
      const existing = playerMap.get(player.name)
      if (existing) {
        existing.steelPoints = player.points || 0
        existing.steelLegs = player.legs || 0 // Steel Dart Legs
        existing.totalPoints = (existing.edartPoints || 0) + (player.points || 0)
        existing.totalParticipations = (existing.edartParticipations || 0) + (player.participations || 0)
        existing.totalLegs = (existing.edartLegs || 0) + (player.legs || 0) // Sum legs from both types
        existing.combinedScore = existing.totalPoints + existing.totalLegs // Update combined score
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
          edartLegs: 0,
          steelLegs: player.legs || 0,
          totalPoints: player.points || 0,
          totalParticipations: player.participations || 0,
          totalLegs: player.legs || 0,
          combinedScore: (player.points || 0) + (player.legs || 0),
          edartParticipations: 0,
          steelParticipations: player.participations || 0,
          profile_picture_url: player.profile_picture_url || undefined,
        })
      }
    })

    // Sort players by combinedScore in descending order
    const sortedPlayers = Array.from(playerMap.values()).sort((a, b) => b.combinedScore - a.combinedScore)

    return sortedPlayers
  } catch (error) {
    console.error("Error fetching combined players:", error)
    throw error
  }
}

const fetchGroupedGameHistory = async (): Promise<GroupedTournamentHistory> => {
  try {
    const { data: gameEntries, error: entriesError } = await supabase
      .from("game_entries")
      .select("id, player_name, game_type, points, legs, game_date, created_at")
      .order("game_date", { ascending: false }) // Sort by date descending

    if (entriesError) throw entriesError

    const grouped: GroupedTournamentHistory = {
      edart: [],
      steeldart: [],
    };

    // Fetch all player profile pictures once
    const { data: allPlayers, error: playersError } = await supabase
      .from("players")
      .select("name, profile_picture_url");

    if (playersError) throw playersError;
    const playerProfileMap = new Map(allPlayers?.map(p => [p.name, p.profile_picture_url]));


    // Group entries by game type and date
    const tempGrouped: { [gameType: string]: { [date: string]: GameEntry[] } } = {};
    gameEntries?.forEach(entry => {
      if (!tempGrouped[entry.game_type]) {
        tempGrouped[entry.game_type] = {};
      }
      if (!tempGrouped[entry.game_type][entry.game_date]) {
        tempGrouped[entry.game_type][entry.game_date] = [];
      }
      tempGrouped[entry.game_type][entry.game_date].push(entry);
    });

    // Process each game type and date to create TournamentSummary
    for (const gameType of ["edart", "steeldart"]) {
      if (tempGrouped[gameType]) {
        const dates = Object.keys(tempGrouped[gameType]).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Sort dates descending

        for (const date of dates) {
          const entriesForDate = tempGrouped[gameType][date];
          const playerResultsMap = new Map<string, { points: number, legs: number, participations: number }>();

          entriesForDate.forEach(entry => {
            const current = playerResultsMap.get(entry.player_name) || { points: 0, legs: 0, participations: 0 };
            playerResultsMap.set(entry.player_name, {
              points: current.points + entry.points,
              legs: current.legs + entry.legs,
              participations: current.participations + 1,
            });
          });

          const rankedPlayers: HistoricalPlayerResult[] = Array.from(playerResultsMap.entries())
            .map(([playerName, stats]) => ({
              player_name: playerName,
              points: stats.points,
              legs: stats.legs,
              combinedScore: stats.points + stats.legs,
              profile_picture_url: playerProfileMap.get(playerName) || undefined,
            }))
            .sort((a, b) => b.combinedScore - a.combinedScore); // Sort by combined score for ranking

          const totalPoints = rankedPlayers.reduce((sum, p) => sum + p.points, 0);
          const totalLegs = rankedPlayers.reduce((sum, p) => sum + p.legs, 0);

          (grouped[gameType as "edart" | "steeldart"] as TournamentSummary[]).push({
            date: date,
            gameType: gameType as "edart" | "steeldart",
            totalParticipants: rankedPlayers.length,
            totalPoints: totalPoints,
            totalLegs: totalLegs,
            rankedPlayers: rankedPlayers,
          });
        }
      }
    }

    return grouped;
  } catch (error) {
    console.error("Error fetching grouped game history:", error);
    throw error;
  }
};


export const useDartData = () => {
  const [edartPlayers, setEdartPlayers] = useState<PlayerData[]>([])
  const [steelDartPlayers, setSteelDartPlayers] = useState<PlayerData[]>([])
  const [combinedPlayers, setCombinedPlayers] = useState<CombinedPlayerData[]>([])
  const [currentPot, setCurrentPot] = useState(0)
  const [groupedGameHistory, setGroupedGameHistory] = useState<GroupedTournamentHistory>({}); // Neuer State
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
      const [edart, steel, pot, combined, history] = await Promise.all([ // history hinzugefügt
        fetchPlayers("edart_players"),
        fetchPlayers("steel_dart_players"),
        fetchPot(),
        fetchCombinedPlayers(),
        fetchGroupedGameHistory(), // Neue Funktion aufrufen
      ])
      setEdartPlayers(edart)
      setSteelDartPlayers(steel)
      setCurrentPot(pot)
      setCombinedPlayers(combined)
      setGroupedGameHistory(history); // State aktualisieren
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
    groupedGameHistory, // Exportieren
    loading,
    error,
    fetchAndRenderAllTables,
    fetchPlayers, // Expose fetchPlayers for PlayerListModal
    recalculatePlayerStats, // Expose recalculatePlayerStats
  }
}

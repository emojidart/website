"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VsIntroOverlay } from "@/components/vs-intro-overlay"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RotateCcw, Check, Radio, Activity, Clock3, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { useSpeechAnnouncer } from "@/components/speech-announcer"

interface Match {
  id: number
  player1: string
  player2: string
  score1: number
  score2: number
  winner?: string
  loser?: string
  machineNumber?: number
  callCount?: number
}

interface TournamentBracketProps {
  bracketSize?: 8 | 16 | 32 | 64 | 128
  tournamentType?: string
}

interface Ranking {
  player_name: string
  placement: number
  eliminated_at: string
}

const isFreilos = (playerName: string): boolean => {
  return playerName.startsWith("Freilos")
}

const DEBUG = false
const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}



const saveMatchStatesToDatabase = async (
  matches: Record<number, Match>,
  tournamentType: string,
  tournamentId: string,
  playerIdMap: Record<string, string>,
  _previousMatches?: Record<number, Match>,
) => {
  const getId = (name: string) => {
    const key = (name ?? "").toLowerCase().trim()
    if (!key || key.startsWith("freilos")) return null
    return playerIdMap[key] ?? null
  }

  const hasMeaningfulData = (match: Match) => {
    const player1 = (match.player1 ?? "").trim()
    const player2 = (match.player2 ?? "").trim()

    return (
      player1 !== "" ||
      player2 !== "" ||
      (match.score1 ?? 0) > 0 ||
      (match.score2 ?? 0) > 0 ||
      !!match.winner ||
      !!match.loser ||
      !!match.machineNumber
    )
  }

  const normalize = (value: any) => (value === undefined || value === "" ? null : value)

  try {
    // NICHT gegen previousMatches vorfiltern.
    // Die Bracket-Logik verändert Ziel-Matches teilweise per flacher Objektkopie.
    // Dadurch kann previousMatches bereits denselben neuen Spieler enthalten und
    // ein notwendiges Weiter-Schreiben würde fälschlich übersprungen.
    const relevantMatches = Object.values(matches).filter(hasMeaningfulData)

    if (relevantMatches.length === 0) return

    const { data: existingRows, error: existingError } = await supabase
      .from("dko_match_states")
      .select("match_id, player1, player2, player1_id, player2_id, score1, score2, winner, loser, machine_number")
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (existingError) throw existingError

    const existingByMatchId = new Map<number, any>(
      (existingRows ?? []).map((row: any) => [Number(row.match_id), row]),
    )

    const changedMatches = relevantMatches.filter((match) => {
      const existing = existingByMatchId.get(match.id)
      if (!existing) return true

      return (
        normalize(existing.player1) !== normalize(match.player1) ||
        normalize(existing.player2) !== normalize(match.player2) ||
        normalize(existing.player1_id) !== normalize(getId(match.player1)) ||
        normalize(existing.player2_id) !== normalize(getId(match.player2)) ||
        Number(existing.score1 ?? 0) !== Number(match.score1 ?? 0) ||
        Number(existing.score2 ?? 0) !== Number(match.score2 ?? 0) ||
        normalize(existing.winner) !== normalize(match.winner) ||
        normalize(existing.loser) !== normalize(match.loser) ||
        normalize(existing.machine_number) !== normalize(match.machineNumber)
      )
    })

    if (changedMatches.length === 0) return

    const matchStates = changedMatches.map((match) => ({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      match_id: match.id,
      player1: match.player1,
      player2: match.player2,
      player1_id: getId(match.player1),
      player2_id: getId(match.player2),
      score1: match.score1,
      score2: match.score2,
      winner: match.winner || null,
      loser: match.loser || null,
      machine_number: match.machineNumber || null,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("dko_match_states").upsert(matchStates, {
      onConflict: "tournament_type,tournament_id,match_id",
    })

    if (error) throw error
  } catch (error) {
    console.error("Fehler beim Speichern der Match-States:", error)
    throw error
  }
}


const loadMatchStatesFromDatabase = async (
  tournamentType: string,
  tournamentId: string,
): Promise<Record<number, Match> | null> => {
  try {
    const { data, error } = await supabase
      .from("dko_match_states")
      .select("*")
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .order("match_id", { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      console.log("[v0] No saved match states found")
      return null
    }

    const matches: Record<number, Match> = {}

    data.forEach((state: any) => {
      matches[state.match_id] = {
        id: state.match_id,
        player1: state.player1 || "",
        player2: state.player2 || "",
        score1: state.score1 || 0,
        score2: state.score2 || 0,
        winner: state.winner || undefined,
        loser: state.loser || undefined,
        machineNumber: state.machine_number || undefined,
        callCount: state.machine_number ? 1 : undefined,
      }
    })

    console.log("[v0] Match states loaded successfully")
    return matches
  } catch (error) {
    console.error("Fehler beim Laden der Match-States:", error)
    return null
  }
}




const deleteMatchStatesFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("dko_match_states")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
    console.log("[v0] Match states deleted")
  } catch (error) {
    console.error("Fehler beim Löschen der Match-States:", error)
  }
}

const deleteRankingsFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("dko_rankings")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
    console.log("[v0] Rankings deleted")
  } catch (error) {
    console.error("Fehler beim Löschen der Rankings:", error)
  }
}

const deleteFreiloseFromDatabase = async (tournamentType: string, tournamentId: string) => {
  try {
    const { error } = await supabase
      .from("tournament_freilose")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)

    if (error) throw error
    console.log("[v0] Freilose deleted")
  } catch (error) {
    console.error("Fehler beim Löschen der Freilose:", error)
  }
}

const clearTournamentRegistration = async (tournamentId: string) => {
  try {
    const { error } = await supabase.from("dko_tournament_registration").delete().neq("id", 0)

    if (error) throw error
    console.log("[v0] Tournament registration cleared successfully")
  } catch (error) {
    console.error("Fehler beim Löschen der Registrierung:", error)
  }
}


const createProgressionMap128 = (): Record<
  number,
  { winner: { matchId: number; position: 1 | 2 } | null; loser: { matchId: number; position: 1 | 2 } | null }
> => ({
      1: { winner: { matchId: 97, position: 1 }, loser: { matchId: 65, position: 1 } },
      2: { winner: { matchId: 97, position: 2 }, loser: { matchId: 65, position: 2 } },
      3: { winner: { matchId: 98, position: 1 }, loser: { matchId: 66, position: 1 } },
      4: { winner: { matchId: 98, position: 2 }, loser: { matchId: 66, position: 2 } },
      5: { winner: { matchId: 99, position: 1 }, loser: { matchId: 67, position: 1 } },
      6: { winner: { matchId: 99, position: 2 }, loser: { matchId: 67, position: 2 } },
      7: { winner: { matchId: 100, position: 1 }, loser: { matchId: 68, position: 1 } },
      8: { winner: { matchId: 100, position: 2 }, loser: { matchId: 68, position: 2 } },
      9: { winner: { matchId: 101, position: 1 }, loser: { matchId: 69, position: 1 } },
      10: { winner: { matchId: 101, position: 2 }, loser: { matchId: 69, position: 2 } },
      11: { winner: { matchId: 102, position: 1 }, loser: { matchId: 70, position: 1 } },
      12: { winner: { matchId: 102, position: 2 }, loser: { matchId: 70, position: 2 } },
      13: { winner: { matchId: 103, position: 1 }, loser: { matchId: 71, position: 1 } },
      14: { winner: { matchId: 103, position: 2 }, loser: { matchId: 71, position: 2 } },
      15: { winner: { matchId: 104, position: 1 }, loser: { matchId: 72, position: 1 } },
      16: { winner: { matchId: 104, position: 2 }, loser: { matchId: 72, position: 2 } },
      17: { winner: { matchId: 105, position: 1 }, loser: { matchId: 73, position: 1 } },
      18: { winner: { matchId: 105, position: 2 }, loser: { matchId: 73, position: 2 } },
      19: { winner: { matchId: 106, position: 1 }, loser: { matchId: 74, position: 1 } },
      20: { winner: { matchId: 106, position: 2 }, loser: { matchId: 74, position: 2 } },
      21: { winner: { matchId: 107, position: 1 }, loser: { matchId: 75, position: 1 } },
      22: { winner: { matchId: 107, position: 2 }, loser: { matchId: 75, position: 2 } },
      23: { winner: { matchId: 108, position: 1 }, loser: { matchId: 76, position: 1 } },
      24: { winner: { matchId: 108, position: 2 }, loser: { matchId: 76, position: 2 } },
      25: { winner: { matchId: 109, position: 1 }, loser: { matchId: 77, position: 1 } },
      26: { winner: { matchId: 109, position: 2 }, loser: { matchId: 77, position: 2 } },
      27: { winner: { matchId: 110, position: 1 }, loser: { matchId: 78, position: 1 } },
      28: { winner: { matchId: 110, position: 2 }, loser: { matchId: 78, position: 2 } },
      29: { winner: { matchId: 111, position: 1 }, loser: { matchId: 79, position: 1 } },
      30: { winner: { matchId: 111, position: 2 }, loser: { matchId: 79, position: 2 } },
      31: { winner: { matchId: 112, position: 1 }, loser: { matchId: 80, position: 1 } },
      32: { winner: { matchId: 112, position: 2 }, loser: { matchId: 80, position: 2 } },
      33: { winner: { matchId: 113, position: 1 }, loser: { matchId: 81, position: 1 } },
      34: { winner: { matchId: 113, position: 2 }, loser: { matchId: 81, position: 2 } },
      35: { winner: { matchId: 114, position: 1 }, loser: { matchId: 82, position: 1 } },
      36: { winner: { matchId: 114, position: 2 }, loser: { matchId: 82, position: 2 } },
      37: { winner: { matchId: 115, position: 1 }, loser: { matchId: 83, position: 1 } },
      38: { winner: { matchId: 115, position: 2 }, loser: { matchId: 83, position: 2 } },
      39: { winner: { matchId: 116, position: 1 }, loser: { matchId: 84, position: 1 } },
      40: { winner: { matchId: 116, position: 2 }, loser: { matchId: 84, position: 2 } },
      41: { winner: { matchId: 117, position: 1 }, loser: { matchId: 85, position: 1 } },
      42: { winner: { matchId: 117, position: 2 }, loser: { matchId: 85, position: 2 } },
      43: { winner: { matchId: 118, position: 1 }, loser: { matchId: 86, position: 1 } },
      44: { winner: { matchId: 118, position: 2 }, loser: { matchId: 86, position: 2 } },
      45: { winner: { matchId: 119, position: 1 }, loser: { matchId: 87, position: 1 } },
      46: { winner: { matchId: 119, position: 2 }, loser: { matchId: 87, position: 2 } },
      47: { winner: { matchId: 120, position: 1 }, loser: { matchId: 88, position: 1 } },
      48: { winner: { matchId: 120, position: 2 }, loser: { matchId: 88, position: 2 } },
      49: { winner: { matchId: 121, position: 1 }, loser: { matchId: 89, position: 1 } },
      50: { winner: { matchId: 121, position: 2 }, loser: { matchId: 89, position: 2 } },
      51: { winner: { matchId: 122, position: 1 }, loser: { matchId: 90, position: 1 } },
      52: { winner: { matchId: 122, position: 2 }, loser: { matchId: 90, position: 2 } },
      53: { winner: { matchId: 123, position: 1 }, loser: { matchId: 91, position: 1 } },
      54: { winner: { matchId: 123, position: 2 }, loser: { matchId: 91, position: 2 } },
      55: { winner: { matchId: 124, position: 1 }, loser: { matchId: 92, position: 1 } },
      56: { winner: { matchId: 124, position: 2 }, loser: { matchId: 92, position: 2 } },
      57: { winner: { matchId: 125, position: 1 }, loser: { matchId: 93, position: 1 } },
      58: { winner: { matchId: 125, position: 2 }, loser: { matchId: 93, position: 2 } },
      59: { winner: { matchId: 126, position: 1 }, loser: { matchId: 94, position: 1 } },
      60: { winner: { matchId: 126, position: 2 }, loser: { matchId: 94, position: 2 } },
      61: { winner: { matchId: 127, position: 1 }, loser: { matchId: 95, position: 1 } },
      62: { winner: { matchId: 127, position: 2 }, loser: { matchId: 95, position: 2 } },
      63: { winner: { matchId: 128, position: 1 }, loser: { matchId: 96, position: 1 } },
      64: { winner: { matchId: 128, position: 2 }, loser: { matchId: 96, position: 2 } },
      65: { winner: { matchId: 129, position: 1 }, loser: null },
      66: { winner: { matchId: 130, position: 1 }, loser: null },
      67: { winner: { matchId: 131, position: 1 }, loser: null },
      68: { winner: { matchId: 132, position: 1 }, loser: null },
      69: { winner: { matchId: 133, position: 1 }, loser: null },
      70: { winner: { matchId: 134, position: 1 }, loser: null },
      71: { winner: { matchId: 135, position: 1 }, loser: null },
      72: { winner: { matchId: 136, position: 1 }, loser: null },
      73: { winner: { matchId: 137, position: 1 }, loser: null },
      74: { winner: { matchId: 138, position: 1 }, loser: null },
      75: { winner: { matchId: 139, position: 1 }, loser: null },
      76: { winner: { matchId: 140, position: 1 }, loser: null },
      77: { winner: { matchId: 141, position: 1 }, loser: null },
      78: { winner: { matchId: 142, position: 1 }, loser: null },
      79: { winner: { matchId: 143, position: 1 }, loser: null },
      80: { winner: { matchId: 144, position: 1 }, loser: null },
      81: { winner: { matchId: 145, position: 1 }, loser: null },
      82: { winner: { matchId: 146, position: 1 }, loser: null },
      83: { winner: { matchId: 147, position: 1 }, loser: null },
      84: { winner: { matchId: 148, position: 1 }, loser: null },
      85: { winner: { matchId: 149, position: 1 }, loser: null },
      86: { winner: { matchId: 150, position: 1 }, loser: null },
      87: { winner: { matchId: 151, position: 1 }, loser: null },
      88: { winner: { matchId: 152, position: 1 }, loser: null },
      89: { winner: { matchId: 153, position: 1 }, loser: null },
      90: { winner: { matchId: 154, position: 1 }, loser: null },
      91: { winner: { matchId: 155, position: 1 }, loser: null },
      92: { winner: { matchId: 156, position: 1 }, loser: null },
      93: { winner: { matchId: 157, position: 1 }, loser: null },
      94: { winner: { matchId: 158, position: 1 }, loser: null },
      95: { winner: { matchId: 159, position: 1 }, loser: null },
      96: { winner: { matchId: 160, position: 1 }, loser: null },
      97: { winner: { matchId: 177, position: 1 }, loser: { matchId: 160, position: 2 } },
      98: { winner: { matchId: 177, position: 2 }, loser: { matchId: 159, position: 2 } },
      99: { winner: { matchId: 178, position: 1 }, loser: { matchId: 158, position: 2 } },
      100: { winner: { matchId: 178, position: 2 }, loser: { matchId: 157, position: 2 } },
      101: { winner: { matchId: 179, position: 1 }, loser: { matchId: 156, position: 2 } },
      102: { winner: { matchId: 179, position: 2 }, loser: { matchId: 155, position: 2 } },
      103: { winner: { matchId: 180, position: 1 }, loser: { matchId: 154, position: 2 } },
      104: { winner: { matchId: 180, position: 2 }, loser: { matchId: 153, position: 2 } },
      105: { winner: { matchId: 181, position: 1 }, loser: { matchId: 152, position: 2 } },
      106: { winner: { matchId: 181, position: 2 }, loser: { matchId: 151, position: 2 } },
      107: { winner: { matchId: 182, position: 1 }, loser: { matchId: 150, position: 2 } },
      108: { winner: { matchId: 182, position: 2 }, loser: { matchId: 149, position: 2 } },
      109: { winner: { matchId: 183, position: 1 }, loser: { matchId: 148, position: 2 } },
      110: { winner: { matchId: 183, position: 2 }, loser: { matchId: 147, position: 2 } },
      111: { winner: { matchId: 184, position: 1 }, loser: { matchId: 146, position: 2 } },
      112: { winner: { matchId: 184, position: 2 }, loser: { matchId: 145, position: 2 } },
      113: { winner: { matchId: 185, position: 1 }, loser: { matchId: 144, position: 2 } },
      114: { winner: { matchId: 185, position: 2 }, loser: { matchId: 143, position: 2 } },
      115: { winner: { matchId: 186, position: 1 }, loser: { matchId: 142, position: 2 } },
      116: { winner: { matchId: 186, position: 2 }, loser: { matchId: 141, position: 2 } },
      117: { winner: { matchId: 187, position: 1 }, loser: { matchId: 140, position: 2 } },
      118: { winner: { matchId: 187, position: 2 }, loser: { matchId: 139, position: 2 } },
      119: { winner: { matchId: 188, position: 1 }, loser: { matchId: 138, position: 2 } },
      120: { winner: { matchId: 188, position: 2 }, loser: { matchId: 137, position: 2 } },
      121: { winner: { matchId: 189, position: 1 }, loser: { matchId: 136, position: 2 } },
      122: { winner: { matchId: 189, position: 2 }, loser: { matchId: 135, position: 2 } },
      123: { winner: { matchId: 190, position: 1 }, loser: { matchId: 134, position: 2 } },
      124: { winner: { matchId: 190, position: 2 }, loser: { matchId: 133, position: 2 } },
      125: { winner: { matchId: 191, position: 1 }, loser: { matchId: 132, position: 2 } },
      126: { winner: { matchId: 191, position: 2 }, loser: { matchId: 131, position: 2 } },
      127: { winner: { matchId: 192, position: 1 }, loser: { matchId: 130, position: 2 } },
      128: { winner: { matchId: 192, position: 2 }, loser: { matchId: 129, position: 2 } },
      129: { winner: { matchId: 161, position: 1 }, loser: null },
      130: { winner: { matchId: 161, position: 2 }, loser: null },
      131: { winner: { matchId: 162, position: 1 }, loser: null },
      132: { winner: { matchId: 162, position: 2 }, loser: null },
      133: { winner: { matchId: 163, position: 1 }, loser: null },
      134: { winner: { matchId: 163, position: 2 }, loser: null },
      135: { winner: { matchId: 164, position: 1 }, loser: null },
      136: { winner: { matchId: 164, position: 2 }, loser: null },
      137: { winner: { matchId: 165, position: 1 }, loser: null },
      138: { winner: { matchId: 165, position: 2 }, loser: null },
      139: { winner: { matchId: 166, position: 1 }, loser: null },
      140: { winner: { matchId: 166, position: 2 }, loser: null },
      141: { winner: { matchId: 167, position: 1 }, loser: null },
      142: { winner: { matchId: 167, position: 2 }, loser: null },
      143: { winner: { matchId: 168, position: 1 }, loser: null },
      144: { winner: { matchId: 168, position: 2 }, loser: null },
      145: { winner: { matchId: 169, position: 1 }, loser: null },
      146: { winner: { matchId: 169, position: 2 }, loser: null },
      147: { winner: { matchId: 170, position: 1 }, loser: null },
      148: { winner: { matchId: 170, position: 2 }, loser: null },
      149: { winner: { matchId: 171, position: 1 }, loser: null },
      150: { winner: { matchId: 171, position: 2 }, loser: null },
      151: { winner: { matchId: 172, position: 1 }, loser: null },
      152: { winner: { matchId: 172, position: 2 }, loser: null },
      153: { winner: { matchId: 173, position: 1 }, loser: null },
      154: { winner: { matchId: 173, position: 2 }, loser: null },
      155: { winner: { matchId: 174, position: 1 }, loser: null },
      156: { winner: { matchId: 174, position: 2 }, loser: null },
      157: { winner: { matchId: 175, position: 1 }, loser: null },
      158: { winner: { matchId: 175, position: 2 }, loser: null },
      159: { winner: { matchId: 176, position: 1 }, loser: null },
      160: { winner: { matchId: 176, position: 2 }, loser: null },
      161: { winner: { matchId: 193, position: 1 }, loser: null },
      162: { winner: { matchId: 194, position: 1 }, loser: null },
      163: { winner: { matchId: 195, position: 1 }, loser: null },
      164: { winner: { matchId: 196, position: 1 }, loser: null },
      165: { winner: { matchId: 197, position: 1 }, loser: null },
      166: { winner: { matchId: 198, position: 1 }, loser: null },
      167: { winner: { matchId: 199, position: 1 }, loser: null },
      168: { winner: { matchId: 200, position: 1 }, loser: null },
      169: { winner: { matchId: 201, position: 1 }, loser: null },
      170: { winner: { matchId: 202, position: 1 }, loser: null },
      171: { winner: { matchId: 203, position: 1 }, loser: null },
      172: { winner: { matchId: 204, position: 1 }, loser: null },
      173: { winner: { matchId: 205, position: 1 }, loser: null },
      174: { winner: { matchId: 206, position: 1 }, loser: null },
      175: { winner: { matchId: 207, position: 1 }, loser: null },
      176: { winner: { matchId: 208, position: 1 }, loser: null },
      177: { winner: { matchId: 217, position: 1 }, loser: { matchId: 208, position: 2 } },
      178: { winner: { matchId: 217, position: 2 }, loser: { matchId: 207, position: 2 } },
      179: { winner: { matchId: 218, position: 1 }, loser: { matchId: 206, position: 2 } },
      180: { winner: { matchId: 218, position: 2 }, loser: { matchId: 205, position: 2 } },
      181: { winner: { matchId: 219, position: 1 }, loser: { matchId: 204, position: 2 } },
      182: { winner: { matchId: 219, position: 2 }, loser: { matchId: 203, position: 2 } },
      183: { winner: { matchId: 220, position: 1 }, loser: { matchId: 202, position: 2 } },
      184: { winner: { matchId: 220, position: 2 }, loser: { matchId: 201, position: 2 } },
      185: { winner: { matchId: 221, position: 1 }, loser: { matchId: 200, position: 2 } },
      186: { winner: { matchId: 221, position: 2 }, loser: { matchId: 199, position: 2 } },
      187: { winner: { matchId: 222, position: 1 }, loser: { matchId: 198, position: 2 } },
      188: { winner: { matchId: 222, position: 2 }, loser: { matchId: 197, position: 2 } },
      189: { winner: { matchId: 223, position: 1 }, loser: { matchId: 196, position: 2 } },
      190: { winner: { matchId: 223, position: 2 }, loser: { matchId: 195, position: 2 } },
      191: { winner: { matchId: 224, position: 1 }, loser: { matchId: 194, position: 2 } },
      192: { winner: { matchId: 224, position: 2 }, loser: { matchId: 193, position: 2 } },
      193: { winner: { matchId: 209, position: 1 }, loser: null },
      194: { winner: { matchId: 209, position: 2 }, loser: null },
      195: { winner: { matchId: 210, position: 1 }, loser: null },
      196: { winner: { matchId: 210, position: 2 }, loser: null },
      197: { winner: { matchId: 211, position: 1 }, loser: null },
      198: { winner: { matchId: 211, position: 2 }, loser: null },
      199: { winner: { matchId: 212, position: 1 }, loser: null },
      200: { winner: { matchId: 212, position: 2 }, loser: null },
      201: { winner: { matchId: 213, position: 1 }, loser: null },
      202: { winner: { matchId: 213, position: 2 }, loser: null },
      203: { winner: { matchId: 214, position: 1 }, loser: null },
      204: { winner: { matchId: 214, position: 2 }, loser: null },
      205: { winner: { matchId: 215, position: 1 }, loser: null },
      206: { winner: { matchId: 215, position: 2 }, loser: null },
      207: { winner: { matchId: 216, position: 1 }, loser: null },
      208: { winner: { matchId: 216, position: 2 }, loser: null },
      209: { winner: { matchId: 225, position: 1 }, loser: null },
      210: { winner: { matchId: 226, position: 1 }, loser: null },
      211: { winner: { matchId: 227, position: 1 }, loser: null },
      212: { winner: { matchId: 228, position: 1 }, loser: null },
      213: { winner: { matchId: 229, position: 1 }, loser: null },
      214: { winner: { matchId: 230, position: 1 }, loser: null },
      215: { winner: { matchId: 231, position: 1 }, loser: null },
      216: { winner: { matchId: 232, position: 1 }, loser: null },
      217: { winner: { matchId: 237, position: 1 }, loser: { matchId: 232, position: 2 } },
      218: { winner: { matchId: 237, position: 2 }, loser: { matchId: 231, position: 2 } },
      219: { winner: { matchId: 238, position: 1 }, loser: { matchId: 230, position: 2 } },
      220: { winner: { matchId: 238, position: 2 }, loser: { matchId: 229, position: 2 } },
      221: { winner: { matchId: 239, position: 1 }, loser: { matchId: 228, position: 2 } },
      222: { winner: { matchId: 239, position: 2 }, loser: { matchId: 227, position: 2 } },
      223: { winner: { matchId: 240, position: 1 }, loser: { matchId: 226, position: 2 } },
      224: { winner: { matchId: 240, position: 2 }, loser: { matchId: 225, position: 2 } },
      225: { winner: { matchId: 233, position: 1 }, loser: null },
      226: { winner: { matchId: 233, position: 2 }, loser: null },
      227: { winner: { matchId: 234, position: 1 }, loser: null },
      228: { winner: { matchId: 234, position: 2 }, loser: null },
      229: { winner: { matchId: 235, position: 1 }, loser: null },
      230: { winner: { matchId: 235, position: 2 }, loser: null },
      231: { winner: { matchId: 236, position: 1 }, loser: null },
      232: { winner: { matchId: 236, position: 2 }, loser: null },
      233: { winner: { matchId: 241, position: 1 }, loser: null },
      234: { winner: { matchId: 242, position: 1 }, loser: null },
      235: { winner: { matchId: 243, position: 1 }, loser: null },
      236: { winner: { matchId: 244, position: 1 }, loser: null },
      237: { winner: { matchId: 247, position: 1 }, loser: { matchId: 244, position: 2 } },
      238: { winner: { matchId: 247, position: 2 }, loser: { matchId: 243, position: 2 } },
      239: { winner: { matchId: 248, position: 1 }, loser: { matchId: 242, position: 2 } },
      240: { winner: { matchId: 248, position: 2 }, loser: { matchId: 241, position: 2 } },
      241: { winner: { matchId: 245, position: 1 }, loser: null },
      242: { winner: { matchId: 245, position: 2 }, loser: null },
      243: { winner: { matchId: 246, position: 1 }, loser: null },
      244: { winner: { matchId: 246, position: 2 }, loser: null },
      245: { winner: { matchId: 249, position: 1 }, loser: null },
      246: { winner: { matchId: 250, position: 1 }, loser: null },
      247: { winner: { matchId: 252, position: 1 }, loser: { matchId: 250, position: 2 } },
      248: { winner: { matchId: 252, position: 2 }, loser: { matchId: 249, position: 2 } },
      249: { winner: { matchId: 251, position: 1 }, loser: null },
      250: { winner: { matchId: 251, position: 2 }, loser: null },
      251: { winner: { matchId: 253, position: 1 }, loser: null },
      252: { winner: { matchId: 254, position: 1 }, loser: { matchId: 253, position: 2 } },
      253: { winner: { matchId: 254, position: 2 }, loser: null },
      254: { winner: null, loser: null },
      255: { winner: null, loser: null },
})

const getNearbyRoundGroups128 = (): Record<string, number[]> => (
{
      round1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
      loser1: [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96],
      round2: [97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128],
      loser2: [129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160],
      loser3: [161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176],
      round3: [177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192],
      loser4: [193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208],
      loser5: [209, 210, 211, 212, 213, 214, 215, 216],
      round4: [217, 218, 219, 220, 221, 222, 223, 224],
      loser6: [225, 226, 227, 228, 229, 230, 231, 232],
      loser7: [233, 234, 235, 236],
      round5: [237, 238, 239, 240],
      loser8: [241, 242, 243, 244],
      loser9: [245, 246],
      round6: [247, 248],
      loser10: [249, 250],
      loser11: [251],
      semi: [252],
      loser12: [253],
      final: [254],
      reset: [255],
    }
)

const distributePlayersWithFreilose = (players: string[], bracketSize: number): string[] => {
  const totalSlots = bracketSize
  const freilosCount = totalSlots - players.length

  if (freilosCount === 0) {
    return players.sort(() => Math.random() - 0.5)
  }

  const freilose: string[] = Array.from({ length: freilosCount }, (_, i) => `Freilos ${i + 1}`)
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
  const result: string[] = []
  const remainingPlayers = [...shuffledPlayers]
  const remainingFreilose = [...freilose]

  while (remainingFreilose.length > 0 && remainingPlayers.length > 0) {
    const player = remainingPlayers.pop()!
    const freilos = remainingFreilose.pop()!

    if (Math.random() > 0.5) {
      result.push(player, freilos)
    } else {
      result.push(freilos, player)
    }
  }

  while (remainingPlayers.length >= 2) {
    result.push(remainingPlayers.pop()!, remainingPlayers.pop()!)
  }

  while (remainingFreilose.length >= 2) {
    result.push(remainingFreilose.pop()!, remainingFreilose.pop()!)
  }

  if (remainingPlayers.length === 1 && remainingFreilose.length === 1) {
    result.push(remainingPlayers.pop()!, remainingFreilose.pop()!)
  }

  return result
}

const saveFreiloseToDatabase = async (freilose: string[], tournamentType: string, tournamentId: string) => {
  try {
    const freilosData = freilose.map((name, index) => ({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      freilos_name: name,
      position: index,
    }))

    const { error } = await supabase.from("tournament_freilose").upsert(freilosData, {
      onConflict: "tournament_type,tournament_id,position",
    })

    if (error) throw error
    console.log("[v0] Freilose saved successfully")
  } catch (error) {
    console.error("Fehler beim Speichern der Freilose:", error)
  }
}

const loadFreiloseFromDatabase = async (tournamentType: string, tournamentId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("tournament_freilose")
      .select("freilos_name, position")
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .order("position", { ascending: true })

    if (error) throw error

    return data ? data.map((f) => f.freilos_name) : []
  } catch (error) {
    console.error("Fehler beim Laden der Freilose:", error)
    return []
  }
}

const removePlayerFromRankings = async (playerName: string, tournamentType: string, tournamentId: string) => {
  try {
    console.log(`[v0] Removing ${playerName} from rankings due to match reset`)

    const { error } = await supabase
      .from("dko_rankings")
      .delete()
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("player_name", playerName)

    if (error) {
      console.error("[v0] Error removing player from rankings:", error)
      throw error
    }

    console.log(`[v0] Successfully removed ${playerName} from rankings`)
  } catch (error) {
    console.error("Fehler beim Entfernen aus Rankings:", error)
  }
}

const getPlacementForEliminationMatch = (matchId: number, bracketSize: number): number => {
  if (bracketSize === 128) {
    if (matchId >= 65 && matchId <= 96) return 97
    if (matchId >= 129 && matchId <= 160) return 65
    if (matchId >= 161 && matchId <= 176) return 49
    if (matchId >= 193 && matchId <= 208) return 33
    if (matchId >= 209 && matchId <= 216) return 25
    if (matchId >= 225 && matchId <= 232) return 17
    if (matchId >= 233 && matchId <= 236) return 13
    if (matchId >= 241 && matchId <= 244) return 9
    if (matchId === 245 || matchId === 246) return 7
    if (matchId === 249 || matchId === 250) return 5
    if (matchId === 251) return 4
    if (matchId === 253) return 3
    if (matchId === 254 || matchId === 255) return 2
  }

  console.warn(`[v0] Unknown elimination match ${matchId}, using fallback placement`)
  return bracketSize
}

const trackPlayerElimination = async (
  allMatches: Record<number, Match>,
  eliminatedPlayer: string,
  tournamentType: string,
  tournamentId: string,
  tournamentName: string,
  totalPlayers: number,
) => {
  console.log(`[v0] ========== TRACKING ELIMINATION ==========`)
  console.log(`[v0] Player: ${eliminatedPlayer}`)
  console.log(`[v0] Tournament ID: ${tournamentId}`)
  console.log(`[v0] Tournament Name: ${tournamentName}`)

  if (isFreilos(eliminatedPlayer)) {
    console.log(`[v0] ✗ Skipping ranking for Freilos: ${eliminatedPlayer} (Freilos are not ranked)`)
    return
  }

  const { data: existingPlayerRanking, error: checkError } = await supabase
    .from("dko_rankings")
    .select("id, placement")
    .eq("tournament_type", tournamentType)
    .eq("tournament_id", tournamentId)
    .eq("player_name", eliminatedPlayer)
    .maybeSingle()

  if (checkError) {
    console.error("[v0] Error checking for existing ranking:", checkError)
  }

  if (existingPlayerRanking) {
    console.log(
      `[v0] ✗ Player ${eliminatedPlayer} already has ranking in THIS tournament (placement ${existingPlayerRanking.placement}), skipping duplicate call`,
    )
    return
  }

  const lossMatches = Object.values(allMatches).filter((m) => m.loser === eliminatedPlayer && m.winner)
  const losses = lossMatches.length

  console.log(`[v0] Player ${eliminatedPlayer} loss history:`)
  lossMatches.forEach((m) => {
    console.log(`[v0]   - Lost Match ${m.id}: ${m.player1} vs ${m.player2}, Winner: ${m.winner}`)
  })
  console.log(`[v0] Total losses: ${losses}`)

  if (losses === 2) {
    console.log(`[v0] ✓ Player ${eliminatedPlayer} is ELIMINATED with 2 losses! Saving to database...`)
    try {
      const eliminationMatch = lossMatches[lossMatches.length - 1]
      const placement = getPlacementForEliminationMatch(eliminationMatch.id, totalPlayers)

      console.log(`[v0] Elimination match: ${eliminationMatch.id}`)
      console.log(`[v0] Calculated placement for ${eliminatedPlayer}: ${placement} (based on elimination round)`)

      if (isFreilos(eliminatedPlayer)) {
        console.error(`[v0] ✗ CRITICAL ERROR: Attempted to save Freilos ${eliminatedPlayer} to rankings! Aborting.`)
        return
      }

      const rankingData = {
        tournament_type: tournamentType,
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        player_name: eliminatedPlayer,
        placement: placement,
        eliminated_at: new Date().toISOString(),
      }

      console.log("[v0] Attempting to insert ranking data:", rankingData)

      const { data: insertData, error: insertError } = await supabase.from("dko_rankings").insert(rankingData).select()

      if (insertError) {
        if (insertError.code === "23505") {
          console.log(
            `[v0] ℹ️ Player ${eliminatedPlayer} already exists in rankings (caught by database constraint), skipping`,
          )
          return
        }
        console.error("[v0] ✗ Error inserting ranking:", insertError)
        throw insertError
      }

      console.log(`[v0] ✓ Successfully saved! Player ${eliminatedPlayer} - Placement: ${placement}`, insertData)
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        console.log(`[v0] ℹ️ Player ${eliminatedPlayer} already ranked (duplicate prevented by database)`)
        return
      }
      console.error("[v0] Fehler beim Speichern der Platzierung:", error)
    }
  } else if (losses > 2) {
    console.log(
      `[v0] ⚠️ WARNING: Player ${eliminatedPlayer} has ${losses} losses (more than 2)! This shouldn't happen in double elimination!`,
    )
  } else {
    console.log(`[v0] Player ${eliminatedPlayer} only has ${losses} loss(es), not eliminated yet`)
  }
  console.log(`[v0] ========================================`)
}

const saveFinalRankings = async (
  winner: string,
  runnerUp: string,
  tournamentType: string,
  tournamentId: string,
  tournamentName: string,
) => {
  try {
    console.log(`[v0] Saving final rankings for tournament "${tournamentName}": 1st: ${winner}, 2nd: ${runnerUp}`)

    const { error: winnerError } = await supabase.from("dko_rankings").insert({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      player_name: winner,
      placement: 1,
      eliminated_at: new Date().toISOString(),
    })

    if (winnerError && winnerError.code !== "23505") {
      console.error("[v0] Error saving winner:", winnerError)
    }

    const { error: runnerUpError } = await supabase.from("dko_rankings").insert({
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      player_name: runnerUp,
      placement: 2,
      eliminated_at: new Date().toISOString(),
    })

    if (runnerUpError && runnerUpError.code !== "23505") {
      console.error("[v0] Error saving runner-up:", runnerUpError)
    }

    console.log(`[v0] Final rankings saved successfully!`)
  } catch (error) {
    console.error("Fehler beim Speichern der finalen Platzierungen:", error)
  }
}

const markTournamentAsCompleted = async (tournamentId: string) => {
  try {
    console.log(`[v0] Marking tournament ${tournamentId} as completed`)

    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error

    console.log(`[v0] Tournament marked as completed successfully`)
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgeschlossen:", error)
  }
}

const markTournamentAsCancelled = async (tournamentId: string) => {
  try {
    console.log(`[v0] Marking tournament ${tournamentId} as cancelled`)

    const { error } = await supabase
      .from("tournaments_status")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId)

    if (error) throw error

    console.log(`[v0] Tournament marked as cancelled successfully`)
  } catch (error) {
    console.error("Fehler beim Markieren des Turniers als abgebrochen:", error)
  }
}

export default function TournamentBracket({ bracketSize = 128, tournamentType = "128er_dko" }: TournamentBracketProps) {
  const initializingRef = useRef(false)
  const [vsIntro, setVsIntro] = useState<{ open: boolean; player1: string; player2: string; machineNumber?: number }>(() => ({
    open: false,
    player1: "",
    player2: "",
    machineNumber: undefined,
  }))

  const isRemoteUpdateRef = useRef(false)
  const autoResolveRanRef = useRef(false)

  const [tournamentId, setTournamentId] = useState<string>("")
  const [tournamentName, setTournamentName] = useState<string>("")
  const [totalMachines, setTotalMachines] = useState<number>(10)
  const [machineDialogOpen, setMachineDialogOpen] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [rankingsDialogOpen, setRankingsDialogOpen] = useState(false)
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [savingToSeries, setSavingToSeries] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false)
  const [playerIdMap, setPlayerIdMap] = useState<Record<string, string>>({})

  const { announce } = useSpeechAnnouncer({ enabled: announcementsEnabled })

  const initializeMatches = () => {
    const teamNames = [
      "Team 1",
      "Team 2",
      "Team 3",
      "Team 4",
      "Team 5",
      "Team 6",
      "Team 7",
      "Team 8",
      "Team 9",
      "Team 10",
      "Team 11",
      "Team 12",
      "Team 13",
      "Team 14",
      "Team 15",
      "Team 16",
      "Team 17",
      "Team 18",
      "Team 19",
      "Team 20",
      "Team 21",
      "Team 22",
      "Team 23",
      "Team 24",
      "Team 25",
      "Team 26",
      "Team 27",
      "Team 28",
      "Team 29",
      "Team 30",
      "Team 31",
      "Team 32",
      "Team 33",
      "Team 34",
      "Team 35",
      "Team 36",
      "Team 37",
      "Team 38",
      "Team 39",
      "Team 40",
      "Team 41",
      "Team 42",
      "Team 43",
      "Team 44",
      "Team 45",
      "Team 46",
      "Team 47",
      "Team 48",
      "Team 49",
      "Team 50",
      "Team 51",
      "Team 52",
      "Team 53",
      "Team 54",
      "Team 55",
      "Team 56",
      "Team 57",
      "Team 58",
      "Team 59",
      "Team 60",
      "Team 61",
      "Team 62",
      "Team 63",
      "Team 64",
      "Team 65",
      "Team 66",
      "Team 67",
      "Team 68",
      "Team 69",
      "Team 70",
      "Team 71",
      "Team 72",
      "Team 73",
      "Team 74",
      "Team 75",
      "Team 76",
      "Team 77",
      "Team 78",
      "Team 79",
      "Team 80",
      "Team 81",
      "Team 82",
      "Team 83",
      "Team 84",
      "Team 85",
      "Team 86",
      "Team 87",
      "Team 88",
      "Team 89",
      "Team 90",
      "Team 91",
      "Team 92",
      "Team 93",
      "Team 94",
      "Team 95",
      "Team 96",
      "Team 97",
      "Team 98",
      "Team 99",
      "Team 100",
      "Team 101",
      "Team 102",
      "Team 103",
      "Team 104",
      "Team 105",
      "Team 106",
      "Team 107",
      "Team 108",
      "Team 109",
      "Team 110",
      "Team 111",
      "Team 112",
      "Team 113",
      "Team 114",
      "Team 115",
      "Team 116",
      "Team 117",
      "Team 118",
      "Team 119",
      "Team 120",
      "Team 121",
      "Team 122",
      "Team 123",
      "Team 124",
      "Team 125",
      "Team 126",
      "Team 127",
      "Team 128"
    ]

    const initialMatches: Record<number, Match> = {}

    for (let i = 1; i <= 64; i++) {
      const player1Index = (i - 1) * 2
      const player2Index = player1Index + 1
      initialMatches[i] = {
        id: i,
        player1: teamNames[player1Index],
        player2: teamNames[player2Index],
        score1: 0,
        score2: 0,
      }
    }

    for (let i = 65; i <= 255; i++) {
      initialMatches[i] = { id: i, player1: "", player2: "", score1: 0, score2: 0 }
    }

    return initialMatches
  }

  const [matches, setMatches] = useState<Record<number, Match>>(() => initializeMatches())
  useEffect(() => {
    const fetchPlayerIds = async () => {
      try {
        const { data, error } = await supabase.from("spieldatenbank").select("id, name")

        if (error) {
          console.error("Error fetching player ids:", error)
          return
        }

        const idMap: Record<string, string> = {}
        ;(data ?? []).forEach((p) => {
          if (p?.name && p?.id) idMap[p.name.toLowerCase().trim()] = p.id
        })

        setPlayerIdMap(idMap)
        console.log("[v0] Player IDs loaded:", Object.keys(idMap).length)
      } catch (err) {
        console.error("Error fetching player ids:", err)
      }
    }

    fetchPlayerIds()
  }, [])



useEffect(() => {
  if (!tournamentId) return
  if (loading) return

  if (isRemoteUpdateRef.current) {
    isRemoteUpdateRef.current = false
    return
  }

  const timeoutId = setTimeout(() => {
    saveMatchStatesToDatabase(matches, tournamentType, tournamentId, playerIdMap)
  }, 300)

  return () => clearTimeout(timeoutId)
}, [matches])


useEffect(() => {
  if (loading || !tournamentId) return

  const channel = supabase
    .channel(`dko_match_states_${tournamentType}_${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dko_match_states",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload: any) => {
        const record = payload?.new
        if (!record) return
        if (record.tournament_type && record.tournament_type !== tournamentType) return

        setMatches((prev) => {
          const prevMatch = prev[record.match_id] || {
            id: record.match_id,
            player1: "",
            player2: "",
            score1: 0,
            score2: 0,
            callCount: 1,
          }

          const nextMatch = {
            ...prevMatch,
            id: record.match_id,
            player1: record.player1 || "",
            player2: record.player2 || "",
            score1: typeof record.score1 === "number" ? record.score1 : prevMatch.score1,
            score2: typeof record.score2 === "number" ? record.score2 : prevMatch.score2,
            winner: record.winner || undefined,
            loser: record.loser || undefined,
            machineNumber: record.machine_number || undefined,
            callCount: record.machine_number ? (prevMatch.callCount || 1) : undefined,
          }

          const isSame =
            prevMatch.player1 === nextMatch.player1 &&
            prevMatch.player2 === nextMatch.player2 &&
            prevMatch.score1 === nextMatch.score1 &&
            prevMatch.score2 === nextMatch.score2 &&
            prevMatch.winner === nextMatch.winner &&
            prevMatch.loser === nextMatch.loser &&
            prevMatch.machineNumber === nextMatch.machineNumber &&
            prevMatch.callCount === nextMatch.callCount

          if (isSame) {
            return prev
          }

          isRemoteUpdateRef.current = true

          return {
            ...prev,
            [record.match_id]: nextMatch,
          }
        })
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [loading, tournamentId, tournamentType])




  useEffect(() => {
    if (loading || !tournamentId || autoResolveRanRef.current) return

    autoResolveRanRef.current = true

    const timer = setTimeout(() => {
      setMatches((prev) => {
        const newMatches = { ...prev }
        let hasChanges = false

        Object.values(newMatches).forEach((match: Match) => {
          if (match.winner || !match.player1 || !match.player2) return

          const isP1Freilos = isFreilos(match.player1)
          const isP2Freilos = isFreilos(match.player2)

          if (!isP1Freilos && !isP2Freilos) return

          const realPlayer = isP1Freilos ? match.player2 : match.player1
          const freilosPlayer = isP1Freilos ? match.player1 : match.player2

          console.log(`[v0] Auto-resolving Freilos match ${match.id}: ${realPlayer} beats ${freilosPlayer}`)

          match.winner = realPlayer
          match.loser = freilosPlayer
          match.score1 = isP1Freilos ? 0 : 2
          match.score2 = isP2Freilos ? 0 : 2

          if (match.id === 254) {
            if (match.winner === match.player1) {
              saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
            } else {
              newMatches[255].player1 = match.player1
              newMatches[255].player2 = match.player2
            }
          } else if (match.id === 255) {
            saveFinalRankings(match.winner, match.loser, tournamentType, tournamentId, tournamentName)
          } else {
            progressPlayers(newMatches, match.id, realPlayer, freilosPlayer)
            trackPlayerElimination(newMatches, freilosPlayer, tournamentType, tournamentId, tournamentName, bracketSize)
          }

          hasChanges = true
        })

        autoResolveRanRef.current = false
        return hasChanges ? newMatches : prev
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [matches, loading, tournamentType, tournamentId])

  const getAvailableMachines = (): number[] => {
    const usedMachines = Object.values(matches)
      .filter((m) => m.machineNumber !== undefined && !m.winner)
      .map((m) => m.machineNumber!)

    return Array.from({ length: totalMachines }, (_, i) => i + 1).filter((num) => !usedMachines.includes(num))
  }
  
const applyCompletedMatch = (
  allMatches: Record<number, Match>,
  matchId: number,
  winner: string,
  loser: string,
  extras?: Partial<Match>,
) => {
  const currentMatch = allMatches[matchId]
  if (!currentMatch) return allMatches

  allMatches[matchId] = {
    ...currentMatch,
    ...extras,
    winner,
    loser,
    machineNumber: undefined,
    callCount: undefined,
  }

  if (matchId === 254) {
    if (winner === allMatches[254]?.player1) {
      saveFinalRankings(winner, loser, tournamentType, tournamentId, tournamentName)
    } else {
      if (!allMatches[255]) {
        allMatches[255] = {
          id: 255,
          player1: "",
          player2: "",
          score1: 0,
          score2: 0,
          winner: undefined,
          loser: undefined,
          machineNumber: undefined,
          callCount: 1,
        }
      }

      allMatches[255] = {
        ...allMatches[255],
        player1: allMatches[254]?.player1 || "",
        player2: allMatches[254]?.player2 || "",
        score1: 0,
        score2: 0,
        winner: undefined,
        loser: undefined,
        machineNumber: undefined,
        callCount: 1,
      }
    }
  } else if (matchId === 255) {
    saveFinalRankings(winner, loser, tournamentType, tournamentId, tournamentName)
  } else {
    progressPlayers(allMatches, matchId, winner, loser)
    trackPlayerElimination(allMatches, loser, tournamentType, tournamentId, tournamentName, bracketSize)
  }

  return allMatches
}

  const fetchRankings = async () => {
    setLoadingRankings(true)
    try {
      const { data, error } = await supabase
        .from("dko_rankings")
        .select("player_name, placement, eliminated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (error) throw error

      setRankings(data || [])
      setRankingsDialogOpen(true)
    } catch (error) {
      console.error("Fehler beim Laden der Rangliste:", error)
      alert("Fehler beim Laden der Rangliste")
    } finally {
      setLoadingRankings(false)
    }
  }

  const saveToTournamentSeries = async () => {
    const winner = matches[255]?.winner || matches[254]?.winner

    if (!winner) {
      alert("Kein Gewinner gefunden!")
      return
    }

    const { data: existingHistory } = await supabase
      .from("tournament_series_history")
      .select("id")
      .eq("tournament_id", tournamentId)
      .maybeSingle()

    if (existingHistory) {
      alert("Dieses Turnier wurde bereits zur Serie hinzugefügt!")
      return
    }

    setSavingToSeries(true)

    try {
      const { data: rankings, error: rankingsError } = await supabase
        .from("dko_rankings")
        .select("player_name, placement")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })

      if (rankingsError) throw rankingsError

      if (!rankings || rankings.length === 0) {
        alert("Keine Rangliste gefunden! Bitte stelle sicher, dass das Turnier vollständig ist.")
        setSavingToSeries(false)
        return
      }

      const placementCounts: Record<number, number> = {}
      rankings.forEach((r) => {
        placementCounts[r.placement] = (placementCounts[r.placement] || 0) + 1
      })

      const tiersBelow: Record<number, number> = {}
      const sortedPlacements = Object.keys(placementCounts)
        .map(Number)
        .sort((a, b) => a - b)

      sortedPlacements.forEach((placement, index) => {
        tiersBelow[placement] = sortedPlacements.length - index - 1
      })

      console.log("[v0] Placement counts:", placementCounts)
      console.log("[v0] Tiers below each placement:", tiersBelow)

      const { data: matchStates, error: matchError } = await supabase
        .from("dko_match_states")
        .select("match_id, player1, player2, score1, score2, winner, updated_at")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("match_id", { ascending: true })

      if (matchError) throw matchError

      const playerMatchHistory: Record<string, Array<{ matchId: number; result: "W" | "L"; timestamp: string }>> = {}

      matchStates?.forEach((match) => {
        if (!match.winner) return

        if (match.player1 && !isFreilos(match.player1)) {
          if (!playerMatchHistory[match.player1]) {
            playerMatchHistory[match.player1] = []
          }
          playerMatchHistory[match.player1].push({
            matchId: match.match_id,
            result: match.winner === match.player1 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }

        if (match.player2 && !isFreilos(match.player2)) {
          if (!playerMatchHistory[match.player2]) {
            playerMatchHistory[match.player2] = []
          }
          playerMatchHistory[match.player2].push({
            matchId: match.match_id,
            result: match.winner === match.player2 ? "W" : "L",
            timestamp: match.updated_at || new Date().toISOString(),
          })
        }
      })

      Object.keys(playerMatchHistory).forEach((playerName) => {
        playerMatchHistory[playerName].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      })

      console.log("[v0] Player match history:", playerMatchHistory)

      const bracketResetOccurred = matches[255]?.winner !== undefined
      console.log("[v0] Bracket reset occurred:", bracketResetOccurred)

      const playerStats: Record<
        string,
        {
          placement: number
          placement_points: number
          legs_points: number
          bonus_points: number
          legs_won: number
          legs_lost: number
          matches_played: number
          matches_won: number
          matches_lost: number
        }
      > = {}

      rankings.forEach((ranking) => {
        const playerName = ranking.player_name
        const placement = ranking.placement
        const placementPoints = 10 + tiersBelow[placement] * 2
        const bonus = placement === 1 && !bracketResetOccurred ? 5 : 0

        playerStats[playerName] = {
          placement: placement,
          placement_points: placementPoints,
          legs_points: 0,
          bonus_points: bonus,
          legs_won: 0,
          legs_lost: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
        }
      })

      matchStates?.forEach((match) => {
        if (match.player1 && !isFreilos(match.player1)) {
          if (!playerStats[match.player1]) {
            playerStats[match.player1] = {
              placement: 0,
              placement_points: 0,
              legs_points: 0,
              bonus_points: 0,
              legs_won: 0,
              legs_lost: 0,
              matches_played: 0,
              matches_won: 0,
              matches_lost: 0,
            }
          }

          const score1 = match.score1 || 0
          const score2 = match.score2 || 0

          playerStats[match.player1].legs_won += score1
          playerStats[match.player1].legs_lost += score2
          playerStats[match.player1].legs_points += score1

          if (match.winner) {
            playerStats[match.player1].matches_played += 1
            if (match.winner === match.player1) {
              playerStats[match.player1].matches_won += 1
            } else {
              playerStats[match.player1].matches_lost += 1
            }
          }
        }

        if (match.player2 && !isFreilos(match.player2)) {
          if (!playerStats[match.player2]) {
            playerStats[match.player2] = {
              placement: 0,
              placement_points: 0,
              legs_points: 0,
              bonus_points: 0,
              legs_won: 0,
              legs_lost: 0,
              matches_played: 0,
              matches_won: 0,
              matches_lost: 0,
            }
          }

          const score1 = match.score1 || 0
          const score2 = match.score2 || 0

          playerStats[match.player2].legs_won += score2
          playerStats[match.player2].legs_lost += score1
          playerStats[match.player2].legs_points += score2

          if (match.winner) {
            playerStats[match.player2].matches_played += 1
            if (match.winner === match.player2) {
              playerStats[match.player2].matches_won += 1
            } else {
              playerStats[match.player2].matches_lost += 1
            }
          }
        }
      })

      console.log("[v0] Calculated player statistics:", playerStats)

      const tournamentEntries = Object.entries(playerStats).map(([playerName, stats]) => {
        const totalPoints = stats.placement_points + stats.legs_points + stats.bonus_points

        const matchHistory = playerMatchHistory[playerName] || []
        const chronologicalForm = matchHistory.map((m) => m.result).join(",")

        console.log(
          `[v0] ${playerName}: Platz ${stats.placement} | ` +
            `${stats.placement_points}P (Platzierung) + ${stats.legs_points}P (Legs) + ${stats.bonus_points}P (Bonus) = ${totalPoints}P | ` +
            `Legs: ${stats.legs_won}W-${stats.legs_lost}L | Matches: ${stats.matches_won}W-${stats.matches_lost}L | ` +
            `Form: ${chronologicalForm}`,
        )

        return {
          player_name: playerName,
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          tournament_type: tournamentType,
          tournament_date: new Date().toISOString(),
          placement: stats.placement,
          placement_points: stats.placement_points,
          legs_points: stats.legs_points,
          bonus_points: stats.bonus_points,
          total_points: totalPoints,
          legs_won: stats.legs_won,
          legs_lost: stats.legs_lost,
          matches_played: stats.matches_played,
          matches_won: stats.matches_won,
          matches_lost: stats.matches_lost,
          form: chronologicalForm,
        }
      })

      const { error: insertError } = await supabase.from("tournament_series_standings").insert(tournamentEntries)

      if (insertError) {
        console.error("[v0] Error inserting tournament entries:", insertError)
        throw insertError
      }

      console.log(`[v0] Successfully inserted ${tournamentEntries.length} tournament entries`)

      const { error: historyError } = await supabase.from("tournament_series_history").insert({
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        tournament_type: tournamentType,
        added_at: new Date().toISOString(),
      })

      if (historyError) throw historyError

      await markTournamentAsCompleted(tournamentId)
      await deleteFreiloseFromDatabase(tournamentType, tournamentId)
      await clearTournamentRegistration(tournamentId)

      setSuccessDialogOpen(false)
      router.push("/dko_tournament_registration")
    } catch (error) {
      console.error("Fehler beim Speichern zur Turnierserie:", error)
      alert("Fehler beim Speichern zur Turnierserie. Bitte versuche es erneut.")
    } finally {
      setSavingToSeries(false)
    }
  }

  const startMatch = (matchId: number) => {
    const match = matches[matchId]
    if (!match.player1 || !match.player2) {
      alert("Beide Spieler müssen verfügbar sein!")
      return
    }

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)

    if (isP1Freilos && isP2Freilos) {
      console.log(`[v0] Auto-resolving Freilos vs Freilos match ${matchId}: ${match.player1} vs ${match.player2}`)
      setMatches((prev) => {
        const newMatches = { ...prev }
        const updatedMatch = {
          ...match,
          winner: match.player1,
          loser: match.player2,
          score1: 2,
          score2: 0,
        }
        newMatches[matchId] = updatedMatch
        progressPlayers(newMatches, matchId, match.player1, match.player2)
        return newMatches
      })
      return
    }

    if (isP1Freilos || isP2Freilos) {
      const realPlayer = isP1Freilos ? match.player2 : match.player1
      const freilosPlayer = isP1Freilos ? match.player1 : match.player2

      console.log(`[v0] Auto-resolving Freilos match ${matchId}: ${realPlayer} beats ${freilosPlayer}`)
      setMatches((prev) => {
        const newMatches = { ...prev }
        const updatedMatch = {
          ...match,
          winner: realPlayer,
          loser: freilosPlayer,
          score1: isP1Freilos ? 0 : 2,
          score2: isP2Freilos ? 0 : 2,
        }
        newMatches[matchId] = updatedMatch
        progressPlayers(newMatches, matchId, realPlayer, freilosPlayer)
        return newMatches
      })
      return
    }

    if (match.machineNumber) {
      alert(`Dieses Spiel läuft bereits auf Automat ${match.machineNumber}`)
      return
    }
    setSelectedMatchId(matchId)
    setMachineDialogOpen(true)
  }
  
  
  

const assignMachine = async (machineNumber: number) => {
  if (selectedMatchId === null) return
  if (!tournamentId) return

  const currentMatchId = selectedMatchId
  const match = matches[currentMatchId]

  if (!match || !match.player1 || !match.player2 || match.winner) {
    return
  }

  if (match.machineNumber) {
    alert(`Dieses Spiel läuft bereits auf Automat ${match.machineNumber}`)
    return
  }

  const updatedMatch = {
    ...match,
    machineNumber,
    callCount: 1,
  }

  try {
    const getId = (name: string) => {
      const key = (name ?? "").toLowerCase().trim()
      if (!key || key.startsWith("freilos")) return null
      return playerIdMap[key] ?? null
    }

    const payload = {
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      match_id: currentMatchId,
      player1: updatedMatch.player1,
      player2: updatedMatch.player2,
      player1_id: getId(updatedMatch.player1),
      player2_id: getId(updatedMatch.player2),
      score1: updatedMatch.score1,
      score2: updatedMatch.score2,
      winner: updatedMatch.winner || null,
      loser: updatedMatch.loser || null,
      machine_number: updatedMatch.machineNumber || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("dko_match_states").upsert(payload, {
      onConflict: "tournament_type,tournament_id,match_id",
    })

    if (error) {
      console.error("[v0] Error starting match immediately:", error)
      alert("Spiel konnte nicht gestartet werden. Bitte erneut versuchen.")
      return
    }

    isRemoteUpdateRef.current = true

    setMatches((prev) => ({
      ...prev,
      [currentMatchId]: {
        ...prev[currentMatchId],
        machineNumber,
        callCount: 1,
      },
    }))

    if (announcementsEnabled) {
      announce(match.player1, match.player2, machineNumber, 1)
    }

    setVsIntro({
      open: true,
      player1: match.player1,
      player2: match.player2,
      machineNumber,
    })

    setMachineDialogOpen(false)
    setSelectedMatchId(null)
  } catch (err) {
    console.error("[v0] Fehler beim direkten Starten des Spiels:", err)
    alert("Spiel konnte nicht gestartet werden. Bitte erneut versuchen.")
  }
}
  
  

  const handleRepeatCall = (matchId: number) => {
    const match = matches[matchId]
    const nextCallCount = (match.callCount || 1) + 1

    if (nextCallCount > 3) return

    setMatches((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        callCount: nextCallCount,
      },
    }))

    if (announcementsEnabled && match.machineNumber) {
      announce(match.player1, match.player2, match.machineNumber, nextCallCount)
    }
  }

 const updateScore = (matchId: number, player: 1 | 2, score: number) => {
  setMatches((prev) => ({
    ...prev,
    [matchId]: {
      ...prev[matchId],
      [player === 1 ? "score1" : "score2"]: score,
    },
  }))
}

const confirmMatch = async (matchId: number) => {
  if (!tournamentId) return

  const currentMatch = matches[matchId]
  if (!currentMatch) return

  const match = { ...currentMatch }

  if (match.score1 > match.score2) {
    match.winner = match.player1
    match.loser = match.player2
  } else if (match.score2 > match.score1) {
    match.winner = match.player2
    match.loser = match.player1
  } else {
    alert("Unentschieden ist nicht erlaubt!")
    return
  }

  match.machineNumber = undefined
  match.callCount = undefined

  const newMatches = { ...matches }
  newMatches[matchId] = match

  if (matchId === 254) {
    if (match.winner === match.player1) {
      console.log(`[v0] Grand Final: Winner's bracket player ${match.winner} wins! Tournament over.`)
      await saveFinalRankings(match.winner, match.loser!, tournamentType, tournamentId, tournamentName)
    } else {
      console.log(`[v0] Grand Final: Loser's bracket player ${match.winner} wins! Bracket reset required.`)
     newMatches[255] = {
  ...(newMatches[255] ?? {
    id: 255,
    player1: "",
    player2: "",
    score1: 0,
    score2: 0,
    callCount: 1,
  }),
  player1: match.player1,
  player2: match.player2,
  score1: 0,
  score2: 0,
  winner: undefined,
  loser: undefined,
  machineNumber: undefined,
  callCount: 1,
}
    }
  } else if (matchId === 255) {
    console.log(`[v0] Bracket Reset: ${match.winner} wins the tournament!`)
    await saveFinalRankings(match.winner, match.loser!, tournamentType, tournamentId, tournamentName)
  } else {
    progressPlayers(newMatches, matchId, match.winner!, match.loser!)
    await trackPlayerElimination(newMatches, match.loser!, tournamentType, tournamentId, tournamentName, bracketSize)
  }

  try {
    isRemoteUpdateRef.current = true
    setMatches(newMatches)

    await saveMatchStatesToDatabase(newMatches, tournamentType, tournamentId, playerIdMap, matches)
  } catch (error) {
    console.error("[v0] Fehler beim direkten Bestätigen des Ergebnisses:", error)
    alert("Ergebnis konnte nicht gespeichert werden. Bitte erneut versuchen.")
  }
}




  const progressPlayers = (allMatches: Record<number, Match>, matchId: number, winner: string, loser: string) => {
    console.log(`[v0] ========== PROGRESSING PLAYERS ==========`)
    console.log(`[v0] Match ${matchId} completed: Winner: ${winner}, Loser: ${loser}`)

    const progressionMap = createProgressionMap128()
    const progression = progressionMap[matchId]

    if (!progression) {
      console.log(`[v0] ⚠️ No progression defined for match ${matchId}`)
      return
    }

    if (progression.winner) {
      const { matchId: targetMatch, position } = progression.winner
      console.log(`[v0] ✓ Winner ${winner} progresses to Match ${targetMatch} position ${position}`)
	  
	  if (!allMatches[targetMatch]) {
  allMatches[targetMatch] = {
    id: targetMatch,
    player1: "",
    player2: "",
    score1: 0,
    score2: 0,
    winner: undefined,
    loser: undefined,
    machineNumber: undefined,
    callCount: 1,
  }
}

      const targetMatchBefore = { ...allMatches[targetMatch] }

      if (position === 1) {
        allMatches[targetMatch].player1 = winner
      } else {
        allMatches[targetMatch].player2 = winner
      }

      console.log(
        `[v0]   Match ${targetMatch} before: P1="${targetMatchBefore.player1}" P2="${targetMatchBefore.player2}"`,
      )
      console.log(
        `[v0]   Match ${targetMatch} after:  P1="${allMatches[targetMatch].player1}" P2="${allMatches[targetMatch].player2}"`,
      )

      if (allMatches[targetMatch].player1 && allMatches[targetMatch].player2 && !allMatches[targetMatch].winner) {
        console.log(`[v0]   ✓ Match ${targetMatch} now has both players, checking for optimization...`)
        optimizeMatchInRound(allMatches, targetMatch)
        autoResolveFreilosMatch(allMatches, targetMatch)
      }
    } else {
      console.log(`[v0] ✓ Winner ${winner} has no further progression (reached final or waiting)`)
    }

    if (progression.loser) {
      const { matchId: targetMatch, position } = progression.loser
      console.log(`[v0] ↓ Loser ${loser} drops to Match ${targetMatch} position ${position} (1st loss)`)
	  
	  if (!allMatches[targetMatch]) {
  allMatches[targetMatch] = {
    id: targetMatch,
    player1: "",
    player2: "",
    score1: 0,
    score2: 0,
    winner: undefined,
    loser: undefined,
    machineNumber: undefined,
    callCount: 1,
  }
}

      const targetMatchBefore = { ...allMatches[targetMatch] }

      if (position === 1) {
        allMatches[targetMatch].player1 = loser
      } else {
        allMatches[targetMatch].player2 = loser
      }

      console.log(
        `[v0]   Match ${targetMatch} before: P1="${targetMatchBefore.player1}" P2="${targetMatchBefore.player2}"`,
      )
      console.log(
        `[v0]   Match ${targetMatch} after:  P1="${allMatches[targetMatch].player1}" P2="${allMatches[targetMatch].player2}"`,
      )

      if (allMatches[targetMatch].player1 && allMatches[targetMatch].player2 && !allMatches[targetMatch].winner) {
        console.log(`[v0]   ✓ Match ${targetMatch} now has both players, checking for optimization...`)
        optimizeMatchInRound(allMatches, targetMatch)
        autoResolveFreilosMatch(allMatches, targetMatch)
      }
    } else {
      console.log(`[v0] ✗ Loser ${loser} is ELIMINATED (2nd loss, no further progression)`)
    }
    console.log(`[v0] ==========================================`)
  }

  const optimizeMatchInRound = (allMatches: Record<number, Match>, matchId: number) => {
    const match = allMatches[matchId]

    if (match.winner) return

    const isP1Freilos = isFreilos(match.player1)
    const isP2Freilos = isFreilos(match.player2)

    if (isP1Freilos && isP2Freilos) {
      const nearbyMatches = findNearbyMatches(matchId)

      for (const nearbyId of nearbyMatches) {
        const nearbyMatch = allMatches[nearbyId]

        if (!nearbyMatch.player1 || !nearbyMatch.player2 || nearbyMatch.winner) continue

        const isNearbyP1Freilos = isFreilos(nearbyMatch.player1)
        const isNearbyP2Freilos = isFreilos(nearbyMatch.player2)

        if (!isNearbyP1Freilos && !isNearbyP2Freilos) {
          const temp = match.player2
          match.player2 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(
            `[v0] Optimized: Swapped ${nearbyMatch.player2} from Match ${nearbyId} with ${match.player2} from Match ${matchId}`,
          )
          return
        }

        if (!isNearbyP1Freilos && isNearbyP2Freilos) {
          const temp = match.player1
          match.player1 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(`[v0] Optimized: Swapped Freilos from Match ${nearbyId} with Freilos from Match ${matchId}`)
          return
        }

        if (isNearbyP1Freilos && !isNearbyP2Freilos) {
          const temp = match.player1
          match.player1 = nearbyMatch.player1
          nearbyMatch.player1 = temp
          console.log(`[v0] Optimized: Swapped Freilos from Match ${nearbyId} with Freilos from Match ${matchId}`)
          return
        }
      }
    } else if (!isP1Freilos && !isP2Freilos) {
      const nearbyMatches = findNearbyMatches(matchId)

      for (const nearbyId of nearbyMatches) {
        const nearbyMatch = allMatches[nearbyId]

        if (!nearbyMatch.player1 || !nearbyMatch.player2 || nearbyMatch.winner) continue

        const isNearbyP1Freilos = isFreilos(nearbyMatch.player1)
        const isNearbyP2Freilos = isFreilos(nearbyMatch.player2)

        if (isNearbyP1Freilos && isNearbyP2Freilos) {
          const temp = match.player2
          match.player2 = nearbyMatch.player2
          nearbyMatch.player2 = temp
          console.log(
            `[v0] Optimized: Swapped ${match.player2} from Match ${matchId} with ${nearbyMatch.player2} from Match ${nearbyId}`,
          )
          return
        }
      }
    }
  }

  const findNearbyMatches = (matchId: number): number[] => {
    const rounds = getNearbyRoundGroups128()

    for (const [, matches] of Object.entries(rounds)) {
      if (matches.includes(matchId)) {
        return matches.filter((id) => id !== matchId)
      }
    }

    return []
  }

  const handleCancelClick = () => {
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    setCancelDialogOpen(false)
    await markTournamentAsCancelled(tournamentId)
    await deleteMatchStatesFromDatabase(tournamentType, tournamentId)
    await deleteRankingsFromDatabase(tournamentType, tournamentId)
    await deleteFreiloseFromDatabase(tournamentType, tournamentId)
    await clearTournamentRegistration(tournamentId)
    router.push("/dko_tournament_registration")
  }

  const resetMatch = async (matchId: number) => {
    const match = matches[matchId]

    if (matchId === 254 || matchId === 255) {
      console.log(`[v0] Resetting finale Match ${matchId}, removing both players from rankings...`)

      if (match.player1) {
        await removePlayerFromRankings(match.player1, tournamentType, tournamentId)
      }
      if (match.player2) {
        await removePlayerFromRankings(match.player2, tournamentType, tournamentId)
      }
    } else {
      const oldLoser = match.loser

      if (oldLoser) {
        const lossMatches = Object.values(matches).filter((m) => m.loser === oldLoser && m.winner)
        const losses = lossMatches.length

        console.log(`[v0] Resetting Match ${matchId}: ${oldLoser} had ${losses} losses before reset`)

        if (losses === 2) {
          console.log(`[v0] ${oldLoser} was eliminated, removing from rankings...`)
          await removePlayerFromRankings(oldLoser, tournamentType, tournamentId)
        }
      }
    }

    setMatches((prev) => {
      const newMatches = { ...prev }
      const match = newMatches[matchId]

      const oldWinner = match.winner
      const oldLoser = match.loser

      newMatches[matchId] = {
        ...match,
        score1: 0,
        score2: 0,
        winner: undefined,
        loser: undefined,
        machineNumber: undefined,
        callCount: undefined,
      }

      if (oldWinner || oldLoser) {
        clearSubsequentMatches(newMatches, matchId, oldWinner, oldLoser)
        // Also purge the affected players from any later matches (cascade reset)
        purgePlayerFromFutureMatches(newMatches, matchId, oldWinner)
        purgePlayerFromFutureMatches(newMatches, matchId, oldLoser)
      }

      return newMatches
    })
  }

  const clearSubsequentMatches = (
    allMatches: Record<number, Match>,
    matchId: number,
    winner?: string,
    loser?: string,
  ) => {
    const progressionMap = createProgressionMap128()
    const progression = progressionMap[matchId]

    if (winner && progression?.winner) {
      const targetMatch = allMatches[progression.winner.matchId]
      if (targetMatch?.player1 === winner) targetMatch.player1 = ""
      if (targetMatch?.player2 === winner) targetMatch.player2 = ""
    }

    if (loser && progression?.loser) {
      const targetMatch = allMatches[progression.loser.matchId]
      if (targetMatch?.player1 === loser) targetMatch.player1 = ""
      if (targetMatch?.player2 === loser) targetMatch.player2 = ""
    }

    if (matchId === 254 && winner === allMatches[254]?.player1) {
      if (allMatches[255]?.player1 === winner) allMatches[255].player1 = ""
      if (allMatches[255]?.player2 === winner) allMatches[255].player2 = ""
    }

    if (matchId === 254 && loser) {
      if (allMatches[255]?.player1 === loser) allMatches[255].player1 = ""
      if (allMatches[255]?.player2 === loser) allMatches[255].player2 = ""
    }
  }

  // When a match is reset, we must also remove the affected players from ALL later matches.
  // Otherwise the database can keep "stale" players in lower rounds (because they had already progressed further).
  const purgePlayerFromFutureMatches = (allMatches: Record<number, Match>, fromMatchId: number, player?: string) => {
    if (!player) return
    if (isFreilos(player)) return

    Object.values(allMatches).forEach((m) => {
      if (!m) return
      // only touch matches AFTER the reset match
      if (m.id <= fromMatchId) return

      let changed = false

      if (m.player1 === player) {
        m.player1 = ""
        m.score1 = 0
        changed = true
      }
      if (m.player2 === player) {
        m.player2 = ""
        m.score2 = 0
        changed = true
      }

      if (m.winner === player) {
        m.winner = undefined
        changed = true
      }
      if (m.loser === player) {
        m.loser = undefined
        changed = true
      }

      if (changed) {
        // If we removed somebody, also clear machine assignment so it doesn't show as "live"
        m.machineNumber = undefined
        m.callCount = undefined
      }
    })
  }
  
  

const autoResolveFreilosMatch = (allMatches: Record<number, Match>, matchId: number) => {
  const match = allMatches[matchId]
  if (!match || match.winner || !match.player1 || !match.player2) return

  const isP1Freilos = isFreilos(match.player1)
  const isP2Freilos = isFreilos(match.player2)

  if (!isP1Freilos && !isP2Freilos) return
  if (isP1Freilos && isP2Freilos) return

  const realPlayer = isP1Freilos ? match.player2 : match.player1
  const freilosPlayer = isP1Freilos ? match.player1 : match.player2

  console.log(`[v0] Auto-resolving Freilos match ${matchId}: ${realPlayer} beats ${freilosPlayer}`)

  applyCompletedMatch(allMatches, matchId, realPlayer, freilosPlayer, {
    score1: isP1Freilos ? 0 : 2,
    score2: isP2Freilos ? 0 : 2,
    machineNumber: undefined,
    callCount: undefined,
  })
}
  
  
  

  useEffect(() => {
    const fetchRegisteredPlayers = async () => {
      if (initializingRef.current) {
        console.log("[v0] Already initializing, skipping duplicate call")
        return
      }

      initializingRef.current = true

      try {
        const urlTournamentId = searchParams.get("tournamentId")
        const urlTournamentName = searchParams.get("tournamentName")
        let currentTournamentId: string

        if (urlTournamentId) {
          currentTournamentId = urlTournamentId
          console.log("[v0] Using existing tournament ID from URL:", currentTournamentId)
        } else {
          currentTournamentId = crypto.randomUUID()
          console.log("[v0] Generated new tournament ID:", currentTournamentId)

          const newUrl = new URL(window.location.href)
          newUrl.searchParams.set("tournamentId", currentTournamentId)
          if (urlTournamentName) {
            newUrl.searchParams.set("tournamentName", urlTournamentName)
          }
          newUrl.searchParams.delete("shuffle")
          window.history.replaceState({}, "", newUrl.toString())
        }

        setTournamentId(currentTournamentId)

        if (urlTournamentName) {
          const decodedName = decodeURIComponent(urlTournamentName)
          setTournamentName(decodedName)
          console.log("[v0] Tournament name from URL:", decodedName)
        } else {
          setTournamentName("Unbenanntes Turnier")
          console.log("[v0] No tournament name provided, using default")
        }

        const savedMatches = await loadMatchStatesFromDatabase(tournamentType, currentTournamentId)

        if (savedMatches) {
          console.log("[v0] ✓ Loaded saved tournament state - tournament will continue from where it left off")
          setMatches(savedMatches)
          setLoading(false)
          return
        }

        console.log("[v0] No saved state found - initializing new tournament")

        const { error: statusError } = await supabase.from("tournaments_status").insert({
          tournament_id: currentTournamentId,
          tournament_type: tournamentType,
          tournament_name: urlTournamentName ? decodeURIComponent(urlTournamentName) : "Unbenanntes Turnier",
          status: "active",
        })

        if (statusError && statusError.code !== "23505") {
          console.error("[v0] Error creating tournament status:", statusError)
        }

        const { data, error } = await supabase
          .from("dko_tournament_registration")
          .select("player_name")
          .order("registered_at", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          let playerNames = data.map((p) => p.player_name)

          const existingFreilose = await loadFreiloseFromDatabase(tournamentType, currentTournamentId)

          if (existingFreilose.length === 0) {
            console.log("[v0] No existing Freilose found, creating new ones")
            playerNames = distributePlayersWithFreilose(playerNames, bracketSize)

            const freilose = playerNames.filter((name) => isFreilos(name))
            if (freilose.length > 0) {
              console.log("[v0] Saving", freilose.length, "Freilose to database")
              await saveFreiloseToDatabase(freilose, tournamentType, currentTournamentId)
            }
          } else {
            console.log("[v0] Using existing Freilose from database:", existingFreilose)
            const freilosCount = bracketSize - playerNames.length
            if (freilosCount > 0) {
              playerNames = [...playerNames, ...existingFreilose.slice(0, freilosCount)]
            }
          }

          setMatches((prev) => {
            const newMatches = { ...prev }

            const firstRoundMatches = bracketSize / 2
            for (let i = 0; i < firstRoundMatches; i++) {
              const matchId = i + 1
              const player1Index = i * 2
              const player2Index = i * 2 + 1

              newMatches[matchId] = {
                ...newMatches[matchId],
                player1: playerNames[player1Index] || "",
                player2: playerNames[player2Index] || "",
              }
            }

            return newMatches
          })
        }
      } catch (error) {
        console.error("Fehler beim Laden der registrierten Spieler:", error)
      } finally {
        setLoading(false)
        initializingRef.current = false
      }
    }

    fetchRegisteredPlayers()
  }, [searchParams, bracketSize, tournamentType])

const availableMachines = getAvailableMachines()
const allMatches = Object.values(matches).sort((a, b) => a.id - b.id)

const activeLiveMatches = allMatches.filter(
  (match) => match.player1 && match.player2 && !match.winner && match.machineNumber
)

const readyMatches = allMatches.filter(
  (match) => match.player1 && match.player2 && !match.winner && !match.machineNumber
)

const completedMatches = allMatches.filter((match) => Boolean(match.winner))

const liveMachineNumbers = activeLiveMatches
  .map((match) => match.machineNumber)
  .filter((value): value is number => Boolean(value))

const totalMatchCount = 255
const completedCount = completedMatches.length
const remainingCount = Math.max(totalMatchCount - completedCount, 0)
const liveCompletion = Math.round((completedCount / totalMatchCount) * 100)
const winnerName =
  matches[255].winner || (matches[254].winner === matches[254].player1 ? matches[254].winner : undefined)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Lade Spieler...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {bracketSize}er DKO - {tournamentName}
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={announcementsEnabled}
                onChange={(e) => setAnnouncementsEnabled(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span>Ansage aktivieren</span>
            </label>
            <Button onClick={fetchRankings} variant="outline" disabled={loadingRankings || !tournamentId}>
              {loadingRankings ? "Lädt..." : "Rangliste"}
            </Button>
            <Button onClick={handleCancelClick} variant="outline">
              Abbrechen
            </Button>
          </div>
        </div>


        <Card className="overflow-hidden border-0 shadow-xl bg-white text-slate-900 border border-slate-200">
          <div className="p-5 md:p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                  <Radio className="h-3.5 w-3.5" />
                  LIVE Center
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Alles Wichtige auf einen Blick</h2>
                  <p className="text-sm md:text-base text-slate-600">
                    Laufende Spiele, freie Automaten und die nächsten Matches sofort sichtbar.
                  </p>
                </div>
              </div>

              <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Turnier-Fortschritt</span>
                  <span className="font-semibold text-slate-900">{liveCompletion}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${liveCompletion}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Fertig</div>
                    <div className="mt-1 font-semibold">{completedCount} von {totalMatchCount} Matches</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {winnerName ? "Sieger" : "Offen"}
                    </div>
                    <div className="mt-1 font-semibold">{winnerName ? winnerName : `${remainingCount} Matches`}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">LIVE Matches</span>
                  <Activity className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{activeLiveMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Aktuell auf Automaten gestartet</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Bereit</span>
                  <Clock3 className="h-4 w-4 text-orange-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{readyMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Sofort startbare Matches</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Frei</span>
                  <Radio className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-2 text-3xl font-bold">{availableMachines.length}</div>
                <p className="mt-1 text-xs text-slate-500">Verfügbare Automaten</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Abgeschlossen</span>
                  <Trophy className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-3xl font-bold">{completedMatches.length}</div>
                <p className="mt-1 text-xs text-slate-500">Bereits bestätigte Matches</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg">Gerade LIVE</h3>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                    {liveMachineNumbers.length > 0 ? `Automaten ${liveMachineNumbers.join(", ")}` : "Noch kein Spiel gestartet"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {activeLiveMatches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      Noch kein LIVE-Match aktiv. Starte ein Match und es erscheint sofort hier oben.
                    </div>
                  ) : (
                    activeLiveMatches.map((match) => {
                      const canConfirmLive = match.score1 !== match.score2 && (match.score1 > 0 || match.score2 > 0)
                      const nextCall = Math.min((match.callCount || 1) + 1, 3)

                      return (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-red-200 bg-red-50/40 px-4 py-4 shadow-sm"
                        >
						
						
						
						
						
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
  <div>
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
      <span>Match {match.id}</span>
      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-white">
        LIVE
      </span>
    </div>
    <div className="mt-1 text-base font-semibold">
      {match.player1} <span className="text-slate-400">vs.</span> {match.player2}
    </div>
    <div className="mt-2">
      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600">
        Automat {match.machineNumber}
      </span>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3 md:w-[190px]">
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="truncate text-xs text-slate-500">{match.player1}</div>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={match.score1 === 0 ? "" : String(match.score1)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
          updateScore(match.id, 1, cleaned === "" ? 0 : Number(cleaned))
        }}
        className="mt-2 h-10 w-14 border-slate-200 bg-slate-50 px-0 text-center text-base font-bold text-slate-900"
      />
    </div>

    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="truncate text-xs text-slate-500">{match.player2}</div>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={match.score2 === 0 ? "" : String(match.score2)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
          updateScore(match.id, 2, cleaned === "" ? 0 : Number(cleaned))
        }}
        className="mt-2 h-10 w-14 border-slate-200 bg-slate-50 px-0 text-center text-base font-bold text-slate-900"
      />
    </div>
  </div>
</div>

<div className="mt-3 flex flex-wrap items-center gap-2">
  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
    Stand {match.score1}:{match.score2}
  </span>
  {match.callCount && match.callCount < 3 && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleRepeatCall(match.id)}
      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      {nextCall}. Aufruf
    </Button>
  )}
  <Button
    size="sm"
    onClick={() => confirmMatch(match.id)}
    disabled={!canConfirmLive}
    className="bg-red-500 text-white hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-500"
  >
    <Check className="mr-1 h-4 w-4" />
    Ergebnis bestätigen
  </Button>
</div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
			  
			  
			  
			  
			  
			  
			  
			  

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg">Als Nächstes dran</h3>
                  <span className="text-xs text-slate-500">Top {Math.min(readyMatches.length, 4)}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {readyMatches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      Aktuell wartet kein startbereites Match.
                    </div>
                  ) : (
                    readyMatches.slice(0, 4).map((match) => {
                      const hasFreilos = isFreilos(match.player1) || isFreilos(match.player2)

                      return (
                        <div key={match.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">Match {match.id}</span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {hasFreilos ? "auto" : "bereit"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-slate-700">
                            {match.player1} <span className="text-slate-400">vs.</span> {match.player2}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => startMatch(match.id)}
                              className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                              {hasFreilos ? "Auto starten" : "Spiel starten"}
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>


        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-orange-600 border-b-2 border-orange-600 pb-2">Runde 1</h2>
            {[...Array(64)].map((_, i) => (
              <MatchCard
                key={i + 1}
                match={matches[i + 1]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 1</h2>
            {[...Array(32)].map((_, i) => (
              <MatchCard
                key={i + 65}
                match={matches[i + 65]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 2</h2>
            {[...Array(32)].map((_, i) => (
              <MatchCard
                key={i + 97}
                match={matches[i + 97]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 2</h2>
            {[...Array(32)].map((_, i) => (
              <MatchCard
                key={i + 129}
                match={matches[i + 129]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 3</h2>
            {[...Array(16)].map((_, i) => (
              <MatchCard
                key={i + 161}
                match={matches[i + 161]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 3</h2>
            {[...Array(16)].map((_, i) => (
              <MatchCard
                key={i + 177}
                match={matches[i + 177]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 4</h2>
            {[...Array(16)].map((_, i) => (
              <MatchCard
                key={i + 193}
                match={matches[i + 193]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 5</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 209}
                match={matches[i + 209]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 4</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 217}
                match={matches[i + 217]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 6</h2>
            {[...Array(8)].map((_, i) => (
              <MatchCard
                key={i + 225}
                match={matches[i + 225]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 7</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 233}
                match={matches[i + 233]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 5</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 237}
                match={matches[i + 237]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 8</h2>
            {[...Array(4)].map((_, i) => (
              <MatchCard
                key={i + 241}
                match={matches[i + 241]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 9</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 245}
                match={matches[i + 245]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Runde 6</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 247}
                match={matches[i + 247]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 10</h2>
            {[...Array(2)].map((_, i) => (
              <MatchCard
                key={i + 249}
                match={matches[i + 249]}
                onScoreUpdate={updateScore}
                onConfirm={confirmMatch}
                onStartMatch={startMatch}
                onReset={resetMatch}
                onRepeatCall={handleRepeatCall}
                announcementsEnabled={announcementsEnabled}
                isLoser
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 11</h2>
            <MatchCard
              match={matches[251]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isLoser
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Halbfinale</h2>
            <MatchCard
              match={matches[252]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b-2 border-destructive pb-2">Verlierer-Runde 12</h2>
            <MatchCard
              match={matches[253]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isLoser
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2">Großes Finale</h2>
            <p className="text-sm text-muted-foreground">Sieger Gewinnerseite vs. Sieger Verliererseite</p>
            <MatchCard
              match={matches[254]}
              onScoreUpdate={updateScore}
              onConfirm={confirmMatch}
              onStartMatch={startMatch}
              onReset={resetMatch}
              onRepeatCall={handleRepeatCall}
              announcementsEnabled={announcementsEnabled}
              isGrandFinal
            />
          </div>


                    {((matches[255]?.player1) ||
            (matches[255]?.player2) ||
            (matches[254]?.winner === matches[254]?.player2 && matches[254]?.winner)) &&
            !matches[255]?.winner && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-purple-600 border-b-2 border-purple-600 pb-2">Bracket Reset</h2>
                <p className="text-sm text-muted-foreground">
                  Der Spieler von der Verliererseite hat gewonnen! Beide Spieler haben jetzt je 1 Niederlage.
                </p>
                <MatchCard
                  match={
                    matches[255] ?? {
                      id: 255,
                      player1: "",
                      player2: "",
                      score1: 0,
                      score2: 0,
                      callCount: 1,
                    }
                  }
                  onScoreUpdate={updateScore}
                  onConfirm={confirmMatch}
                  onStartMatch={startMatch}
                  onReset={resetMatch}
                  onRepeatCall={handleRepeatCall}
                  announcementsEnabled={announcementsEnabled}
                  isGrandFinal
                />
              </div>
            )}

          {((matches[255]?.winner) || (matches[254]?.winner === matches[254]?.player1 && matches[254]?.player1)) && (
            <Card className="p-6 bg-primary text-primary-foreground">
              <h3 className="text-2xl font-bold text-center">🏆 Turniersieger</h3>
              <p className="text-3xl font-bold text-center mt-4">{matches[255]?.winner || matches[254]?.winner}</p>

              <div className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center">
                <p className="text-sm font-semibold">
                  Normales Turnier? Dann einfach „Turnier abschließen“ wählen.
                </p>
                <p className="mt-1 text-xs opacity-90">
                  Die Serien-Buttons nur verwenden, wenn dieses Turnier wirklich zur jeweiligen Gesamtwertung zählt.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                <Button
                  onClick={saveToTournamentSeries}
                  disabled={savingToSeries}
                  size="lg"
                  variant="secondary"
                  className="font-semibold"
                >
                  {savingToSeries ? "Speichere..." : "In Lion Cup / Turnierserie speichern"}
                </Button>
                <Button
                  onClick={async () => {
                    await markTournamentAsCompleted(tournamentId)
                    await deleteFreiloseFromDatabase(tournamentType, tournamentId)
                    await clearTournamentRegistration(tournamentId)
                    router.push("/dko_tournament_registration")
                  }}
                  size="lg"
                  variant="outline"
                  className="font-semibold bg-background text-foreground hover:bg-background/90"
                >
                  Turnier abschließen
                </Button>
              </div>
            </Card>
          )}
        </div>

      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Automat auswählen</DialogTitle>
            <DialogDescription>Wähle einen verfügbaren Automaten für Match {selectedMatchId}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {availableMachines.length === 0 ? (
              <p className="col-span-4 text-center text-muted-foreground">Keine Automaten verfügbar</p>
            ) : (
              availableMachines.map((num) => (
                <Button key={num} onClick={() => assignMachine(num)} variant="outline" className="h-16 text-lg">
                  {num}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turnier abbrechen?</DialogTitle>
            <DialogDescription>
              Möchtest du wirklich zur Registrierung zurückkehren? Das aktuelle Turnier wird nicht gespeichert.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Nein, weiterspielen
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Ja, abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rankingsDialogOpen} onOpenChange={setRankingsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tabelle</DialogTitle>
            <DialogDescription>Aktuelle Platzierungen im Turnier</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {rankings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Noch keine Platzierungen vorhanden</p>
            ) : (
              rankings.map((ranking) => (
                <div
                  key={`${ranking.placement}-${ranking.player_name}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    ranking.placement === 1 && "bg-yellow-50 border-yellow-400",
                    ranking.placement === 2 && "bg-gray-100 border-gray-400",
                    ranking.placement === 3 && "bg-orange-50 border-orange-400",
                    ranking.placement > 3 && "bg-muted",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-2xl font-bold w-8 text-center",
                        ranking.placement === 1 && "text-yellow-600",
                        ranking.placement === 2 && "text-gray-600",
                        ranking.placement === 3 && "text-orange-600",
                        ranking.placement > 3 && "text-muted-foreground",
                      )}
                    >
                      {ranking.placement === 1
                        ? "🥇"
                        : ranking.placement === 2
                          ? "🥈"
                          : ranking.placement === 3
                            ? "🥉"
                            : ranking.placement}
                    </span>
                    <span className="font-medium">{ranking.player_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Platz {ranking.placement}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
	</div>
  )
}

interface MatchCardProps {
  match: Match
  onScoreUpdate: (matchId: number, player: 1 | 2, score: number) => void
  onConfirm: (matchId: number) => void
  onStartMatch: (matchId: number) => void
  onReset: (matchId: number) => void
  onRepeatCall: (matchId: number) => void
  announcementsEnabled: boolean
  isLoser?: boolean
  isGrandFinal?: boolean
}

function MatchCard({
  match,
  onScoreUpdate,
  onConfirm,
  onStartMatch,
  onReset,
  onRepeatCall,
  announcementsEnabled,
  isLoser,
  isGrandFinal,
}: MatchCardProps) {
  const isPlayer1Winner = match.winner === match.player1
  const isPlayer2Winner = match.winner === match.player2
  const isPlayer1Loser = match.loser === match.player1
  const isPlayer2Loser = match.loser === match.player2
  const isRunning = match.machineNumber && !match.winner
  const canConfirm =
    match.machineNumber && !match.winner && match.score1 !== match.score2 && (match.score1 > 0 || match.score2 > 0)

  const hasFreilos = isFreilos(match.player1) || isFreilos(match.player2)

  const callCount = match.callCount || 0
  const showSecondCall = announcementsEnabled && isRunning && callCount === 1
  const showThirdCall = announcementsEnabled && isRunning && callCount === 2

  return (
    <Card
      className={cn(
        "p-3 space-y-2 transition-all",
        isGrandFinal && "border-2 border-primary shadow-lg",
        isLoser && "border-l-4 border-l-destructive",
        isRunning && "border-2 border-orange-500 shadow-lg shadow-orange-500/20 bg-orange-50/50",
        hasFreilos && !match.winner && "border-l-4 border-l-yellow-500 bg-yellow-50/30",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground">Match {match.id}</span>
        <div className="flex items-center gap-2">
          {match.machineNumber && !match.winner && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded animate-pulse">
              🎯 Automat {match.machineNumber}
            </span>
          )}
          {showSecondCall && (
            <Button
              size="sm"
              onClick={() => onRepeatCall(match.id)}
              variant="outline"
              className="h-7 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              2. Aufruf
            </Button>
          )}
          {showThirdCall && (
            <Button
              size="sm"
              onClick={() => onRepeatCall(match.id)}
              variant="outline"
              className="h-7 text-xs border-red-500 text-red-600 hover:bg-red-50"
            >
              3. Aufruf
            </Button>
          )}
          {canConfirm && (
            <Button
              size="sm"
              onClick={() => onConfirm(match.id)}
              className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Bestätigen
            </Button>
          )}
          {match.winner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReset(match.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              title="Match zurücksetzen"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          {!match.machineNumber && !match.winner && match.player1 && match.player2 && (
            <Button size="sm" onClick={() => onStartMatch(match.id)} className="h-6 text-xs">
              {hasFreilos ? "Auto" : "Starten"}
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md transition-colors",
          isPlayer1Winner && "bg-orange-100 border-2 border-orange-500",
          isPlayer1Loser && "bg-red-100 border border-red-300",
          !isPlayer1Winner && !isPlayer1Loser && "bg-muted",
          isFreilos(match.player1) && "bg-yellow-100 border border-yellow-400",
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !match.player1 && "text-muted-foreground italic",
              isPlayer1Winner && "font-semibold text-orange-700",
              isPlayer1Loser && "text-red-600",
              isFreilos(match.player1) && "text-yellow-700 italic font-medium",
            )}
          >
            {match.player1 || "Warte auf Spieler..."}
          </p>
          {isPlayer1Winner && <span className="text-orange-600 font-bold">✓</span>}
        </div>
        <Input
          type="number"
          min="0"
          max="2"
          value={match.score1}
          onChange={(e) => onScoreUpdate(match.id, 1, Number.parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-center"
          disabled={!match.player1 || !match.player2 || !match.machineNumber}
        />
      </div>

      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md transition-colors",
          isPlayer2Winner && "bg-orange-100 border-2 border-orange-500",
          isPlayer2Loser && "bg-red-100 border border-red-300",
          !isPlayer2Winner && !isPlayer2Loser && "bg-muted",
          isFreilos(match.player2) && "bg-yellow-100 border border-yellow-400",
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !match.player2 && "text-muted-foreground italic",
              isPlayer2Winner && "font-semibold text-orange-700",
              isPlayer2Loser && "text-red-600",
              isFreilos(match.player2) && "text-yellow-700 italic font-medium",
            )}
          >
            {match.player2 || "Warte auf Spieler..."}
          </p>
          {isPlayer2Winner && <span className="text-orange-600 font-bold">✓</span>}
        </div>
        <Input
          type="number"
          min="0"
          max="2"
          value={match.score2}
          onChange={(e) => onScoreUpdate(match.id, 2, Number.parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-center"
          disabled={!match.player1 || !match.player2 || !match.machineNumber}
        />
      </div>
    </Card>
  )
}


// ------------------------------
// VS INTRO OVERLAY (orange style)
// ------------------------------

"use client"

import type { GameMode, TournamentState } from "@/types/tournament"

export const KRATZER_BEAMER_CHANNEL = "emd-kratzer-beamer-v1"
export const KRATZER_BEAMER_SNAPSHOT_KEY = "emd:kratzer:beamer:snapshot"
export const KRATZER_BEAMER_EVENT_KEY = "emd:kratzer:beamer:event"

export type KratzerBeamerPlayer = {
  id: string
  name: string
  ligastatus: string
  lives: number
  isEliminated: boolean
  eliminationRound: number | null
}

export type KratzerBeamerBoard = {
  id: number
  players: KratzerBeamerPlayer[]
  startTime: number | null
  gameMode?: GameMode | null
}

export type KratzerBeamerSnapshot = {
  tournamentId: string | null
  currentRound: number
  tournamentFinished: boolean
  winner: KratzerBeamerPlayer | null
  boards: KratzerBeamerBoard[]
  players: KratzerBeamerPlayer[]
  settings: {
    suddenDeathEnabled: boolean
    suddenDeathTime: number
    diceModeEnabled: boolean
  }
  isTournamentRunning: boolean
  updatedAt: number
}

export type KratzerBeamerEvent =
  | { type: "dice-start"; round: number; at: number }
  | { type: "dice-result"; round: number; face: number; mode: GameMode; at: number }
  | { type: "pause-start"; minutes: number; until: number; at: number }
  | { type: "pause-end"; at: number }

function postMessage(message: { kind: "snapshot"; payload: KratzerBeamerSnapshot } | { kind: "event"; payload: KratzerBeamerEvent }) {
  if (typeof window === "undefined") return
  try {
    const channel = new BroadcastChannel(KRATZER_BEAMER_CHANNEL)
    channel.postMessage(message)
    channel.close()
  } catch {
    // localStorage bleibt als Fallback aktiv.
  }
}

export function createKratzerBeamerSnapshot(
  state: TournamentState,
  isTournamentRunning: boolean,
): KratzerBeamerSnapshot {
  const mapPlayer = (player: TournamentState["players"][number]): KratzerBeamerPlayer => ({
    id: String(player.id),
    name: player.name,
    ligastatus: player.ligastatus,
    lives: player.lives,
    isEliminated: player.isEliminated,
    eliminationRound: player.eliminationRound,
  })

  return {
    tournamentId: state.tournamentId,
    currentRound: state.currentRound,
    tournamentFinished: state.tournamentFinished,
    winner: state.winner ? mapPlayer(state.winner) : null,
    boards: state.boards.map((board) => ({
      id: board.id,
      startTime: board.startTime ?? null,
      gameMode: board.gameMode ?? null,
      players: board.players.map(mapPlayer),
    })),
    players: state.players.map(mapPlayer),
    settings: {
      suddenDeathEnabled: Boolean(state.settings.suddenDeathEnabled),
      suddenDeathTime: Number(state.settings.suddenDeathTime || 0),
      diceModeEnabled: Boolean(state.settings.diceModeEnabled),
    },
    isTournamentRunning,
    updatedAt: Date.now(),
  }
}

export function publishKratzerBeamerSnapshot(state: TournamentState, isTournamentRunning: boolean) {
  if (typeof window === "undefined") return
  const snapshot = createKratzerBeamerSnapshot(state, isTournamentRunning)
  try {
    window.localStorage.setItem(KRATZER_BEAMER_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignorieren, BroadcastChannel kann weiterhin funktionieren.
  }
  postMessage({ kind: "snapshot", payload: snapshot })
}

export function publishKratzerBeamerEvent(event: Omit<KratzerBeamerEvent, "at"> & { at?: number }) {
  if (typeof window === "undefined") return
  const payload = { ...event, at: event.at ?? Date.now() } as KratzerBeamerEvent
  try {
    window.localStorage.setItem(KRATZER_BEAMER_EVENT_KEY, JSON.stringify(payload))
  } catch {
    // Ignorieren, BroadcastChannel kann weiterhin funktionieren.
  }
  postMessage({ kind: "event", payload })
}

export function readKratzerBeamerSnapshot(): KratzerBeamerSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KRATZER_BEAMER_SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as KratzerBeamerSnapshot) : null
  } catch {
    return null
  }
}

export function readKratzerBeamerEvent(): KratzerBeamerEvent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KRATZER_BEAMER_EVENT_KEY)
    return raw ? (JSON.parse(raw) as KratzerBeamerEvent) : null
  } catch {
    return null
  }
}

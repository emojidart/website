export interface SpieldatenbankEntry {
  id: string
  name: string
  verein?: string
  ligastatus?: string
  geschlecht?: string
  paid?: boolean // Added for tournament registration
}

export interface KratzerPlayer {
  id: string // This will be player_id from spieldatenbank
  name: string
  ligastatus: string
  lives: number
  isEliminated: boolean
  eliminationRound: number | null
  eliminationTime: string | null
  manuallyToggled?: boolean // Added optional field to track manual elimination toggles
}

export const DICE_GAME_MODES = {
  1: "701 SO",
  2: "501 DO",
  3: "501 MO",
  4: "CRICKET",
  5: "SPLIT SCORE",
  6: "RANDOM CRICKET",
} as const

export type DiceFace = keyof typeof DICE_GAME_MODES
export type GameMode = (typeof DICE_GAME_MODES)[DiceFace]

export interface Board {
  id: number
  players: KratzerPlayer[]
  startTime: number | null // Timestamp
  timer: NodeJS.Timeout | null // Reference to setInterval timer
  gameMode?: GameMode | null // Gewürfelter Modus dieser Runde
}

export interface TournamentSettings {
  boardCount: number
  maxGroupSize: number
  suddenDeathEnabled: boolean
  suddenDeathTime: number // in minutes
  speechEnabled: boolean
  diceModeEnabled: boolean // Würfelmodus vor jeder neuen Runde
}

export interface TournamentState {
  currentRound: number
  tournamentId: string | null
  tournamentFinished: boolean
  winner: KratzerPlayer | null
  boards: Board[]
  players: KratzerPlayer[] // All players in the tournament, with their current lives/status
  settings: TournamentSettings
  lastError?: string | null // Added field to track tournament errors for recovery
}

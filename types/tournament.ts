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
}

export interface Board {
  id: number
  players: KratzerPlayer[]
  startTime: number | null // Timestamp
  timer: NodeJS.Timeout | null // Reference to setInterval timer
}

export interface TournamentSettings {
  boardCount: number
  maxGroupSize: number
  suddenDeathEnabled: boolean
  suddenDeathTime: number // in minutes
  speechEnabled: boolean
}

export interface TournamentState {
  currentRound: number
  tournamentId: string | null
  tournamentFinished: boolean
  winner: KratzerPlayer | null
  boards: Board[]
  players: KratzerPlayer[] // All players in the tournament, with their current lives/status
  settings: TournamentSettings
}

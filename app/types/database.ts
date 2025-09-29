export interface Database {
  public: {
    Tables: {
      kratzer_tournaments: {
        Row: {
          id: string
          user_id: string
          name: string
          status: string
          board_count: number
          max_group_size: number
          sudden_death_enabled: boolean
          sudden_death_time: number
          speech_enabled: boolean
          current_round: number | null
          winner_id: string | null
          winner_name: string | null
          total_rounds: number | null
          created_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status: string
          board_count: number
          max_group_size: number
          sudden_death_enabled: boolean
          sudden_death_time: number
          speech_enabled: boolean
          current_round?: number | null
          winner_id?: string | null
          winner_name?: string | null
          total_rounds?: number | null
          created_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          status?: string
          board_count?: number
          max_group_size?: number
          sudden_death_enabled?: boolean
          sudden_death_time?: number
          speech_enabled?: boolean
          current_round?: number | null
          winner_id?: string | null
          winner_name?: string | null
          total_rounds?: number | null
          created_at?: string
          finished_at?: string | null
        }
      }
      kratzer_tournament_players: {
        Row: {
          id: string
          kratzer_tournament_id: string
          player_id: string
          player_name: string
          ligastatus: string
          lives: number
          is_eliminated: boolean
          elimination_round: number | null
          elimination_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          kratzer_tournament_id: string
          player_id: string
          player_name: string
          ligastatus: string
          lives: number
          is_eliminated: boolean
          elimination_round?: number | null
          elimination_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          kratzer_tournament_id?: string
          player_id?: string
          player_name?: string
          ligastatus?: string
          lives?: number
          is_eliminated?: boolean
          elimination_round?: number | null
          elimination_time?: string | null
          created_at?: string
        }
      }
      kratzer_tournament_rounds: {
        Row: {
          id: string
          kratzer_tournament_id: string
          round_number: number
          boards_data: any
          created_at: string
        }
        Insert: {
          id?: string
          kratzer_tournament_id: string
          round_number: number
          boards_data: any
          created_at?: string
        }
        Update: {
          id?: string
          kratzer_tournament_id?: string
          round_number?: number
          boards_data?: any
          created_at?: string
        }
      }
      kratzer_tournament_registrations: {
        Row: {
          id: string
          player_id: string
          player_name: string
          ligastatus: string
          paid: boolean
          registered_at: string
        }
        Insert: {
          id?: string
          player_id: string
          player_name: string
          ligastatus: string
          paid: boolean
          registered_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          player_name?: string
          ligastatus?: string
          paid?: boolean
          registered_at?: string
        }
      }
      spieldatenbank: {
        Row: {
          id: string
          name: string
          verein: string | null
          ligastatus: string | null
          geschlecht: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          verein?: string | null
          ligastatus?: string | null
          geschlecht?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          verein?: string | null
          ligastatus?: string | null
          geschlecht?: string | null
          created_at?: string
        }
      }
    }
  }
}

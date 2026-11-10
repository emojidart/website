/** Shared member UI models. Keep these separate from database query result types. */
export interface ClubPlayerProfile {
  id: string
  name: string
  photo_url: string | null
  throwing_hand?: string | null
  age?: number | null
  origin?: string | null
  created_at?: string | null
  spieldatenbank_id?: string | null
  birthdate?: string | null
  spieldatenbank?: { id?: string; name?: string; verein?: string | null; player_code?: string | null } | null
}

export interface UserProfile {
  id: string
  user_id: string
  player_id: string | null
  club_players: ClubPlayerProfile | null
}

export interface TeamMembership {
  id: string
  team_id: string
  role: string
  teams: { id: string; name: string; logo_url?: string | null } | null
}

export interface Match {
  id: string
  match_date: string
  match_time?: string | null
  status?: string | null
  home_score?: number | null
  away_score?: number | null
  home_team_type?: string | null
  away_team_type?: string | null
  home_team_id?: string | null
  away_team_id?: string | null
  home_opponent_team_id?: string | null
  away_opponent_team_id?: string | null
  home_team?: { id?: string; name: string } | null
  away_team?: { id?: string; name: string } | null
  home_opponent_team?: { id?: string; name: string } | null
  away_opponent_team?: { id?: string; name: string } | null
}

export interface Notification {
  id: string
  message: string
  created_at: string
  statistics_entry_id?: string | null
  match?: Pick<Match, "match_date" | "home_team_type" | "away_team_type" | "home_team" | "away_team" | "home_opponent_team" | "away_opponent_team"> | null
  player?: { name: string } | null
  leg_statistics?: {
    leg_number: number
    player_legs_won: number
    opponent_legs_won: number
  } | null
}

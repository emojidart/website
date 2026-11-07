/** Display models for the legacy Liga pages.
 * Keep nullable score/date fields distinct from zero and absent values.
 */
export type LeagueTeam = {
  id: string
  name: string
  logo_url?: string | null
  dart_type?: string | null
  user_id?: string | null
}

export type LeagueMatch = {
  id: string
  match_date: string
  match_time?: string | null
  original_date?: string | null
  season_id?: string | null
  status: string
  home_score?: number | null
  away_score?: number | null
  home_team_id?: string | null
  away_team_id?: string | null
  home_opponent_team_id?: string | null
  away_opponent_team_id?: string | null
  home_team?: LeagueTeam | null
  away_team?: LeagueTeam | null
  home_opponent_team?: LeagueTeam | null
  away_opponent_team?: LeagueTeam | null
}

export type LeaguePlayer = {
  id: string
  name: string
  team_id: string | null
  team_name?: string | null
  photo_url?: string | null
}

export type LeagueLegStat = {
  player_id: string
  player?: { name: string | null; photo_url?: string | null } | null
  player_legs_won?: number | null
  opponent_legs_won?: number | null
  throws_15?: number | null
  throws_16?: number | null
  throws_17?: number | null
  throws_18?: number | null
  throws_19?: number | null
  throws_20?: number | null
  throws_95_plus?: number | null
  throws_171?: number | null
  throws_180?: number | null
  throws_tonne?: number | null
  throws_high_tonne?: number | null
  throws_shanghai?: number | null
  throws_bull?: number | null
}

export type LeagueStanding = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  legsFor: number
  legsAgainst: number
  legsDifference: number
}

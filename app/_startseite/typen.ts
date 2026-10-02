export interface Match {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  home_score: number | null
  away_score: number | null
  match_date: string
  matchday: number
  status: string
  match_time?: string
  dart_type?: string | null
  home_team?: {
    id: string
    name: string
    logo_url?: string
    dart_type?: string | null
  }
  away_team?: {
    id: string
    name: string
    logo_url?: string
    dart_type?: string | null
  }
  home_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_opponent_team?: {
    id: string
    name: string
    logo_url?: string
  }
}

export interface Tournament {
  id: string
  name: string
  date: string
  time: string
  location: string
  entry_fee: number
  mode: string
  details: string | null
  photo_url: string | null
}

export interface Event {
  id: string
  name: string
  event_date: string
  start_date: string | null
  end_date: string | null
  event_time: string | null
  location: string | null
  event_type: string
  description: string | null
  photo_url: string | null
  max_participants: number | null
  draft_enabled?: boolean
  draw_mode?: "online" | "onsite" | null
  draw_datetime?: string | null
  draw_location?: string | null
  draw_attendance_required?: boolean
}

export interface CombinedEvent {
  id: string
  name: string
  date: string
  start_date?: string | null
  end_date?: string | null
  time: string
  location: string
  details: string | null
  photo_url: string | null
  type: "tournament" | "event"
  eventType?: string
  entry_fee?: number | null
  startgeld_details?: string | null
  mode?: string | null
  max_participants?: number | null
  sourceKind?: "internal" | "dach"
  internalEventId?: string | null
  dachEventId?: string | null
}

export interface LionCupEvent {
  id: string
  name: string
  event_date: string
  event_time: string | null
  event_type: string
  description: string | null
  matchday?: number | null
}

export type DkoSeriesEventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  is_matchday: boolean
  registration_cutoff_minutes: number | null
  is_rescheduled?: boolean | null
  rescheduled_at?: string | null
}

export type UiDkoEvent = {
  id: string
  series_id: string
  title: string | null
  is_matchday: boolean
  cutoffMinutes: number
  originalDT: Date
  effectiveDT: Date
  effectiveISODate: string
  effectiveTimeHHMM: string
}

export interface ActiveTournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  status: string
}

export type BirthdayPlayer = {
  id: string
  name: string
  birthdate: string
  age: number | null
}

export type InternalSignupEvent = {
  id: string
  title: string
  subtitle: string | null
  event_date: string | null
  end_date: string | null
  date_open: boolean
  start_time: string | null
  location: string | null
  image_url: string | null
  image_path: string | null
  max_participants: number | null
}

export type HomeLeagueMatch = Match & {
  my_team_id: string
  my_status: "none" | "yes" | "maybe" | "no"
}

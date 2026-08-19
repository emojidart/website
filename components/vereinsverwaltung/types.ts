import type { User } from "@supabase/supabase-js"

export interface ClubPlayerManagementProps {
  user: User | null
  onDataSaved?: () => void
}
export interface ClubPlayer {
  id: string
  name: string
  photo_url: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  birthdate: string | null
  player_number: number | null
  jersey_size: string | null
  email: string | null
  phone: string | null
  iban: string | null

  // Mitgliedschaft (Tab "Mitgliedschaft")
  club_joined_at: string | null
  club_left_at: string | null
}

export type DartType = "edart" | "steeldart"

export interface Team {
  id: string
  name: string
  logo_url: string | null
  dart_type: DartType
}

export interface TeamMember {
  id: string
  team_id: string
  player_id: string
  player_name: string
  role: string | null
}

/** Beiträge */
export type DuesCadence = "monthly" | "quarterly" | "semiannual" | "annual"

export interface DuesSetting {
  id: string
  player_id: string
  cadence: DuesCadence
  amount: number
  currency: string
  start_on: string // YYYY-MM-DD
  is_active: boolean
}

export interface DuesLedgerEntry {
  id: string
  player_id: string
  due_on: string // YYYY-MM-DD
  amount: number
  paid_on: string | null // YYYY-MM-DD
  note: string | null
}

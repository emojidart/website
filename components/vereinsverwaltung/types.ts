import type { User } from "@supabase/supabase-js"

/** Shared domain types for the club administration and its data hooks. */
export type DartType = "edart" | "steeldart"

export interface ClubPlayer {
  id: string
  name: string
  photo_url: string | null
  player_number: number | null
  player_code?: string | null
  spieldatenbank_id?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  birthdate?: string | null
  jersey_size?: string | null
  email?: string | null
  phone?: string | null
  iban?: string | null
  club_joined_at?: string | null
  club_left_at?: string | null
  is_active?: boolean | null
}

export interface Team {
  id: string
  name: string
  dart_type: DartType
  logo_url: string | null
}

export interface TeamMember {
  id: string
  team_id: string
  player_id: string
  player_name: string
  role: string
}

export interface ClubPlayerManagementProps {
  user: User | null
  onDataSaved?: () => void
}

export type DuesCadence = "monthly" | "quarterly" | "semiannual" | "annual"

export interface DuesSetting {
  id: string
  player_id: string
  cadence: DuesCadence
  amount: number
  currency: string
  start_on: string
  is_active: boolean
}

export interface DuesLedgerEntry {
  id: string
  player_id: string
  due_on: string
  paid_on: string | null
}

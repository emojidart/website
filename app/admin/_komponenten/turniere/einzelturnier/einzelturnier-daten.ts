import { supabase } from "@/lib/supabase"

export type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

export type Player = {
  id: number
  name: string
}

export type PlayerWithFrequency = Player & {
  playCount: number
  lastPlayed: string | null
}

export type RegisteredPlayer = {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid: boolean
  entry_fee: number
  deducted_from_credit?: boolean | string
  payment_method?: string | null
  access_type?: TournamentAccessType | null
}

export async function fetchPlayersData(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("spieldatenbank")
    .select("id, name")
    .order("name")

  if (error) throw error
  return (data || []) as Player[]
}

export async function fetchRegisteredPlayersData(
  centralEventId: string | null,
): Promise<RegisteredPlayer[]> {
  let registrationQuery = supabase
    .from("dko_tournament_registration")
    .select("*")
    .order("registered_at", { ascending: false })

  registrationQuery = centralEventId
    ? registrationQuery.eq("event_id", centralEventId)
    : registrationQuery.is("event_id", null)

  const { data, error } = await registrationQuery
  if (error) throw error

  return (data || []) as RegisteredPlayer[]
}

export async function fetchFrequentPlayersData(): Promise<PlayerWithFrequency[]> {
  const { data: frequentPlayersData, error } = await supabase
    .from("tournament_series_aggregated")
    .select("player_name, tournaments_played")
    .order("tournaments_played", { ascending: false })
    .limit(100)

  if (error) throw error
  if (!frequentPlayersData?.length) return []

  const { data: allPlayers, error: playersError } = await supabase
    .from("spieldatenbank")
    .select("id, name")

  if (playersError) throw playersError

  return frequentPlayersData
    .map((row) => {
      const player = allPlayers?.find((item) => item.name === row.player_name)
      if (!player) return null

      return {
        id: player.id,
        name: row.player_name,
        playCount: row.tournaments_played,
        lastPlayed: null,
      }
    })
    .filter((player): player is PlayerWithFrequency => player !== null)
}

export async function fetchSeriesPrefillData(seriesId: string): Promise<{
  id: string
  name: string
  startgeld: number | string | null
  access_type: TournamentAccessType | null
} | null> {
  const { data, error } = await supabase
    .from("dko_series")
    .select("id, name, startgeld, access_type")
    .eq("id", seriesId)
    .maybeSingle()

  if (error) throw error
  return data as any
}

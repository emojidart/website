import { createServerClient } from "@/lib/supabase/server"
import NewClubClient from "./NewClubClient"

export default async function ClubPage() {
  const supabase = createServerClient()

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id,name,logo_url")
    .order("name", { ascending: true })

  const { data: teamMembersData } = await supabase
    .from("team_members")
    .select(`
      id,
      team_id,
      role,
      left_at,
      club_players!team_members_player_id_fkey(
        id,
        name,
        photo_url,
        throwing_hand,
        birthdate,
        origin
      )
    `)
    .is("left_at", null)

  const teams = teamsData ?? []
  const teamMembers = teamMembersData ?? []

  const teamsWithPlayers = teams.map((team) => ({
    ...team,

    players: teamMembers
      .filter((m) => m.team_id === team.id && m.club_players && m.left_at === null)
      .flatMap((m) => {
        const player = Array.isArray(m.club_players)
          ? m.club_players[0]
          : m.club_players
        if (!player) return []
        return [{
          id: player.id,
          name: player.name,
          photo_url: player.photo_url ?? null,
          throwing_hand: player.throwing_hand ?? null,
          birthdate: player.birthdate ?? null,
          origin: player.origin ?? null,
          role: m.role ?? null,
        }]
      }),
  }))

  return <NewClubClient teamsWithPlayers={teamsWithPlayers} />
}
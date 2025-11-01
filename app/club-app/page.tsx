import { Header } from "@/components/header"
import { createServerClient } from "@/lib/supabase/server"
import { AlertCircle } from "lucide-react"
import { ClubPageContent } from "@/components/club-page-content"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface ClubPlayer {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  age: number | null
  origin: string | null
}

interface Team {
  id: string
  name: string
  logo_url: string | null
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

export default async function ClubAppPage() {
  const supabase = createServerClient()

  const { data: playersData, error: playersError } = await supabase
    .from("club_players")
    .select("*")
    .order("name", { ascending: true })

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true })

  const { data: teamMembersData, error: teamMembersError } = await supabase
    .from("team_members")
    .select(`id, team_id, player_id, role, club_players(id, name, photo_url, throwing_hand, age, origin)`)

  if (playersError || teamsError || teamMembersError) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8 pb-24">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Vereinsdaten</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const clubPlayers: ClubPlayer[] = playersData || []
  const teams: Team[] = teamsData || []
  const teamMembers: TeamMember[] = teamMembersData || []

  const teamsWithPlayers = teams.map((team) => {
    const playersForTeam = teamMembers
      .filter((member) => member.team_id === team.id && member.club_players)
      .map((member) => ({
        ...(member.club_players as ClubPlayer),
        role: member.role,
      }))
    return {
      ...team,
      players: playersForTeam,
    }
  })

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Header />

      <main className="flex-grow pt-4 pb-24">
        <ClubPageContent clubPlayers={clubPlayers} teamsWithPlayers={teamsWithPlayers} />
      </main>

      <MobileBottomNav />
    </div>
  )
}

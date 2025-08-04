import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { supabase } from "@/lib/supabase"
import { AlertCircle } from "lucide-react"
import { ClubPageContent } from "@/components/club-page-content" // Importiere die neue Client-Komponente

// Typdefinitionen für die Daten
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
  logo_url: string | null // Hinzugefügt
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null // NEW: Player role
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

export default async function ClubPage() {
  // Daten von Supabase abrufen (Server Component)
  const { data: playersData, error: playersError } = await supabase
    .from("club_players")
    .select("*")
    .order("name", { ascending: true })

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true })

  // NEW: Fetch role in team_members query
  const { data: teamMembersData, error: teamMembersError } = await supabase
    .from("team_members")
    .select(`id, team_id, player_id, role, club_players(id, name, photo_url, throwing_hand, age, origin)`)

  if (playersError || teamsError || teamMembersError) {
    console.error("Error fetching club data:", playersError, teamsError, teamMembersError)
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Vereinsdaten</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const clubPlayers: ClubPlayer[] = playersData || []
  const teams: Team[] = teamsData || []
  const teamMembers: TeamMember[] = teamMembersData || []

  // Spieler den Mannschaften zuordnen
  const teamsWithPlayers = teams.map((team) => ({
    ...team,
    players: teamMembers
      .filter((member) => member.team_id === team.id && member.club_players)
      .map((member) => {
        // NEU: Debugging-Log für die Rolle
        console.log(`[Server] Processing member for player: ${member.club_players?.name}, role: ${member.role}`)
        return {
          ...(member.club_players as ClubPlayer),
          role: member.role, // Attach role to player object
        }
      }),
  }))

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow pt-8 pb-20">
        <ClubPageContent clubPlayers={clubPlayers} teamsWithPlayers={teamsWithPlayers} />
      </main>
      <Footer />
    </div>
  )
}

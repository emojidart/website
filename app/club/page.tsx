import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
// import { supabase } from "@/lib/supabase" // <-- Diese Zeile entfernen oder auskommentieren
import { createServerClient } from "@/lib/supabase/server" // <-- NEU: Importieren Sie den Server-Client
import { AlertCircle } from 'lucide-react'
import { ClubPageContent } from "@/components/club-page-content"

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
  console.log("[Server] Starting data fetch for ClubPage...")

  // NEU: Initialisieren Sie den Supabase-Client mit dem Service Role Key
  const supabase = createServerClient();

  // Daten von Supabase abrufen (Server Component)
  const { data: playersData, error: playersError } = await supabase
    .from("club_players")
    .select("*")
    .order("name", { ascending: true })
  console.log("[Server] Fetched club_players data:", playersData); // Loggt das gesamte Array
  console.log("[Server] Fetched club_players data length:", playersData?.length, "players found. Error:", playersError?.message)

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true })
  console.log("[Server] Fetched teams data:", teamsData); // Loggt das gesamte Array
  console.log("[Server] Fetched teams data length:", teamsData?.length, "teams found. Error:", teamsError?.message)

  const { data: teamMembersData, error: teamMembersError } = await supabase
    .from("team_members")
    .select(`id, team_id, player_id, role, club_players(id, name, photo_url, throwing_hand, age, origin)`)
  console.log("[Server] Fetched team_members data:", teamMembersData); // Loggt das gesamte Array
  console.log("[Server] Fetched team_members data length:", teamMembersData?.length, "members found. Error:", teamMembersError?.message)


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
            <p className="text-sm text-gray-500">Details: {playersError?.message || teamsError?.message || teamMembersError?.message}</p>
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
  const teamsWithPlayers = teams.map((team) => {
    const playersForTeam = teamMembers
      .filter((member) => member.team_id === team.id && member.club_players)
      .map((member) => {
        console.log(`[Server] Assigning player '${member.club_players?.name}' (ID: ${member.player_id}) to team '${team.name}' (ID: ${team.id}) with role: ${member.role}`)
        return {
          ...(member.club_players as ClubPlayer),
          role: member.role,
        }
      })
    console.log(`[Server] Team '${team.name}' (ID: ${team.id}) has ${playersForTeam.length} players assigned.`)
    return {
      ...team,
      players: playersForTeam,
    }
  })

  console.log("[Server] Final teamsWithPlayers structure prepared. Total teams:", teamsWithPlayers.length);
  teamsWithPlayers.forEach(team => {
    console.log(`[Server]   Team: ${team.name}, Players: ${team.players.map(p => p.name).join(', ') || 'None'}`);
  });


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

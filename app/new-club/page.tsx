import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { createServerClient } from "@/lib/supabase/server"
import { AlertCircle, Users } from "lucide-react"
import { TeamGallery } from "@/components/team-gallery"
import { RecruitmentHero } from "@/components/recruitment-hero"

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

export default async function ClubPage() {
  const supabase = createServerClient()

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true })

  const { data: teamMembersData, error: teamMembersError } = await supabase
    .from("team_members")
    .select(`id, team_id, player_id, role, club_players(id, name, photo_url, throwing_hand, age, origin)`)

  if (teamsError || teamMembersError) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col pb-20 md:pb-0">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Vereinsdaten</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

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
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 md:pb-0">
      <Header />

      <section className="container mx-auto px-4 pt-8 pb-12">
        <div className="relative bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl shadow-xl border border-orange-200 py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/abstract-dart-pattern.jpg')] opacity-10 bg-cover bg-center" />
          <div className="relative max-w-4xl mx-auto text-center space-y-6 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="block text-white">VEREINS</span>
              <span className="block text-orange-200">ÜBERSICHT</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">Lerne unsere Teams und Spieler kennen</p>
          </div>
        </div>
      </section>

      <RecruitmentHero />
      <main className="pt-8 pb-16">
        <TeamGallery teamsWithPlayers={teamsWithPlayers} />
      </main>

      <MobileBottomNav />
    </div>
  )
}

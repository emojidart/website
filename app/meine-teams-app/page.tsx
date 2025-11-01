"use client"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Crown, ShieldCheck, Users, Target, Hand, ArrowLeft } from "lucide-react"
import { CaptainPlayerManagement } from "@/components/captain-player-management"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

interface TeamMembership {
  id: string
  team_id: string
  role: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
  } | null
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

export default function MeineTeamsAppPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchTeamData()
    }
  }, [session])

  const fetchTeamData = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      // Fetch team memberships
      if (profileData?.player_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`id, team_id, role, teams (id, name, logo_url)`)
          .eq("player_id", profileData.player_id)

        if (teamError) {
          throw teamError
        }

        setTeamMemberships(teamData || [])

        if (teamData && teamData.length > 0) {
          const teamIds = teamData.map((team) => team.team_id)

          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select(`id, team_id, player_id, role, club_players (id, name, photo_url, throwing_hand, age, origin)`)
            .in("team_id", teamIds)
            .order("role", { ascending: false })

          if (membersError) {
            throw membersError
          }

          setTeamMembers(membersData || [])
        }
      }
    } catch (err: any) {
      console.error("Error fetching team data:", err)
      setError("Fehler beim Laden der Team-Daten")
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
      default:
        return <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
    }
  }

  const getRoleText = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "border-yellow-500 text-yellow-700 bg-yellow-50"
      case "Co-Captain":
        return "border-blue-500 text-blue-700 bg-blue-50"
      default:
        return "border-orange-500 text-orange-700 bg-orange-50"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pb-24 md:pb-8">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pb-24 md:pb-8">
          <div className="text-center px-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{error || "Profil nicht gefunden"}</h1>
            <Button onClick={() => router.push("/member-profile-app")}>Zurück zum Profil</Button>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile-app")}
          className="mb-4 sm:mb-6 flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        {/* Page Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl mb-3 sm:mb-4 shadow-xl">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Meine Teams</h1>
          <p className="text-base sm:text-lg text-gray-600">Übersicht deiner Teams und Teammitglieder</p>
        </div>

        {/* Captain Player Management Section */}
        {profile?.player_id && (
          <div className="mb-4 sm:mb-6">
            <CaptainPlayerManagement onPlayerAdded={fetchTeamData} />
          </div>
        )}

        {/* Team Memberships */}
        <Card className="shadow-xl border-0 bg-white mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              Meine Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMemberships.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Du bist noch keinem Team zugeordnet.</p>
                <p className="text-xs sm:text-sm mt-2">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {teamMemberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {membership.teams?.logo_url ? (
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                          <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-base sm:text-lg">
                            {membership.teams.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                          {membership.teams?.name || "Unbekanntes Team"}
                        </h3>
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getRoleIcon(membership.role)}
                          <Badge className={`text-xs border ${getRoleBadgeColor(membership.role)}`}>
                            {getRoleText(membership.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              Meine Teammitglieder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Keine Teammitglieder gefunden.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {teamMemberships.map((membership) => {
                  const teamMembersForThisTeam = teamMembers.filter((member) => member.team_id === membership.team_id)

                  return (
                    <div key={membership.id} className="border-2 border-gray-200 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        {membership.teams?.logo_url ? (
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                            <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-sm">
                              {membership.teams.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                          </div>
                        )}
                        <h3 className="font-bold text-base sm:text-lg text-gray-900 flex-1 truncate">
                          {membership.teams?.name || "Unbekanntes Team"}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {teamMembersForThisTeam.length}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {teamMembersForThisTeam.map((member) => (
                          <div
                            key={member.id}
                            className={`p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                              member.player_id === profile?.player_id
                                ? "border-orange-300 bg-orange-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage
                                  src={
                                    member.club_players?.photo_url ||
                                    "/placeholder.svg?height=32&width=32&query=darts-player" ||
                                    "/placeholder.svg"
                                  }
                                />
                                <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                  {member.club_players?.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                                  {member.club_players?.name || "Unbekannt"}
                                  {member.player_id === profile?.player_id && (
                                    <span className="text-orange-600 ml-1">(Du)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {getRoleIcon(member.role)}
                                  <span className="text-[10px] sm:text-xs text-gray-600">
                                    {getRoleText(member.role)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {member.club_players?.throwing_hand && (
                              <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                <Hand className="h-3 w-3" />
                                {member.club_players.throwing_hand}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  )
}

"use client"
import { Header } from "@/components/header"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  MessageCircle,
  BarChart3,
  Users,
  Crown,
  ShieldCheck,
  Target,
  Trophy,
  ArrowRight,
  Settings,
  LogOut,
  Camera,
  Upload,
  Euro,
  Table,
  HelpCircle,
} from "lucide-react"

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

export default function MemberProfilePage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoMessage, setPhotoMessage] = useState("")
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [statistics, setStatistics] = useState({
    totalWins: 0,
    totalLegs: 0,
    winPercentage: 0,
    total180s: 0,
    totalEvents: 0,
  })

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch user profile from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      if (profileData?.player_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select(`id, team_id, role, teams (id, name, logo_url)`)
          .eq("player_id", profileData.player_id)

        if (teamError) {
          throw teamError
        }

        setTeamMemberships(teamData || [])

        const { data: legStats, error: legStatsError } = await supabase
          .from("leg_statistics")
          .select(`leg_wins, player_legs_won, opponent_legs_won, throws_180, throws_171`)
          .eq("player_id", profileData.player_id)

        if (!legStatsError && legStats) {
          const totalWins = legStats.reduce((sum, stat) => sum + (stat.leg_wins || 0), 0)
          const totalLegs = legStats.reduce((sum, stat) => {
            const actualLegs = (stat.player_legs_won || 0) + (stat.opponent_legs_won || 0)
            return sum + (actualLegs > 0 ? actualLegs : 1)
          }, 0)
          const total180s = legStats.reduce((sum, stat) => sum + (stat.throws_180 || 0), 0)
          const winPercentage = totalLegs > 0 ? (totalWins / totalLegs) * 100 : 0

          const { data: matchData } = await supabase
            .from("matches")
            .select("id")
            .or(
              `home_team_id.in.(${teamData?.map((t) => t.team_id).join(",")}),away_team_id.in.(${teamData?.map((t) => t.team_id).join(",")})`,
            )

          setStatistics({
            totalWins,
            totalLegs,
            winPercentage: Math.round(winPercentage),
            total180s,
            totalEvents: matchData?.length || 0,
          })
        }
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError("Fehler beim Laden des Profils")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handlePhotoUpload = async () => {
    if (!photoFile || !profile?.club_players?.id) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      const fileExtension = photoFile.name.split(".").pop()
      const sanitizedPlayerName = profile.club_players.name.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `player-avatars/${sanitizedPlayerName}-${Date.now()}.${fileExtension}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)

      // Update player record
      const { error: updateError } = await supabase
        .from("club_players")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", profile.club_players.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              club_players: prev.club_players
                ? {
                    ...prev.club_players,
                    photo_url: publicUrlData.publicUrl,
                  }
                : null,
            }
          : null,
      )

      setPhotoMessage("Foto erfolgreich hochgeladen!")
      setIsPhotoDialogOpen(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error: any) {
      setPhotoMessage(`Fehler beim Hochladen: ${error.message}`)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-5 w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-5 w-5 text-blue-600" />
      default:
        return <Target className="h-5 w-5 text-orange-600" />
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const navigationItems = [
    {
      title: "Dashboard",
      description: "Statistiken, Teams und Verwaltung",
      icon: BarChart3,
      href: "/member-dashboard",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Spieler Statistiken",
      description: "Detaillierte Leistungsanalyse",
      icon: BarChart3,
      href: "/member-statistics",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Bonusgeld",
      description: "Bonuspunkte und Belohnungen",
      icon: Euro,
      href: "/member-bonus",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Liga Tabellen",
      description: "Aktuelle Ligastände",
      icon: Table,
      href: "/member-league",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Vereinskalender",
      description: "Termine und Events verwalten",
      icon: Calendar,
      href: "/vereinskalender",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Team Chat",
      description: "Kommunikation mit dem Team",
      icon: MessageCircle,
      href: "/chat",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Support",
      description: "Hilfe und Support-Anfragen",
      icon: HelpCircle,
      href: "/support",
      color: "from-red-500 to-red-600",
    },
  ]

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || "Profil nicht gefunden"}</h1>
            <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
          </div>
        </main>
      </div>
    )
  }

  const primaryTeam = teamMemberships[0]
  const hasMultipleTeams = teamMemberships.length > 1

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-6 shadow-xl">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Willkommen zurück!</h1>
          <p className="text-xl text-gray-600">
            Schön dich zu sehen, {profile.club_players?.name || "Vereinsmitglied"}
          </p>
        </div>

        {/* Profile Card */}
        <Card className="mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-orange-200">
                  <AvatarImage
                    src={
                      profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"
                    }
                    alt={profile.club_players?.name || "Spieler"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl font-bold">
                    {(profile.club_players?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-white shadow-lg"
                  onClick={() => setIsPhotoDialogOpen(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-grow text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.club_players?.name || "Vereinsmitglied"}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                    {getRoleIcon(primaryTeam?.role)}
                    {getRoleLabel(primaryTeam?.role)}
                  </Badge>
                  {primaryTeam?.teams && (
                    <Badge variant="outline" className="px-3 py-1">
                      {primaryTeam.teams.name}
                      {hasMultipleTeams && ` (+${teamMemberships.length - 1} weitere)`}
                    </Badge>
                  )}
                  {profile.club_players?.age && (
                    <Badge variant="outline" className="px-3 py-1">
                      {profile.club_players.age} Jahre
                    </Badge>
                  )}
                </div>
                {hasMultipleTeams && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Alle Teams:</p>
                    <div className="flex flex-wrap gap-2">
                      {teamMemberships.map((membership) => (
                        <Badge key={membership.id} variant="outline" className="text-xs">
                          {membership.teams?.name} ({getRoleLabel(membership.role)})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.club_players?.origin && (
                  <p className="text-gray-600 mb-2">Herkunft: {profile.club_players.origin}</p>
                )}
                {profile.club_players?.throwing_hand && (
                  <p className="text-gray-600">
                    Wurfhand: {profile.club_players.throwing_hand === "right" ? "Rechts" : "Links"}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                  <Settings className="h-4 w-4" />
                  Einstellungen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {navigationItems.map((item, index) => (
            <Card
              key={index}
              className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(item.href)}
            >
              <CardContent className="p-6">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700 transition-colors">
                  <span>Öffnen</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{statistics.totalWins}</div>
              <div className="text-sm text-gray-600">Siege</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{statistics.winPercentage}%</div>
              <div className="text-sm text-gray-600">Siegquote</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{statistics.totalLegs}</div>
              <div className="text-sm text-gray-600">Legs gespielt</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{statistics.totalEvents}</div>
              <div className="text-sm text-gray-600">Events</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {isPhotoDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Profilfoto hochladen</h3>

            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              {photoPreview && (
                <div className="text-center">
                  <img
                    src={photoPreview || "/placeholder.svg"}
                    alt="Vorschau"
                    className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-orange-200"
                  />
                </div>
              )}

              {photoMessage && (
                <p className={`text-sm ${photoMessage.includes("Fehler") ? "text-red-600" : "text-green-600"}`}>
                  {photoMessage}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPhotoDialogOpen(false)
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    setPhotoMessage("")
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || photoUploading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {photoUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Hochladen...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { UserRoundPlus, Loader2, Crown, ShieldCheck, Info } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Team {
  id: string
  name: string
  logo_url: string | null
}

interface TeamMembership {
  team_id: string
  role: string | null
  teams: Team
}

interface Player {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  age: number | null
  origin: string | null
}

interface CaptainPlayerManagementProps {
  onPlayerAdded?: () => void
}

export function CaptainPlayerManagement({ onPlayerAdded }: CaptainPlayerManagementProps) {
  const { session } = useAuth()
  const { toast } = useToast()
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("Player")
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [managedTeams, setManagedTeams] = useState<TeamMembership[]>([])
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchManagedTeams()
      fetchAllPlayers()
    }
  }, [session])

  useEffect(() => {
    if (selectedTeamId && allPlayers.length > 0) {
      filterAvailablePlayers(selectedTeamId)
    }
  }, [selectedTeamId, allPlayers])

  const fetchAllPlayers = async () => {
    setLoadingPlayers(true)
    try {
      const { data, error } = await supabase
        .from("club_players")
        .select("id, name, photo_url, throwing_hand, age, origin")
        .order("name")

      if (error) throw error
      setAllPlayers(data || [])
    } catch (err: any) {
      console.error("Error fetching players:", err)
      toast({
        title: "Fehler beim Laden der Spieler",
        description: "Bitte versuche es später erneut.",
        variant: "destructive",
      })
    } finally {
      setLoadingPlayers(false)
    }
  }

  const filterAvailablePlayers = async (teamId: string) => {
    try {
      const { data: teamMembers, error } = await supabase.from("team_members").select("player_id").eq("team_id", teamId)

      if (error) throw error

      const teamPlayerIds = new Set(teamMembers?.map((tm) => tm.player_id) || [])
      const filtered = allPlayers.filter((player) => !teamPlayerIds.has(player.id))
      setAvailablePlayers(filtered)
    } catch (err: any) {
      console.error("Error filtering players:", err)
      setAvailablePlayers(allPlayers)
    }
  }

  const fetchManagedTeams = async () => {
    if (!session?.user) return

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", session.user.id)
        .single()

      if (profileError) throw profileError
      if (!profileData?.player_id) {
        toast({
          title: "Kein Spielerprofil gefunden.",
          description: "Bitte erstelle ein Spielerprofil.",
          variant: "destructive",
        })
        return
      }

      setUserPlayerId(profileData.player_id)

      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            logo_url
          )
        `)
        .eq("player_id", profileData.player_id)
        .in("role", ["Captain", "Co-Captain"])

      if (teamError) throw teamError

      setManagedTeams(teamData || [])

      if (!teamData || teamData.length === 0) {
        toast({
          title: "Keine Teams verwaltet",
          description: "Du bist kein Kapitän oder Co-Kapitän eines Teams.",
          variant: "default",
        })
      }
    } catch (err: any) {
      console.error("Error fetching managed teams:", err)
      toast({
        title: "Fehler beim Laden der Teams",
        description: "Bitte versuche es später erneut.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!session?.user) {
      toast({
        title: "Fehler",
        description: "Nicht authentifiziert.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (!selectedPlayerId || !selectedTeamId) {
      toast({
        title: "Fehler",
        description: "Bitte Spieler und Team auswählen.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const hasPermission = managedTeams.some(
      (team) => team.team_id === selectedTeamId && (team.role === "Captain" || team.role === "Co-Captain"),
    )

    if (!hasPermission) {
      toast({
        title: "Keine Berechtigung",
        description: "Du hast keine Berechtigung, Spieler zu diesem Team hinzuzufügen.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const { error: assignError } = await supabase.from("team_members").insert([
        {
          player_id: selectedPlayerId,
          team_id: selectedTeamId,
          role: selectedRole,
        },
      ])

      if (assignError) throw assignError

      await supabase.from("player_movements").insert([
        {
          player_id: selectedPlayerId,
          team_id: selectedTeamId,
          from_team_id: null,
          movement_type: "team_addition",
          user_id: session.user.id,
        },
      ])

      const selectedPlayer = allPlayers.find((p) => p.id === selectedPlayerId)
      const selectedTeam = managedTeams.find((t) => t.team_id === selectedTeamId)

      toast({
        title: "Spieler erfolgreich hinzugefügt!",
        description: `${selectedPlayer?.name || "Spieler"} wurde zu ${selectedTeam?.teams.name || "dem Team"} hinzugefügt.`,
      })

      if (onPlayerAdded) {
        onPlayerAdded()
      }

      setSelectedPlayerId("")
      setSelectedRole("Player")
      if (selectedTeamId) {
        filterAvailablePlayers(selectedTeamId)
      }
    } catch (error: any) {
      console.error("Error adding player:", error)
      toast({
        title: "Fehler beim Hinzufügen",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (managedTeams.length === 0) {
    return (
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Spieler hinzufügen
          </CardTitle>
          <CardDescription>Du musst Kapitän oder Co-Kapitän eines Teams sein, um Spieler hinzuzufügen.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
            <UserRoundPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Spieler zum Team hinzufügen</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Wähle einen bestehenden Spieler aus und füge ihn zu deinem Team hinzu
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">Wichtige Hinweise</AlertTitle>
          <AlertDescription className="text-blue-800 text-sm space-y-1">
            <p>
              • Du kannst <strong>nur bestehende Spieler</strong> aus der Datenbank zu deinem Team hinzufügen
            </p>
            <p>
              • Du kannst <strong>keine neuen Spieler erstellen</strong> - das macht nur der Admin
            </p>
            <p>
              • Du kannst Spieler nur mit der Rolle <strong>"Spieler"</strong> hinzufügen
            </p>
            <p>• Wenn ein Spieler bereits existiert, wähle ihn einfach aus der Liste aus</p>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="selectedTeam">Team auswählen *</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
                  <SelectValue placeholder="Team auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {managedTeams.map((membership) => (
                    <SelectItem key={membership.team_id} value={membership.team_id}>
                      <div className="flex items-center gap-2">
                        {membership.role === "Captain" ? (
                          <Crown className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                        )}
                        <span>{membership.teams.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedPlayer">Spieler auswählen *</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={!selectedTeamId || loadingPlayers}
              >
                <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
                  <SelectValue
                    placeholder={
                      loadingPlayers
                        ? "Lade Spieler..."
                        : !selectedTeamId
                          ? "Zuerst Team auswählen"
                          : availablePlayers.length === 0
                            ? "Alle Spieler bereits im Team"
                            : "Spieler auswählen"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        {player.photo_url && (
                          <div className="relative w-6 h-6 rounded-full overflow-hidden">
                            <Image
                              src={player.photo_url || "/placeholder.svg"}
                              alt={player.name}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        )}
                        <span>{player.name}</span>
                        {player.throwing_hand && (
                          <span className="text-xs text-gray-500">({player.throwing_hand})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Rolle im Team</Label>
              <div className="h-10 px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 flex items-center text-gray-700">
                <span className="font-medium">Spieler</span>
                <span className="ml-2 text-xs text-gray-500">(Nur diese Rolle verfügbar)</span>
              </div>
            </div>
          </div>

          {selectedPlayerId && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                {allPlayers.find((p) => p.id === selectedPlayerId)?.photo_url && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-orange-300">
                    <Image
                      src={allPlayers.find((p) => p.id === selectedPlayerId)?.photo_url || "/placeholder.svg"}
                      alt="Spieler"
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.name}
                  </p>
                  <div className="flex gap-3 text-sm text-gray-600">
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.throwing_hand && (
                      <span>Wurfhand: {allPlayers.find((p) => p.id === selectedPlayerId)?.throwing_hand}</span>
                    )}
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.age && (
                      <span>Alter: {allPlayers.find((p) => p.id === selectedPlayerId)?.age}</span>
                    )}
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.origin && (
                      <span>Herkunft: {allPlayers.find((p) => p.id === selectedPlayerId)?.origin}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !selectedPlayerId || !selectedTeamId}
            className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Wird hinzugefügt...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <UserRoundPlus className="h-4 w-4" />
                <span>Spieler zum Team hinzufügen</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

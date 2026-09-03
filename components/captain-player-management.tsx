"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { useToast } from "@/hooks/use-toast"
import { UserRoundPlus, Loader2, Crown, ShieldCheck, Info } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Team {
  id: string
  name: string
  logo_url: string | null
  dart_type: "edart" | "steeldart"
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
  const {
    loading: membershipLoading,
    hasModule,
  } = useMembershipAccess()

  const canManageEDart = hasModule("edart_league")
  const canManageSteeldart = hasModule("steeldart_league")
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("Player")
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [managedTeams, setManagedTeams] = useState<TeamMembership[]>([])
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null)
  const [playerModuleCodes, setPlayerModuleCodes] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    if (session?.user && !membershipLoading) {
      fetchManagedTeams()
      fetchAllPlayers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, membershipLoading, canManageEDart, canManageSteeldart])

  useEffect(() => {
    if (selectedTeamId && allPlayers.length > 0) {
      filterAvailablePlayers(selectedTeamId)
    } else {
      setAvailablePlayers([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, allPlayers, playerModuleCodes, managedTeams])

  const fetchAllPlayers = async () => {
    setLoadingPlayers(true)

    try {
      const today = new Date().toISOString().split("T")[0]

      const [
        { data: playersData, error: playersError },
        { data: membershipData, error: membershipError },
        { data: membershipModuleData, error: membershipModuleError },
      ] = await Promise.all([
        supabase
          .from("club_players")
          .select("id, name, photo_url, throwing_hand, age, origin")
          .order("name"),
        supabase
          .from("member_memberships")
          .select("id, player_id, status, starts_on, ends_on")
          .eq("status", "active"),
        supabase
          .from("member_membership_modules")
          .select(`
            membership_id,
            membership_modules (
              code,
              is_active
            )
          `),
      ])

      if (playersError) throw playersError
      if (membershipError) throw membershipError
      if (membershipModuleError) throw membershipModuleError

      const validMembershipById = new Map<string, string>()

      for (const membership of membershipData || []) {
        const startsOn = String((membership as any).starts_on || "")
        const endsOn = (membership as any).ends_on
          ? String((membership as any).ends_on)
          : null

        if (startsOn && startsOn > today) continue
        if (endsOn && endsOn < today) continue

        validMembershipById.set(
          String((membership as any).id),
          String((membership as any).player_id),
        )
      }

      const nextCodes: Record<string, Set<string>> = {}

      for (const row of membershipModuleData || []) {
        const membershipId = String((row as any).membership_id)
        const playerId = validMembershipById.get(membershipId)
        if (!playerId) continue

        const moduleData = (row as any).membership_modules
        if (!moduleData?.is_active || !moduleData?.code) continue

        if (!nextCodes[playerId]) nextCodes[playerId] = new Set<string>()
        nextCodes[playerId].add(String(moduleData.code))
      }

      setPlayerModuleCodes(nextCodes)
      setAllPlayers((playersData || []) as Player[])
    } catch (err: any) {
      console.error("Error fetching players:", err)
      toast({
        title: "Fehler beim Laden der Spieler",
        description: "Spieler und Liga-Pakete konnten nicht vollständig geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoadingPlayers(false)
    }
  }

  const filterAvailablePlayers = async (teamId: string) => {
    try {
      const selectedTeam = managedTeams.find((membership) => membership.team_id === teamId)

      if (!selectedTeam?.teams?.dart_type) {
        setAvailablePlayers([])
        return
      }

      const requiredModule =
        selectedTeam.teams.dart_type === "steeldart"
          ? "steeldart_league"
          : "edart_league"

      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .is("left_at", null)

      if (error) throw error

      const teamPlayerIds = new Set(teamMembers?.map((tm) => tm.player_id) || [])

      const filtered = allPlayers.filter((player) => {
        if (teamPlayerIds.has(player.id)) return false
        return playerModuleCodes[player.id]?.has(requiredModule) === true
      })

      setAvailablePlayers(filtered)

      if (
        selectedPlayerId &&
        !filtered.some((player) => player.id === selectedPlayerId)
      ) {
        setSelectedPlayerId("")
      }
    } catch (err: any) {
      console.error("Error filtering players:", err)
      setAvailablePlayers([])
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
            logo_url,
            dart_type
          )
        `)
        .eq("player_id", profileData.player_id)
        .in("role", ["Captain", "Co-Captain"])

      if (teamError) throw teamError

      const visibleManagedTeams = ((teamData || []) as TeamMembership[]).filter((membership) => {
        if (membership.teams?.dart_type === "edart") return canManageEDart
        if (membership.teams?.dart_type === "steeldart") return canManageSteeldart
        return false
      })

      setManagedTeams(visibleManagedTeams)

      if (
        selectedTeamId &&
        !visibleManagedTeams.some((membership) => membership.team_id === selectedTeamId)
      ) {
        setSelectedTeamId("")
        setSelectedPlayerId("")
      }

      if (visibleManagedTeams.length === 0) {
        toast({
          title: "Keine Liga-Mannschaft verfügbar",
          description:
            "Du verwaltest derzeit keine Mannschaft, für deren Liga-Paket du freigeschaltet bist.",
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

    const selectedManagedTeam = managedTeams.find((team) => team.team_id === selectedTeamId)
    const requiredModule =
      selectedManagedTeam?.teams?.dart_type === "steeldart"
        ? "steeldart_league"
        : selectedManagedTeam?.teams?.dart_type === "edart"
          ? "edart_league"
          : null

    if (!requiredModule) {
      toast({
        title: "Liga-Zuordnung fehlt",
        description: "Bei dieser Mannschaft ist keine gültige Dartart hinterlegt.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const captainHasRequiredModule =
      requiredModule === "steeldart_league" ? canManageSteeldart : canManageEDart

    if (!captainHasRequiredModule) {
      toast({
        title: "Liga-Paket fehlt",
        description:
          requiredModule === "steeldart_league"
            ? "Du hast kein Steeldart-Liga-Paket."
            : "Du hast kein E-Dart-Liga-Paket.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (playerModuleCodes[selectedPlayerId]?.has(requiredModule) !== true) {
      toast({
        title: "Spieler hat kein passendes Liga-Paket",
        description:
          requiredModule === "steeldart_league"
            ? "Dieser Spieler kann ohne Steeldart-Paket keiner Steeldart-Mannschaft zugeordnet werden."
            : "Dieser Spieler kann ohne E-Dart-Paket keiner E-Dart-Mannschaft zugeordnet werden.",
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

  if (membershipLoading) {
    return null
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
      <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-5 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
            <UserRoundPlus className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Spielerverwaltung
            </div>
            <CardTitle className="mt-0.5 text-xl font-black tracking-tight text-slate-950">
              Spieler zum Team hinzufügen
            </CardTitle>
            <CardDescription className="mt-1 text-sm font-medium leading-5 text-slate-500">
              Wähle einen bestehenden Spieler aus und füge ihn zu deinem Team hinzu.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:px-5 sm:py-6">
        <section className="mb-6 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Hinweise</div>
              <div className="text-sm font-black text-slate-950">Was du beachten musst</div>
            </div>
          </div>

          <div className="grid gap-2.5 p-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Spielerauswahl</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-600">
                Du kannst nur bestehende Spieler zu deinem Team hinzufügen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Neue Spieler</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-600">
                Neue Spieler werden nur vom Admin erstellt.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Rolle</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-600">
                Spieler werden hier mit der Rolle „Spieler“ hinzugefügt.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Auswahl</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-600">
                Ist ein Spieler bereits vorhanden, wählst du ihn direkt aus der Liste aus.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">E-Dart</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-700">
                Angezeigt werden nur Spieler mit gültigem E-Dart-Liga-Paket.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Steeldart</div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-slate-700">
                Angezeigt werden nur Spieler mit gültigem Steeldart-Liga-Paket.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="selectedTeam">Team auswählen *</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/70 font-semibold shadow-none focus:border-orange-400 focus:ring-orange-200">
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
                        <span className="text-xs text-gray-500">
                          ({membership.teams.dart_type === "steeldart" ? "Steeldart" : "E-Dart"})
                        </span>
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
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/70 font-semibold shadow-none focus:border-orange-400 focus:ring-orange-200">
                  <SelectValue
                    placeholder={
                      loadingPlayers
                        ? "Lade Spieler..."
                        : !selectedTeamId
                          ? "Zuerst Team auswählen"
                          : availablePlayers.length === 0
                            ? "Keine berechtigten Spieler verfügbar"
                            : "Spieler auswählen"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {player.photo_url ? (
                            <div className="relative h-full w-full">
                              <Image
                                src={player.photo_url || "/placeholder.svg"}
                                alt={player.name}
                                fill
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] font-black uppercase text-slate-500">
                              {player.name?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800">{player.name}</span>

                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Rolle im Team</Label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700">
                <span className="font-medium">Spieler</span>
                <span className="ml-2 text-xs text-gray-500">(Nur diese Rolle verfügbar)</span>
              </div>
            </div>
          </div>

          {selectedPlayerId && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                {allPlayers.find((p) => p.id === selectedPlayerId)?.photo_url && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50">
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
            className="h-11 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600 disabled:opacity-50"
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

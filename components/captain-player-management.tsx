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
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/[0.16] bg-amber-500/[0.08]">
            <Crown className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Spieler hinzufügen</h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/40">
              Du musst Kapitän oder Co-Kapitän eines Teams sein, um Spieler hinzuzufügen.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025]">
      <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.16] bg-orange-500/[0.08]">
            <UserRoundPlus className="h-5 w-5 text-orange-200" />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300/55">
              Spielerverwaltung
            </div>
            <h3 className="mt-0.5 text-lg font-black text-white sm:text-xl">
              Spieler zum Team hinzufügen
            </h3>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/40">
              Bestehenden Spieler auswählen und dem richtigen Team zuordnen.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3.5 sm:p-5">
        <section className="mb-5 overflow-hidden rounded-[20px] border border-white/[0.08] bg-black/20">
          <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
              <Info className="h-4 w-4 text-orange-200" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Hinweise</div>
              <div className="text-sm font-black text-white">Was du beachten musst</div>
            </div>
          </div>

          <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Spielerauswahl", "Nur bestehende Spieler können hinzugefügt werden."],
              ["Neue Spieler", "Neue Spieler werden ausschließlich vom Admin erstellt."],
              ["Rolle", "Die Zuordnung erfolgt hier immer als Spieler."],
              ["Auswahl", "Bereits vorhandene Spieler werden direkt aus der Liste gewählt."],
              ["E-Dart", "Es erscheinen nur Spieler mit gültigem E-Dart-Liga-Paket."],
              ["Steeldart", "Es erscheinen nur Spieler mit gültigem Steeldart-Liga-Paket."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">{title}</div>
                <p className="mt-1.5 text-sm font-semibold leading-5 text-white/50">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="selectedTeam" className="text-sm font-black text-white/70">Team auswählen *</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-11 rounded-xl border-white/[0.10] bg-[#0a0d12] font-semibold text-white shadow-none focus:border-orange-300/40 focus:ring-orange-500/10">
                  <SelectValue placeholder="Team auswählen" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.10] bg-[#0a0d12] text-white">
                  {managedTeams.map((membership) => (
                    <SelectItem key={membership.team_id} value={membership.team_id} className="focus:bg-white/[0.06] focus:text-white">
                      <div className="flex items-center gap-2">
                        {membership.role === "Captain" ? (
                          <Crown className="h-4 w-4 text-amber-300" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-sky-300" />
                        )}
                        <span>{membership.teams.name}</span>
                        <span className="text-xs text-white/35">
                          ({membership.teams.dart_type === "steeldart" ? "Steeldart" : "E-Dart"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedPlayer" className="text-sm font-black text-white/70">Spieler auswählen *</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={!selectedTeamId || loadingPlayers}
              >
                <SelectTrigger className="h-11 rounded-xl border-white/[0.10] bg-[#0a0d12] font-semibold text-white shadow-none focus:border-orange-300/40 focus:ring-orange-500/10">
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
                <SelectContent className="border-white/[0.10] bg-[#0a0d12] text-white">
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="focus:bg-white/[0.06] focus:text-white">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                          {player.photo_url ? (
                            <div className="relative h-full w-full">
                              <Image src={player.photo_url} alt={player.name} fill style={{ objectFit: "cover" }} />
                            </div>
                          ) : (
                            <span className="text-[11px] font-black uppercase text-white/40">
                              {player.name?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-white/80">{player.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-black text-white/70">Rolle im Team</Label>
              <div className="flex h-11 items-center rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-white/65">
                <span className="font-black">Spieler</span>
                <span className="ml-2 text-xs text-white/30">(Nur diese Rolle verfügbar)</span>
              </div>
            </div>
          </div>

          {selectedPlayerId ? (
            <div className="rounded-[18px] border border-orange-300/[0.16] bg-orange-500/[0.06] p-4">
              <div className="flex items-center gap-3">
                {allPlayers.find((p) => p.id === selectedPlayerId)?.photo_url ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-orange-300/[0.18] bg-orange-500/[0.08]">
                    <Image
                      src={allPlayers.find((p) => p.id === selectedPlayerId)?.photo_url || "/placeholder.svg"}
                      alt="Spieler"
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : null}
                <div>
                  <p className="font-black text-white">
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/40">
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.age ? (
                      <span>Alter: {allPlayers.find((p) => p.id === selectedPlayerId)?.age}</span>
                    ) : null}
                    {allPlayers.find((p) => p.id === selectedPlayerId)?.origin ? (
                      <span>Herkunft: {allPlayers.find((p) => p.id === selectedPlayerId)?.origin}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading || !selectedPlayerId || !selectedTeamId}
            className="h-11 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-400 disabled:opacity-40"
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
      </div>
    </div>
  )
}

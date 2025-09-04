"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  Users,
  User,
  Crown,
  Shield,
  Building2,
  UserPlus,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle,
  Mail,
  Lock,
  Key,
  Trash2,
  MoreVertical,
  Settings,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

interface UserManagementProps {
  user: SupabaseUser | null
  onDataSaved: () => void
}

interface PlayerData {
  id: string
  name: string
  role: "Captain" | "Co-Captain" | "Player"
  email?: string
  created_at: string
  photo_url?: string
  throwing_hand?: string
  age?: number
  origin?: string
  team_id?: string
  team_name?: string
  has_account?: boolean
  is_admin?: boolean
  user_profile_id?: string
}

interface TeamGroup {
  id: string
  name: string
  players: PlayerData[]
  isExpanded: boolean
}

interface AccountCreationForm {
  playerId: string
  email: string
  password: string
  confirmPassword: string
}

interface AccountManagementForm {
  playerId: string
  playerName: string
  currentEmail: string
  newEmail: string
  newPassword: string
  confirmNewPassword: string
}

export function UserManagement({ user, onDataSaved }: UserManagementProps) {
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([])
  const [unassignedPlayers, setUnassignedPlayers] = useState<PlayerData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState<AccountCreationForm>({
    playerId: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [accountCreationStatus, setAccountCreationStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const [isManagingAccount, setIsManagingAccount] = useState(false)
  const [managementForm, setManagementForm] = useState<AccountManagementForm>({
    playerId: "",
    playerName: "",
    currentEmail: "",
    newEmail: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [managementStatus, setManagementStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [managementAction, setManagementAction] = useState<"email" | "password" | "delete" | null>(null)

  const fetchAllUsers = async () => {
    setLoading(true)
    setError("")

    try {
      const { data: clubPlayers, error: clubError } = await supabase.from("club_players").select("*").order("name")

      if (clubError) throw clubError

      const { data: teams, error: teamsError } = await supabase.from("teams").select("id, name").order("name")

      if (teamsError) throw teamsError

      const { data: teamMembers, error: teamMembersError } = await supabase.from("team_members").select(`
          player_id,
          team_id,
          role,
          teams (
            id,
            name
          )
        `)

      if (teamMembersError) throw teamMembersError

      const { data: userProfiles, error: userProfilesError } = await supabase
        .from("user_profiles")
        .select("id, player_id, is_admin")

      if (userProfilesError) throw userProfilesError

      const playersWithAccounts = new Set(userProfiles?.map((p) => p.player_id) || [])
      const adminStatusMap = new Map(
        userProfiles?.map((p) => [p.player_id, { is_admin: p.is_admin, profile_id: p.id }]) || [],
      )

      const allPlayers: PlayerData[] = []
      const unassigned: PlayerData[] = []

      if (clubPlayers) {
        clubPlayers.forEach((player) => {
          const playerTeamMemberships = teamMembers?.filter((tm) => tm.player_id === player.id) || []
          const adminInfo = adminStatusMap.get(player.id)

          if (playerTeamMemberships.length === 0) {
            const playerData: PlayerData = {
              id: player.id,
              name: player.name,
              role: "Player",
              created_at: player.created_at || new Date().toISOString(),
              photo_url: player.photo_url,
              throwing_hand: player.throwing_hand,
              age: player.age,
              origin: player.origin,
              team_id: undefined,
              team_name: undefined,
              has_account: playersWithAccounts.has(player.id),
              is_admin: adminInfo?.is_admin || false,
              user_profile_id: adminInfo?.profile_id,
            }
            unassigned.push(playerData)
          } else {
            playerTeamMemberships.forEach((teamMembership) => {
              let role: "Captain" | "Co-Captain" | "Player" = "Player"
              if (teamMembership?.role === "Captain") {
                role = "Captain"
              } else if (teamMembership?.role === "Co-Captain") {
                role = "Co-Captain"
              }

              const playerData: PlayerData = {
                id: player.id,
                name: player.name,
                role: role,
                created_at: player.created_at || new Date().toISOString(),
                photo_url: player.photo_url,
                throwing_hand: player.throwing_hand,
                age: player.age,
                origin: player.origin,
                team_id: teamMembership?.team_id,
                team_name: teamMembership?.teams?.name,
                has_account: playersWithAccounts.has(player.id),
                is_admin: adminInfo?.is_admin || false,
                user_profile_id: adminInfo?.profile_id,
              }

              allPlayers.push(playerData)
            })
          }
        })
      }

      const groupedTeams: TeamGroup[] = []
      if (teams) {
        teams.forEach((team) => {
          const teamPlayers = allPlayers.filter((player) => player.team_id === team.id)
          if (teamPlayers.length > 0) {
            groupedTeams.push({
              id: team.id,
              name: team.name,
              players: teamPlayers.sort((a, b) => {
                const roleOrder = { Captain: 0, "Co-Captain": 1, Player: 2 }
                return roleOrder[a.role] - roleOrder[b.role]
              }),
              isExpanded: true,
            })
          }
        })
      }

      setTeamGroups(groupedTeams)
      setUnassignedPlayers(unassigned)
    } catch (err: any) {
      setError(`Fehler beim Laden der Benutzerdaten: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminStatus = async (player: PlayerData) => {
    if (!player.user_profile_id) {
      setError("Spieler hat kein Benutzerprofil")
      return
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_admin: !player.is_admin })
        .eq("id", player.user_profile_id)

      if (error) throw error

      // Refresh the data to show updated admin status
      await fetchAllUsers()
      onDataSaved()
    } catch (err: any) {
      setError(`Fehler beim Ändern des Admin-Status: ${err.message}`)
    }
  }

  const createAccount = async () => {
    console.log("[v0] Starting account creation process")

    if (!accountForm.email || !accountForm.password || !accountForm.playerId) {
      setAccountCreationStatus({
        type: "error",
        message: "Bitte füllen Sie alle Felder aus.",
      })
      return
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountCreationStatus({
        type: "error",
        message: "Passwörter stimmen nicht überein.",
      })
      return
    }

    if (accountForm.password.length < 6) {
      setAccountCreationStatus({
        type: "error",
        message: "Passwort muss mindestens 6 Zeichen lang sein.",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(accountForm.email)) {
      setAccountCreationStatus({
        type: "error",
        message: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      })
      return
    }

    setIsCreatingAccount(true)
    setAccountCreationStatus({ type: null, message: "" })

    try {
      console.log("[v0] Creating auth user with email:", accountForm.email)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountForm.email,
        password: accountForm.password,
      })

      console.log("[v0] Auth signup result:", { authData, authError })

      if (authError) {
        console.log("[v0] Auth error details:", authError)
        throw authError
      }

      if (authData.user) {
        console.log("[v0] Creating user profile for user:", authData.user.id)

        const { error: profileError } = await supabase.from("user_profiles").insert({
          user_id: authData.user.id,
          player_id: accountForm.playerId,
        })

        console.log("[v0] Profile creation result:", { profileError })

        if (profileError) throw profileError

        setAccountCreationStatus({
          type: "success",
          message: "Account erfolgreich erstellt! Der Benutzer erhält eine Bestätigungs-E-Mail.",
        })

        setAccountForm({
          playerId: "",
          email: "",
          password: "",
          confirmPassword: "",
        })

        await fetchAllUsers()
      }
    } catch (err: any) {
      console.log("[v0] Account creation error:", err)

      let errorMessage = `Fehler beim Erstellen des Accounts: ${err.message}`

      if (err.message.includes("User already registered")) {
        errorMessage = "Ein Account mit dieser E-Mail-Adresse existiert bereits."
      } else if (err.message.includes("Invalid email")) {
        errorMessage = "Ungültige E-Mail-Adresse."
      } else if (err.message.includes("Password should be at least")) {
        errorMessage = "Das Passwort erfüllt nicht die Mindestanforderungen."
      } else if (err.message.includes("signup is disabled")) {
        errorMessage = "Die Registrierung ist derzeit deaktiviert. Bitte wenden Sie sich an den Administrator."
      }

      setAccountCreationStatus({
        type: "error",
        message: errorMessage,
      })
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const updateEmail = async () => {
    if (!managementForm.newEmail) {
      setManagementStatus({
        type: "error",
        message: "Bitte geben Sie eine neue E-Mail-Adresse ein.",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(managementForm.newEmail)) {
      setManagementStatus({
        type: "error",
        message: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      })
      return
    }

    setIsManagingAccount(true)
    setManagementStatus({ type: null, message: "" })

    try {
      const { error } = await supabase.auth.updateUser({
        email: managementForm.newEmail,
      })

      if (error) throw error

      setManagementStatus({
        type: "success",
        message: "E-Mail-Adresse erfolgreich aktualisiert! Eine Bestätigungs-E-Mail wurde gesendet.",
      })

      setManagementForm((prev) => ({ ...prev, newEmail: "" }))
    } catch (err: any) {
      setManagementStatus({
        type: "error",
        message: `Fehler beim Aktualisieren der E-Mail: ${err.message}`,
      })
    } finally {
      setIsManagingAccount(false)
    }
  }

  const updatePassword = async () => {
    if (!managementForm.newPassword || !managementForm.confirmNewPassword) {
      setManagementStatus({
        type: "error",
        message: "Bitte füllen Sie alle Passwort-Felder aus.",
      })
      return
    }

    if (managementForm.newPassword !== managementForm.confirmNewPassword) {
      setManagementStatus({
        type: "error",
        message: "Passwörter stimmen nicht überein.",
      })
      return
    }

    if (managementForm.newPassword.length < 6) {
      setManagementStatus({
        type: "error",
        message: "Passwort muss mindestens 6 Zeichen lang sein.",
      })
      return
    }

    setIsManagingAccount(true)
    setManagementStatus({ type: null, message: "" })

    try {
      const { error } = await supabase.auth.updateUser({
        password: managementForm.newPassword,
      })

      if (error) throw error

      setManagementStatus({
        type: "success",
        message: "Passwort erfolgreich aktualisiert!",
      })

      setManagementForm((prev) => ({
        ...prev,
        newPassword: "",
        confirmNewPassword: "",
      }))
    } catch (err: any) {
      setManagementStatus({
        type: "error",
        message: `Fehler beim Aktualisieren des Passworts: ${err.message}`,
      })
    } finally {
      setIsManagingAccount(false)
    }
  }

  const deleteAccount = async () => {
    if (
      !confirm(
        `Sind Sie sicher, dass Sie den Account für ${managementForm.playerName} löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return
    }

    setIsManagingAccount(true)
    setManagementStatus({ type: null, message: "" })

    try {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("player_id", managementForm.playerId)

      if (profileError) throw profileError

      setManagementStatus({
        type: "success",
        message: "Account-Verknüpfung erfolgreich entfernt! Der Benutzer kann sich nicht mehr anmelden.",
      })

      await fetchAllUsers()

      setManagementForm({
        playerId: "",
        playerName: "",
        currentEmail: "",
        newEmail: "",
        newPassword: "",
        confirmNewPassword: "",
      })
      setManagementAction(null)
    } catch (err: any) {
      setManagementStatus({
        type: "error",
        message: `Fehler beim Löschen des Accounts: ${err.message}`,
      })
    } finally {
      setIsManagingAccount(false)
    }
  }

  const openAccountManagement = (player: PlayerData, action: "email" | "password" | "delete") => {
    setManagementForm({
      playerId: player.id,
      playerName: player.name,
      currentEmail: "", // Would need to fetch from auth.users in real app
      newEmail: "",
      newPassword: "",
      confirmNewPassword: "",
    })
    setManagementAction(action)
    setManagementStatus({ type: null, message: "" })
  }

  const getPlayersWithoutAccounts = () => {
    const allPlayers = teamGroups.flatMap((team) => team.players)
    return [...allPlayers, ...unassignedPlayers].filter((player) => !player.has_account)
  }

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const toggleTeamExpansion = (teamId: string) => {
    setTeamGroups((prev) => prev.map((team) => (team.id === teamId ? { ...team, isExpanded: !team.isExpanded } : team)))
  }

  const getFilteredTeams = () => {
    if (!searchTerm) return teamGroups

    return teamGroups
      .map((team) => ({
        ...team,
        players: team.players.filter((player) => player.name.toLowerCase().includes(searchTerm.toLowerCase())),
      }))
      .filter((team) => team.players.length > 0)
  }

  const getFilteredUnassigned = () => {
    if (!searchTerm) return unassignedPlayers
    return unassignedPlayers.filter((player) => player.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }

  const getAllPlayers = () => {
    const allPlayers = teamGroups.flatMap((team) => team.players)
    return [...allPlayers, ...unassignedPlayers]
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-4 w-4 text-yellow-600" />
      case "Co-Captain":
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Captain":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Kapitän</Badge>
      case "Co-Captain":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Co-Kapitän</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Spieler</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Benutzerdaten werden geladen...</p>
        </div>
      </div>
    )
  }

  const filteredTeams = getFilteredTeams()
  const filteredUnassigned = getFilteredUnassigned()
  const allPlayers = getAllPlayers()
  const playersWithoutAccounts = getPlayersWithoutAccounts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h2>
            <p className="text-gray-600">Vereinsspieler nach Teams organisiert</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4" />
                <span>Account erstellen</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  <span>Neuen Account erstellen</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="player-select">Spieler auswählen</Label>
                  <Select
                    value={accountForm.playerId}
                    onValueChange={(value) => setAccountForm((prev) => ({ ...prev, playerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Spieler ohne Account auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {playersWithoutAccounts.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(player.role)}
                            <span>{player.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {player.role === "Captain"
                                ? "Kapitän"
                                : player.role === "Co-Captain"
                                  ? "Co-Kapitän"
                                  : "Spieler"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="spieler@example.com"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mindestens 6 Zeichen"
                      value={accountForm.password}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Passwort wiederholen"
                      value={accountForm.confirmPassword}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {accountCreationStatus.type && (
                  <div
                    className={`p-3 rounded-lg flex items-center space-x-2 ${
                      accountCreationStatus.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {accountCreationStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{accountCreationStatus.message}</span>
                  </div>
                )}

                <Button
                  onClick={createAccount}
                  disabled={isCreatingAccount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCreatingAccount ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Account wird erstellt...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Account erstellen</span>
                    </div>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={fetchAllUsers} variant="outline" className="flex items-center space-x-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            <span>Aktualisieren</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Nach Spielername suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {allPlayers.filter((p) => p.role === "Captain").length}
                </p>
                <p className="text-sm text-gray-600">Kapitäne</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {allPlayers.filter((p) => p.role === "Co-Captain").length}
                </p>
                <p className="text-sm text-gray-600">Co-Kapitäne</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {allPlayers.filter((p) => p.role === "Player").length}
                </p>
                <p className="text-sm text-gray-600">Spieler</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{teamGroups.length}</p>
                <p className="text-sm text-gray-600">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{allPlayers.filter((p) => p.has_account).length}</p>
                <p className="text-sm text-gray-600">Mit Account</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleTeamExpansion(team.id)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span>{team.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {team.players.length} Spieler
                  </Badge>
                </div>
                {team.isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </CardTitle>
            </CardHeader>
            {team.isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {player.photo_url && (
                          <img
                            src={player.photo_url || "/placeholder.svg"}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        )}
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(player.role)}
                          <div>
                            <h3 className="font-semibold text-gray-900">{player.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {getRoleBadge(player.role)}
                              {player.has_account ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Account
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                  Kein Account
                                </Badge>
                              )}
                              {player.is_admin && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                  <Settings className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>Seit {formatDate(player.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {player.has_account && (
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`admin-${player.id}`} className="text-sm text-gray-600">
                              Admin
                            </Label>
                            <Switch
                              id={`admin-${player.id}`}
                              checked={player.is_admin || false}
                              onCheckedChange={() => toggleAdminStatus(player)}
                            />
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {player.age && <div>Alter: {player.age}</div>}
                            {player.throwing_hand && <div>Wurfhand: {player.throwing_hand}</div>}
                            {player.origin && <div>Herkunft: {player.origin}</div>}
                          </div>
                          {player.has_account && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openAccountManagement(player, "email")}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  E-Mail ändern
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAccountManagement(player, "password")}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Passwort ändern
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openAccountManagement(player, "delete")}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Account löschen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {filteredUnassigned.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-600" />
                <span>Nicht zugeordnete Spieler</span>
                <Badge variant="outline" className="ml-2">
                  {filteredUnassigned.length} Spieler
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredUnassigned.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center space-x-4">
                      {player.photo_url && (
                        <img
                          src={player.photo_url || "/placeholder.svg"}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(player.role)}
                        <div>
                          <h3 className="font-semibold text-gray-900">{player.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {getRoleBadge(player.role)}
                            <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                              Kein Team
                            </Badge>
                            {player.has_account ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Account
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                Kein Account
                              </Badge>
                            )}
                            {player.is_admin && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                <Settings className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {player.has_account && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`admin-unassigned-${player.id}`} className="text-sm text-gray-600">
                            Admin
                          </Label>
                          <Switch
                            id={`admin-unassigned-${player.id}`}
                            checked={player.is_admin || false}
                            onCheckedChange={() => toggleAdminStatus(player)}
                          />
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {player.age && <div>Alter: {player.age}</div>}
                          {player.throwing_hand && <div>Wurfhand: {player.throwing_hand}</div>}
                          {player.origin && <div>Herkunft: {player.origin}</div>}
                        </div>
                        {player.has_account && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAccountManagement(player, "email")}>
                                <Mail className="mr-2 h-4 w-4" />
                                E-Mail ändern
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAccountManagement(player, "password")}>
                                <Key className="mr-2 h-4 w-4" />
                                Passwort ändern
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openAccountManagement(player, "delete")}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Account löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

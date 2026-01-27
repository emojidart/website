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
  MailCheck,
  MailX,
  Link2,
  Link2Off as LinkOff,
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
import { deleteUserAccount } from "@/app/actions/delete-user"
import { listAuthUsers } from "@/app/actions/list-users"
import { confirmUser } from "@/app/actions/confirm-user"

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
  email_confirmed?: boolean
  spieldatenbank_id?: string | null
  spieldatenbank_linked?: boolean
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

interface LinkingForm {
  playerId: string
  playerName: string
  selectedSpielerId: string
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

  const [isLinkingAccount, setIsLinkingAccount] = useState(false)
  const [linkingForm, setLinkingForm] = useState<LinkingForm>({
    playerId: "",
    playerName: "",
    selectedSpielerId: "",
  })
  const [linkingStatus, setLinkingStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [spielerOptions, setSpielgerOptions] = useState<Array<{ id: string; name: string; verein: string }>>([])
  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false)

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
        .select("id, player_id, user_id, is_admin, email_confirmed")

      if (userProfilesError) throw userProfilesError

      const authUsersResult = await listAuthUsers()

      if (!authUsersResult.success) {
        console.error("[v0] Error fetching auth users:", authUsersResult.error)
        setError(`Fehler beim Laden der Benutzerdaten: ${authUsersResult.error}`)
        setLoading(false)
        return
      }

      const authUsers = authUsersResult.users || []


      // Map Supabase Auth users by our custom player_id (stored in user_metadata)
      const authUserByPlayerId = new Map<
        string,
        { user_id: string; email?: string; email_confirmed: boolean }
      >()

      authUsers.forEach((u: any) => {
        const pid = u?.user_metadata?.player_id
        if (pid) {
          authUserByPlayerId.set(pid, {
            user_id: u.id,
            email: u.email,
            email_confirmed: !!u.email_confirmed_at,
          })
        }
      })

      const playersWithAccounts = new Set(userProfiles?.filter((p) => p.user_id !== null).map((p) => p.player_id) || [])
      const adminStatusMap = new Map(
        userProfiles?.map((p) => [
          p.player_id,
          {
            is_admin: p.is_admin,
            profile_id: p.id,
            email_confirmed: p.email_confirmed,
          },
        ]) || [],
      )


      // Keep user_profiles.email_confirmed in sync with Supabase Auth (auth.users.email_confirmed_at)
      // This is optional for UI (we already read the real status from Auth), but helps keep the DB consistent.
      try {
        const profileIdsToConfirm: string[] = []

        userProfiles?.forEach((p: any) => {
          if (!p?.user_id) return
          const isAuthConfirmed = !!authUsers.find((u: any) => u.id === p.user_id)?.email_confirmed_at
          if (isAuthConfirmed && !p.email_confirmed) {
            profileIdsToConfirm.push(p.id)
          }
        })

        if (profileIdsToConfirm.length > 0) {
          const { error: syncError } = await supabase
            .from("user_profiles")
            .update({ email_confirmed: true })
            .in("id", profileIdsToConfirm)

          if (syncError) {
            console.error("[v0] Failed to sync email_confirmed flags:", syncError)
          } else {
            // Update local map so UI reflects immediately without another fetch
            profileIdsToConfirm.forEach((pid) => {
              const entry = Array.from(adminStatusMap.entries()).find(([, v]) => v.profile_id === pid)
              if (entry) {
                const [playerId, v] = entry
                adminStatusMap.set(playerId, { ...v, email_confirmed: true })
              }
            })
          }
        }
      } catch (syncErr) {
        console.error("[v0] email_confirmed sync error:", syncErr)
      }

      const allPlayers: PlayerData[] = []
      const unassigned: PlayerData[] = []

      if (clubPlayers) {
        clubPlayers.forEach((player) => {
          const playerTeamMemberships = teamMembers?.filter((tm) => tm.player_id === player.id) || []
          const adminInfo = adminStatusMap.get(player.id)
          const hasAccount = playersWithAccounts.has(player.id) || authUserByPlayerId.has(player.id)

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
              has_account: hasAccount,
              is_admin: adminInfo?.is_admin || false,
              user_profile_id: adminInfo?.profile_id,
              email: authUserByPlayerId.get(player.id)?.email,
              email_confirmed:
                authUserByPlayerId.get(player.id)?.email_confirmed ?? adminInfo?.email_confirmed ?? false,
              spieldatenbank_id: player.spieldatenbank_id,
              spieldatenbank_linked: !!player.spieldatenbank_id,
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
                has_account: hasAccount,
                is_admin: adminInfo?.is_admin || false,
                user_profile_id: adminInfo?.profile_id,
                email: authUserByPlayerId.get(player.id)?.email,
                email_confirmed:
                  authUserByPlayerId.get(player.id)?.email_confirmed ?? adminInfo?.email_confirmed ?? false,
                spieldatenbank_id: player.spieldatenbank_id,
                spieldatenbank_linked: !!player.spieldatenbank_id,
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
      console.log("[v0] Player ID:", accountForm.playerId)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountForm.email,
        password: accountForm.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: {
            player_id: accountForm.playerId,
          },
        },
      })

      console.log("[v0] Auth signup result:", { authData, authError })

      if (authError) {
        console.log("[v0] Auth error details:", authError)
        throw authError
      }

      if (!authData.user) {
        console.log("[v0] ERROR: No user object returned from Supabase!")
        throw new Error("Kein User-Objekt von Supabase zurückgegeben")
      }

      console.log("[v0] Auth user created successfully with ID:", authData.user.id)
      console.log("[v0] Creating user profile for user:", authData.user.id)
      console.log("[v0] Profile data:", {
        user_id: authData.user.id,
        player_id: accountForm.playerId,
        is_admin: false,
        email_confirmed: false,
      })

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: authData.user.id,
          player_id: accountForm.playerId,
          is_admin: false,
          email_confirmed: false,
        })
        .select()

      console.log("[v0] Profile creation result:", { profileData, profileError })

      if (profileError) {
        console.log("[v0] ERROR: Profile creation failed:", profileError)
        throw profileError
      }

      console.log("[v0] Profile created successfully:", profileData)

      try {
        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("spieldatenbank_id")
          .eq("id", accountForm.playerId)
          .single()

        if (clubPlayer && !clubPlayer.spieldatenbank_id) {
          console.log("[v0] No spieldatenbank_id found for this player yet - member card linking needs manual setup")
        }
      } catch (err) {
        console.log("[v0] Could not fetch spieldatenbank_id status:", err)
      }

      setAccountCreationStatus({
        type: "success",
        message:
          "Account erfolgreich erstellt! Eine Bestätigungs-E-Mail wurde an den Benutzer gesendet. Der Account wird aktiviert, sobald die E-Mail bestätigt wurde.",
      })

      setAccountForm({
        playerId: "",
        email: "",
        password: "",
        confirmPassword: "",
      })

      await fetchAllUsers()
      onDataSaved()
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
    console.log("[v0] Starting account deletion for player:", managementForm.playerId)
    setIsManagingAccount(true)
    setManagementStatus({ type: null, message: "" })

    try {
      const result = await deleteUserAccount(managementForm.playerId)

      if (!result.success) {
        throw new Error(result.error || "Unbekannter Fehler beim Löschen")
      }

      console.log("[v0] Account successfully deleted")

      setManagementStatus({
        type: "success",
        message: "Account erfolgreich gelöscht! Der Benutzer wurde aus Supabase entfernt.",
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
      console.log("[v0] Error deleting account:", err)
      setManagementStatus({
        type: "error",
        message: `Fehler beim Löschen des Accounts: ${err.message}`,
      })
    } finally {
      setIsManagingAccount(false)
    }
  }

  const loadSpielerdatenbank = async () => {
    try {
      const { data: spieler, error } = await supabase.from("spieldatenbank").select("id, name, verein").order("name")

      if (error) throw error

      setSpielgerOptions(spieler || [])
    } catch (err: any) {
      console.error("[v0] Error loading spielerdatenbank:", err)
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Laden der Spielerdatenbank: ${err.message}`,
      })
    }
  }

  const linkToSpieldatenbank = async () => {
    if (!linkingForm.selectedSpielerId) {
      setLinkingStatus({
        type: "error",
        message: "Bitte wählen Sie einen Spieler aus der Spielerdatenbank aus.",
      })
      return
    }

    setIsLinkingAccount(true)
    setLinkingStatus({ type: null, message: "" })

    try {
      console.log("[v0] Linking club_player to spieldatenbank:", {
        playerId: linkingForm.playerId,
        spielerId: linkingForm.selectedSpielerId,
      })

      const { error } = await supabase
        .from("club_players")
        .update({ spieldatenbank_id: linkingForm.selectedSpielerId })
        .eq("id", linkingForm.playerId)

      if (error) throw error

      setLinkingStatus({
        type: "success",
        message: "Spieler erfolgreich mit Spielerdatenbank verknüpft! Member Card ist jetzt aktiviert.",
      })

      setTimeout(() => {
        setLinkingDialogOpen(false)
        fetchAllUsers()
        onDataSaved()
      }, 1500)
    } catch (err: any) {
      console.error("[v0] Error linking to spieldatenbank:", err)
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Verknüpfen: ${err.message}`,
      })
    } finally {
      setIsLinkingAccount(false)
    }
  }

  const openLinkingDialog = async (player: PlayerData) => {
    setLinkingForm({
      playerId: player.id,
      playerName: player.name,
      selectedSpielerId: "",
    })
    await loadSpielerdatenbank()
    setLinkingStatus({ type: null, message: "" })
    setLinkingDialogOpen(true)
  }

  const manuallyConfirmUser = async (player: PlayerData) => {
    console.log("[v0] Starting manual email confirmation for player:", player.name)

    if (!player.has_account) {
      console.log("[v0] Error: Player has no account")
      setError("Spieler hat keinen Account")
      return
    }

    try {
      console.log("[v0] Fetching auth users...")
      const authUsersResult = await listAuthUsers()
      console.log("[v0] Auth users result:", authUsersResult)

      if (!authUsersResult.success) {
        throw new Error("Fehler beim Laden der Auth-Daten")
      }

      const authUser = authUsersResult.users?.find((user) => user.user_metadata.player_id === player.id)
      console.log("[v0] Found auth user:", authUser)

      if (!authUser) {
        throw new Error("Auth-User nicht gefunden")
      }

      console.log("[v0] Calling confirmUser with userId:", authUser.id)
      const result = await confirmUser(authUser.id)
      console.log("[v0] Confirm user result:", result)

      if (!result.success) {
        let errorMessage = result.error || "Unbekannter Fehler"
        if (result.errorCode) {
          errorMessage += ` (Code: ${result.errorCode})`
        }
        if (result.errorStatus) {
          errorMessage += ` (Status: ${result.errorStatus})`
        }
        if (result.fullError) {
          console.log("[v0] Full error details:", result.fullError)
          errorMessage += `\n\nDetails: ${result.fullError}`
        }
        throw new Error(errorMessage)
      }

      console.log("[v0] Email confirmed successfully, refreshing data...")
      

      // Also persist the flag in our user_profiles table
      const { error: profileConfirmError } = await supabase
        .from("user_profiles")
        .update({ email_confirmed: true })
        .eq("user_id", authUser.id)

      if (profileConfirmError) {
        console.error("[v0] Failed to update user_profiles.email_confirmed:", profileConfirmError)
      }

await fetchAllUsers()
      onDataSaved()

      setError("")
      console.log("[v0] Manual confirmation completed successfully")
    } catch (err: any) {
      console.log("[v0] Error during manual confirmation:", err)
      setError(`Fehler beim Bestätigen der E-Mail: ${err.message}`)
    }
  }

  const openAccountManagement = (player: PlayerData, action: "email" | "password" | "delete") => {
    setManagementForm({
      playerId: player.id,
      playerName: player.name,
      currentEmail: "",
      newEmail: "",
      newPassword: "",
      confirmNewPassword: "",
    })
    setManagementAction(action)
    setManagementStatus({ type: null, message: "" })
  }

  const getPlayersWithoutAccounts = () => {
    const allPlayers = teamGroups.flatMap((team) => team.players)
    const allPlayersList = [...allPlayers, ...unassignedPlayers]

    const uniquePlayersMap = new Map<string, PlayerData>()
    allPlayersList.forEach((player) => {
      if (!player.has_account && !uniquePlayersMap.has(player.id)) {
        uniquePlayersMap.set(player.id, player)
      }
    })

    return Array.from(uniquePlayersMap.values())
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

  const getMemberCardBadge = (player: PlayerData) => {
    if (!player.has_account) return null

    if (player.spieldatenbank_linked) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          <Link2 className="h-3 w-3 mr-1" />
          Member Card aktiv
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          <LinkOff className="h-3 w-3 mr-1" />
          Keine Member Card
        </Badge>
      )
    }
  }

  const getEmailConfirmationBadge = (player: PlayerData) => {
    if (!player.has_account) return null

    if (player.email_confirmed) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          <MailCheck className="h-3 w-3 mr-1" />
          E-Mail bestätigt
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          <MailX className="h-3 w-3 mr-1" />
          E-Mail unbestätigt
        </Badge>
      )
    }
  }

  const getAdminBadge = (player: PlayerData) => {
    if (!player.has_account || !player.is_admin) return null

    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-semibold">
        <Settings className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    )
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

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Link2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {allPlayers.filter((p) => p.has_account && p.spieldatenbank_linked).length}
                </p>
                <p className="text-sm text-gray-600">Member Card aktiv</p>
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
                            <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
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
                              {getMemberCardBadge(player)}
                              {getAdminBadge(player)}
                              {getEmailConfirmationBadge(player)}
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
                                {!player.email_confirmed && (
                                  <DropdownMenuItem onClick={() => manuallyConfirmUser(player)}>
                                    <MailCheck className="mr-2 h-4 w-4" />
                                    E-Mail manuell bestätigen
                                  </DropdownMenuItem>
                                )}
                                {!player.spieldatenbank_linked && (
                                  <DropdownMenuItem onClick={() => openLinkingDialog(player)}>
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Mit Member Card verknüpfen
                                  </DropdownMenuItem>
                                )}
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
                          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
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
                            {getMemberCardBadge(player)}
                            {getAdminBadge(player)}
                            {getEmailConfirmationBadge(player)}
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
                              {!player.email_confirmed && (
                                <DropdownMenuItem onClick={() => manuallyConfirmUser(player)}>
                                  <MailCheck className="mr-2 h-4 w-4" />
                                  E-Mail manuell bestätigen
                                </DropdownMenuItem>
                              )}
                              {!player.spieldatenbank_linked && (
                                <DropdownMenuItem onClick={() => openLinkingDialog(player)}>
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Mit Member Card verknüpfen
                                </DropdownMenuItem>
                              )}
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

      <Dialog open={managementAction !== null} onOpenChange={(open) => !open && setManagementAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {managementAction === "email" && (
                <>
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span>E-Mail-Adresse ändern</span>
                </>
              )}
              {managementAction === "password" && (
                <>
                  <Key className="h-5 w-5 text-green-600" />
                  <span>Passwort ändern</span>
                </>
              )}
              {managementAction === "delete" && (
                <>
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span>Account löschen</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Spieler:</p>
              <p className="font-semibold text-gray-900">{managementForm.playerName}</p>
            </div>

            {managementAction === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Neue E-Mail-Adresse</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="neue-email@example.com"
                      value={managementForm.newEmail}
                      onChange={(e) => setManagementForm((prev) => ({ ...prev, newEmail: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {managementStatus.type && (
                  <div
                    className={`p-3 rounded-lg flex items-center space-x-2 ${
                      managementStatus.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {managementStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{managementStatus.message}</span>
                  </div>
                )}

                <Button
                  onClick={updateEmail}
                  disabled={isManagingAccount}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isManagingAccount ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>E-Mail wird aktualisiert...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>E-Mail aktualisieren</span>
                    </div>
                  )}
                </Button>
              </>
            )}

            {managementAction === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Neues Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mindestens 6 Zeichen"
                      value={managementForm.newPassword}
                      onChange={(e) => setManagementForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Neues Passwort bestätigen</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Passwort wiederholen"
                      value={managementForm.confirmNewPassword}
                      onChange={(e) =>
                        setManagementForm((prev) => ({
                          ...prev,
                          confirmNewPassword: e.target.value,
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                {managementStatus.type && (
                  <div
                    className={`p-3 rounded-lg flex items-center space-x-2 ${
                      managementStatus.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {managementStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{managementStatus.message}</span>
                  </div>
                )}

                <Button
                  onClick={updatePassword}
                  disabled={isManagingAccount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isManagingAccount ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Passwort wird aktualisiert...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <span>Passwort aktualisieren</span>
                    </div>
                  )}
                </Button>
              </>
            )}

            {managementAction === "delete" && (
              <>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">
                        Warnung: Diese Aktion kann nicht rückgängig gemacht werden!
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Der Account für <strong>{managementForm.playerName}</strong> wird dauerhaft gelöscht. Der
                        Spieler kann sich danach nicht mehr anmelden.
                      </p>
                    </div>
                  </div>
                </div>

                {managementStatus.type && (
                  <div
                    className={`p-3 rounded-lg flex items-center space-x-2 ${
                      managementStatus.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {managementStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{managementStatus.message}</span>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    onClick={() => setManagementAction(null)}
                    variant="outline"
                    className="flex-1"
                    disabled={isManagingAccount}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={deleteAccount}
                    disabled={isManagingAccount}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isManagingAccount ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Wird gelöscht...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Account löschen</span>
                      </div>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkingDialogOpen} onOpenChange={setLinkingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              <span>Mit Member Card verknüpfen</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                Wählen Sie einen Spieler aus der Spielerdatenbank aus, um diesem Vereinsspieler eine Member Card zu
                aktivieren.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Spieler:</p>
              <p className="font-semibold text-gray-900">{linkingForm.playerName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spieler-select">Spieler aus Spielerdatenbank</Label>
              <Select
                value={linkingForm.selectedSpielerId}
                onValueChange={(value) => setLinkingForm((prev) => ({ ...prev, selectedSpielerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Spieler auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {spielerOptions.map((spieler) => (
                    <SelectItem key={spieler.id} value={spieler.id}>
                      <div className="flex items-center space-x-2">
                        <span>{spieler.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {spieler.verein}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkingStatus.type && (
              <div
                className={`p-3 rounded-lg flex items-center space-x-2 ${
                  linkingStatus.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {linkingStatus.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{linkingStatus.message}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={() => setLinkingDialogOpen(false)}
                variant="outline"
                className="flex-1"
                disabled={isLinkingAccount}
              >
                Abbrechen
              </Button>
              <Button
                onClick={linkToSpieldatenbank}
                disabled={isLinkingAccount || !linkingForm.selectedSpielerId}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLinkingAccount ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Wird verknüpft...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link2 className="h-4 w-4" />
                    <span>Verknüpfen</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

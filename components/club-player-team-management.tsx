"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import {
  Users,
  UserRoundPlus,
  Hand,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  ClipboardList,
  UserRoundCog,
  PlusCircle,
  ImageIcon as ImageIconLucide,
  Edit,
  XCircle,
  Crown,
  ShieldCheck,
  BarChart3,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ClubPlayerManagementProps {
  user: User | null
  onDataSaved: () => void
}

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
  player_name: string // For display purposes
  role: string | null // NEW: Player role
}

interface LigaStatistic {
  id: string
  player_id: string
  player_name: string
  game_date: string
  throws_180: number
  throws_171: number
  throws_154: number
  throws_under_26: number
  semperit_outs: number
  notes: string | null
}

export function ClubPlayerTeamManagement({ user, onDataSaved }: ClubPlayerManagementProps) {
  // Player State
  const [playerName, setPlayerName] = useState("")
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null)
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState<string | null>(null)
  const [playerThrowingHand, setPlayerThrowingHand] = useState<string>("")
  const [playerAge, setPlayerAge] = useState<number | string>("")
  const [playerOrigin, setPlayerOrigin] = useState("")
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerMessage, setPlayerMessage] = useState("")
  const [playerMessageType, setPlayerMessageType] = useState<"success" | "error" | "info">("info")
  const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([])
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

  // Team State
  const [newTeamName, setNewTeamName] = useState("")
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null)
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamMessage, setTeamMessage] = useState("")
  const [teamMessageType, setTeamMessageType] = useState<"success" | "error" | "info">("info")
  const [teams, setTeams] = useState<Team[]>([])
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)

  // Team Member Assignment State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("Player") // NEW: Default role
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState("")
  const [assignmentMessageType, setAssignmentMessageType] = useState<"success" | "error" | "info">("info")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentSelectedPlayerTeam, setCurrentSelectedPlayerTeam] = useState<Team | null>(null)
  const [currentSelectedPlayerRole, setCurrentSelectedPlayerRole] = useState<string | null>(null) // NEW

  const [ligaStats, setLigaStats] = useState<LigaStatistic[]>([])
  const [statsPlayerId, setStatsPlayerId] = useState<string>("")
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [throws180, setThrows180] = useState<number>(0)
  const [throws171, setThrows171] = useState<number>(0)
  const [throws154, setThrows154] = useState<number>(0)
  const [throwsUnder26, setThrowsUnder26] = useState<number>(0)
  const [semperitOuts, setSemperitOuts] = useState<number>(0)
  const [statsNotes, setStatsNotes] = useState<string>("")
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsMessage, setStatsMessage] = useState("")
  const [statsMessageType, setStatsMessageType] = useState<"success" | "error" | "info">("info")

  const [activeSection, setActiveSection] = useState<
    "add-player" | "manage-players" | "manage-teams" | "assign-player" | "liga-statistics" | "view-statistics"
  >("add-player")

  useEffect(() => {
    fetchClubPlayers()
    fetchTeams()
    fetchTeamMembers()
    fetchLigaStatistics()
  }, [])

  const fetchLigaStatistics = async () => {
    const { data, error } = await supabase
      .from("liga_statistics")
      .select(`
        id,
        player_id,
        game_date,
        throws_180,
        throws_171,
        throws_154,
        throws_under_26,
        semperit_outs,
        notes,
        club_players(name)
      `)
      .order("game_date", { ascending: false })

    if (error) {
      console.error("Error fetching liga statistics:", error)
      setStatsMessage("Fehler beim Laden der Ligastatistiken.")
      setStatsMessageType("error")
    } else {
      const statsWithPlayerNames = data?.map((stat: any) => ({
        id: stat.id,
        player_id: stat.player_id,
        player_name: stat.club_players.name,
        game_date: stat.game_date,
        throws_180: stat.throws_180,
        throws_171: stat.throws_171,
        throws_154: stat.throws_154,
        throws_under_26: stat.throws_under_26,
        semperit_outs: stat.semperit_outs,
        notes: stat.notes,
      }))
      setLigaStats(statsWithPlayerNames || [])
    }
  }

  const handleSaveLigaStatistics = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatsLoading(true)
    setStatsMessage("Statistiken werden gespeichert...")
    setStatsMessageType("info")

    if (!user) {
      setStatsMessage("Fehler: Nicht authentifiziert.")
      setStatsMessageType("error")
      setStatsLoading(false)
      return
    }

    if (!statsPlayerId) {
      setStatsMessage("Bitte einen Spieler auswählen.")
      setStatsMessageType("error")
      setStatsLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("liga_statistics").insert([
        {
          player_id: statsPlayerId,
          game_date: gameDate,
          throws_180: throws180,
          throws_171: throws171,
          throws_154: throws154,
          throws_under_26: throwsUnder26,
          semperit_outs: semperitOuts,
          notes: statsNotes || null,
          created_by: user.id,
        },
      ])

      if (error) {
        throw error
      }

      setStatsMessage("Ligastatistiken erfolgreich gespeichert!")
      setStatsMessageType("success")

      // Reset form
      setStatsPlayerId("")
      setGameDate(new Date().toISOString().split("T")[0])
      setThrows180(0)
      setThrows171(0)
      setThrows154(0)
      setThrowsUnder26(0)
      setSemperitOuts(0)
      setStatsNotes("")

      fetchLigaStatistics()
      onDataSaved()
    } catch (error: any) {
      setStatsMessage(`Fehler beim Speichern: ${error.message}`)
      setStatsMessageType("error")
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchClubPlayers()
    fetchTeams()
    fetchTeamMembers()
  }, [])

  useEffect(() => {
    if (selectedPlayerId) {
      const playerCurrentAssignment = teamMembers.find((member) => member.player_id === selectedPlayerId)
      if (playerCurrentAssignment) {
        const team = teams.find((t) => t.id === playerCurrentAssignment.team_id)
        setCurrentSelectedPlayerTeam(team || null)
        setCurrentSelectedPlayerRole(playerCurrentAssignment.role) // Set current role
        setSelectedTeamId(playerCurrentAssignment.team_id) // Pre-select current team
        setSelectedRole(playerCurrentAssignment.role || "Player") // Pre-select current role
      } else {
        setCurrentSelectedPlayerTeam(null)
        setCurrentSelectedPlayerRole(null)
        setSelectedTeamId("") // Clear selected team
        setSelectedRole("Player") // Reset role
      }
    } else {
      setCurrentSelectedPlayerTeam(null)
      setCurrentSelectedPlayerRole(null)
      setSelectedTeamId("")
      setSelectedRole("Player")
    }
  }, [selectedPlayerId, teamMembers, teams])

  const fetchClubPlayers = async () => {
    const { data, error } = await supabase.from("club_players").select("*").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching club players:", error)
      setPlayerMessage("Fehler beim Laden der Spieler.")
      setPlayerMessageType("error")
    } else {
      setClubPlayers(data || [])
    }
  }

  const fetchTeams = async () => {
    const { data, error } = await supabase.from("teams").select("*").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching teams:", error)
      setTeamMessage("Fehler beim Laden der Mannschaften.")
      setTeamMessageType("error")
    } else {
      setTeams(data || [])
    }
  }

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select(`id, team_id, player_id, role, club_players(name)`) // NEW: Fetch role
    if (error) {
      console.error("Error fetching team members:", error)
      setAssignmentMessage("Fehler beim Laden der Mannschaftsmitglieder.")
      setAssignmentMessageType("error")
    } else {
      const membersWithPlayerNames = data?.map((member: any) => ({
        id: member.id,
        team_id: member.team_id,
        player_id: member.player_id,
        player_name: member.club_players.name,
        role: member.role, // NEW
      }))
      setTeamMembers(membersWithPlayerNames || [])
    }
  }

  const handlePlayerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPlayerPhotoFile(file)
      setPlayerPhotoPreview(URL.createObjectURL(file))
    } else {
      setPlayerPhotoFile(null)
      setPlayerPhotoPreview(null)
    }
  }

  const handleTeamLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTeamLogoFile(file)
      setTeamLogoPreview(URL.createObjectURL(file))
    } else {
      setTeamLogoFile(null)
      setTeamLogoPreview(null)
    }
  }

  const handleSubmitPlayerForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setPlayerLoading(true)
    setPlayerMessage(editingPlayerId ? "Spieler wird aktualisiert..." : "Spieler wird hinzugefügt...")
    setPlayerMessageType("info")

    if (!user) {
      setPlayerMessage("Fehler: Nicht authentifiziert.")
      setPlayerMessageType("error")
      setPlayerLoading(false)
      return
    }
    if (!playerName) {
      setPlayerMessage("Bitte Spielername eingeben.")
      setPlayerMessageType("error")
      setPlayerLoading(false)
      return
    }

    let photoUrl: string | null = playerPhotoPreview
    if (playerPhotoFile) {
      const fileExtension = playerPhotoFile.name.split(".").pop()
      const sanitizedPlayerName = playerName.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `club-player-avatars/${sanitizedPlayerName}-${Date.now()}.${fileExtension}`

      try {
        const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, playerPhotoFile, {
          cacheControl: "3600",
          upsert: false,
        })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      } catch (uploadError: any) {
        setPlayerMessage(`Fehler beim Hochladen des Bildes: ${uploadError.message}`)
        setPlayerMessageType("error")
        setPlayerLoading(false)
        return
      }
    } else if (playerPhotoPreview === null && editingPlayerId) {
      photoUrl = null
    }

    try {
      if (editingPlayerId) {
        const { error } = await supabase
          .from("club_players")
          .update({
            name: playerName,
            photo_url: photoUrl,
            throwing_hand: playerThrowingHand || null,
            age: playerAge ? Number(playerAge) : null,
            origin: playerOrigin || null,
            user_id: user.id,
          })
          .eq("id", editingPlayerId)

        if (error) {
          throw error
        }
        setPlayerMessage("Spieler erfolgreich aktualisiert!")
      } else {
        const { error } = await supabase.from("club_players").insert([
          {
            name: playerName,
            photo_url: photoUrl,
            throwing_hand: playerThrowingHand || null,
            age: playerAge ? Number(playerAge) : null,
            origin: playerOrigin || null,
            user_id: user.id,
          },
        ])

        if (error) {
          throw error
        }
        setPlayerMessage("Spieler erfolgreich hinzugefügt!")
      }

      setPlayerMessageType("success")
      setPlayerName("")
      setPlayerPhotoFile(null)
      setPlayerPhotoPreview(null)
      setPlayerThrowingHand("")
      setPlayerAge("")
      setPlayerOrigin("")
      setEditingPlayerId(null)
      fetchClubPlayers()
      onDataSaved()
    } catch (error: any) {
      setPlayerMessage(`Fehler: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  const handleEditPlayerClick = (player: ClubPlayer) => {
    setEditingPlayerId(player.id)
    setPlayerName(player.name)
    setPlayerPhotoPreview(player.photo_url)
    setPlayerPhotoFile(null)
    setPlayerThrowingHand(player.throwing_hand || "")
    setPlayerAge(player.age || "")
    setPlayerOrigin(player.origin || "")
    setPlayerMessage("")
    setPlayerMessageType("info")
    setActiveSection("add-player")
  }

  const handleCancelPlayerEdit = () => {
    setEditingPlayerId(null)
    setPlayerName("")
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    setPlayerThrowingHand("")
    setPlayerAge("")
    setPlayerOrigin("")
    setPlayerMessage("")
    setPlayerMessageType("info")
  }

  const handleDeletePlayer = async (playerId: string, photoUrl: string | null) => {
    if (
      !confirm(
        "Sind Sie sicher, dass Sie diesen Spieler löschen möchten? Dies entfernt ihn auch aus allen Mannschaften.",
      )
    )
      return

    setPlayerLoading(true)
    setPlayerMessage("Spieler wird gelöscht...")
    setPlayerMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase.from("team_members").delete().eq("player_id", playerId)
      if (deleteMembersError) {
        throw deleteMembersError
      }

      const { error: deletePlayerError } = await supabase.from("club_players").delete().eq("id", playerId)
      if (deletePlayerError) {
        throw deletePlayerError
      }

      if (photoUrl) {
        const filePath = photoUrl.split("player-avatars/")[1]
        if (filePath) {
          const { error: deletePhotoError } = await supabase.storage.from("player-avatars").remove([filePath])
          if (deletePhotoError) {
            console.warn("Fehler beim Löschen des Spielerfotos aus dem Storage:", deletePhotoError.message)
          }
        }
      }

      setPlayerMessage("Spieler erfolgreich gelöscht!")
      setPlayerMessageType("success")
      fetchClubPlayers()
      fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setPlayerMessage(`Fehler beim Löschen des Spielers: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  const handleSubmitTeamForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamLoading(true)
    setTeamMessage(editingTeamId ? "Mannschaft wird aktualisiert..." : "Mannschaft wird erstellt...")
    setTeamMessageType("info")

    if (!user) {
      setTeamMessage("Fehler: Nicht authentifiziert.")
      setTeamMessageType("error")
      setTeamLoading(false)
      return
    }
    if (!newTeamName) {
      setTeamMessage("Bitte Mannschaftsnamen eingeben.")
      setTeamMessageType("error")
      setTeamLoading(false)
      return
    }

    let logoUrl: string | null = teamLogoPreview
    if (teamLogoFile) {
      const fileExtension = teamLogoFile.name.split(".").pop()
      const sanitizedTeamName = newTeamName.replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s/g, "_")
      const filePath = `team-logos/${sanitizedTeamName}-${Date.now()}.${fileExtension}`

      try {
        const { error: uploadError } = await supabase.storage.from("team-logos").upload(filePath, teamLogoFile, {
          cacheControl: "3600",
          upsert: false,
        })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from("team-logos").getPublicUrl(filePath)
        logoUrl = publicUrlData.publicUrl
      } catch (uploadError: any) {
        setTeamMessage(`Fehler beim Hochladen des Logos: ${uploadError.message}`)
        setTeamMessageType("error")
        setTeamLoading(false)
        return
      }
    } else if (teamLogoPreview === null && editingTeamId) {
      logoUrl = null
    }

    try {
      if (editingTeamId) {
        const { error } = await supabase
          .from("teams")
          .update({ name: newTeamName, logo_url: logoUrl, user_id: user.id })
          .eq("id", editingTeamId)

        if (error) {
          throw error
        }
        setTeamMessage("Mannschaft erfolgreich aktualisiert!")
      } else {
        const { error } = await supabase
          .from("teams")
          .insert([{ name: newTeamName, logo_url: logoUrl, user_id: user.id }])

        if (error) {
          throw error
        }
        setTeamMessage("Mannschaft erfolgreich erstellt!")
      }

      setTeamMessageType("success")
      setNewTeamName("")
      setTeamLogoFile(null)
      setTeamLogoPreview(null)
      setEditingTeamId(null)
      fetchTeams()
      onDataSaved()
    } catch (error: any) {
      setTeamMessage(`Fehler: ${error.message}`)
      setTeamMessageType("error")
    } finally {
      setTeamLoading(false)
    }
  }

  const handleEditTeamClick = (team: Team) => {
    setEditingTeamId(team.id)
    setNewTeamName(team.name)
    setTeamLogoPreview(team.logo_url)
    setTeamLogoFile(null)
    setTeamMessage("")
    setTeamMessageType("info")
    setActiveSection("manage-teams")
  }

  const handleCancelEditTeam = () => {
    setEditingTeamId(null)
    setNewTeamName("")
    setTeamLogoFile(null)
    setTeamLogoPreview(null)
    setTeamMessage("")
    setTeamMessageType("info")
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diese Mannschaft löschen möchten?")) return

    setTeamLoading(true)
    setTeamMessage("Mannschaft wird gelöscht...")
    setTeamMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase.from("team_members").delete().eq("team_id", teamId)

      if (deleteMembersError) {
        throw deleteMembersError
      }

      const { error } = await supabase.from("teams").delete().eq("id", teamId)

      if (error) {
        throw error
      }

      setTeamMessage("Mannschaft erfolgreich gelöscht!")
      setTeamMessageType("success")
      fetchTeams()
      fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setTeamMessage(`Fehler beim Löschen der Mannschaft: ${error.message}`)
      setTeamMessageType("error")
    } finally {
      setTeamLoading(false)
    }
  }

  const handleAssignPlayerToTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignmentLoading(true)
    setAssignmentMessage("Operation wird ausgeführt...")
    setAssignmentMessageType("info")

    if (!user) {
      setAssignmentMessage("Fehler: Nicht authentifiziert.")
      setAssignmentMessageType("error")
      setAssignmentLoading(false)
      return
    }
    if (!selectedPlayerId || !selectedTeamId) {
      setAssignmentMessage("Bitte Spieler und Mannschaft auswählen.")
      setAssignmentMessageType("error")
      setAssignmentLoading(false)
      return
    }

    try {
      // Check if the player is already in the target team
      const { data: existingAssignmentInTargetTeam, error: checkTargetError } = await supabase
        .from("team_members")
        .select("id, role") // Fetch role as well
        .eq("player_id", selectedPlayerId)
        .eq("team_id", selectedTeamId)
        .single()

      if (checkTargetError && checkTargetError.code !== "PGRST116") {
        throw checkTargetError
      }

      let operationMessage = "Spieler erfolgreich zugewiesen!"
      let movementType: "new_addition" | "transfer" = "new_addition"
      let fromTeamId: string | null = null

      if (existingAssignmentInTargetTeam) {
        // If player is already in this team, it's a role update
        if (existingAssignmentInTargetTeam.role === selectedRole) {
          setAssignmentMessage("Dieser Spieler ist bereits in dieser Mannschaft mit dieser Rolle.")
          setAssignmentMessageType("error")
          setAssignmentLoading(false)
          return
        } else {
          // Update existing assignment's role
          const { error: updateRoleError } = await supabase
            .from("team_members")
            .update({ role: selectedRole })
            .eq("id", existingAssignmentInTargetTeam.id)

          if (updateRoleError) {
            throw updateRoleError
          }
          operationMessage = "Spielerrolle erfolgreich aktualisiert!"
        }
      } else {
        // Check if the player is in ANY other team (for transfer)
        const { data: currentAssignments, error: checkCurrentError } = await supabase
          .from("team_members")
          .select("id, team_id")
          .eq("player_id", selectedPlayerId)

        if (checkCurrentError) {
          throw checkCurrentError
        }

        if (currentAssignments && currentAssignments.length > 0) {
          // If player is already assigned, it's a transfer
          movementType = "transfer"
          fromTeamId = currentAssignments[0].team_id // The ID of the current team
          // Delete all existing assignments for the player
          const { error: deleteOldAssignmentsError } = await supabase
            .from("team_members")
            .delete()
            .eq("player_id", selectedPlayerId)

          if (deleteOldAssignmentsError) {
            throw deleteOldAssignmentsError
          }
          operationMessage = "Spieler erfolgreich transferiert!"
        }

        // Insert new assignment
        const { error: insertError } = await supabase
          .from("team_members")
          .insert([{ player_id: selectedPlayerId, team_id: selectedTeamId, role: selectedRole }]) // NEW: Include role

        if (insertError) {
          throw insertError
        }

        // Log player movement in player_movements
        const { error: movementError } = await supabase.from("player_movements").insert([
          {
            player_id: selectedPlayerId,
            team_id: selectedTeamId, // This is the to_team_id
            from_team_id: fromTeamId, // This is the from_team_id
            movement_type: movementType,
            user_id: user.id,
          },
        ])

        if (movementError) {
          console.error("Fehler beim Protokollieren der Spielerbewegung:", movementError)
          // This is a non-critical error, the assignment has already occurred
        }
      }

      setAssignmentMessage(operationMessage)
      setAssignmentMessageType("success")
      setSelectedPlayerId("")
      setSelectedTeamId("")
      setSelectedRole("Player") // Reset role
      fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setAssignmentMessage(`Fehler bei der Zuweisung/dem Transfer: ${error.message}`)
      setAssignmentMessageType("error")
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleDeleteTeamMember = async (memberId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Spieler aus der Mannschaft entfernen möchten?")) return

    setAssignmentLoading(true)
    setAssignmentMessage("Mitglied wird entfernt...")
    setAssignmentMessageType("info")

    try {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId)

      if (error) {
        throw error
      }

      setAssignmentMessage("Mitglied erfolgreich entfernt!")
      setAssignmentMessageType("success")
      fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setAssignmentMessage(`Fehler beim Entfernen des Mitglieds: ${error.message}`)
      setAssignmentMessageType("error")
    } finally {
      setAssignmentLoading(false)
    }
  }

  const getPlayersInTeam = (teamId: string) => {
    return teamMembers.filter((member) => member.team_id === teamId)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Verein - Spielerverwaltung</CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Verwalte deine Vereinsspieler, Mannschaften und Ligastatistiken.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Section Navigation */}
          <div className="mb-6">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <Button
                onClick={() => {
                  setActiveSection("add-player")
                  handleCancelPlayerEdit()
                }}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap",
                  activeSection === "add-player"
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-transparent text-gray-600 hover:bg-gray-100",
                )}
              >
                <UserRoundPlus className="h-4 w-4 mr-2" />
                Spieler hinzufügen
              </Button>
              <Button
                onClick={() => setActiveSection("manage-players")}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap",
                  activeSection === "manage-players"
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-transparent text-gray-600 hover:bg-gray-100",
                )}
              >
                <UserRoundCog className="h-4 w-4 mr-2" />
                Spieler verwalten
              </Button>
              <Button
                onClick={() => {
                  setActiveSection("manage-teams")
                  handleCancelEditTeam()
                }}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap",
                  activeSection === "manage-teams"
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-transparent text-gray-600 hover:bg-gray-100",
                )}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Mannschaften verwalten
              </Button>
              <Button
                onClick={() => setActiveSection("assign-player")}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm whitespace-nowrap",
                  activeSection === "assign-player"
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-transparent text-gray-600 hover:bg-gray-100",
                )}
              >
                <UserRoundCog className="h-4 w-4 mr-2" />
                Spieler zuweisen
              </Button>
              <Button
                onClick={() => setActiveSection("liga-statistics")}
                variant={activeSection === "liga-statistics" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "whitespace-nowrap",
                  activeSection === "liga-statistics"
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50",
                )}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Ligastatistiken
              </Button>
              <Button
                onClick={() => setActiveSection("view-statistics")}
                variant={activeSection === "view-statistics" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "whitespace-nowrap",
                  activeSection === "view-statistics"
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50",
                )}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Statistiken anzeigen
              </Button>
            </div>
          </div>

          {/* Add/Edit Player Section */}
          {activeSection === "add-player" && (
            <form onSubmit={handleSubmitPlayerForm} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingPlayerId ? "Spieler bearbeiten" : "Neuen Spieler hinzufügen"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Name</Label>
                  <Input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Spielername"
                    className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerThrowingHand">Wurfhand</Label>
                  <Select value={playerThrowingHand} onValueChange={setPlayerThrowingHand}>
                    <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
                      <SelectValue placeholder="Wurfhand auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Left">
                        <div className="flex items-center space-x-2">
                          <Hand className="h-4 w-4" />
                          <span>Links</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Right">
                        <div className="flex items-center space-x-2">
                          <Hand className="h-4 w-4" />
                          <span>Rechts</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Both">
                        <div className="flex items-center space-x-2">
                          <Hand className="h-4 w-4" />
                          <span>Beide</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerAge">Alter</Label>
                  <Input
                    id="playerAge"
                    type="number"
                    min="0"
                    value={playerAge}
                    onChange={(e) => setPlayerAge(e.target.value)}
                    placeholder="Alter"
                    className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerOrigin">Herkunft</Label>
                  <Input
                    id="playerOrigin"
                    type="text"
                    value={playerOrigin}
                    onChange={(e) => setPlayerOrigin(e.target.value)}
                    placeholder="Herkunft (z.B. Stadt, Land)"
                    className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerPhoto">Profilbild (optional)</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="playerPhoto"
                    type="file"
                    accept="image/*"
                    onChange={handlePlayerPhotoChange}
                    className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  {playerPhotoPreview && (
                    <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                      <Image
                        src={playerPhotoPreview || "/placeholder.svg"}
                        alt="Vorschau Profilbild"
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded-full"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={() => {
                          setPlayerPhotoPreview(null)
                          setPlayerPhotoFile(null)
                        }}
                      >
                        <XCircle className="h-3 w-3" />
                        <span className="sr-only">Foto entfernen</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={playerLoading}
                  className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
                >
                  {playerLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{editingPlayerId ? "Wird aktualisiert..." : "Wird hinzugefügt..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {editingPlayerId ? <Edit className="h-4 w-4" /> : <UserRoundPlus className="h-4 w-4" />}
                      <span>{editingPlayerId ? "Änderungen speichern" : "Spieler hinzufügen"}</span>
                    </div>
                  )}
                </Button>
                {editingPlayerId && (
                  <Button
                    type="button"
                    onClick={handleCancelPlayerEdit}
                    variant="outline"
                    disabled={playerLoading}
                    className="h-10 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 font-medium rounded-lg shadow-md bg-transparent"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                )}
              </div>
              {playerMessage && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
                    playerMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : playerMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100",
                  )}
                >
                  {playerMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : playerMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{playerMessage}</span>
                </div>
              )}
            </form>
          )}

          {/* Manage Players Section */}
          {activeSection === "manage-players" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Bestehende Spieler verwalten</h3>
              {clubPlayers.length === 0 ? (
                <p className="text-sm text-gray-500">Noch keine Spieler vorhanden.</p>
              ) : (
                <ul className="space-y-2">
                  {clubPlayers.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={player.photo_url || "/placeholder.svg?height=32&width=32&query=player-avatar"}
                          />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-800">{player.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlayerClick(player)}
                          disabled={playerLoading}
                          className="h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id, player.photo_url)}
                          disabled={playerLoading}
                          className="h-8 px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Löschen</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Manage Teams Section */}
          {activeSection === "manage-teams" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTeamId ? "Mannschaft bearbeiten" : "Neue Mannschaft erstellen"}
              </h3>
              <form onSubmit={handleSubmitTeamForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newTeamName">Mannschaftsname</Label>
                  <Input
                    id="newTeamName"
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Mannschaftsname"
                    className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamLogo">Mannschaftslogo (optional)</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="teamLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleTeamLogoChange}
                      className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {teamLogoPreview && (
                      <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                        <Image
                          src={teamLogoPreview || "/placeholder.svg"}
                          alt="Vorschau Teamlogo"
                          fill
                          style={{ objectFit: "cover" }}
                          className="rounded-full"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() => {
                            setTeamLogoPreview(null)
                            setTeamLogoFile(null)
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                          <span className="sr-only">Logo entfernen</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={teamLoading}
                    className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
                  >
                    {teamLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{editingTeamId ? "Wird aktualisiert..." : "Wird erstellt..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {editingTeamId ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                        <span>{editingTeamId ? "Änderungen speichern" : "Mannschaft erstellen"}</span>
                      </div>
                    )}
                  </Button>
                  {editingTeamId && (
                    <Button
                      type="button"
                      onClick={handleCancelEditTeam}
                      variant="outline"
                      disabled={teamLoading}
                      className="h-10 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 font-medium rounded-lg shadow-md bg-transparent"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  )}
                </div>
              </form>
              {teamMessage && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
                    teamMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : teamMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100",
                  )}
                >
                  {teamMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : teamMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{teamMessage}</span>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Bestehende Mannschaften:</h4>
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch keine Mannschaften vorhanden.</p>
                ) : (
                  <ul className="space-y-2">
                    {teams.map((team) => (
                      <li
                        key={team.id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                              <Image
                                src={team.logo_url || "/placeholder.svg"}
                                alt={`${team.name} Logo`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-full"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <ImageIconLucide className="h-4 w-4" />
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{team.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTeamClick(team)}
                            disabled={teamLoading}
                            className="h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTeam(team.id)}
                            disabled={teamLoading}
                            className="h-8 px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Assign Player to Team Section */}
          {activeSection === "assign-player" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Spieler zu Mannschaft zuweisen</h3>
              <form onSubmit={handleAssignPlayerToTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selectPlayer">Spieler auswählen</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger
                      id="selectPlayer"
                      className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    >
                      <SelectValue placeholder="Spieler auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubPlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={player.photo_url || "/placeholder.svg?height=24&width=24&query=player-avatar"}
                              />
                              <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{player.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPlayerId && (
                    <p className="text-sm text-gray-500 mt-1">
                      Aktuelles Team:{" "}
                      {currentSelectedPlayerTeam ? (
                        <span className="font-medium text-gray-700">
                          {currentSelectedPlayerTeam.name}{" "}
                          {currentSelectedPlayerRole && (
                            <span className="text-xs text-gray-500">({currentSelectedPlayerRole})</span>
                          )}
                        </span>
                      ) : (
                        <span className="italic">Keinem Team zugewiesen</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selectTeam">Ziel-Mannschaft auswählen</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger
                      id="selectTeam"
                      className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    >
                      <SelectValue placeholder="Mannschaft auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selectRole">Rolle zuweisen</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger
                      id="selectRole"
                      className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    >
                      <SelectValue placeholder="Rolle auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Player">Spieler</SelectItem>
                      <SelectItem value="Co-Captain">Co-Kapitän</SelectItem>
                      <SelectItem value="Captain">Kapitän</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={assignmentLoading}
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
                >
                  {assignmentLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird ausgeführt...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserRoundCog className="h-4 w-4" />
                      <span>
                        {selectedPlayerId &&
                        currentSelectedPlayerTeam &&
                        currentSelectedPlayerTeam.id === selectedTeamId
                          ? "Rolle aktualisieren"
                          : selectedPlayerId && currentSelectedPlayerTeam
                            ? "Spieler transferieren"
                            : "Spieler zuweisen"}
                      </span>
                    </div>
                  )}
                </Button>
              </form>
              {assignmentMessage && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
                    assignmentMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : assignmentMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100",
                  )}
                >
                  {assignmentMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : assignmentMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{assignmentMessage}</span>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Aktuelle Mannschaftszuweisungen:</h4>
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch keine Mannschaften zum Anzeigen.</p>
                ) : (
                  <div className="space-y-4">
                    {teams.map((team) => {
                      const playersInTeam = getPlayersInTeam(team.id)
                      return (
                        <div key={team.id} className="bg-gray-50 border border-gray-200 rounded-md p-4">
                          <h5 className="font-bold text-gray-900 mb-2">{team.name}</h5>
                          {playersInTeam.length === 0 ? (
                            <p className="text-sm text-gray-500">Keine Spieler in dieser Mannschaft.</p>
                          ) : (
                            <ul className="space-y-1">
                              {playersInTeam.map((member) => (
                                <li key={member.id} className="flex items-center justify-between text-sm text-gray-700">
                                  <span className="flex items-center gap-1">
                                    {member.player_name}
                                    {member.role === "Captain" && (
                                      <Crown className="h-3 w-3 text-yellow-600" title="Kapitän" />
                                    )}
                                    {member.role === "Co-Captain" && (
                                      <ShieldCheck className="h-3 w-3 text-blue-600" title="Co-Kapitän" />
                                    )}
                                    {member.role && member.role !== "Player" && (
                                      <span className="text-xs text-gray-500">({member.role})</span>
                                    )}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTeamMember(member.id)}
                                    disabled={assignmentLoading}
                                    className="text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="sr-only">Entfernen</span>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "liga-statistics" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Ligastatistiken eingeben</h3>
              <form onSubmit={handleSaveLigaStatistics} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="statsPlayer">Spieler auswählen</Label>
                    <Select value={statsPlayerId} onValueChange={setStatsPlayerId}>
                      <SelectTrigger
                        id="statsPlayer"
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      >
                        <SelectValue placeholder="Spieler auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubPlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={player.photo_url || "/placeholder.svg?height=24&width=24&query=player-avatar"}
                                />
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{player.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gameDate">Spieltag</Label>
                    <Input
                      id="gameDate"
                      type="date"
                      value={gameDate}
                      onChange={(e) => setGameDate(e.target.value)}
                      className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-green-700">Gute Würfe</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="throws180">180er</Label>
                      <Input
                        id="throws180"
                        type="number"
                        min="0"
                        value={throws180}
                        onChange={(e) => setThrows180(Number.parseInt(e.target.value) || 0)}
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="throws171">171er</Label>
                      <Input
                        id="throws171"
                        type="number"
                        min="0"
                        value={throws171}
                        onChange={(e) => setThrows171(Number.parseInt(e.target.value) || 0)}
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="throws154">154er</Label>
                      <Input
                        id="throws154"
                        type="number"
                        min="0"
                        value={throws154}
                        onChange={(e) => setThrows154(Number.parseInt(e.target.value) || 0)}
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-red-700">Schlechte Würfe</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="throwsUnder26">Unter 26 Punkte</Label>
                      <Input
                        id="throwsUnder26"
                        type="number"
                        min="0"
                        value={throwsUnder26}
                        onChange={(e) => setThrowsUnder26(Number.parseInt(e.target.value) || 0)}
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semperitOuts">Semperit (Ins Out)</Label>
                      <Input
                        id="semperitOuts"
                        type="number"
                        min="0"
                        value={semperitOuts}
                        onChange={(e) => setSemperitOuts(Number.parseInt(e.target.value) || 0)}
                        className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statsNotes">Notizen (optional)</Label>
                  <Input
                    id="statsNotes"
                    value={statsNotes}
                    onChange={(e) => setStatsNotes(e.target.value)}
                    placeholder="Zusätzliche Notizen zum Spieltag..."
                    className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={statsLoading}
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
                >
                  {statsLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird gespeichert...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Statistiken speichern</span>
                    </div>
                  )}
                </Button>
              </form>

              {statsMessage && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
                    statsMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : statsMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100",
                  )}
                >
                  {statsMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : statsMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{statsMessage}</span>
                </div>
              )}
            </div>
          )}

          {activeSection === "view-statistics" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Ligastatistiken anzeigen</h3>
              {ligaStats.length === 0 ? (
                <p className="text-sm text-gray-500">Noch keine Ligastatistiken vorhanden.</p>
              ) : (
                <div className="space-y-4">
                  {ligaStats.map((stat) => (
                    <div key={stat.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{stat.player_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-gray-900">{stat.player_name}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(stat.game_date).toLocaleDateString("de-DE")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="text-center p-2 bg-green-100 rounded">
                          <div className="font-semibold text-green-800">{stat.throws_180}</div>
                          <div className="text-green-600">180er</div>
                        </div>
                        <div className="text-center p-2 bg-green-100 rounded">
                          <div className="font-semibold text-green-800">{stat.throws_171}</div>
                          <div className="text-green-600">171er</div>
                        </div>
                        <div className="text-center p-2 bg-green-100 rounded">
                          <div className="font-semibold text-green-800">{stat.throws_154}</div>
                          <div className="text-green-600">154er</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 rounded">
                          <div className="font-semibold text-red-800">{stat.throws_under_26}</div>
                          <div className="text-red-600">&lt; 26</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 rounded">
                          <div className="font-semibold text-red-800">{stat.semperit_outs}</div>
                          <div className="text-red-600">Semperit</div>
                        </div>
                      </div>

                      {stat.notes && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                          <strong>Notizen:</strong> {stat.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


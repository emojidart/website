"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { Team, TeamMember } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export function useTeamMembers(user: User | null, onDataSaved: () => void) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("Player")

  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState("")
  const [assignmentMessageType, setAssignmentMessageType] = useState<MessageType>("info")

  const [currentSelectedPlayerTeam, setCurrentSelectedPlayerTeam] = useState<Team | null>(null)
  const [currentSelectedPlayerRole, setCurrentSelectedPlayerRole] = useState<string | null>(null)

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select(`id, team_id, player_id, role, left_at, club_players!team_members_player_id_fkey(name)`)
      .is("left_at", null)

    if (error) {
      console.error("Error fetching team members:", error)
      setAssignmentMessage("Fehler beim Laden der Mannschaftsmitglieder.")
      setAssignmentMessageType("error")
    } else {
      const membersWithPlayerNames =
        data?.map((member: any) => ({
          id: member.id,
          team_id: member.team_id,
          player_id: member.player_id,
          player_name: member.club_players?.name ?? "",
          role: member.role,
        })) ?? []
      setTeamMembers(membersWithPlayerNames)
    }
  }

  useEffect(() => {
    fetchTeamMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncSelectedPlayerMeta = (teams: Team[]) => {
    if (selectedPlayerId) {
      const playerCurrent = teamMembers.find((m) => m.player_id === selectedPlayerId)
      if (playerCurrent) {
        const team = teams.find((t) => t.id === playerCurrent.team_id) || null
        setCurrentSelectedPlayerTeam(team)
        setCurrentSelectedPlayerRole(playerCurrent.role)
        setSelectedTeamId(playerCurrent.team_id)
        setSelectedRole(playerCurrent.role || "Player")
      } else {
        setCurrentSelectedPlayerTeam(null)
        setCurrentSelectedPlayerRole(null)
        setSelectedTeamId("")
        setSelectedRole("Player")
      }
    } else {
      setCurrentSelectedPlayerTeam(null)
      setCurrentSelectedPlayerRole(null)
      setSelectedTeamId("")
      setSelectedRole("Player")
    }
  }

  const assignPlayerToTeam = async () => {
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
      const { data: existingAssignment, error: checkError } = await supabase
        .from("team_members")
        .select("id, role, left_at")
        .eq("player_id", selectedPlayerId)
        .eq("team_id", selectedTeamId)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingAssignment) {
        if (existingAssignment.left_at) {
          const { error: reactivateError } = await supabase
            .from("team_members")
            .update({
              left_at: null,
              role: selectedRole,
              joined_at: new Date().toISOString(),
            })
            .eq("id", existingAssignment.id)

          if (reactivateError) throw reactivateError

          // optional log (wie in deinem Code)
          const { error: movementError } = await supabase.from("player_movements").insert([
            {
              player_id: selectedPlayerId,
              team_id: selectedTeamId,
              from_team_id: null,
              movement_type: "reactivation",
              user_id: user.id,
            },
          ])
          if (movementError) console.error("Fehler beim Protokollieren der Reaktivierung:", movementError)

          setAssignmentMessage("Spieler wurde wieder aktiviert und zugewiesen!")
          setAssignmentMessageType("success")
        } else {
          if (existingAssignment.role === selectedRole) {
            setAssignmentMessage("Dieser Spieler ist bereits in dieser Mannschaft mit dieser Rolle.")
            setAssignmentMessageType("error")
            setAssignmentLoading(false)
            return
          }

          const { error: updateRoleError } = await supabase
            .from("team_members")
            .update({ role: selectedRole })
            .eq("id", existingAssignment.id)

          if (updateRoleError) throw updateRoleError

          setAssignmentMessage("Spielerrolle erfolgreich aktualisiert!")
          setAssignmentMessageType("success")
        }

        setSelectedPlayerId("")
        setSelectedTeamId("")
        setSelectedRole("Player")
        await fetchTeamMembers()
        onDataSaved()
        return
      }

      const { error: insertError } = await supabase.from("team_members").insert([
        {
          player_id: selectedPlayerId,
          team_id: selectedTeamId,
          role: selectedRole,
        },
      ])
      if (insertError) throw insertError

      const { error: movementError } = await supabase.from("player_movements").insert([
        {
          player_id: selectedPlayerId,
          team_id: selectedTeamId,
          from_team_id: null,
          movement_type: "new_addition",
          user_id: user.id,
        },
      ])
      if (movementError) console.error("Fehler beim Protokollieren der Spielerbewegung:", movementError)

      setAssignmentMessage("Spieler erfolgreich zu weiterem Team hinzugefügt!")
      setAssignmentMessageType("success")

      setSelectedPlayerId("")
      setSelectedTeamId("")
      setSelectedRole("Player")
      await fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setAssignmentMessage(`Fehler bei der Zuweisung/dem Transfer: ${error.message}`)
      setAssignmentMessageType("error")
    } finally {
      setAssignmentLoading(false)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Spieler aus der Mannschaft entfernen möchten?")) return

    setAssignmentLoading(true)
    setAssignmentMessage("Mitglied wird entfernt...")
    setAssignmentMessageType("info")

    try {
      const { error } = await supabase
        .from("team_members")
        .update({ left_at: new Date().toISOString() })
        .eq("id", memberId)
        .is("left_at", null)

      if (error) throw error

      setAssignmentMessage("Mitglied erfolgreich entfernt!")
      setAssignmentMessageType("success")
      await fetchTeamMembers()
      onDataSaved()
    } catch (error: any) {
      setAssignmentMessage(`Fehler beim Entfernen des Mitglieds: ${error.message}`)
      setAssignmentMessageType("error")
    } finally {
      setAssignmentLoading(false)
    }
  }

  const getPlayersInTeam = (teamId: string) => teamMembers.filter((m) => m.team_id === teamId)

  return {
    teamMembers,
    fetchTeamMembers,

    selectedPlayerId,
    setSelectedPlayerId,
    selectedTeamId,
    setSelectedTeamId,
    selectedRole,
    setSelectedRole,

    assignmentLoading,
    assignmentMessage,
    assignmentMessageType,

    currentSelectedPlayerTeam,
    currentSelectedPlayerRole,
    syncSelectedPlayerMeta,

    assignPlayerToTeam,
    removeTeamMember,
    getPlayersInTeam,
  }
}

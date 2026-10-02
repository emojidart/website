"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { Team, TeamMember } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export type TeamAssignmentMode = "additional" | "transfer"

export type TeamAssignmentHistoryEntry = {
  id: string
  team_id: string
  team_name: string
  dart_type: string | null
  role: string | null
  joined_at: string | null
  left_at: string | null
  created_at: string | null
}

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

  const [assignmentHistory, setAssignmentHistory] = useState<TeamAssignmentHistoryEntry[]>([])
  const [assignmentHistoryLoading, setAssignmentHistoryLoading] = useState(false)

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

  const fetchAssignmentHistory = async (playerId = selectedPlayerId) => {
    if (!playerId) {
      setAssignmentHistory([])
      return
    }

    setAssignmentHistoryLoading(true)

    try {
      const { data: membershipRows, error: membershipError } = await supabase
        .from("team_members")
        .select("id, team_id, role, joined_at, left_at, created_at")
        .eq("player_id", playerId)
        .order("joined_at", { ascending: false, nullsFirst: false })

      if (membershipError) throw membershipError

      const teamIds = Array.from(
        new Set((membershipRows || []).map((row: any) => row.team_id).filter(Boolean)),
      )

      let teamMap = new Map<string, { name: string; dart_type: string | null }>()

      if (teamIds.length > 0) {
        const { data: teamRows, error: teamError } = await supabase
          .from("teams")
          .select("id, name, dart_type")
          .in("id", teamIds)

        if (teamError) throw teamError

        teamMap = new Map(
          (teamRows || []).map((team: any) => [
            team.id,
            { name: team.name ?? "Unbekannte Mannschaft", dart_type: team.dart_type ?? null },
          ]),
        )
      }

      setAssignmentHistory(
        (membershipRows || []).map((row: any) => ({
          id: row.id,
          team_id: row.team_id,
          team_name: teamMap.get(row.team_id)?.name ?? "Unbekannte Mannschaft",
          dart_type: teamMap.get(row.team_id)?.dart_type ?? null,
          role: row.role ?? null,
          joined_at: row.joined_at ?? row.created_at ?? null,
          left_at: row.left_at ?? null,
          created_at: row.created_at ?? null,
        })),
      )
    } catch (error) {
      console.error("Fehler beim Laden der Mannschaftshistorie:", error)
      setAssignmentHistory([])
    } finally {
      setAssignmentHistoryLoading(false)
    }
  }

  useEffect(() => {
    void fetchAssignmentHistory(selectedPlayerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId])

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

  const assignPlayerToTeam = async (mode: TeamAssignmentMode = "additional") => {
    setAssignmentLoading(true)
    setAssignmentMessage(mode === "transfer" ? "Mannschaftswechsel wird gespeichert..." : "Zuordnung wird gespeichert...")
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

    const nowIso = new Date().toISOString()

    try {
      const { data: targetTeam, error: targetTeamError } = await supabase
        .from("teams")
        .select("id, name, dart_type")
        .eq("id", selectedTeamId)
        .single()

      if (targetTeamError) throw targetTeamError
      if (!targetTeam?.dart_type) throw new Error("Bei der Ziel-Mannschaft ist keine Dartart hinterlegt.")

      const { data: activeAssignments, error: activeAssignmentsError } = await supabase
        .from("team_members")
        .select("id, team_id, role, joined_at, left_at")
        .eq("player_id", selectedPlayerId)
        .is("left_at", null)

      if (activeAssignmentsError) throw activeAssignmentsError

      const activeTeamIds = Array.from(
        new Set((activeAssignments || []).map((row: any) => row.team_id).filter(Boolean)),
      )

      const teamIdsToLoad = Array.from(new Set([...activeTeamIds, selectedTeamId]))
      const { data: relevantTeams, error: relevantTeamsError } = await supabase
        .from("teams")
        .select("id, name, dart_type")
        .in("id", teamIdsToLoad)

      if (relevantTeamsError) throw relevantTeamsError

      const relevantTeamMap = new Map(
        (relevantTeams || []).map((team: any) => [
          team.id,
          { name: team.name ?? "Unbekannte Mannschaft", dart_type: team.dart_type ?? null },
        ]),
      )

      const sameDartTypeAssignments = (activeAssignments || []).filter((assignment: any) => {
        if (assignment.team_id === selectedTeamId) return false
        return relevantTeamMap.get(assignment.team_id)?.dart_type === targetTeam.dart_type
      })

      if (mode === "additional" && sameDartTypeAssignments.length > 0) {
        const currentTeamNames = sameDartTypeAssignments
          .map((assignment: any) => relevantTeamMap.get(assignment.team_id)?.name)
          .filter(Boolean)
          .join(", ")

        throw new Error(
          `Der Spieler ist in dieser Dartart bereits bei ${currentTeamNames || "einer anderen Mannschaft"} aktiv. Bitte „Mannschaft wechseln“ verwenden.`,
        )
      }

      const { data: existingAssignment, error: checkError } = await supabase
        .from("team_members")
        .select("id, role, left_at, joined_at")
        .eq("player_id", selectedPlayerId)
        .eq("team_id", selectedTeamId)
        .maybeSingle()

      if (checkError) throw checkError

      let targetAction:
        | { kind: "none" }
        | { kind: "insert"; id: string }
        | { kind: "reactivate"; id: string; previousLeftAt: string | null; previousRole: string | null; previousJoinedAt: string | null }
        | { kind: "role"; id: string; previousRole: string | null } = { kind: "none" }

      if (existingAssignment) {
        if (existingAssignment.left_at) {
          const { error: reactivateError } = await supabase
            .from("team_members")
            .update({
              left_at: null,
              role: selectedRole,
              joined_at: nowIso,
            })
            .eq("id", existingAssignment.id)

          if (reactivateError) throw reactivateError

          targetAction = {
            kind: "reactivate",
            id: existingAssignment.id,
            previousLeftAt: existingAssignment.left_at,
            previousRole: existingAssignment.role ?? null,
            previousJoinedAt: existingAssignment.joined_at ?? null,
          }
        } else if (existingAssignment.role !== selectedRole) {
          const { error: updateRoleError } = await supabase
            .from("team_members")
            .update({ role: selectedRole })
            .eq("id", existingAssignment.id)

          if (updateRoleError) throw updateRoleError

          targetAction = {
            kind: "role",
            id: existingAssignment.id,
            previousRole: existingAssignment.role ?? null,
          }
        } else if (mode === "additional") {
          setAssignmentMessage("Dieser Spieler ist bereits in dieser Mannschaft mit dieser Rolle.")
          setAssignmentMessageType("error")
          setAssignmentLoading(false)
          return
        }
      } else {
        const { data: insertedAssignment, error: insertError } = await supabase
          .from("team_members")
          .insert([
            {
              player_id: selectedPlayerId,
              team_id: selectedTeamId,
              role: selectedRole,
            },
          ])
          .select("id")
          .single()

        if (insertError) throw insertError
        if (!insertedAssignment?.id) throw new Error("Die neue Mannschaftszuordnung konnte nicht bestätigt werden.")

        targetAction = { kind: "insert", id: insertedAssignment.id }
      }

      if (mode === "transfer" && sameDartTypeAssignments.length > 0) {
        const sourceIds = sameDartTypeAssignments.map((assignment: any) => assignment.id)

        const { error: closeSourceError } = await supabase
          .from("team_members")
          .update({ left_at: nowIso })
          .in("id", sourceIds)
          .is("left_at", null)

        if (closeSourceError) {
          if (targetAction.kind === "insert") {
            await supabase.from("team_members").delete().eq("id", targetAction.id)
          } else if (targetAction.kind === "reactivate") {
            await supabase
              .from("team_members")
              .update({
                left_at: targetAction.previousLeftAt,
                role: targetAction.previousRole,
                joined_at: targetAction.previousJoinedAt,
              })
              .eq("id", targetAction.id)
          } else if (targetAction.kind === "role") {
            await supabase
              .from("team_members")
              .update({ role: targetAction.previousRole })
              .eq("id", targetAction.id)
          }

          throw closeSourceError
        }

        const movementRows = sameDartTypeAssignments.map((source: any) => ({
          player_id: selectedPlayerId,
          team_id: selectedTeamId,
          from_team_id: source.team_id,
          movement_type: "team_transfer",
          user_id: user.id,
          movement_date: nowIso,
        }))

        const { error: movementError } = await supabase.from("player_movements").insert(movementRows)
        if (movementError) console.error("Fehler beim Protokollieren des Mannschaftswechsels:", movementError)

        const sourceNames = sameDartTypeAssignments
          .map((source: any) => relevantTeamMap.get(source.team_id)?.name)
          .filter(Boolean)
          .join(", ")

        setAssignmentMessage(
          `Mannschaftswechsel gespeichert: ${sourceNames || "bisherige Mannschaft"} → ${targetTeam.name}.`,
        )
        setAssignmentMessageType("success")
      } else {
        const movementType =
          targetAction.kind === "reactivate"
            ? "reactivation"
            : targetAction.kind === "role"
              ? "role_update"
              : targetAction.kind === "none"
                ? "team_addition"
                : "new_addition"

        if (targetAction.kind !== "none") {
          const { error: movementError } = await supabase.from("player_movements").insert([
            {
              player_id: selectedPlayerId,
              team_id: selectedTeamId,
              from_team_id: null,
              movement_type: movementType,
              user_id: user.id,
              movement_date: nowIso,
            },
          ])

          if (movementError) console.error("Fehler beim Protokollieren der Spielerbewegung:", movementError)
        }

        setAssignmentMessage(
          targetAction.kind === "role"
            ? "Spielerrolle erfolgreich aktualisiert."
            : targetAction.kind === "reactivate"
              ? "Mannschaftszuordnung wurde wieder aktiviert."
              : "Spieler erfolgreich zu zusätzlicher Mannschaft hinzugefügt.",
        )
        setAssignmentMessageType("success")
      }

      setSelectedTeamId("")
      setSelectedRole("Player")
      await fetchTeamMembers()
      await fetchAssignmentHistory(selectedPlayerId)
      onDataSaved()
    } catch (error: any) {
      console.error("Fehler bei der Mannschaftszuweisung:", error)

      const rawMessage = String(error?.message || "")
      const normalized = rawMessage.toLowerCase()

      let friendlyMessage = rawMessage || "Die Mannschaftszuweisung konnte nicht gespeichert werden."

      if (normalized.includes("kein aktives steeldart-liga-paket")) {
        friendlyMessage =
          "Der Spieler hat weder ein aktives Steeldart-Liga-Paket noch eine gültige Steeldart-Testfreischaltung."
      } else if (normalized.includes("kein aktives e-dart-liga-paket") || normalized.includes("kein aktives edart-liga-paket")) {
        friendlyMessage =
          "Der Spieler hat weder ein aktives E-Dart-Liga-Paket noch eine gültige E-Dart-Testfreischaltung."
      } else if (
        normalized.includes("liga-paket") ||
        normalized.includes("ligapaket") ||
        normalized.includes("testfreischaltung")
      ) {
        friendlyMessage = rawMessage
      }

      setAssignmentMessage(`Zuweisung nicht möglich: ${friendlyMessage}`)
      setAssignmentMessageType("error")
    } finally {
      setAssignmentLoading(false)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    setAssignmentLoading(true)
    setAssignmentMessage("Mitglied wird aus der Mannschaft entfernt...")
    setAssignmentMessageType("info")

    const nowIso = new Date().toISOString()

    try {
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("id, player_id, team_id")
        .eq("id", memberId)
        .single()

      if (membershipError) throw membershipError

      const { error } = await supabase
        .from("team_members")
        .update({ left_at: nowIso })
        .eq("id", memberId)
        .is("left_at", null)

      if (error) throw error

      if (membership?.player_id && membership?.team_id && user?.id) {
        const { error: movementError } = await supabase.from("player_movements").insert([
          {
            player_id: membership.player_id,
            team_id: membership.team_id,
            from_team_id: membership.team_id,
            movement_type: "team_removed",
            user_id: user.id,
            movement_date: nowIso,
          },
        ])

        if (movementError) console.error("Fehler beim Protokollieren der Entfernung:", movementError)
      }

      setAssignmentMessage("Mannschaftszuordnung wurde beendet und in der Historie gespeichert.")
      setAssignmentMessageType("success")
      await fetchTeamMembers()
      if (membership?.player_id) await fetchAssignmentHistory(membership.player_id)
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

    assignmentHistory,
    assignmentHistoryLoading,
    fetchAssignmentHistory,

    assignPlayerToTeam,
    removeTeamMember,
    getPlayersInTeam,
  }
}
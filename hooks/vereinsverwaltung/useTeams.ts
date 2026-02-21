"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { Team } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export function useTeams(user: User | null, onDataSaved: () => void) {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamMessage, setTeamMessage] = useState("")
  const [teamMessageType, setTeamMessageType] = useState<MessageType>("info")

  const [newTeamName, setNewTeamName] = useState("")
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null)
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)

  const fetchTeams = async () => {
    const { data, error } = await supabase.from("teams").select("*").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching teams:", error)
      setTeamMessage("Fehler beim Laden der Mannschaften.")
      setTeamMessageType("error")
    } else {
      setTeams((data || []) as Team[])
    }
  }

  useEffect(() => {
    fetchTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const beginEditTeam = (team: Team) => {
    setEditingTeamId(team.id)
    setNewTeamName(team.name)
    setTeamLogoPreview(team.logo_url)
    setTeamLogoFile(null)
    setTeamMessage("")
    setTeamMessageType("info")
  }

  const cancelTeamEdit = () => {
    setEditingTeamId(null)
    setNewTeamName("")
    setTeamLogoFile(null)
    setTeamLogoPreview(null)
    setTeamMessage("")
    setTeamMessageType("info")
  }

  const submitTeamForm = async (e: React.FormEvent) => {
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
        if (uploadError) throw uploadError

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
        if (error) throw error
        setTeamMessage("Mannschaft erfolgreich aktualisiert!")
      } else {
        const { error } = await supabase.from("teams").insert([{ name: newTeamName, logo_url: logoUrl, user_id: user.id }])
        if (error) throw error
        setTeamMessage("Mannschaft erfolgreich erstellt!")
      }

      setTeamMessageType("success")
      cancelTeamEdit()
      await fetchTeams()
      onDataSaved()
    } catch (error: any) {
      setTeamMessage(`Fehler: ${error.message}`)
      setTeamMessageType("error")
    } finally {
      setTeamLoading(false)
    }
  }

  const deleteTeam = async (teamId: string, afterDelete?: () => void) => {
    // ✅ confirm entfernt, weil du jetzt dein eigenes Modal im UI hast

    setTeamLoading(true)
    setTeamMessage("Mannschaft wird gelöscht...")
    setTeamMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase.from("team_members").delete().eq("team_id", teamId)
      if (deleteMembersError) throw deleteMembersError

      const { error } = await supabase.from("teams").delete().eq("id", teamId)
      if (error) throw error

      setTeamMessage("Mannschaft erfolgreich gelöscht!")
      setTeamMessageType("success")
      await fetchTeams()
      onDataSaved()
      afterDelete?.()
    } catch (error: any) {
      setTeamMessage(`Fehler beim Löschen der Mannschaft: ${error.message}`)
      setTeamMessageType("error")
    } finally {
      setTeamLoading(false)
    }
  }

  return {
    teams,
    fetchTeams,

    teamLoading,
    teamMessage,
    teamMessageType,

    newTeamName,
    setNewTeamName,
    teamLogoFile,
    teamLogoPreview,
    editingTeamId,

    handleTeamLogoChange,
    beginEditTeam,
    cancelTeamEdit,
    submitTeamForm,
    deleteTeam,
    setTeamLogoPreview, // für "Logo entfernen" Button
    setTeamLogoFile,
  }
}
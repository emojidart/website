"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { DartType, Team } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export function useTeams(user: User | null, onDataSaved: () => void) {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamMessage, setTeamMessage] = useState("")
  const [teamMessageType, setTeamMessageType] = useState<MessageType>("info")

  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDartType, setNewTeamDartType] = useState<DartType | "">("")
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
    setNewTeamDartType(team.dart_type)
    setTeamLogoPreview(team.logo_url)
    setTeamLogoFile(null)
    setTeamMessage("")
    setTeamMessageType("info")
  }

  const cancelTeamEdit = () => {
    setEditingTeamId(null)
    setNewTeamName("")
    setNewTeamDartType("")
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

    if (!newTeamDartType) {
      setTeamMessage("Bitte E-Dart oder Steeldart auswählen.")
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
        // ✅ EDIT TEAM (wie vorher)
        const { error } = await supabase
          .from("teams")
          .update({
            name: newTeamName,
            logo_url: logoUrl,
            dart_type: newTeamDartType,
            user_id: user.id,
          })
          .eq("id", editingTeamId)
        if (error) throw error

        // ✅ OPTIONAL: Chat-Raum-Titel mit umbenennen (wenn chat_room_id existiert)
        const { data: tRow, error: tErr } = await supabase
          .from("teams")
          .select("chat_room_id")
          .eq("id", editingTeamId)
          .single()

        if (!tErr) {
          const roomId = (tRow as any)?.chat_room_id as string | null
          if (roomId) {
            await supabase.from("chat_rooms").update({ title: newTeamName }).eq("id", roomId) // ✅ title, NICHT name
          }
        }

        setTeamMessage("Mannschaft erfolgreich aktualisiert!")
     } else {
  // ✅ NUR Team erstellen – Chatraum macht der TRIGGER automatisch
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .insert([{ name: newTeamName, logo_url: logoUrl, user_id: user.id }])
    .select("id, chat_room_id")
    .single()

  if (teamErr) throw teamErr
  if (!teamRow?.id) throw new Error("Team konnte nicht erstellt werden (keine ID).")

  // ✅ Trigger braucht manchmal einen kurzen Moment → chat_room_id nachladen falls noch null
  let chatRoomId = (teamRow as any).chat_room_id as string | null

  if (!chatRoomId) {
    const { data: t2, error: t2Err } = await supabase
      .from("teams")
      .select("chat_room_id")
      .eq("id", teamRow.id)
      .single()

    if (t2Err) throw t2Err
    chatRoomId = (t2 as any)?.chat_room_id ?? null
  }

  setTeamMessage("Mannschaft erfolgreich erstellt! (Chatraum per Trigger)")
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
    setTeamLoading(true)
    setTeamMessage("Mannschaft wird gelöscht...")
    setTeamMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase.from("team_members").delete().eq("team_id", teamId)
      if (deleteMembersError) throw deleteMembersError

      // ✅ OPTIONAL: Chatraum auch löschen (wenn du willst)
      // Wenn du KEINEN Chatraum löschen willst -> lass den Block weg.
      const { data: tRow } = await supabase.from("teams").select("chat_room_id").eq("id", teamId).single()
      const roomId = (tRow as any)?.chat_room_id as string | null
      if (roomId) {
        await supabase.from("chat_rooms").delete().eq("id", roomId)
      }

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
    newTeamDartType,
    setNewTeamDartType,
    teamLogoFile,
    teamLogoPreview,
    editingTeamId,

    handleTeamLogoChange,
    beginEditTeam,
    cancelTeamEdit,
    submitTeamForm,
    deleteTeam,
    setTeamLogoPreview,
    setTeamLogoFile,
  }
}
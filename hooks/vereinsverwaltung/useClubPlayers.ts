"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export function useClubPlayers(user: User | null, onDataSaved: () => void) {
  const [playerName, setPlayerName] = useState("")
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null)
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState<string | null>(null)
  const [playerStreet, setPlayerStreet] = useState("")
  const [playerHouseNumber, setPlayerHouseNumber] = useState("")
  const [playerPostalCode, setPlayerPostalCode] = useState("")
  const [playerCity, setPlayerCity] = useState("")
  const [playerBirthdate, setPlayerBirthdate] = useState("")
  const [playerNumber, setPlayerNumber] = useState<number | string>("")
  const [playerJerseySize, setPlayerJerseySize] = useState("")
  const [playerEmail, setPlayerEmail] = useState("")
  const [playerPhone, setPlayerPhone] = useState("")
  const [playerIban, setPlayerIban] = useState("")
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerMessage, setPlayerMessage] = useState("")
  const [playerMessageType, setPlayerMessageType] = useState<MessageType>("info")

  const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([])
  const [playerSearch, setPlayerSearch] = useState("")
  const [playerSortKey, setPlayerSortKey] = useState<"name" | "number" | "birthdate" | "city">("name")
  const [playerSortDir, setPlayerSortDir] = useState<"asc" | "desc">("asc")

  const visiblePlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()
    const filtered = q
      ? clubPlayers.filter((p) => {
          const hay = [
            p.name,
            p.email ?? "",
            p.phone ?? "",
            p.city ?? "",
            p.street ?? "",
            String(p.player_number ?? ""),
          ]
            .join(" ")
            .toLowerCase()
          return hay.includes(q)
        })
      : clubPlayers

    const dir = playerSortDir === "asc" ? 1 : -1
    const getVal = (p: ClubPlayer) => {
      switch (playerSortKey) {
        case "number":
          return p.player_number ?? 999999
        case "birthdate":
          return p.birthdate ?? ""
        case "city":
          return (p.city ?? "").toLowerCase()
        case "name":
        default:
          return (p.name ?? "").toLowerCase()
      }
    }

    return [...filtered].sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [clubPlayers, playerSearch, playerSortKey, playerSortDir])

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

  const fetchClubPlayers = async () => {
    const { data, error } = await supabase.from("club_players").select("*").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching club players:", error)
      setPlayerMessage("Fehler beim Laden der Spieler.")
      setPlayerMessageType("error")
    } else {
      setClubPlayers((data || []) as ClubPlayer[])
    }
  }

  useEffect(() => {
    fetchClubPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const beginEditPlayer = (player: ClubPlayer) => {
    setEditingPlayerId(player.id)
    setPlayerName(player.name)
    setPlayerPhotoPreview(player.photo_url)
    setPlayerPhotoFile(null)
    setPlayerStreet(player.street || "")
    setPlayerHouseNumber(player.house_number || "")
    setPlayerPostalCode(player.postal_code || "")
    setPlayerCity(player.city || "")
    setPlayerJerseySize(player.jersey_size || "")
    setPlayerEmail(player.email || "")
    setPlayerPhone(player.phone || "")
    setPlayerIban(player.iban || "")
    setPlayerBirthdate(player.birthdate || "")
    setPlayerNumber(player.player_number ?? "")
    setPlayerMessage("")
    setPlayerMessageType("info")
  }

  const cancelPlayerEdit = () => {
    setEditingPlayerId(null)
    setPlayerName("")
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    setPlayerStreet("")
    setPlayerHouseNumber("")
    setPlayerPostalCode("")
    setPlayerCity("")
    setPlayerBirthdate("")
    setPlayerNumber("")
    setPlayerJerseySize("")
    setPlayerEmail("")
    setPlayerPhone("")
    setPlayerIban("")
    setPlayerMessage("")
    setPlayerMessageType("info")
  }

  const submitPlayerForm = async (e: React.FormEvent) => {
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
        if (uploadError) throw uploadError

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
            street: playerStreet || null,
            house_number: playerHouseNumber || null,
            postal_code: playerPostalCode || null,
            city: playerCity || null,
            birthdate: playerBirthdate || null,
            player_number: playerNumber ? Number(playerNumber) : null,
            jersey_size: playerJerseySize || null,
            email: playerEmail || null,
            phone: playerPhone || null,
            iban: playerIban || null,
            user_id: user.id,
          })
          .eq("id", editingPlayerId)

        if (error) throw error
        setPlayerMessage("Spieler erfolgreich aktualisiert!")
      } else {
        const { error } = await supabase.from("club_players").insert([
          {
            name: playerName,
            photo_url: photoUrl,
            street: playerStreet || null,
            house_number: playerHouseNumber || null,
            postal_code: playerPostalCode || null,
            city: playerCity || null,
            birthdate: playerBirthdate || null,
            player_number: playerNumber ? Number(playerNumber) : null,
            jersey_size: playerJerseySize || null,
            email: playerEmail || null,
            phone: playerPhone || null,
            iban: playerIban || null,
            user_id: user.id,
          },
        ])

        if (error) throw error
        setPlayerMessage("Spieler erfolgreich hinzugefügt!")
      }

      setPlayerMessageType("success")
      cancelPlayerEdit()
      await fetchClubPlayers()
      onDataSaved()
    } catch (error: any) {
      setPlayerMessage(`Fehler: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  const deletePlayer = async (playerId: string, photoUrl: string | null, afterDelete?: () => void) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Spieler löschen möchten?")) return

    setPlayerLoading(true)
    setPlayerMessage("Spieler wird gelöscht...")
    setPlayerMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase.from("team_members").delete().eq("player_id", playerId)
      if (deleteMembersError) throw deleteMembersError

      const { error } = await supabase.from("club_players").delete().eq("id", playerId)
      if (error) throw error

      if (photoUrl) {
        const fileName = photoUrl.split("/").pop()
        if (fileName) {
          await supabase.storage.from("player-avatars").remove([`club-player-avatars/${fileName}`])
        }
      }

      setPlayerMessage("Spieler erfolgreich gelöscht!")
      setPlayerMessageType("success")
      await fetchClubPlayers()
      onDataSaved()
      afterDelete?.()
    } catch (error: any) {
      setPlayerMessage(`Fehler beim Löschen des Spielers: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  // ✅ NEU: Eintritt / Austritt speichern (nur Spalten-Update, keine Beziehungen)
  const updateMembershipDates = async (playerId: string, joinedAt: string | null, leftAt: string | null) => {
    setPlayerLoading(true)
    setPlayerMessage("Mitgliedschaft wird gespeichert...")
    setPlayerMessageType("info")

    if (!user) {
      setPlayerMessage("Fehler: Nicht authentifiziert.")
      setPlayerMessageType("error")
      setPlayerLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from("club_players")
        .update({
          club_joined_at: joinedAt || null,
          club_left_at: leftAt || null,
          user_id: user.id,
        })
        .eq("id", playerId)

      if (error) throw error

      setPlayerMessage("Mitgliedschaft gespeichert!")
      setPlayerMessageType("success")
      await fetchClubPlayers()
      onDataSaved()
    } catch (error: any) {
      setPlayerMessage(`Fehler: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  return {
    clubPlayers,
    visiblePlayers,
    fetchClubPlayers,

    playerSearch,
    setPlayerSearch,
    playerSortKey,
    setPlayerSortKey,
    playerSortDir,
    setPlayerSortDir,

    playerLoading,
    playerMessage,
    playerMessageType,

    editingPlayerId,

    playerName,
    setPlayerName,
    playerPhotoFile,
    setPlayerPhotoFile,
    playerPhotoPreview,
    setPlayerPhotoPreview,
    playerStreet,
    setPlayerStreet,
    playerHouseNumber,
    setPlayerHouseNumber,
    playerPostalCode,
    setPlayerPostalCode,
    playerCity,
    setPlayerCity,
    playerBirthdate,
    setPlayerBirthdate,
    playerNumber,
    setPlayerNumber,
    playerJerseySize,
    setPlayerJerseySize,
    playerEmail,
    setPlayerEmail,
    playerPhone,
    setPlayerPhone,
    playerIban,
    setPlayerIban,

    handlePlayerPhotoChange,
    beginEditPlayer,
    cancelPlayerEdit,
    submitPlayerForm,
    deletePlayer,

    // ✅ neu
    updateMembershipDates,
  }
}

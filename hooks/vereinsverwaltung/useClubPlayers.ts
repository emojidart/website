"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

/**
 * DB-Row mit Join (club_players -> spieldatenbank.player_code)
 * Wichtig: FK club_players.spieldatenbank_id -> spieldatenbank.id muss existieren.
 */
type ClubPlayerRow = Omit<ClubPlayer, "player_code"> & {
  spieldatenbank?: { player_code: string | null } | null
}

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

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

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
            String((p as any).player_code ?? ""),
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

      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir
      }

      return String(av).localeCompare(String(bv)) * dir
    })
  }, [clubPlayers, playerSearch, playerSortKey, playerSortDir])

  const fetchClubPlayers = async () => {
    const { data, error } = await supabase
      .from("club_players")
      .select(`
        *,
        spieldatenbank:spieldatenbank_id (
          player_code
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching club players:", error)
      setPlayerMessage("Fehler beim Laden der Spieler.")
      setPlayerMessageType("error")
      return
    }

    const rows = (data || []) as ClubPlayerRow[]

    const mapped: ClubPlayer[] = rows.map((r) => {
      const { spieldatenbank, ...rest } = r
      return {
        ...(rest as ClubPlayer),
        player_code: spieldatenbank?.player_code ?? null,
      } as ClubPlayer
    })

    setClubPlayers(mapped)
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
        const { error: uploadError } = await supabase.storage
          .from("player-avatars")
          .upload(filePath, playerPhotoFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from("player-avatars")
          .getPublicUrl(filePath)

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

  const deactivatePlayer = async (playerId: string, afterDone?: () => void) => {
    setPlayerLoading(true)
    setPlayerMessage("Spieler wird deaktiviert...")
    setPlayerMessageType("info")

    try {
      const today = new Date().toISOString().slice(0, 10)
      const nowIso = new Date().toISOString()

      const { data: linkedProfile, error: profileErr } = await supabase
        .from("user_profiles")
        .select("id, user_id")
        .eq("player_id", playerId)
        .maybeSingle()

      if (profileErr) throw profileErr

      const { error: deleteMembersError } = await supabase
        .from("team_members")
        .delete()
        .eq("player_id", playerId)

      if (deleteMembersError) throw deleteMembersError

      const { error: playerError } = await supabase
        .from("club_players")
        .update({
          club_left_at: today,
          is_active: false,
        })
        .eq("id", playerId)

      if (playerError) throw playerError

      if (linkedProfile?.id) {
        const { error: blockErr } = await supabase
          .from("user_profiles")
          .update({
            is_blocked: true,
            blocked_at: nowIso,
            blocked_reason: "Mitglied deaktiviert / ausgetreten",
          })
          .eq("id", linkedProfile.id)

        if (blockErr) throw blockErr
      }

      setPlayerMessage("Spieler erfolgreich deaktiviert und Zugang gesperrt.")
      setPlayerMessageType("success")
      await fetchClubPlayers()
      onDataSaved()
      afterDone?.()
    } catch (error: any) {
      setPlayerMessage(`Fehler beim Deaktivieren: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  const reactivatePlayer = async (playerId: string, afterDone?: () => void) => {
    setPlayerLoading(true)
    setPlayerMessage("Spieler wird reaktiviert...")
    setPlayerMessageType("info")

    try {
      const { data: linkedProfile, error: profileErr } = await supabase
        .from("user_profiles")
        .select("id, user_id")
        .eq("player_id", playerId)
        .maybeSingle()

      if (profileErr) throw profileErr

      const { error: playerError } = await supabase
        .from("club_players")
        .update({
          club_left_at: null,
          is_active: true,
        })
        .eq("id", playerId)

      if (playerError) throw playerError

      if (linkedProfile?.id) {
        const { error: unblockErr } = await supabase
          .from("user_profiles")
          .update({
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
          })
          .eq("id", linkedProfile.id)

        if (unblockErr) throw unblockErr
      }

      setPlayerMessage("Spieler erfolgreich reaktiviert.")
      setPlayerMessageType("success")
      await fetchClubPlayers()
      onDataSaved()
      afterDone?.()
    } catch (error: any) {
      setPlayerMessage(`Fehler beim Reaktivieren: ${error.message}`)
      setPlayerMessageType("error")
    } finally {
      setPlayerLoading(false)
    }
  }

  const deletePlayer = async (playerId: string, photoUrl: string | null, afterDelete?: () => void) => {
    setPlayerLoading(true)
    setPlayerMessage("Spieler wird gelöscht...")
    setPlayerMessageType("info")

    try {
      const { error: deleteMembersError } = await supabase
        .from("team_members")
        .delete()
        .eq("player_id", playerId)

      if (deleteMembersError) throw deleteMembersError

      const { error } = await supabase
        .from("club_players")
        .delete()
        .eq("id", playerId)

      if (error) throw error

      if (photoUrl) {
        const fileName = photoUrl.split("/").pop()
        if (fileName) {
          await supabase.storage
            .from("player-avatars")
            .remove([`club-player-avatars/${fileName}`])
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
    deactivatePlayer,
    reactivatePlayer,

    updateMembershipDates,
  }
}
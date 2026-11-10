"use client"

import { InlineLoader, LoadingIndicator } from "@/components/loading/loading"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Users, Edit, Trash2, Search, Trophy, Target, Camera, Save, X, AlertCircle, CheckCircle } from 'lucide-react'
import Image from "next/image"
import type { User } from "@supabase/supabase-js"

interface Player {
  player_id: string
  player_name: string
  total_points: number
  bonus_points: number
  tournaments_played: number
  profile_picture_url?: string
}

interface PlayerManagementProps {
  isVisible: boolean
  user: User | null
  onDataSaved: () => void
}

export function PlayerManagement({ isVisible, user, onDataSaved }: PlayerManagementProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    points: 0,
    bonusPoints: 0,
    participations: 0
  })
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")

  // Alle Spieler laden
  const fetchAllPlayers = async () => {
    setLoading(true)
    try {
      // 1. Hole alle Spieler mit Punkten aus dem aggregierten View
      const { data: aggregatedData, error: aggError } = await supabase
        .from("tournament_series_aggregated")
        .select("player_name, total_points, bonus_points, tournaments_played")
        .order("total_points", { ascending: false })

      if (aggError) throw aggError

      // 2. Hole alle Spieler mit ihren IDs aus der spieldatenbank Tabelle
      const { data: playersData, error: playersError } = await supabase
        .from("spieldatenbank")
        .select("id, name, profile_picture_url")

      if (playersError) throw playersError

      // 3. Kombiniere die Daten
      const combinedPlayers: Player[] = (aggregatedData || []).map(aggPlayer => {
        // Finde die player_id und profile_picture_url anhand des Namens
        const playerRecord = playersData?.find(p =>
          p.name?.trim().toLowerCase() === aggPlayer.player_name?.trim().toLowerCase()
        )

        return {
          player_id: playerRecord?.id || "",
          player_name: aggPlayer.player_name,
          total_points: aggPlayer.total_points || 0,
          bonus_points: aggPlayer.bonus_points || 0,
          tournaments_played: aggPlayer.tournaments_played || 0,
          profile_picture_url: playerRecord?.profile_picture_url || undefined
        }
      })

      setPlayers(combinedPlayers)
      setFilteredPlayers(combinedPlayers)
    } catch (error: any) {
      setMessage(`Fehler beim Laden der Spieler: ${error.message}`)
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // Spieler filtern
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPlayers(players)
    } else {
      const filtered = players.filter(player =>
        player.player_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPlayers(filtered)
    }
  }, [searchTerm, players])

  // Komponente laden
  useEffect(() => {
    if (isVisible && user) {
      fetchAllPlayers()
    }
  }, [isVisible, user])

  // Edit Dialog öffnen
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    setEditForm({
      name: player.player_name,
      points: player.total_points,
      bonusPoints: player.bonus_points,
      participations: player.tournaments_played
    })
    setProfilePictureFile(null)
    setProfilePicturePreview(player.profile_picture_url || null)
  }

  // Datei Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePictureFile(file)
      setProfilePicturePreview(URL.createObjectURL(file))
    } else {
      setProfilePictureFile(null)
      setProfilePicturePreview(editingPlayer?.profile_picture_url || null)
    }
  }

  // Spieler aktualisieren
  const handleUpdatePlayer = async () => {
    if (!editingPlayer || !user || !editingPlayer.player_id) return

    setUploadingImage(true)
    setMessage("Spieler wird aktualisiert...")
    setMessageType("info")

    try {
      let profilePictureUrl = editingPlayer.profile_picture_url

      // Neues Bild hochladen falls vorhanden
      if (profilePictureFile) {
        const fileExtension = profilePictureFile.name.split(".").pop()
        const filePath = `player-avatars/${editForm.name.replace(/\s/g, "_")}-${Date.now()}.${fileExtension}`

        const { error: uploadError } = await supabase.storage
          .from("player-avatars")
          .upload(filePath, profilePictureFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from("player-avatars")
          .getPublicUrl(filePath)
        profilePictureUrl = publicUrlData.publicUrl
      }

      // Spieler in der spieldatenbank Tabelle aktualisieren
      const { error: updateError } = await supabase
        .from("spieldatenbank")
        .update({
          name: editForm.name,
          profile_picture_url: profilePictureUrl
        })
        .eq("id", editingPlayer.player_id)

      if (updateError) throw updateError

      setMessage("Spieler erfolgreich aktualisiert!")
      setMessageType("success")
      setEditingPlayer(null)
      fetchAllPlayers()
      onDataSaved()
    } catch (error: any) {
      setMessage(`Fehler beim Aktualisieren: ${error.message}`)
      setMessageType("error")
    } finally {
      setUploadingImage(false)
    }
  }

  // Spieler löschen
  const handleDeletePlayer = async (player: Player) => {
    if (!user || !player.player_id) return

    setMessage("Spieler wird gelöscht...")
    setMessageType("info")

    try {
      const { error: deleteError } = await supabase
        .from("spieldatenbank")
        .delete()
        .eq("id", player.player_id)

      if (deleteError) throw deleteError

      // Profilbild löschen falls vorhanden
      if (player.profile_picture_url) {
        const fileName = player.profile_picture_url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from("player-avatars")
            .remove([fileName])
        }
      }

      setMessage("Spieler erfolgreich gelöscht!")
      setMessageType("success")
      fetchAllPlayers()
      onDataSaved()
    } catch (error: any) {
      setMessage(`Fehler beim Löschen: ${error.message}`)
      setMessageType("error")
    }
  }

  if (!isVisible) return null

  return (
    <div className="w-full max-w-none">
      <Card className="border-0 shadow-xl bg-card ">
        <CardHeader className="border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-foreground p-2 bg-card   rounded-lg shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">Spielerverwaltung</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Alle Spieler anzeigen, bearbeiten und löschen
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredPlayers.length} Spieler
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Suchfeld */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Spieler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-border focus:border-purple-500 focus:ring-purple-500 bg-muted/50"
              />
            </div>
          </div>

          {/* Status Nachricht */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                messageType === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : messageType === "success"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <div className="flex items-center space-x-2">
                {messageType === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : messageType === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <LoadingIndicator className="w-4 h-4" />
                )}
                <span>{message}</span>
              </div>
            </div>
          )}

          {/* Spielerliste */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                
                <InlineLoader label="Spieler werden geladen..." />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Keine Spieler gefunden" : "Noch keine Spieler vorhanden"}
                  </p>
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div
                    key={player.player_id || player.player_name}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Profilbild */}
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden border border-border">
                          <Image
                            src={player.profile_picture_url || "/placeholder.svg?height=48&width=48&query=player"}
                            alt={`${player.player_name} Profilbild`}
                            fill
                            style={{ objectFit: "cover" }}
                            className="rounded-full"
                          />
                        </div>

                        {/* Spielerinfo */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-foreground">{player.player_name}</h3>
                            <Badge variant="default" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Lion Cup
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Punkte: <strong>{player.total_points}</strong></span>
                            <span>Bonus: <strong>{player.bonus_points}</strong></span>
                            <span>Antritte: <strong>{player.tournaments_played}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Aktionen */}
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlayer(player)}
                              className="border-border hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Spieler bearbeiten</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Name */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="h-10"
                                />
                              </div>

                              {/* Profilbild */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Profilbild</label>
                                <div className="flex items-center space-x-3">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="flex-1 h-10 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-muted"
                                  />
                                  {profilePicturePreview && (
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border">
                                      <Image
                                        src={profilePicturePreview || "/placeholder.svg"}
                                        alt="Vorschau"
                                        fill
                                        style={{ objectFit: "cover" }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Statistiken (read-only) */}
                              <div className="space-y-3">
                                <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <strong>Hinweis:</strong> Punkte, Bonus und Antritte werden aus Turnierdaten berechnet und können nicht direkt bearbeitet werden.
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Punkte</label>
                                    <Input
                                      type="number"
                                      value={editForm.points}
                                      readOnly
                                      disabled
                                      className="h-10 bg-muted"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Bonus</label>
                                    <Input
                                      type="number"
                                      value={editForm.bonusPoints}
                                      readOnly
                                      disabled
                                      className="h-10 bg-muted"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Antritte</label>
                                    <Input
                                      type="number"
                                      value={editForm.participations}
                                      readOnly
                                      disabled
                                      className="h-10 bg-muted"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Buttons */}
                              <div className="flex justify-end space-x-2 pt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingPlayer(null)}
                                  disabled={uploadingImage}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Abbrechen
                                </Button>
                                <Button
                                  onClick={handleUpdatePlayer}
                                  disabled={uploadingImage}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                 loading={Boolean(uploadingImage)} loadingLabel="Speichern...">{(
                                    <>
                                      <Save className="h-4 w-4 mr-2" />
                                      Speichern
                                    </>
                                  )}</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Spieler löschen</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sind Sie sicher, dass Sie <strong>{player.player_name}</strong> löschen möchten?
                                Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePlayer(player)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

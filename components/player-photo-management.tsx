"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type React from "react"

import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Upload, Trash2, User, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import { useDartData } from "@/hooks/use-dart-data"
import { DeletePhotoConfirmationModal } from "@/components/delete-photo-confirmation-modal"

interface PlayerPhotoManagementProps {
  user: any // Supabase User object
  onDataSaved: () => void // Callback to refresh data in parent
}

interface PlayerWithPhoto {
  name: string
  edart_profile_picture_url?: string | null
  steel_profile_picture_url?: string | null
  // We'll use a single effective URL for display, but track original URLs for deletion
  current_profile_picture_url?: string | null
}

export function PlayerPhotoManagement({ user, onDataSaved }: PlayerPhotoManagementProps) {
  const { recalculatePlayerStats } = useDartData()
  const [players, setPlayers] = useState<PlayerWithPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPlayerName, setUploadingPlayerName] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadMessageType, setUploadMessageType] = useState<"success" | "error" | "info">("info")
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false)
  const [playerToDeletePhotoFor, setPlayerToDeletePhotoFor] = useState<string | null>(null)
  const [urlToDelete, setUrlToDelete] = useState<string | null>(null)

  // Refs for file inputs
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const fetchPlayersWithPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: edartPlayers, error: edartError } = await supabase
        .from("edart_players")
        .select("name, profile_picture_url")
      if (edartError) throw edartError

      const { data: steelDartPlayers, error: steelDartError } = await supabase
        .from("steel_dart_players")
        .select("name, profile_picture_url")
      if (steelDartError) throw steelDartError

      const combinedPlayersMap = new Map<string, PlayerWithPhoto>()

      // Combine players, prioritizing steel dart URL if both exist, or just taking what's available
      edartPlayers.forEach((p) => {
        combinedPlayersMap.set(p.name, {
          name: p.name,
          edart_profile_picture_url: p.profile_picture_url,
          steel_profile_picture_url: null, // Initialize, will be updated if found in steel
          current_profile_picture_url: p.profile_picture_url, // Default to edart
        })
      })

      steelDartPlayers.forEach((p) => {
        const existing = combinedPlayersMap.get(p.name)
        if (existing) {
          existing.steel_profile_picture_url = p.profile_picture_url
          // If steel dart has a URL, use it. Otherwise, keep the edart one if it exists.
          existing.current_profile_picture_url = p.profile_picture_url || existing.edart_profile_picture_url
        } else {
          combinedPlayersMap.set(p.name, {
            name: p.name,
            edart_profile_picture_url: null,
            steel_profile_picture_url: p.profile_picture_url,
            current_profile_picture_url: p.profile_picture_url,
          })
        }
      })

      // Sort players alphabetically
      const sortedPlayers = Array.from(combinedPlayersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setPlayers(sortedPlayers)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlayersWithPhotos()
  }, [fetchPlayersWithPhotos])

  const handleFileChange = async (playerName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!user) {
      setUploadMessage("Fehler: Nicht authentifiziert.")
      setUploadMessageType("error")
      return
    }

    setUploadingPlayerName(playerName)
    setUploadMessage(`Lade Bild für ${playerName} hoch...`)
    setUploadMessageType("info")

    const fileExtension = file.name.split(".").pop()
    const filePath = `player-avatars/${playerName.replace(/\s/g, "_")}-${Date.now()}.${fileExtension}`

    try {
      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)
      const newProfilePictureUrl = publicUrlData.publicUrl

      const playerToUpdate = players.find((p) => p.name === playerName)
      if (playerToUpdate) {
        // Update both tables if player exists in them
        if (playerToUpdate.edart_profile_picture_url !== undefined) {
          await recalculatePlayerStats(playerName, "edart", newProfilePictureUrl)
        }
        if (playerToUpdate.steel_profile_picture_url !== undefined) {
          await recalculatePlayerStats(playerName, "steeldart", newProfilePictureUrl)
        }
      }

      setUploadMessage(`Bild für ${playerName} erfolgreich hochgeladen!`)
      setUploadMessageType("success")
      fetchPlayersWithPhotos() // Refresh data
      onDataSaved() // Notify parent to refresh tables
    } catch (err: any) {
      setUploadMessage(`Fehler beim Hochladen für ${playerName}: ${err.message}`)
      setUploadMessageType("error")
    } finally {
      setUploadingPlayerName(null)
      // Clear the file input value to allow re-uploading the same file
      if (fileInputRefs.current[playerName]) {
        fileInputRefs.current[playerName]!.value = ""
      }
      setTimeout(() => setUploadMessage(null), 3000) // Clear message after 3 seconds
    }
  }

  const handleDeletePhoto = async (playerName: string, currentUrl: string | null | undefined) => {
    setPlayerToDeletePhotoFor(playerName)
    setUrlToDelete(currentUrl || null)
    setIsDeleteConfirmModalOpen(true)
  }

  const executeDeletePhoto = async () => {
    if (!playerToDeletePhotoFor || !urlToDelete) return // Should not happen if modal is opened correctly

    setIsDeleteConfirmModalOpen(false) // Close modal immediately
    setUploadingPlayerName(playerToDeletePhotoFor)
    setUploadMessage(`Lösche Bild für ${playerToDeletePhotoFor}...`)
    setUploadMessageType("info")

    try {
      const playerToUpdate = players.find((p) => p.name === playerToDeletePhotoFor)
      if (!playerToUpdate) throw new Error("Spieler nicht gefunden.")

      // Update profile_picture_url to null in both tables
      if (playerToUpdate.edart_profile_picture_url !== undefined) {
        await recalculatePlayerStats(playerToDeletePhotoFor, "edart", null)
      }
      if (playerToUpdate.steel_profile_picture_url !== undefined) {
        await recalculatePlayerStats(playerToDeletePhotoFor, "steeldart", null)
      }

      // Delete file from storage if a URL exists
      if (urlToDelete) {
        // Extract path from the public URL
        const url = new URL(urlToDelete)
        // The path in storage is everything after /storage/v1/object/public/bucket_name/
        const pathInStorage = url.pathname.split("/public/player-avatars/")[1]

        if (pathInStorage) {
          const { error: deleteError } = await supabase.storage.from("player-avatars").remove([pathInStorage])
          if (deleteError) {
            console.warn(`Fehler beim Löschen der Datei ${pathInStorage} aus Storage:`, deleteError.message)
            // Don't throw, continue with success message if DB update was successful
          }
        } else {
          console.warn(`Konnte Pfad aus URL nicht extrahieren: ${urlToDelete}`)
        }
      }

      setUploadMessage(`Bild für ${playerToDeletePhotoFor} erfolgreich gelöscht!`)
      setUploadMessageType("success")
      fetchPlayersWithPhotos() // Refresh data
      onDataSaved() // Notify parent to refresh tables
    } catch (err: any) {
      setUploadMessage(`Fehler beim Löschen für ${playerToDeletePhotoFor}: ${err.message}`)
      setUploadMessageType("error")
    } finally {
      setUploadingPlayerName(null)
      setPlayerToDeletePhotoFor(null) // Clear player name
      setUrlToDelete(null) // Clear URL
      setTimeout(() => setUploadMessage(null), 3000)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 text-lg font-semibold mb-2">Nicht authentifiziert</div>
          <p className="text-red-700">Bitte melden Sie sich an, um Spielerfotos zu verwalten.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Lade Spielerdaten...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 text-lg font-semibold mb-2">Fehler beim Laden</div>
          <p className="text-red-700">{error}</p>
          <Button onClick={fetchPlayersWithPhotos} className="mt-4 bg-transparent" variant="outline">
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielerfoto-Verwaltung</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Profilbilder der Spieler hochladen und bearbeiten</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {uploadMessage && (
            <div
              className={`p-4 rounded-lg text-sm font-medium mb-4 transition-all duration-200 ${
                uploadMessageType === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : uploadMessageType === "success"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-gray-50 text-gray-700 border border-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                {uploadMessageType === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : uploadMessageType === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>{uploadMessage}</span>
              </div>
            </div>
          )}

          {players.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Spieler gefunden</h3>
              <p className="text-gray-600">Fügen Sie Spieler über das "Spielerdaten"-Tab hinzu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players.map((player) => (
                <div
                  key={player.name}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-4 shadow-sm"
                >
                  <div className="flex-shrink-0 h-16 w-16 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
                    {player.current_profile_picture_url ? (
                      <Image
                        src={player.current_profile_picture_url || "/placeholder.svg"}
                        alt={`Profilbild von ${player.name}`}
                        width={64}
                        height={64}
                        style={{ objectFit: "cover" }}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">{player.name}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        id={`file-upload-${player.name}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(player.name, e)}
                        ref={(el) => (fileInputRefs.current[player.name] = el)}
                        disabled={uploadingPlayerName === player.name}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                        onClick={() => fileInputRefs.current[player.name]?.click()}
                        disabled={uploadingPlayerName === player.name}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {player.current_profile_picture_url ? "Bild ändern" : "Bild hochladen"}
                      </Button>
                      {player.current_profile_picture_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-transparent"
                          onClick={() => handleDeletePhoto(player.name, player.current_profile_picture_url)}
                          disabled={uploadingPlayerName === player.name}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <DeletePhotoConfirmationModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => setIsDeleteConfirmModalOpen(false)}
        onConfirm={executeDeletePhoto}
        playerName={playerToDeletePhotoFor}
      />
    </div>
  )
}

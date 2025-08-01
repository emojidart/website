"use client"

import type React from "react"
import { CheckCircle } from "lucide-react"
import Image from "next/image" // Import Image component

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { Database, Target, Users, Save, UserCheck, XCircle, AlertCircle } from "lucide-react" // Added Upload icon
import { useDartData } from "@/hooks/use-dart-data"

interface AdminPanelProps {
  isVisible: boolean
  user: User | null
  onDataSaved: () => void
  onOpenPlayerList: () => void
  selectedPlayerName: string | null
  onPlayerNameChange: (name: string) => void
  isPlayerSelectedViaModal: boolean
}

export function AdminPanel({
  isVisible,
  user,
  onDataSaved,
  onOpenPlayerList,
  selectedPlayerName,
  onPlayerNameChange,
  isPlayerSelectedViaModal,
}: AdminPanelProps) {
  const { recalculatePlayerStats } = useDartData()
  const [dartType, setDartType] = useState("edart_players")
  const [points, setPoints] = useState<number | string>("")
  const [legs, setLegs] = useState<number | string>("")
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)

  // New states for profile picture upload
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleClearPlayer = () => {
    onPlayerNameChange("")
    setFormMessage("")
    setFormMessageType("info")
    setProfilePictureFile(null) // Clear file
    setProfilePicturePreview(null) // Clear preview
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePictureFile(file)
      setProfilePicturePreview(URL.createObjectURL(file))
    } else {
      setProfilePictureFile(null)
      setProfilePicturePreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Verarbeitung läuft...")
    setFormMessageType("info")
    setUploadingImage(false) // Reset image upload status

    // Fügen Sie diese Zeile am Anfang der `handleSubmit`-Funktion hinzu, um den anfänglichen Beitrag festzulegen.
    let potContribution = 4.0

    if (!user) {
      setFormMessage("Fehler: Nicht authentifiziert.")
      setFormMessageType("error")
      setLoading(false)
      return
    }
    if (!selectedPlayerName || points === "" || legs === "" || gameDate === "") {
      setFormMessage("Bitte alle Felder ausfüllen.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    const numericPoints = Number(points)
    const numericLegs = Number(legs)

    if (isNaN(numericPoints) || isNaN(numericLegs) || numericPoints < 0 || numericLegs < 0) {
      setFormMessage("Punkte und Legs müssen gültige Zahlen sein.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    let profilePictureUrl: string | undefined = undefined

    // Upload profile picture if selected
    if (profilePictureFile) {
      setUploadingImage(true)
      const fileExtension = profilePictureFile.name.split(".").pop()
      const filePath = `player-avatars/${selectedPlayerName.replace(/\s/g, "_")}-${Date.now()}.${fileExtension}`

      try {
        const { data, error: uploadError } = await supabase.storage
          .from("player-avatars") // Use the bucket name you created
          .upload(filePath, profilePictureFile, {
            cacheControl: "3600",
            upsert: false, // Do not upsert, we want to create new unique files
          })

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)
        profilePictureUrl = publicUrlData.publicUrl
        setUploadingImage(false)
      } catch (uploadError: any) {
        setFormMessage(`Fehler beim Hochladen des Bildes: ${uploadError.message}`)
        setFormMessageType("error")
        setLoading(false)
        setUploadingImage(false)
        return
      }
    }

    try {
      const currentTableName = dartType === "edart_players" ? "edart" : "steeldart"
      const playerTableName = dartType

      // Check if player exists to decide between insert and update
      const { data: existingPlayer, error: fetchPlayerError } = await supabase
        .from(playerTableName)
        .select("id, profile_picture_url")
        .eq("name", selectedPlayerName)
        .single()

      if (fetchPlayerError && fetchPlayerError.code !== "PGRST116") {
        // PGRST116 means "no rows found"
        throw fetchPlayerError
      }

      if (existingPlayer) {
        // Player exists, update their profile picture if a new one was uploaded
        if (profilePictureUrl) {
          const { error: updatePlayerError } = await supabase
            .from(playerTableName)
            .update({ profile_picture_url: profilePictureUrl })
            .eq("id", existingPlayer.id)
          if (updatePlayerError) throw updatePlayerError
        }
      } else {
        // Player does not exist, insert new player with profile picture if available
        const { error: insertNewPlayerError } = await supabase.from(playerTableName).insert([
          {
            name: selectedPlayerName,
            points: 0,
            legs: 0,
            participations: 0,
            user_id: user.id,
            profile_picture_url: profilePictureUrl || null,
          },
        ])
        if (insertNewPlayerError) throw insertNewPlayerError
        potContribution += 10.0 // Fügen Sie diese Zeile hier hinzu, um 10€ für die Neuregistrierung hinzuzufügen
      }

      // Add game entry
      const { error: gameEntryError } = await supabase.from("game_entries").insert([
        {
          player_name: selectedPlayerName,
          game_type: currentTableName,
          points: numericPoints,
          legs: numericLegs,
          game_date: gameDate,
          user_id: user.id,
        },
      ])

      if (gameEntryError) {
        throw gameEntryError
      }

      await recalculatePlayerStats(selectedPlayerName, currentTableName)

      const { data: potData, error: potFetchError } = await supabase.from("pot_total").select("id, amount").single()

      if (potFetchError) {
        throw potFetchError
      }

      const newPotAmount = Number.parseFloat(potData.amount) + potContribution

      const { error: potUpdateError } = await supabase
        .from("pot_total")
        .update({ amount: newPotAmount })
        .eq("id", potData.id)

      if (potUpdateError) {
        throw potUpdateError
      }

      setFormMessage("Daten erfolgreich gespeichert!")
      setFormMessageType("success")
      onDataSaved()
      onPlayerNameChange("")
      setPoints("")
      setLegs("")
      setProfilePictureFile(null) // Clear file after successful submission
      setProfilePicturePreview(null) // Clear preview after successful submission
    } catch (error: any) {
      setFormMessage(`Fehler: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielerdaten hinzufügen</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Einzelne Spielergebnisse eingeben</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieler</label>
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={selectedPlayerName || ""}
                  onChange={(e) => onPlayerNameChange(e.target.value)}
                  placeholder="Spielername eingeben oder auswählen"
                  className={`flex-1 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200 ${isPlayerSelectedViaModal ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  required
                  readOnly={isPlayerSelectedViaModal}
                />
                {isPlayerSelectedViaModal ? (
                  <Button
                    type="button"
                    onClick={handleClearPlayer}
                    variant="outline"
                    className="h-12 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onOpenPlayerList}
                    variant="outline"
                    className="h-12 px-4 border-gray-200 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Auswählen
                  </Button>
                )}
              </div>
              {isPlayerSelectedViaModal && (
                <p className="text-xs text-gray-500 mt-1">
                  Um einen neuen Spieler einzugeben, klicken Sie auf "Löschen".
                </p>
              )}
            </div>

            {/* Profile Picture Upload */}
            <div className="space-y-2">
              <label htmlFor="profilePicture" className="text-sm font-medium text-gray-700">
                Profilbild (optional)
              </label>
              <div className="flex items-center space-x-3">
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                {profilePicturePreview && (
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                    <Image
                      src={profilePicturePreview || "/placeholder.svg"}
                      alt="Vorschau Profilbild"
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-full"
                    />
                  </div>
                )}
              </div>
              {uploadingImage && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  <span>Bild wird hochgeladen...</span>
                </div>
              )}
            </div>

            {/* Game Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieltyp</label>
              <Select value={dartType} onValueChange={setDartType}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edart_players">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>E-Dart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="steel_dart_players">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span>Steel Dart</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Game Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spieldatum</label>
              <Input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Points and Legs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Punkte</label>
                <Input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Legs</label>
                <Input
                  type="number"
                  min="0"
                  value={legs}
                  onChange={(e) => setLegs(e.target.value)}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading || uploadingImage ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verarbeitung läuft...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Daten speichern</span>
                </div>
              )}
            </Button>

            {/* Status Message for form submission */}
            {formMessage && (
              <div
                className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formMessageType === "error"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : formMessageType === "success"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-gray-50 text-gray-700 border border-gray-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {formMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : formMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{formMessage}</span>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

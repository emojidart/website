"use client"

import type React from "react"
import { CheckCircle, AlertCircle, Save, UserPlus } from 'lucide-react'
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface PlayerRegistrationProps {
  isVisible: boolean
  user: User | null
  onDataSaved: () => void
}

export function PlayerRegistration({ isVisible, user, onDataSaved }: PlayerRegistrationProps) {
  const [playerName, setPlayerName] = useState("")
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

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
    setFormMessage("Spieler wird registriert...")
    setFormMessageType("info")

    if (!user) {
      setFormMessage("Fehler: Nicht authentifiziert.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    if (!playerName.trim()) {
      setFormMessage("Bitte Spielername eingeben.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    try {
      // Check if player already exists in players table
      const { data: existingPlayer, error: fetchError } = await supabase
        .from("players")
        .select("id")
        .eq("name", playerName.trim())
        .single()

      if (existingPlayer) {
        setFormMessage("Spieler existiert bereits.")
        setFormMessageType("error")
        setLoading(false)
        return
      }

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      let profilePictureUrl: string | null = null

      // Upload profile picture if selected
      if (profilePictureFile) {
        setUploadingImage(true)
        const fileExtension = profilePictureFile.name.split(".").pop()
        const filePath = `player-avatars/${playerName.trim().replace(/\s/g, "_")}-${Date.now()}.${fileExtension}`

        const { data, error: uploadError } = await supabase.storage
          .from("player-avatars")
          .upload(filePath, profilePictureFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from("player-avatars").getPublicUrl(filePath)
        profilePictureUrl = publicUrlData.publicUrl
        setUploadingImage(false)
      }

      // Insert new player into players table (ONLY name, photo, user_id)
      const { error: insertError } = await supabase.from("players").insert([
        {
          name: playerName.trim(),
          profile_picture_url: profilePictureUrl,
          user_id: user.id,
        },
      ])

      if (insertError) {
        throw insertError
      }

      setFormMessage("Spieler erfolgreich registriert!")
      setFormMessageType("success")
      onDataSaved()

      // Reset form
      setPlayerName("")
      setProfilePictureFile(null)
      setProfilePicturePreview(null)
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
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Neuen Spieler registrieren</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Spieler einmalig anlegen - kann dann bei E-Dart und Steel Dart spielen
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Spielername</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Vollständigen Namen eingeben"
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200"
                required
              />
            </div>

            {/* Profile Picture Upload */}
            <div className="space-y-2">
              <label htmlFor="profilePicture" className="text-sm font-medium text-gray-700">
                Profilbild
              </label>
              <div className="flex items-center space-x-3">
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading || uploadingImage ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registrierung läuft...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Spieler registrieren</span>
                </div>
              )}
            </Button>

            {/* Status Message */}
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
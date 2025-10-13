"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, XCircle, Upload, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

export interface SpielerdatenbankEntry {
  id?: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
  profile_picture_url: string | null
  created_at?: string
}

interface SpieldatenbankFormProps {
  initialData?: SpielerdatenbankEntry | null
  onSaveSuccess: () => void
  onCancelEdit?: () => void
}

export function SpieldatenbankForm({ initialData, onSaveSuccess, onCancelEdit }: SpieldatenbankFormProps) {
  const [formData, setFormData] = useState<SpielerdatenbankEntry>(
    initialData || {
      name: "",
      verein: null,
      ligastatus: null,
      geschlecht: null,
      profile_picture_url: null,
    },
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.profile_picture_url || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFormData(
      initialData || {
        name: "",
        verein: null,
        ligastatus: null,
        geschlecht: null,
        profile_picture_url: null,
      },
    )
    setImagePreview(initialData?.profile_picture_url || null)
    setSelectedFile(null)
    setMessage(null)
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: keyof SpielerdatenbankEntry, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value === "ohne_status" ? null : value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "Bitte wählen Sie eine Bilddatei aus." })
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Die Datei ist zu groß. Maximale Größe: 5MB." })
        return
      }
      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData((prev) => ({ ...prev, profile_picture_url: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from("profile_picture_url").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_picture_url").getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      console.error("Error uploading image:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      let profilePictureUrl = formData.profile_picture_url

      if (selectedFile) {
        setUploadingImage(true)
        profilePictureUrl = await uploadImage(selectedFile)
        setUploadingImage(false)
      }

      let error = null
      if (formData.id) {
        // Update existing player
        const { error: updateError } = await supabase
          .from("spieldatenbank")
          .update({
            name: formData.name,
            verein: formData.verein,
            ligastatus: formData.ligastatus,
            geschlecht: formData.geschlecht,
            profile_picture_url: profilePictureUrl,
          })
          .eq("id", formData.id)
        error = updateError
      } else {
        // Add new player
        const { error: insertError } = await supabase.from("spieldatenbank").insert([
          {
            name: formData.name,
            verein: formData.verein,
            ligastatus: formData.ligastatus,
            geschlecht: formData.geschlecht,
            profile_picture_url: profilePictureUrl,
          },
        ])
        error = insertError
      }

      if (error) {
        throw error
      }

      setMessage({ type: "success", text: `Spieler erfolgreich ${formData.id ? "aktualisiert" : "hinzugefügt"}!` })
      setFormData({ name: "", verein: null, ligastatus: null, geschlecht: null, profile_picture_url: null })
      setImagePreview(null)
      setSelectedFile(null)
      onSaveSuccess()
    } catch (err: any) {
      setMessage({ type: "error", text: `Fehler: ${err.message}` })
      console.error("Error saving player:", err)
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <CardTitle className="text-xl font-semibold text-gray-900">
            {initialData ? "Spieler bearbeiten" : "Neuen Spieler hinzufügen"}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 mt-1">
            {initialData
              ? "Bearbeiten Sie die Details des ausgewählten Spielers."
              : "Fügen Sie einen neuen Spieler zur Datenbank hinzu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-gray-700 mb-2 block">Profilbild</Label>
              <div className="flex flex-col items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Profilbild Vorschau"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? "Bild ändern" : "Bild hochladen"}
                  </Button>
                  <p className="text-xs text-gray-500">Max. 5MB, JPG, PNG oder GIF</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="name" className="text-gray-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="verein" className="text-gray-700">
                Verein
              </Label>
              <Input id="verein" name="verein" value={formData.verein || ""} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ligastatus" className="text-gray-700">
                Ligastatus
              </Label>
              <Select
                name="ligastatus"
                value={formData.ligastatus || "ohne_status"}
                onValueChange={(value) => handleSelectChange("ligastatus", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Wählen Sie einen Ligastatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ohne_status">Ohne Status</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="R">R</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="NC">NC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="geschlecht" className="text-gray-700">
                Geschlecht
              </Label>
              <Select
                name="geschlecht"
                value={formData.geschlecht || "ohne_status"}
                onValueChange={(value) => handleSelectChange("geschlecht", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Wählen Sie ein Geschlecht" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ohne_status">Ohne Status</SelectItem>
                  <SelectItem value="m">Männlich</SelectItem>
                  <SelectItem value="w">Weiblich</SelectItem>
                  <SelectItem value="d">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            <div className="flex justify-end gap-3">
              {initialData && onCancelEdit && (
                <Button type="button" variant="outline" onClick={onCancelEdit} disabled={loading || uploadingImage}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              )}
              <Button type="submit" disabled={loading || uploadingImage}>
                {loading || uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {uploadingImage ? "Bild wird hochgeladen..." : "Speichern..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

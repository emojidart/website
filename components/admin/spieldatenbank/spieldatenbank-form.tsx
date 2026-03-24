"use client"

import type React from "react"

import { useRef, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  Plus,
  Save,
  Upload,
  X,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SpielerdatenbankEntry = {
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
  profile_picture_url: string | null
}

type Props = {
  onSaveSuccess?: () => void | Promise<void>
  compact?: boolean
}

const EMPTY_FORM: SpielerdatenbankEntry = {
  name: "",
  verein: null,
  ligastatus: null,
  geschlecht: null,
  profile_picture_url: null,
}

const LIGASTATUS_OPTIONS = ["A", "B", "R", "C", "NC"]

const GESCHLECHT_OPTIONS = [
  { value: "m", label: "Männlich" },
  { value: "w", label: "Weiblich" },
  { value: "d", label: "Divers" },
]

export function SpieldatenbankForm({ onSaveSuccess, compact = false }: Props) {
  const [form, setForm] = useState<SpielerdatenbankEntry>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setSelectedFile(null)
    setImagePreview(null)
    setMessage(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      name: e.target.value,
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value.trim() === "" ? null : value,
    }))
  }

  const handleSelectChange = (name: keyof SpielerdatenbankEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value === "none" ? null : value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Bitte wählen Sie eine Bilddatei aus." })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Die Datei ist zu groß. Maximal 5MB." })
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setForm((prev) => ({ ...prev, profile_picture_url: null }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage.from("profile_picture_url").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile_picture_url").getPublicUrl(filePath)

    return publicUrl
  }

  const handleSave = async () => {
    try {
      setMessage(null)

      if (!form.name.trim()) {
        setMessage({ type: "error", text: "Bitte einen Namen eingeben." })
        return
      }

      setSaving(true)

      let profilePictureUrl = form.profile_picture_url

      if (selectedFile) {
        setUploadingImage(true)
        profilePictureUrl = await uploadImage(selectedFile)
      }

      const payload = {
        name: form.name.trim(),
        verein: form.verein?.trim() || null,
        ligastatus: form.ligastatus || null,
        geschlecht: form.geschlecht || null,
        profile_picture_url: profilePictureUrl || null,
      }

      const { error } = await supabase.from("spieldatenbank").insert(payload)
      if (error) throw error

      setMessage({ type: "success", text: "Spieler wurde angelegt." })

      await Promise.resolve(onSaveSuccess?.())
      resetForm()
    } catch (error: any) {
      console.error("SpieldatenbankForm save error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spieler konnte nicht gespeichert werden.",
      })
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  return (
    <Card className={cn("border-gray-200 shadow-sm", compact && "shadow-none")}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="text-base font-semibold">Neuer Spieler</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {imagePreview ? (
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 shadow bg-gray-50">
                <Image
                  src={imagePreview || "/placeholder.svg"}
                  alt="Profilbild Vorschau"
                  width={96}
                  height={96}
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
            <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="spieldatenbank-form-upload"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="rounded-xl"
            >
              <Upload className="h-4 w-4 mr-2" />
              {imagePreview ? "Bild ändern" : "Bild hochladen"}
            </Button>

            <p className="text-xs text-gray-500">Max. 5MB</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={handleNameChange} placeholder="Vor- und Nachname" />
        </div>

        <div className="space-y-2">
          <Label>Verein</Label>
          <Input
            name="verein"
            value={form.verein || ""}
            onChange={handleInputChange}
            placeholder="z. B. Emojis Dartverein"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ligastatus</Label>
            <Select
              value={form.ligastatus || "none"}
              onValueChange={(value) => handleSelectChange("ligastatus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ohne Status</SelectItem>
                {LIGASTATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Geschlecht</Label>
            <Select
              value={form.geschlecht || "none"}
              onValueChange={(value) => handleSelectChange("geschlecht", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Geschlecht wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ohne Angabe</SelectItem>
                {GESCHLECHT_OPTIONS.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {message ? (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium border",
              message.type === "success" && "bg-green-50 border-green-200 text-green-800",
              message.type === "error" && "bg-red-50 border-red-200 text-red-800",
            )}
          >
            {message.text}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" onClick={handleSave} disabled={saving || uploadingImage} className="rounded-xl">
            {saving || uploadingImage ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {saving || uploadingImage
              ? uploadingImage
                ? "Bild wird hochgeladen..."
                : "Speichern..."
              : "Spieler anlegen"}
          </Button>

          <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
            <X className="w-4 h-4 mr-2" />
            Zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
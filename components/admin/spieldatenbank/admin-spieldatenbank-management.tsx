"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Database,
  Loader2,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Upload,
  Users,
  Building2,
  Shield,
  UserRound,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SpielerdatenbankEntry = {
  id?: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
  profile_picture_url: string | null
  created_at?: string
}

interface AdminSpieldatenbankManagementProps {
  user: User | null
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

export function AdminSpieldatenbankManagement({ user }: AdminSpieldatenbankManagementProps) {
  const [players, setPlayers] = useState<SpielerdatenbankEntry[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [search, setSearch] = useState("")
  const [selectedVerein, setSelectedVerein] = useState("all")
  const [selectedLiga, setSelectedLiga] = useState("all")
  const [selectedGeschlecht, setSelectedGeschlecht] = useState("all")

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<SpielerdatenbankEntry>(EMPTY_FORM)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<SpielerdatenbankEntry | null>(null)

  useEffect(() => {
    if (user) {
      void loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const { data, error } = await supabase.from("spieldatenbank").select("*").order("name", { ascending: true })

      if (error) throw error

      setPlayers((data || []) as SpielerdatenbankEntry[])
    } catch (error: any) {
      console.error("loadData error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spielerdatenbank konnte nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  const uniqueVereine = useMemo(() => {
    return Array.from(new Set(players.map((p) => p.verein).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b, "de"),
    )
  }, [players])

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return players.filter((player) => {
      const matchesSearch =
        !q ||
        player.name.toLowerCase().includes(q) ||
        (player.verein || "").toLowerCase().includes(q) ||
        (player.ligastatus || "").toLowerCase().includes(q) ||
        (player.geschlecht || "").toLowerCase().includes(q)

      const matchesVerein = selectedVerein === "all" || player.verein === selectedVerein
      const matchesLiga = selectedLiga === "all" || player.ligastatus === selectedLiga
      const matchesGeschlecht = selectedGeschlecht === "all" || player.geschlecht === selectedGeschlecht

      return matchesSearch && matchesVerein && matchesLiga && matchesGeschlecht
    })
  }, [players, search, selectedVerein, selectedLiga, selectedGeschlecht])

  const resetForm = () => {
    setIsEditing(false)
    setForm(EMPTY_FORM)
    setImagePreview(null)
    setSelectedFile(null)
    setMessage(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startCreate = () => {
    setMessage(null)
    setIsEditing(false)
    setForm(EMPTY_FORM)
    setImagePreview(null)
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startEdit = (player: SpielerdatenbankEntry) => {
    setMessage(null)
    setIsEditing(true)
    setForm({
      id: player.id,
      name: player.name,
      verein: player.verein,
      ligastatus: player.ligastatus,
      geschlecht: player.geschlecht,
      profile_picture_url: player.profile_picture_url,
      created_at: player.created_at,
    })
    setImagePreview(player.profile_picture_url || null)
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openDeleteModal = (player: SpielerdatenbankEntry) => {
    setPlayerToDelete(player)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (deletingId) return
    setDeleteModalOpen(false)
    setPlayerToDelete(null)
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
      setMessage({ type: "error", text: "Die Datei ist zu groß. Maximale Größe: 5MB." })
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

      if (!user) {
        setMessage({ type: "error", text: "Nicht eingeloggt." })
        return
      }

      if (!form.name?.trim()) {
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

      if (isEditing && form.id) {
        const { error } = await supabase.from("spieldatenbank").update(payload).eq("id", form.id)
        if (error) throw error
        setMessage({ type: "success", text: "Spieler wurde gespeichert." })
      } else {
        const { error } = await supabase.from("spieldatenbank").insert(payload)
        if (error) throw error
        setMessage({ type: "success", text: "Spieler wurde angelegt." })
      }

      await loadData()
      resetForm()
    } catch (error: any) {
      console.error("handleSave error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spieler konnte nicht gespeichert werden.",
      })
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  const handleDelete = async () => {
    if (!playerToDelete?.id) return

    try {
      setDeletingId(playerToDelete.id)
      setMessage(null)

      const { error } = await supabase.from("spieldatenbank").delete().eq("id", playerToDelete.id)
      if (error) throw error

      if (form.id === playerToDelete.id) {
        resetForm()
      }

      setDeleteModalOpen(false)
      setPlayerToDelete(null)
      setMessage({ type: "success", text: "Spieler wurde gelöscht." })

      await loadData()
    } catch (error: any) {
      console.error("handleDelete error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spieler konnte nicht gelöscht werden.",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const totalPlayers = players.length
  const withClub = players.filter((p) => !!p.verein).length
  const withPhoto = players.filter((p) => !!p.profile_picture_url).length
  const withLiga = players.filter((p) => !!p.ligastatus).length

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black">Spielerdatenbank</h2>
            <p className="text-sm text-gray-600 mt-1">
              Spieler anlegen, bearbeiten, filtern und mit Profilbild verwalten.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadData()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Neu laden
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Spieler gesamt</div>
            <div className="text-3xl font-black mt-1">{totalPlayers}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Mit Verein</div>
            <div className="text-3xl font-black mt-1">{withClub}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Mit Bild</div>
            <div className="text-3xl font-black mt-1">{withPhoto}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Mit Ligastatus</div>
            <div className="text-3xl font-black mt-1">{withLiga}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>{isEditing ? "Spieler bearbeiten" : "Neuer Spieler"}</CardTitle>
              <CardDescription>Hier legst du Einträge für die Spieldatenbank an.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg bg-gray-50">
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
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="spieler-photo-upload"
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

                  <p className="text-xs text-gray-500">Max. 5MB, JPG, PNG oder GIF</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Vor- und Nachname"
                />
              </div>

              <div className="space-y-2">
                <Label>Verein</Label>
                <Input
                  name="verein"
                  value={form.verein || ""}
                  onChange={handleInputChange}
                  placeholder="z. B. Emoj!s Dartverein"
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

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className="font-medium">Bild vorhanden</div>
                  <div className="text-sm text-gray-500">
                    Zeigt an, ob aktuell ein Profilbild gesetzt ist.
                  </div>
                </div>
                <Switch checked={!!(imagePreview || form.profile_picture_url)} disabled />
              </div>

              {message ? (
                <div
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium border",
                    message.type === "success" && "bg-green-50 border-green-200 text-green-800",
                    message.type === "error" && "bg-red-50 border-red-200 text-red-800",
                    message.type === "info" && "bg-blue-50 border-blue-200 text-blue-800",
                  )}
                >
                  {message.text}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" onClick={handleSave} disabled={saving || uploadingImage} className="rounded-xl">
                  {saving || uploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : isEditing ? (
                    <Save className="w-4 h-4 mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}

                  {saving || uploadingImage
                    ? uploadingImage
                      ? "Bild wird hochgeladen..."
                      : "Speichern..."
                    : isEditing
                      ? "Änderungen speichern"
                      : "Spieler anlegen"}
                </Button>

                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                  <X className="w-4 h-4 mr-2" />
                  Zurücksetzen
                </Button>

                <Button type="button" variant="ghost" onClick={startCreate} className="rounded-xl">
                  Neue Eingabe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>Vorhandene Spieler</CardTitle>
              <CardDescription>Suche, filtere und bearbeite bestehende Einträge.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Spieler suchen..."
                    className="pl-9"
                  />
                </div>

                <Select value={selectedVerein} onValueChange={setSelectedVerein}>
                  <SelectTrigger>
                    <SelectValue placeholder="Verein filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Vereine</SelectItem>
                    {uniqueVereine.map((verein) => (
                      <SelectItem key={verein} value={verein}>
                        {verein}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ligastatus filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Ligastatus</SelectItem>
                    {LIGASTATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={selectedGeschlecht} onValueChange={setSelectedGeschlecht}>
                  <SelectTrigger>
                    <SelectValue placeholder="Geschlecht filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Geschlechter</SelectItem>
                    {GESCHLECHT_OPTIONS.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="md:col-span-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span>Gefundene Einträge</span>
                  <span className="font-bold text-gray-900">{filteredPlayers.length}</span>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <ScrollArea className="h-[720px]">
                  <div className="p-4 space-y-3">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Spieler werden geladen...
                      </div>
                    ) : filteredPlayers.length === 0 ? (
                      <div className="text-sm text-gray-500">Keine Spieler gefunden.</div>
                    ) : (
                      filteredPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                              {player.profile_picture_url ? (
                                <Image
                                  src={player.profile_picture_url}
                                  alt={player.name}
                                  width={56}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-6 h-6 text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 truncate">{player.name}</div>

                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant="outline" className="rounded-lg">
                                  <Building2 className="w-3.5 h-3.5 mr-1" />
                                  {player.verein || "Ohne Verein"}
                                </Badge>

                                <Badge variant="outline" className="rounded-lg">
                                  <Shield className="w-3.5 h-3.5 mr-1" />
                                  {player.ligastatus || "Ohne Ligastatus"}
                                </Badge>

                                <Badge variant="outline" className="rounded-lg">
                                  <UserRound className="w-3.5 h-3.5 mr-1" />
                                  {player.geschlecht || "Ohne Angabe"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => startEdit(player)} className="rounded-xl">
                              <Pencil className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openDeleteModal(player)}
                              disabled={deletingId === player.id}
                              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              {deletingId === player.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Löschen
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={(open) => (!deletingId ? setDeleteModalOpen(open) : null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Spieler löschen</DialogTitle>
                <DialogDescription>Bitte bestätige das Löschen dieses Eintrags.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <div className="text-sm text-gray-600 mb-1">Ausgewählter Spieler</div>
            <div className="font-semibold text-gray-900">{playerToDelete?.name || "—"}</div>

            <div className="mt-2 flex flex-wrap gap-2">
              {playerToDelete?.verein ? (
                <Badge variant="outline" className="rounded-lg">
                  {playerToDelete.verein}
                </Badge>
              ) : null}

              {playerToDelete?.ligastatus ? (
                <Badge variant="outline" className="rounded-lg">
                  {playerToDelete.ligastatus}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="text-sm text-gray-600">Diese Aktion kann nicht rückgängig gemacht werden.</div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteModal}
              disabled={!!deletingId}
              className="rounded-xl"
            >
              Abbrechen
            </Button>

            <Button
              type="button"
              onClick={handleDelete}
              disabled={!!deletingId}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
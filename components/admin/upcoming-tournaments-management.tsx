"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import type { User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from "lucide-react"

interface Tournament {
  id: string
  name: string
  date: string
  time: string
  location: string
  entry_fee: number
  mode: string
  details: string | null
  photo_url: string | null
  user_id: string
}

interface UpcomingTournamentsManagementProps {
  user: User | null
}

type FormState = {
  name: string
  date: string
  time: string
  location: string
  entry_fee: number | string
  mode: "edart" | "steeldart" | "both"
  details: string
  photo_url: string | null
  photo_file: File | null
}

type FormMessage = { type: "success" | "error" | "info"; text: string } | null

function modeLabel(mode: Tournament["mode"]) {
  if (mode === "edart") return "E-Dart"
  if (mode === "steeldart") return "Steel Dart"
  if (mode === "both") return "Beide"
  return mode
}

function modePillClasses(mode: Tournament["mode"]) {
  if (mode === "edart") return "bg-blue-50 text-blue-700 border-blue-100"
  if (mode === "steeldart") return "bg-emerald-50 text-emerald-700 border-emerald-100"
  if (mode === "both") return "bg-purple-50 text-purple-700 border-purple-100"
  return "bg-muted text-foreground"
}

export function UpcomingTournamentsManagement({ user }: UpcomingTournamentsManagementProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null)

  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formMessage, setFormMessage] = useState<FormMessage>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    date: "",
    time: "",
    location: "",
    entry_fee: "",
    mode: "edart",
    details: "",
    photo_url: null,
    photo_file: null,
  })

  const isEditing = Boolean(editingTournamentId)

  const primaryActionLabel = useMemo(() => {
    if (isSaving) return "Speichern…"
    return isEditing ? "Änderungen speichern" : "Turnier anlegen"
  }, [isEditing, isSaving])

  useEffect(() => {
    void fetchTournaments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(photoPreview)
        } catch {
          // ignore
        }
      }
    }
  }, [photoPreview])

  const fetchTournaments = async () => {
    setIsFetching(true)
    setFormMessage(null)

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching tournaments:", error)
      setFormMessage({ type: "error", text: "Fehler beim Laden der Turniere." })
      setTournaments([])
    } else {
      setTournaments((data as Tournament[]) || [])
    }

    setIsFetching(false)
  }

  const resetForm = () => {
    setEditingTournamentId(null)
    setForm({
      name: "",
      date: "",
      time: "",
      location: "",
      entry_fee: "",
      mode: "edart",
      details: "",
      photo_url: null,
      photo_file: null,
    })
    setFormMessage(null)
    setPhotoPreview(null)
  }

  const handleEdit = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id)
    setForm({
      name: tournament.name,
      date: tournament.date,
      time: tournament.time,
      location: tournament.location,
      entry_fee: tournament.entry_fee,
      mode: (tournament.mode as FormState["mode"]) ?? "edart",
      details: tournament.details ?? "",
      photo_url: tournament.photo_url,
      photo_file: null,
    })
    setPhotoPreview(tournament.photo_url)
    setFormMessage(null)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: keyof FormState, value: FormState["mode"]) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null

    // Cleanup previous blob URL (if any)
    setPhotoPreview((prev) => {
      if (prev?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev)
        } catch {
          // ignore
        }
      }
      return prev
    })

    setForm((prev) => ({ ...prev, photo_file: file }))
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExtension = file.name.split(".").pop() || "jpg"
    const filePath = `tournament-photos/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExtension}`

    const { error } = await supabase.storage
      .from("tournament-photos")
      .upload(filePath, file, { cacheControl: "3600", upsert: false })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from("tournament-photos")
      .getPublicUrl(filePath)

    return publicUrlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormMessage(null)

    if (!user) {
      setFormMessage({ type: "error", text: "Fehler: Nicht authentifiziert." })
      return
    }

    setIsSaving(true)

    try {
      let photoUrl: string | null = form.photo_url
      if (form.photo_file) {
        photoUrl = await uploadPhoto(form.photo_file)
      }

      const tournamentData = {
        name: form.name.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        entry_fee: Number(form.entry_fee || 0),
        mode: form.mode,
        details: form.details?.trim() || null,
        photo_url: photoUrl,
        user_id: user.id,
      }

      if (editingTournamentId) {
        const { error } = await supabase
          .from("tournaments")
          .update(tournamentData)
          .eq("id", editingTournamentId)

        if (error) throw error
        setFormMessage({ type: "success", text: "Turnier erfolgreich aktualisiert!" })
      } else {
        const { error } = await supabase.from("tournaments").insert([tournamentData])
        if (error) throw error
        setFormMessage({ type: "success", text: "Turnier erfolgreich hinzugefügt!" })
      }

      resetForm()
      await fetchTournaments()
    } catch (error: any) {
      console.error("Error saving tournament:", error)
      setFormMessage({
        type: "error",
        text: `Fehler beim Speichern des Turniers: ${error?.message ?? "Unbekannter Fehler"}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setFormMessage(null)
    setIsSaving(true)

    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", id)
      if (error) throw error

      setFormMessage({ type: "success", text: "Turnier erfolgreich gelöscht!" })
      await fetchTournaments()
    } catch (error: any) {
      console.error("Error deleting tournament:", error)
      setFormMessage({ type: "error", text: "Fehler beim Löschen des Turniers." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Use full available width within the admin content area */}
      <div className="w-full max-w-none space-y-8">
      {/* Form */}
      <Card className="border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">
                  {isEditing ? "Turnier bearbeiten" : "Neues Turnier anlegen"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Details für bevorstehende Turniere eingeben und verwalten.
                </CardDescription>
              </div>
            </div>

            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="shrink-0"
              >
                <X className="mr-2 h-4 w-4" />
                Abbrechen
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Turniername
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="z.B. Sommer Cup 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium">
                  Datum
                </label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="time" className="text-sm font-medium">
                  Uhrzeit
                </label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Ort
                </label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleInputChange}
                  placeholder="z.B. Vereinslokal / Adresse"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="entry_fee" className="text-sm font-medium">
                  Startgeld (€)
                </label>
                <Input
                  id="entry_fee"
                  name="entry_fee"
                  type="number"
                  step="0.01"
                  value={form.entry_fee}
                  onChange={handleInputChange}
                  placeholder="z.B. 10.00"
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="mode" className="text-sm font-medium">
                  Modus
                </label>
                <Select
                  value={form.mode}
                  onValueChange={(value) => handleSelectChange("mode", value as FormState["mode"])}
                >
                  <SelectTrigger id="mode">
                    <SelectValue placeholder="Wähle einen Modus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edart">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>E-Dart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="steeldart">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>Steel Dart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>Beide</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="details" className="text-sm font-medium">
                Details (optional)
              </label>
              <Textarea
                id="details"
                name="details"
                value={form.details}
                onChange={handleInputChange}
                placeholder="Zusätzliche Infos (Regeln, Preise, Anmeldung, …)"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="photo_file" className="text-sm font-medium">
                Turnierfoto (optional)
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  id="photo_file"
                  name="photo_file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sm:flex-1"
                />

                {photoPreview ? (
                  <div className="relative h-14 w-24 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={photoPreview}
                      alt="Turnierfoto Vorschau"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={isSaving} className="sm:flex-1">
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {primaryActionLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {primaryActionLabel}
                  </span>
                )}
              </Button>

              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                  <X className="mr-2 h-4 w-4" />
                  Zurücksetzen
                </Button>
              ) : null}
            </div>

            {formMessage ? (
              <div
                className={
                  "rounded-lg border p-4 text-sm " +
                  (formMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : formMessage.type === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-muted bg-muted/40 text-foreground")
                }
              >
                <div className="flex items-start gap-3">
                  {formMessage.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  ) : formMessage.type === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                  ) : (
                    <Calendar className="mt-0.5 h-4 w-4" />
                  )}
                  <div className="leading-5">{formMessage.text}</div>
                </div>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background shadow-sm">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Bevorstehende Turniere</CardTitle>
                <CardDescription className="mt-1">
                  Übersicht und Verwaltung aller geplanten Turniere.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchTournaments()}
              disabled={isFetching}
            >
              {isFetching ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aktualisieren
                </span>
              ) : (
                "Aktualisieren"
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isFetching && tournaments.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-3">Turniere werden geladen…</span>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch keine Turniere angelegt. Lege jetzt dein erstes Turnier an.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turniername</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ort</TableHead>
                    <TableHead>Modus</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {t.photo_url ? (
                            <div className="relative h-9 w-12 overflow-hidden rounded-md border bg-muted">
                              <Image
                                src={t.photo_url}
                                alt={`${t.name} Foto`}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <div className="truncate">{t.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.time ? `Beginn: ${t.time}` : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(t.date).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{t.location}</TableCell>
                      <TableCell>
                        <span
                          className={
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
                            modePillClasses(t.mode)
                          }
                        >
                          {modeLabel(t.mode)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(t)}
                            disabled={isSaving}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={isSaving}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Löschen</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Turnier löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. Das Turnier{" "}
                                  <span className="font-semibold">{t.name}</span> wird dauerhaft entfernt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleDelete(t.id)}>
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  )
}

"use client"

import { InlineLoader, LoadingIndicator } from "@/components/loading/loading"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Edit, Trash2, PlusCircle, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface RecruitmentNeed {
  id: string
  team_name: string
  league: string
  start_date: string
  description: string | null
  created_at: string
  user_id: string
}

interface PlayerRecruitmentListProps {
  onDataSaved: () => void
}

export function PlayerRecruitmentList({ onDataSaved }: PlayerRecruitmentListProps) {
  const [needs, setNeeds] = useState<RecruitmentNeed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentNeed, setCurrentNeed] = useState<RecruitmentNeed | null>(null)
  const [editFormMessage, setEditFormMessage] = useState("")
  const [editFormMessageType, setEditFormMessageType] = useState<"success" | "error" | "info">("info")
  const [editLoading, setEditLoading] = useState(false)

  const fetchRecruitmentNeeds = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from("player_recruitment_needs")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Error fetching recruitment needs:", fetchError)
      setError("Fehler beim Laden der Spielergesuche.")
    } else {
      setNeeds(data as RecruitmentNeed[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecruitmentNeeds()
  }, [fetchRecruitmentNeeds])

  const handleEditClick = (need: RecruitmentNeed) => {
    setCurrentNeed(need)
    setEditFormMessage("")
    setEditFormMessageType("info")
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (need: RecruitmentNeed) => {
    setCurrentNeed(need)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentNeed) return

    setEditLoading(true)
    setEditFormMessage("Speichern...")
    setEditFormMessageType("info")

    try {
      const { error: updateError } = await supabase
        .from("player_recruitment_needs")
        .update({
          team_name: currentNeed.team_name,
          league: currentNeed.league,
          start_date: currentNeed.start_date,
          description: currentNeed.description,
        })
        .eq("id", currentNeed.id)

      if (updateError) {
        throw updateError
      }

      setEditFormMessage("Erfolgreich aktualisiert!")
      setEditFormMessageType("success")
      fetchRecruitmentNeeds() // Refresh the list
      onDataSaved() // Notify parent
      setTimeout(() => setIsEditDialogOpen(false), 1500) // Close after a short delay
    } catch (error: any) {
      setEditFormMessage(`Fehler: ${error.message}`)
      setEditFormMessageType("error")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!currentNeed) {
      console.log("DEBUG: handleDeleteConfirm called but no currentNeed set.") // NEU
      return
    }

    console.log("DEBUG: Attempting to delete recruitment need with ID:", currentNeed.id) // NEU

    setEditLoading(true) // Use editLoading for delete operation as well
    setEditFormMessage("Löschen...")
    setEditFormMessageType("info")

    try {
      const { error: deleteError } = await supabase.from("player_recruitment_needs").delete().eq("id", currentNeed.id)

      if (deleteError) {
        console.error("DEBUG: Supabase delete error:", deleteError) // NEU
        throw deleteError
      }

      console.log("DEBUG: Recruitment need successfully deleted.") // NEU
      setEditFormMessage("Erfolgreich gelöscht!")
      setEditFormMessageType("success")
      fetchRecruitmentNeeds() // Refresh the list
      onDataSaved() // Notify parent
      setTimeout(() => setIsDeleteDialogOpen(false), 1500) // Close after a short delay
    } catch (error: any) {
      console.error("DEBUG: Error during delete operation:", error) // NEU
      setEditFormMessage(`Fehler: ${error.message}`)
      setEditFormMessageType("error")
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">Aktuelle Rekrutierungen</CardTitle>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground sm:text-sm">Spielergesuche bearbeiten oder löschen</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              
              <InlineLoader label="Lade Spielergesuche..." />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : needs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <PlusCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">Noch keine Spielergesuche vorhanden.</p>
              <p className="mt-1 text-xs font-semibold">
                Fügen Sie neue Bedürfnisse über den Tab "Spielergesuche eingeben" hinzu.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {needs.map((need) => (
                  <div key={need.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{need.team_name}</div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-muted-foreground">
                          <span>{need.league}</span>
                          <span>·</span>
                          <span>{format(new Date(need.start_date), "dd.MM.yyyy", { locale: de })}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(need)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(need)}
                          className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Löschen</span>
                        </Button>
                      </div>
                    </div>

                    {need.description ? (
                      <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium leading-5 text-muted-foreground">
                        {need.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Verein / Mannschaft</TableHead>
                      <TableHead>Liga</TableHead>
                      <TableHead>Ab wann</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needs.map((need) => (
                      <TableRow key={need.id}>
                        <TableCell className="font-semibold">{need.team_name}</TableCell>
                        <TableCell>{need.league}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(need.start_date), "dd.MM.yyyy", { locale: de })}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">{need.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(need)}
                            className="mr-1 h-8 w-8"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(need)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Spielergesuche bearbeiten</DialogTitle>
            <DialogDescription>
              Nehmen Sie Änderungen an der Suche vor. Klicken Sie auf Speichern, wenn Sie fertig sind.
            </DialogDescription>
          </DialogHeader>
          {currentNeed && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="editTeamName" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verein
                </label>
                <Input
                  id="editTeamName"
                  value={currentNeed.team_name}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, team_name: e.target.value })}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editLeague" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Liga
                </label>
                <Input
                  id="editLeague"
                  value={currentNeed.league}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, league: e.target.value })}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editStartDate" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ab wann
                </label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={currentNeed.start_date}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, start_date: e.target.value })}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editDescription" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Beschreibung
                </label>
                <Textarea
                  id="editDescription"
                  value={currentNeed.description || ""}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, description: e.target.value })}
                  className="min-h-[90px] rounded-xl"
                />
              </div>
              {editFormMessage && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    editFormMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : editFormMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {editFormMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : editFormMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <LoadingIndicator className="h-4 w-4" />
                  )}
                  <span>{editFormMessage}</span>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={editLoading} className="h-10 rounded-xl" loading={Boolean(editLoading)}><Edit className="h-4 w-4 mr-2" />Speichern
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Spielergesuche löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Suche löschen möchten? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </DialogDescription>
          </DialogHeader>
          {currentNeed && (
            <div className="py-2">
              <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                <div><span className="font-semibold">Verein:</span> {currentNeed.team_name}</div>
                <div className="mt-1"><span className="font-semibold">Liga:</span> {currentNeed.league}</div>
                <div className="mt-1">
                  <span className="font-semibold">Ab wann:</span>{" "}
                  {format(new Date(currentNeed.start_date), "dd.MM.yyyy", { locale: de })}
                </div>
              </div>
              {editFormMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    editFormMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : editFormMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {editFormMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : editFormMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <LoadingIndicator className="h-4 w-4" />
                  )}
                  <span>{editFormMessage}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={editLoading}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={editLoading} loading={Boolean(editLoading)}><Trash2 className="h-4 w-4 mr-2" />Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

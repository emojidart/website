"use client"

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
import { AlertCircle, CheckCircle, Loader2, Edit, Trash2, PlusCircle, Search } from "lucide-react"
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
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielergesuche anzeigen</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Übersicht und Verwaltung der eingetragenen Bedürfnisse</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="ml-3 text-gray-600">Lade Spielergesuche...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-8 w-8 mr-2" />
              <p>{error}</p>
            </div>
          ) : needs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PlusCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Noch keine Spielergesuche vorhanden.</p>
              <p className="text-sm mt-2">
                Fügen Sie neue Bedürfnisse über den Tab "Spielergesuche eingeben" hinzu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-medium">{need.team_name}</TableCell>
                      <TableCell>{need.league}</TableCell>
                      <TableCell>{format(new Date(need.start_date), "dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{need.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(need)} className="mr-2">
                          <Edit className="h-4 w-4 text-blue-500" />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(need)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Löschen</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Spielergesuche bearbeiten</DialogTitle>
            <DialogDescription>
              Nehmen Sie Änderungen an der Suche vor. Klicken Sie auf Speichern, wenn Sie fertig sind.
            </DialogDescription>
          </DialogHeader>
          {currentNeed && (
            <form onSubmit={handleSaveEdit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="editTeamName" className="text-right">
                  Verein
                </label>
                <Input
                  id="editTeamName"
                  value={currentNeed.team_name}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, team_name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="editLeague" className="text-right">
                  Liga
                </label>
                <Input
                  id="editLeague"
                  value={currentNeed.league}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, league: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="editStartDate" className="text-right">
                  Ab wann
                </label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={currentNeed.start_date}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, start_date: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="editDescription" className="text-right">
                  Beschreibung
                </label>
                <Textarea
                  id="editDescription"
                  value={currentNeed.description || ""}
                  onChange={(e) => setCurrentNeed({ ...currentNeed, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              {editFormMessage && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    editFormMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : editFormMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100"
                  }`}
                >
                  {editFormMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : editFormMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{editFormMessage}</span>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  Speichern
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Spielergesuche löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Suche löschen möchten? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </DialogDescription>
          </DialogHeader>
          {currentNeed && (
            <div className="py-4">
              <p className="text-sm text-gray-700">**Verein:** {currentNeed.team_name}</p>
              <p className="text-sm text-gray-700">**Liga:** {currentNeed.league}</p>
              <p className="text-sm text-gray-700">
                **Ab wann:** {format(new Date(currentNeed.start_date), "dd.MM.yyyy", { locale: de })}
              </p>
              {editFormMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    editFormMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : editFormMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100"
                  }`}
                >
                  {editFormMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : editFormMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
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
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={editLoading}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

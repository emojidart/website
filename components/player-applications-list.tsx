"use client"
import { useState, useEffect, useCallback } from "react"
import { DialogFooter } from "@/components/ui/dialog"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Trash2, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface PlayerApplication {
  id: string
  first_name: string
  last_name: string
  alias: string | null
  age: number
  experience: string
  jersey_size: string | null
  email: string
  phone: string | null
  notes: string | null
  is_read: boolean // Dies ist bereits korrekt als boolean definiert
  created_at: string
}

interface PlayerApplicationsListProps {
  onDataChanged: () => void // Callback to notify parent about data changes (e.g., for unread count)
}

export function PlayerApplicationsList({ onDataChanged }: PlayerApplicationsListProps) {
  const [applications, setApplications] = useState<PlayerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentApplication, setCurrentApplication] = useState<PlayerApplication | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState("")
  const [actionMessageType, setActionMessageType] = useState<"success" | "error" | "info">("info")

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from("player_applications")
      .select("*")
      .order("is_read", { ascending: true }) // Unread first
      .order("created_at", { ascending: false }) // Then by newest

    if (fetchError) {
      console.error("Error fetching player applications:", fetchError)
      setError("Fehler beim Laden der Spielerbewerbungen.")
    } else {
      console.log("DEBUG: Fetched raw applications data:", data)
      // NEU: Konvertiere is_read von String zu Boolean
      const processedData = data.map((app: any) => ({
        ...app,
        is_read: app.is_read === true || app.is_read === "true", // Konvertiert "true" oder true zu true, alles andere zu false
      })) as PlayerApplication[]
      setApplications(processedData)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Loggen des Zustands nach dem Update
  useEffect(() => {
    console.log(
      "DEBUG: Current applications state (after processing):",
      applications.map((app) => ({ id: app.id, is_read: app.is_read, name: `${app.first_name} ${app.last_name}` })),
    )
  }, [applications])

  const handleViewClick = (application: PlayerApplication) => {
    setCurrentApplication(application)
    setIsViewDialogOpen(true)
    if (!application.is_read) {
      handleMarkAsRead(application.id, true)
    }
  }

  const handleMarkAsRead = async (id: string, status: boolean) => {
    setActionLoading(true)
    setActionMessage(status ? "Markiere als gelesen..." : "Markiere als ungelesen...")
    setActionMessageType("info")

    try {
      const { error: updateError } = await supabase.from("player_applications").update({ is_read: status }).eq("id", id)

      if (updateError) {
        throw updateError
      }

      setActionMessage(status ? "Erfolgreich als gelesen markiert!" : "Erfolgreich als ungelesen markiert!")
      setActionMessageType("success")
      fetchApplications() // Refresh the list
      onDataChanged() // Notify parent to update count
      // If dialog is open, update current application status
      if (currentApplication && currentApplication.id === id) {
        setCurrentApplication((prev) => (prev ? { ...prev, is_read: status } : null))
      }
    } catch (error: any) {
      setActionMessage(`Fehler: ${error.message}`)
      setActionMessageType("error")
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionMessage(""), 2000) // Clear message after a delay
    }
  }

  const handleDeleteClick = (application: PlayerApplication) => {
    setCurrentApplication(application)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!currentApplication) return

    setActionLoading(true)
    setActionMessage("Löschen...")
    setActionMessageType("info")

    try {
      const { error: deleteError } = await supabase.from("player_applications").delete().eq("id", currentApplication.id)

      if (deleteError) {
        throw deleteError
      }

      setActionMessage("Bewerbung erfolgreich gelöscht!")
      setActionMessageType("success")
      fetchApplications() // Refresh the list
      onDataChanged() // Notify parent to update count
      setTimeout(() => setIsDeleteDialogOpen(false), 1500) // Close after a short delay
    } catch (error: any) {
      setActionMessage(`Fehler: ${error.message}`)
      setActionMessageType("error")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Spielerbewerbungen</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Übersicht der eingegangenen Spielerbewerbungen</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              <p className="ml-3 text-gray-600">Lade Spielerbewerbungen...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-8 w-8 mr-2" />
              <p>{error}</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Noch keine Spielerbewerbungen vorhanden.</p>
              <p className="text-sm mt-2">Neue Bewerbungen erscheinen hier.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Bewerbungsdatum</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className={app.is_read ? "bg-gray-50" : "bg-blue-50 font-semibold"}>
                      <TableCell>
                        <Badge
                          variant={app.is_read ? "secondary" : "default"}
                          className={app.is_read ? "bg-gray-200 text-gray-700" : "bg-blue-500 hover:bg-blue-600"}
                        >
                          {app.is_read ? "Gelesen" : "Neu"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {app.first_name} {app.last_name}
                      </TableCell>
                      <TableCell>{app.alias || "-"}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{format(new Date(app.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewClick(app)} className="mr-2">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span className="sr-only">Ansehen</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(app)}>
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bewerbungsdetails</DialogTitle>
            <DialogDescription>
              Details zur Spielerbewerbung von {currentApplication?.first_name} {currentApplication?.last_name}.
            </DialogDescription>
          </DialogHeader>
          {currentApplication && (
            <div className="grid gap-4 py-4 text-sm text-gray-700">
              <p>
                <strong>Name:</strong> {currentApplication.first_name} {currentApplication.last_name}
              </p>
              {currentApplication.alias && (
                <p>
                  <strong>Alias:</strong> {currentApplication.alias}
                </p>
              )}
              <p>
                <strong>Alter:</strong> {currentApplication.age}
              </p>
              <p>
                <strong>Erfahrung:</strong> {currentApplication.experience}
              </p>
              {currentApplication.jersey_size && (
                <p>
                  <strong>Trikotgröße:</strong> {currentApplication.jersey_size}
                </p>
              )}
              <p>
                <strong>E-Mail:</strong> {currentApplication.email}
              </p>
              {currentApplication.phone && (
                <p>
                  <strong>Telefon:</strong> {currentApplication.phone}
                </p>
              )}
              {currentApplication.notes && (
                <p>
                  <strong>Anmerkungen:</strong> {currentApplication.notes}
                </p>
              )}
              <p>
                <strong>Bewerbungsdatum:</strong>{" "}
                {format(new Date(currentApplication.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </p>
              <div>
                <strong>Status:</strong>{" "}
                <Badge
                  variant={currentApplication.is_read ? "secondary" : "default"}
                  className={currentApplication.is_read ? "bg-gray-200 text-gray-700" : "bg-blue-500"}
                >
                  {currentApplication.is_read ? "Gelesen" : "Neu"}
                </Badge>
              </div>

              {actionMessage && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    actionMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : actionMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100"
                  }`}
                >
                  {actionMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : actionMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{actionMessage}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleMarkAsRead(currentApplication!.id, !currentApplication!.is_read)}
              disabled={actionLoading}
            >
              {actionLoading && actionMessageType === "info" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : currentApplication?.is_read ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {currentApplication?.is_read ? "Als ungelesen markieren" : "Als gelesen markieren"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteClick(currentApplication!)}
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bewerbung löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Bewerbung löschen möchten? Diese Aktion kann nicht rückgängig gemacht
              werden.
            </DialogDescription>
          </DialogHeader>
          {currentApplication && (
            <div className="py-4">
              <p className="text-sm text-gray-700">
                **Name:** {currentApplication.first_name} {currentApplication.last_name}
              </p>
              <p className="text-sm text-gray-700">**E-Mail:** {currentApplication.email}</p>
              {actionMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    actionMessageType === "error"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : actionMessageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-gray-50 text-gray-700 border border-gray-100"
                  }`}
                >
                  {actionMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : actionMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{actionMessage}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

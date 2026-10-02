"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { DialogFooter } from "@/components/ui/dialog"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Trash2, Mail, UserCheck, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type MsgType = "success" | "error" | "info"

interface PlayerApplication {
  id: string
  created_at: string

  first_name: string
  last_name: string
  email: string
  phone: string | null

  birth_date: string

  origin: string | null
  street: string
  house_number: string
  postal_code: string
  city: string

  player_number: string | null

  experience: string | null
  jersey_size: string | null
  notes: string | null

  is_read: boolean
}

interface PlayerApplicationsListProps {
  onDataChanged: () => void
}

function normalizeSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim()
}

export function PlayerApplicationsList({ onDataChanged }: PlayerApplicationsListProps) {
  const [applications, setApplications] = useState<PlayerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)

  const [currentApplication, setCurrentApplication] = useState<PlayerApplication | null>(null)

  // single busy flag, but we also keep "busyId" for row-level disabling
  const [actionLoading, setActionLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [actionMessage, setActionMessage] = useState("")
  const [actionMessageType, setActionMessageType] = useState<MsgType>("info")

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from("player_applications")
      .select("*")
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Error fetching player applications:", fetchError)
      setError("Fehler beim Laden der Spielerbewerbungen.")
      setApplications([])
      setLoading(false)
      return
    }

    const processed = (data ?? []).map((app: any) => ({
      ...app,
      is_read: app.is_read === true || app.is_read === "true",
    })) as PlayerApplication[]

    setApplications(processed)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return applications
    return applications.filter((a) => {
      const hay = [
        a.first_name,
        a.last_name,
        a.email,
        a.city,
        a.origin ?? "",
        a.player_number ?? "",
        a.postal_code ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(s)
    })
  }, [applications, q])

  const handleViewClick = (application: PlayerApplication) => {
    setCurrentApplication(application)
    setIsViewDialogOpen(true)
    if (!application.is_read) {
      handleMarkAsRead(application.id, true)
    }
  }

  const handleMarkAsRead = async (id: string, status: boolean) => {
    setActionLoading(true)
    setBusyId(id)
    setActionMessage(status ? "Markiere als gelesen..." : "Markiere als ungelesen...")
    setActionMessageType("info")

    try {
      const { error: updateError } = await supabase.from("player_applications").update({ is_read: status }).eq("id", id)
      if (updateError) throw updateError

      setActionMessage(status ? "Erfolgreich als gelesen markiert!" : "Erfolgreich als ungelesen markiert!")
      setActionMessageType("success")

      await fetchApplications()
      onDataChanged()

      if (currentApplication && currentApplication.id === id) {
        setCurrentApplication((prev) => (prev ? { ...prev, is_read: status } : null))
      }
    } catch (e: any) {
      setActionMessage(`Fehler: ${e.message}`)
      setActionMessageType("error")
    } finally {
      setActionLoading(false)
      setBusyId(null)
      setTimeout(() => setActionMessage(""), 2000)
    }
  }

  const handleDeleteClick = (application: PlayerApplication) => {
    setCurrentApplication(application)
    setActionMessage("")
    setActionMessageType("info")
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!currentApplication) return

    setActionLoading(true)
    setBusyId(currentApplication.id)
    setActionMessage("Löschen...")
    setActionMessageType("info")

    try {
      const { error: deleteError } = await supabase.from("player_applications").delete().eq("id", currentApplication.id)
      if (deleteError) throw deleteError

      setActionMessage("Bewerbung erfolgreich gelöscht!")
      setActionMessageType("success")

      await fetchApplications()
      onDataChanged()

      setTimeout(() => setIsDeleteDialogOpen(false), 900)
    } catch (e: any) {
      setActionMessage(`Fehler: ${e.message}`)
      setActionMessageType("error")
    } finally {
      setActionLoading(false)
      setBusyId(null)
    }
  }

  const openApproveDialog = (application: PlayerApplication) => {
    setCurrentApplication(application)
    setActionMessage("")
    setActionMessageType("info")
    setIsApproveDialogOpen(true)
  }

  const handleApproveConfirm = async () => {
    if (!currentApplication) return

    setActionLoading(true)
    setBusyId(currentApplication.id)
    setActionMessage("Genehmige & übernehme in club_players…")
    setActionMessageType("info")

    try {
      // 1) fresh row
      const { data: appRow, error: appErr } = await supabase
        .from("player_applications")
        .select("*")
        .eq("id", currentApplication.id)
        .single()

      if (appErr) throw appErr
      const a = appRow as PlayerApplication

      // 2) insert into club_players
      const fullName = normalizeSpaces(`${a.first_name} ${a.last_name}`)

      const clubPayload = {
        name: fullName,
        origin: a.origin ?? a.city ?? null,
        street: a.street,
        house_number: a.house_number,
        postal_code: a.postal_code,
        city: a.city,
        birthdate: a.birth_date, // <- club_players column is birthdate (as you said)
        player_number: a.player_number ?? null,
        email: a.email,
        phone: a.phone ?? null,
      }

      const { error: insErr } = await supabase.from("club_players").insert([clubPayload])
      if (insErr) throw insErr

      // 3) mark as read
      const { error: updErr } = await supabase
        .from("player_applications")
        .update({ is_read: true })
        .eq("id", a.id)

      if (updErr) throw updErr

      setActionMessage("✅ Spieler wurde erfolgreich hinzugefügt!")
      setActionMessageType("success")

      await fetchApplications()
      onDataChanged()

      setTimeout(() => setIsApproveDialogOpen(false), 900)
    } catch (e: any) {
      setActionMessage(e?.message ? `Fehler: ${e.message}` : "Fehler beim Genehmigen.")
      setActionMessageType("error")
    } finally {
      setActionLoading(false)
      setBusyId(null)
    }
  }

  const ActionBanner = () =>
    actionMessage ? (
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${
          actionMessageType === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : actionMessageType === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 bg-gray-50 text-gray-700"
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
    ) : null

  return (
    <div className="w-full">
      <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                <Mail className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-gray-900 sm:text-lg">Spielerbewerbungen</CardTitle>
                <p className="mt-0.5 text-xs font-semibold text-gray-500 sm:text-sm">Eingegangene Bewerbungen prüfen und bearbeiten</p>
              </div>
            </div>

            <div className="w-full sm:w-[320px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Suchen (Name, E-Mail, Ort, PLZ)…"
                  className="h-10 rounded-xl border-gray-200 pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              <p className="ml-3 text-gray-600">Lade Spielerbewerbungen...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-black text-gray-700">Keine Bewerbungen gefunden.</p>
              <p className="mt-1 text-xs font-semibold">Neue Bewerbungen erscheinen hier.</p>
            </div>
          ) : (
            <>
              {/* MOBILE: kompakte Liste */}
              <div className="space-y-2 sm:hidden">
                {filtered.map((app) => {
                  const isBusy = busyId === app.id
                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "rounded-xl border bg-white p-3",
                        app.is_read ? "border-gray-200" : "border-orange-200 bg-orange-50/40",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-gray-900">
                              {app.first_name} {app.last_name}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2 py-0 text-[10px] font-black",
                                app.is_read
                                  ? "border-gray-200 bg-gray-50 text-gray-600"
                                  : "border-orange-200 bg-orange-50 text-orange-700",
                              )}
                            >
                              {app.is_read ? "Gelesen" : "Neu"}
                            </Badge>
                          </div>

                          <div className="mt-1 truncate text-xs font-semibold text-gray-600">
                            {app.email}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-gray-400">
                            <span>{app.postal_code} {app.city}</span>
                            <span>·</span>
                            <span>
                              {app.created_at ? format(new Date(app.created_at), "dd.MM.yyyy HH:mm", { locale: de }) : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClick(app)}
                            disabled={isBusy}
                            className="h-8 w-8 rounded-lg text-gray-600 hover:bg-gray-100"
                          >
                            {isBusy && actionMessageType === "info" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            <span className="sr-only">Details</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openApproveDialog(app)}
                            disabled={isBusy}
                            className="h-8 w-8 rounded-lg text-green-700 hover:bg-green-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            <span className="sr-only">Genehmigen</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(app)}
                            disabled={isBusy}
                            className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Ort</TableHead>
                      <TableHead>Bewerbungsdatum</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((app) => {
                      const isBusy = busyId === app.id
                      return (
                        <TableRow key={app.id} className={app.is_read ? "" : "bg-orange-50/50 font-semibold"}>
                          <TableCell>
                            <Badge
                              variant={app.is_read ? "secondary" : "default"}
                              className={app.is_read ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"}
                            >
                              {app.is_read ? "Gelesen" : "Neu"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {app.first_name} {app.last_name}
                          </TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell>
                            {app.postal_code} {app.city}
                          </TableCell>
                          <TableCell>{format(new Date(app.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(app)} className="mr-2" disabled={isBusy}>
                              <Eye className="h-4 w-4 text-gray-600" />
                              <span className="sr-only">Ansehen</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openApproveDialog(app)}
                              className="mr-2"
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-700" />
                              )}
                              <span className="sr-only">Genehmigen</span>
                            </Button>

                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(app)} disabled={isBusy}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Löschen</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Bewerbungsdetails</DialogTitle>
            <DialogDescription>
              Details zur Bewerbung von {currentApplication?.first_name} {currentApplication?.last_name}.
            </DialogDescription>
          </DialogHeader>

          {currentApplication && (
            <div className="grid gap-3 py-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {currentApplication.first_name} {currentApplication.last_name}
                </div>
                <Badge
                  variant={currentApplication.is_read ? "secondary" : "default"}
                  className={currentApplication.is_read ? "bg-gray-200 text-gray-700" : "bg-blue-500"}
                >
                  {currentApplication.is_read ? "Gelesen" : "Neu"}
                </Badge>
              </div>

              <p><strong>E-Mail:</strong> {currentApplication.email}</p>
              {currentApplication.phone ? <p><strong>Telefon:</strong> {currentApplication.phone}</p> : null}

              <p>
                <strong>Geburtsdatum:</strong>{" "}
                {currentApplication.birth_date ? format(new Date(currentApplication.birth_date), "dd.MM.yyyy", { locale: de }) : "-"}
              </p>

              <p>
                <strong>Adresse:</strong> {currentApplication.street} {currentApplication.house_number},{" "}
                {currentApplication.postal_code} {currentApplication.city}
              </p>

              <p><strong>Origin:</strong> {currentApplication.origin ?? "-"}</p>
              <p><strong>Spielernummer:</strong> {currentApplication.player_number ?? "-"}</p>

              {currentApplication.experience ? <p><strong>Erfahrung:</strong> {currentApplication.experience}</p> : null}
              {currentApplication.jersey_size ? <p><strong>Trikotgröße:</strong> {currentApplication.jersey_size}</p> : null}
              {currentApplication.notes ? <p><strong>Anmerkungen:</strong> {currentApplication.notes}</p> : null}

              <p>
                <strong>Bewerbungsdatum:</strong>{" "}
                {format(new Date(currentApplication.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </p>

              {actionMessage ? <ActionBanner /> : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
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
              {currentApplication?.is_read ? "Als ungelesen" : "Als gelesen"}
            </Button>

            <Button
              onClick={() => openApproveDialog(currentApplication!)}
              disabled={actionLoading}
              className="rounded-xl bg-gray-950 text-white font-black hover:bg-gray-800"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Genehmigen
            </Button>

            <Button variant="destructive" onClick={() => handleDeleteClick(currentApplication!)} disabled={actionLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE DIALOG */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Spieler genehmigen</DialogTitle>
            <DialogDescription>
              Der Spieler wird zum <span className="font-semibold">Verein</span> hinzugefügt.
            </DialogDescription>
          </DialogHeader>

          {currentApplication ? (
            <div className="space-y-2 text-sm text-gray-700">
              <div className="font-semibold">
                {currentApplication.first_name} {currentApplication.last_name}
              </div>
              <div>{currentApplication.email}</div>
              <div>
                {currentApplication.street} {currentApplication.house_number}, {currentApplication.postal_code} {currentApplication.city}
              </div>
              <div>
                Geburtsdatum:{" "}
                {currentApplication.birth_date
                  ? format(new Date(currentApplication.birth_date), "dd.MM.yyyy", { locale: de })
                  : "-"}
              </div>
              {actionMessage ? <ActionBanner /> : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={actionLoading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={!currentApplication || actionLoading}
              className="rounded-xl bg-gray-950 text-white font-black hover:bg-gray-800"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Genehmigen & übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bewerbung löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Bewerbung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>

          {currentApplication && (
            <div className="py-4">
              <p className="text-sm text-gray-700">
                <strong>Name:</strong> {currentApplication.first_name} {currentApplication.last_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>E-Mail:</strong> {currentApplication.email}
              </p>
              {actionMessage ? <div className="mt-4"><ActionBanner /></div> : null}
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
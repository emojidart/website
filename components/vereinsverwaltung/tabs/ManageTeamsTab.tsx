"use client"

import { useState } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Edit, Loader2, PlusCircle, Trash2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DartType, Team, TeamMember } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

type Props = {
  teams: Team[]
  teamMembers: TeamMember[]

  teamLoading: boolean
  teamMessage: string
  teamMessageType: MessageType

  newTeamName: string
  setNewTeamName: (v: string) => void

  newTeamDartType: DartType | ""
  setNewTeamDartType: (v: DartType | "") => void

  teamLogoPreview: string | null
  handleTeamLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  clearTeamLogo: () => void

  editingTeamId: string | null

  submitTeamForm: (e: React.FormEvent) => void
  onEditTeam: (team: Team) => void
  onCancelEdit: () => void
  onDeleteTeam: (teamId: string) => void
}

export function ManageTeamsTab(props: Props) {
  const {
    teams,
    teamMembers,
    teamLoading,
    teamMessage,
    teamMessageType,
    newTeamName,
    setNewTeamName,
    newTeamDartType,
    setNewTeamDartType,
    teamLogoPreview,
    handleTeamLogoChange,
    clearTeamLogo,
    editingTeamId,
    submitTeamForm,
    onEditTeam,
    onCancelEdit,
    onDeleteTeam,
  } = props

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)
  const [deleteTeamName, setDeleteTeamName] = useState<string>("")
  const [confirmText, setConfirmText] = useState("")

  function openDelete(team: Team) {
    setDeleteTeamId(team.id)
    setDeleteTeamName(team.name)
    setConfirmText("")
    setDeleteOpen(true)
  }

  function closeDelete() {
    setDeleteOpen(false)
    setDeleteTeamId(null)
    setDeleteTeamName("")
    setConfirmText("")
  }

  async function confirmDelete() {
    if (!deleteTeamId) return
    onDeleteTeam(deleteTeamId)
    closeDelete()
  }

  const mustType = `LÖSCHEN`
  const canDelete = confirmText.trim().toUpperCase() === mustType

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">
        {editingTeamId ? "Mannschaft bearbeiten" : "Neue Mannschaft erstellen"}
      </h3>

      <form onSubmit={submitTeamForm} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newTeamName">Mannschaftsname</Label>
          <Input
            id="newTeamName"
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Mannschaftsname"
            className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamDartType">Dartart</Label>
          <select
            id="teamDartType"
            value={newTeamDartType}
            onChange={(e) => setNewTeamDartType(e.target.value as DartType | "")}
            className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            required
          >
            <option value="">Bitte auswählen</option>
            <option value="edart">E-Dart</option>
            <option value="steeldart">Steeldart</option>
          </select>
          <p className="text-xs text-gray-500">
            Diese Auswahl steuert später, welches Liga-Paket Zugriff auf die Mannschaft hat.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamLogo">Mannschaftslogo (optional)</Label>
          <div className="flex items-center space-x-3">
            <Input
              id="teamLogo"
              type="file"
              accept="image/*"
              onChange={handleTeamLogoChange}
              className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />

            {teamLogoPreview && (
              <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                <Image
                  src={teamLogoPreview || "/placeholder.svg"}
                  alt="Vorschau Teamlogo"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={clearTeamLogo}
                >
                  <XCircle className="h-3 w-3" />
                  <span className="sr-only">Logo entfernen</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={teamLoading}
            className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
          >
            {teamLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{editingTeamId ? "Wird aktualisiert..." : "Wird erstellt..."}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {editingTeamId ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                <span>{editingTeamId ? "Änderungen speichern" : "Mannschaft erstellen"}</span>
              </div>
            )}
          </Button>

          {editingTeamId && (
            <Button
              type="button"
              onClick={onCancelEdit}
              variant="outline"
              disabled={teamLoading}
              className="h-10 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 font-medium rounded-lg shadow-md bg-transparent"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          )}
        </div>
      </form>

      {teamMessage && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
            teamMessageType === "error"
              ? "bg-red-50 text-red-700 border border-red-100"
              : teamMessageType === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-gray-50 text-gray-700 border border-gray-100",
          )}
        >
          {teamMessageType === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : teamMessageType === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{teamMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-700">Bestehende Mannschaften:</h4>

        {teams.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Mannschaften vorhanden.</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Mannschaft</th>
                  <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Dartart</th>
                  <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Mitglieder</th>
                  <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {teams.map((team, idx) => {
                  const memberCount = teamMembers.filter((m) => m.team_id === team.id).length
                  return (
                    <tr
                      key={team.id}
                      className={cn(
                        "border-t border-gray-200 hover:bg-gray-50/60",
                        idx % 2 === 1 && "bg-gray-50/30",
                      )}
                    >
                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={team.logo_url || "/placeholder.svg?height=32&width=32&query=team-logo"} />
                            <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-800">{team.name}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <span
                          className={
                            team.dart_type === "steeldart"
                              ? "inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              : "inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700"
                          }
                        >
                          {team.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                        </span>
                      </td>

                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{memberCount}</td>

                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditTeam(team)}
                            disabled={teamLoading}
                            className="h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDelete(team)}
                            disabled={teamLoading}
                            className="h-8 px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => !teamLoading && closeDelete()}
          />
          <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-gray-900">Mannschaft löschen</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => !teamLoading && closeDelete()}
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                    <span className="sr-only">Schließen</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Du bist dabei zu löschen:</div>
                    <div className="mt-1">
                      <span className="font-medium">{deleteTeamName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmDelete">
                    Tippe <span className="font-semibold">LÖSCHEN</span> zum Bestätigen
                  </Label>
                  <Input
                    id="confirmDelete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="LÖSCHEN"
                    className="h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => !teamLoading && closeDelete()}
                  disabled={teamLoading}
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 h-10"
                  onClick={confirmDelete}
                  disabled={teamLoading || !canDelete}
                >
                  {teamLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird gelöscht...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Endgültig löschen</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
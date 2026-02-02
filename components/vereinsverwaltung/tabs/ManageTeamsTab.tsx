"use client"

import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Edit, Loader2, PlusCircle, Trash2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Team, TeamMember } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

type Props = {
  teams: Team[]
  teamMembers: TeamMember[]

  teamLoading: boolean
  teamMessage: string
  teamMessageType: MessageType

  newTeamName: string
  setNewTeamName: (v: string) => void
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
    teamLogoPreview,
    handleTeamLogoChange,
    clearTeamLogo,
    editingTeamId,
    submitTeamForm,
    onEditTeam,
    onCancelEdit,
    onDeleteTeam,
  } = props

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
                            onClick={() => onDeleteTeam(team.id)}
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
    </div>
  )
}

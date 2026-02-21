"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Crown, Loader2, ShieldCheck, Trash2, UserRoundCog, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClubPlayer, Team, TeamMember } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

type Props = {
  clubPlayers: ClubPlayer[]
  teams: Team[]

  teamMembers: TeamMember[]
  getPlayersInTeam: (teamId: string) => TeamMember[]

  selectedPlayerId: string
  setSelectedPlayerId: (v: string) => void
  selectedTeamId: string
  setSelectedTeamId: (v: string) => void
  selectedRole: string
  setSelectedRole: (v: string) => void

  currentSelectedPlayerTeam: Team | null
  currentSelectedPlayerRole: string | null

  assignmentLoading: boolean
  assignmentMessage: string
  assignmentMessageType: MessageType

  onSubmitAssign: () => void
  onRemoveMember: (memberId: string) => void
}

export function AssignPlayerTab(props: Props) {
  const {
    clubPlayers,
    teams,
    getPlayersInTeam,
    selectedPlayerId,
    setSelectedPlayerId,
    selectedTeamId,
    setSelectedTeamId,
    selectedRole,
    setSelectedRole,
    currentSelectedPlayerTeam,
    currentSelectedPlayerRole,
    assignmentLoading,
    assignmentMessage,
    assignmentMessageType,
    onSubmitAssign,
    onRemoveMember,
  } = props

  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [removePlayerName, setRemovePlayerName] = useState<string>("")
  const [removeTeamName, setRemoveTeamName] = useState<string>("")
  const [confirmText, setConfirmText] = useState("")

  function openRemove(member: TeamMember, teamName: string) {
    setRemoveMemberId(member.id)
    setRemovePlayerName(member.player_name ?? "")
    setRemoveTeamName(teamName)
    setConfirmText("")
    setRemoveOpen(true)
  }

  function closeRemove() {
    setRemoveOpen(false)
    setRemoveMemberId(null)
    setRemovePlayerName("")
    setRemoveTeamName("")
    setConfirmText("")
  }

  function confirmRemove() {
    if (!removeMemberId) return
    onRemoveMember(removeMemberId)
    closeRemove()
  }

  const mustType = "ENTFERNEN"
  const canRemove = confirmText.trim().toUpperCase() === mustType

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Spieler zu Mannschaft zuweisen</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmitAssign()
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="selectPlayer">Spieler auswählen</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger id="selectPlayer" className="h-10 border-gray-200 bg-gray-50/50">
              <SelectValue placeholder="Spieler auswählen" />
            </SelectTrigger>
            <SelectContent>
              {clubPlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={player.photo_url || "/placeholder.svg?height=24&width=24&query=player-avatar"} />
                      <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{player.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPlayerId && (
            <p className="text-sm text-gray-500 mt-1">
              Aktuelles Team:{" "}
              {currentSelectedPlayerTeam ? (
                <span className="font-medium text-gray-700">
                  {currentSelectedPlayerTeam.name}{" "}
                  {currentSelectedPlayerRole && (
                    <span className="text-xs text-gray-500">({currentSelectedPlayerRole})</span>
                  )}
                </span>
              ) : (
                <span className="italic">Keinem Team zugewiesen</span>
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="selectTeam">Ziel-Mannschaft auswählen</Label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger id="selectTeam" className="h-10 border-gray-200 bg-gray-50/50">
              <SelectValue placeholder="Mannschaft auswählen" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="selectRole">Rolle zuweisen</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger id="selectRole" className="h-10 border-gray-200 bg-gray-50/50">
              <SelectValue placeholder="Rolle auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Player">Spieler</SelectItem>
              <SelectItem value="Co-Captain">Co-Kapitän</SelectItem>
              <SelectItem value="Captain">Kapitän</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          disabled={assignmentLoading}
          className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
        >
          {assignmentLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Wird ausgeführt...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <UserRoundCog className="h-4 w-4" />
              <span>Spieler zuweisen / aktualisieren</span>
            </div>
          )}
        </Button>
      </form>

      {assignmentMessage && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
            assignmentMessageType === "error"
              ? "bg-red-50 text-red-700 border border-red-100"
              : assignmentMessageType === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-gray-50 text-gray-700 border border-gray-100",
          )}
        >
          {assignmentMessageType === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : assignmentMessageType === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{assignmentMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-700">Aktuelle Mannschaftszuweisungen:</h4>

        {teams.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Mannschaften zum Anzeigen.</p>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const playersInTeam = getPlayersInTeam(team.id)

              return (
                <div key={team.id} className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h5 className="font-bold text-gray-900 mb-2">{team.name}</h5>

                  {playersInTeam.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Spieler in dieser Mannschaft.</p>
                  ) : (
                    <ul className="space-y-1">
                      {playersInTeam.map((member) => (
                        <li key={member.id} className="flex items-center justify-between text-sm text-gray-700">
                          <span className="flex items-center gap-1">
                            {member.player_name}
                            {member.role === "Captain" && <Crown className="h-3 w-3 text-yellow-600" title="Kapitän" />}
                            {member.role === "Co-Captain" && (
                              <ShieldCheck className="h-3 w-3 text-blue-600" title="Co-Kapitän" />
                            )}
                            {member.role && member.role !== "Player" && (
                              <span className="text-xs text-gray-500">({member.role})</span>
                            )}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRemove(member, team.name)}
                            disabled={assignmentLoading}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Entfernen</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {removeOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => !assignmentLoading && closeRemove()}
          />
          <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-gray-900">Spieler aus Mannschaft entfernen</h5>
                    <p className="text-sm text-gray-600 mt-1">Der Spieler wird als „ausgetreten“ markiert.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => !assignmentLoading && closeRemove()}
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
                    <div className="font-semibold">Du bist dabei zu entfernen:</div>
                    <div className="mt-1">
                      <span className="font-medium">{removePlayerName}</span>{" "}
                      <span className="text-xs text-red-700">aus {removeTeamName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmRemoveMember">
                    Tippe <span className="font-semibold">ENTFERNEN</span> zum Bestätigen
                  </Label>
                  <Input
                    id="confirmRemoveMember"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="ENTFERNEN"
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
                  onClick={() => !assignmentLoading && closeRemove()}
                  disabled={assignmentLoading}
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 h-10"
                  onClick={confirmRemove}
                  disabled={assignmentLoading || !canRemove}
                >
                  {assignmentLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird entfernt...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Endgültig entfernen</span>
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
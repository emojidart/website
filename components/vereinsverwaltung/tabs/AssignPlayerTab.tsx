"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Crown, Loader2, ShieldCheck, Trash2, UserRoundCog } from "lucide-react"
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
                            onClick={() => onRemoveMember(member.id)}
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
    </div>
  )
}

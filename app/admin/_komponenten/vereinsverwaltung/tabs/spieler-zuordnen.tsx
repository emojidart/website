"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Crown, Loader2, ShieldCheck, Trash2, UserRoundCog, XCircle, Users, Target, UserCheck, ChevronRight, Layers3, CircleDot, Sparkles, ArrowRightLeft, Plus, History, CalendarDays, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"
import type { ClubPlayer, Team, TeamMember } from "@/components/vereinsverwaltung/types"
import type { TeamAssignmentMode, TeamAssignmentHistoryEntry } from "@/hooks/vereinsverwaltung/useTeamMembers"

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

  onSubmitAssign: (mode?: TeamAssignmentMode) => void
  onRemoveMember: (memberId: string) => void

  assignmentHistory: TeamAssignmentHistoryEntry[]
  assignmentHistoryLoading: boolean
  onRefreshAssignmentHistory: () => void
}

export function AssignPlayerTab(props: Props) {
  const {
    clubPlayers,
    teams,
    teamMembers,
    getPlayersInTeam,
    selectedPlayerId,
    setSelectedPlayerId,
    selectedTeamId,
    setSelectedTeamId,
    selectedRole,
    setSelectedRole,
    assignmentLoading,
    assignmentMessage,
    assignmentMessageType,
    onSubmitAssign,
    onRemoveMember,
    assignmentHistory,
    assignmentHistoryLoading,
    onRefreshAssignmentHistory,
  } = props

  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [removePlayerName, setRemovePlayerName] = useState<string>("")
  const [removeTeamName, setRemoveTeamName] = useState<string>("")
  const [confirmText, setConfirmText] = useState("")
  const [assignmentMode, setAssignmentMode] = useState<TeamAssignmentMode>("additional")

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

  const selectedPlayer = clubPlayers.find((player) => player.id === selectedPlayerId) || null
  const selectedTargetTeam = teams.find((team) => team.id === selectedTeamId) || null
  const selectedPlayerAssignments = selectedPlayerId
    ? teamMembers.filter((member) => member.player_id === selectedPlayerId)
    : []

  const transferCandidates = useMemo(() => {
    if (!selectedTargetTeam?.dart_type) return []
    return selectedPlayerAssignments.filter((member) => {
      if (member.team_id === selectedTargetTeam.id) return false
      return teams.find((team) => team.id === member.team_id)?.dart_type === selectedTargetTeam.dart_type
    })
  }, [selectedPlayerAssignments, selectedTargetTeam, teams])

  const fmtHistoryDate = (value: string | null) => {
    if (!value) return "—"
    return new Date(value).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 text-white">
      <section className={vv.surfaceLg}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-orange-500/[0.075] blur-3xl" />
          <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-sky-500/[0.055] blur-3xl" />
        </div>

        <div className="relative border-b border-white/[0.07] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                <UserRoundCog className="h-5 w-5 text-orange-300" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/60">
                    Mannschaftsverwaltung
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                    Zuordnung
                  </span>
                </div>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">
                  Spieler zu Mannschaft zuweisen
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
                  Bestehende Zuordnungen bleiben erhalten. E-Dart und Steeldart können parallel geführt werden.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Spieler</div>
                <div className="mt-0.5 text-sm font-black text-white">{clubPlayers.length}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Teams</div>
                <div className="mt-0.5 text-sm font-black text-white">{teams.length}</div>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmitAssign(assignmentMode)
          }}
          className="relative grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)]"
        >
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-500/[0.08] text-xs font-black text-sky-200">
                    01
                  </span>
                  <div>
                    <Label htmlFor="selectPlayer" className="text-sm font-black text-white">Spieler auswählen</Label>
                    <p className="mt-0.5 text-xs text-white/35">Wähle das Vereinsmitglied für die neue Zuordnung.</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-white/20" />
              </div>

              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger
                  id="selectPlayer"
                  className={cn(vv.select, "h-[52px]")}
                >
                  <SelectValue placeholder="Spieler auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {clubPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 border border-white/10">
                          <AvatarImage src={player.photo_url || "/placeholder.svg?height=28&width=28&query=player-avatar"} />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{player.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                    <Layers3 className="h-4.5 w-4.5 text-sky-300" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Aktive Mannschaften</div>
                    <div className="mt-0.5 text-xs text-white/35">
                      {selectedPlayer ? selectedPlayer.name : "Noch kein Spieler ausgewählt"}
                    </div>
                  </div>
                </div>

                {selectedPlayerId && (
                  <div className="rounded-full border border-sky-300/15 bg-sky-500/[0.07] px-3 py-1 text-[11px] font-black text-sky-100/80">
                    {selectedPlayerAssignments.length} aktiv
                  </div>
                )}
              </div>

              {!selectedPlayerId ? (
                <div className="flex min-h-[108px] items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018] px-4 text-center">
                  <div>
                    <CircleDot className="mx-auto h-5 w-5 text-white/20" />
                    <p className="mt-2 text-sm font-semibold text-white/35">
                      Nach der Spielerauswahl erscheinen hier alle aktiven Mannschaften.
                    </p>
                  </div>
                </div>
              ) : selectedPlayerAssignments.length === 0 ? (
                <div className="flex min-h-[108px] items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018] px-4 text-center">
                  <div>
                    <CheckCircle className="mx-auto h-5 w-5 text-emerald-300/70" />
                    <p className="mt-2 text-sm font-semibold text-white/40">
                      Der Spieler ist aktuell keiner Mannschaft zugeordnet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {selectedPlayerAssignments.map((member) => {
                    const team = teams.find((entry) => entry.id === member.team_id)
                    const dartLabel =
                      team?.dart_type === "edart"
                        ? "E-Dart"
                        : team?.dart_type === "steeldart"
                          ? "Steeldart"
                          : "Dartart offen"

                    return (
                      <div
                        key={member.id}
                        className="group rounded-[18px] border border-[#252c36] bg-[#10141b] px-3.5 py-3.5 transition hover:border-sky-300/[0.14] hover:bg-white/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-white">{team?.name ?? "Unbekannte Mannschaft"}</div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-white/35">
                              <span>{dartLabel}</span>
                              {member.role && member.role !== "Player" && (
                                <>
                                  <span className="text-white/15">•</span>
                                  <span className="text-orange-200/70">
                                    {member.role === "Captain" ? "Kapitän" : member.role === "Co-Captain" ? "Co-Kapitän" : member.role}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-500/[0.07] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200/80">
                            aktiv
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08]">
                <Target className="h-4.5 w-4.5 text-orange-300" />
              </div>
              <div>
                <div className="text-sm font-black text-white">Neue Zuordnung</div>
                <div className="mt-0.5 text-xs text-white/35">Mannschaft und Rolle festlegen.</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  Vorgang
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode("additional")}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      assignmentMode === "additional"
                        ? "border-sky-300/25 bg-sky-500/[0.09] shadow-[0_12px_30px_-24px_rgba(56,189,248,.45)]"
                        : "border-white/[0.08] bg-black/20 hover:border-white/[0.14] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className={`h-4 w-4 ${assignmentMode === "additional" ? "text-sky-300" : "text-white/30"}`} />
                      <span className="text-sm font-black text-white">Zusätzlich</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-white/35">
                      Andere Dartart bleibt parallel aktiv.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentMode("transfer")}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      assignmentMode === "transfer"
                        ? "border-orange-300/25 bg-orange-500/[0.10] shadow-[0_12px_30px_-24px_rgba(249,115,22,.45)]"
                        : "border-white/[0.08] bg-black/20 hover:border-white/[0.14] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className={`h-4 w-4 ${assignmentMode === "transfer" ? "text-orange-300" : "text-white/30"}`} />
                      <span className="text-sm font-black text-white">Wechsel</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-white/35">
                      Altes Team derselben Dartart wird beendet.
                    </p>
                  </button>
                </div>
              </div>

              {assignmentMode === "transfer" && selectedTargetTeam && (
                <div className="rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.055] px-3.5 py-3">
                  <div className="flex items-start gap-2.5">
                    <ArrowRightLeft className="mt-0.5 h-4 w-4 flex-none text-orange-300" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-orange-100">Wechsel-Vorschau</div>
                      {transferCandidates.length > 0 ? (
                        <div className="mt-1 text-xs leading-5 text-white/45">
                          {transferCandidates
                            .map((member) => teams.find((team) => team.id === member.team_id)?.name)
                            .filter(Boolean)
                            .join(", ")}
                          {" "}→ <span className="font-bold text-white/70">{selectedTargetTeam.name}</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs leading-5 text-white/40">
                          Kein anderes aktives Team derselben Dartart vorhanden. Die Ziel-Mannschaft wird normal aktiviert.
                        </div>
                      )}
                      <div className="mt-1 text-[11px] leading-4 text-white/30">
                        Mannschaften der anderen Dartart bleiben unverändert.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.045] text-[10px] font-black text-white/45">02</span>
                  <Label htmlFor="selectTeam" className="text-xs font-black uppercase tracking-[0.08em] text-white/55">
                    Ziel-Mannschaft
                  </Label>
                </div>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger
                    id="selectTeam"
                    className={cn(vv.select, "h-12")}
                  >
                    <SelectValue placeholder="Mannschaft auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <span>{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.dart_type === "edart" ? "· E-Dart" : team.dart_type === "steeldart" ? "· Steeldart" : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.045] text-[10px] font-black text-white/45">03</span>
                  <Label htmlFor="selectRole" className="text-xs font-black uppercase tracking-[0.08em] text-white/55">
                    Rolle
                  </Label>
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger
                    id="selectRole"
                    className={cn(vv.select, "h-12")}
                  >
                    <SelectValue placeholder="Rolle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Player">Spieler</SelectItem>
                    <SelectItem value="Co-Captain">Co-Kapitän</SelectItem>
                    <SelectItem value="Captain">Kapitän</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-3.5 py-3 text-xs leading-5 text-white/35">
                <div className="flex gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-300/70" />
                  <span>{assignmentMode === "transfer" ? "Beim Wechsel wird nur eine bestehende Zuordnung derselben Dartart beendet." : "Zusätzliche Zuordnung ist für die parallele Teilnahme in der anderen Dartart gedacht."}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={assignmentLoading}
                className={cn(vv.buttonPrimary, "h-12 w-full")}
              >
                {assignmentLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Wird gespeichert…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>{assignmentMode === "transfer" ? "Mannschaftswechsel speichern" : "Zuordnung speichern"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {assignmentMessage && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border p-3.5 text-sm font-bold",
            assignmentMessageType === "error"
              ? "border-rose-300/20 bg-rose-500/[0.08] text-rose-100"
              : assignmentMessageType === "success"
                ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100"
                : "border-white/[0.08] bg-white/[0.035] text-white/60",
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

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-500/[0.07]">
              <History className="h-4.5 w-4.5 text-violet-200" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-200/50">Historie</div>
              <h4 className="mt-0.5 text-xl font-black tracking-tight text-white">Mannschaftsverlauf</h4>
            </div>
          </div>

          {selectedPlayerId && (
            <button
              type="button"
              onClick={onRefreshAssignmentHistory}
              disabled={assignmentHistoryLoading}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-black text-white/45 transition hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${assignmentHistoryLoading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          )}
        </div>

        {!selectedPlayerId ? (
          <div className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018] px-4 py-7 text-center">
            <History className="mx-auto h-5 w-5 text-white/20" />
            <p className="mt-2 text-sm font-semibold text-white/35">
              Spieler auswählen, um den bisherigen Mannschaftsverlauf zu sehen.
            </p>
          </div>
        ) : assignmentHistoryLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-7 text-sm font-semibold text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Historie wird geladen…
          </div>
        ) : assignmentHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018] px-4 py-7 text-center text-sm font-semibold text-white/35">
            Noch keine Mannschaftshistorie vorhanden.
          </div>
        ) : (
          <div className="space-y-2.5">
            {assignmentHistory.map((entry, index) => {
              const isActive = !entry.left_at
              const dartLabel =
                entry.dart_type === "edart"
                  ? "E-Dart"
                  : entry.dart_type === "steeldart"
                    ? "Steeldart"
                    : "Dartart offen"

              return (
                <div
                  key={entry.id}
                  className="relative flex gap-3 rounded-[18px] border border-[#252c36] bg-[#10141b] px-3.5 py-3.5"
                >
                  <div className="relative flex w-6 flex-none justify-center">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                        isActive
                          ? "bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.08)]"
                          : "bg-white/20"
                      }`}
                    />
                    {index < assignmentHistory.length - 1 && (
                      <span className="absolute left-1/2 top-5 h-[calc(100%+10px)] w-px -translate-x-1/2 bg-white/[0.07]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{entry.team_name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/35">
                          <span>{dartLabel}</span>
                          {entry.role && entry.role !== "Player" && (
                            <>
                              <span className="text-white/15">•</span>
                              <span className="text-orange-200/65">
                                {entry.role === "Captain" ? "Kapitän" : entry.role === "Co-Captain" ? "Co-Kapitän" : entry.role}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                          isActive
                            ? "border-emerald-300/15 bg-emerald-500/[0.07] text-emerald-200/80"
                            : "border-white/[0.08] bg-white/[0.03] text-white/30"
                        }`}
                      >
                        {isActive ? "Aktiv" : "Beendet"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-white/30">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Seit {fmtHistoryDate(entry.joined_at)}
                      </span>
                      {entry.left_at && (
                        <span>Bis {fmtHistoryDate(entry.left_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-200/50">Mannschaften</div>
            <h4 className="mt-1 text-xl font-black tracking-tight text-white">Aktuelle Besetzung</h4>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black text-white/45">{teamMembers.length} Zuordnungen</div>
        </div>

        {teams.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/[0.10] bg-black/20 p-4 text-sm text-white/40">Noch keine Mannschaften zum Anzeigen.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => {
              const playersInTeam = getPlayersInTeam(team.id)

              return (
                <div key={team.id} className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 transition hover:-translate-y-0.5 hover:border-orange-300/[0.14] hover:bg-white/[0.04]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h5 className="font-black text-white">{team.name}</h5>
                      <div className="mt-0.5 text-xs font-bold text-white/35">
                        {team.dart_type === "edart" ? "E-Dart" : team.dart_type === "steeldart" ? "Steeldart" : "Dartart offen"}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/40">
                      {playersInTeam.length} Spieler
                    </div>
                  </div>

                  {playersInTeam.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/[0.08] bg-black/20 px-3 py-3 text-sm text-white/30">Keine Spieler in dieser Mannschaft.</p>
                  ) : (
                    <ul className="space-y-2">
                      {playersInTeam.map((member) => (
                        <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm text-white/75">
                          <span className="flex min-w-0 items-center gap-1.5 font-bold">
                            {member.player_name}
                            {member.role === "Captain" && <Crown className="h-3 w-3 text-amber-300" title="Kapitän" />}
                            {member.role === "Co-Captain" && (
                              <ShieldCheck className="h-3 w-3 text-sky-300" title="Co-Kapitän" />
                            )}
                            {member.role && member.role !== "Player" && (
                              <span className="text-xs text-white/35">({member.role})</span>
                            )}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRemove(member, team.name)}
                            disabled={assignmentLoading}
                            className="rounded-lg text-rose-300 hover:bg-rose-500/[0.10] hover:text-rose-200"
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
      </section>

      {removeOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
            onClick={() => !assignmentLoading && closeRemove()}
          />
          <div className="absolute inset-x-2 bottom-2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(480px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[26px] border border-[#2a323d] bg-[#090c11] text-white shadow-[0_32px_110px_-38px_rgba(0,0,0,.98)] sm:rounded-[28px]">
              <div className={vv.modalHeader}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-white">Spieler aus Mannschaft entfernen</h5>
                    <p className="text-sm text-white/55 mt-1">Der Spieler wird als „ausgetreten“ markiert.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => !assignmentLoading && closeRemove()}
                  >
                    <XCircle className="h-5 w-5 text-white/40" />
                    <span className="sr-only">Schließen</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/[0.07] p-3.5 text-sm text-rose-100">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Du bist dabei zu entfernen:</div>
                    <div className="mt-1">
                      <span className="font-medium">{removePlayerName}</span>{" "}
                      <span className="text-xs text-rose-200/70">aus {removeTeamName}</span>
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
                    className="h-11 rounded-xl border-white/[0.10] bg-black/25 text-white placeholder:text-white/25 focus:border-rose-400/40 focus:ring-rose-400/15"
                    autoFocus
                  />
                </div>
              </div>

              <div className={vv.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-white/[0.10] bg-white/[0.025] text-white/65 hover:bg-white/[0.06] hover:text-white"
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
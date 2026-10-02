"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  CheckCircle,
  Crown,
  Edit,
  Loader2,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Users,
  UserRoundCog,
  XCircle,
  Target,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"
import type { ClubPlayer, DartType, Team, TeamMember } from "@/components/vereinsverwaltung/types"
import type { TeamAssignmentHistoryEntry, TeamAssignmentMode } from "@/hooks/vereinsverwaltung/useTeamMembers"
import { AssignPlayerTab } from "./spieler-zuordnen"

type MessageType = "success" | "error" | "info"
type TeamSection = "teams" | "assignment"

type Props = {
  teams: Team[]
  teamMembers: TeamMember[]
  clubPlayers: ClubPlayer[]

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
  getPlayersInTeam: (teamId: string) => TeamMember[]
  assignmentHistory: TeamAssignmentHistoryEntry[]
  assignmentHistoryLoading: boolean
  onRefreshAssignmentHistory: () => void
}

export function ManageTeamsTab(props: Props) {
  const {
    teams,
    teamMembers,
    clubPlayers,
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
    getPlayersInTeam,
    assignmentHistory,
    assignmentHistoryLoading,
    onRefreshAssignmentHistory,
  } = props

  const [section, setSection] = useState<TeamSection>("teams")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)
  const [deleteTeamName, setDeleteTeamName] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const stats = useMemo(() => {
    const edart = teams.filter((team) => team.dart_type === "edart").length
    const steel = teams.filter((team) => team.dart_type === "steeldart").length
    return { teams: teams.length, edart, steel, assignments: teamMembers.length }
  }, [teams, teamMembers])

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

  function confirmDelete() {
    if (!deleteTeamId) return
    onDeleteTeam(deleteTeamId)
    closeDelete()
  }

  const canDelete = confirmText.trim().toUpperCase() === "LÖSCHEN"

  return (
    <div className="space-y-5 text-white">
      <section className={vv.surfaceLg}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[0.075] blur-3xl" />
          <div className="absolute -right-24 top-4 h-72 w-72 rounded-full bg-sky-500/[0.05] blur-3xl" />
        </div>

        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/[0.10]">
                <Users className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/55">Vereinsverwaltung</div>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Mannschaften</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">
                  Teams, Dartart und Besetzung zentral verwalten. Spielerzuweisungen und Wechsel bleiben nachvollziehbar in der Historie.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Teams", stats.teams],
                ["E-Dart", stats.edart],
                ["Steel", stats.steel],
                ["Zuordnungen", stats.assignments],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-[92px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/28">{label}</div>
                  <div className="mt-0.5 text-base font-black text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-[#232932] bg-[#080b0f] p-1.5">
        <button
          type="button"
          onClick={() => setSection("teams")}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-[17px] px-3 text-sm font-black transition",
            section === "teams"
              ? "border border-orange-300/20 bg-orange-500/[0.10] text-orange-100 shadow-[0_12px_30px_-24px_rgba(249,115,22,.55)]"
              : "border border-transparent text-white/38 hover:bg-white/[0.035] hover:text-white/70",
          )}
        >
          <Users className="h-4 w-4" />
          Mannschaften
        </button>
        <button
          type="button"
          onClick={() => setSection("assignment")}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-[17px] px-3 text-sm font-black transition",
            section === "assignment"
              ? "border border-sky-300/20 bg-sky-500/[0.09] text-sky-100 shadow-[0_12px_30px_-24px_rgba(56,189,248,.45)]"
              : "border border-transparent text-white/38 hover:bg-white/[0.035] hover:text-white/70",
          )}
        >
          <UserRoundCog className="h-4 w-4" />
          Spieler zuweisen
        </button>
      </div>

      {section === "teams" ? (
        <div className="space-y-5">
          <section className={cn(vv.surface, "p-4 sm:p-5")}>
            <div className="grid gap-5 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08]">
                    {editingTeamId ? <Edit className="h-4.5 w-4.5 text-orange-300" /> : <PlusCircle className="h-4.5 w-4.5 text-orange-300" />}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{editingTeamId ? "Mannschaft bearbeiten" : "Neue Mannschaft"}</div>
                    <div className="mt-0.5 text-xs text-white/35">Name, Dartart und Logo festlegen.</div>
                  </div>
                </div>

                <form onSubmit={submitTeamForm} className="space-y-4">
                  <div>
                    <Label htmlFor="newTeamName" className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-white/50">Mannschaftsname</Label>
                    <Input
                      id="newTeamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="z. B. Emoj!´s Steel"
                      className={cn(vv.input, "h-12")}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="teamDartType" className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-white/50">Dartart</Label>
                    <select
                      id="teamDartType"
                      value={newTeamDartType}
                      onChange={(e) => setNewTeamDartType(e.target.value as DartType | "")}
                      className={cn(vv.select, "h-12 w-full px-3.5")}
                      required
                    >
                      <option value="">Bitte auswählen</option>
                      <option value="edart">E-Dart</option>
                      <option value="steeldart">Steeldart</option>
                    </select>
                    <div className="mt-2 flex gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-[11px] leading-4 text-white/30">
                      <Target className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-300/60" />
                      Die Dartart steuert Liga-Paket, Zuweisung und Wechselregeln.
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="teamLogo" className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-white/50">Mannschaftslogo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="teamLogo"
                        type="file"
                        accept="image/*"
                        onChange={handleTeamLogoChange}
                        className="h-12 min-w-0 flex-1 rounded-2xl border-white/[0.09] bg-black/25 text-white/50 file:mr-3 file:rounded-xl file:border-0 file:bg-white/[0.06] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white/65 hover:file:bg-white/[0.09]"
                      />
                      {teamLogoPreview ? (
                        <div className="relative h-12 w-12 flex-none overflow-hidden rounded-2xl border border-white/[0.10] bg-black/25">
                          <Image src={teamLogoPreview} alt="Vorschau Teamlogo" fill className="object-cover" />
                          <button type="button" onClick={clearTeamLogo} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white/70 hover:text-white">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={teamLoading}
                      className={cn(vv.buttonPrimary, "h-12 flex-1")}
                    >
                      {teamLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingTeamId ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {teamLoading ? "Wird gespeichert…" : editingTeamId ? "Änderungen speichern" : "Mannschaft erstellen"}
                    </Button>
                    {editingTeamId ? (
                      <Button type="button" variant="outline" onClick={onCancelEdit} disabled={teamLoading} className={cn(vv.buttonSecondary, "h-12")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Abbrechen
                      </Button>
                    ) : null}
                  </div>
                </form>

                {teamMessage ? (
                  <div className={cn(
                    "mt-4 flex items-center gap-2 rounded-2xl border p-3.5 text-sm font-bold",
                    teamMessageType === "error"
                      ? "border-rose-300/20 bg-rose-500/[0.08] text-rose-100"
                      : teamMessageType === "success"
                        ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100"
                        : "border-white/[0.08] bg-white/[0.035] text-white/60",
                  )}>
                    {teamMessageType === "error" ? <AlertCircle className="h-4 w-4" /> : teamMessageType === "success" ? <CheckCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{teamMessage}</span>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/30">Aktuelle Teams</div>
                    <h4 className="mt-1 text-xl font-black tracking-tight text-white">Mannschaftsübersicht</h4>
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-xs font-black text-white/40">{teams.length} Teams</span>
                </div>

                {teams.length === 0 ? (
                  <div className="flex min-h-[260px] items-center justify-center rounded-[26px] border border-dashed border-white/[0.09] bg-white/[0.018] px-4 text-center">
                    <div>
                      <Users className="mx-auto h-6 w-6 text-white/20" />
                      <p className="mt-2 text-sm font-semibold text-white/35">Noch keine Mannschaften vorhanden.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {teams.map((team) => {
                      const members = getPlayersInTeam(team.id)
                      const captain = members.find((member) => member.role === "Captain")
                      const coCaptain = members.find((member) => member.role === "Co-Captain")

                      return (
                        <article key={team.id} className="group rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 transition hover:-translate-y-0.5 hover:border-orange-300/[0.14] hover:bg-white/[0.04]">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 flex-none rounded-2xl border border-white/[0.10] bg-black/25">
                              <AvatarImage src={team.logo_url || "/placeholder.svg?height=48&width=48&query=team-logo"} />
                              <AvatarFallback className="rounded-2xl bg-white/[0.04] font-black text-white/55">{team.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h5 className="truncate text-base font-black text-white">{team.name}</h5>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className={cn(
                                      "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
                                      team.dart_type === "steeldart"
                                        ? "border-sky-300/15 bg-sky-500/[0.07] text-sky-200/80"
                                        : "border-orange-300/15 bg-orange-500/[0.07] text-orange-200/80",
                                    )}>
                                      {team.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                                    </span>
                                    <span className="text-[11px] font-bold text-white/30">{members.length} Spieler</span>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => onEditTeam(team)} disabled={teamLoading} className={vv.iconButton}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => openDelete(team)} disabled={teamLoading} className={cn(vv.iconButton, "hover:border-rose-400/25 hover:text-rose-200")}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><Crown className="h-3 w-3 text-amber-300/70" /> Kapitän</div>
                              <div className="mt-1 truncate text-xs font-bold text-white/60">{captain?.player_name || "Nicht festgelegt"}</div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><ShieldCheck className="h-3 w-3 text-sky-300/70" /> Co-Kapitän</div>
                              <div className="mt-1 truncate text-xs font-bold text-white/60">{coCaptain?.player_name || "Nicht festgelegt"}</div>
                            </div>
                          </div>

                          <div className="mt-3">
                            {members.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/[0.07] bg-black/15 px-3 py-3 text-xs font-semibold text-white/25">Noch keine Spieler zugeordnet.</div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {members.slice(0, 6).map((member) => (
                                  <span key={member.id} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-white/45">{member.player_name}</span>
                                ))}
                                {members.length > 6 ? <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-black text-white/30">+{members.length - 6}</span> : null}
                              </div>
                            )}
                          </div>

                          <button type="button" onClick={() => setSection("assignment")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs font-black text-white/45 transition hover:border-orange-300/[0.14] hover:bg-orange-500/[0.06] hover:text-orange-100">
                            <UserRoundCog className="h-3.5 w-3.5" />
                            Besetzung verwalten
                          </button>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <AssignPlayerTab
          clubPlayers={clubPlayers}
          teams={teams}
          teamMembers={teamMembers}
          getPlayersInTeam={getPlayersInTeam}
          selectedPlayerId={selectedPlayerId}
          setSelectedPlayerId={setSelectedPlayerId}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          currentSelectedPlayerTeam={currentSelectedPlayerTeam}
          currentSelectedPlayerRole={currentSelectedPlayerRole}
          assignmentLoading={assignmentLoading}
          assignmentMessage={assignmentMessage}
          assignmentMessageType={assignmentMessageType}
          onSubmitAssign={onSubmitAssign}
          onRemoveMember={onRemoveMember}
          assignmentHistory={assignmentHistory}
          assignmentHistoryLoading={assignmentHistoryLoading}
          onRefreshAssignmentHistory={onRefreshAssignmentHistory}
        />
      )}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" onClick={() => !teamLoading && closeDelete()} />
          <div className="absolute inset-x-2 bottom-2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(480px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[26px] border border-[#2a323d] bg-[#090c11] shadow-[0_32px_110px_-38px_rgba(0,0,0,.98)] sm:rounded-[28px]">
              <div className={vv.modalHeader}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-black text-white">Mannschaft löschen</h5>
                    <p className="mt-1 text-sm text-white/38">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                  </div>
                  <button type="button" onClick={() => !teamLoading && closeDelete()} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/35 hover:text-white">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className={cn(vv.modalBody, "space-y-4")}>
                <div className="flex gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/[0.07] p-3.5 text-sm text-rose-100">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 flex-none" />
                  <div>
                    <div className="font-black">Du löschst:</div>
                    <div className="mt-1 text-rose-100/70">{deleteTeamName}</div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmDelete" className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-white/45">Zur Bestätigung LÖSCHEN eingeben</Label>
                  <Input id="confirmDelete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="LÖSCHEN" className="h-11 rounded-xl border-white/[0.10] bg-black/25 text-white placeholder:text-white/20 focus:border-rose-400/40 focus:ring-rose-400/15" autoFocus />
                </div>
              </div>

              <div className={vv.modalFooter}>
                <Button type="button" variant="outline" onClick={() => !teamLoading && closeDelete()} disabled={teamLoading} className={cn(vv.buttonSecondary, "w-full flex-1")}>Abbrechen</Button>
                <Button type="button" variant="outline" onClick={confirmDelete} disabled={teamLoading || !canDelete} className={cn(vv.buttonDanger, "w-full flex-1")}>
                  {teamLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Endgültig löschen
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

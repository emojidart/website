"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Users,
  LayoutDashboard,
  ClipboardList,
  Hand,
  CalendarPlus,
  FolderOpen,
  UserPlus,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "./vereinsverwaltung-styles"
import { supabase } from "@/lib/supabase"

import type { ClubPlayerManagementProps } from "@/components/vereinsverwaltung/types"

import { useClubPlayers } from "@/hooks/vereinsverwaltung/useClubPlayers"
import { useTeams } from "@/hooks/vereinsverwaltung/useTeams"
import { useTeamMembers } from "@/hooks/vereinsverwaltung/useTeamMembers"

import { AddPlayerTab } from "./tabs/spieler-hinzufuegen"
import { ManagePlayersTab } from "./tabs/spieler-verwalten"
import { ManageTeamsTab } from "./tabs/teams-verwalten"
import { AdminMembershipManagement } from "./tabs/mitgliedschaften"
import { DocumentsTab } from "./tabs/dokumente"
import { InventoryTab } from "./tabs/inventar"
import { OverviewTab } from "./tabs/uebersicht"
import { JoinRequestsTab } from "./tabs/beitrittsanfragen"
import { GuestRequestsManagement } from "./gast-anfragen"

export function ClubPlayerTeamManagement({ user, onDataSaved }: ClubPlayerManagementProps) {
  const safeOnDataSaved = () => {
    try {
      onDataSaved?.()
    } catch (e) {
      console.error("onDataSaved error:", e)
    }
  }

  const [activeSection, setActiveSection] = useState<
    | "overview"
    | "guest-requests"
    | "join-requests"
    | "manage-players"
    | "manage-teams"
    | "membership"
    | "documents"
    | "inventory"
  >("overview")

  const players = useClubPlayers(user, safeOnDataSaved)
  const teams = useTeams(user, safeOnDataSaved)
  const members = useTeamMembers(user, safeOnDataSaved)


  const [unlinkedGuestCount, setPendingGuestRequestsCount] = useState(0)
  const [pendingJoinRequestsCount, setPendingJoinRequestsCount] = useState(0)

  const fetchUnlinkedGuestCount = useCallback(async () => {
    const [{ data: guests, error: guestError }, { data: memberRows, error: memberError }] =
      await Promise.all([
        supabase
          .from("guest_requests")
          .select("id")
          .eq("status", "approved")
          .is("linked_spieldatenbank_id", null),
        supabase.rpc("get_guest_member_status_for_admin"),
      ])

    if (guestError) {
      console.warn("Gäste-Verknüpfungs-Badge konnte nicht geladen werden:", guestError)
      return
    }

    if (memberError) {
      console.warn("Vereinsmitgliedsstatus für Gäste konnte nicht geladen werden:", memberError)
      return
    }

    const memberGuestIds = new Set(
      (memberRows || []).map((row: any) => String(row.guest_request_id)),
    )

    const trulyUnlinked = (guests || []).filter(
      (guest: any) => !memberGuestIds.has(String(guest.id)),
    )

    setUnlinkedGuestCount(trulyUnlinked.length)
  }, [])

  const fetchPendingJoinRequestsCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("club_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    if (error) {
      console.warn("Beitrittsanfragen-Badge konnte nicht geladen werden:", error)
      return
    }

    setPendingJoinRequestsCount(count || 0)
  }, [])

  useEffect(() => {
    void fetchUnlinkedGuestCount()

    const onGuestRequestsChanged = () => {
      void fetchUnlinkedGuestCount()
    }

    window.addEventListener("emd:guest-requests-changed", onGuestRequestsChanged)

    const channel = supabase
      .channel("club_guest_requests_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_requests" },
        () => void fetchUnlinkedGuestCount(),
      )
      .subscribe()

    return () => {
      window.removeEventListener("emd:guest-requests-changed", onGuestRequestsChanged)
      void supabase.removeChannel(channel)
    }
  }, [fetchUnlinkedGuestCount])

  useEffect(() => {
    void fetchPendingJoinRequestsCount()

    const channel = supabase
      .channel("club_join_requests_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_join_requests" },
        () => void fetchPendingJoinRequestsCount(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchPendingJoinRequestsCount])

  useEffect(() => {
    members.syncSelectedPlayerMeta(teams.teams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.selectedPlayerId, members.teamMembers, teams.teams])

  return (
    <div className={vv.page}>
      <div className={vv.content}>
        <div className="emd-admin-hero">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/45">Mein EMD · Verwaltung</div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-[30px]">Vereinsverwaltung</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/38">Mitglieder, Mannschaften und Vereinsorganisation zentral verwalten.</p>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Mitglieder</div>
                <div className="mt-0.5 text-sm font-black text-white">{players.clubPlayers.length}</div>
              </div>
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Mannschaften</div>
                <div className="mt-0.5 text-sm font-black text-white">{teams.teams.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("sticky top-0 z-20 -mx-3 mb-5 px-3 py-2.5 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7 xl:-mx-8 xl:px-8", vv.navBar)}>
          <div className="mx-auto flex max-w-[var(--emd-content-max)] gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className={cn(
                vv.navItem,
                activeSection === "overview"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <LayoutDashboard className={cn("h-4 w-4", activeSection === "overview" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Übersicht</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("guest-requests")}
              className={cn(
                vv.navItem,
                activeSection === "guest-requests"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <Users className={cn("h-4 w-4", activeSection === "guest-requests" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Gäste & Zuordnung</span>
                {unlinkedGuestCount > 0 ? (
                  <span className="ml-1 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-black text-cyan-200">{unlinkedGuestCount}</span>
                ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("join-requests")}
              className={cn(
                vv.navItem,
                activeSection === "join-requests"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <UserPlus className={cn("h-4 w-4", activeSection === "join-requests" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Beitrittsanfragen</span>
                {pendingJoinRequestsCount > 0 ? (
                  <span className="ml-1 rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-black text-orange-200">{pendingJoinRequestsCount}</span>
                ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("manage-players")}
              className={cn(
                vv.navItem,
                activeSection === "manage-players"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <ClipboardList className={cn("h-4 w-4", activeSection === "manage-players" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Spieler</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("manage-teams")}
              className={cn(
                vv.navItem,
                activeSection === "manage-teams"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <Hand className={cn("h-4 w-4", activeSection === "manage-teams" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Mannschaften</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("membership")}
              className={cn(
                vv.navItem,
                activeSection === "membership"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <CalendarPlus className={cn("h-4 w-4", activeSection === "membership" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Mitgliedschaften</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("documents")}
              className={cn(
                vv.navItem,
                activeSection === "documents"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <FolderOpen className={cn("h-4 w-4", activeSection === "documents" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Dokumente</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("inventory")}
              className={cn(
                vv.navItem,
                activeSection === "inventory"
                  ? vv.navActive
                  : vv.navIdle,
              )}
            >
              <FolderOpen className={cn("h-4 w-4", activeSection === "inventory" ? "text-orange-300" : "text-white/28 group-hover:text-white/55")} />
              <span className="whitespace-nowrap">Inventar</span>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {activeSection === "overview" && <OverviewTab clubPlayers={players.clubPlayers} />}


{unlinkedGuestCount > 0 && activeSection !== "guest-requests" ? (
  <button
    type="button"
    onClick={() => setActiveSection("guest-requests")}
    className="flex w-full items-start gap-3 rounded-[22px] border border-cyan-300/15 bg-cyan-500/[0.055] p-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-500/[0.075]"
  >
    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
    <div className="min-w-0 flex-1">
      <div className="font-black text-cyan-100">
        {unlinkedGuestCount} {unlinkedGuestCount === 1 ? "Gast ohne Verknüpfung" : "Gäste ohne Verknüpfung"}
      </div>
      <div className="mt-1 text-sm font-semibold text-cyan-100/60">
        Gastkonten sind bereits aktiv. Hier fehlt nur noch die Spieler-Zuordnung.
      </div>
    </div>
    <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-100">Öffnen</span>
  </button>
) : null}

{pendingJoinRequestsCount > 0 && activeSection !== "join-requests" ? (
  <button
    type="button"
    onClick={() => setActiveSection("join-requests")}
    className="flex w-full items-start gap-3 rounded-[22px] border border-orange-300/15 bg-orange-500/[0.055] p-4 text-left transition hover:border-orange-300/25 hover:bg-orange-500/[0.075]"
  >
    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-200" />
    <div className="min-w-0 flex-1">
      <div className="font-black text-orange-100">
        {pendingJoinRequestsCount} offene {pendingJoinRequestsCount === 1 ? "Beitrittsanfrage" : "Beitrittsanfragen"}
      </div>
      <div className="mt-1 text-sm font-semibold text-orange-100/60">
        Bitte prüfen – Gäste werden erst nach deiner Bestätigung zu Vereinsmitgliedern.
      </div>
    </div>
    <span className="rounded-full border border-orange-300/15 bg-orange-400/10 px-2.5 py-1 text-xs font-black text-orange-100">Öffnen</span>
  </button>
) : null}

{activeSection === "guest-requests" && (
  <div className="min-w-0 max-w-full overflow-hidden">
    <GuestRequestsManagement />
  </div>
)}

{activeSection === "join-requests" && (
  <div className="min-w-0 max-w-full overflow-hidden">
    <JoinRequestsTab
    user={user}
    onPendingCountChange={setPendingJoinRequestsCount}
    onDataChanged={async () => {
      await players.fetchClubPlayers()
      await members.fetchTeamMembers()
      await Promise.all([
        fetchUnlinkedGuestCount(),
        fetchPendingJoinRequestsCount(),
      ])
      safeOnDataSaved()
    }}
    />
  </div>
)}

          {activeSection === "manage-players" && (
            <ManagePlayersTab
              visiblePlayers={players.visiblePlayers}
              clubPlayersCount={players.clubPlayers.length}
              playerLoading={players.playerLoading}
              teams={teams.teams}
              teamMembers={members.teamMembers}
              playerSearch={players.playerSearch}
              setPlayerSearch={players.setPlayerSearch}
              playerSortKey={players.playerSortKey}
              setPlayerSortKey={players.setPlayerSortKey}
              playerSortDir={players.playerSortDir}
              setPlayerSortDir={players.setPlayerSortDir}
              onEditPlayer={(p) => {
                players.beginEditPlayer(p)
              }}
              onDeactivatePlayer={(id) =>
                players.deactivatePlayer(id, async () => {
                  await members.fetchTeamMembers()
                })
              }
              onReactivatePlayer={(id) =>
                players.reactivatePlayer(id, async () => {
                  await members.fetchTeamMembers()
                })
              }
              onDataChanged={async () => {
                await players.fetchClubPlayers()
                await members.fetchTeamMembers()
              }}
            />
          )}

          {activeSection === "manage-teams" && (
            <ManageTeamsTab
              teams={teams.teams}
              teamMembers={members.teamMembers}
              clubPlayers={players.clubPlayers}
              teamLoading={teams.teamLoading}
              teamMessage={teams.teamMessage}
              teamMessageType={teams.teamMessageType}
              newTeamName={teams.newTeamName}
              setNewTeamName={teams.setNewTeamName}
              newTeamDartType={teams.newTeamDartType}
              setNewTeamDartType={teams.setNewTeamDartType}
              teamLogoPreview={teams.teamLogoPreview}
              handleTeamLogoChange={teams.handleTeamLogoChange}
              clearTeamLogo={() => {
                teams.setTeamLogoPreview(null)
                teams.setTeamLogoFile(null)
              }}
              editingTeamId={teams.editingTeamId}
              submitTeamForm={teams.submitTeamForm}
              onEditTeam={teams.beginEditTeam}
              onCancelEdit={teams.cancelTeamEdit}
              onDeleteTeam={(teamId) =>
                teams.deleteTeam(teamId, async () => {
                  await members.fetchTeamMembers()
                })
              }
              selectedPlayerId={members.selectedPlayerId}
              setSelectedPlayerId={members.setSelectedPlayerId}
              selectedTeamId={members.selectedTeamId}
              setSelectedTeamId={members.setSelectedTeamId}
              selectedRole={members.selectedRole}
              setSelectedRole={members.setSelectedRole}
              currentSelectedPlayerTeam={members.currentSelectedPlayerTeam}
              currentSelectedPlayerRole={members.currentSelectedPlayerRole}
              assignmentLoading={members.assignmentLoading}
              assignmentMessage={members.assignmentMessage}
              assignmentMessageType={members.assignmentMessageType}
              onSubmitAssign={members.assignPlayerToTeam}
              onRemoveMember={members.removeTeamMember}
              getPlayersInTeam={members.getPlayersInTeam}
              assignmentHistory={members.assignmentHistory}
              assignmentHistoryLoading={members.assignmentHistoryLoading}
              onRefreshAssignmentHistory={() => members.fetchAssignmentHistory(members.selectedPlayerId)}
            />
          )}

          {activeSection === "membership" && <AdminMembershipManagement user={user} />}

          {activeSection === "documents" && <DocumentsTab user={user} />}

          {activeSection === "inventory" && <InventoryTab user={user} />}



        <Dialog
          open={Boolean(players.editingPlayerId)}
          onOpenChange={(open) => {
            if (!open && !players.playerLoading) players.cancelPlayerEdit()
          }}
        >
          <DialogContent className={cn(vv.modal, "max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh]")}>
            <DialogHeader className="sr-only">
              <DialogTitle>Spieler bearbeiten</DialogTitle>
            </DialogHeader>
            <AddPlayerTab
              editingPlayerId={players.editingPlayerId}
              playerName={players.playerName}
              setPlayerName={players.setPlayerName}
              playerPhotoPreview={players.playerPhotoPreview}
              onPhotoChange={players.handlePlayerPhotoChange}
              onRemovePhoto={() => {
                players.setPlayerPhotoPreview(null)
                players.setPlayerPhotoFile(null)
              }}
              playerStreet={players.playerStreet}
              setPlayerStreet={players.setPlayerStreet}
              playerHouseNumber={players.playerHouseNumber}
              setPlayerHouseNumber={players.setPlayerHouseNumber}
              playerPostalCode={players.playerPostalCode}
              setPlayerPostalCode={players.setPlayerPostalCode}
              playerCity={players.playerCity}
              setPlayerCity={players.setPlayerCity}
              playerBirthdate={players.playerBirthdate}
              setPlayerBirthdate={players.setPlayerBirthdate}
              playerNumber={players.playerNumber}
              setPlayerNumber={players.setPlayerNumber}
              playerJerseySize={players.playerJerseySize}
              setPlayerJerseySize={players.setPlayerJerseySize}
              playerEmail={players.playerEmail}
              setPlayerEmail={players.setPlayerEmail}
              playerPhone={players.playerPhone}
              setPlayerPhone={players.setPlayerPhone}
              playerIban={players.playerIban}
              setPlayerIban={players.setPlayerIban}
              playerLoading={players.playerLoading}
              playerMessage={players.playerMessage}
              playerMessageType={players.playerMessageType}
              onSubmit={players.submitPlayerForm}
              onCancelEdit={players.cancelPlayerEdit}
            />
          </DialogContent>
        </Dialog>

        </div>
      </div>
    </div>
  )
}
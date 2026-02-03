"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  UserRoundPlus,
  ClipboardList,
  Hand,
  UserRoundCog,
  CalendarPlus,
  CreditCard,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

import type { ClubPlayerManagementProps } from "@/components/vereinsverwaltung/types"

import { useClubPlayers } from "@/hooks/vereinsverwaltung/useClubPlayers"
import { useTeams } from "@/hooks/vereinsverwaltung/useTeams"
import { useTeamMembers } from "@/hooks/vereinsverwaltung/useTeamMembers"
import { useDues } from "@/hooks/vereinsverwaltung/useDues"

import { AddPlayerTab } from "@/components/vereinsverwaltung/tabs/AddPlayerTab"
import { ManagePlayersTab } from "@/components/vereinsverwaltung/tabs/ManagePlayersTab"
import { ManageTeamsTab } from "@/components/vereinsverwaltung/tabs/ManageTeamsTab"
import { AssignPlayerTab } from "@/components/vereinsverwaltung/tabs/AssignPlayerTab"
import { MembershipTab } from "@/components/vereinsverwaltung/tabs/MembershipTab"
import { DuesTab } from "@/components/vereinsverwaltung/tabs/DuesTab"
import { DocumentsTab } from "@/components/vereinsverwaltung/tabs/DocumentsTab"

export function ClubPlayerTeamManagement({ user, onDataSaved }: ClubPlayerManagementProps) {
  const [activeSection, setActiveSection] = useState<
    "add-player" | "manage-players" | "manage-teams" | "assign-player" | "membership" | "dues" | "documents"
  >("add-player")

  const players = useClubPlayers(user, onDataSaved)
  const teams = useTeams(user, onDataSaved)
  const members = useTeamMembers(user, onDataSaved)

  // ✅ NEU: Beiträge Hook
  const dues = useDues(user, players.clubPlayers, onDataSaved)

  useEffect(() => {
    members.syncSelectedPlayerMeta(teams.teams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.selectedPlayerId, members.teamMembers, teams.teams])

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="border-gray-200 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-5">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vereinsverwaltung: Spieler & Mannschaften
          </CardTitle>
          <CardDescription className="text-orange-100">
            Spieler anlegen, bearbeiten, Mannschaften verwalten und Spieler zuweisen.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Navigation Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <Button
              variant={activeSection === "add-player" ? "default" : "outline"}
              onClick={() => setActiveSection("add-player")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "add-player"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <UserRoundPlus className="h-4 w-4 mr-2" />
              Spieler hinzufügen
            </Button>

            <Button
              variant={activeSection === "manage-players" ? "default" : "outline"}
              onClick={() => setActiveSection("manage-players")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "manage-players"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Spieler verwalten
            </Button>

            <Button
              variant={activeSection === "manage-teams" ? "default" : "outline"}
              onClick={() => setActiveSection("manage-teams")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "manage-teams"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <Hand className="h-4 w-4 mr-2" />
              Mannschaften verwalten
            </Button>

            <Button
              variant={activeSection === "assign-player" ? "default" : "outline"}
              onClick={() => setActiveSection("assign-player")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "assign-player"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <UserRoundCog className="h-4 w-4 mr-2" />
              Spieler zuweisen
            </Button>

            <Button
              variant={activeSection === "membership" ? "default" : "outline"}
              onClick={() => setActiveSection("membership")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "membership"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Mitgliedschaft
            </Button>

            {/* ✅ NEU */}
            <Button
              variant={activeSection === "dues" ? "default" : "outline"}
              onClick={() => setActiveSection("dues")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "dues"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Beiträge
            </Button>

            {/* ✅ NEU: Dokumente */}
            <Button
              variant={activeSection === "documents" ? "default" : "outline"}
              onClick={() => setActiveSection("documents")}
              className={cn(
                "h-10 rounded-lg font-medium shadow-sm transition",
                activeSection === "documents"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Dokumente
            </Button>
          </div>

          {/* Tabs */}
          {activeSection === "add-player" && (
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
          )}

          {activeSection === "manage-players" && (
            <ManagePlayersTab
              visiblePlayers={players.visiblePlayers}
              clubPlayersCount={players.clubPlayers.length}
              playerLoading={players.playerLoading}
              playerSearch={players.playerSearch}
              setPlayerSearch={players.setPlayerSearch}
              playerSortKey={players.playerSortKey}
              setPlayerSortKey={players.setPlayerSortKey}
              playerSortDir={players.playerSortDir}
              setPlayerSortDir={players.setPlayerSortDir}
              onEditPlayer={(p) => {
                players.beginEditPlayer(p)
                setActiveSection("add-player")
              }}
              onDeletePlayer={(id, url) =>
                players.deletePlayer(id, url, async () => {
                  await members.fetchTeamMembers()
                })
              }
            />
          )}

          {activeSection === "manage-teams" && (
            <ManageTeamsTab
              teams={teams.teams}
              teamMembers={members.teamMembers}
              teamLoading={teams.teamLoading}
              teamMessage={teams.teamMessage}
              teamMessageType={teams.teamMessageType}
              newTeamName={teams.newTeamName}
              setNewTeamName={teams.setNewTeamName}
              teamLogoPreview={teams.teamLogoPreview}
              onLogoChange={teams.handleTeamLogoChange}
              onRemoveLogo={() => {
                teams.setTeamLogoPreview(null)
                teams.setTeamLogoFile(null)
              }}
              editingTeamId={teams.editingTeamId}
              onSubmit={teams.submitTeamForm}
              onEditTeam={teams.beginEditTeam}
              onCancelEdit={teams.cancelTeamEdit}
              onDeleteTeam={(teamId) =>
                teams.deleteTeam(teamId, async () => {
                  await members.fetchTeamMembers()
                })
              }
            />
          )}

          {activeSection === "assign-player" && (
            <AssignPlayerTab
              clubPlayers={players.clubPlayers}
              teams={teams.teams}
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
              getPlayersInTeam={members.getPlayersInTeam}
              onRemoveMember={members.removeTeamMember}
            />
          )}

          {activeSection === "membership" && (
            <MembershipTab
              clubPlayers={players.clubPlayers}
              loading={players.playerLoading}
              message={players.playerMessage}
              messageType={players.playerMessageType}
              onSave={players.updateMembershipDates}
            />
          )}

          {/* ✅ NEU: Beiträge */}
          {activeSection === "dues" && (
            <DuesTab
              summaryRows={dues.summaryRows}
              periodsByPlayer={dues.periodsByPlayer}
              loading={dues.loading}
              message={dues.message}
              messageType={dues.messageType}
              onSaveSetting={dues.upsertSetting}
              onMarkPaid={dues.markPaid}
              onResetPaid={dues.resetPaid}
            />
          )}

          {/* ✅ NEU: Dokumente */}
          {activeSection === "documents" && <DocumentsTab user={user} />}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Crown, ShieldCheck, Users, Target, Hand, Trash2, Loader2 } from "lucide-react"
import { CaptainPlayerManagement } from "@/components/captain-player-management"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

interface TeamMembership {
  id: string
  team_id: string
  role: string | null
  joined_at?: string | null
  left_at?: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
    dart_type: "edart" | "steeldart"
  } | null
}

interface TeamMember {
  id: string
  team_id: string
  player_id: string
  role: string | null
  joined_at?: string | null
  left_at?: string | null
  club_players: {
    id: string
    name: string
    photo_url: string | null
    throwing_hand: string | null
    age: number | null
    origin: string | null
  } | null
}

export default function MeineTeamsAppPage() {
  const { session, loading: authLoading } = useAuth()
  const {
    loading: membershipLoading,
    hasModule,
  } = useMembershipAccess()

  const canSeeEDart = hasModule("edart_league")
  const canSeeSteeldart = hasModule("steeldart_league")

  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showFormerMembers, setShowFormerMembers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{
    memberRowId: string
    teamId: string
    targetPlayerId: string
    playerName: string
    teamName: string
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user && !membershipLoading) {
      fetchTeamData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, showFormerMembers, membershipLoading, canSeeEDart, canSeeSteeldart])

  const fetchTeamData = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url, throwing_hand, age, origin)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      if (profileData?.player_id) {
        let membershipQuery = supabase
          .from("team_members")
          .select(`id, team_id, role, joined_at, left_at, teams (id, name, logo_url, dart_type)`)
          .eq("player_id", profileData.player_id)

        if (!showFormerMembers) {
          membershipQuery = membershipQuery.is("left_at", null)
        }

        const { data: teamData, error: teamError } = await membershipQuery
        if (teamError) throw teamError

        const visibleTeamData = (teamData || []).filter((membership: any) => {
          const dartType = membership.teams?.dart_type

          if (dartType === "edart") return canSeeEDart
          if (dartType === "steeldart") return canSeeSteeldart

          return false
        })

        setTeamMemberships(visibleTeamData)

        if (visibleTeamData.length > 0) {
          const teamIds = visibleTeamData.map((team: any) => team.team_id)

          let membersQuery = supabase
            .from("team_members")
            .select(
              `id, team_id, player_id, role, joined_at, left_at, club_players:club_players!team_members_player_id_fkey (id, name, photo_url, throwing_hand, age, origin)`,
            )
            .in("team_id", teamIds)
            .order("role", { ascending: false })

          if (!showFormerMembers) {
            membersQuery = membersQuery.is("left_at", null)
          }

          const { data: membersData, error: membersError } = await membersQuery
          if (membersError) throw membersError
          setTeamMembers(membersData || [])
        } else {
          setTeamMembers([])
        }
      }
    } catch (err: any) {
      console.error("Error fetching team data:", err)
      setError("Fehler beim Laden der Team-Daten")
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
      default:
        return <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
    }
  }

  const getRoleText = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "border-yellow-500 text-yellow-700 bg-yellow-50"
      case "Co-Captain":
        return "border-blue-500 text-blue-700 bg-blue-50"
      default:
        return "border-orange-500 text-orange-700 bg-orange-50"
    }
  }

  const myRoleByTeamId = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const m of teamMemberships) map.set(m.team_id, m.role)
    return map
  }, [teamMemberships])

  const canManageTeam = (teamId: string) => {
    const role = myRoleByTeamId.get(teamId)
    return role === "Captain" || role === "Co-Captain"
  }

  const openRemoveDialog = (args: {
    memberRowId: string
    teamId: string
    targetPlayerId: string
    playerName: string
    teamName: string
  }) => {
    if (!profile?.player_id) return
    if (args.targetPlayerId === profile.player_id) return

    if (!canManageTeam(args.teamId)) {
      setError("Du hast keine Berechtigung, Spieler aus diesem Team zu entfernen.")
      return
    }

    setError(null)
    setRemoveTarget(args)
    setRemoveDialogOpen(true)
  }

  const confirmRemoveMember = async () => {
    if (!removeTarget) return

    try {
      setRemovingMemberId(removeTarget.memberRowId)
      setError(null)

      if (!canManageTeam(removeTarget.teamId)) {
        setError("Du hast keine Berechtigung, Spieler aus diesem Team zu entfernen.")
        return
      }

      const { data: alreadyData, error: alreadyErr } = await supabase
        .from("team_members")
        .select("id, left_at")
        .eq("player_id", removeTarget.targetPlayerId)
        .eq("team_id", removeTarget.teamId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (alreadyErr) throw alreadyErr

      const existing = alreadyData?.[0]
      if (existing?.left_at) {
        setError("Spieler ist bereits als ehemalig markiert.")
        setRemoveDialogOpen(false)
        setRemoveTarget(null)
        return
      }

      const { error: updError } = await supabase
        .from("team_members")
        .update({ left_at: new Date().toISOString() })
        .eq("player_id", removeTarget.targetPlayerId)
        .eq("team_id", removeTarget.teamId)
        .is("left_at", null)

      if (updError) throw updError

      setRemoveDialogOpen(false)
      setRemoveTarget(null)
      await fetchTeamData()
    } catch (err: any) {
      console.error("Error removing member:", err)
      setError("Fehler beim Entfernen des Spielers")
    } finally {
      setRemovingMemberId(null)
    }
  }

  if (authLoading || membershipLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Teams werden geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200/70 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-lg font-extrabold text-gray-900 mb-1">{error || "Profil nicht gefunden"}</h1>
            <p className="text-sm text-gray-500 mb-4">Bitte versuche es erneut oder gehe zurück.</p>
            <Button className="rounded-xl bg-orange-600 hover:bg-orange-700" onClick={() => router.push("/member-profile-app")}>
              Zurück zum Profil
            </Button>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  if (!canSeeEDart && !canSeeSteeldart) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header
          variant="app"
          title="Meine Teams"
          subtitle="E-Dart & Steeldart"
          backHref="/member-profile-app"
        />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <Card className="w-full max-w-xl overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-xl">
            <CardContent className="p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                <ShieldCheck className="h-7 w-7 text-orange-600" />
              </div>

              <h1 className="mt-4 text-xl font-black text-gray-900">
                Kein Liga-Paket gebucht
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-gray-600">
                Für deine Mannschaftsbereiche benötigst du mindestens das E-Dart- oder Steeldart-Liga-Paket.
              </p>

              <Button
                type="button"
                onClick={() => router.push("/member-membership")}
                className="mt-5 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
              >
                Paket buchen
              </Button>
            </CardContent>
          </Card>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

      {/*  */}
      {/*  */}
      <main className="pt-12 sm:pt-14">
  <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
        {/* */}
       
          {/* Page Header */}
          <div className="mb-4 rounded-3xl border border-gray-200/70 bg-white shadow-xl ring-1 ring-black/5 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Meine Teams</h1>
                <p className="text-sm sm:text-base text-gray-500">Übersicht deiner Teams und Teammitglieder</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {canSeeEDart ? (
              <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 text-orange-700">
                E-Dart freigeschaltet
              </Badge>
            ) : null}

            {canSeeSteeldart ? (
              <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-100 text-slate-700">
                Steeldart freigeschaltet
              </Badge>
            ) : null}

            {canSeeEDart && !canSeeSteeldart ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/member-membership")}
                className="rounded-full border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
              >
                Steeldart dazubuchen
              </Button>
            ) : null}

            {canSeeSteeldart && !canSeeEDart ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/member-membership")}
                className="rounded-full border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
              >
                E-Dart dazubuchen
              </Button>
            ) : null}
          </div>

          {/* Captain Player Management */}
          {profile?.player_id && (
            <div className="mb-4">
              <CaptainPlayerManagement onPlayerAdded={fetchTeamData} />
            </div>
          )}

          {/* Team Memberships */}
          <Card className="shadow-xl border-0 bg-white mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-extrabold">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                Meine Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamMemberships.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Du bist noch keinem Team zugeordnet.</p>
                  <p className="text-xs sm:text-sm mt-2">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {teamMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className={[
                        "rounded-2xl border bg-white ring-1 ring-black/5 shadow-sm p-4",
                        membership.left_at ? "opacity-60 bg-gray-50 border-gray-200" : "border-gray-200 hover:border-orange-300",
                        "transition-colors",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        {membership.teams?.logo_url ? (
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-lg">
                              {membership.teams.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-12 w-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                            <Target className="h-6 w-6 text-orange-600" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                            {membership.teams?.name || "Unbekanntes Team"}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              {getRoleIcon(membership.role)}
                              <Badge className={`text-xs border ${getRoleBadgeColor(membership.role)}`}>
                                {getRoleText(membership.role)}
                              </Badge>
                            </span>

                            <Badge
                              variant="outline"
                              className={
                                membership.teams?.dart_type === "steeldart"
                                  ? "text-xs border-slate-300 bg-slate-100 text-slate-700"
                                  : "text-xs border-orange-200 bg-orange-50 text-orange-700"
                              }
                            >
                              {membership.teams?.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                            </Badge>

                            {membership.left_at && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs border-gray-300 text-gray-600">
                                Ehemalig seit{" "}
                                {membership.left_at ? new Date(membership.left_at).toLocaleDateString("de-DE") : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-extrabold">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                Meine Teammitglieder
              </CardTitle>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={showFormerMembers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFormerMembers((v) => !v)}
                  className={[
                    "rounded-xl",
                    showFormerMembers ? "bg-orange-600 hover:bg-orange-700" : "border-gray-200 bg-white",
                  ].join(" ")}
                >
                  {showFormerMembers ? "Ehemalige: AN" : "Ehemalige: AUS"}
                </Button>
                <span className="text-xs text-gray-500">
                  {showFormerMembers ? "Zeigt aktive + entfernte Spieler (Historie)" : "Zeigt nur aktive Spieler"}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Keine Teammitglieder gefunden.</p>
                </div>
              ) : (
                <div className="space-y-5 sm:space-y-6">
                  {teamMemberships.map((membership) => {
                    const teamMembersForThisTeam = teamMembers.filter((member) => member.team_id === membership.team_id)
                    const canManage = canManageTeam(membership.team_id)

                    return (
                      <div key={membership.id} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                        <div className="mb-3 flex items-center gap-3">
                          {membership.teams?.logo_url ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                              <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-sm">
                                {membership.teams.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-10 w-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                              <Target className="h-5 w-5 text-orange-600" />
                            </div>
                          )}

                          <h3 className="flex-1 min-w-0 truncate font-extrabold text-base sm:text-lg text-gray-900">
                            {membership.teams?.name || "Unbekanntes Team"}
                          </h3>

                          <Badge variant="outline" className="text-xs border-gray-300 bg-white">
                            {teamMembersForThisTeam.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          {teamMembersForThisTeam.map((member) => {
                            const isMe = member.player_id === profile?.player_id
                            const showRemove = canManage && !isMe

                            return (
                              <div
                                key={member.id}
                                className={[
                                  "rounded-2xl border ring-1 ring-black/5 bg-white p-3",
                                  member.left_at
                                    ? "border-gray-200 opacity-60"
                                    : isMe
                                      ? "border-orange-300 bg-orange-50"
                                      : "border-gray-200",
                                ].join(" ")}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={
                                        member.club_players?.photo_url ||
                                        "/placeholder.svg?height=32&width=32&query=darts-player" ||
                                        "/placeholder.svg"
                                      }
                                    />
                                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                      {member.club_players?.name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                                      {member.club_players?.name || "Unbekannt"}
                                      {isMe && <span className="text-orange-600 ml-1">(Du)</span>}
                                      {member.left_at && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                                          Ehemalig seit {new Date(member.left_at).toLocaleDateString("de-DE")}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {getRoleIcon(member.role)}
                                      <span className="text-[10px] sm:text-xs text-gray-600">{getRoleText(member.role)}</span>
                                    </div>
                                  </div>

                                  {showRemove && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 rounded-xl border-gray-200 bg-white"
                                      disabled={!!removingMemberId}
                                      onClick={() =>
                                        openRemoveDialog({
                                          memberRowId: member.id,
                                          teamId: member.team_id,
                                          targetPlayerId: member.player_id,
                                          playerName: member.club_players?.name || "Unbekannt",
                                          teamName: membership.teams?.name || "Unbekanntes Team",
                                        })
                                      }
                                      title="Aus Team entfernen"
                                    >
                                      <Trash2 className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                </div>

                                {member.club_players?.throwing_hand && (
                                  <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                    <Hand className="h-3 w-3" />
                                    {member.club_players.throwing_hand}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <AlertDialog
            open={removeDialogOpen}
            onOpenChange={(open) => {
              if (removingMemberId) return
              setRemoveDialogOpen(open)
              if (!open) setRemoveTarget(null)
            }}
          >
            <AlertDialogContent className="sm:max-w-[450px] rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Spieler wirklich aus der Mannschaft entfernen?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeTarget ? (
                    <>
                      Du entfernst <span className="font-semibold">{removeTarget.playerName}</span> aus{" "}
                      <span className="font-semibold">{removeTarget.teamName}</span>.
                    </>
                  ) : (
                    ""
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel disabled={!!removingMemberId}>Abbrechen</AlertDialogCancel>

                <AlertDialogAction
                  disabled={!removeTarget || !!removingMemberId}
                  className="bg-red-600 hover:bg-red-700"
                  onClick={(e) => {
                    e.preventDefault()
                    confirmRemoveMember()
                  }}
                >
                  {removingMemberId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      Entferne...
                    </span>
                  ) : (
                    "Ja, entfernen"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
		   </div>
       
      </main>

      <MobileBottomNav />
    </div>
  )
}
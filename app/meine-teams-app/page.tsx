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
import { Crown, ShieldCheck, Users, Target, Trash2, Loader2 } from "lucide-react"
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
        return null
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
      <main className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
        <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-8 py-9 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)] sm:px-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-2xl animate-pulse" />
                <Loader2 className="relative h-10 w-10 animate-spin text-orange-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-950">Teams werden geladen</p>
                <p className="text-sm text-slate-500 mt-1">Bitte kurz warten…</p>
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
      <main className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
        <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200/70 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-950 mb-1">{error || "Profil nicht gefunden"}</h1>
            <p className="text-sm text-slate-500 mb-4">Bitte versuche es erneut oder gehe zurück.</p>
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
      <main className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
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

              <h1 className="mt-4 text-xl font-black text-slate-950">
                Kein Liga-Paket gebucht
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-600">
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
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
      <Header variant="app" title="Meine Teams" subtitle="Übersicht & Mitglieder" backHref="/member-profile-app" />

      {/*  */}
      {/*  */}
      <main className="w-full pt-14 sm:pt-16">
  <div className="w-full max-w-none px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
        {/* */}
       
          {/* Page Header */}
          <section className="relative mb-4 overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:mb-5 sm:rounded-[28px] xl:rounded-[30px]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Mannschaften
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-orange-400 sm:h-14 sm:w-14">
                      <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/50">Deine Teams auf einen Blick</p>
                      <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Meine Teams</h1>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                    Teams, Rollen und Mitglieder übersichtlich an einem Ort.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-end">
                  <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Teams</div>
                      <div className="mt-2 text-2xl font-black text-white sm:text-3xl">{teamMemberships.length}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:p-4">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Mitglieder</div>
                      <div className="mt-2 text-2xl font-black text-white sm:text-3xl">{teamMembers.length}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/member-profile-app")}
                    className="h-11 w-full rounded-xl border-white/10 bg-white/10 px-4 font-black text-white shadow-none hover:bg-white/15 hover:text-white sm:w-auto"
                  >
                    Zurück zum Profil
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_44px_-34px_rgba(15,23,42,0.5)] sm:mb-5 sm:rounded-[26px]">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Liga-Zugriff</div>
                <div className="mt-1 text-sm font-black text-slate-950">Freigeschaltete Bereiche</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canSeeEDart ? (
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-700">
                    E-Dart freigeschaltet
                  </Badge>
                ) : null}

                {canSeeSteeldart ? (
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-700">
                    Steeldart freigeschaltet
                  </Badge>
                ) : null}

                {canSeeEDart && !canSeeSteeldart ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/member-membership")}
                    className="h-9 rounded-full border-orange-200 bg-orange-50 px-3 font-bold text-orange-700 hover:bg-orange-100"
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
                    className="h-9 rounded-full border-orange-200 bg-orange-50 px-3 font-bold text-orange-700 hover:bg-orange-100"
                  >
                    E-Dart dazubuchen
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          {/* Captain Player Management */}
          {profile?.player_id && (
            <div className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.5)] sm:mb-5 sm:rounded-[28px]">
              <CaptainPlayerManagement onPlayerAdded={fetchTeamData} />
            </div>
          )}

          {/* Team Memberships */}
          <section className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] sm:mb-5 sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Deine Mannschaften</div>
                  <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Meine Teams</h2>
                </div>
              </div>

              <div className="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white">
                {teamMemberships.length}
              </div>
            </div>

            <div className="p-3 sm:p-5 lg:p-6">
              {teamMemberships.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <Users className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="mt-4 text-sm font-black text-slate-700 sm:text-base">Du bist noch keinem Team zugeordnet.</p>
                  <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {teamMemberships.map((membership) => (
                    <article
                      key={membership.id}
                      className={[
                        "group relative overflow-hidden rounded-[22px] border bg-white shadow-[0_14px_42px_-34px_rgba(15,23,42,0.55)] transition-all",
                        membership.left_at
                          ? "border-slate-200 bg-slate-50/70 opacity-65"
                          : "border-slate-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_20px_54px_-34px_rgba(15,23,42,0.5)]",
                      ].join(" ")}
                    >
                      <div className="h-1 w-full bg-slate-950" />

                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3.5">
                          {membership.teams?.logo_url ? (
                            <Avatar className="h-14 w-14 shrink-0 ring-1 ring-slate-200">
                              <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                              <AvatarFallback className="bg-orange-50 text-lg font-black text-orange-700">
                                {membership.teams.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                              <Target className="h-6 w-6 text-orange-600" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              {membership.teams?.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                            </div>
                            <h3 className="mt-1 break-words text-lg font-black leading-tight tracking-tight text-slate-950">
                              {membership.teams?.name || "Unbekanntes Team"}
                            </h3>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Rolle</div>
                            <div className="mt-2 flex items-center gap-2">
                              {getRoleIcon(membership.role)}
                              <span className="text-sm font-black text-slate-800">{getRoleText(membership.role)}</span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Dartart</div>
                            <div className="mt-2 text-sm font-black text-slate-800">
                              {membership.teams?.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                            </div>
                          </div>
                        </div>

                        {membership.left_at && (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-500">
                            Ehemalig seit {new Date(membership.left_at).toLocaleDateString("de-DE")}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Team Members */}
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] sm:rounded-[30px]">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Kader</div>
                    <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Meine Teammitglieder</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant={showFormerMembers ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFormerMembers((v) => !v)}
                    className={[
                      "h-10 rounded-xl px-4 font-black shadow-none",
                      showFormerMembers
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {showFormerMembers ? "Ehemalige: AN" : "Ehemalige: AUS"}
                  </Button>
                  <span className="text-xs font-medium text-slate-400">
                    {showFormerMembers ? "Zeigt aktive + entfernte Spieler (Historie)" : "Zeigt nur aktive Spieler"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-5 lg:p-6">
              {teamMembers.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                  <Users className="h-6 w-6 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-700 sm:text-base">Keine Teammitglieder gefunden.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {teamMemberships.map((membership) => {
                    const teamMembersForThisTeam = teamMembers.filter((member) => member.team_id === membership.team_id)
                    const canManage = canManageTeam(membership.team_id)

                    return (
                      <section key={membership.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3.5 py-3.5 sm:px-4">
                          {membership.teams?.logo_url ? (
                            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-slate-200">
                              <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                              <AvatarFallback className="bg-orange-50 text-sm font-black text-orange-700">
                                {membership.teams.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                              <Target className="h-5 w-5 text-orange-600" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              {membership.teams?.dart_type === "steeldart" ? "Steeldart-Team" : "E-Dart-Team"}
                            </div>
                            <h3 className="mt-0.5 break-words text-base font-black leading-tight text-slate-950 sm:text-lg">
                              {membership.teams?.name || "Unbekanntes Team"}
                            </h3>
                          </div>

                          <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-950 px-2.5 text-xs font-black text-white">
                            {teamMembersForThisTeam.length}
                          </div>
                        </div>

                        <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                          {teamMembersForThisTeam.map((member) => {
                            const isMe = member.player_id === profile?.player_id
                            const showRemove = canManage && !isMe

                            return (
                              <article
                                key={member.id}
                                className={[
                                  "group relative overflow-hidden rounded-[18px] border bg-white p-3.5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)]",
                                  member.left_at
                                    ? "border-slate-200 opacity-60"
                                    : isMe
                                      ? "border-orange-200 ring-1 ring-orange-100"
                                      : "border-slate-200 hover:border-slate-300",
                                ].join(" ")}
                              >
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-11 w-11 shrink-0 ring-1 ring-slate-200">
                                    <AvatarImage
                                      src={
                                        member.club_players?.photo_url ||
                                        "/placeholder.svg?height=32&width=32&query=darts-player" ||
                                        "/placeholder.svg"
                                      }
                                    />
                                    <AvatarFallback className="bg-orange-50 text-sm font-black text-orange-700">
                                      {member.club_players?.name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="min-w-0 flex-1">
                                    <div className="break-words text-sm font-black leading-snug text-slate-950">
                                      {member.club_players?.name || "Unbekannt"}
                                      {isMe && <span className="ml-1 text-orange-600">(Du)</span>}
                                    </div>

                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-none">
                                        {getRoleIcon(member.role)}
                                        {getRoleText(member.role)}
                                      </span>

                                      {member.left_at && (
                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
                                          Ehemalig seit {new Date(member.left_at).toLocaleDateString("de-DE")}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {showRemove && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 shrink-0 rounded-xl border-slate-200 bg-white p-0 shadow-none hover:border-red-200 hover:bg-red-50"
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
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </div>


                              </article>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <AlertDialog
            open={removeDialogOpen}
            onOpenChange={(open) => {
              if (removingMemberId) return
              setRemoveDialogOpen(open)
              if (!open) setRemoveTarget(null)
            }}
          >
            <AlertDialogContent className="w-[94vw] max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-[0_30px_90px_-38px_rgba(15,23,42,0.55)] sm:max-w-[450px]">
              <AlertDialogHeader className="border-b border-slate-100 px-5 py-5">
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

              <AlertDialogFooter className="gap-2 px-5 pb-5 pt-4 sm:gap-2">
                <AlertDialogCancel disabled={!!removingMemberId} className="h-10 rounded-xl border-slate-200 font-bold">Abbrechen</AlertDialogCancel>

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
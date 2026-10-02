"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
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
      <div className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Teams" subtitle="Ligazentrale" backHref="/member-league-app" />

        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_48%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(14,165,233,.12),transparent_28%)]" />
        </div>

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-24">
          <div className="w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-black/35 p-8 text-center shadow-[0_30px_90px_-45px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-orange-300" />
            <p className="mt-5 text-lg font-black text-white">Teams werden geladen</p>
            <p className="mt-1 text-sm font-semibold text-white/35">Einen Moment bitte…</p>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Teams" subtitle="Ligazentrale" backHref="/member-league-app" />

        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.74),rgba(3,5,9,.96)_48%,rgba(2,4,7,.99))]" />
        </div>

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-24">
          <div className="w-full max-w-md rounded-[28px] border border-red-300/[0.13] bg-red-500/[0.055] p-6 text-center backdrop-blur-xl">
            <Users className="mx-auto h-8 w-8 text-red-200" />
            <h1 className="mt-4 text-lg font-black text-white">{error || "Profil nicht gefunden"}</h1>
            <p className="mt-2 text-sm font-semibold text-white/40">Bitte versuche es erneut oder gehe zurück zur Ligazentrale.</p>
            <Button
              className="mt-5 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
              onClick={() => router.push("/member-league-app")}
            >
              Zur Ligazentrale
            </Button>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (!canSeeEDart && !canSeeSteeldart) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Teams" subtitle="Ligazentrale" backHref="/member-league-app" />

        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.74),rgba(3,5,9,.96)_48%,rgba(2,4,7,.99))]" />
        </div>

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-24">
          <div className="w-full max-w-xl rounded-[30px] border border-orange-300/[0.12] bg-black/35 p-6 text-center backdrop-blur-xl sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/[0.16] bg-orange-500/[0.08]">
              <ShieldCheck className="h-7 w-7 text-orange-200" />
            </div>
            <h1 className="mt-5 text-xl font-black text-white">Kein Liga-Paket gebucht</h1>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-white/45">
              Für deine Mannschaftsbereiche benötigst du mindestens das E-Dart- oder Steeldart-Liga-Paket.
            </p>
            <Button
              type="button"
              onClick={() => router.push("/member-membership")}
              className="mt-5 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
            >
              Paket buchen
            </Button>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="Meine Teams" subtitle="Ligazentrale" backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <section className="mb-5 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 p-5 backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/15 bg-orange-500/[0.09] text-orange-200 shadow-[0_0_28px_rgba(249,115,22,.10)]">
                <Users className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300/65">
                  Mannschaften
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                  Meine Teams
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/40">
                  Deine Mannschaften, Rollen und Kader zentral verwalten.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Teams</div>
                <div className="mt-1.5 text-2xl font-black text-white">{teamMemberships.length}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Mitglieder</div>
                <div className="mt-1.5 text-2xl font-black text-white">{teamMembers.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[24px] border border-white/[0.08] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Liga-Zugriff</div>
              <div className="mt-1 text-sm font-black text-white">Freigeschaltete Bereiche</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canSeeEDart ? (
                <Badge variant="outline" className="rounded-full border-orange-300/20 bg-orange-500/[0.08] px-3 py-1 text-orange-100">
                  E-Dart
                </Badge>
              ) : null}

              {canSeeSteeldart ? (
                <Badge variant="outline" className="rounded-full border-sky-300/20 bg-sky-500/[0.08] px-3 py-1 text-sky-100">
                  Steeldart
                </Badge>
              ) : null}

              {canSeeEDart && !canSeeSteeldart ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/member-membership")}
                  className="h-8 rounded-full border-white/[0.10] bg-white/[0.04] px-3 text-xs font-bold text-white/65 hover:bg-white/[0.07] hover:text-white"
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
                  className="h-8 rounded-full border-white/[0.10] bg-white/[0.04] px-3 text-xs font-bold text-white/65 hover:bg-white/[0.07] hover:text-white"
                >
                  E-Dart dazubuchen
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {profile?.player_id ? (
          <section className="mb-5 overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
            <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/60">Kapitänsbereich</div>
              <h2 className="mt-1 text-lg font-black text-white">Spielerverwaltung</h2>
            </div>
            <div className="p-3 sm:p-4">
              <CaptainPlayerManagement onPlayerAdded={fetchTeamData} />
            </div>
          </section>
        ) : null}

        <section className="mb-5 overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] text-orange-200">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Mannschaften</div>
                <h2 className="mt-0.5 text-xl font-black text-white">Deine Teams</h2>
              </div>
            </div>

            <div className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-black text-white">
              {teamMemberships.length}
            </div>
          </div>

          <div className="p-3 sm:p-4 lg:p-5">
            {teamMemberships.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/[0.10] bg-white/[0.025] px-5 py-10 text-center">
                <Users className="mx-auto h-6 w-6 text-white/20" />
                <p className="mt-3 text-sm font-black text-white/65">Du bist noch keinem Team zugeordnet.</p>
                <p className="mt-1 text-xs font-semibold text-white/30">Wende dich an deinen Kapitän oder Co-Kapitän.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teamMemberships.map((membership) => (
                  <article
                    key={membership.id}
                    className={[
                      "relative overflow-hidden rounded-[22px] border bg-white/[0.035] p-4 transition",
                      membership.left_at
                        ? "border-white/[0.06] opacity-55"
                        : "border-white/[0.08] hover:border-orange-300/[0.18] hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3.5">
                      {membership.teams?.logo_url ? (
                        <Avatar className="h-14 w-14 shrink-0 border border-white/[0.08]">
                          <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-orange-500/[0.08] text-lg font-black text-orange-200">
                            {membership.teams.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
                          <Target className="h-6 w-6 text-orange-200" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300/55">
                          {membership.teams?.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                        </div>
                        <h3 className="mt-1 break-words text-lg font-black leading-tight text-white">
                          {membership.teams?.name || "Unbekanntes Team"}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25">Rolle</div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-black text-white/80">
                          {getRoleIcon(membership.role)}
                          {getRoleText(membership.role)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25">Dartart</div>
                        <div className="mt-2 text-sm font-black text-white/80">
                          {membership.teams?.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                        </div>
                      </div>
                    </div>

                    {membership.left_at ? (
                      <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/35">
                        Ehemalig seit {new Date(membership.left_at).toLocaleDateString("de-DE")}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/25 backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/[0.14] bg-sky-500/[0.07] text-sky-200">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Kader</div>
                  <h2 className="mt-0.5 text-xl font-black text-white">Teammitglieder</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFormerMembers((v) => !v)}
                  className={[
                    "h-9 rounded-xl border px-3 text-xs font-black shadow-none",
                    showFormerMembers
                      ? "border-orange-300/25 bg-orange-500/[0.10] text-orange-100 hover:bg-orange-500/[0.15]"
                      : "border-white/[0.09] bg-white/[0.035] text-white/50 hover:bg-white/[0.06] hover:text-white",
                  ].join(" ")}
                >
                  {showFormerMembers ? "Ehemalige: AN" : "Ehemalige: AUS"}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 lg:p-5">
            {teamMembers.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/[0.10] bg-white/[0.025] px-5 py-10 text-center">
                <p className="text-sm font-black text-white/60">Keine Teammitglieder gefunden.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMemberships.map((membership) => {
                  const teamMembersForThisTeam = teamMembers.filter((member) => member.team_id === membership.team_id)
                  const canManage = canManageTeam(membership.team_id)

                  return (
                    <section key={membership.id} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025]">
                      <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.025] px-3.5 py-3.5 sm:px-4">
                        {membership.teams?.logo_url ? (
                          <Avatar className="h-11 w-11 shrink-0 border border-white/[0.08]">
                            <AvatarImage src={membership.teams.logo_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-orange-500/[0.08] text-sm font-black text-orange-200">
                              {membership.teams.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
                            <Target className="h-5 w-5 text-orange-200" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
                            {membership.teams?.dart_type === "steeldart" ? "Steeldart-Team" : "E-Dart-Team"}
                          </div>
                          <h3 className="mt-0.5 break-words text-base font-black text-white sm:text-lg">
                            {membership.teams?.name || "Unbekanntes Team"}
                          </h3>
                        </div>

                        <div className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/25 px-2.5 text-xs font-black text-white/70">
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
                                "rounded-[18px] border bg-black/20 p-3.5",
                                member.left_at
                                  ? "border-white/[0.05] opacity-50"
                                  : isMe
                                    ? "border-orange-300/[0.20] bg-orange-500/[0.04]"
                                    : "border-white/[0.07]",
                              ].join(" ")}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-11 w-11 shrink-0 border border-white/[0.08]">
                                  <AvatarImage
                                    src={member.club_players?.photo_url || "/placeholder.svg?height=32&width=32&query=darts-player"}
                                  />
                                  <AvatarFallback className="bg-orange-500/[0.08] text-sm font-black text-orange-200">
                                    {member.club_players?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="break-words text-sm font-black leading-snug text-white">
                                    {member.club_players?.name || "Unbekannt"}
                                    {isMe ? <span className="ml-1 text-orange-300">(Du)</span> : null}
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-black text-white/55">
                                      {getRoleIcon(member.role)}
                                      {getRoleText(member.role)}
                                    </span>

                                    {member.left_at ? (
                                      <span className="inline-flex rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] font-bold text-white/35">
                                        Ehemalig seit {new Date(member.left_at).toLocaleDateString("de-DE")}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {showRemove ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 shrink-0 rounded-xl border-red-300/[0.14] bg-red-500/[0.05] p-0 shadow-none hover:bg-red-500/[0.10]"
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
                                    <Trash2 className="h-4 w-4 text-red-300" />
                                  </Button>
                                ) : null}
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
          <AlertDialogContent className="w-[94vw] max-w-md overflow-hidden rounded-[24px] border border-white/[0.10] bg-[#070a0f] p-0 text-white shadow-[0_30px_90px_-38px_rgba(0,0,0,.95)]">
            <AlertDialogHeader className="border-b border-white/[0.08] px-5 py-5">
              <AlertDialogTitle className="text-white">Spieler wirklich aus der Mannschaft entfernen?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/45">
                {removeTarget ? (
                  <>
                    Du entfernst <span className="font-semibold text-white/75">{removeTarget.playerName}</span> aus{" "}
                    <span className="font-semibold text-white/75">{removeTarget.teamName}</span>.
                  </>
                ) : (
                  ""
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="gap-2 px-5 pb-5 pt-4 sm:gap-2">
              <AlertDialogCancel
                disabled={!!removingMemberId}
                className="h-10 rounded-xl border-white/[0.10] bg-white/[0.04] font-bold text-white/60 hover:bg-white/[0.07] hover:text-white"
              >
                Abbrechen
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={!removeTarget || !!removingMemberId}
                className="bg-red-600 hover:bg-red-500"
                onClick={(e) => {
                  e.preventDefault()
                  confirmRemoveMember()
                }}
              >
                {removingMemberId ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    Entferne...
                  </span>
                ) : (
                  "Ja, entfernen"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <MobileBottomNav />
    </div>
  )
}

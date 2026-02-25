"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  Search,
  ShieldAlert,
  Loader2,
  Users,
  UserCheck,
  Clock3,
  CalendarDays,
  Crown,
  MailCheck,
  User,
  Building2,
  Sparkles,
  SlidersHorizontal,
  BarChart3,
  Flame,
  Eye,
  LineChart,
  Calendar,
  CalendarRange,
} from "lucide-react"

type ClubPlayer = { id: string; name: string }
type Team = { id: string; name: string }
type TeamMember = { player_id: string; team_id: string; role: string | null }

type UserProfile = {
  id: string
  user_id: string | null
  player_id: string | null
  created_at: string | null
  updated_at: string | null
  is_admin: boolean | null
  email_confirmed: boolean | null
  is_guest: boolean | null
  last_seen_at: string | null
}

// ✅ neu: fcm_tokens
type FcmTokenRow = {
  user_id: string
  platform: string | null
  created_at: string | null
  updated_at: string | null
}

type Row = {
  playerId: string
  playerName: string
  hasAccount: boolean
  userId: string | null
  createdAt: string | null
  lastSeenAt: string | null
  isAdmin: boolean
  emailConfirmed: boolean
  isGuest: boolean
  teamNames: string[]

  // ✅ neu: App/Push
  hasApp: boolean
  appPlatforms: string[]
  pushUpdatedAt: string | null
}

type StatusFilter = "ALL" | "ONLINE" | "INACTIVE" | "NEW"
type SortKey = "NAME" | "LAST_SEEN" | "REGISTERED"
type TeamFilter = "ALL" | "NO_TEAM" | string

const ONLINE_MINUTES = 5
const NEW_DAYS = 7
const INACTIVE_DAYS = 14

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function minutesAgo(iso: string) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY
  return Math.floor((Date.now() - t) / 60000)
}

function daysAgo(iso: string) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000))
}

function relTime(iso: string) {
  const m = minutesAgo(iso)
  if (!Number.isFinite(m)) return "—"
  if (m < 1) return "gerade eben"
  if (m < 60) return `vor ${m} Min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  return `vor ${d} Tg`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? "?"
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ""
  return (a + b).toUpperCase()
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function StatCard(props: { label: string; value: number | string; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,.6)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-white/70">{props.label}</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-white">{props.value}</div>
          {props.hint ? <div className="mt-1 text-xs text-white/70">{props.hint}</div> : null}
        </div>
        <div className="rounded-2xl bg-white/10 p-2 text-white">{props.icon}</div>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
    </div>
  )
}

function SegButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        props.active
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200",
      )}
      type="button"
    >
      {props.children}
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

export default function AdminUsersOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sortKey, setSortKey] = useState<SortKey>("LAST_SEEN")
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("ALL")

  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // ✅ neu
  const [fcmTokens, setFcmTokens] = useState<FcmTokenRow[]>([])

  // ✅ Seitenaufrufe (Counter aus page_view_counts)
  const [pvLoading, setPvLoading] = useState(true)
  const [pvTotal, setPvTotal] = useState<number>(0)
  const [pvTop, setPvTop] = useState<Array<{ path: string; total: number }>>([])
  const [pvToday, setPvToday] = useState<number>(0)
  const [pvLast7, setPvLast7] = useState<number>(0)
  const [pvSeries7, setPvSeries7] = useState<Array<{ date: string; total: number }>>([])

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])

  const playerTeams = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const tm of teamMembers) {
      const arr = m.get(tm.player_id) || []
      if (!arr.includes(tm.team_id)) arr.push(tm.team_id)
      m.set(tm.player_id, arr)
    }
    return m
  }, [teamMembers])

  const fetchData = async () => {
    setLoading(true)
    setError("")

    try {
      const [
        { data: clubPlayers, error: pErr },
        { data: profs, error: profErr },
        { data: teamData, error: tErr },
        { data: tmData, error: tmErr },
        { data: fcmData, error: fcmErr }, // ✅ neu
      ] = await Promise.all([
        supabase.from("club_players").select("id,name").order("name"),
        supabase
          .from("user_profiles")
          .select("id,user_id,player_id,created_at,updated_at,is_admin,email_confirmed,is_guest,last_seen_at"),
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("team_members").select("player_id,team_id,role"),
        // ✅ neu: fcm tokens
        supabase.from("fcm_tokens").select("user_id,platform,created_at,updated_at"),
      ])

      if (pErr) throw pErr
      if (profErr) throw profErr
      if (tErr) throw tErr
      if (tmErr) throw tmErr
      if (fcmErr) throw fcmErr

      setPlayers((clubPlayers || []) as ClubPlayer[])
      setProfiles((profs || []) as UserProfile[])
      setTeams((teamData || []) as Team[])
      setTeamMembers((tmData || []) as TeamMember[])
      setFcmTokens((fcmData || []) as FcmTokenRow[]) // ✅ neu
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const fetchPageViews = async () => {
    setPvLoading(true)
    try {
      // 1) Gesamt-Counter
      const { data, error } = await supabase.from("page_view_counts").select("path,total,updated_at")
      if (error) throw error

      const rows = (data || []) as Array<{ path: string; total: number; updated_at?: string }>
      const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0)

      const top = rows
        .map((r) => ({ path: String(r.path || "/"), total: Number(r.total || 0) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)

      setPvTotal(total)
      setPvTop(top)

      // 2) Tages-Counter (letzte 7 Tage)
      const dates = lastNDates(7)
      const dateIsos = dates.map((d) => d.iso)

      const { data: daily, error: dErr } = await supabase
        .from("page_view_daily_counts")
        .select("day,path,total")
        .in("day", dateIsos)

      if (dErr) throw dErr

      const dailyRows = (daily || []) as Array<{ day: string; path: string; total: number }>

      const byDay = new Map<string, number>()
      for (const dr of dailyRows) {
        byDay.set(dr.day, (byDay.get(dr.day) || 0) + Number(dr.total || 0))
      }

      const series = dates.map((d) => ({ date: d.label, total: byDay.get(d.iso) || 0 }))
      setPvSeries7(series)

      const todayIso = dates[dates.length - 1]?.iso
      const todayTotal = todayIso ? byDay.get(todayIso) || 0 : 0
      setPvToday(todayTotal)

      const last7Total = series.reduce((s, x) => s + x.total, 0)
      setPvLast7(last7Total)
    } catch (e) {
      console.warn("fetchPageViews failed:", e)
      setPvTotal(0)
      setPvTop([])
      setPvToday(0)
      setPvLast7(0)
      setPvSeries7([])
    } finally {
      setPvLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchPageViews()
  }, [])

  const rows: Row[] = useMemo(() => {
    const profileByPlayer = new Map<string, UserProfile>()
    for (const p of profiles) {
      if (p.player_id) profileByPlayer.set(p.player_id, p)
    }

    // ✅ neu: Tokens pro user_id sammeln
    const tokensByUser = new Map<string, FcmTokenRow[]>()
    for (const t of fcmTokens) {
      if (!t.user_id) continue
      const arr = tokensByUser.get(t.user_id) || []
      arr.push(t)
      tokensByUser.set(t.user_id, arr)
    }

    return players.map((pl) => {
      const prof = profileByPlayer.get(pl.id)
      const teamIds = playerTeams.get(pl.id) || []
      const teamNames = teamIds.map((tid) => teamById.get(tid) || tid)

      const userId = prof?.user_id ?? null
      const userTokens = userId ? tokensByUser.get(userId) || [] : []

      const platforms = Array.from(
        new Set(
          userTokens
            .map((x) => (x.platform || "").trim().toLowerCase())
            .filter(Boolean),
        ),
      )

      const pushUpdatedAt =
        userTokens
          .map((x) => x.updated_at || x.created_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? null

      return {
        playerId: pl.id,
        playerName: pl.name,
        hasAccount: !!prof?.user_id,
        userId,
        createdAt: prof?.created_at ?? null,
        lastSeenAt: prof?.last_seen_at ?? null,
        isAdmin: !!prof?.is_admin,
        emailConfirmed: !!prof?.email_confirmed,
        isGuest: !!prof?.is_guest,
        teamNames,

        // ✅ neu
        hasApp: userTokens.length > 0,
        appPlatforms: platforms,
        pushUpdatedAt,
      }
    })
  }, [players, profiles, fcmTokens, playerTeams, teamById])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()

    return rows
      .filter((r) => {
        // Suche
        if (s) {
          const t = `${r.playerName} ${r.teamNames.join(" ")}`.toLowerCase()
          if (!t.includes(s)) return false
        }

        // Team Filter
        if (teamFilter === "NO_TEAM") {
          if (r.teamNames.length !== 0) return false
        } else if (teamFilter !== "ALL") {
          const teamName = teamById.get(teamFilter)
          if (!teamName) return false
          if (!r.teamNames.includes(teamName)) return false
        }

        // Status Filter
        if (statusFilter === "ALL") return true

        const online = r.lastSeenAt ? minutesAgo(r.lastSeenAt) <= ONLINE_MINUTES : false
        const isNew = r.createdAt ? daysAgo(r.createdAt) <= NEW_DAYS : false
        const inactive = r.lastSeenAt ? daysAgo(r.lastSeenAt) >= INACTIVE_DAYS : true

        if (statusFilter === "ONLINE") return online
        if (statusFilter === "NEW") return isNew
        if (statusFilter === "INACTIVE") return inactive
        return true
      })
      .sort((a, b) => {
        if (sortKey === "NAME") return a.playerName.localeCompare(b.playerName, "de")
        if (sortKey === "REGISTERED") {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        }
        // LAST_SEEN (default)
        const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
        const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
        return tb - ta
      })
  }, [rows, search, statusFilter, sortKey, teamFilter, teamById])

  const kpis = useMemo(() => {
    const withAccount = rows.filter((r) => r.hasAccount)
    const online = withAccount.filter((r) => r.lastSeenAt && minutesAgo(r.lastSeenAt) <= ONLINE_MINUTES)
    const newly = withAccount.filter((r) => r.createdAt && daysAgo(r.createdAt) <= NEW_DAYS)
    const inactive = withAccount.filter((r) => !(r.lastSeenAt && daysAgo(r.lastSeenAt) < INACTIVE_DAYS))
    return {
      totalPlayers: rows.length,
      accounts: withAccount.length,
      online: online.length,
      new: newly.length,
      inactive: inactive.length,
    }
  }, [rows])

  const renderRow = (r: Row) => {
    const online = r.lastSeenAt ? minutesAgo(r.lastSeenAt) <= ONLINE_MINUTES : false
    const isNew = r.createdAt ? daysAgo(r.createdAt) <= NEW_DAYS : false

    return (
      <div
        key={r.playerId}
        className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:-translate-y-[1px]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "h-11 w-11 shrink-0 rounded-2xl grid place-items-center font-extrabold",
                online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700",
              )}
              title={online ? "Online" : "Offline"}
            >
              {initials(r.playerName)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <div className="font-semibold text-gray-900 truncate">{r.playerName}</div>

                {r.hasAccount ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Konto</Badge>
                ) : (
                  <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200">kein Konto</Badge>
                )}

                {/* ✅ neu: App / Push */}
                {r.hasApp ? (
                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 inline-flex items-center gap-1">
                    <MailCheck className="w-3.5 h-3.5" /> App
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 inline-flex items-center gap-1">
                    <MailCheck className="w-3.5 h-3.5" /> keine App
                  </Badge>
                )}

                {r.appPlatforms.map((pf) => (
                  <Badge key={pf} className="bg-white text-gray-700 border-gray-200">
                    {pf}
                  </Badge>
                ))}

                {online ? <Badge className="bg-green-100 text-green-800 border-green-200">online</Badge> : null}
                {isNew ? <Badge className="bg-blue-100 text-blue-800 border-blue-200">neu</Badge> : null}

                {r.isAdmin ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> admin
                  </Badge>
                ) : null}

                {r.isGuest ? <Badge className="bg-purple-100 text-purple-800 border-purple-200">gast</Badge> : null}
              </div>

              <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {r.teamNames.length ? r.teamNames.join(", ") : "Ohne Team"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Registriert: {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5" />
                  Zuletzt online: {r.lastSeenAt ? `${relTime(r.lastSeenAt)}` : "—"}
                  {r.lastSeenAt ? <span className="text-gray-400">• {formatDateTime(r.lastSeenAt)}</span> : null}
                </span>

                {/* ✅ neu: Token-Zeit */}
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Push-Token: {r.pushUpdatedAt ? `${relTime(r.pushUpdatedAt)}` : "—"}
                  {r.pushUpdatedAt ? <span className="text-gray-400">• {formatDateTime(r.pushUpdatedAt)}</span> : null}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,.95),rgba(2,6,23,1))]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,.35),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(234,179,8,.35),transparent_55%),radial-gradient(circle_at_30%_90%,rgba(168,85,247,.28),transparent_55%)]" />
        <div className="relative container mx-auto px-4 pt-7 pb-7">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-white shadow-sm backdrop-blur">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="text-white">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                    <Sparkles className="w-3.5 h-3.5" />
                    Admin • User & Accounts
                  </div>
                  <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">User Übersicht</h1>
                  <p className="mt-1 text-sm text-white/80">Registriert, zuletzt online, Status & Teams, Seitenaufrufe.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={fetchData}
                  variant="secondary"
                  className="gap-2 rounded-xl shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Aktualisieren
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Spieler" value={kpis.totalPlayers} icon={<Users className="w-5 h-5" />} />
              <StatCard label="Konten" value={kpis.accounts} icon={<User className="w-5 h-5" />} />
              <StatCard
                label="Online"
                value={kpis.online}
                hint={`≤ ${ONLINE_MINUTES} Min`}
                icon={<Clock3 className="w-5 h-5" />}
              />
              <StatCard
                label="Neu"
                value={kpis.new}
                hint={`≤ ${NEW_DAYS} Tage`}
                icon={<CalendarDays className="w-5 h-5" />}
              />
              <StatCard
                label="Inaktiv"
                value={kpis.inactive}
                hint={`≥ ${INACTIVE_DAYS} Tage`}
                icon={<ShieldAlert className="w-5 h-5" />}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Heute"
                value={pvLoading ? "…" : pvToday}
                hint="Seitenaufrufe heute"
                icon={<Calendar className="w-5 h-5" />}
              />
              <StatCard
                label="Letzte 7 Tage"
                value={pvLoading ? "…" : pvLast7}
                hint="Summe 7 Tage"
                icon={<CalendarRange className="w-5 h-5" />}
              />
              <StatCard label="Gesamt" value={pvLoading ? "…" : pvTotal} hint="Alle Seiten" icon={<BarChart3 className="w-5 h-5" />} />
              <StatCard
                label="Top-Seite"
                value={pvLoading ? "…" : pvTop[0]?.path ?? "—"}
                hint={pvLoading ? "" : `${pvTop[0]?.total ?? 0} Aufrufe`}
                icon={<Flame className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10">
        <div className="max-w-6xl mx-auto mt-6 space-y-4">
          {/* Error */}
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 flex gap-2 items-start shadow-sm">
              <ShieldAlert className="w-4 h-4 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          {/* Pageviews */}
          <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BarChart3 className="w-4 h-4" />
                  Seitenaufrufe
                </div>

                <Button
                  onClick={fetchPageViews}
                  variant="secondary"
                  className="gap-2 rounded-xl shadow-sm"
                  disabled={pvLoading}
                >
                  {pvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Aktualisieren
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs text-gray-500">Gesamt</div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-gray-900 tabular-nums">
                    {pvLoading ? "…" : pvTotal}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Alle Seiten kumuliert</div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs text-gray-500">Top-Seiten</div>

                  {pvLoading ? (
                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Lade …
                    </div>
                  ) : pvTop.length ? (
                    <div className="mt-3 space-y-2">
                      {pvTop.map((p, idx) => (
                        <div
                          key={`${p.path}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p.path}</div>
                            <div className="text-xs text-gray-500">Rank #{idx + 1}</div>
                          </div>
                          <div className="text-sm font-black tabular-nums text-gray-900">{p.total}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-600">Noch keine Daten vorhanden.</div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                      <LineChart className="w-4 h-4" />
                      Trend (letzte 7 Tage)
                    </div>
                    <div className="text-xs text-gray-500">Summe: {pvLoading ? "…" : pvLast7}</div>
                  </div>

                  {pvLoading ? (
                    <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Lade …
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const max = Math.max(1, ...pvSeries7.map((x) => x.total))
                        return pvSeries7.map((x, idx) => (
                          <div key={`${x.date}-${idx}`} className="flex items-center gap-3">
                            <div className="w-12 text-xs text-gray-500 tabular-nums">{x.date}</div>
                            <div className="flex-1">
                              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-gray-900"
                                  style={{ width: `${Math.round((x.total / max) * 100)}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-12 text-right text-xs font-semibold text-gray-700 tabular-nums">
                              {x.total}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <SlidersHorizontal className="w-4 h-4" />
                Filter & Suche
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                <div className="relative lg:col-span-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suchen: Name / Team …"
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>

                <div className="lg:col-span-3">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="ALL">Alle Teams</option>
                    <option value="NO_TEAM">Ohne Team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="LAST_SEEN">Sort: zuletzt online</option>
                    <option value="REGISTERED">Sort: registriert</option>
                    <option value="NAME">Sort: Name</option>
                  </select>
                </div>

                <div className="lg:col-span-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 h-11 shadow-sm">
                  <span className="text-xs text-gray-500">Treffer</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{filtered.length}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SegButton active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
                    Alle
                  </SegButton>
                  <SegButton active={statusFilter === "ONLINE"} onClick={() => setStatusFilter("ONLINE")}>
                    Online
                  </SegButton>
                  <SegButton active={statusFilter === "NEW"} onClick={() => setStatusFilter("NEW")}>
                    Neu
                  </SegButton>
                  <SegButton active={statusFilter === "INACTIVE"} onClick={() => setStatusFilter("INACTIVE")}>
                    Inaktiv
                  </SegButton>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Online-Definition: letzte Aktivität ≤ {ONLINE_MINUTES} Minuten • Neu: ≤ {NEW_DAYS} Tage • Inaktiv: ≥{" "}
                {INACTIVE_DAYS} Tage
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : filtered.length ? (
              filtered.map(renderRow)
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                Keine passenden Einträge gefunden.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function isoDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function lastNDates(n: number) {
  const out: Array<{ iso: string; label: string }> = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = isoDate(d)
    const label = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    out.push({ iso, label })
  }
  return out
}
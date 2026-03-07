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
  Smartphone,
  User,
  Building2,
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
  hasApp: boolean
  appPlatforms: string[]
  pushUpdatedAt: string | null
}

type StatusFilter = "ALL" | "ONLINE" | "INACTIVE" | "NEW"
type AppFilter = "ALL" | "HAS_APP" | "NO_APP"
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

function StatCard(props: {
  label: string
  value: number | string
  hint?: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-zinc-500">{props.label}</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
            {props.value}
          </div>
          {props.hint ? (
            <div className="mt-1 text-xs text-zinc-500">{props.hint}</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          {props.icon}
        </div>
      </div>
    </div>
  )
}

function SegButton(props: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={props.onClick}
      type="button"
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        props.active
          ? "bg-zinc-950 text-white shadow-sm"
          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      )}
    >
      {props.children}
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-72 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-100" />
      </div>
    </div>
  )
}

export default function AdminUsersOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [appFilter, setAppFilter] = useState<AppFilter>("ALL")
  const [sortKey, setSortKey] = useState<SortKey>("LAST_SEEN")
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("ALL")

  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [fcmTokens, setFcmTokens] = useState<FcmTokenRow[]>([])

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
        { data: fcmData, error: fcmErr },
      ] = await Promise.all([
        supabase.from("club_players").select("id,name").order("name"),
        supabase
          .from("user_profiles")
          .select(
            "id,user_id,player_id,created_at,updated_at,is_admin,email_confirmed,is_guest,last_seen_at",
          ),
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("team_members").select("player_id,team_id,role"),
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
      setFcmTokens((fcmData || []) as FcmTokenRow[])
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  const fetchPageViews = async () => {
    setPvLoading(true)

    try {
      const { data, error } = await supabase
        .from("page_view_counts")
        .select("path,total,updated_at")

      if (error) throw error

      const rows = (data || []) as Array<{
        path: string
        total: number
        updated_at?: string
      }>

      const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0)

      const top = rows
        .map((r) => ({
          path: String(r.path || "/"),
          total: Number(r.total || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)

      setPvTotal(total)
      setPvTop(top)

      const dates = lastNDates(7)
      const dateIsos = dates.map((d) => d.iso)

      const { data: daily, error: dErr } = await supabase
        .from("page_view_daily_counts")
        .select("day,path,total")
        .in("day", dateIsos)

      if (dErr) throw dErr

      const dailyRows = (daily || []) as Array<{
        day: string
        path: string
        total: number
      }>

      const byDay = new Map<string, number>()

      for (const dr of dailyRows) {
        byDay.set(dr.day, (byDay.get(dr.day) || 0) + Number(dr.total || 0))
      }

      const series = dates.map((d) => ({
        date: d.label,
        total: byDay.get(d.iso) || 0,
      }))

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
          .sort(
            (a, b) =>
              new Date(b as string).getTime() - new Date(a as string).getTime(),
          )[0] ?? null

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
        if (s) {
          const t = `${r.playerName} ${r.teamNames.join(" ")}`.toLowerCase()
          if (!t.includes(s)) return false
        }

        if (teamFilter === "NO_TEAM") {
          if (r.teamNames.length !== 0) return false
        } else if (teamFilter !== "ALL") {
          const teamName = teamById.get(teamFilter)
          if (!teamName) return false
          if (!r.teamNames.includes(teamName)) return false
        }
		
		// App Filter
if (appFilter === "HAS_APP" && !r.hasApp) return false
if (appFilter === "NO_APP" && r.hasApp) return false

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

        const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
        const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
        return tb - ta
      })
  }, [rows, search, statusFilter, appFilter, sortKey, teamFilter, teamById])

  const kpis = useMemo(() => {
    const withAccount = rows.filter((r) => r.hasAccount)
    const online = withAccount.filter(
      (r) => r.lastSeenAt && minutesAgo(r.lastSeenAt) <= ONLINE_MINUTES,
    )
    const newly = withAccount.filter(
      (r) => r.createdAt && daysAgo(r.createdAt) <= NEW_DAYS,
    )
    const inactive = withAccount.filter(
      (r) => !(r.lastSeenAt && daysAgo(r.lastSeenAt) < INACTIVE_DAYS),
    )

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
        className="group rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border font-extrabold",
                online
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700",
              )}
              title={online ? "Online" : "Offline"}
            >
              {initials(r.playerName)}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="truncate font-semibold text-zinc-950">{r.playerName}</div>

                {r.hasAccount ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    Konto
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-zinc-200 bg-zinc-50 text-zinc-700"
                  >
                    kein Konto
                  </Badge>
                )}

                {r.hasApp ? (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 border-sky-200 bg-sky-50 text-sky-700"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    App
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 border-zinc-200 bg-zinc-50 text-zinc-700"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    keine App
                  </Badge>
                )}

                {r.appPlatforms.map((pf) => (
                  <Badge
                    key={pf}
                    variant="outline"
                    className="border-zinc-200 bg-white text-zinc-700"
                  >
                    {pf}
                  </Badge>
                ))}

                {online ? (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    online
                  </Badge>
                ) : null}

                {isNew ? (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  >
                    neu
                  </Badge>
                ) : null}

                {r.isAdmin ? (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    admin
                  </Badge>
                ) : null}

                {r.isGuest ? (
                  <Badge
                    variant="outline"
                    className="border-purple-200 bg-purple-50 text-purple-700"
                  >
                    gast
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {r.teamNames.length ? r.teamNames.join(", ") : "Ohne Team"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Registriert: {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Zuletzt online: {r.lastSeenAt ? relTime(r.lastSeenAt) : "—"}
                  {r.lastSeenAt ? (
                    <span className="text-zinc-400">• {formatDateTime(r.lastSeenAt)}</span>
                  ) : null}
                </span>

                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  Push-Token: {r.pushUpdatedAt ? relTime(r.pushUpdatedAt) : "—"}
                  {r.pushUpdatedAt ? (
                    <span className="text-zinc-400">
                      • {formatDateTime(r.pushUpdatedAt)}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <Header />

      <section className="border-b border-zinc-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                  <UserCheck className="h-6 w-6" />
                </div>

                <div>
                  <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                    Admin • User & Accounts
                  </div>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                    User Übersicht
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    Registriert, zuletzt online, Teams, App-Status und Seitenaufrufe.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={fetchData}
                  variant="outline"
                  className="gap-2 rounded-xl border-zinc-200 bg-white"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Aktualisieren
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard
                label="Spieler"
                value={kpis.totalPlayers}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Konten"
                value={kpis.accounts}
                icon={<User className="h-5 w-5" />}
              />
              <StatCard
                label="Online"
                value={kpis.online}
                hint={`≤ ${ONLINE_MINUTES} Min`}
                icon={<Clock3 className="h-5 w-5" />}
              />
              <StatCard
                label="Neu"
                value={kpis.new}
                hint={`≤ ${NEW_DAYS} Tage`}
                icon={<CalendarDays className="h-5 w-5" />}
              />
              <StatCard
                label="Inaktiv"
                value={kpis.inactive}
                hint={`≥ ${INACTIVE_DAYS} Tage`}
                icon={<ShieldAlert className="h-5 w-5" />}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="Heute"
                value={pvLoading ? "…" : pvToday}
                hint="Seitenaufrufe heute"
                icon={<Calendar className="h-5 w-5" />}
              />
              <StatCard
                label="Letzte 7 Tage"
                value={pvLoading ? "…" : pvLast7}
                hint="Summe 7 Tage"
                icon={<CalendarRange className="h-5 w-5" />}
              />
              <StatCard
                label="Gesamt"
                value={pvLoading ? "…" : pvTotal}
                hint="Alle Seiten"
                icon={<BarChart3 className="h-5 w-5" />}
              />
              <StatCard
                label="Top-Seite"
                value={pvLoading ? "…" : pvTop[0]?.path ?? "—"}
                hint={pvLoading ? "" : `${pvTop[0]?.total ?? 0} Aufrufe`}
                icon={<Flame className="h-5 w-5" />}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10 pt-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          <Card className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <BarChart3 className="h-4 w-4" />
                  Seitenaufrufe
                </div>

                <Button
                  onClick={fetchPageViews}
                  variant="outline"
                  className="gap-2 rounded-xl border-zinc-200 bg-white"
                  disabled={pvLoading}
                >
                  {pvLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Aktualisieren
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">Gesamt</div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-zinc-950 tabular-nums">
                    {pvLoading ? "…" : pvTotal}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Alle Seiten kumuliert
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">Top-Seiten</div>

                  {pvLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lade …
                    </div>
                  ) : pvTop.length ? (
                    <div className="mt-3 space-y-2">
                      {pvTop.map((p, idx) => (
                        <div
                          key={`${p.path}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-950">
                              {p.path}
                            </div>
                            <div className="text-xs text-zinc-500">Rank #{idx + 1}</div>
                          </div>
                          <div className="text-sm font-black tabular-nums text-zinc-950">
                            {p.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-zinc-600">
                      Noch keine Daten vorhanden.
                    </div>
                  )}
                </div>

                <div className="mt-1 rounded-3xl border border-zinc-200 bg-white p-4 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      <LineChart className="h-4 w-4" />
                      Trend (letzte 7 Tage)
                    </div>
                    <div className="text-xs text-zinc-500">
                      Summe: {pvLoading ? "…" : pvLast7}
                    </div>
                  </div>

                  {pvLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lade …
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const max = Math.max(1, ...pvSeries7.map((x) => x.total))

                        return pvSeries7.map((x, idx) => (
                          <div key={`${x.date}-${idx}`} className="flex items-center gap-3">
                            <div className="w-12 text-xs tabular-nums text-zinc-500">
                              {x.date}
                            </div>

                            <div className="flex-1">
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className="h-2 rounded-full bg-zinc-900"
                                  style={{
                                    width: `${Math.round((x.total / max) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="w-12 text-right text-xs font-semibold tabular-nums text-zinc-700">
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

          <Card className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <SlidersHorizontal className="h-4 w-4" />
                Filter & Suche
              </div>

              <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
                <div className="relative lg:col-span-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suchen: Name / Team …"
                    className="h-11 rounded-xl border-zinc-200 pl-10"
                  />
                </div>

                <div className="lg:col-span-3">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
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
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="LAST_SEEN">Sort: zuletzt online</option>
                    <option value="REGISTERED">Sort: registriert</option>
                    <option value="NAME">Sort: Name</option>
                  </select>
                </div>

                <div className="flex h-11 items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 lg:col-span-2">
                  <span className="text-xs text-zinc-500">Treffer</span>
                  <span className="text-sm font-bold tabular-nums text-zinc-950">
                    {filtered.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SegButton active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
                    Alle
                  </SegButton>
                  <SegButton
                    active={statusFilter === "ONLINE"}
                    onClick={() => setStatusFilter("ONLINE")}
                  >
                    Online
                  </SegButton>
                  <SegButton active={statusFilter === "NEW"} onClick={() => setStatusFilter("NEW")}>
                    Neu
                  </SegButton>
                  <SegButton
                    active={statusFilter === "INACTIVE"}
                    onClick={() => setStatusFilter("INACTIVE")}
                  >
                    Inaktiv
                  </SegButton>
				  
				  <SegButton active={appFilter === "HAS_APP"} onClick={() => setAppFilter("HAS_APP")}>
  Mit App
</SegButton>

<SegButton active={appFilter === "NO_APP"} onClick={() => setAppFilter("NO_APP")}>
  Ohne App
</SegButton>
				  
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                Online-Definition: letzte Aktivität ≤ {ONLINE_MINUTES} Minuten • Neu: ≤{" "}
                {NEW_DAYS} Tage • Inaktiv: ≥ {INACTIVE_DAYS} Tage
              </div>
            </CardContent>
          </Card>

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
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
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
    const label = d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    })

    out.push({ iso, label })
  }

  return out
}
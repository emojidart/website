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
      ] = await Promise.all([
        supabase.from("club_players").select("id,name").order("name"),
        supabase
          .from("user_profiles")
          .select("id,user_id,player_id,created_at,updated_at,is_admin,email_confirmed,is_guest,last_seen_at"),
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("team_members").select("player_id,team_id,role"),
      ])

      if (pErr) throw pErr
      if (profErr) throw profErr
      if (tErr) throw tErr
      if (tmErr) throw tmErr

      setPlayers((clubPlayers || []) as ClubPlayer[])
      setProfiles((profs || []) as UserProfile[])
      setTeams((teamData || []) as Team[])
      setTeamMembers((tmData || []) as TeamMember[])
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const rows: Row[] = useMemo(() => {
    const profileByPlayer = new Map<string, UserProfile>()
    for (const p of profiles) {
      if (p.player_id) profileByPlayer.set(p.player_id, p)
    }

    return players.map((pl) => {
      const prof = profileByPlayer.get(pl.id)
      const teamIds = playerTeams.get(pl.id) || []
      const teamNames = teamIds.map((tid) => teamById.get(tid) || tid)

      return {
        playerId: pl.id,
        playerName: pl.name,
        hasAccount: !!(prof?.user_id),
        userId: prof?.user_id ?? null,
        createdAt: prof?.created_at ?? null,
        lastSeenAt: prof?.last_seen_at ?? null,
        isAdmin: !!prof?.is_admin,
        emailConfirmed: !!prof?.email_confirmed,
        isGuest: !!prof?.is_guest,
        teamNames,
      }
    })
  }, [players, profiles, playerTeams, teamById])

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
          // teamFilter ist team_id -> wir prüfen über teamIds indirekt über Names nicht 100%,
          // deshalb: lieber über playerTeams Map direkt
          // (aber hier haben wir nur Names in Row – daher einfache Lösung:)
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{r.playerName}</div>
            {r.hasAccount ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Konto</Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200">kein Konto</Badge>
            )}
            {online ? <Badge className="bg-green-100 text-green-800 border-green-200">online</Badge> : null}
            {isNew ? <Badge className="bg-blue-100 text-blue-800 border-blue-200">neu</Badge> : null}
            {r.isAdmin ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> admin
              </Badge>
            ) : null}
            {r.isGuest ? <Badge className="bg-purple-100 text-purple-800 border-purple-200">gast</Badge> : null}
            {r.emailConfirmed ? (
              <Badge className="bg-sky-100 text-sky-800 border-sky-200 inline-flex items-center gap-1">
                <MailCheck className="w-3.5 h-3.5" /> mail ok
              </Badge>
            ) : null}
          </div>

          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
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
              Zuletzt online: {r.lastSeenAt ? `${formatDateTime(r.lastSeenAt)} (${relTime(r.lastSeenAt)})` : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {r.userId ? (
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => navigator.clipboard.writeText(r.userId || "")}
              title="User-ID kopieren"
            >
              <User className="w-4 h-4" />
              User-ID
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="container mx-auto px-4 pt-6 pb-10">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 text-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black leading-tight">User / Accounts</h1>
                <p className="text-sm text-white/90 mt-1">
                  Überblick: Registriert • Zuletzt online • Online-Status • Filter & Sortierung.
                </p>
              </div>
              <Button onClick={fetchData} variant="secondary" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Aktualisieren
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/80">Spieler</div>
                <div className="text-xl font-black">{kpis.totalPlayers}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/80">Konten</div>
                <div className="text-xl font-black">{kpis.accounts}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/80">Online</div>
                <div className="text-xl font-black">{kpis.online}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/80">Neu (≤ {NEW_DAYS} Tg)</div>
                <div className="text-xl font-black">{kpis.new}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/80">Inaktiv (≥ {INACTIVE_DAYS} Tg)</div>
                <div className="text-xl font-black">{kpis.inactive}</div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 flex gap-2 items-start">
              <ShieldAlert className="w-4 h-4 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                <div className="relative lg:col-span-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suchen: Name / Team …"
                    className="pl-10 h-11"
                  />
                </div>

                <div className="lg:col-span-3">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm"
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm"
                  >
                    <option value="ALL">Alle</option>
                    <option value="ONLINE">Online</option>
                    <option value="NEW">Neu</option>
                    <option value="INACTIVE">Inaktiv</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm"
                  >
                    <option value="LAST_SEEN">Sort: zuletzt online</option>
                    <option value="REGISTERED">Sort: registriert</option>
                    <option value="NAME">Sort: Name</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Treffer: <b>{filtered.length}</b>
              </div>

              <div className="space-y-2">
                {filtered.length ? (
                  filtered.map(renderRow)
                ) : (
                  <div className="text-sm text-gray-600">Keine passenden Einträge gefunden.</div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Online-Definition: letzte Aktivität ≤ {ONLINE_MINUTES} Minuten • Neu: ≤ {NEW_DAYS} Tage
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

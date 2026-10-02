"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Play,
  Tv2,
  Users,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type TeamMembership = {
  team_id: string
  role: string | null
  teams: {
    id: string
    name: string
    dart_type: string | null
  } | null
}

type LineupHeader = {
  match_id: string
  team_id: string
  status: string
  current_version: number | null
  confirmed_version: number | null
  confirmed_at: string | null
}

type Match = {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_type: "own" | "opponent" | "club_team"
  away_team_type: "own" | "opponent" | "club_team"
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  match_time: string | null
  venue: string | null
  week_number: number | null
  status: string
  dart_type: string | null
  home_team?: { id: string; name: string } | null
  away_team?: { id: string; name: string } | null
}

type OpponentTeam = {
  id: string
  name: string
}

type LineupRow = {
  match_id: string
  team_id: string
  is_substitute: boolean
}

type PreviewMatch = {
  header: LineupHeader
  match: Match
  teamName: string
  homeName: string
  awayName: string
  starters: number
  substitutes: number
}

function formatDate(dateString: string) {
  const d = new Date(`${dateString}T12:00:00`)
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

function formatTime(value: string | null) {
  if (!value) return "Uhrzeit offen"
  return `${value.slice(0, 5)} Uhr`
}

function normalizeDartType(value: string | null | undefined) {
  const v = String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "")
  if (v.includes("edart")) return "edart" as const
  if (v.includes("steel")) return "steeldart" as const
  return "" as const
}

export default function EmdTvOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [headers, setHeaders] = useState<LineupHeader[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [opponents, setOpponents] = useState<OpponentTeam[]>([])
  const [lineupRows, setLineupRows] = useState<LineupRow[]>([])

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // EMD TV zeigt alle Teams mit einer aktuell bestätigten Aufstellung.
      // Es wird bewusst NICHT nach der Team-Mitgliedschaft des eingeloggten Users gefiltert.
      const { data: headerData, error: headerError } = await supabase
        .from("match_lineup_headers")
        .select("match_id,team_id,status,current_version,confirmed_version,confirmed_at")
        .eq("status", "confirmed")

      if (headerError) throw headerError

      const confirmed = (((headerData as any[]) || []) as LineupHeader[]).filter(
        (h) =>
          h.confirmed_version !== null &&
          h.current_version !== null &&
          h.confirmed_version === h.current_version,
      )

      setHeaders(confirmed)

      const matchIds = Array.from(new Set(confirmed.map((x) => x.match_id)))
      const teamIds = Array.from(new Set(confirmed.map((x) => x.team_id)))

      if (matchIds.length === 0 || teamIds.length === 0) {
        setTeamMemberships([])
        setMatches([])
        setLineupRows([])
        return
      }

      const [matchesRes, opponentRes, lineupRes, teamsRes] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id,
            home_team_id,
            away_team_id,
            home_team_type,
            away_team_type,
            home_opponent_team_id,
            away_opponent_team_id,
            match_date,
            match_time,
            venue,
            week_number,
            status,
            dart_type,
            home_team:teams!matches_home_team_id_fkey(id,name),
            away_team:teams!matches_away_team_id_fkey(id,name)
          `)
          .in("id", matchIds)
          .order("match_date", { ascending: true }),
        supabase.from("opponent_teams").select("id,name"),
        supabase
          .from("match_lineups")
          .select("match_id,team_id,is_substitute")
          .in("match_id", matchIds)
          .in("team_id", teamIds),
        supabase
          .from("teams")
          .select("id,name,dart_type")
          .in("id", teamIds),
      ])

      if (matchesRes.error) throw matchesRes.error
      if (opponentRes.error) throw opponentRes.error
      if (lineupRes.error) throw lineupRes.error
      if (teamsRes.error) throw teamsRes.error

      const allConfirmedTeams: TeamMembership[] = (((teamsRes.data as any[]) || []) as any[]).map(
        (team) => ({
          team_id: team.id,
          role: null,
          teams: {
            id: team.id,
            name: team.name,
            dart_type: team.dart_type,
          },
        }),
      )

      setTeamMemberships(allConfirmedTeams)
      setMatches(((matchesRes.data as any[]) || []) as Match[])
      setOpponents(((opponentRes.data as any[]) || []) as OpponentTeam[])
      setLineupRows(((lineupRes.data as any[]) || []) as LineupRow[])
    } catch (e) {
      console.error("EMD TV load error:", e)
      setError("Die bestätigten Aufstellungen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of teamMemberships) {
      if (m.teams?.name) map.set(m.team_id, m.teams.name)
    }
    return map
  }, [teamMemberships])

  const teamDartTypeById = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const m of teamMemberships) map.set(m.team_id, m.teams?.dart_type ?? null)
    return map
  }, [teamMemberships])

  const opponentNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of opponents) map.set(o.id, o.name)
    return map
  }, [opponents])

  function sideName(match: Match, side: "home" | "away") {
    const type = side === "home" ? match.home_team_type : match.away_team_type
    const opponentId =
      side === "home" ? match.home_opponent_team_id : match.away_opponent_team_id
    const own = side === "home" ? match.home_team : match.away_team

    if (type === "opponent" && opponentId) {
      return opponentNameById.get(opponentId) || "Gegner"
    }

    return own?.name || "Unbekannt"
  }

  const previews = useMemo<PreviewMatch[]>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    const today = `${yyyy}-${mm}-${dd}`

    return headers
      .map((header) => {
        const match = matches.find((m) => m.id === header.match_id)
        if (!match) return null

        // Nur echte zukünftige / noch nicht gestartete Spiele anzeigen.
        // Alte und abgeschlossene Spiele werden IMMER ausgeblendet.
        if (match.status === "completed") return null
        if (!match.match_date || match.match_date < today) return null

        if (match.match_date === today && match.match_time) {
          const startAt = new Date(`${match.match_date}T${match.match_time}`).getTime()
          if (Number.isFinite(startAt) && startAt <= now.getTime()) return null
        }

        const rows = lineupRows.filter(
          (r) => r.match_id === header.match_id && r.team_id === header.team_id,
        )

        const starters = rows.filter((r) => !r.is_substitute).length
        const dartType = normalizeDartType(teamDartTypeById.get(header.team_id) || match.dart_type)
        const requiredStarters = dartType === "edart" ? 4 : dartType === "steeldart" ? 3 : 1

        // Ein alter/fehlerhafter confirmed-Header allein reicht nicht:
        // EMD TV zeigt nur vollständig bestätigte Aufstellungen.
        if (starters < requiredStarters) return null

        return {
          header,
          match,
          teamName: teamNameById.get(header.team_id) || "Mein Team",
          homeName: sideName(match, "home"),
          awayName: sideName(match, "away"),
          starters,
          substitutes: rows.filter((r) => r.is_substitute).length,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const ad = `${a!.match.match_date}T${a!.match.match_time || "23:59:59"}`
        const bd = `${b!.match.match_date}T${b!.match.match_time || "23:59:59"}`
        return ad.localeCompare(bd)
      }) as PreviewMatch[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, matches, lineupRows, teamNameById, teamDartTypeById, opponentNameById])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-white">
        <Header variant="app" title="EMD TV" subtitle="Ligazentrale" backHref="/" />
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-black/35 p-8 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-orange-300" />
            <div className="mt-4 font-black">Match Previews werden geladen</div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }


  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="EMD TV" subtitle="Ligazentrale" backHref="/" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_44%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_7%_18%,rgba(249,115,22,.22),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(249,115,22,.12),transparent_25%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <style>{`
          .emd-tv-overview-hero{
            isolation:isolate;
          }
          .emd-hero-orbit{
            position:absolute;
            border-radius:999px;
            border:1px solid rgba(249,115,22,.12);
            box-shadow:0 0 55px rgba(249,115,22,.05);
            animation:emdOverviewOrbit 9s linear infinite;
          }
          .emd-hero-orbit-a{width:260px;height:260px;right:-80px;top:-120px}
          .emd-hero-orbit-b{width:180px;height:180px;left:28%;bottom:-120px;animation-duration:13s;animation-direction:reverse}
          .emd-hero-sweep{
            position:absolute;
            inset:-30% auto -30% -35%;
            width:28%;
            transform:skewX(-20deg);
            background:linear-gradient(90deg,transparent,rgba(255,255,255,.045),rgba(249,115,22,.10),transparent);
            filter:blur(8px);
            animation:emdOverviewSweep 6.5s ease-in-out infinite;
          }
          .emd-live-production{
            animation:emdLiveBadge 2.2s ease-in-out infinite;
          }
          .emd-preview-card:before{
            content:"";
            position:absolute;
            inset:0;
            z-index:0;
            pointer-events:none;
            background:linear-gradient(115deg,transparent 0 34%,rgba(255,255,255,.035) 42%,rgba(249,115,22,.07) 49%,transparent 58%);
            transform:translateX(-120%);
            transition:transform .8s cubic-bezier(.2,.75,.2,1);
          }
          .emd-preview-card:hover:before{transform:translateX(120%)}
          .emd-preview-card:after{
            content:"";
            position:absolute;
            left:12%;right:12%;bottom:-1px;height:1px;
            background:linear-gradient(90deg,transparent,rgba(249,115,22,.8),transparent);
            box-shadow:0 0 16px rgba(249,115,22,.45);
            opacity:.28;
          }
          .emd-preview-play{
            position:relative;
            box-shadow:0 0 0 0 rgba(249,115,22,.22);
            animation:emdPreviewPulse 2.6s ease-out infinite;
          }
          @keyframes emdOverviewOrbit{to{transform:rotate(360deg)}}
          @keyframes emdOverviewSweep{
            0%,18%{transform:translateX(-30vw) skewX(-20deg);opacity:0}
            35%{opacity:1}
            72%,100%{transform:translateX(170vw) skewX(-20deg);opacity:0}
          }
          @keyframes emdLiveBadge{0%,100%{opacity:.72}50%{opacity:1;box-shadow:0 0 24px rgba(249,115,22,.12)}}
          @keyframes emdPreviewPulse{
            0%{box-shadow:0 0 0 0 rgba(249,115,22,.28)}
            70%{box-shadow:0 0 0 14px rgba(249,115,22,0)}
            100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}
          }
        `}</style>
        <section className="emd-tv-overview-hero relative mb-5 overflow-hidden rounded-[30px] border border-orange-300/[0.12] bg-black/35 p-5 shadow-[0_30px_90px_-50px_rgba(249,115,22,.38)] backdrop-blur-xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="emd-hero-orbit emd-hero-orbit-a" />
            <div className="emd-hero-orbit emd-hero-orbit-b" />
            <div className="emd-hero-sweep" />
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/20 bg-orange-500/[0.10] text-orange-200 shadow-[0_0_34px_rgba(249,115,22,.14)]">
              <Tv2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300/70">
                  Match Preview
                </div>
                <span className="emd-live-production inline-flex items-center gap-1.5 rounded-full border border-orange-300/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-orange-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,.95)]" />
                  Live Production
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                EMD TV
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                Hier erscheinen automatisch alle Spiele, deren Aufstellung bereits bestätigt wurde.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-red-300/[0.14] bg-red-500/[0.06] p-5 text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : previews.length === 0 ? (
          <section className="rounded-[28px] border border-white/[0.08] bg-black/30 p-8 text-center backdrop-blur-xl">
            <Tv2 className="mx-auto h-10 w-10 text-white/22" />
            <h2 className="mt-4 text-lg font-black">Noch keine Match Preview verfügbar</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-white/40">
              Sobald Captain oder Co-Kapitän eine Aufstellung bestätigt, erscheint das Spiel hier automatisch.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {previews.map((item) => (
              <button
                key={`${item.header.match_id}-${item.header.team_id}`}
                type="button"
                onClick={() =>
                  router.push(
                    `/emd-tv/${item.header.match_id}?team_id=${item.header.team_id}`,
                  )
                }
                className="emd-preview-card group relative overflow-hidden rounded-[28px] border border-orange-300/[0.11] bg-black/35 p-5 text-left backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-orange-300/25 hover:shadow-[0_30px_80px_-45px_rgba(249,115,22,.38)] sm:p-6"
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-orange-500/[0.10] blur-[70px] transition group-hover:bg-orange-500/[0.16]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/75">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aufstellung bestätigt
                      </div>
                      <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                        {item.teamName}
                      </div>
                    </div>

                    <div className="emd-preview-play flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-300/25 bg-orange-500/[0.09] text-orange-100">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="text-right text-lg font-black leading-tight sm:text-xl">
                      {item.homeName}
                    </div>
                    <div className="rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">
                      VS
                    </div>
                    <div className="text-lg font-black leading-tight sm:text-xl">
                      {item.awayName}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <CalendarDays className="h-4 w-4 text-orange-200/75" />
                      <div className="mt-2 text-xs font-black text-white">{formatDate(item.match.match_date)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <Clock3 className="h-4 w-4 text-orange-200/75" />
                      <div className="mt-2 text-xs font-black text-white">{formatTime(item.match.match_time)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <Users className="h-4 w-4 text-orange-200/75" />
                      <div className="mt-2 text-xs font-black text-white">{item.starters} Starter</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <Users className="h-4 w-4 text-white/45" />
                      <div className="mt-2 text-xs font-black text-white">
                        {item.substitutes} Ersatz
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/35">
                      TV Preview starten
                    </span>
                    <ChevronRight className="h-5 w-5 text-orange-200 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  Search,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import TerminalLink from "../../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type ResultRow = {
  status_row_id: number | string
  tournament_id: string
  tournament_type: string
  tournament_name: string
  status: string
  created_at: string
  updated_at: string
  last_updated_at: string | null
  winner: string | null
  participants: number | null
}

type KratzerTournament = {
  id: string
  name: string | null
  status: string | null
  created_at: string | null
  finished_at: string | null
}

type KratzerResult = {
  kratzer_tournament_id: string
  winner_name: string | null
  total_rounds: number | null
  created_at: string | null
}

function typeLabel(type?: string | null) {
  if (!type) return "Turnier"
  const t = type.toLowerCase()
  if (t.includes("kratzer")) return "Kratzer"
  if (t.includes("8")) return "8er DKO"
  if (t.includes("16")) return "16er DKO"
  if (t.includes("32")) return "32er DKO"
  if (t.includes("64")) return "64er DKO"
  return type
}

function dateDE(value?: string | null) {
  if (!value) return "–"
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function duration(row: ResultRow) {
  const start = new Date(row.created_at).getTime()
  const end = new Date(row.last_updated_at || row.updated_at || row.created_at).getTime()
  const minutes = Math.max(0, Math.round((end - start) / 60000))
  if (!Number.isFinite(minutes) || minutes <= 0) return "–"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function TerminalTournamentResultsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ResultRow[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: history } = await supabase
        .from("tournaments_history_overview")
        .select("*")
        .order("created_at", { ascending: false })

      let combined = ((history || []) as ResultRow[]).filter((row) => {
        const s = String(row.status || "").toLowerCase()
        return ["completed", "finished", "done"].includes(s)
      })

      const { data: kratzerTournaments } = await supabase
        .from("kratzer_tournaments")
        .select("id,name,status,created_at,finished_at")
        .order("created_at", { ascending: false })

      const finished = ((kratzerTournaments || []) as KratzerTournament[]).filter(
        (row) => String(row.status || "").toLowerCase() === "finished",
      )

      if (finished.length > 0) {
        const ids = finished.map((row) => row.id)

        const [{ data: kratzerResults }, { data: players }] = await Promise.all([
          supabase
            .from("kratzer_tournament_results")
            .select("kratzer_tournament_id,winner_name,total_rounds,created_at")
            .in("kratzer_tournament_id", ids),
          supabase
            .from("kratzer_tournament_players")
            .select("kratzer_tournament_id")
            .in("kratzer_tournament_id", ids),
        ])

        const resultMap = new Map<string, KratzerResult>()
        ;((kratzerResults || []) as KratzerResult[]).forEach((row) =>
          resultMap.set(row.kratzer_tournament_id, row),
        )

        const countMap = new Map<string, number>()
        ;((players || []) as any[]).forEach((row) => {
          const id = String(row.kratzer_tournament_id)
          countMap.set(id, (countMap.get(id) || 0) + 1)
        })

        const mapped: ResultRow[] = finished.map((row) => {
          const result = resultMap.get(row.id)
          const created = row.created_at || new Date().toISOString()
          return {
            status_row_id: row.id,
            tournament_id: row.id,
            tournament_type: "kratzer",
            tournament_name: row.name || "Kratzer-Turnier",
            status: "completed",
            created_at: created,
            updated_at: row.finished_at || created,
            last_updated_at: row.finished_at || result?.created_at || created,
            winner: result?.winner_name || null,
            participants: countMap.get(row.id) || 0,
          }
        })

        const existing = new Set(combined.map((r) => `${r.tournament_type}:${r.tournament_id}`))
        combined = [
          ...mapped.filter((r) => !existing.has(`${r.tournament_type}:${r.tournament_id}`)),
          ...combined,
        ]
      }

      combined.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      setRows(combined)
      setLoading(false)
    }

    void load()
  }, [])

  const types = useMemo(
    () => Array.from(new Set(rows.map((row) => row.tournament_type).filter(Boolean))),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.tournament_type !== typeFilter) return false
      if (!q) return true
      return [row.tournament_name, row.winner, typeLabel(row.tournament_type)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [rows, query, typeFilter])

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.56]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.40),rgba(4,6,9,.74)),radial-gradient(circle_at_8%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.12),transparent_32%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1450px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink
            href="/terminal/turniere"
            label="Turnierbereich wird geöffnet"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
              Turnierbereich
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Turnier-Ergebnisse
            </h1>
          </div>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Abgeschlossen
            </div>
            <div className="mt-2 text-3xl font-black">{rows.length}</div>
          </div>
          <div className="rounded-[26px] border border-orange-400/18 bg-orange-500/[0.06] p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/55">
              Turnierarten
            </div>
            <div className="mt-2 text-3xl font-black text-orange-100">{types.length}</div>
          </div>
          <div className="rounded-[26px] border border-cyan-300/18 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
              Sieger erfasst
            </div>
            <div className="mt-2 text-3xl font-black text-cyan-100">
              {rows.filter((r) => r.winner).length}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[30px] border border-white/[0.08] bg-black/24 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-[280px] flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Turnier oder Sieger suchen…"
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="h-12 rounded-2xl border border-white/10 bg-[#0b0d10]/90 px-4 text-sm font-black text-white outline-none"
            >
              <option value="all">Alle Turnierarten</option>
              {types.map((type) => (
                <option key={type} value={type}>{typeLabel(type)}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
                Ergebnisse werden geladen
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-black/20 p-12 text-center backdrop-blur-xl">
              <Trophy className="mx-auto h-12 w-12 text-white/18" />
              <div className="mt-4 text-xl font-black text-white/60">Keine Ergebnisse gefunden</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => (
                <TerminalLink
                  key={`${row.tournament_type}-${row.tournament_id}`}
                  href={`/terminal/turniere/ergebnisse/${row.tournament_id}?type=${encodeURIComponent(row.tournament_type)}`}
                  label={`${row.tournament_name} wird geöffnet`}
                  className="group relative block overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/28 p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-orange-300/25"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/45 to-transparent" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-300">
                      <Target className="h-6 w-6" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Abgeschlossen
                    </span>
                  </div>

                  <div className="mt-4 min-h-[58px]">
                    <div className="line-clamp-2 text-xl font-black leading-tight">
                      {row.tournament_name}
                    </div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/30">
                      {typeLabel(row.tournament_type)}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-orange-300/12 bg-orange-500/[0.055] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/40">
                      <Crown className="h-4 w-4" /> Sieger
                    </div>
                    <div className="mt-2 truncate text-xl font-black text-orange-100">
                      {row.winner || "Noch nicht hinterlegt"}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                        <Users className="h-3.5 w-3.5" /> Teilnehmer
                      </div>
                      <div className="mt-1 text-lg font-black">{row.participants ?? "–"}</div>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                        <Clock3 className="h-3.5 w-3.5" /> Dauer
                      </div>
                      <div className="mt-1 text-lg font-black">{duration(row)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-white/35">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {dateDE(row.created_at)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/75 transition group-hover:text-orange-200">
                      History öffnen
                    </span>
                  </div>
                </TerminalLink>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

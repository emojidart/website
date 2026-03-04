"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Trophy, Users, ArrowRight, CheckCircle2, Search, Filter, Clock, X } from "lucide-react"
import { motion } from "framer-motion"

type TournamentOverviewRow = {
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

/** ✅ Kratzer Typen */
type KratzerTournamentRow = {
  id: string
  user_id: string
  name: string | null
  status: string | null
  created_at: string | null
  finished_at: string | null
}

type KratzerResultRow = {
  kratzer_tournament_id: string
  winner_id: string | null
  winner_name: string | null
  total_rounds: number | null
  created_at: string | null
}

/* ---------------- motion ---------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
}

/* ---------------- helpers ---------------- */

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const d = new Date(value)
  return d.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const typeLabel = (t?: string | null) => {
  if (!t) return "—"
  if (t === "kratzer") return "Kratzer"
  if (t.includes("8")) return "8er"
  if (t.includes("16")) return "16er"
  if (t.includes("32")) return "32er"
  if (t.includes("64")) return "64er"
  return t
}

const statusBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800">
    <CheckCircle2 className="h-3.5 w-3.5" />
    Abgeschlossen
  </span>
)

const formatDurationMs = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return "—"

  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes} min`

  const totalHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (totalHours < 24) return minutes ? `${totalHours}h ${minutes}m` : `${totalHours}h`

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours ? `${days}d ${hours}h` : `${days}d`
}

const getDurationLabel = (r: TournamentOverviewRow) => {
  const start = r.created_at ? new Date(r.created_at).getTime() : NaN
  const endRaw = r.last_updated_at ?? r.updated_at ?? r.created_at
  const end = endRaw ? new Date(endRaw).getTime() : NaN
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "—"
  return formatDurationMs(Math.max(0, end - start))
}

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "orange" | "blue" | "emerald" | "amber" | "slate"
}) {
  const cls =
    tone === "orange"
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : tone === "amber"
            ? "bg-amber-50 text-amber-900 border-amber-200"
            : tone === "slate"
              ? "bg-slate-50 text-slate-800 border-slate-200"
              : "bg-gray-50 text-gray-800 border-gray-200"

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

export default function TournamentHistoryPage() {
  const router = useRouter()

  const [rows, setRows] = useState<TournamentOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "8er_dko" | "16er_dko" | "32er_dko" | "64er_dko" | "kratzer">(
    "all",
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      // 1) Standard-Historie
      const { data, error } = await supabase
        .from("tournaments_history_overview")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        setError("Fehler beim Laden der Turnier-Historie.")
        setRows([])
        setLoading(false)
        return
      }

      let combined = (data ?? []) as TournamentOverviewRow[]

      try {
       
        const { data: kt, error: ktErr } = await supabase
          .from("kratzer_tournaments")
          .select("id,user_id,name,status,created_at,finished_at")
          .order("created_at", { ascending: false })

        if (ktErr) {
          console.warn("Kratzer tournaments load warning:", ktErr)
        } else {
          const finishedKratzer = (kt ?? []).filter((t: any) => String(t?.status ?? "").toLowerCase() === "finished") as
            | KratzerTournamentRow[]
            | any[]

          const ids = finishedKratzer.map((t: any) => t.id).filter(Boolean)

          // Results (Winner / Rounds)
          const resultsById = new Map<string, KratzerResultRow>()
          if (ids.length > 0) {
            const { data: kr, error: krErr } = await supabase
              .from("kratzer_tournament_results")
              .select("kratzer_tournament_id,winner_id,winner_name,total_rounds,created_at")
              .in("kratzer_tournament_id", ids)

            if (krErr) {
              console.warn("Kratzer results load warning:", krErr)
            } else {
              for (const r of (kr ?? []) as KratzerResultRow[]) resultsById.set(r.kratzer_tournament_id, r)
            }
          }

          // Participants count
          const participantsById = new Map<string, number>()
          if (ids.length > 0) {
            const { data: kp, error: kpErr } = await supabase
              .from("kratzer_tournament_players")
              .select("kratzer_tournament_id")
              .in("kratzer_tournament_id", ids)

            if (kpErr) {
              console.warn("Kratzer players count warning:", kpErr)
            } else {
              for (const p of (kp ?? []) as { kratzer_tournament_id: string }[]) {
                const k = p.kratzer_tournament_id
                participantsById.set(k, (participantsById.get(k) ?? 0) + 1)
              }
            }
          }

          const mappedKratzer: TournamentOverviewRow[] = (finishedKratzer as KratzerTournamentRow[]).map((t) => {
            const res = resultsById.get(t.id)
            const created = (t.created_at ?? new Date().toISOString()) as string
            const finishedAt = t.finished_at ?? null

            return {
              status_row_id: t.id,
              tournament_id: t.id,
              tournament_type: "kratzer",
              tournament_name: t.name ?? "Kratzer-Turnier",
              status: "completed",
              created_at: created,
              updated_at: (finishedAt ?? created) as string,
              last_updated_at: finishedAt ?? res?.created_at ?? t.created_at ?? null,
              winner: res?.winner_name ?? null,
              participants: participantsById.get(t.id) ?? 0,
            }
          })

          combined = [...mappedKratzer, ...combined].sort((a, b) => {
            const ta = new Date(a.created_at).getTime()
            const tb = new Date(b.created_at).getTime()
            return tb - ta
          })
        }
      } catch (e) {
        console.warn("Kratzer merge warning:", e)
      }

      setRows(combined)
      setLoading(false)
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()

    return rows.filter((r) => {
      const s = (r.status ?? "").toLowerCase()
      if (s !== "completed") return false

      if (typeFilter !== "all" && (r.tournament_type ?? "") !== typeFilter) return false

      if (qq) {
        const hay = `${r.tournament_name ?? ""} ${r.tournament_type ?? ""} ${r.winner ?? ""}`.toLowerCase()
        if (!hay.includes(qq)) return false
      }

      return true
    })
  }, [rows, q, typeFilter])

  const openTournament = (r: TournamentOverviewRow) => {
    router.push(`/tournament-history/${encodeURIComponent(r.tournament_id)}?type=${encodeURIComponent(r.tournament_type)}`)
  }

  const resetFilters = () => {
    setQ("")
    setTypeFilter("all")
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      {/* fixed header offset */}
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App-Header Card (Kontakt-Style) */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Turnier Historie</h1>
                  <p className="text-sm text-gray-600 mt-1">Alle abgeschlossenen Turniere auf einen Blick</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {loading ? "Lade…" : `${filtered.length} Turnier(e) gefunden`}
                  </p>
                </div>

                <div className="ml-auto hidden sm:flex items-center gap-2">
                  <Chip tone="emerald">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </Chip>
                  {typeFilter !== "all" ? <Chip tone="orange">{typeLabel(typeFilter)}</Chip> : <Chip>Alle Typen</Chip>}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filter Card (app look) */}
          <motion.div variants={itemVariants} className="mb-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Suche nach Name, Sieger, Typ…"
                        className="pl-9 h-11 rounded-2xl"
                      />
                      {q ? (
                        <button
                          type="button"
                          onClick={() => setQ("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100"
                          aria-label="Suche leeren"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      ) : null}
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="w-11 h-11 rounded-2xl border border-gray-200 bg-white flex items-center justify-center">
                        <Filter className="h-4 w-4 text-gray-600" />
                      </div>

                      <select
                        className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        title="Typ"
                      >
                        <option value="all">Alle Typen</option>
                        <option value="8er_dko">8er DKO</option>
                        <option value="16er_dko">16er DKO</option>
                        <option value="32er_dko">32er DKO</option>
                        <option value="64er_dko">64er DKO</option>
                        <option value="kratzer">Kratzer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="h-11 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black"
                    >
                      Zurücksetzen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content */}
          {loading ? (
            <motion.div variants={itemVariants} className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : error ? (
            <motion.div variants={itemVariants} className="text-red-600 font-semibold">
              {error}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 text-gray-700">
                Keine abgeschlossenen Turniere gefunden.
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((r) => (
                <Card
                  key={`${r.tournament_id}_${r.tournament_type}`}
                  className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
                  onClick={() => openTournament(r)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-black line-clamp-1">{r.tournament_name}</CardTitle>

                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <Chip tone="gray">{typeLabel(r.tournament_type)}</Chip>
                      {statusBadge()}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-5">
                    <div className="mt-2 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">{formatDateTime(r.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span>
                          Dauer: <span className="font-black text-gray-900">{getDurationLabel(r)}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span>
                          Teilnehmer: <span className="font-black text-gray-900">{r.participants ?? 0}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-orange-600" />
                        <span className="line-clamp-1">
                          Sieger: <span className="font-black text-gray-900">{r.winner || "—"}</span>
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 font-black"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTournament(r)
                      }}
                      type="button"
                    >
                      Öffnen <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
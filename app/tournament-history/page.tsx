"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Trophy,
  Users,
  ArrowRight,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react"

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
}

type KratzerResultRow = {
  kratzer_tournament_id: string
  winner_id: string | null
  winner_name: string | null
  total_rounds: number | null
  created_at: string | null
}

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
  <Badge className="bg-green-600 text-white inline-flex items-center gap-1">
    <CheckCircle2 className="h-3.5 w-3.5" />
    Abgeschlossen
  </Badge>
)

export default function TournamentHistoryPage() {
  const router = useRouter()

  const [rows, setRows] = useState<TournamentOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  
  const [q, setQ] = useState("")
  const [typeFilter, setTypeFilter] = useState<
    "all" | "8er_dko" | "16er_dko" | "32er_dko" | "64er_dko" | "kratzer"
  >("all")

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
          .select("id,user_id,name,status,created_at")
          .order("created_at", { ascending: false })

        if (ktErr) {
          console.warn("Kratzer tournaments load warning:", ktErr)
        } else {
          
          const finishedKratzer = (kt ?? []).filter((t: any) => {
            const s = String(t?.status ?? "").toLowerCase()
            return s === "finished"
          }) as KratzerTournamentRow[]

          const ids = finishedKratzer.map((t) => t.id).filter(Boolean)

         
          const resultsById = new Map<string, KratzerResultRow>()
          if (ids.length > 0) {
            const { data: kr, error: krErr } = await supabase
              .from("kratzer_tournament_results")
              .select("kratzer_tournament_id,winner_id,winner_name,total_rounds,created_at")
              .in("kratzer_tournament_id", ids)

            if (krErr) {
              console.warn("Kratzer results load warning:", krErr)
            } else {
              for (const r of (kr ?? []) as KratzerResultRow[]) {
                resultsById.set(r.kratzer_tournament_id, r)
              }
            }
          }

          
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

          const mappedKratzer: TournamentOverviewRow[] = finishedKratzer.map((t) => {
            const res = resultsById.get(t.id)
            const created = (t.created_at ?? new Date().toISOString()) as string

            return {
              status_row_id: t.id,
              tournament_id: t.id,
              tournament_type: "kratzer",
              tournament_name: t.name ?? "Kratzer-Turnier",
              status: "completed", 
              created_at: created,
              updated_at: created, 
              last_updated_at: res?.created_at ?? t.created_at ?? null,
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

      if (typeFilter !== "all") {
        if ((r.tournament_type ?? "") !== typeFilter) return false
      }

      if (qq) {
        const hay = `${r.tournament_name ?? ""} ${r.tournament_type ?? ""} ${r.winner ?? ""}`.toLowerCase()
        if (!hay.includes(qq)) return false
      }

      return true
    })
  }, [rows, q, typeFilter])

  const openTournament = (r: TournamentOverviewRow) => {
    router.push(
      `/tournament-history/${encodeURIComponent(r.tournament_id)}?type=${encodeURIComponent(
        r.tournament_type,
      )}`,
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-6 pb-24 max-w-6xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-3xl mb-4 shadow-xl">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Turnier Historie</h1>
          <p className="text-gray-600">Alle abgeschlossenen Turniere</p>
        </div>

        {}
        <Card className="mb-6 shadow-xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Suche nach Name, Sieger, Typ…"
                    className="pl-9"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <select
                    className="h-10 rounded-md border px-3 text-sm"
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
                  onClick={() => {
                    setQ("")
                    setTypeFilter("all")
                  }}
                >
                  Zurücksetzen
                </Button>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {loading ? "Lade…" : `${filtered.length} Turnier(e)`}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-600 font-semibold">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-700">Keine abgeschlossenen Turniere gefunden.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r) => (
              <Card
                key={`${r.tournament_id}_${r.tournament_type}`}
                className="shadow-xl cursor-pointer hover:shadow-2xl"
                onClick={() => openTournament(r)}
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold truncate">{r.tournament_name}</h3>

                  <div className="mt-2 flex gap-2 items-center">
                    <Badge variant="secondary">{typeLabel(r.tournament_type)}</Badge>
                    {statusBadge()}
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      {formatDateTime(r.created_at)}
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      Teilnehmer: <b>{r.participants ?? 0}</b>
                    </div>

                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-orange-600" />
                      Sieger: <b>{r.winner || "—"}</b>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      openTournament(r)
                    }}
                  >
                    Öffnen <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
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
import { Calendar, Trophy, Users, ArrowRight, XCircle, CheckCircle2, Search, Filter } from "lucide-react"

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

  if (t.includes("8")) return "8er"
  if (t.includes("16")) return "16er"
  if (t.includes("32")) return "32er"
  if (t.includes("64")) return "64er"
  return t
}

const statusBadge = (status?: string | null) => {
  const s = (status ?? "").toLowerCase()
  if (s === "completed")
    return (
      <Badge className="bg-green-600 text-white inline-flex items-center gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Abgeschlossen
      </Badge>
    )
  if (s === "cancelled")
    return (
      <Badge className="bg-red-600 text-white inline-flex items-center gap-1">
        <XCircle className="h-3.5 w-3.5" />
        Abgebrochen
      </Badge>
    )
  return <Badge variant="outline">Entwurf</Badge>
}

export default function TournamentHistoryPage() {
  const router = useRouter()

  const [rows, setRows] = useState<TournamentOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "cancelled" | "draft">("completed")
  const [typeFilter, setTypeFilter] = useState<"all" | "8er_dko" | "16er_dko" | "32er_dko" | "64er_dko">("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

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

      setRows((data ?? []) as TournamentOverviewRow[])
      setLoading(false)
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()

    return rows.filter((r) => {
      // Nur abgeschlossene Turniere anzeigen
      const forceStatus = (r.status ?? "").toLowerCase()
      if (forceStatus !== "completed") return false

      if (statusFilter !== "all") {
        const s = (r.status ?? "").toLowerCase()
        if (statusFilter === "draft") {
          if (s === "completed" || s === "cancelled") return false
        } else {
          if (s !== statusFilter) return false
        }
      }

      if (typeFilter !== "all") {
        if ((r.tournament_type ?? "") !== typeFilter) return false
      }

      if (qq) {
        const hay = `${r.tournament_name ?? ""} ${r.tournament_type ?? ""} ${r.winner ?? ""}`.toLowerCase()
        if (!hay.includes(qq)) return false
      }

      return true
    })
  }, [rows, q, statusFilter, typeFilter])

  const openTournament = (r: TournamentOverviewRow) => {
    router.push(`/tournament-history/${encodeURIComponent(r.tournament_id)}?type=${encodeURIComponent(r.tournament_type)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 max-w-6xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Turnier Historie</h1>
          <p className="text-lg sm:text-xl text-gray-600 px-4">Alle Turniere mit Status, Teilnehmern und Sieger</p>
        </div>

        <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    title="Status"
                    disabled
                  >
                    <option value="all">Alle Status</option>
                    <option value="completed">Abgeschlossen</option>
                    <option value="cancelled">Abgebrochen</option>
                    <option value="draft">Entwurf</option>
                  </select>

                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    title="Typ"
                  >
                    <option value="all">Alle Typen</option>
                    <option value="8er_dko">8er DKO</option>
                    <option value="16er_dko">16er DKO</option>
                    <option value="32er_dko">32er DKO</option>
                    <option value="64er_dko">64er DKO</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("")
                    setStatusFilter("completed")
                    setTypeFilter("all")
                  }}
                >
                  Zurücksetzen
                </Button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">{loading ? "Lade…" : `${filtered.length} Turnier(e) gefunden`}</div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card className="border-0 shadow-xl bg-white/95">
            <CardContent className="p-6">
              <div className="text-red-600 font-semibold">{error}</div>
              <div className="text-sm text-gray-600 mt-2">Bitte prüfe die View und RLS/Policies für die View.</div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/95">
            <CardContent className="p-6">
              <div className="text-gray-900 font-semibold">Keine Turniere gefunden.</div>
              <div className="text-sm text-gray-600 mt-2">Passe Filter oder Suche an.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((r) => (
              <Card
                key={`${r.tournament_id}_${r.tournament_type}`}
                className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => openTournament(r)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{r.tournament_name || "Turnier"}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 items-center">
                        <Badge variant="secondary">{typeLabel(r.tournament_type)}</Badge>
                        {statusBadge(r.status)}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="truncate">Erstellt: {formatDateTime(r.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span>
                        Teilnehmer: <span className="font-semibold">{r.participants ?? 0}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-orange-600" />
                      <span className="truncate">
                        Sieger: <span className="font-semibold">{r.winner || "—"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">Letztes Update: {formatDateTime(r.last_updated_at ?? r.updated_at)}</div>

                  <div className="mt-4">
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTournament(r)
                      }}
                    >
                      Öffnen
                    </Button>
                  </div>
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

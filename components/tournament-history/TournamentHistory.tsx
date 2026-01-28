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

export default function TournamentHistory() {
  const router = useRouter()

  const [rows, setRows] = useState<TournamentOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "cancelled" | "draft">("all")
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
    router.push(`/tournament/${encodeURIComponent(r.tournament_id)}?type=${encodeURIComponent(r.tournament_type)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-6 pb-24 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Turnier Historie</h1>

        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche..." />
          <select className="border rounded px-2 py-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Alle Status</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Abgebrochen</option>
            <option value="draft">Entwurf</option>
          </select>
          <select className="border rounded px-2 py-1" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
            <option value="all">Alle Typen</option>
            <option value="8er_dko">8er</option>
            <option value="16er_dko">16er</option>
            <option value="32er_dko">32er</option>
            <option value="64er_dko">64er</option>
          </select>
        </div>

        {loading ? (
          <div>Lade...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <Card key={`${r.tournament_id}_${r.tournament_type}`} className="cursor-pointer" onClick={() => openTournament(r)}>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg">{r.tournament_name}</h3>
                  <div className="flex gap-2 my-2">
                    <Badge>{typeLabel(r.tournament_type)}</Badge>
                    {statusBadge(r.status)}
                  </div>
                  <div className="text-sm">Teilnehmer: {r.participants ?? 0}</div>
                  <div className="text-sm">Sieger: {r.winner || "—"}</div>
                  <div className="text-xs text-gray-500 mt-2">Erstellt: {formatDateTime(r.created_at)}</div>
                  <Button className="w-full mt-3">Öffnen</Button>
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

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Crown,
  Loader2,
  Medal,
  RefreshCw,
  Shield,
  Star,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"

type BonusTransaction = {
  id: string
  player_name: string
  points: number
  created_at: string
}

type RankingRow = {
  playerName: string
  totalPoints: number
  entries: number
  rankTitle: string
  rankColor: string
  icon: any
}

function getRank(points: number) {
  if (points >= 2000) {
    return {
      title: "Gold",
      color: "border-yellow-300 bg-yellow-50 text-yellow-800",
      icon: Crown,
    }
  }

  if (points >= 1500) {
    return {
      title: "Silber",
      color: "border-slate-300 bg-slate-100 text-slate-700",
      icon: Shield,
    }
  }

  if (points >= 1000) {
    return {
      title: "Bronze",
      color: "border-orange-300 bg-orange-50 text-orange-700",
      icon: Medal,
    }
  }

  return {
    title: "Starter",
    color: "border-slate-200 bg-white text-slate-600",
    icon: Star,
  }
}

function getPlaceIcon(index: number) {
  if (index === 0) return "🥇"
  if (index === 1) return "🥈"
  if (index === 2) return "🥉"
  return `${index + 1}.`
}

export default function PraemienRanglistePage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadRanking()
  }, [])

  const loadRanking = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("bonus_transactions")
        .select("id, player_name, points, created_at")
        .order("created_at", { ascending: false })

      if (error) throw error

      setTransactions((data || []) as BonusTransaction[])
    } catch (error: any) {
      console.error("praemien ranking load error:", error)
      setError(error?.message || "Rangliste konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const ranking = useMemo(() => {
    const map = new Map<string, { totalPoints: number; entries: number }>()

    transactions.forEach((row) => {
      const name = String(row.player_name || "").trim()
      if (!name) return

      const current = map.get(name) || { totalPoints: 0, entries: 0 }
      current.totalPoints += Number(row.points || 0)
      current.entries += 1
      map.set(name, current)
    })

    return Array.from(map.entries())
      .map(([playerName, value]) => {
        const rank = getRank(value.totalPoints)

        return {
          playerName,
          totalPoints: value.totalPoints,
          entries: value.entries,
          rankTitle: rank.title,
          rankColor: rank.color,
          icon: rank.icon,
        } as RankingRow
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [transactions])



  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <Header />

      <div className="h-12 sm:h-14" />

      <main className="mx-auto w-full max-w-7xl px-3 py-5 pb-28 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/praemien"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-red-600 shadow-sm ring-1 ring-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>

          <button
            type="button"
            onClick={loadRanking}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-800 shadow-sm ring-1 ring-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Neu laden
          </button>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-red-100 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-yellow-100 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 sm:text-xs">
              <Trophy className="h-3.5 w-3.5" />
              EMD Bonusprogramm
            </div>

            <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Prämien-
              <span className="text-red-600">Rangliste</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
              Aktuelle Bonuspunkte aller Mitglieder. Eingelöste Prämien werden
              automatisch abgezogen.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-orange-700 sm:text-xs">
                  Bronze
                </p>
                <p className="mt-1 text-lg font-black text-slate-950 sm:text-2xl">
                  1.000
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-slate-700 sm:text-xs">
                  Silber
                </p>
                <p className="mt-1 text-lg font-black text-slate-950 sm:text-2xl">
                  1.500
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-yellow-700 sm:text-xs">
                  Gold
                </p>
                <p className="mt-1 text-lg font-black text-slate-950 sm:text-2xl">
                  2.000
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-red-600" />
            <p className="mt-4 text-sm font-black text-slate-900">
              Rangliste wird geladen...
            </p>
          </section>
        ) : error ? (
          <section className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-center shadow-lg shadow-slate-200/60">
            <p className="text-sm font-black text-red-700">{error}</p>
          </section>
        ) : (
          <>
           

            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <h2 className="text-xl font-black uppercase text-slate-950 sm:text-2xl">
                  Gesamtwertung
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  Sortiert nach aktuellen Bonuspunkten.
                </p>
              </div>

              {ranking.length === 0 ? (
                <div className="p-8 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    Noch keine Punkte vorhanden
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Sobald Bonuspunkte vergeben werden, erscheint die Rangliste hier.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ranking.map((player, index) => {
                    const RankIcon = player.icon

                    return (
                      <div
                        key={player.playerName}
                        className="grid grid-cols-[70px_1fr] gap-4 p-4 transition hover:bg-slate-50 sm:grid-cols-[64px_1fr_120px] sm:items-center sm:gap-4 lg:grid-cols-[80px_1fr_170px_160px]"
                      >
                        <div className="mb-3 flex items-center justify-between sm:mb-0 sm:block">
                          <span className="text-2xl font-black">
                            {getPlaceIcon(index)}
                          </span>

                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide sm:hidden ${player.rankColor}`}
                          >
                            <RankIcon className="h-3.5 w-3.5" />
                            {player.rankTitle}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h3 className="max-w-[210px] truncate text-base font-black uppercase text-slate-950 sm:max-w-none sm:text-lg">
  {player.playerName}
</h3>
                          <p className="text-xs font-bold text-slate-500">
                            {player.entries} Bonus-Einträge
                          </p>
                        </div>

                        <div className="mt-3 flex items-end gap-2 sm:mt-0">
                          <p className="text-3xl font-black text-red-600">
                            {player.totalPoints}
                          </p>
                          <p className="pb-1 text-[10px] font-bold uppercase text-slate-500">
                            Punkte
                          </p>
                        </div>

                        <div className="hidden justify-end lg:flex">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${player.rankColor}`}
                          >
                            <RankIcon className="h-4 w-4" />
                            {player.rankTitle}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
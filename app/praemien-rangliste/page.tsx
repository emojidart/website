"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Crown,
  Gift,
  Loader2,
  Medal,
  PackageCheck,
  RefreshCw,
  Shield,
  Star,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"
import { praemienProducts } from "@/lib/praemien-products"

type BonusTransaction = {
  id: string
  player_name: string
  points: number
  created_at: string
}

type RedemptionRow = {
  id: string
  player_id?: string | null
  player_name?: string | null
  product_slug?: string | null
  product_title?: string | null
  product_name?: string | null
  points_spent?: number | null
  points?: number | null
  status?: string | null
  created_at?: string | null
  redeemed_at?: string | null
}

type RankingRow = {
  playerName: string
  totalPoints: number
  entries: number
  redeemedCount: number
  lastRedeemedPrize: string | null
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

function formatDate(value?: string | null) {
  if (!value) return "—"

  try {
    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return value
  }
}

function getPrizeTitle(redemption: RedemptionRow) {
  const directTitle = String(redemption.product_title || redemption.product_name || "").trim()
  if (directTitle) return directTitle

  const slug = String(redemption.product_slug || "").trim()
  if (!slug) return "Prämie"

  const product = praemienProducts.find((item) => item.slug === slug)
  return product?.title || slug.replaceAll("-", " ")
}

function getRedemptionDate(redemption: RedemptionRow) {
  return redemption.redeemed_at || redemption.created_at || null
}

export default function PraemienRanglistePage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadRanking()
  }, [])

  const loadRanking = async () => {
    try {
      setLoading(true)
      setError(null)

      const [transactionsResult, redemptionsResult] = await Promise.all([
        supabase
          .from("bonus_transactions")
          .select("id, player_name, points, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("praemien_redemptions")
          .select("*")
          .order("created_at", { ascending: false }),
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (redemptionsResult.error) throw redemptionsResult.error

      setTransactions((transactionsResult.data || []) as BonusTransaction[])
      setRedemptions((redemptionsResult.data || []) as RedemptionRow[])
    } catch (error: any) {
      console.error("praemien ranking load error:", error)
      setError(error?.message || "Rangliste konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const redemptionsByPlayer = useMemo(() => {
    const map = new Map<string, RedemptionRow[]>()

    redemptions.forEach((row) => {
      const name = String(row.player_name || "").trim()
      if (!name) return

      const list = map.get(name) || []
      list.push(row)
      map.set(name, list)
    })

    return map
  }, [redemptions])

  const latestRedemptions = useMemo(() => {
    return redemptions
      .slice()
      .sort((a, b) => {
        return new Date(getRedemptionDate(b) || 0).getTime() - new Date(getRedemptionDate(a) || 0).getTime()
      })
      .slice(0, 8)
  }, [redemptions])

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
        const playerRedemptions = redemptionsByPlayer.get(playerName) || []
        const lastRedemption = playerRedemptions[0] || null

        return {
          playerName,
          totalPoints: value.totalPoints,
          entries: value.entries,
          redeemedCount: playerRedemptions.length,
          lastRedeemedPrize: lastRedemption ? getPrizeTitle(lastRedemption) : null,
          rankTitle: rank.title,
          rankColor: rank.color,
          icon: rank.icon,
        } as RankingRow
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [transactions, redemptionsByPlayer])

  const redeemedTotal = redemptions.length

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] text-slate-950 flex flex-col">
      <Header />

      <div className="h-12 sm:h-14" />

      <main className="w-full flex-grow px-2 pb-28 pt-4 sm:px-4 sm:pt-6 lg:px-5 xl:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/praemien"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-600 shadow-sm ring-1 ring-slate-200"
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

        <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 p-4 text-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] sm:p-6 lg:p-8 xl:rounded-[30px] xl:p-9">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-400 sm:text-xs">
              <Trophy className="h-3.5 w-3.5" />
              EMD Bonusprogramm
            </div>

            <h1 className="text-3xl font-black uppercase leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Prämien-
              <span className="text-orange-400">Rangliste</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/55 sm:text-base">
              Aktuelle Bonuspunkte aller Mitglieder. Zusätzlich siehst du, wer bereits eine Prämie eingelöst hat.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-orange-700 sm:text-xs">Bronze</p>
                <p className="mt-1 text-lg font-black text-white sm:text-2xl">1.000</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-slate-700 sm:text-xs">Silber</p>
                <p className="mt-1 text-lg font-black text-white sm:text-2xl">1.500</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase text-yellow-700 sm:text-xs">Gold</p>
                <p className="mt-1 text-lg font-black text-white sm:text-2xl">2.000</p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)]">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-600" />
            <p className="mt-4 text-sm font-black text-slate-900">Rangliste wird geladen...</p>
          </section>
        ) : error ? (
          <section className="mt-5 rounded-[24px] border border-orange-200 bg-orange-50 p-5 text-center shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-black text-orange-700">{error}</p>
          </section>
        ) : (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Mitglieder</p>
                    <p className="text-2xl font-black text-slate-950">{ranking.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Eingelöste Prämien</p>
                    <p className="text-2xl font-black text-slate-950">{redeemedTotal}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/praemien"
                className="rounded-[24px] border border-orange-200 bg-gradient-to-br from-orange-500 to-orange-500 p-4 text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-white/80">Prämien-Shop</p>
                    <p className="text-lg font-black">Prämien ansehen</p>
                  </div>
                  <PackageCheck className="h-8 w-8" />
                </div>
              </Link>
            </section>

            <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <h2 className="text-xl font-black uppercase text-slate-950 sm:text-2xl">Gesamtwertung</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  Sortiert nach aktuellen Bonuspunkten.
                </p>
              </div>

              {ranking.length === 0 ? (
                <div className="p-8 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-4 text-lg font-black text-slate-950">Noch keine Punkte vorhanden</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Sobald Bonuspunkte vergeben werden, erscheint die Rangliste hier.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ranking.map((player, index) => {
                    const RankIcon = player.icon

                    return (
                      <div key={player.playerName} className="p-4 transition hover:bg-slate-50 sm:p-5">
                        <div className="flex flex-col gap-4 md:grid md:grid-cols-[72px_minmax(0,1fr)_150px_140px] md:items-center xl:grid-cols-[80px_minmax(0,1fr)_180px_170px]">
                          <div className="flex items-center justify-between gap-3 sm:block">
                            <span className="text-3xl font-black leading-none text-slate-950 sm:text-2xl">
                              {getPlaceIcon(index)}
                            </span>

                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide md:hidden ${player.rankColor}`}>
                              <RankIcon className="h-3.5 w-3.5" />
                              {player.rankTitle}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words text-xl font-black uppercase leading-tight text-slate-950 sm:text-lg">
                              {player.playerName}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                {player.entries} Bonus-Einträge
                              </span>
                              {player.redeemedCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700 ring-1 ring-green-200">
                                  <Gift className="h-3.5 w-3.5" />
                                  {player.redeemedCount} eingelöst
                                </span>
                              ) : null}
                            </div>
                            {player.lastRedeemedPrize ? (
                              <p className="mt-2 text-xs font-bold text-slate-500">
                                Letzte Prämie: {player.lastRedeemedPrize}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-end gap-2 md:justify-end">
                            <p className="text-4xl font-black leading-none text-orange-600 sm:text-3xl">
                              {player.totalPoints}
                            </p>
                            <p className="pb-1 text-[10px] font-black uppercase text-slate-500">Punkte</p>
                          </div>

                          <div className="hidden justify-end md:flex">
                            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${player.rankColor}`}>
                              <RankIcon className="h-4 w-4" />
                              {player.rankTitle}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-xl font-black uppercase text-slate-950 sm:text-2xl">
                  <Gift className="h-5 w-5 text-orange-600" />
                  Eingelöste Prämien
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  
                </p>
              </div>

              {latestRedemptions.length === 0 ? (
                <div className="p-8 text-center">
                  <Gift className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-4 text-lg font-black text-slate-950">Noch keine Prämie eingelöst</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Sobald jemand eine Prämie einlöst, erscheint der Eintrag hier.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {latestRedemptions.map((redemption) => {
                    const playerName = String(redemption.player_name || "Unbekanntes Mitglied").trim()
                    const prizeTitle = getPrizeTitle(redemption)
                    const spent = Number(redemption.points_spent ?? redemption.points ?? 0)
                    const status = String(redemption.status || "gespeichert")

                    return (
                      <div key={redemption.id} className="p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words text-base font-black uppercase text-slate-950 sm:text-lg">
                              {playerName}
                            </h3>
                            <p className="mt-1 text-sm font-bold text-slate-600">{prizeTitle}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                {formatDate(getRedemptionDate(redemption))}
                              </span>
                              <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700 ring-1 ring-green-200">
                                {status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 sm:min-w-[130px] md:justify-end">
                            <span className="text-xs font-black uppercase text-orange-700">Abgezogen</span>
                            <span className="text-2xl font-black text-orange-600">
                              {spent > 0 ? `-${spent}` : "—"}
                            </span>
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

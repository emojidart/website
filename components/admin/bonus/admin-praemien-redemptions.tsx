"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  Clock,
  Gift,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Trophy,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type RedemptionRow = {
  id: string
  product_slug: string
  product_title: string
  product_points: number
  player_id: string
  player_name: string
  user_id: string | null
  status: string
  created_at: string
}

interface AdminPraemienRedemptionsProps {
  user: User | null
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function getStatusInfo(status: string) {
  const clean = String(status || "").toLowerCase()

  if (clean === "abgeschlossen" || clean === "ausgegeben" || clean === "done") {
    return {
      label: "Abgeschlossen",
      icon: CheckCircle,
      className: "bg-green-50 text-green-700 border-green-200",
    }
  }

  if (clean === "storniert" || clean === "cancelled") {
    return {
      label: "Storniert",
      icon: XCircle,
      className: "bg-red-50 text-red-700 border-red-200",
    }
  }

  return {
    label: "Offen",
    icon: Clock,
    className: "bg-orange-50 text-orange-700 border-orange-200",
  }
}

export function AdminPraemienRedemptions({ user }: AdminPraemienRedemptionsProps) {
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "offen" | "abgeschlossen">("all")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      void loadRedemptions()
    }
  }, [user?.id])

  const loadRedemptions = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const { data, error } = await supabase
        .from("praemien_redemptions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setRedemptions((data || []) as RedemptionRow[])
    } catch (error: any) {
      console.error("praemien redemptions load error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Eingelöste Prämien konnten nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: "offen" | "abgeschlossen" | "storniert") => {
    try {
      setUpdatingId(id)
      setMessage(null)

      const { error } = await supabase
        .from("praemien_redemptions")
        .update({ status })
        .eq("id", id)

      if (error) throw error

      setRedemptions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      )

      setMessage({
        type: "success",
        text:
          status === "abgeschlossen"
            ? "Prämie wurde als abgeschlossen markiert."
            : status === "storniert"
              ? "Prämie wurde storniert."
              : "Prämie wurde wieder auf offen gesetzt.",
      })
    } catch (error: any) {
      console.error("praemien redemptions update error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Status konnte nicht geändert werden.",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredRedemptions = useMemo(() => {
    const q = search.trim().toLowerCase()

    return redemptions.filter((item) => {
      const status = String(item.status || "").toLowerCase()
      const isClosed = status === "abgeschlossen" || status === "ausgegeben" || status === "done"

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "offen" && !isClosed && status !== "storniert") ||
        (statusFilter === "abgeschlossen" && isClosed)

      const matchesSearch =
        !q ||
        item.player_name?.toLowerCase().includes(q) ||
        item.product_title?.toLowerCase().includes(q) ||
        item.product_slug?.toLowerCase().includes(q)

      return matchesStatus && matchesSearch
    })
  }, [redemptions, search, statusFilter])

  const openCount = redemptions.filter((item) => {
    const status = String(item.status || "").toLowerCase()
    return status !== "abgeschlossen" && status !== "ausgegeben" && status !== "done" && status !== "storniert"
  }).length

  const doneCount = redemptions.filter((item) => {
    const status = String(item.status || "").toLowerCase()
    return status === "abgeschlossen" || status === "ausgegeben" || status === "done"
  }).length

  const totalPoints = redemptions.reduce((sum, item) => sum + Number(item.product_points || 0), 0)

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-red-600" />

        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
              <Gift className="h-6 w-6 text-orange-600" />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-900">Eingelöste Prämien</h2>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Hier siehst du alle eingelösten Sachprämien und kannst sie nach Ausgabe abschließen.
              </p>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={() => void loadRedemptions()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Neu laden
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-bold",
            message.type === "success" && "border-green-200 bg-green-50 text-green-800",
            message.type === "error" && "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-500">Offen</div>
                <div className="mt-1 text-3xl font-black text-orange-600">{openCount}</div>
              </div>
              <Clock className="h-7 w-7 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-500">Abgeschlossen</div>
                <div className="mt-1 text-3xl font-black text-green-600">{doneCount}</div>
              </div>
              <PackageCheck className="h-7 w-7 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-500">Punkte eingelöst</div>
                <div className="mt-1 text-3xl font-black text-gray-900">{totalPoints}</div>
              </div>
              <Trophy className="h-7 w-7 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Prämien-Ausgabe</CardTitle>
          <CardDescription>
            Offene Einlösungen prüfen und nach Übergabe auf abgeschlossen stellen.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nach Spieler oder Prämie suchen..."
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className="rounded-xl"
              >
                Alle
              </Button>
              <Button
                type="button"
                variant={statusFilter === "offen" ? "default" : "outline"}
                onClick={() => setStatusFilter("offen")}
                className="rounded-xl"
              >
                Offen
              </Button>
              <Button
                type="button"
                variant={statusFilter === "abgeschlossen" ? "default" : "outline"}
                onClick={() => setStatusFilter("abgeschlossen")}
                className="rounded-xl"
              >
                Fertig
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <ScrollArea className="h-[620px]">
              <div className="space-y-3 p-3">
                {loading ? (
                  <div className="flex items-center gap-2 p-4 text-sm font-semibold text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eingelöste Prämien werden geladen...
                  </div>
                ) : filteredRedemptions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Gift className="mx-auto h-10 w-10 text-gray-300" />
                    <h3 className="mt-4 text-lg font-black text-gray-900">Keine Einlösungen gefunden</h3>
                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Sobald jemand eine Prämie einlöst, erscheint sie hier.
                    </p>
                  </div>
                ) : (
                  filteredRedemptions.map((item) => {
                    const statusInfo = getStatusInfo(item.status)
                    const StatusIcon = statusInfo.icon
                    const isDone =
                      String(item.status).toLowerCase() === "abgeschlossen" ||
                      String(item.status).toLowerCase() === "ausgegeben" ||
                      String(item.status).toLowerCase() === "done"

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("rounded-full px-3 py-1 font-black", statusInfo.className)}
                              >
                                <StatusIcon className="mr-1 h-3.5 w-3.5" />
                                {statusInfo.label}
                              </Badge>

                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                {item.product_points} Punkte
                              </Badge>

                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                {formatDate(item.created_at)}
                              </Badge>
                            </div>

                            <h3 className="mt-3 text-lg font-black text-gray-900">
                              {item.product_title || item.product_slug}
                            </h3>

                            <p className="mt-1 text-sm font-bold text-gray-600">
                              Eingelöst von:{" "}
                              <span className="text-gray-900">{item.player_name || "Unbekannt"}</span>
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-400">
                              Produkt-Code: {item.product_slug}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[460px]">
                            <Button
                              type="button"
                              onClick={() => updateStatus(item.id, "abgeschlossen")}
                              disabled={updatingId === item.id || isDone}
                              className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                            >
                              {updatingId === item.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              Abschließen
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => updateStatus(item.id, "offen")}
                              disabled={updatingId === item.id || !isDone}
                              className="rounded-xl"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Wieder offen
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => updateStatus(item.id, "storniert")}
                              disabled={updatingId === item.id}
                              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Storno
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
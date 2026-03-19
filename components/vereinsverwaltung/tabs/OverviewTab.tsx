"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, BadgeCheck, CreditCard, FileDown, Filter, Mail, MapPin, Phone, Search, Shirt, UserRound, CalendarDays, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"
import { cn } from "@/lib/utils"

type Props = {
  clubPlayers: ClubPlayer[]
}

type MissingKey =
  | "player_number"
  | "birthdate"
  | "email"
  | "phone"
  | "street"
  | "house_number"
  | "postal_code"
  | "city"
  | "jersey_size"

const REQUIRED_FIELDS: Array<{ key: MissingKey; label: string }> = [
  { key: "player_number", label: "Nr." },
  { key: "birthdate", label: "Geburtsdatum" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "street", label: "Straße" },
  { key: "house_number", label: "Hausnr." },
  { key: "postal_code", label: "PLZ" },
  { key: "city", label: "Ort" },
  { key: "jersey_size", label: "Trikotgröße" },
]

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "number") return true
  return String(value).trim().length > 0
}

function getMissingFields(player: ClubPlayer) {
  return REQUIRED_FIELDS.filter((field) => !hasValue((player as any)[field.key]))
}

function isPlayerCardActive(player: ClubPlayer) {
  return !!(player as any)?.spieldatenbank_id
}

function isInactive(player: ClubPlayer) {
  return (player as any)?.is_active === false || !!player.club_left_at
}

export function OverviewTab({ clubPlayers }: Props) {
  const [search, setSearch] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "complete">("incomplete")

  const rows = useMemo(() => {
    return clubPlayers
      .map((player) => {
        const missing = getMissingFields(player)
        return {
          player,
          missing,
          missingCount: missing.length,
          playerCardActive: isPlayerCardActive(player),
          inactive: isInactive(player),
        }
      })
      .sort((a, b) => {
        if (b.missingCount !== a.missingCount) return b.missingCount - a.missingCount
        return (a.player.name || "").localeCompare(b.player.name || "")
      })
  }, [clubPlayers])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((row) => {
      const text = [
        row.player.name,
        row.player.email,
        row.player.phone,
        row.player.city,
        row.player.street,
        String(row.player.player_number ?? ""),
        row.missing.map((m) => m.label).join(" "),
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch = !q || text.includes(q)
      const matchesFilter =
        filterMode === "all"
          ? true
          : filterMode === "incomplete"
            ? row.missingCount > 0
            : row.missingCount === 0

      return matchesSearch && matchesFilter
    })
  }, [rows, search, filterMode])

  const summary = useMemo(() => {
    const activePlayers = rows.filter((r) => !r.inactive)
    const complete = activePlayers.filter((r) => r.missingCount === 0).length
    const incomplete = activePlayers.filter((r) => r.missingCount > 0).length
    const cardActive = activePlayers.filter((r) => r.playerCardActive).length
    const totalMissing = activePlayers.reduce((sum, row) => sum + row.missingCount, 0)

    const topMissing = REQUIRED_FIELDS.map((field) => ({
      ...field,
      count: activePlayers.filter((row) => row.missing.some((m) => m.key === field.key)).length,
    })).sort((a, b) => b.count - a.count)

    return { complete, incomplete, cardActive, totalMissing, activeCount: activePlayers.length, topMissing }
  }, [rows])

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <div className="space-y-6 overview-print-area">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .overview-print-area,
          .overview-print-area * {
            visibility: visible;
          }
          .overview-print-area {
            position: absolute;
            inset: 0;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          table {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between no-print">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Übersicht</h3>
          <p className="text-sm text-gray-500">
            Übersicht der Mitglieder mit fehlenden Pflichtangaben.
          </p>
        </div>

        <Button onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700 w-full lg:w-auto">
          <FileDown className="h-4 w-4 mr-2" />
          Drucken / PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Aktive Mitglieder</CardDescription>
            <CardTitle className="text-3xl">{summary.activeCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-orange-600" />
            Gesamt im Überblick
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Unvollständig</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{summary.incomplete}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pflichtfelder fehlen
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Vollständig</CardDescription>
            <CardTitle className="text-3xl text-green-700">{summary.complete}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-700 flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            Alle Pflichtfelder gepflegt
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Players Card aktiv</CardDescription>
            <CardTitle className="text-3xl text-blue-700">{summary.cardActive}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Zur schnellen Kontrolle
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Häufig fehlende Angaben</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {summary.topMissing.map((item) => (
            <Badge key={item.key} variant="outline" className="rounded-full px-3 py-1 text-sm border-gray-200 bg-white">
              {item.label}: {item.count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm rounded-2xl no-print">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="text-sm font-medium text-gray-700">Suchen</label>
              <div className="relative mt-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, Ort oder fehlendes Feld suchen ..."
                  className="pl-9 h-10 border-gray-200 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: "incomplete", label: "Nur unvollständig" },
                { key: "complete", label: "Nur vollständig" },
                { key: "all", label: "Alle" },
              ].map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant={filterMode === item.key ? "default" : "outline"}
                  onClick={() => setFilterMode(item.key as typeof filterMode)}
                  className={cn(
                    "rounded-xl whitespace-nowrap",
                    filterMode === item.key
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "border-gray-200 text-gray-700"
                  )}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Mitglieder-Check</CardTitle>
          <CardDescription>
            IBAN, Mitglied seit und Ausgetreten werden hier bewusst nicht als fehlend markiert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              Keine passenden Mitglieder gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700">Mitglied</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Fehlende Angaben</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Players Card</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={row.player.id} className={cn("border-t border-gray-200 align-top", idx % 2 === 1 && "bg-gray-50/30")}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.player.name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                          {hasValue(row.player.player_number) && (
                            <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{row.player.player_number}</span>
                          )}
                          {hasValue(row.player.birthdate) && (
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{row.player.birthdate}</span>
                          )}
                          {hasValue(row.player.email) && (
                            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{row.player.email}</span>
                          )}
                          {hasValue(row.player.phone) && (
                            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{row.player.phone}</span>
                          )}
                          {hasValue(row.player.city) && (
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{row.player.city}</span>
                          )}
                          {hasValue(row.player.jersey_size) && (
                            <span className="inline-flex items-center gap-1"><Shirt className="h-3 w-3" />{row.player.jersey_size}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {row.missingCount === 0 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            Vollständig
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {row.missing.map((field) => (
                              <Badge
                                key={field.key}
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-800"
                              >
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {row.playerCardActive ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                            Aktiv
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {row.inactive ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Ausgetreten / inaktiv</Badge>
                        ) : row.missingCount === 0 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">OK</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Nachpflege nötig</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

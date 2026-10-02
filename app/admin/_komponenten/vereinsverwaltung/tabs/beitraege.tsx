"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  ListChecks,
  Search,
  CircleCheck,
  CircleDashed,
  CircleX,
} from "lucide-react"
import type { DuesCadence } from "@/components/vereinsverwaltung/types"
import type { DuesPeriod, PlayerDuesSummaryRow } from "@/hooks/vereinsverwaltung/useDues"

type MessageType = "success" | "error" | "info"

type Props = {
  summaryRows: PlayerDuesSummaryRow[]
  periodsByPlayer: Map<string, DuesPeriod[]>

  loading: boolean
  message: string
  messageType: MessageType

  onSaveSetting: (playerId: string, cadence: DuesCadence, amount: number, startOn: string, isActive: boolean) => void
  onMarkPaid: (playerId: string, dueOn: string) => void
  onMarkPaidAllOpen: (playerId: string) => void // ✅ NEU
  onResetPaid: (playerId: string, dueOn: string) => void
}

type FilterKey = "all" | "overdue" | "due" | "paid" | "upcoming" | "no_plan" | "inactive"

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"

  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s

  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}`
}

function normalizeISOForInput(d: string | null | undefined) {
  if (!d) return ""
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : s
}

function cadenceLabel(c: DuesCadence) {
  switch (c) {
    case "monthly":
      return "Monatlich"
    case "quarterly":
      return "Vierteljährlich"
    case "semiannual":
      return "Halbjährlich"
    case "annual":
      return "Jährlich"
  }
}

function summaryBadge(summary_tone: PlayerDuesSummaryRow["summary_tone"]) {
  switch (summary_tone) {
    case "overdue":
      return { cls: "bg-red-50 text-red-700 border border-red-100", icon: <CircleX className="h-3.5 w-3.5" />, label: "Überfällig" }
    case "due":
      return { cls: "bg-yellow-50 text-yellow-800 border border-yellow-100", icon: <CircleDashed className="h-3.5 w-3.5" />, label: "Fällig" }
    case "ok":
      return { cls: "bg-green-50 text-green-700 border border-green-100", icon: <CircleCheck className="h-3.5 w-3.5" />, label: "Alles bezahlt" }
    case "inactive":
      return { cls: "bg-gray-50 text-gray-700 border border-gray-200", icon: <CircleDashed className="h-3.5 w-3.5" />, label: "Inaktiv" }
    case "no_plan":
    default:
      return { cls: "bg-gray-50 text-gray-700 border border-gray-200", icon: <CircleDashed className="h-3.5 w-3.5" />, label: "Kein Beitrag" }
  }
}

function periodBadge(per: DuesPeriod) {
  switch (per.status_tone) {
    case "paid":
      return { cls: "bg-green-50 text-green-700 border border-green-100", icon: <CircleCheck className="h-3.5 w-3.5" /> }
    case "overdue":
      return { cls: "bg-red-50 text-red-700 border border-red-100", icon: <CircleX className="h-3.5 w-3.5" /> }
    case "due":
      return { cls: "bg-yellow-50 text-yellow-800 border border-yellow-100", icon: <CircleDashed className="h-3.5 w-3.5" /> }
    case "upcoming":
    default:
      return { cls: "bg-blue-50 text-blue-700 border border-blue-100", icon: <CircleDashed className="h-3.5 w-3.5" /> }
  }
}

function matchesFilter(row: PlayerDuesSummaryRow, filter: FilterKey) {
  switch (filter) {
    case "all":
      return true
    case "overdue":
      return row.summary_tone === "overdue"
    case "due":
      return row.summary_tone === "due"
    case "paid":
      return row.summary_tone === "ok"
    case "no_plan":
      return row.summary_tone === "no_plan"
    case "inactive":
      return row.summary_tone === "inactive"
    case "upcoming":
      return row.summary_tone === "ok"
    default:
      return true
  }
}

export function DuesTab({
  summaryRows,
  periodsByPlayer,
  loading,
  message,
  messageType,
  onSaveSetting,
  onMarkPaid,
  onMarkPaidAllOpen,
  onResetPaid,
}: Props) {
  const topRef = useRef<HTMLDivElement | null>(null)
  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  const [filter, setFilter] = useState<FilterKey>("all")
  const [search, setSearch] = useState("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const selected = useMemo(
    () => summaryRows.find((r) => r.player_id === selectedPlayerId) ?? null,
    [summaryRows, selectedPlayerId],
  )

  const periods = useMemo(
    () => (selectedPlayerId ? periodsByPlayer.get(selectedPlayerId) || [] : []),
    [periodsByPlayer, selectedPlayerId],
  )

  // Editor fields
  const [cadence, setCadence] = useState<DuesCadence>("monthly")
  const [amount, setAmount] = useState<string>("")
  const [startOn, setStartOn] = useState<string>("")
  const [isActive, setIsActive] = useState<boolean>(true)

  useEffect(() => {
    if (!selected) {
      setCadence("monthly")
      setAmount("")
      setStartOn("")
      setIsActive(true)
      return
    }
    if (selected.cadence) setCadence(selected.cadence)
    setAmount(selected.amount != null ? String(selected.amount) : "")
    setStartOn(normalizeISOForInput(selected.start_on ?? selected.joined_at ?? ""))
    setIsActive(selected.is_active)
  }, [selected])

  const canSave = !!selectedPlayerId && !!startOn && amount !== "" && !Number.isNaN(Number(amount)) && Number(amount) >= 0

  const save = () => {
    if (!selectedPlayerId || !canSave) return
    onSaveSetting(selectedPlayerId, cadence, Number(amount), startOn, isActive)
    setTimeout(() => scrollToTop(), 0)
  }

  // counts for overview
  const counts = useMemo(() => {
    const c = { overdue: 0, due: 0, ok: 0, no_plan: 0, inactive: 0, total: summaryRows.length }
    for (const r of summaryRows) {
      if (r.summary_tone === "overdue") c.overdue++
      else if (r.summary_tone === "due") c.due++
      else if (r.summary_tone === "ok") c.ok++
      else if (r.summary_tone === "no_plan") c.no_plan++
      else if (r.summary_tone === "inactive") c.inactive++
    }
    return c
  }, [summaryRows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return summaryRows.filter((r) => {
      if (!matchesFilter(r, filter)) return false
      if (!q) return true
      return (r.player_name ?? "").toLowerCase().includes(q)
    })
  }, [summaryRows, filter, search])

  const hasOpenPeriods = useMemo(() => {
    if (!selectedPlayerId) return false
    return periods.some((p) => !p.paid_on && (p.status_tone === "due" || p.status_tone === "overdue"))
  }, [periods, selectedPlayerId])

  return (
    <div className="space-y-6">
      <div ref={topRef} className="scroll-mt-24">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Beiträge / Überblick
        </h3>
        <p className="text-sm text-gray-500">Filtere nach Überfällig/Fällig/Bezahlt und öffne pro Spieler die Periodenliste.</p>

        <div className="mt-3 p-3 rounded-lg text-sm font-medium flex items-center space-x-2 bg-orange-50 text-orange-700 border border-orange-100">
          <AlertCircle className="h-4 w-4" />
          <span>
            Beiträge müssen bis spätestens zum 20. des Monats am Konto sein. Als „Überfällig“ gilt es erst, wenn bis inkl. 25. nicht als bezahlt markiert wurde.
          </span>
        </div>
      </div>

      {/* Stat Kacheln */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-lg border p-3 text-left bg-white hover:bg-gray-50 transition",
            filter === "all" ? "border-orange-300 ring-2 ring-orange-200" : "border-gray-200",
          )}
        >
          <div className="text-xs text-gray-500">Alle</div>
          <div className="text-xl font-bold text-gray-900">{counts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("overdue")}
          className={cn(
            "rounded-lg border p-3 text-left bg-white hover:bg-gray-50 transition",
            filter === "overdue" ? "border-orange-300 ring-2 ring-orange-200" : "border-gray-200",
          )}
        >
          <div className="text-xs text-gray-500">Überfällig</div>
          <div className="text-xl font-bold text-gray-900">{counts.overdue}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("due")}
          className={cn(
            "rounded-lg border p-3 text-left bg-white hover:bg-gray-50 transition",
            filter === "due" ? "border-orange-300 ring-2 ring-orange-200" : "border-gray-200",
          )}
        >
          <div className="text-xs text-gray-500">Fällig</div>
          <div className="text-xl font-bold text-gray-900">{counts.due}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("paid")}
          className={cn(
            "rounded-lg border p-3 text-left bg-white hover:bg-gray-50 transition",
            filter === "paid" ? "border-orange-300 ring-2 ring-orange-200" : "border-gray-200",
          )}
        >
          <div className="text-xs text-gray-500">Bezahlt</div>
          <div className="text-xl font-bold text-gray-900">{counts.ok}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("no_plan")}
          className={cn(
            "rounded-lg border p-3 text-left bg-white hover:bg-gray-50 transition",
            filter === "no_plan" ? "border-orange-300 ring-2 ring-orange-200" : "border-gray-200",
          )}
        >
          <div className="text-xs text-gray-500">Kein Beitrag</div>
          <div className="text-xl font-bold text-gray-900">{counts.no_plan}</div>
        </button>
      </div>

      {/* Filter + Suche */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Filter</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="overdue">Überfällig</SelectItem>
                <SelectItem value="due">Fällig</SelectItem>
                <SelectItem value="paid">Bezahlt</SelectItem>
                <SelectItem value="no_plan">Kein Beitrag</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Suche</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name suchen..."
                className="h-10 pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
              />
            </div>
          </div>
        </div>

        {message && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
              messageType === "error"
                ? "bg-red-50 text-red-700 border border-red-100"
                : messageType === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-gray-50 text-gray-700 border border-gray-100",
            )}
          >
            {messageType === "error" ? <AlertCircle className="h-4 w-4" /> : messageType === "success" ? <CheckCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Übersicht Tabelle */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h4 className="text-md font-semibold text-gray-800">Spieler Übersicht</h4>
          <p className="text-xs text-gray-500">Klicke „Öffnen“, um Perioden & Zahlung zu bearbeiten.</p>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Spieler</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Rhythmus</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Betrag</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Nächste offene Fälligkeit</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Status</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-gray-500">
                    Keine Einträge für diesen Filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const b = summaryBadge(r.summary_tone)
                  return (
                    <tr key={r.player_id} className={cn("border-t border-gray-200 hover:bg-gray-50/60", idx % 2 === 1 && "bg-gray-50/30")}>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 font-medium text-gray-800">{r.player_name}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{r.cadence ? cadenceLabel(r.cadence) : "—"}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{r.amount != null ? `${r.amount.toFixed(2)} ${r.currency ?? "EUR"}` : "—"}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{fmtDateISO(r.next_unpaid_due_on)}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", b.cls)}>
                          {b.icon}
                          {b.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setSelectedPlayerId(r.player_id)
                              setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
                              setTimeout(() => document.getElementById("dues-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150)
                            }}
                          >
                            Öffnen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor + Perioden */}
      <div id="dues-editor" className="space-y-6 scroll-mt-24">
        <h4 className="text-md font-semibold text-gray-800">Beitrag bearbeiten</h4>

        {!selectedPlayerId ? (
          <p className="text-sm text-gray-500">Bitte in der Tabelle „Öffnen“ klicken oder oben einen Spieler wählen.</p>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
              <div className="text-sm font-semibold text-gray-800">
                Spieler: <span className="text-gray-900">{selected?.player_name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rhythmus</Label>
                  <Select value={cadence} onValueChange={(v) => setCadence(v as DuesCadence)}>
                    <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
                      <SelectValue placeholder="Rhythmus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                      <SelectItem value="semiannual">Halbjährlich</SelectItem>
                      <SelectItem value="annual">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Betrag (EUR)</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="z.B. 10.00"
                    className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  <input
                    type="date"
                    value={startOn}
                    onChange={(e) => setStartOn(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="isActive">Beitrag aktiv</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  type="button"
                  disabled={!canSave || loading}
                  className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
                  onClick={save}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Speichern...</span>
                    </div>
                  ) : (
                    "Beitrag speichern"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-gray-200"
                  onClick={() => document.getElementById("dues-periods")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <ListChecks className="h-4 w-4 mr-2" />
                  Zu den Perioden
                </Button>
              </div>
            </div>

            <div id="dues-periods" className="space-y-3 scroll-mt-24">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-md font-semibold text-gray-800">Perioden / Fälligkeiten</h4>

                {/* ✅ NEU: Bulk-Button */}
                <Button
                  type="button"
                  className="h-9 bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={loading || !hasOpenPeriods}
                  onClick={() => onMarkPaidAllOpen(selectedPlayerId)}
                  title="Markiert alle offenen Perioden bis inkl. heute als bezahlt"
                >
                  Alle offenen Perioden bezahlen
                </Button>
              </div>

              {periods.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Perioden berechnet. Lege zuerst einen aktiven Beitrag (Rhythmus + Startdatum + Betrag) an.</p>
              ) : (
                <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Fällig am</th>
                        <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Betrag</th>
                        <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Bezahlt am</th>
                        <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Status</th>
                        <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((per, idx) => {
                        const b = periodBadge(per)
                        return (
                          <tr key={per.due_on} className={cn("border-t border-gray-200 hover:bg-gray-50/60", idx % 2 === 1 && "bg-gray-50/30")}>
                            <td className="px-3 py-2 lg:px-4 lg:py-3 font-medium text-gray-800">{fmtDateISO(per.due_on)}</td>
                            <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">
                              {per.amount.toFixed(2)} {per.currency}
                            </td>
                            <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{fmtDateISO(per.paid_on)}</td>
                            <td className="px-3 py-2 lg:px-4 lg:py-3">
                              <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", b.cls)}>
                                {b.icon}
                                {per.status_label}
                              </span>
                            </td>
                            <td className="px-3 py-2 lg:px-4 lg:py-3">
                              <div className="flex justify-end gap-2">
                                {!per.paid_on ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-orange-600 hover:bg-orange-700 text-white"
                                    disabled={loading}
                                    onClick={() => onMarkPaid(selectedPlayerId, per.due_on)}
                                  >
                                    Bezahlt
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-gray-200"
                                    disabled={loading}
                                    onClick={() => onResetPaid(selectedPlayerId, per.due_on)}
                                  >
                                    Zurücksetzen
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
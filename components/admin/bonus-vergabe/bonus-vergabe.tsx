"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Award,
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

type PlayerRow = {
  id: string
  name: string
  photo_url?: string | null
}

type BonusRuleRow = {
  id: string
  category_id: string
  title: string
  points: number
  description: string | null
  is_active: boolean
  sort_order: number
  bonus_categories?: {
    name?: string | null
    color?: string | null
  } | null
}

type BonusTransaction = {
  id: string
  player_id: string
  player_name: string
  rule_id: string | null
  rule_title: string
  category_name: string | null
  points: number
  source_type: string
  source_context: string | null
  source_id: string | null
  source_name: string | null
  note: string | null
  created_at: string
}

interface BonusVergabeManagementProps {
  user: User | null
}

const SOURCE_OPTIONS = [
  {
    value: "members_cup",
    label: "Members Cup",
    context: "serienturnier_steeldart_intern",
  },
  {
    value: "summer_special",
    label: "Summer Special",
    context: "serienturnier_steeldart_intern",
  },
  {
    value: "fun_turnier",
    label: "Fun Turnier intern",
    context: "einzelturnier_intern",
  },
  {
    value: "extern_verein",
    label: "Extern Verein",
    context: "extern_verein",
  },
  {
    value: "extern_fremd",
    label: "Extern fremd",
    context: "extern_fremd",
  },
  {
    value: "manual_bonus",
    label: "Manuelle Bonusvergabe",
    context: "manual",
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  orange: "bg-orange-50 text-gray-900 border-orange-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  red: "bg-red-50 text-red-700 border-red-200",
  brown: "bg-amber-50 text-amber-700 border-amber-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
}

function getCategoryColor(color?: string | null) {
  return CATEGORY_COLORS[color || "gray"] || CATEGORY_COLORS.gray
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

export function BonusVergabeManagement({ user }: BonusVergabeManagementProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [rules, setRules] = useState<BonusRuleRow[]>([])
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])

  const [playerSearch, setPlayerSearch] = useState("")
  const [ruleSearch, setRuleSearch] = useState("")

  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [selectedRuleId, setSelectedRuleId] = useState("")
  const [sourceType, setSourceType] = useState("manual_bonus")
  const [sourceName, setSourceName] = useState("")
  const [note, setNote] = useState("")

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [playersResult, rulesResult, transactionsResult] = await Promise.all([
        supabase
          .from("club_players")
          .select("id,name,photo_url")
          .order("name", { ascending: true }),

        supabase
          .from("bonus_rules")
          .select(`
            id,
            category_id,
            title,
            points,
            description,
            is_active,
            sort_order,
            bonus_categories (
              name,
              color
            )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("bonus_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80),
      ])

      if (playersResult.error) throw playersResult.error
      if (rulesResult.error) throw rulesResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setPlayers((playersResult.data || []) as PlayerRow[])
      setRules((rulesResult.data || []) as any)
      setTransactions((transactionsResult.data || []) as BonusTransaction[])
    } catch (error: any) {
      console.error("bonus load error:", error)
      setMessage({ type: "error", text: error?.message || "Bonusdaten konnten nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }

  const selectedPlayer = useMemo(() => {
    return players.find((player) => String(player.id) === selectedPlayerId) || null
  }, [players, selectedPlayerId])

  const selectedRule = useMemo(() => {
    return rules.find((rule) => rule.id === selectedRuleId) || null
  }, [rules, selectedRuleId])

  const selectedSource = useMemo(() => {
    return SOURCE_OPTIONS.find((item) => item.value === sourceType) || SOURCE_OPTIONS[SOURCE_OPTIONS.length - 1]
  }, [sourceType])

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()
    if (!q) return players.slice(0, 80)

    return players
      .filter((player) => String(player.name || "").toLowerCase().includes(q))
      .slice(0, 80)
  }, [players, playerSearch])

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase()

    return rules.filter((rule) => {
      const categoryName = rule.bonus_categories?.name || ""

      if (!q) return true

      return (
        rule.title.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        String(rule.points).includes(q)
      )
    })
  }, [rules, ruleSearch])

  const playerTransactions = useMemo(() => {
    if (!selectedPlayer) return []

    return transactions.filter((transaction) => String(transaction.player_id) === String(selectedPlayer.id))
  }, [transactions, selectedPlayer])

  const canSave = !!selectedPlayer && !!selectedRule && !saving

  const resetForm = () => {
    setSelectedPlayerId("")
    setSelectedRuleId("")
    setSourceType("manual_bonus")
    setSourceName("")
    setNote("")
    setPlayerSearch("")
    setRuleSearch("")
  }

  const handleSave = async () => {
    if (!user) {
      setMessage({ type: "error", text: "Nicht eingeloggt." })
      return
    }

    if (!selectedPlayer) {
      setMessage({ type: "error", text: "Bitte einen Spieler auswählen." })
      return
    }

    if (!selectedRule) {
      setMessage({ type: "error", text: "Bitte eine Bonusregel auswählen." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const payload = {
        player_id: String(selectedPlayer.id),
        player_name: selectedPlayer.name,
        rule_id: selectedRule.id,
        rule_title: selectedRule.title,
        category_name: selectedRule.bonus_categories?.name || null,
        points: Number(selectedRule.points || 0),
        source_type: sourceType,
        source_context: selectedSource.context,
        source_id: null,
        source_name: sourceName.trim() || selectedSource.label,
        note: note.trim() || null,
        created_by: user.id,
      }

      const { error } = await supabase.from("bonus_transactions").insert(payload)

      if (error) throw error

      setMessage({
        type: "success",
        text: `${selectedPlayer.name} wurden ${selectedRule.points} Bonuspunkte gutgeschrieben.`,
      })

      await loadData()
      setSelectedRuleId("")
      setNote("")
      setSourceName("")
    } catch (error: any) {
      console.error("bonus save error:", error)
      setMessage({ type: "error", text: error?.message || "Bonuspunkte konnten nicht gespeichert werden." })
    } finally {
      setSaving(false)
    }
  }

  const totalBonusPoints = transactions.reduce((sum, row) => sum + Number(row.points || 0), 0)
  const uniquePlayersWithBonus = new Set(transactions.map((row) => row.player_id)).size

  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 p-4 sm:p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <Sparkles className="h-4 w-4 text-gray-700" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-gray-900 sm:text-lg">Bonuspunkte vergeben</h2>
            <p className="mt-0.5 text-xs font-semibold text-gray-500 sm:text-sm">
              Wähle Spieler, Bonusregel und Quelle. Jede Vergabe wird sauber in der Bonus-Historie gespeichert.
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => void loadData()} disabled={loading} className="ml-auto shrink-0 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            <span className="hidden sm:inline">Neu laden</span>
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm font-bold",
            message.type === "success" && "bg-green-50 border-green-200 text-green-800",
            message.type === "error" && "bg-red-50 border-red-200 text-red-800",
            message.type === "info" && "bg-blue-50 border-blue-200 text-blue-800",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <CardTitle className="text-base font-black">Neue Bonusvergabe</CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-500 sm:text-sm">
                Die Punkte werden automatisch aus der ausgewählten Bonusregel übernommen.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-wide text-gray-500">1. Spieler auswählen</Label>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={playerSearch}
                      onChange={(event) => setPlayerSearch(event.target.value)}
                      placeholder="Spieler suchen..."
                      className="h-10 rounded-xl pl-9 text-sm"
                    />
                  </div>

                  <div className="rounded-2xl border overflow-hidden">
                    <ScrollArea className="h-[220px] sm:h-[280px]">
                      <div className="p-3 space-y-2">
                        {loading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Spieler werden geladen...
                          </div>
                        ) : filteredPlayers.length === 0 ? (
                          <div className="text-sm text-gray-500 p-3">Keine Spieler gefunden.</div>
                        ) : (
                          filteredPlayers.map((player) => {
                            const active = String(player.id) === selectedPlayerId

                            return (
                              <button
                                key={String(player.id)}
                                type="button"
                                onClick={() => setSelectedPlayerId(String(player.id))}
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                                  active
                                    ? "border-orange-300 bg-orange-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-orange-200",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-gray-900 truncate">{player.name}</div>
                                  <div className="hidden text-[11px] font-semibold text-gray-400 sm:block">ID: {String(player.id)}</div>
                                </div>

                                {active ? <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0" /> : null}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-wide text-gray-500">2. Bonusregel auswählen</Label>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={ruleSearch}
                      onChange={(event) => setRuleSearch(event.target.value)}
                      placeholder="Regel suchen..."
                      className="h-10 rounded-xl pl-9 text-sm"
                    />
                  </div>

                  <div className="rounded-2xl border overflow-hidden">
                    <ScrollArea className="h-[220px] sm:h-[280px]">
                      <div className="p-3 space-y-2">
                        {loading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Regeln werden geladen...
                          </div>
                        ) : filteredRules.length === 0 ? (
                          <div className="text-sm text-gray-500 p-3">Keine aktiven Regeln gefunden.</div>
                        ) : (
                          filteredRules.map((rule) => {
                            const active = rule.id === selectedRuleId
                            const categoryColor = getCategoryColor(rule.bonus_categories?.color)

                            return (
                              <button
                                key={rule.id}
                                type="button"
                                onClick={() => setSelectedRuleId(rule.id)}
                                className={cn(
                                  "w-full rounded-xl border px-3 py-2.5 text-left transition",
                                  active
                                    ? "border-orange-300 bg-orange-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-orange-200",
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-black text-gray-900">{rule.title}</div>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {rule.bonus_categories?.name ? (
                                        <Badge variant="outline" className={cn("rounded-lg", categoryColor)}>
                                          {rule.bonus_categories.name}
                                        </Badge>
                                      ) : null}

                                      <Badge variant="outline" className="rounded-lg bg-white">
                                        {rule.points} Punkte
                                      </Badge>
                                    </div>
                                  </div>

                                  {active ? <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0" /> : null}
                                </div>

                                {rule.description ? (
                                  <div className="text-xs text-gray-500 font-semibold mt-2">{rule.description}</div>
                                ) : null}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wide text-gray-500">3. Quelle</Label>

                  <Select value={sourceType} onValueChange={setSourceType}>
                    <SelectTrigger className="h-10 rounded-xl bg-white text-sm">
                      <SelectValue placeholder="Quelle wählen" />
                    </SelectTrigger>

                    <SelectContent>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="hidden text-[11px] font-semibold text-gray-400 sm:block">Kontext: {selectedSource.context}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wide text-gray-500">Quellenname optional</Label>
                  <Input
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder="z. B. Members Cup Spieltag 1"
                    className="h-10 rounded-xl bg-white text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wide text-gray-500">Notiz optional</Label>
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="z. B. Nachweis liegt vor"
                    className="h-10 rounded-xl bg-white text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-gray-500">Vorschau</div>

                    <div className="mt-1 text-base font-black text-gray-900">
                      {selectedPlayer?.name || "Kein Spieler"}{" "}
                      <span className="text-gray-900">+{selectedRule?.points ?? 0} Punkte</span>
                    </div>

                    <div className="mt-1 text-xs font-semibold text-gray-500">
                      {selectedRule?.title || "Keine Regel ausgewählt"} · {selectedSource.label}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                      Zurücksetzen
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!canSave}
                      className="h-10 rounded-xl bg-gray-950 text-sm font-black text-white hover:bg-gray-800"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Bonuspunkte speichern
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <CardTitle className="text-base font-black">Letzte Bonusvergaben</CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-500 sm:text-sm">Zuletzt gespeicherte Bonuspunkte.</CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="overflow-hidden rounded-xl border">
                <ScrollArea className="h-[360px] sm:h-[460px]">
                  <div className="p-3 space-y-2">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Historie wird geladen...
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3">Noch keine Bonuspunkte vergeben.</div>
                    ) : (
                      transactions.map((row) => (
                        <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-black text-gray-900 truncate">{row.player_name}</div>
                              <div className="text-sm font-semibold text-gray-600 truncate">{row.rule_title}</div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {row.category_name ? (
                                  <Badge variant="outline" className="rounded-lg">
                                    {row.category_name}
                                  </Badge>
                                ) : null}

                                <Badge variant="outline" className="rounded-lg">
                                  {row.source_name || row.source_type}
                                </Badge>

                                <Badge variant="outline" className="rounded-lg">
                                  {formatDate(row.created_at)}
                                </Badge>
                              </div>

                              {row.note ? (
                                <div className="mt-2 text-xs text-gray-500 font-semibold">{row.note}</div>
                              ) : null}
                            </div>

                            <div className="shrink-0 rounded-xl bg-gray-50 px-3 py-2 text-right">
                              <div className="text-lg font-black text-gray-900">+{row.points}</div>
                              <div className="text-[10px] font-bold text-gray-500">Punkte</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden space-y-3 sm:block">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>

                <div>
                  <div className="text-sm text-gray-500 font-semibold">Gesamt vergebene Punkte</div>
                  <div className="text-2xl font-black">{totalBonusPoints}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <div className="text-sm text-gray-500 font-semibold">Spieler mit Bonus</div>
                  <div className="text-2xl font-black">{uniquePlayersWithBonus}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600" />
                </div>

                <div>
                  <div className="text-sm text-gray-500 font-semibold">Aktive Bonusregeln</div>
                  <div className="text-2xl font-black">{rules.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedPlayer ? (
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Spieler-Historie</CardTitle>
                <CardDescription>{selectedPlayer.name}</CardDescription>
              </CardHeader>

              <CardContent>
                {playerTransactions.length === 0 ? (
                  <div className="text-sm font-semibold text-gray-600">
                    Für diesen Spieler gibt es noch keine Bonuspunkte.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playerTransactions.slice(0, 8).map((row) => (
                      <div key={row.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-black text-gray-900 truncate">{row.rule_title}</div>
                            <div className="text-xs font-semibold text-gray-500">{formatDate(row.created_at)}</div>
                          </div>

                          <div className="font-black text-gray-900">+{row.points}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
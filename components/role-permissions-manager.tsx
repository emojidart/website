"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PageKey =
  | "users"
  | "support-tickets"
  | "advent-quiz"
  | "campus-registrations"
  | "credit-loader"
  | "attendance"
  | "leagues"
  | "events"
  | "recruitment"
  | "club"
  | "upcoming-tournaments"
  | "tournaments"
  | "tournament-management"
  | "player-database"
  | "dart-competition"

const PAGES: Array<{ key: PageKey; title: string }> = [
  { key: "users", title: "Benutzerverwaltung" },
  { key: "support-tickets", title: "Support Tickets" },
  { key: "advent-quiz", title: "Adventskalender Auswertung" },
  { key: "campus-registrations", title: "Campus-Registrierungen" },
  { key: "credit-loader", title: "Credit-Loader" },
  { key: "attendance", title: "Anwesenheitsliste" },
  { key: "leagues", title: "Ligaspiele" },
  { key: "events", title: "Veranstaltungen" },
  { key: "recruitment", title: "Rekrutierung" },
  { key: "club", title: "Vereinsverwaltung" },
  { key: "upcoming-tournaments", title: "Bevorstehende Turniere" },
  { key: "tournaments", title: "Turniere" },
  { key: "tournament-management", title: "Turnier verwalten" },
  { key: "player-database", title: "Spielerdatenbank" },
  { key: "dart-competition", title: "Lion Cup" },
]

type TeamMember = {
  player_id: string
  name: string
}

type PermissionRow = {
  player_id: string
  page_key: PageKey
  allowed: boolean
}

export function RolePermissionsManager() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const [allowedMap, setAllowedMap] = useState<Partial<Record<PageKey, boolean>>>({})

  const visiblePages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGES
    return PAGES.filter((p) => p.title.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
  }, [query])

  const selectedName = useMemo(() => {
    return members.find((m) => m.player_id === selectedPlayerId)?.name ?? ""
  }, [members, selectedPlayerId])

  const isAllowed = (key: PageKey) => !!allowedMap[key]

  const setAllowed = (key: PageKey, val: boolean) => {
    setAllowedMap((prev) => ({ ...prev, [key]: val }))
  }

  const setAll = (val: boolean) => {
    const next: Partial<Record<PageKey, boolean>> = {}
    PAGES.forEach((p) => (next[p.key] = val))
    setAllowedMap(next)
  }

  // ✅ Teammitglieder laden (unique player_id) + Name aus club_players
  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setStatus({ type: null, message: "" })

      try {
        // 1) player_id aus team_members (kann doppelt vorkommen → dedupe)
        const { data: tmRows, error: tmErr } = await supabase
          .from("team_members")
          .select("player_id")
          .is("left_at", null)

        if (tmErr) throw tmErr

        const uniquePlayerIds = Array.from(
          new Set((tmRows || []).map((r: any) => r.player_id).filter(Boolean))
        ) as string[]

        if (uniquePlayerIds.length === 0) {
          setMembers([])
          setSelectedPlayerId("")
          return
        }

        // 2) Namen aus club_players laden
        const { data: playersRows, error: pErr } = await supabase
          .from("club_players")
          .select("id,name")
          .in("id", uniquePlayerIds)

        if (pErr) throw pErr

        const mapped: TeamMember[] = (playersRows || []).map((p: any) => ({
          player_id: p.id,
          name: p.name ?? "Unbekannt",
        }))

        mapped.sort((a, b) => a.name.localeCompare(b.name))

        setMembers(mapped)

        if (!selectedPlayerId && mapped[0]) {
          setSelectedPlayerId(mapped[0].player_id)
        }
      } catch (e: any) {
        setStatus({ type: "error", message: `Fehler beim Laden der Teammitglieder: ${e.message}` })
      } finally {
        setLoading(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Rechte für ausgewählten Player laden
  useEffect(() => {
    const run = async () => {
      if (!selectedPlayerId) return

      setLoading(true)
      setStatus({ type: null, message: "" })

      try {
        const { data, error } = await supabase
          .from("user_page_permissions")
          .select("player_id,page_key,allowed")
          .eq("player_id", selectedPlayerId)

        if (error) throw error

        const next: Partial<Record<PageKey, boolean>> = {}
        ;(data as PermissionRow[] | null)?.forEach((row) => {
          next[row.page_key] = !!row.allowed
        })

        // Default: alles AUS, wenn nix gesetzt
        setAllowedMap(next)
      } catch (e: any) {
        setStatus({ type: "error", message: `Fehler beim Laden: ${e.message}` })
        setAllowedMap({})
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [selectedPlayerId])

  // ✅ Speichern
  async function save() {
    if (!selectedPlayerId) return

    setSaving(true)
    setStatus({ type: null, message: "" })

    try {
      const payload: PermissionRow[] = PAGES.map((p) => ({
        player_id: selectedPlayerId,
        page_key: p.key,
        allowed: isAllowed(p.key),
      }))

      const { error } = await supabase.from("user_page_permissions").upsert(payload, {
        onConflict: "player_id,page_key",
      })

      if (error) throw error

      setStatus({ type: "success", message: "Gespeichert." })
    } catch (e: any) {
      setStatus({ type: "error", message: `Fehler beim Speichern: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 w-full sm:max-w-sm">
          <div className="text-sm font-medium">Teammitglied</div>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={loading || members.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle ein Teammitglied..." />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.player_id} value={m.player_id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAll(true)} disabled={loading || saving || !selectedPlayerId}>
            Alles an
          </Button>
          <Button variant="outline" onClick={() => setAll(false)} disabled={loading || saving || !selectedPlayerId}>
            Alles aus
          </Button>
          <Button onClick={save} disabled={loading || saving || !selectedPlayerId}>
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Seiten suchen..."
          className="sm:max-w-sm"
        />
        {status.type && (
          <div className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {status.message}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            Seiten-Rechte <Badge variant="outline">{selectedName || "—"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-sm text-muted-foreground">Lade...</div>
          ) : (
            <div className="space-y-2">
              {visiblePages.map((p) => (
                <div
                  key={p.key}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    isAllowed(p.key)
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 ring-1 ring-orange-300 dark:ring-orange-600"
                      : "border-border"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.key}</div>
                  </div>
                  <Switch checked={isAllowed(p.key)} onCheckedChange={(v) => setAllowed(p.key, v)} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

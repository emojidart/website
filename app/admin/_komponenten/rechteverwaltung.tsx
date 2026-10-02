"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Check,
  ChevronDown,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react"

import {
  ADMIN_CATEGORY_LABELS,
  ADMIN_PERMISSION_PAGES,
  type AdminPageKey,
} from "../_konfiguration/admin-seiten"

type PageKey = Exclude<AdminPageKey, "dashboard">

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
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [query, setQuery] = useState("")
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingRights, setLoadingRights] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [allowedMap, setAllowedMap] = useState<Partial<Record<PageKey, boolean>>>({})

  const selectedName = useMemo(
    () => members.find((member) => member.player_id === selectedPlayerId)?.name ?? "",
    [members, selectedPlayerId],
  )

  const groupedPages = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = ADMIN_PERMISSION_PAGES.filter((page) => {
      if (!q) return true
      return [page.title, page.description, page.key, ADMIN_CATEGORY_LABELS[page.category]]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })

    return ["Verein", "Ligabetrieb", "Turnierbetrieb", "Kommunikation", "System"]
      .map((category) => ({
        category,
        pages: filtered.filter((page) => ADMIN_CATEGORY_LABELS[page.category] === category),
      }))
      .filter((group) => group.pages.length > 0)
  }, [query])

  const enabledCount = useMemo(
    () => ADMIN_PERMISSION_PAGES.filter((page) => Boolean(allowedMap[page.key as PageKey])).length,
    [allowedMap],
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadingMembers(true)
      setStatus({ type: null, message: "" })

      try {
        const { data: tmRows, error: tmErr } = await supabase
          .from("team_members")
          .select("player_id")
          .is("left_at", null)

        if (tmErr) throw tmErr

        const uniquePlayerIds = Array.from(
          new Set((tmRows || []).map((row: any) => row.player_id).filter(Boolean)),
        ) as string[]

        if (uniquePlayerIds.length === 0) {
          if (!cancelled) {
            setMembers([])
            setSelectedPlayerId("")
          }
          return
        }

        const { data: playersRows, error: playersError } = await supabase
          .from("club_players")
          .select("id,name")
          .in("id", uniquePlayerIds)

        if (playersError) throw playersError

        const mapped: TeamMember[] = (playersRows || [])
          .map((player: any) => ({
            player_id: player.id,
            name: player.name ?? "Unbekannt",
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "de"))

        if (cancelled) return

        setMembers(mapped)
        setSelectedPlayerId((current) => current || mapped[0]?.player_id || "")
      } catch (error: any) {
        if (!cancelled) {
          setStatus({
            type: "error",
            message: `Fehler beim Laden der Teammitglieder: ${error?.message || "Unbekannter Fehler"}`,
          })
        }
      } finally {
        if (!cancelled) setLoadingMembers(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!selectedPlayerId) {
        setAllowedMap({})
        return
      }

      setLoadingRights(true)
      setStatus({ type: null, message: "" })

      try {
        const { data, error } = await supabase
          .from("user_page_permissions")
          .select("player_id,page_key,allowed")
          .eq("player_id", selectedPlayerId)

        if (error) throw error
        if (cancelled) return

        const next: Partial<Record<PageKey, boolean>> = {}
        ;(data as PermissionRow[] | null)?.forEach((row) => {
          next[row.page_key] = Boolean(row.allowed)
        })

        setAllowedMap(next)
      } catch (error: any) {
        if (!cancelled) {
          setAllowedMap({})
          setStatus({
            type: "error",
            message: `Fehler beim Laden der Rechte: ${error?.message || "Unbekannter Fehler"}`,
          })
        }
      } finally {
        if (!cancelled) setLoadingRights(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [selectedPlayerId])

  const setAllowed = (key: PageKey, value: boolean) => {
    setAllowedMap((previous) => ({ ...previous, [key]: value }))
  }

  const setAll = (value: boolean) => {
    const next: Partial<Record<PageKey, boolean>> = {}
    ADMIN_PERMISSION_PAGES.forEach((page) => {
      next[page.key] = value
    })
    setAllowedMap(next)
  }

  const setCategory = (category: string, value: boolean) => {
    const keys = ADMIN_PERMISSION_PAGES.filter((page) => ADMIN_CATEGORY_LABELS[page.category] === category).map((page) => page.key as PageKey)
    setAllowedMap((previous) => {
      const next = { ...previous }
      keys.forEach((key) => {
        next[key] = value
      })
      return next
    })
  }

  async function save() {
    if (!selectedPlayerId) return

    setSaving(true)
    setStatus({ type: null, message: "" })

    try {
      const payload: PermissionRow[] = ADMIN_PERMISSION_PAGES.map((page) => ({
        player_id: selectedPlayerId,
        page_key: page.key as PageKey,
        allowed: Boolean(allowedMap[page.key as PageKey]),
      }))

      const { error } = await supabase.from("user_page_permissions").upsert(payload, {
        onConflict: "player_id,page_key",
      })

      if (error) throw error

      setStatus({
        type: "success",
        message: `Rechte für ${selectedName || "Teammitglied"} gespeichert.`,
      })
    } catch (error: any) {
      setStatus({
        type: "error",
        message: `Fehler beim Speichern: ${error?.message || "Unbekannter Fehler"}`,
      })
    } finally {
      setSaving(false)
    }
  }

  const disabled = loadingMembers || loadingRights || saving || !selectedPlayerId

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#090d13]/88 p-4 shadow-[0_30px_90px_-62px_rgba(0,0,0,.98)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-[90px]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/14 bg-orange-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/80">
              <LockKeyhole className="h-3.5 w-3.5" />
              Rechteverwaltung
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
              Seitenzugriff verwalten
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/42">
              Lege fest, welche Bereiche ein Teammitglied im Admin sehen und öffnen darf.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAll(true)}
              disabled={disabled}
              className="h-11 rounded-2xl border border-white/9 bg-white/4 px-4 text-sm font-black text-white/72 hover:bg-white/7 disabled:opacity-40"
            >
              Alles erlauben
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              disabled={disabled}
              className="h-11 rounded-2xl border border-white/9 bg-white/4 px-4 text-sm font-black text-white/72 hover:bg-white/7 disabled:opacity-40"
            >
              Alles sperren
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={disabled}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-300/18 bg-orange-500 px-4 text-sm font-black text-white shadow-[0_14px_40px_-24px_rgba(249,115,22,.9)] hover:bg-orange-400 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Speichern..." : "Rechte speichern"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-white/8 bg-[#090d13]/78 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <UserRoundCog className="h-4.5 w-4.5 text-orange-300" />
            <div className="text-sm font-black text-white">Teammitglied auswählen</div>
          </div>

          <div className="relative mt-4">
            <select
              value={selectedPlayerId}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
              disabled={loadingMembers || members.length === 0}
              className="h-12 w-full appearance-none rounded-2xl border border-white/9 bg-black/25 px-4 pr-11 text-sm font-bold text-white outline-none focus:border-orange-300/28 focus:ring-2 focus:ring-orange-500/10 disabled:opacity-50"
            >
              {members.length === 0 ? (
                <option value="">Kein Teammitglied verfügbar</option>
              ) : (
                members.map((member) => (
                  <option key={member.player_id} value={member.player_id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          </div>

          <div className="mt-4 rounded-2xl border border-white/7 bg-white/3 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/28">
              Aktuell freigegeben
            </div>
            <div className="mt-1 text-3xl font-black text-white">
              {enabledCount}
              <span className="ml-1 text-sm font-bold text-white/28">/ {ADMIN_PERMISSION_PAGES.length}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-white/35">
              {selectedName || "Noch niemand ausgewählt"}
            </div>
          </div>

          {status.type ? (
            <div
              className={`mt-4 rounded-2xl border px-3.5 py-3 text-xs font-bold ${
                status.type === "success"
                  ? "border-emerald-300/14 bg-emerald-500/8 text-emerald-200"
                  : "border-red-300/14 bg-red-500/8 text-red-200"
              }`}
            >
              {status.message}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Berechtigung suchen..."
              className="h-12 w-full rounded-2xl border border-white/9 bg-[#090d13]/78 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-orange-300/28 focus:ring-2 focus:ring-orange-500/10"
            />
          </div>

          {loadingRights ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-white/8 bg-[#090d13]/78">
              <div className="flex items-center gap-2 text-sm font-bold text-white/44">
                <Loader2 className="h-4 w-4 animate-spin" />
                Rechte werden geladen...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedPages.map((group) => {
                const groupKeys = group.pages.map((page) => page.key)
                const allOn = groupKeys.every((key) => Boolean(allowedMap[key]))

                return (
                  <section
                    key={group.category}
                    className="overflow-hidden rounded-[24px] border border-white/8 bg-[#090d13]/78"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/28">
                          Kategorie
                        </div>
                        <div className="mt-0.5 text-sm font-black text-white">{group.category}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCategory(group.category, !allOn)}
                        disabled={!selectedPlayerId}
                        className="rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-[11px] font-black text-white/55 hover:bg-white/6 hover:text-white disabled:opacity-40"
                      >
                        {allOn ? "Kategorie sperren" : "Kategorie erlauben"}
                      </button>
                    </div>

                    <div className="divide-y divide-white/6">
                      {group.pages.map((page) => {
                        const enabled = Boolean(allowedMap[page.key as PageKey])

                        return (
                          <button
                            key={page.key}
                            type="button"
                            onClick={() => setAllowed(page.key as PageKey, !enabled)}
                            disabled={!selectedPlayerId}
                            className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-white/3 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                                enabled
                                  ? "border-orange-300/18 bg-orange-500/10 text-orange-200"
                                  : "border-white/8 bg-white/3 text-white/24"
                              }`}
                            >
                              {enabled ? <ShieldCheck className="h-4.5 w-4.5" /> : <LockKeyhole className="h-4.5 w-4.5" />}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black text-white/86">{page.title}</span>
                              <span className="mt-1 block text-xs font-semibold leading-5 text-white/34">
                                {page.description}
                              </span>
                            </span>

                            <span
                              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                                enabled
                                  ? "border-orange-300/20 bg-orange-500"
                                  : "border-white/10 bg-white/6"
                              }`}
                              aria-hidden="true"
                            >
                              <span
                                className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  enabled ? "translate-x-[23px]" : "translate-x-[3px]"
                                }`}
                              />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

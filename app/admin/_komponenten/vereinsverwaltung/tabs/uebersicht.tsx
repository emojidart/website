"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, BadgeCheck, CreditCard, FileDown, Filter, Mail, MapPin, Phone, Search, Shirt, UserRound, CalendarDays, Hash, ClipboardCheck, CircleAlert, UsersRound, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"

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
    <div className="space-y-5 text-white overview-print-area">
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
            background: white !important;
            color: black !important;
          }
          .overview-print-area article,
          .overview-print-area section {
            break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <section className={cn(vv.surfaceLg, "overflow-hidden")}>
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/10">
              <ClipboardCheck className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/50">Vereinsdaten</div>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Übersicht</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
                Mitgliederdaten prüfen und fehlende Pflichtangaben schnell erkennen.
              </p>
            </div>
          </div>

          <Button onClick={handlePrint} className={cn(vv.buttonSecondary, "no-print w-full sm:w-auto")}>
            <FileDown className="mr-2 h-4 w-4" />
            Drucken / PDF
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className={cn(vv.card, "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={vv.label}>Aktive Mitglieder</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-white">{summary.activeCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/10">
              <UsersRound className="h-4.5 w-4.5 text-orange-300" />
            </div>
          </div>
          <div className="mt-3 text-xs font-semibold text-white/32">Aktuell im Verein geführt</div>
        </article>

        <article className={cn(vv.card, "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={vv.label}>Nachpflege nötig</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-amber-200">{summary.incomplete}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-500/10">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-200" />
            </div>
          </div>
          <div className="mt-3 text-xs font-semibold text-white/32">{summary.totalMissing} fehlende Pflichtangaben</div>
        </article>

        <article className={cn(vv.card, "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={vv.label}>Vollständig</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-emerald-200">{summary.complete}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-500/10">
              <BadgeCheck className="h-4.5 w-4.5 text-emerald-200" />
            </div>
          </div>
          <div className="mt-3 text-xs font-semibold text-white/32">Alle Pflichtfelder gepflegt</div>
        </article>

        <article className={cn(vv.card, "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={vv.label}>Player Card</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-sky-200">{summary.cardActive}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-500/10">
              <CreditCard className="h-4.5 w-4.5 text-sky-200" />
            </div>
          </div>
          <div className="mt-3 text-xs font-semibold text-white/32">Mit Spielerdatenbank verknüpft</div>
        </article>
      </div>

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className={vv.label}>Datenqualität</div>
            <h4 className="mt-1 text-lg font-black text-white">Häufig fehlende Angaben</h4>
          </div>
          <span className="rounded-full border border-[#2b333e] bg-[#11161d] px-3 py-1 text-xs font-black text-white/38">
            {summary.totalMissing} offen
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {summary.topMissing.map((item) => (
            <div key={item.key} className={cn(vv.inset, "flex items-center justify-between gap-3 px-3.5 py-3")}>
              <span className="text-sm font-bold text-white/55">{item.label}</span>
              <span
                className={cn(
                  "min-w-8 rounded-full border px-2.5 py-1 text-center text-xs font-black",
                  item.count > 0
                    ? "border-amber-300/15 bg-amber-500/10 text-amber-200"
                    : "border-emerald-300/15 bg-emerald-500/10 text-emerald-200",
                )}
              >
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(vv.surface, "p-4 sm:p-5 no-print")}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <label className={cn(vv.label, "mb-1.5 block")}>Mitglieder durchsuchen</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, Ort oder fehlendes Feld suchen …"
                className={cn(vv.input, "pl-10")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 overflow-x-auto">
            {[
              { key: "incomplete", label: "Nachpflege", icon: CircleAlert },
              { key: "complete", label: "Vollständig", icon: BadgeCheck },
              { key: "all", label: "Alle", icon: UserRound },
            ].map((item) => {
              const Icon = item.icon
              const active = filterMode === item.key

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterMode(item.key as typeof filterMode)}
                  className={cn(
                    "flex h-11 min-w-[108px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition",
                    active
                      ? "border-orange-300/20 bg-orange-500/10 text-orange-100"
                      : "border-[#2b333e] bg-[#11161d] text-white/45 hover:border-[#3a4552] hover:text-white/75",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={vv.label}>Mitglieder-Check</div>
            <h4 className="mt-1 text-lg font-black text-white">Stammdaten prüfen</h4>
            <p className="mt-1 text-xs leading-5 text-white/32">
              IBAN, Mitglied seit und Austrittsdatum werden bewusst nicht als fehlende Pflichtangaben gewertet.
            </p>
          </div>
          <div className="rounded-full border border-[#2b333e] bg-[#11161d] px-3 py-1 text-xs font-black text-white/38">
            {filteredRows.length} angezeigt
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#2a323d] bg-[#0d1117] px-4 py-9 text-center">
            <Search className="mx-auto h-5 w-5 text-white/18" />
            <p className="mt-2 text-sm font-semibold text-white/35">Keine passenden Mitglieder gefunden.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredRows.map((row) => (
              <article key={row.player.id} className={cn(vv.cardHover, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-white">{row.player.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {row.inactive ? (
                        <span className="rounded-full border border-rose-300/15 bg-rose-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-rose-200">
                          Inaktiv
                        </span>
                      ) : row.missingCount === 0 ? (
                        <span className="rounded-full border border-emerald-300/15 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-200">
                          Vollständig
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-300/15 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-200">
                          Nachpflege
                        </span>
                      )}

                      {row.playerCardActive ? (
                        <span className="rounded-full border border-sky-300/15 bg-sky-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-sky-200">
                          Player Card
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-xs font-black",
                      row.missingCount > 0
                        ? "border-amber-300/15 bg-amber-500/10 text-amber-200"
                        : "border-emerald-300/15 bg-emerald-500/10 text-emerald-200",
                    )}
                    title={row.missingCount > 0 ? `${row.missingCount} fehlende Angaben` : "Vollständig"}
                  >
                    {row.missingCount}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {hasValue(row.player.player_number) ? (
                    <div className={cn(vv.inset, "px-3 py-2.5")}>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                        <Hash className="h-3 w-3" />
                        Nummer
                      </div>
                      <div className="mt-1 text-xs font-bold text-white/60">{row.player.player_number}</div>
                    </div>
                  ) : null}

                  {hasValue(row.player.birthdate) ? (
                    <div className={cn(vv.inset, "px-3 py-2.5")}>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                        <CalendarDays className="h-3 w-3" />
                        Geburt
                      </div>
                      <div className="mt-1 text-xs font-bold text-white/60">{row.player.birthdate}</div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1.5 text-xs font-semibold text-white/38">
                  {hasValue(row.player.email) ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 flex-none text-white/22" />
                      <span className="min-w-0 truncate">{row.player.email}</span>
                    </div>
                  ) : null}
                  {hasValue(row.player.phone) ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Phone className="h-3.5 w-3.5 flex-none text-white/22" />
                      <span className="min-w-0 truncate">{row.player.phone}</span>
                    </div>
                  ) : null}
                  {hasValue(row.player.city) ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 flex-none text-white/22" />
                      <span className="min-w-0 truncate">{row.player.city}</span>
                    </div>
                  ) : null}
                  {hasValue(row.player.jersey_size) ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Shirt className="h-3.5 w-3.5 flex-none text-white/22" />
                      <span className="min-w-0 truncate">Trikot {row.player.jersey_size}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-[#202731] pt-3">
                  {row.missingCount === 0 ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-200/75">
                      <BadgeCheck className="h-4 w-4" />
                      Pflichtangaben vollständig
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/26">
                        Fehlende Angaben
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.missing.map((field) => (
                          <span
                            key={field.key}
                            className="rounded-full border border-amber-300/15 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200/80"
                          >
                            {field.label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  ChevronRight,
  Mail,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import {
  ADMIN_AREAS,
  ADMIN_AREA_BY_PAGE,
  type AdminAreaKey,
} from "../_konfiguration/admin-bereiche"

type DashboardCard = {
  title: string
  description: string
  icon: LucideIcon
  view: string
  category?: string
  badge?: number
  color?: string
}

type NavItem = {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
}

type NavSection = {
  label: string
  items: readonly NavItem[]
}

type Props = {
  sections: readonly NavSection[]
  dashboardCards: readonly DashboardCard[]
  unreadApplicationsCount: number
  unreadCampusCount: number
  pendingApprovalsCount: number
  pendingGuestRequestsCount: number
  pendingJoinRequestsCount: number
  onOpen: (key: string) => void
}

export function AdminDashboard({
  dashboardCards,
  unreadApplicationsCount,
  unreadCampusCount,
  pendingApprovalsCount,
  pendingGuestRequestsCount,
  pendingJoinRequestsCount,
  onOpen,
}: Props) {
  const [query, setQuery] = useState("")
  const [activeArea, setActiveArea] = useState<AdminAreaKey | null>(null)

  const totalClubRequests = pendingGuestRequestsCount + pendingJoinRequestsCount
  const totalOpen =
    totalClubRequests +
    pendingApprovalsCount +
    unreadApplicationsCount +
    unreadCampusCount

  const searchable = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dashboardCards

    return dashboardCards.filter((card) =>
      [card.title, card.description, card.view]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [dashboardCards, query])

  const areaStats = useMemo(
    () =>
      ADMIN_AREAS.map((area) => {
        const cards = dashboardCards.filter(
          (card) => ADMIN_AREA_BY_PAGE[card.view] === area.key,
        )
        const badge = cards.reduce((sum, card) => sum + (card.badge ?? 0), 0)
        return { ...area, cards, badge }
      }),
    [dashboardCards],
  )

  const selectedArea = activeArea
    ? areaStats.find((area) => area.key === activeArea) ?? null
    : null

  const selectedCards = selectedArea
    ? searchable.filter((card) => ADMIN_AREA_BY_PAGE[card.view] === selectedArea.key)
    : []

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#090d13]/92 px-4 py-5 shadow-[0_35px_100px_-60px_rgba(0,0,0,.98)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/8 blur-[90px]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/15 bg-orange-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              EMD Admin Center
            </div>

            {selectedArea ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveArea(null)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-black text-white/45 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Alle Bereiche
                </button>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                  {selectedArea.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                  {selectedArea.description}
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                  Welchen Bereich möchtest du verwalten?
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                  Turniere, Spieler, Liga, Verein und Organisation klar voneinander getrennt.
                </p>
              </>
            )}
          </div>

          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={selectedArea ? `${selectedArea.shortTitle} durchsuchen...` : "Admin-Funktion suchen..."}
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-orange-300/30 focus:ring-2 focus:ring-orange-500/10"
            />
          </div>
        </div>
      </section>

      {!activeArea && !query ? (
        <>
          <section>
            <div className="mb-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                Hauptbereiche
              </div>
              <h2 className="mt-1 text-lg font-black tracking-tight text-white">
                Admin-Bereiche
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {areaStats.filter((area) => area.key !== "system").map((area) => {
                const Icon = area.icon
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => setActiveArea(area.key)}
                    className="group relative min-h-[190px] overflow-hidden rounded-[28px] border border-white/10 bg-[#090d13]/86 p-5 text-left shadow-[0_26px_80px_-54px_rgba(0,0,0,.98)] hover:border-orange-300/20 hover:bg-[#0c1118]"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-orange-500/8 blur-3xl" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60 group-hover:border-orange-300/20 group-hover:bg-orange-500/10 group-hover:text-orange-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        {area.badge > 0 ? (
                          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">
                            {area.badge}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-black tracking-tight text-white">
                          {area.title}
                        </h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/40">
                          {area.description}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-5">
                        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/25">
                          {area.cards.length} Funktionen
                        </span>
                        <ArrowRight className="h-4 w-4 text-white/25 group-hover:translate-x-1 group-hover:text-orange-200/80" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {areaStats.find((area) => area.key === "system") ? (
              <button
                type="button"
                onClick={() => setActiveArea("system")}
                className="mt-3 flex w-full items-center gap-4 rounded-[24px] border border-white/10 bg-[#090d13]/72 p-4 text-left hover:border-white/15 hover:bg-white/5"
              >
                {(() => {
                  const area = areaStats.find((item) => item.key === "system")!
                  const Icon = area.icon
                  return (
                    <>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-white/80">{area.title}</div>
                        <div className="mt-0.5 truncate text-xs font-semibold text-white/35">
                          {area.description}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-white/20" />
                    </>
                  )
                })()}
              </button>
            ) : null}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                  Heute wichtig
                </div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">
                  Offene Aufgaben
                </h2>
              </div>
              {totalOpen > 0 ? (
                <div className="rounded-full border border-orange-300/15 bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-200">
                  {totalOpen} offen
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                label="Vereinsanfragen"
                value={totalClubRequests}
                hint={totalClubRequests > 0 ? `${pendingGuestRequestsCount} Gast · ${pendingJoinRequestsCount} Beitritt` : "Keine offenen Anfragen"}
                icon={UserCheck}
                onClick={() => onOpen("club")}
              />
              <StatusCard
                label="Freigaben"
                value={pendingApprovalsCount}
                hint={pendingApprovalsCount > 0 ? "Wartet auf Prüfung" : "Alles erledigt"}
                icon={ShieldCheck}
                onClick={() => onOpen("approvals")}
              />
              <StatusCard
                label="Bewerbungen"
                value={unreadApplicationsCount}
                hint={unreadApplicationsCount > 0 ? "Noch ungelesen" : "Nichts Neues"}
                icon={Mail}
                onClick={() => onOpen("recruitment")}
              />
              <StatusCard
                label="Campus"
                value={unreadCampusCount}
                hint={unreadCampusCount > 0 ? "Neue Registrierungen" : "Nichts Neues"}
                icon={BellRing}
                onClick={() => onOpen("campus-registrations")}
              />
            </div>
          </section>
        </>
      ) : (
        <section>
          {!activeArea && query ? (
            <div className="mb-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                Suche
              </div>
              <h2 className="mt-1 text-lg font-black tracking-tight text-white">
                Gefundene Funktionen
              </h2>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {(activeArea ? selectedCards : searchable).map((card) => {
              const Icon = card.icon
              return (
                <button
                  key={card.view}
                  type="button"
                  onClick={() => onOpen(card.view)}
                  className="group rounded-[24px] border border-white/10 bg-[#090d13]/82 p-4 text-left hover:border-orange-300/18 hover:bg-[#0d121a]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 group-hover:border-orange-300/18 group-hover:bg-orange-500/9 group-hover:text-orange-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black leading-5 text-white/90 sm:text-[15px]">
                          {card.title}
                        </h3>
                        {card.badge ? (
                          <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                            {card.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-white/38">
                        {card.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-1 text-[11px] font-black text-white/25 group-hover:text-orange-200/70">
                    Öffnen
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function StatusCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[22px] border border-white/10 bg-[#090d13]/74 p-4 text-left hover:border-orange-300/16 hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/45 group-hover:text-orange-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className={`text-2xl font-black ${value > 0 ? "text-orange-200" : "text-white/50"}`}>
          {value}
        </div>
      </div>
      <div className="mt-3 text-sm font-black text-white/80">{label}</div>
      <div className="mt-1 text-xs font-semibold text-white/35">{hint}</div>
    </button>
  )
}

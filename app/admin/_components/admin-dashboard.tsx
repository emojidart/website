"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BellRing,
  ChevronRight,
  CircleAlert,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react"

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

const categoryNames: Record<string, string> = {
  verein: "Verein & Mitglieder",
  sport: "Sport & Turniere",
}

export function AdminDashboard({
  sections,
  dashboardCards,
  unreadApplicationsCount,
  unreadCampusCount,
  pendingApprovalsCount,
  pendingGuestRequestsCount,
  pendingJoinRequestsCount,
  onOpen,
}: Props) {
  const [query, setQuery] = useState("")

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
      [card.title, card.description, card.category, card.view]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [dashboardCards, query])

  const groups = useMemo(() => {
    const ordered = [
      { key: "verein", label: "Verein & Mitglieder" },
      { key: "sport", label: "Sport & Turniere" },
      { key: "other", label: "Weitere Bereiche" },
    ]

    return ordered
      .map((group) => {
        const cards = searchable.filter((card) => {
          if (group.key === "other") {
            return card.category !== "verein" && card.category !== "sport"
          }
          return card.category === group.key
        })
        return { ...group, cards }
      })
      .filter((group) => group.cards.length > 0)
  }, [searchable])

  const quickSections = sections.filter((section) => section.label !== "Übersicht")

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#090d13]/88 px-4 py-5 shadow-[0_30px_90px_-60px_rgba(0,0,0,.98)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/12 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/8 blur-[90px]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/14 bg-orange-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              EMD Admin Center
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
              Alles an einem Ort.
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
              Verein, Liga, Turniere und Verwaltung schnell finden – ohne durch unübersichtliche Seiten zu suchen.
            </p>
          </div>

          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/28" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Admin-Funktion suchen..."
              className="h-12 w-full rounded-2xl border border-white/9 bg-black/25 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-orange-300/28 focus:ring-2 focus:ring-orange-500/10"
            />
          </div>
        </div>
      </section>

      {/* Status */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
              Heute wichtig
            </div>
            <h2 className="mt-1 text-lg font-black tracking-tight text-white">Offene Aufgaben</h2>
          </div>
          {totalOpen > 0 ? (
            <div className="rounded-full border border-orange-300/15 bg-orange-500/9 px-3 py-1.5 text-xs font-black text-orange-200">
              {totalOpen} offen
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            label="Vereinsanfragen"
            value={totalClubRequests}
            hint={
              totalClubRequests > 0
                ? `${pendingGuestRequestsCount} Gast · ${pendingJoinRequestsCount} Beitritt`
                : "Keine offenen Anfragen"
            }
            icon={UserCheck}
            active={totalClubRequests > 0}
            onClick={() => onOpen("club")}
          />
          <StatusCard
            label="Freigaben"
            value={pendingApprovalsCount}
            hint={pendingApprovalsCount > 0 ? "Wartet auf Prüfung" : "Alles erledigt"}
            icon={ShieldCheck}
            active={pendingApprovalsCount > 0}
            onClick={() => onOpen("approvals")}
          />
          <StatusCard
            label="Bewerbungen"
            value={unreadApplicationsCount}
            hint={unreadApplicationsCount > 0 ? "Noch ungelesen" : "Nichts Neues"}
            icon={Mail}
            active={unreadApplicationsCount > 0}
            onClick={() => onOpen("recruitment")}
          />
          <StatusCard
            label="Campus"
            value={unreadCampusCount}
            hint={unreadCampusCount > 0 ? "Neue Registrierungen" : "Nichts Neues"}
            icon={BellRing}
            active={unreadCampusCount > 0}
            onClick={() => onOpen("campus-registrations")}
          />
        </div>
      </section>

      {/* Category quick jump */}
      {!query && quickSections.length > 0 ? (
        <section className="rounded-[26px] border border-white/8 bg-[#090d13]/78 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-300" />
            <div className="text-sm font-black text-white">Schnellzugriff nach Kategorie</div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickSections.map((section) => {
              const first = section.items[0]
              if (!first) return null

              return (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => onOpen(first.key)}
                  className="shrink-0 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-left hover:border-orange-300/18 hover:bg-orange-500/7"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                    Kategorie
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-black text-white/80">
                    {section.label}
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Functional groups */}
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                  Bereich
                </div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">
                  {categoryNames[group.key] || group.label}
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {group.cards.map((card) => {
                  const Icon = card.icon

                  return (
                    <button
                      key={card.view}
                      type="button"
                      onClick={() => onOpen(card.view)}
                      className="group relative min-w-0 overflow-hidden rounded-[22px] border border-white/8 bg-[#090d13]/78 p-4 text-left shadow-[0_20px_60px_-48px_rgba(0,0,0,.95)] hover:border-orange-300/16 hover:bg-[#0d121a]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-white/55 group-hover:border-orange-300/16 group-hover:bg-orange-500/9 group-hover:text-orange-200">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <h3 className="min-w-0 text-sm font-black leading-5 text-white/88 sm:text-[15px]">
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

                      <div className="mt-4 flex items-center justify-end text-[11px] font-black text-white/28 group-hover:text-orange-200/70">
                        Öffnen
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/8 bg-[#090d13]/78 px-5 py-10 text-center">
          <CircleAlert className="mx-auto h-6 w-6 text-white/25" />
          <div className="mt-3 text-sm font-black text-white/72">Keine Funktion gefunden</div>
          <div className="mt-1 text-xs font-semibold text-white/35">Versuche einen anderen Suchbegriff.</div>
        </div>
      )}
    </div>
  )
}

function StatusCard({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-0 rounded-[22px] border p-4 text-left ${
        active
          ? "border-orange-300/15 bg-orange-500/7 hover:bg-orange-500/10"
          : "border-white/8 bg-[#090d13]/78 hover:bg-[#0d121a]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
            active
              ? "border-orange-300/16 bg-orange-500/10 text-orange-200"
              : "border-white/8 bg-white/4 text-white/42"
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <span className={`text-2xl font-black ${active ? "text-orange-200" : "text-white"}`}>
          {value}
        </span>
      </div>

      <div className="mt-3 text-sm font-black text-white/82">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-white/34">{hint}</div>
    </button>
  )
}

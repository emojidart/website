"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

type AdminNavItem = {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
}

type AdminNavSection = {
  label: string
  items: readonly AdminNavItem[]
}

type AdminNavigationProps = {
  sections: readonly AdminNavSection[]
  currentView: string
  query: string
  onQueryChange: (value: string) => void
  onNavigate: (key: string) => void
  onLogout: () => void
  loggingOut?: boolean
  alignWithBreadcrumb?: boolean
}

export function AdminNavigation({
  sections,
  currentView,
  query,
  onQueryChange,
  onNavigate,
  onLogout,
  loggingOut = false,
  alignWithBreadcrumb = false,
}: AdminNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeItem = useMemo(
    () => sections.flatMap((section) => section.items).find((item) => item.key === currentView),
    [sections, currentView],
  )

  useEffect(() => {
    setMobileOpen(false)
  }, [currentView])

  useEffect(() => {
    if (!mobileOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  const navigate = (key: string) => {
    onNavigate(key)
    setMobileOpen(false)
  }

  const NavigationContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="shrink-0 border-b border-white/8 px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/70">
              EMD
            </div>
            <div className="mt-1 truncate text-lg font-black tracking-tight text-white">
              Admin Center
            </div>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-500/10">
            <ShieldCheck className="h-4.5 w-4.5 text-orange-300" />
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Bereich suchen..."
            className="h-11 w-full rounded-2xl border border-white/9 bg-black/25 pl-10 pr-10 text-sm font-semibold text-white outline-none placeholder:text-white/28 focus:border-orange-300/30 focus:ring-2 focus:ring-orange-500/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/35 hover:bg-white/6 hover:text-white"
              aria-label="Suche leeren"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={`admin-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 ${mobile ? "pb-6" : ""}`}>
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-5 text-center">
            <div className="text-sm font-bold text-white/70">Nichts gefunden</div>
            <div className="mt-1 text-xs leading-5 text-white/35">
              Suche ändern oder Berechtigungen prüfen.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                  {section.label}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = currentView === item.key

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigate(item.key)}
                        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${
                          active
                            ? "border-orange-300/20 bg-orange-500/11 text-white shadow-[0_12px_30px_-24px_rgba(249,115,22,.85)]"
                            : "border-transparent bg-transparent text-white/62 hover:border-white/7 hover:bg-white/4 hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            active
                              ? "border-orange-300/18 bg-orange-500/12 text-orange-200"
                              : "border-white/7 bg-white/3 text-white/42 group-hover:text-white/70"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {item.label}
                        </span>

                        {item.badge ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 ${
                              active ? "text-orange-200/60" : "text-white/15"
                            }`}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/9 bg-white/3 px-4 text-sm font-bold text-white/58 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Abmelden..." : "Abmelden"}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-[280px] shrink-0 self-start lg:block xl:w-[296px]">
        <div
          className={`sticky flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#090d13]/94 shadow-[0_30px_100px_-58px_rgba(0,0,0,.95)] backdrop-blur-2xl ${
            alignWithBreadcrumb
              ? "top-[72px] h-[calc(100dvh-96px)]"
              : "top-[72px] h-[calc(100dvh-96px)]"
          }`}
        >
          <NavigationContent />
        </div>
      </aside>

      {/* Mobile / Tablet top bar */}
      <div className="sticky top-12 z-40 -mx-4 mb-1 border-y border-white/8 bg-[#070a0f]/94 px-3 py-2.5 shadow-[0_12px_35px_-28px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:top-14 lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/9 bg-white/4 text-white"
            aria-label="Admin-Menü öffnen"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/9 bg-white/4 text-white/70"
            aria-label="Admin Übersicht"
          >
            <Home className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="min-w-0 flex-1 rounded-2xl border border-white/9 bg-white/4 px-3.5 py-2 text-left"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/28">
              Admin-Bereich
            </div>
            <div className="mt-0.5 truncate text-sm font-black text-white">
              {activeItem?.label || "Dashboard"}
            </div>
          </button>

          {activeItem?.badge ? (
            <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 px-2 text-xs font-black text-white">
              {activeItem.badge}
            </span>
          ) : null}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/72 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Admin-Menü schließen"
          />

          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] min-h-0 flex-col border-r border-white/9 bg-[#070a0f] shadow-[24px_0_90px_-35px_rgba(0,0,0,.98)]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-white/55"
              aria-label="Menü schließen"
            >
              <X className="h-4 w-4" />
            </button>

            <NavigationContent mobile />
          </div>
        </div>
      ) : null}
    </>
  )
}

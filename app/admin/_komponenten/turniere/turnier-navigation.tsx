"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Flame, ListChecks, Target, Trophy, Users } from "lucide-react"

type TournamentAdminNavProps = {
  title: string
  description?: string
}

const items = [
  { href: "/admin/turnier_spieltage_starten", label: "Übersicht", icon: Trophy },
  { href: "/admin/einzelturnier", label: "Einzelturniere", icon: Target },
  { href: "/kratzer-tournament", label: "Kratzer", icon: ListChecks },
  { href: "/admin/survival-roulette", label: "Survival Roulette", icon: Flame },
  { href: "/admin/public-tournament-registrations", label: "Öffentliche Anmeldungen", icon: Users },
  { href: "/admin/tournament-schedules", label: "Serien Spieltag anlegen / bearbeiten", icon: CalendarDays },
] as const

export function TournamentAdminNav({ title, description }: TournamentAdminNavProps) {
  const pathname = usePathname()

  return (
    <>
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <div className="relative z-20 border-b border-white/[0.07] bg-[#080a0e]/90 text-white backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8">
          <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-300">
                <Trophy className="h-3.5 w-3.5" />
                Turnier-Zentrale
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-white/40">{description}</p> : null}
            </div>

            <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Turnierverwaltung">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/admin/turnier_spieltage_starten" && pathname === "/admin/tournament-center") ||
                  (item.href === "/admin/einzelturnier" && pathname?.startsWith("/admin/einzelturnier")) ||
                  (item.href === "/admin/survival-roulette" && pathname?.startsWith("/admin/survival-roulette")) ||
                  (item.href === "/admin/public-tournament-registrations" && pathname?.startsWith("/admin/public-tournament-registrations"))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                      active
                        ? "border-orange-300/25 bg-orange-500/12 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,.08)]"
                        : "border-white/10 bg-white/[0.035] text-white/55 hover:border-orange-300/25 hover:bg-orange-500/[0.08] hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}

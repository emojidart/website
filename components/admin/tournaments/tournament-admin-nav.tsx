"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ListChecks, Settings2, Target, Trophy } from "lucide-react"

type TournamentAdminNavProps = {
  title: string
  description?: string
}

const items = [
  { href: "/admin/tournament-center", label: "Übersicht", icon: Trophy },
  { href: "/dko_tournament_registration", label: "Einzelturniere", icon: Target },
  { href: "/kratzer-tournament", label: "Kratzer", icon: ListChecks },
  { href: "/admin/turnier_spieltage_starten", label: "Serien-Spieltage", icon: CalendarDays },
  { href: "/admin/tournament-schedules", label: "Serien anlegen", icon: Settings2 },
] as const

export function TournamentAdminNav({ title, description }: TournamentAdminNavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Der globale Header ist fixed. Dieser Abstand verhindert Überlagerungen. */}
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <div className="border-b border-orange-100 bg-white">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-8">
          <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-600">
                <Trophy className="h-3.5 w-3.5" />
                Turnier-Zentrale
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight text-gray-950 sm:text-2xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
            </div>

            <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Turnierverwaltung">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/dko_tournament_registration" && pathname?.startsWith("/dko_tournament_registration"))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                      active
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50/40 hover:text-gray-900"
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

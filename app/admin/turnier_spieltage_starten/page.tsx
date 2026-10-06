"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Home } from "lucide-react"

import { Header } from "@/components/header"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { TournamentDaysManagement } from "@/app/admin/_komponenten/turniere/turniertage-betrieb"
import { AdminNavigation } from "@/app/admin/_komponenten/navigation"
import {
  ADMIN_CATEGORY_LABELS,
  ADMIN_PAGES,
  type AdminCategoryKey,
} from "@/app/admin/_konfiguration/admin-seiten"

const NAV_CATEGORIES: readonly AdminCategoryKey[] = [
  "overview",
  "league",
  "tournaments",
  "club",
  "communication",
  "system",
]

const HIDDEN_NAV_KEYS = new Set([
  "internal-events",
  "history",
  "campus-registrations",
  "credit-loader",
  "advent-quiz",
])

export default function TournamentDaysPage() {
  const router = useRouter()
  const [navQuery, setNavQuery] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)

  const navSections = useMemo(() => {
    const query = navQuery.trim().toLowerCase()

    return NAV_CATEGORIES.map((category) => {
      const items = ADMIN_PAGES.filter(
        (page) =>
          page.category === category &&
          page.showInNavigation !== false &&
          !HIDDEN_NAV_KEYS.has(page.key) &&
          (!query || page.title.toLowerCase().includes(query)),
      ).map((page) => ({
        key: page.key,
        label: page.key === "member-availability-all" ? "Aufstellungen & Zusagen" : page.title,
        icon: page.icon,
      }))

      return {
        label: category === "league" ? "SPORTDART" : ADMIN_CATEGORY_LABELS[category],
        items,
      }
    }).filter((section) => section.items.length > 0)
  }, [navQuery])

  const openAdminView = (key: string) => {
    // Das Haupt-Admin merkt seine aktive Kachel über sessionStorage.
    // Dadurch funktioniert die Sidebar auch auf dieser eigenständigen Route genauso.
    try {
      window.sessionStorage.setItem("emd-admin-current-view", key)
    } catch (error) {
      console.warn("Admin view save failed:", error)
    }

    router.push("/admin")
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await supabase.auth.signOut()
      router.replace("/admin")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Abstand für den fixed Haupt-Header */}
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <main className="w-full p-4 md:p-8">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden lg:flex-row lg:gap-6">
          <AdminNavigation
            sections={navSections}
            currentView="tournament-center"
            query={navQuery}
            onQueryChange={setNavQuery}
            onNavigate={openAdminView}
            onLogout={handleLogout}
            loggingOut={loggingOut}
            alignWithBreadcrumb
          />

          <section className="w-full min-w-0 max-w-full flex-1 space-y-6 overflow-x-hidden lg:w-0">
            <div className="emd-admin-breadcrumb hidden items-center justify-between rounded-2xl px-4 py-3 lg:flex">
              <div className="text-sm font-bold text-gray-600">
                Admin / <span className="text-gray-900">Turnier-Zentrale</span> /{" "}
                <span className="text-gray-900">Turniertage starten</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openAdminView("dashboard")}
                className="emd-admin-overview-button rounded-xl"
              >
                <Home className="mr-2 h-4 w-4" />
                Übersicht
              </Button>
            </div>

            <TournamentDaysManagement />
          </section>
        </div>
      </main>
    </div>
  )
}

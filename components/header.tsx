"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, UserIcon, ChevronDown } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname } from "next/navigation"

export function Header() {
  const marqueeContent =
    "🦁 +++ EMD LION CUP PART II STARTET IN KÜRZE • ZEITRAUM: 01. SEPTEMBER 2025 – 01. JUNI 2026 • 34 SPIELTAGE • 1 FINALE • JEDEN MONTAG 19:30 UHR +++"

  const { session, user } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err: any) {
      console.error("Logout error:", err)
      window.location.reload()
    } finally {
      setLoggingOut(false)
    }
  }

  const isTurnierserieActive = ["/tables", "/players"].includes(pathname)

  const isLionCupActive = ["/regelwerk", "/tabelle-lion-cup"].includes(pathname)

  const isTurniereActive = ["/upcoming-tournaments", "/live", "/kratzer-tournament-results"].includes(pathname)

  return (
    <header className="relative z-20 w-full bg-gray-100 text-gray-900 border-b border-gray-300 shadow-lg">
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold overflow-hidden flex shadow-md">
        <div className="flex animate-marquee min-w-full">
          <span className="text-white text-xs sm:text-sm leading-none px-4 py-0.5 font-bold">{marqueeContent}</span>
          <span className="text-white text-xs sm:text-sm leading-none px-4 py-0.5 font-bold">{marqueeContent}</span>
        </div>
      </div>

      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-3 sm:px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-lg font-bold flex-shrink-0 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-lg md:text-xl font-extrabold tracking-wide truncate">
              Emoj!'s Dartverein
            </span>
            <span className="text-xs font-normal text-gray-600 hidden sm:block"></span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 ml-8">
          <Link
            href="/"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/" ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-gray-900 hover:text-red-600"
            }`}
          >
            Startseite
          </Link>

          <Link
            href="/tournament"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/tournament"
                ? "text-red-600 border-b-2 border-red-600 pb-1"
                : "text-gray-900 hover:text-red-600"
            }`}
          >
            Kalender
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`text-sm font-bold transition-colors uppercase px-3 py-1 h-auto relative ${
                  isLionCupActive
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-900 hover:text-orange-600"
                }`}
              >
                🦁 Lion Cup
                <ChevronDown className="ml-1 h-3 w-3" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                  NEU
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/regelwerk" className="w-full cursor-pointer">
                  Regelwerk
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tabelle-lion-cup" className="w-full cursor-pointer">
                  Tabelle
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`text-sm font-bold transition-colors uppercase px-3 py-1 h-auto ${
                  isTurnierserieActive ? "text-red-600 border-b-2 border-red-600" : "text-gray-900 hover:text-red-600"
                }`}
              >
                Dart Competition
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/tables" className="w-full cursor-pointer">
                  Tabellen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/players" className="w-full cursor-pointer">
                  Spieler
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`text-sm font-bold transition-colors uppercase px-3 py-1 h-auto ${
                  isTurniereActive ? "text-red-600 border-b-2 border-red-600" : "text-gray-900 hover:text-red-600"
                }`}
              >
                Turniere
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/upcoming-tournaments" className="w-full cursor-pointer">
                  Events
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/live" className="w-full cursor-pointer">
                  Live
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/kratzer-tournament-results" className="w-full cursor-pointer">
                  Beendete Turniere
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/club"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/club" ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-gray-900 hover:text-red-600"
            }`}
          >
            Verein
          </Link>

          <Link
            href="/kontakt"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/kontakt"
                ? "text-red-600 border-b-2 border-red-600 pb-1"
                : "text-gray-900 hover:text-red-600"
            }`}
          >
            Kontakt
          </Link>

          <Link href="/admin" passHref>
            <Button
              variant="outline"
              className={`font-bold py-2 px-4 xl:px-5 rounded-md bg-transparent uppercase transition-colors text-sm ${
                pathname === "/admin"
                  ? "border-red-600 text-red-600 bg-gray-200"
                  : "border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600"
              }`}
            >
              Admin
            </Button>
          </Link>

          {session && user ? (
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <UserIcon className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                disabled={loggingOut}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-900 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200"
              >
                {loggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Abmeldung...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="lg:hidden text-gray-900 flex-shrink-0 p-2">
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-white/95 backdrop-blur-sm border-l border-gray-200 w-[280px] sm:w-[320px] shadow-2xl"
          >
            <div className="flex flex-col gap-4 py-6 px-4">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-200 mb-4">
                <div>
                  <div className="font-bold text-gray-900 text-xl">Emoj!'s Dartverein</div>
                  <div className="text-xs text-gray-600"></div>
                </div>
              </div>

              <Link
                href="/"
                className={`flex items-center text-base sm:text-lg font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
                  pathname === "/"
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-800 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                Startseite
              </Link>

              <Link
                href="/tournament"
                className={`flex items-center text-base sm:text-lg font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
                  pathname === "/tournament"
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-800 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                Kalender
              </Link>

              <div className="space-y-2">
                <div className="text-sm font-bold text-orange-600 px-4 py-2 uppercase tracking-wide flex items-center">
                  🦁 Lion Cup
                  <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">NEU</span>
                </div>
                <Link
                  href="/regelwerk"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/regelwerk"
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  Regelwerk
                </Link>
                <Link
                  href="/tabelle-lion-cup"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/tabelle-lion-cup"
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  Tabelle
                </Link>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-600 px-4 py-2 uppercase tracking-wide">
                  Dart Competition
                </div>
                <Link
                  href="/tables"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/tables"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Tabellen
                </Link>
                <Link
                  href="/players"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/players"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Spieler
                </Link>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-600 px-4 py-2 uppercase tracking-wide">Turniere</div>
                <Link
                  href="/upcoming-tournaments"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/upcoming-tournaments"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Events
                </Link>
                <Link
                  href="/live"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/live"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Live
                </Link>
                <Link
                  href="/kratzer-tournament-results"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/kratzer-tournament-results"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Beendete Turniere
                </Link>
              </div>

              <Link
                href="/club"
                className={`flex items-center text-base sm:text-lg font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
                  pathname === "/club"
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-800 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                Verein
              </Link>

              <Link
                href="/kontakt"
                className={`flex items-center text-base sm:text-lg font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
                  pathname === "/kontakt"
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-800 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                Kontakt
              </Link>

              <Link href="/admin" passHref>
                <Button
                  variant="outline"
                  className={`w-full font-bold py-3 px-4 rounded-lg bg-transparent uppercase text-base justify-start ${
                    pathname === "/admin"
                      ? "border-red-600 text-red-600 bg-gray-200"
                      : "border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600"
                  }`}
                >
                  Admin
                </Button>
              </Link>

              {session && user ? (
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-base text-gray-700 px-4 py-2">
                    <UserIcon className="h-5 w-5" />
                    <span>{user.email}</span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    variant="outline"
                    className="w-full border-gray-300 text-gray-900 hover:bg-red-50 hover:border-red-300 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg uppercase text-base justify-start"
                  >
                    {loggingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Abmeldung...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Abmelden
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

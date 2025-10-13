"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, UserIcon, ChevronDown } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname } from "next/navigation"

export function Header() {
  const marqueeContent =
    "🦁 +++ EMD - LION CUP PART II GESTARTET  • ZEITRAUM: 01. SEPTEMBER 2025 – 01. JUNI 2026 • 34 SPIELTAGE • 1 FINALE • JEDEN MONTAG 19:30 UHR +++"

  const { session, user } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const fetchPlayerName = async () => {
      if (session?.user) {
        try {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select(`club_players (name)`)
            .eq("user_id", session.user.id)
            .single()

          if (profileData?.club_players?.name) {
            setPlayerName(profileData.club_players.name)
          }
        } catch (error) {
          console.error("Error fetching player name:", error)
        }
      }
    }

    fetchPlayerName()
  }, [session])

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

  const isTurniereActive = ["/upcoming-tournaments", "/live", "/livestream"].includes(pathname)

  const isLigaActive = ["/liga-statistiken", "/match-galerie"].includes(pathname)

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
                🦁 EMD - Lion Cup
                <ChevronDown className="ml-1 h-3 w-3" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                  NEU
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/tournament-series" className="w-full cursor-pointer">
                  Tabelle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/players" className="w-full cursor-pointer">
                  Spieler
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/regelwerk" className="w-full cursor-pointer">
                  Regelwerk
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
                Hall of Fame
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/tables" className="w-full cursor-pointer">
                  Tabellen
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
                <Link href="/live-all" className="w-full cursor-pointer">
                  Liveticker
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/livestream" className="w-full cursor-pointer">
                  Livestream
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`text-sm font-bold transition-colors uppercase px-3 py-1 h-auto ${
                  isLigaActive ? "text-red-600 border-b-2 border-red-600" : "text-gray-900 hover:text-red-600"
                }`}
              >
                Liga
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/liga-statistiken" className="w-full cursor-pointer">
                  Statistiken
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/match-galerie" className="w-full cursor-pointer">
                  Galerie
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

          {session && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 bg-transparent transition-all duration-200 font-bold"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  {playerName || user.email?.split("@")[0] || "User"}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/member-profile" className="w-full cursor-pointer">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Member Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="w-full cursor-pointer">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
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
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:border-orange-600 bg-transparent transition-all duration-200 font-bold"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Login
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/member-login" className="w-full cursor-pointer">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Member Login
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="w-full cursor-pointer">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Admin Login
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
            className="bg-white/95 backdrop-blur-sm border-l border-gray-200 w-[280px] sm:w-[320px] shadow-2xl overflow-y-auto max-h-screen"
          >
            <div className="flex flex-col gap-4 py-6 px-4 min-h-full">
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
                  href="/tournament-series"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/tabelle-lion-cup"
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  Tabelle
                </Link>
                <Link
                  href="/players"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/players"
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  Spieler
                </Link>
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
                  href="/live-all"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/live-all"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Live
                </Link>
                <Link
                  href="/livestream"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/livestream"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Livestream
                </Link>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-600 px-4 py-2 uppercase tracking-wide">Liga</div>
                <Link
                  href="/liga-statistiken"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/liga-statistiken"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Statistiken
                </Link>
                <Link
                  href="/match-galerie"
                  className={`flex items-center text-base font-medium rounded-lg px-6 py-2 ml-2 transition-all duration-200 ${
                    pathname === "/match-galerie"
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Galerie
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

              <div className="mt-6 pt-4 border-t border-gray-200">
                <a
                  href="https://www.sportaustria.at/de/service-center/ausbildungs-und-fortbildungsangebot/management-fortbildung"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg text-base justify-start font-bold"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Sportaustria
                  </Button>
                </a>
              </div>

              {session && user ? (
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-base text-gray-700 px-4 py-2">
                    <UserIcon className="h-5 w-5" />
                    <span>{playerName || user.email}</span>
                  </div>
                  <Link href="/member-dashboard" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg text-base justify-start font-bold"
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Member Dashboard
                    </Button>
                  </Link>
                  <Link href="/admin" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg text-base justify-start font-bold"
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
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
              ) : (
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="text-sm font-bold text-orange-600 px-4 py-2 uppercase tracking-wide">Login</div>
                  <Link href="/member-login" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 hover:border-orange-600 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg text-base justify-start font-bold"
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Member Login
                    </Button>
                  </Link>
                  <Link href="/admin" passHref>
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600 bg-transparent transition-all duration-200 py-3 px-4 rounded-lg text-base justify-start font-bold"
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Admin Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

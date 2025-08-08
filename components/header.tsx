"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, UserIcon } from 'lucide-react' // Import UserIcon for user display
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth" // Import useAuth hook
import { useState } from "react" // Import useState for loggingOut state
import { supabase } from "@/lib/supabase" // Import supabase for signOut
import { usePathname } from "next/navigation" // Import usePathname

export function Header() {
  const marqueeContent =
    "EMOJIS DART COMPETITION 2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG"

  const { session, user } = useAuth() // Get session and user from useAuth
  const [loggingOut, setLoggingOut] = useState(false) // State for logout loading
  const pathname = usePathname() // Get current pathname

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      // Optional: Redirect or refresh the page after logout
      window.location.reload()
    } catch (err: any) {
      console.error("Logout error:", err)
      // Handle error, maybe show a toast
      window.location.reload() // Force reload even on error for consistency
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="relative z-20 w-full bg-gray-100 text-gray-900 border-b border-gray-300 shadow-lg">
      {/* Top Bar mit Laufschrift - Mobile optimiert und professioneller */}
      <div className="bg-red-600 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium overflow-hidden flex">
        <div className="flex animate-marquee min-w-full">
          <span className="text-white text-xs sm:text-sm leading-none px-4 py-0.5">{marqueeContent}</span>
          <span className="text-white text-xs sm:text-sm leading-none px-4 py-0.5">{marqueeContent}</span>
        </div>
      </div>

      {/* Main Navigation - Mobile optimiert */}
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-3 sm:px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-lg font-bold flex-shrink-0 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-lg md:text-xl font-extrabold tracking-wide truncate">
              EMOJIS DARTVEREIN
            </span>
            <span className="text-xs font-normal text-gray-600 hidden sm:block">COMPETITION 2025</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          <Link
            href="/"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/"
                ? "text-red-600 border-b-2 border-red-600 pb-1"
                : "text-gray-900 hover:text-red-600"
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
            TOURNAMENT
          </Link>
          <Link
            href="/upcoming-tournaments"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/upcoming-tournaments"
                ? "text-red-600 border-b-2 border-red-600 pb-1"
                : "text-gray-900 hover:text-red-600"
            }`}
          >
            Events 
          </Link>
          <Link
            href="/club"
            className={`text-sm font-bold transition-colors uppercase ${
              pathname === "/club"
                ? "text-red-600 border-b-2 border-red-600 pb-1"
                : "text-gray-900 hover:text-red-600"
            }`}
          >
            Verein
          </Link>
          <Link href="/tables" passHref>
            <Button
              className={`font-extrabold py-2 px-3 xl:px-4 rounded-md uppercase transition-colors text-sm ${
                pathname === "/tables"
                  ? "bg-red-600 text-white"
                  : "bg-yellow-600 hover:bg-red-600 text-white"
              }`}
            >
              Tabellen
            </Button>
          </Link>
          <Link href="/players" passHref>
            <Button
              variant="outline"
              className={`font-bold py-2 px-3 xl:px-4 rounded-md bg-transparent uppercase transition-colors text-sm ${
                pathname === "/players"
                  ? "border-red-600 text-red-600 bg-gray-200"
                  : "border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600"
              }`}
            >
              Players
            </Button>
          </Link>
          <Link href="/admin" passHref>
            <Button
              variant="outline"
              className={`font-bold py-2 px-3 xl:px-4 rounded-md bg-transparent uppercase transition-colors text-sm ${
                pathname === "/admin"
                  ? "border-red-600 text-red-600 bg-gray-200"
                  : "border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600"
              }`}
            >
              Admin
            </Button>
          </Link>

          {/* User Info and Logout for Desktop */}
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

        {/* Mobile Menu */}
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
                  <div className="font-bold text-gray-900 text-xl">EMOJIS DARTVEREIN</div>
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
                Tournament
              </Link>
              <Link
                href="/upcoming-tournaments"
                className={`flex items-center text-base sm:text-lg font-medium rounded-lg px-4 py-3 transition-all duration-200 ${
                  pathname === "/upcoming-tournaments"
                    ? "bg-red-50 text-red-600 font-bold"
                    : "text-gray-800 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                UPCOMING TOURNAMENTS
              </Link>
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
              <Link href="/tables" passHref>
                <Button
                  className={`w-full font-extrabold py-3 px-4 rounded-lg uppercase text-base justify-start shadow-md ${
                    pathname === "/tables"
                      ? "bg-red-600 text-white"
                      : "bg-yellow-600 hover:bg-yellow-700 text-white"
                  }`}
                >
                  Tabellen
                </Button>
              </Link>
              <Link href="/players" passHref>
                <Button
                  variant="outline"
                  className={`w-full font-bold py-3 px-4 rounded-lg bg-transparent uppercase text-base justify-start ${
                    pathname === "/players"
                      ? "border-red-600 text-red-600 bg-gray-200"
                      : "border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600"
                  }`}
                >
                  Players
                </Button>
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

              {/* User Info and Logout for Mobile */}
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

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

type HeaderProps = {}

export function Header({}: HeaderProps) {
  const marqueeContent =
    "EMOJIS DART COMPETITION 2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG"

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
          <Link href="/" className="text-sm font-bold hover:text-red-600 transition-colors uppercase">
            Startseite
          </Link>
          <Link href="/tournament" className="text-sm font-bold hover:text-red-600 transition-colors uppercase">
            TOURNAMENT
          </Link>
          <Link href="/tables" passHref>
            <Button className="bg-yellow-600 hover:bg-red-600 text-white font-extrabold py-2 px-3 xl:px-4 rounded-md uppercase transition-colors text-sm">
              Tabellen
            </Button>
          </Link>
          <Link href="/admin" passHref>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600 font-bold py-2 px-3 xl:px-4 rounded-md bg-transparent uppercase transition-colors text-sm"
            >
              Admin
            </Button>
          </Link>
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
            className="bg-gray-100 text-gray-900 border-l border-gray-300 w-[280px] sm:w-[320px]"
          >
            <div className="flex flex-col gap-6 py-6">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-300">
                <div>
                  <div className="font-bold text-gray-900">EMOJIS DARTVEREIN</div>
                  <div className="text-xs text-gray-600">COMPETITION 2025</div>
                </div>
              </div>

              <Link
                href="/"
                className="text-lg font-semibold hover:text-red-600 uppercase py-2 px-2 rounded-lg hover:bg-gray-200 transition-all"
              >
                Startseite
              </Link>
              <Link
                href="/tournament"
                className="text-lg font-semibold hover:text-red-600 uppercase py-2 px-2 rounded-lg hover:bg-gray-200 transition-all"
              >
                Tournament
              </Link>
              <Link href="/tables" passHref>
                <Button className="w-full bg-yellow-600 hover:bg-red-600 text-white font-extrabold py-3 px-4 rounded-lg uppercase text-base justify-start">
                  Tabellen
                </Button>
              </Link>
              <Link href="/admin" passHref>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600 font-bold py-3 px-4 rounded-lg bg-transparent uppercase text-base justify-start"
                >
                  Admin
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, Target } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

type HeaderProps = {}

export function Header({}: HeaderProps) {
  return (
    <header className="relative z-20 w-full bg-gray-100 text-gray-900 border-b border-gray-300 shadow-lg">
      {/* Top Bar mit Laufschrift */}
      <div className="bg-red-600 py-3 text-center text-sm font-medium overflow-hidden whitespace-nowrap flex items-center">
        <span className="inline-block animate-marquee text-white text-sm leading-none">
          EMOJIS DART COMPETITION 2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG • EMOJIS
          DART COMPETITION 2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG
        </span>
      </div>

      {/* Main Navigation */}
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold flex-shrink-0">
          <Target className="h-8 w-8 text-red-600 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-lg sm:text-xl font-extrabold tracking-wide text-wrap">EMOJIS DARTVEREIN</span>
            <span className="text-xs font-normal text-gray-600">COMPETITION 2025</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/" className="text-sm font-bold hover:text-red-600 transition-colors uppercase">
            Startseite
          </Link>
          <Link href="/tournament" className="text-sm font-bold hover:text-red-600 transition-colors uppercase">
            TOURNAMENT
          </Link>
          <Link href="/tables" passHref>
            <Button className="bg-yellow-600 hover:bg-red-600 text-white font-extrabold py-2 px-4 rounded-md uppercase transition-colors">
              Turniertabellen
            </Button>
          </Link>
          <Link href="/admin" passHref>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600 font-bold py-2 px-4 rounded-md bg-transparent uppercase transition-colors"
            >
              Admin Login
            </Button>
          </Link>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden text-gray-900 flex-shrink-0">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-gray-100 text-gray-900 border-l border-gray-300">
            <div className="flex flex-col gap-4 py-6">
              <Link href="/" className="text-lg font-semibold hover:text-red-600 uppercase">
                Startseite
              </Link>
              <Link href="/tournament" className="text-lg font-semibold hover:text-red-600 uppercase">
                TOURNAMENT
              </Link>
              <Link href="/tables" passHref>
                <Button className="w-full bg-yellow-600 hover:bg-red-600 text-white font-extrabold py-2 px-4 rounded-md uppercase">
                  Turniertabellen
                </Button>
              </Link>
              <Link href="/admin" passHref>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-900 hover:bg-gray-200 hover:text-red-600 font-bold py-2 px-4 rounded-md bg-transparent uppercase"
                >
                  Admin Login
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

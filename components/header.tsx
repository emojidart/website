import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, Target } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

type HeaderProps = {}

export function Header({}: HeaderProps) {
  return (
    <header className="relative z-20 w-full bg-brutal-bg text-brutal-text border-b border-brutal-border shadow-lg">
      {/* Top Bar mit Laufschrift */}
      <div className="bg-brutal-accent-red py-2 text-center text-sm font-medium overflow-hidden whitespace-nowrap">
        <span className="inline-block animate-marquee text-brutal-text text-sm">
          EMOJIS DART COMPETITION2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG • EMOJIS
          DART COMPETITION2025 • 2 JULI - 31 AUGUST • Pfeil OK Salzburg • IMMER MITTWOCH UND FREITAG
        </span>
      </div>

      {/* Main Navigation */}
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold flex-shrink-0">
          <Target className="h-8 w-8 text-brutal-accent-red flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            {/* text-wrap und responsive Schriftgröße für bessere Darstellung auf kleinen Bildschirmen */}
            <span className="text-lg sm:text-xl font-extrabold tracking-wide text-wrap">EMOJIS DARTVEREIN</span>
            <span className="text-xs font-normal text-brutal-text-muted">COMPETITION 2025</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/" className="text-sm font-bold hover:text-brutal-accent-red transition-colors uppercase">
            Startseite
          </Link>
          <Link
            href="/"
            className="text-sm font-bold hover:text-brutal-accent-red transition-colors uppercase"
          >
            TOURNAMENT
          </Link>
          <Link href="/tables" passHref>
            <Button className="bg-brutal-accent-gold hover:bg-brutal-accent-red text-brutal-bg font-extrabold py-2 px-4 rounded-md uppercase transition-colors">
              Turniertabellen
            </Button>
          </Link>
          <Link href="/admin" passHref>
            <Button
              variant="outline"
              className="border-brutal-border text-brutal-text hover:bg-brutal-hover hover:text-brutal-accent-red font-bold py-2 px-4 rounded-md bg-transparent uppercase transition-colors"
            >
              Admin Login
            </Button>
          </Link>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden text-brutal-text flex-shrink-0">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-brutal-bg text-brutal-text border-l border-brutal-border">
            <div className="flex flex-col gap-4 py-6">
              <Link href="/" className="text-lg font-semibold hover:text-brutal-accent-red uppercase">
                Startseite
              </Link>
              <Link
                href="/tournament-stats/page"
                className="text-lg font-semibold hover:text-brutal-accent-red uppercase"
              >
                TOURNAMENT
              </Link>
              <Link href="/tables" passHref>
                <Button className="w-full bg-brutal-accent-gold hover:bg-brutal-accent-red text-brutal-bg font-extrabold py-2 px-4 rounded-md uppercase">
                  Turniertabellen
                </Button>
              </Link>
              <Link href="/admin" passHref>
                <Button
                  variant="outline"
                  className="w-full border-brutal-border text-brutal-text hover:bg-brutal-hover hover:text-brutal-accent-red font-bold py-2 px-4 rounded-md bg-transparent uppercase"
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

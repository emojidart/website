import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Calendar, Radio, Video, BookOpen } from "lucide-react"
import Link from "next/link"

export default function TurnierAppPage() {
  return (
    <div className="min-h-screen bg-card flex flex-col font-sans">
      <Header />

      <main className="flex-1 px-6 py-6 pb-24 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">Turniere</h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Events Button */}
            <Link
              href="/upcoming-tournaments-app"
              className="text-foreground group relative overflow-hidden rounded-2xl bg-card   p-6 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <div className="flex flex-col items-center text-center text-white">
                <div className="mb-4 rounded-full bg-white/20 p-4 ">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Events</h3>
                <p className="text-sm text-white/90">Alle kommenden Turniere und Events</p>
              </div>
            </Link>

            {/* Liveticker Button */}
            <Link
              href="/live-all-app"
              className="text-foreground group relative overflow-hidden rounded-2xl bg-card   p-6 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <div className="flex flex-col items-center text-center text-white">
                <div className="mb-4 rounded-full bg-white/20 p-4 ">
                  <Radio className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Liveticker</h3>
                <p className="text-sm text-white/90">Live-Updates zu laufenden Spielen</p>
              </div>
            </Link>

            {/* Livestream Button */}
            <Link
              href="/livestream-app"
              className="text-foreground group relative overflow-hidden rounded-2xl bg-card   p-6 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <div className="flex flex-col items-center text-center text-white">
                <div className="mb-4 rounded-full bg-white/20 p-4 ">
                  <Video className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Livestream</h3>
                <p className="text-sm text-white/90">Spiele live im Stream verfolgen</p>
              </div>
            </Link>

            {/* Regelwerk Button */}
            <Link
              href="/regelwerk-app"
              className="text-foreground group relative overflow-hidden rounded-2xl bg-card   p-6 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <div className="flex flex-col items-center text-center text-white">
                <div className="mb-4 rounded-full bg-white/20 p-4 ">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">EMD - LION CUP Regelwerk</h3>
                <p className="text-sm text-white/90">Lion Cup Regeln und Informationen</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

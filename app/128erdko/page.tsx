import TournamentBracket32er from "@/components/tournament-bracket_128er"
import { Header } from "@/components/header"
import { Trophy } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-20">
        <div className="w-full px-4 md:px-6 py-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
                <span className="block text-white">128er Doppel-KO</span>
                <span className="block text-orange-200">Turnier</span>
              </h1>
              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100 mb-2 sm:mb-4"></p>
            </div>
          </div>

          <TournamentBracket32er />
        </div>
      </main>
    </div>
  )
}

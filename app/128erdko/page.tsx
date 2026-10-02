import TournamentBracket128er from "@/components/tournament-bracket_128er"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <Header />
      <main className="w-full pt-[64px]">
        <TournamentBracket128er />
      </main>
    </div>
  )
}

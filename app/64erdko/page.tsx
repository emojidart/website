import TournamentBracket64er from "@/components/tournament-bracket_64er"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <Header />
      <main className="w-full pt-[64px]">
        <TournamentBracket64er />
      </main>
    </div>
  )
}

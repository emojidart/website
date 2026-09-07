import TournamentBracket64er from "@/components/tournament-bracket_64er"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-950">
      <Header />
      <main className="w-full pt-[64px]">
        <TournamentBracket64er />
      </main>
    </div>
  )
}

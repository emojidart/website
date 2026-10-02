import { Suspense } from "react"
import TournamentBracket from "@/components/tournament-bracket_16er"
import { Header } from "@/components/header"

function BracketContent() {
  return <TournamentBracket />
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <Header />
      <main className="w-full pt-[64px]">
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm font-bold text-white/45">Turnier wird geladen…</div>}>
          <BracketContent />
        </Suspense>
      </main>
    </div>
  )
}

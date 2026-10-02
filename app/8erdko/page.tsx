import TournamentBracket from "@/components/tournament-bracket-8er"
import { Header } from "@/components/header"
import PlayerScannerModal from "@/components/player-scanner-modal"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <Header />
      <PlayerScannerModal tournamentId="1" tournamentType="8er_dko" />
      <main className="w-full pt-[64px]">
        <TournamentBracket />
      </main>
    </div>
  )
}

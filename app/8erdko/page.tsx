import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import { EmdDkoKeyedBracket } from "@/components/emd-dko-keyed-bracket"
import { Header } from "@/components/header"
import PlayerScannerModal from "@/components/player-scanner-modal"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      <PlayerScannerModal tournamentId="1" tournamentType="8er_dko" />
      <main className="w-full pt-[64px]">
        <Suspense fallback={<SectionSkeleton kind="tournament" label="Bereich wird geladen…" />}><EmdDkoKeyedBracket size={8} /></Suspense>
      </main>
    </div>
  )
}

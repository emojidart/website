import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import { EmdDkoKeyedBracket } from "@/components/emd-dko-keyed-bracket"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      <main className="w-full pt-[64px]">
        <Suspense fallback={<SectionSkeleton kind="tournament" label="Bereich wird geladen…" />}><EmdDkoKeyedBracket size={64} /></Suspense>
      </main>
    </div>
  )
}

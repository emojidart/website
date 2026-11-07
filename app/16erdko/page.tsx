import { Suspense } from "react"
import { EmdDkoKeyedBracket } from "@/components/emd-dko-keyed-bracket"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      <main className="w-full pt-[64px]">
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm font-bold text-muted-foreground">Turnier wird geladen…</div>}>
          <EmdDkoKeyedBracket size={16} />
        </Suspense>
      </main>
    </div>
  )
}

"use client"

import Link from "next/link"
import { RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-lg items-center px-5 py-20">
      <section className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby="error-title">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Emoj’s Dartverein</p>
        <h1 id="error-title" className="text-2xl font-semibold tracking-tight">Das hat gerade nicht geklappt.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Diese Seite konnte nicht geladen werden. Bitte versuche es noch einmal.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset}><RefreshCw aria-hidden="true" />Erneut versuchen</Button>
          <Button variant="outline" asChild><Link href="/"><ArrowLeft aria-hidden="true" />Zur Startseite</Link></Button>
        </div>
      </section>
    </main>
  )
}

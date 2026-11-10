"use client"

import Link from "next/link"
import { ArrowRight, Trophy } from "lucide-react"

/**
 * The legacy editor depended on the removed tournaments/results tables and an
 * obsolete use-dart-data hook. Direct users to the maintained tournament admin
 * instead of displaying a form that could never save valid results.
 */
export default function ResultEntry() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold">Turnierergebnisse erfassen</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Die bisherige Ergebniserfassung wurde durch die aktuelle Turnierverwaltung ersetzt.
        Dort kannst du Turniere und Ergebnisse über den unterstützten Ablauf verwalten.
      </p>
      <Link
        href="/admin/einzelturnier"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Zur Turnierverwaltung
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  )
}

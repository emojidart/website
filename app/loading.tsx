import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-28 pt-24 sm:px-6" aria-busy="true" aria-label="Inhalte werden geladen">
      <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        Inhalte werden geladen …
      </div>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </main>
  )
}

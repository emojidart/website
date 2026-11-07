/** Responsive placeholder shared by public tournament submission and management. */
export function TournamentManagerSkeleton({ mode }: { mode: "form" | "list" }) {
  return (
    <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] space-y-5 px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8" role="status" aria-busy="true" aria-label={mode === "form" ? "Veranstaltungsformular wird vorbereitet" : "Veranstaltungen werden geladen"}>
      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-card p-5 sm:p-7">
        <div className="mb-5 h-6 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 w-full max-w-md animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
      </section>
      {mode === "form" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-card" />)}
          </div>
          <section className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_, section) => (
              <div key={section} className="space-y-5 rounded-[24px] border border-white/10 bg-card p-5">
                <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
                {Array.from({ length: 4 }, (_, field) => (
                  <div key={field} className="space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-white/10" />
                  </div>
                ))}
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className="space-y-4 rounded-[24px] border border-white/10 bg-card p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-11 w-28 animate-pulse rounded-xl bg-white/10" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-4 rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
                <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-white/10" />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

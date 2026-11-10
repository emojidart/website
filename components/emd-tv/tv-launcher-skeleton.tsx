/** Shared visual loading state for the EMD TV launcher (not the full-screen TV). */
export function TvLauncherSkeleton() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] space-y-5 px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8" role="status" aria-busy="true" aria-label="EMD TV wird geladen">
      <section className="overflow-hidden rounded-[30px] border border-white/[0.10] bg-[#172235] p-5 sm:p-8">
        <div className="mb-5 h-6 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-white/10" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-9 w-full max-w-sm animate-pulse rounded bg-white/10" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-6 h-12 w-full max-w-xs animate-pulse rounded-xl bg-white/10" />
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} aria-hidden="true" className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#172235]">
            <div className="aspect-video animate-pulse bg-white/[0.07]" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="h-11 w-1/2 animate-pulse rounded-xl bg-white/10" />
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

import { LoadingBlock } from "@/components/loading/loading"

/** Einheitlicher Fallback beim Laden neuer EMD-Routen. */
export default function Loading() {
  return (
    <div className="emd-app-theme-shell min-h-[75dvh] bg-background text-foreground" role="status" aria-busy="true" aria-label="EMD-Seite wird geladen">
      <div className="border-b border-white/10 bg-[#172235]">
        <div className="mx-auto flex h-[68px] w-full max-w-[var(--emd-content-max)] items-center gap-3 px-4 sm:px-6">
          <LoadingBlock className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <LoadingBlock className="h-4 w-36" />
            <LoadingBlock className="h-3 w-52 max-w-full" />
          </div>
          <LoadingBlock className="h-10 w-10 shrink-0 rounded-xl" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-[var(--emd-content-max)] space-y-5 px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        <section className="rounded-[28px] border border-white/10 bg-card p-5 sm:p-7">
          <LoadingBlock className="mb-5 h-6 w-40 rounded-full" />
          <LoadingBlock className="h-10 w-full max-w-md" />
          <LoadingBlock className="mt-4 h-4 w-full max-w-xl" />
          <LoadingBlock className="mt-2 h-4 w-2/3 max-w-md" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <LoadingBlock className="h-4 w-1/2" />
                <LoadingBlock className="h-8 w-16" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[24px] border border-white/10 bg-card p-4 sm:p-5">
          <LoadingBlock className="mb-4 h-6 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3">
                <LoadingBlock className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <LoadingBlock className="h-4 w-4/5" />
                  <LoadingBlock className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

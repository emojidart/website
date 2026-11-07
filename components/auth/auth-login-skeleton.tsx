import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export function AuthLoginSkeleton() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white">
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8" role="status" aria-busy="true" aria-label="Mitglieder-Login wird vorbereitet">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card lg:grid-cols-[1.05fr_.95fr]">
          <section className="hidden flex-col justify-between border-r border-white/10 p-8 lg:flex xl:p-10">
            <div className="space-y-5">
              <div className="h-7 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="h-12 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-12 w-3/5 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-24 animate-pulse rounded-2xl bg-white/[0.07]" />
          </section>
          <section className="flex items-center p-4 sm:p-7 lg:p-9 xl:p-10">
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
              <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
              <div className="h-9 w-56 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="space-y-4 rounded-2xl border border-white/10 bg-background p-4 sm:p-5">
                <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
                <div className="h-11 animate-pulse rounded-xl bg-white/10" />
              </div>
            </div>
          </section>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}


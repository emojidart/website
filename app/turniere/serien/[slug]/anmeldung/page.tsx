"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { UserPlus } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SeriesRegistration } from "../../_komponenten/serien-anmeldung"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Series = {
  id: string
  name: string
  slug: string
  is_active: boolean
  registration_enabled: boolean | null
}

export default function DynamicSeriesRegistrationPage() {
  const params = useParams<{ slug: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from("dko_series")
        .select("id,name,slug,is_active,registration_enabled")
        .eq("slug", params.slug)
        .eq("is_active", true)
        .maybeSingle()

      if (!mounted) return
      setSeries((data || null) as Series | null)
      setLoading(false)
    }
    if (params.slug) void load()
    return () => { mounted = false }
  }, [params.slug])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header
        variant="app"
        title={series?.name || "Anmeldung"}
        subtitle="Turnieranmeldung"
        backHref={`/turniere/serien/${params.slug}`}
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.28]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.74),rgba(3,5,9,.96)_42%,rgba(2,4,7,.995))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,.12),transparent_28%),radial-gradient(circle_at_88%_24%,rgba(16,185,129,.07),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        {loading ? (
          <div className="min-h-[320px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
        ) : !series ? (
          <div className="rounded-[28px] border border-white/10 bg-black/35 p-8 text-center">Turnierserie nicht gefunden.</div>
        ) : series.registration_enabled === false ? (
          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-black/40 p-8 text-center shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute left-1/2 top-[-90px] h-48 w-48 -translate-x-1/2 rounded-full bg-orange-500/[0.08] blur-[70px]" />
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <UserPlus className="h-6 w-6 text-white/28" />
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-[-0.03em]">Anmeldung derzeit geschlossen</h1>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-white/42">Sobald die Anmeldung freigeschaltet wird, kannst du dich hier direkt für den nächsten Spieltag anmelden.</p>
            </div>
          </div>
        ) : (
          <SeriesRegistration seriesId={series.id} />
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

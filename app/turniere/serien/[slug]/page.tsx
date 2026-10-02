"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  LockKeyhole,
  Trophy,
  UserPlus,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Series = {
  id: string
  name: string
  slug: string
  description: string | null
  image_path: string | null
  is_active: boolean
  access_type: "public" | "club_internal" | "club_external"
  registration_enabled: boolean | null
}

type EventRow = {
  id: string
  title: string | null
  start_at: string
  is_rescheduled: boolean | null
  rescheduled_at: string | null
  location: string | null
  is_matchday: boolean | null
}

function imageUrl(path: string | null) {
  if (!path) return "/terminal/hero-startscreen.png"
  return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
}

function effectiveDate(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

export default function DynamicSeriesHubPage() {
  const params = useParams<{ slug: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setAllowed(true)

      const { data: seriesRow, error } = await supabase
        .from("dko_series")
        .select("id,name,slug,description,image_path,is_active,access_type,registration_enabled")
        .eq("slug", params.slug)
        .eq("is_active", true)
        .maybeSingle()

      if (!mounted) return
      if (error || !seriesRow) {
        setSeries(null)
        setLoading(false)
        return
      }

      const loaded = seriesRow as Series

      if (loaded.access_type === "club_internal") {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData.user

        if (!user?.id) {
          setAllowed(false)
          setSeries(loaded)
          setLoading(false)
          return
        }

        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("is_active", true)
          .maybeSingle()

        if (!clubPlayer?.id) {
          setAllowed(false)
          setSeries(loaded)
          setLoading(false)
          return
        }
      }

      const { data: eventRows } = await supabase
        .from("dko_series_events")
        .select("id,title,start_at,is_rescheduled,rescheduled_at,location,is_matchday")
        .eq("series_id", loaded.id)
        .eq("is_matchday", true)
        .order("start_at", { ascending: true })

      if (!mounted) return
      setSeries(loaded)
      setEvents((eventRows || []) as EventRow[])
      setLoading(false)
    }

    if (params.slug) void load()
    return () => {
      mounted = false
    }
  }, [params.slug])

  const nextEvent = useMemo(() => {
    const now = Date.now()
    return events
      .filter((event) => new Date(effectiveDate(event)).getTime() >= now)
      .sort((a, b) => new Date(effectiveDate(a)).getTime() - new Date(effectiveDate(b)).getTime())[0] || null
  }, [events])

  const tiles = series
    ? [
        {
          title: "Tabelle & Ergebnisse",
          subtitle: "Gesamtwertung, Platzierungen und Ergebnisse aller bisherigen Spieltage.",
          href: `/turniere/serien/${series.slug}/tabelle`,
          eyebrow: "WERTUNG",
          icon: Trophy,
          accent: "amber",
          visible: true,
        },
        {
          title: "Regelwerk",
          subtitle: "Regeln, Wertung, Teilnahmebedingungen, Boni und Serienkonfiguration.",
          href: `/turniere/serien/${series.slug}/regelwerk`,
          eyebrow: "REGELN",
          icon: BookOpenCheck,
          accent: "sky",
          visible: true,
        },
        {
          title: "Anmeldung",
          subtitle: "Für den nächsten freigegebenen Spieltag anmelden oder den eigenen Status prüfen.",
          href: `/turniere/serien/${series.slug}/anmeldung`,
          eyebrow: "ANMELDUNG",
          icon: UserPlus,
          accent: "emerald",
          visible: series.registration_enabled !== false,
        },
      ].filter((tile) => tile.visible)
    : []

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header
        variant="app"
        title={series?.name || "Turnierserie"}
        subtitle="Turnierserien"
        backHref="/turniere/serien"
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.30]"
          style={{ backgroundImage: `url('${series ? imageUrl(series.image_path) : "/terminal/hero-startscreen.png"}')` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.70),rgba(3,5,9,.94)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(245,158,11,.15),transparent_26%),radial-gradient(circle_at_88%_26%,rgba(249,115,22,.12),transparent_28%),radial-gradient(circle_at_52%_82%,rgba(14,165,233,.07),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        {loading ? (
          <div className="min-h-[340px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
        ) : !series ? (
          <div className="rounded-[30px] border border-white/10 bg-black/35 px-6 py-16 text-center backdrop-blur-xl">
            Turnierserie nicht gefunden oder nicht aktiv.
          </div>
        ) : !allowed ? (
          <div className="rounded-[30px] border border-orange-300/15 bg-black/40 px-6 py-16 text-center backdrop-blur-xl">
            <LockKeyhole className="mx-auto h-9 w-9 text-orange-200" />
            <h1 className="mt-4 text-2xl font-black">Nur für Vereinsmitglieder</h1>
            <p className="mt-2 text-sm text-white/45">Diese Turnierserie ist nur im Mitgliederbereich verfügbar.</p>
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7 lg:p-8">
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/15 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/80">
                    <Trophy className="h-3.5 w-3.5" />
                    Turnierserie
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                    {series.name}
                  </h1>
                  {series.description ? (
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
                      {series.description}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 sm:min-w-[300px]">
                  <CalendarDays className="h-5 w-5 text-orange-200" />
                  {nextEvent ? (() => {
                    const date = new Date(effectiveDate(nextEvent))
                    return (
                      <>
                        <div className="mt-2 text-sm font-black text-white">
                          Nächster Spieltag: {date.toLocaleDateString("de-AT")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-white/40">
                          {date.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                          {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                        </div>
                      </>
                    )
                  })() : (
                    <>
                      <div className="mt-2 text-sm font-black text-white">Kein weiterer Spieltag eingetragen</div>
                      <div className="mt-1 text-xs leading-5 text-white/40">Neue Termine erscheinen hier automatisch.</div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {tiles.map((tile) => {
                const Icon = tile.icon
                const tone =
                  tile.accent === "amber"
                    ? "border-amber-300/[0.13] hover:border-amber-300/35"
                    : tile.accent === "sky"
                      ? "border-sky-300/[0.12] hover:border-sky-300/30"
                      : "border-emerald-300/[0.12] hover:border-emerald-300/30"

                return (
                  <Link
                    key={tile.href}
                    href={tile.href}
                    className={`group relative min-h-[245px] overflow-hidden rounded-[30px] border ${tone} bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-1`}
                  >
                    <div className="relative flex min-h-[245px] flex-col justify-between p-5 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.045] text-white">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-black/35 text-white/60 transition group-hover:bg-white/[0.08] group-hover:text-white">
                          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{tile.eyebrow}</div>
                        <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white">{tile.title}</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{tile.subtitle}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

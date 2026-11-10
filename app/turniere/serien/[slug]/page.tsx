"use client"

import { SectionSkeleton } from "@/components/loading/loading"

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

import { TournamentPageTitle, TournamentNavCard, TournamentFact, TournamentEmpty } from "@/components/tournaments/tournament-ui"
import { SeriesNavigation } from "@/components/tournaments/series-navigation"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Mitgliedschaft über direkte Login-Verknüpfung ODER das bestehende Spielerprofil prüfen.
// club_players.user_id ist nur der Ersteller des Datensatzes und kein Login-Nachweis.
async function hasActiveClubMembership(authUserId: string): Promise<boolean> {
  const { data: directPlayer } = await supabase
    .from("club_players")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (directPlayer?.id) return true

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("player_id")
    .eq("user_id", authUserId)
    .maybeSingle()

  if (!profile?.player_id) return false

  const { data: linkedPlayer } = await supabase
    .from("club_players")
    .select("id")
    .eq("id", profile.player_id)
    .eq("is_active", true)
    .maybeSingle()

  return Boolean(linkedPlayer?.id)
}

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

        const hasMembership = await hasActiveClubMembership(user.id)

        if (!hasMembership) {
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

  return <div>
    <Header variant="app" title={series?.name || "Turnierserie"} subtitle="Turnierserien" backHref="/turniere/serien" />
    <main className="et-shell">
        <SeriesNavigation />
      {loading ? <SectionSkeleton kind="tournament" />
      : !series ? <TournamentEmpty title="Serie nicht verfügbar" description="Diese Turnierserie wurde nicht gefunden oder ist nicht aktiv."/>
      : !allowed ? <TournamentEmpty title="Nur für Vereinsmitglieder" description="Diese Turnierserie ist nur im Mitgliederbereich verfügbar."/>
      : <>
        <div className="et-series-intro"><TournamentPageTitle title={series.name} eyebrow="EMD · Turnierserie" description={series.description || undefined} actions={series.registration_enabled !== false ? <Link href={`/turniere/serien/${series.slug}/anmeldung`} className="et-button et-button-primary"><UserPlus size={18}/>Zur Anmeldung</Link> : undefined}/></div>
        <section className="et-series-intro" aria-label="Nächster Spieltag">
          <TournamentFact label="Nächster Spieltag" icon={CalendarDays}>{nextEvent ? new Date(effectiveDate(nextEvent)).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch kein weiterer Termin"}</TournamentFact>
          {nextEvent?.location && <p className="mt-2 text-sm text-muted-foreground">{nextEvent.location}</p>}
        </section>
        <div className="et-series-grid">{tiles.map(tile=><TournamentNavCard key={tile.href} href={tile.href} title={tile.title} description={tile.subtitle} eyebrow={tile.eyebrow} icon={tile.icon}/>)}</div>
      </>}
    </main><MobileBottomNav/>
  </div>
}

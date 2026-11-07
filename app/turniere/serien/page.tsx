"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowRight,
  CalendarDays,
  Coins,
  LockKeyhole,
  Medal,
  Trophy,
  Users,
} from "lucide-react"

import { TournamentPageTitle, TournamentStatus, TournamentFact, TournamentEmpty } from "@/components/tournaments/tournament-ui"
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

type SeriesRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_path: string | null
  is_active: boolean
  access_type: "public" | "club_internal" | "club_external"
  startgeld: number | null
  series_fee: number | null
  qualification_requirement: number | null
  total_tournament_days: number | null
  result_counting_mode: "all" | "best_n" | null
  best_n_results: number | null
  registration_enabled: boolean | null
}

type EventRow = {
  id: string
  series_id: string
  start_at: string
  rescheduled_at: string | null
  is_rescheduled: boolean | null
  is_matchday: boolean | null
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
  })
}

function imageUrl(path: string | null) {
  if (!path) return "/terminal/hero-startscreen.png"
  return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
}

function effectiveDate(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

export default function TurnierserienPage() {
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      const member = user?.id ? await hasActiveClubMembership(user.id) : false

      const { data: seriesData } = await supabase
        .from("dko_series")
        .select(
          "id,name,slug,description,image_path,is_active,access_type,startgeld,series_fee,qualification_requirement,total_tournament_days,result_counting_mode,best_n_results,registration_enabled",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      const rows = ((seriesData || []) as SeriesRow[]).filter((row) => {
        if (row.access_type === "club_internal") return member
        return row.access_type === "public" || row.access_type === "club_external"
      })

      const ids = rows.map((row) => row.id)
      let eventRows: EventRow[] = []

      if (ids.length > 0) {
        const { data: eventData } = await supabase
          .from("dko_series_events")
          .select("id,series_id,start_at,rescheduled_at,is_rescheduled,is_matchday")
          .in("series_id", ids)
          .eq("is_matchday", true)
          .order("start_at", { ascending: true })

        eventRows = (eventData || []) as EventRow[]
      }

      if (!active) return
      setIsMember(member)
      setSeries(rows)
      setEvents(eventRows)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const nextBySeries = useMemo(() => {
    const now = Date.now()
    const map = new Map<string, EventRow>()

    for (const event of events) {
      const ts = new Date(effectiveDate(event)).getTime()
      if (!Number.isFinite(ts) || ts < now) continue

      const current = map.get(event.series_id)
      if (!current || ts < new Date(effectiveDate(current)).getTime()) {
        map.set(event.series_id, event)
      }
    }

    return map
  }, [events])

  return (
    <div>
      <Header variant="app" title="Turnierserien" subtitle="Serien & Spieltage" backHref="/turniere" />
      <main className="et-shell">
        <TournamentPageTitle title="Eine Saison. Viele Chancen." eyebrow="EMD · Turnierserien" description="Finde deine Serie. Alle Termine, Startgelder und Wertungen übersichtlich an einem Ort." />
        <div className="et-section-heading"><h2>Aktuelle Turnierserien</h2><TournamentStatus>{loading ? "Wird geladen…" : series.length + " Serien"}</TournamentStatus></div>
        {loading ? <div className="et-series-grid" role="status" aria-busy="true" aria-label="Turnierserien werden geladen">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="et-series-card overflow-hidden" aria-hidden="true">
              <div className="et-series-art animate-pulse bg-white/[0.075]" />
              <div className="et-series-body space-y-4">
                <div className="space-y-3">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                </div>
                <div className="h-12 animate-pulse rounded-xl bg-white/10" />
              </div>
            </div>
          ))}
        </div>
        : series.length === 0 ? <TournamentEmpty title="Aktuell keine Turnierserie verfügbar" description="Neue Serien erscheinen hier automatisch. Interne Serien sind für Vereinsmitglieder sichtbar." />
        : <div className="et-series-grid">{series.map(item=>{
          const nextEvent=nextBySeries.get(item.id)
          const nextIso=nextEvent ? effectiveDate(nextEvent) : null
          const internal=item.access_type === "club_internal"
          return <Link key={item.id} href={`/turniere/serien/${item.slug}`} className="et-series-card">
            <div className="et-series-art" style={{backgroundImage:`url('${imageUrl(item.image_path)}')`}}><TournamentStatus tone={internal ? "accent" : "success"}>{internal && <LockKeyhole size={12}/>} {internal ? "Vereinsintern" : "Öffentlich"}</TournamentStatus></div>
            <div className="et-series-body">
              <div><h2>{item.name}</h2>{item.description && <p className="line-clamp-2">{item.description}</p>}</div>
              <div className="et-facts"><TournamentFact label="Startgeld" icon={Coins}>{money(item.startgeld)}</TournamentFact><TournamentFact label="Mindestantritte" icon={Users}>{item.qualification_requirement || "Keine"}</TournamentFact></div>
              <div className="et-series-next"><TournamentFact label="Nächster Spieltag" icon={CalendarDays}>{nextIso ? new Date(nextIso).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Noch kein Termin"}</TournamentFact></div>
              {item.result_counting_mode === "best_n" && item.best_n_results ? <p>Beste {item.best_n_results} Ergebnisse zählen</p> : null}
              <span className="et-card-link">Serie ansehen <ArrowRight size={16}/></span>
            </div>
          </Link>
        })}</div>}
      </main><MobileBottomNav />
    </div>
  )
}

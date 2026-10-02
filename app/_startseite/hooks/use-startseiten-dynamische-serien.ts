"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type AccessType = "public" | "club_internal" | "club_external"

type SeriesRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_path: string | null
  is_active: boolean
  access_type: AccessType
  startgeld: number | null
  series_fee: number | null
  total_tournament_days: number | null
  registration_enabled: boolean | null
  registration_open_mode: string | null
  registration_open_time: string | null
  registration_close_mode: string | null
  registration_close_time: string | null
}

type EventRow = {
  id: string
  series_id: string
  title: string | null
  start_at: string
  rescheduled_at: string | null
  is_rescheduled: boolean | null
  location: string | null
  is_matchday: boolean | null
  registration_cutoff_minutes: number | null
}

export type StartseitenSerie = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string
  accessType: AccessType
  startgeld: number
  seriesFee: number
  totalTournamentDays: number | null
  registrationEnabled: boolean
  registrationOpen: boolean
  registrationCloseAt: string | null
  nextEvent: {
    id: string
    title: string
    startAt: string
    location: string | null
  } | null
}

function imageUrl(path: string | null) {
  if (!path) return "/terminal/hero-startscreen.png"
  return supabase.storage.from("tournament-photos").getPublicUrl(path).data.publicUrl
}

function effectiveIso(event: EventRow) {
  return event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function withTimeOnEventDay(eventDate: Date, time: string | null, fallback = "00:00") {
  const raw = (time || fallback).slice(0, 5)
  const [h, m] = raw.split(":").map((value) => Number(value || 0))
  const result = new Date(eventDate)
  result.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return result
}

function registrationState(series: SeriesRow, event: EventRow | null, now: Date) {
  if (!series.registration_enabled || !event) {
    return { open: false, closeAt: null as string | null }
  }

  const start = new Date(effectiveIso(event))
  if (!Number.isFinite(start.getTime())) {
    return { open: false, closeAt: null as string | null }
  }

  let close = new Date(start)
  if (series.registration_close_mode === "fixed_time") {
    close = withTimeOnEventDay(start, series.registration_close_time, "23:59")
  } else {
    const cutoff = Math.max(0, Number(event.registration_cutoff_minutes ?? 10))
    close = new Date(start.getTime() - cutoff * 60_000)
  }

  let opens = true
  if (series.registration_open_mode === "event_day") {
    opens = localDateKey(now) === localDateKey(start)
    if (opens) {
      const openAt = withTimeOnEventDay(start, series.registration_open_time, "00:00")
      opens = now.getTime() >= openAt.getTime()
    }
  }

  return {
    open: opens && now.getTime() < close.getTime(),
    closeAt: close.toISOString(),
  }
}

export function useStartseitenDynamischeSerien() {
  const [seriesItems, setSeriesItems] = useState<StartseitenSerie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData.user

        let isMember = false
        if (user?.id) {
          const { data: memberRow } = await supabase
            .from("club_players")
            .select("id")
            .eq("auth_user_id", user.id)
            .eq("is_active", true)
            .maybeSingle()
          isMember = Boolean(memberRow?.id)
        }

        const { data: seriesData, error: seriesError } = await supabase
          .from("dko_series")
          .select(
            "id,name,slug,description,image_path,is_active,access_type,startgeld,series_fee,total_tournament_days,registration_enabled,registration_open_mode,registration_open_time,registration_close_mode,registration_close_time",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        if (seriesError) throw seriesError

        const visibleSeries = ((seriesData || []) as SeriesRow[]).filter((item) => {
          if (item.access_type === "club_internal") return isMember
          return item.access_type === "public" || item.access_type === "club_external"
        })

        const ids = visibleSeries.map((item) => item.id)
        let events: EventRow[] = []

        if (ids.length > 0) {
          const { data: eventData, error: eventError } = await supabase
            .from("dko_series_events")
            .select(
              "id,series_id,title,start_at,rescheduled_at,is_rescheduled,location,is_matchday,registration_cutoff_minutes",
            )
            .in("series_id", ids)
            .eq("is_matchday", true)
            .order("start_at", { ascending: true })

          if (eventError) throw eventError
          events = (eventData || []) as EventRow[]
        }

        const now = new Date()
        const nextBySeries = new Map<string, EventRow>()

        for (const event of events) {
          const date = new Date(effectiveIso(event))
          if (!Number.isFinite(date.getTime()) || date.getTime() < now.getTime()) continue

          const current = nextBySeries.get(event.series_id)
          if (!current || date.getTime() < new Date(effectiveIso(current)).getTime()) {
            nextBySeries.set(event.series_id, event)
          }
        }

        const mapped = visibleSeries.map<StartseitenSerie>((series) => {
          const event = nextBySeries.get(series.id) || null
          const reg = registrationState(series, event, now)

          return {
            id: series.id,
            name: series.name,
            slug: series.slug,
            description: series.description,
            imageUrl: imageUrl(series.image_path),
            accessType: series.access_type,
            startgeld: Number(series.startgeld || 0),
            seriesFee: Number(series.series_fee || 0),
            totalTournamentDays: series.total_tournament_days,
            registrationEnabled: series.registration_enabled !== false,
            registrationOpen: reg.open,
            registrationCloseAt: reg.closeAt,
            nextEvent: event
              ? {
                  id: event.id,
                  title: event.title?.trim() || "Turniertag",
                  startAt: effectiveIso(event),
                  location: event.location,
                }
              : null,
          }
        })

        mapped.sort((a, b) => {
          const aTs = a.nextEvent ? new Date(a.nextEvent.startAt).getTime() : Number.MAX_SAFE_INTEGER
          const bTs = b.nextEvent ? new Date(b.nextEvent.startAt).getTime() : Number.MAX_SAFE_INTEGER
          return aTs - bTs || a.name.localeCompare(b.name, "de")
        })

        if (mounted) setSeriesItems(mapped)
      } catch (error) {
        console.error("Startseite Turnierserien konnten nicht geladen werden:", error)
        if (mounted) setSeriesItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel("homepage_dynamic_series")
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "dko_series_events" }, () => void load())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    seriesItems,
    liveRegistrationItems: seriesItems.filter((item) => item.registrationOpen),
    loading,
  }
}

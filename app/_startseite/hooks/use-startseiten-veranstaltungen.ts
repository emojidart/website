"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { CombinedEvent } from "@/app/_startseite/typen"

export function useStartseitenVeranstaltungen() {
  const [combinedEvents, setCombinedEvents] = useState<CombinedEvent[]>([])

  useEffect(() => {
    const fetchEventsAndTournaments = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const [tournamentsRes, eventsRes, dachRes] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .eq("event_type", "tournament")
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),

          supabase
            .from("events")
            .select("*")
            .neq("event_type", "tournament")
            .not("name", "ilike", "%LION%")
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),

          supabase
            .from("dach_events")
            .select("id,internal_event_id,name,event_type,event_date,start_date,end_date,event_time,location,details,photo_url,entry_fee,startgeld_details,max_participants,mode,event_status")
            .eq("event_type", "tournament")
            .in("event_status", ["approved"])
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .order("event_time", { ascending: true }),
        ])

        if (tournamentsRes.error) {
          console.error("Error fetching tournaments:", tournamentsRes.error)
        }
        if (eventsRes.error) {
          console.error("Error fetching events:", eventsRes.error)
        }
        if (dachRes.error) {
          console.error("Error fetching DACH tournaments:", dachRes.error)
        }

        const tournamentsData = tournamentsRes.data || []
        const eventsData = eventsRes.data || []
        const dachData = dachRes.data || []

        const combined: CombinedEvent[] = []

        tournamentsData.forEach((tournament: any) => {
          const linkedDachEvent = dachData.find(
            (event: any) =>
              event.internal_event_id &&
              String(event.internal_event_id) === String(tournament.id),
          )

          combined.push({
            id: tournament.id,
            name: tournament.name,
            date: tournament.start_date || tournament.event_date,
            start_date: tournament.start_date || tournament.event_date,
            end_date: tournament.end_date || tournament.event_date,
            time: tournament.event_time || "19:00",
            location: tournament.location || "Ort folgt",
            details: tournament.details ?? tournament.description ?? null,
            photo_url: tournament.photo_url,
            type: "tournament",
            entry_fee: tournament.entry_fee ?? null,
            startgeld_details: tournament.startgeld_details ?? null,
            max_participants: tournament.max_participants ?? null,
            mode: tournament.mode ?? null,
            sourceKind: "internal",
            internalEventId: tournament.id,
            dachEventId: linkedDachEvent?.id ?? null,
          })
        })

        dachData
          .filter(
            (event: any) =>
              !event.internal_event_id ||
              !tournamentsData.some(
                (t: any) => String(t.id) === String(event.internal_event_id),
              ),
          )
          .forEach((event: any) => {
            combined.push({
              id: event.id,
              name: event.name,
              date: event.start_date || event.event_date,
              start_date: event.start_date || event.event_date,
              end_date: event.end_date || event.event_date,
              time: event.event_time || "19:00",
              location: event.location || "Ort folgt",
              details: event.details ?? null,
              photo_url: event.photo_url,
              type: "tournament",
              entry_fee: event.entry_fee ?? null,
              startgeld_details: event.startgeld_details ?? null,
              max_participants: event.max_participants ?? null,
              mode: event.mode ?? null,
              sourceKind: "dach",
              internalEventId: event.internal_event_id ?? null,
              dachEventId: event.id,
            })
          })

        eventsData.forEach((event: any) => {
          combined.push({
            id: event.id,
            name: event.name,
            date: event.start_date || event.event_date,
            start_date: event.start_date || event.event_date,
            end_date: event.end_date || event.event_date,
            time: event.event_time || "19:00",
            location: event.location || "Wird bekannt gegeben",
            details: event.details ?? event.description ?? null,
            photo_url: event.photo_url,
            type: "event",
            eventType: event.event_type,
            max_participants: event.max_participants,
            sourceKind: "internal",
            internalEventId: event.id,
          })
        })

        combined.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`)
          const dateB = new Date(`${b.date}T${b.time}`)
          return dateA.getTime() - dateB.getTime()
        })

        setCombinedEvents(combined.slice(0, 12))
      } catch (error) {
        console.error("Error fetching events and tournaments:", error)
      }
    }

    fetchEventsAndTournaments()
  }, [])

  return { combinedEvents }
}

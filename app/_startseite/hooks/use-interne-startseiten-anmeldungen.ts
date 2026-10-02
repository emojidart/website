"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { InternalSignupEvent } from "@/app/_startseite/typen"

type UseInterneStartseitenAnmeldungenOptions = {
  membershipLoading: boolean
  canSeeInternalTournaments: boolean
}

export function useInterneStartseitenAnmeldungen({
  membershipLoading,
  canSeeInternalTournaments,
}: UseInterneStartseitenAnmeldungenOptions) {
  const [internalSignupEvents, setInternalSignupEvents] = useState<InternalSignupEvent[]>([])
  const [internalSignupLoading, setInternalSignupLoading] = useState(false)

  useEffect(() => {
    if (membershipLoading) return

    const loadInternalSignupEvents = async () => {
      if (!canSeeInternalTournaments) {
        setInternalSignupEvents([])
        return
      }

      try {
        setInternalSignupLoading(true)
        const today = new Date().toISOString().slice(0, 10)

        const { data, error } = await supabase
          .from("internal_tournament_events")
          .select("id,title,subtitle,event_date,end_date,date_open,start_time,location,image_url,image_path,max_participants,draft_enabled,draw_mode,draw_datetime,draw_location,draw_attendance_required")
          .eq("status", "published")
          .eq("show_on_homepage", true)
          .or(`date_open.eq.true,end_date.gte.${today},event_date.gte.${today}`)
          .order("event_date", { ascending: true, nullsFirst: false })
          .limit(2)

        if (error) throw error
        setInternalSignupEvents((data || []) as InternalSignupEvent[])
      } catch (error) {
        console.error("internal signup events load error:", error)
        setInternalSignupEvents([])
      } finally {
        setInternalSignupLoading(false)
      }
    }

    void loadInternalSignupEvents()
  }, [membershipLoading, canSeeInternalTournaments])

  return {
    internalSignupEvents,
    internalSignupLoading,
  }
}

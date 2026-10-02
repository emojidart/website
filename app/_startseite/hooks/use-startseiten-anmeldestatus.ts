"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type UseStartseitenAnmeldestatusOptions = {
  authUserId: string | null
  lionRegistrationActive: boolean
  lionEventId: string | null
  membersRegistrationActive: boolean
  membersEventId: string | null
}

export function useStartseitenAnmeldestatus({
  authUserId,
  lionRegistrationActive,
  lionEventId,
  membersRegistrationActive,
  membersEventId,
}: UseStartseitenAnmeldestatusOptions) {
  const [dkoRegistered, setDkoRegistered] = useState(false)
  const [dkoRegLoading, setDkoRegLoading] = useState(false)
  const [membersCupRegistered, setMembersCupRegistered] = useState(false)
  const [membersCupRegLoading, setMembersCupRegLoading] = useState(false)

  const fetchDkoRegStatus = async () => {
    setDkoRegLoading(true)
    setDkoRegistered(false)

    try {
      if (!lionRegistrationActive) return
      if (!lionEventId) return
      if (!authUserId) return

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("club_players(spieldatenbank_id)")
        .eq("user_id", authUserId)
        .single()

      if (profErr) throw profErr

      const clubPlayersRel: any = (profile as any)?.club_players
      const spieldatenbankId = Array.isArray(clubPlayersRel)
        ? clubPlayersRel?.[0]?.spieldatenbank_id
        : clubPlayersRel?.spieldatenbank_id

      if (!spieldatenbankId) return

      const pid = String(spieldatenbankId)

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("player_id", pid)
        .eq("event_id", lionEventId)
        .limit(1)

      if (regErr) throw regErr

      setDkoRegistered((reg?.length ?? 0) > 0)
    } catch (error) {
      console.error("DKO registration status error:", error)
    } finally {
      setDkoRegLoading(false)
    }
  }

  useEffect(() => {
    void fetchDkoRegStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, lionRegistrationActive, lionEventId])

  useEffect(() => {
    if (!authUserId || !lionRegistrationActive || !lionEventId) return

    const channel = supabase
      .channel("dko-registration-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_tournament_registration",
        },
        () => {
          void fetchDkoRegStatus()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, lionRegistrationActive, lionEventId])

  const fetchMembersCupRegStatus = async () => {
    setMembersCupRegLoading(true)
    setMembersCupRegistered(false)

    try {
      if (!membersRegistrationActive) return
      if (!membersEventId) return
      if (!authUserId) return

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("club_players(spieldatenbank_id)")
        .eq("user_id", authUserId)
        .single()

      if (profErr) throw profErr

      const clubPlayersRel: any = (profile as any)?.club_players
      const spieldatenbankId = Array.isArray(clubPlayersRel)
        ? clubPlayersRel?.[0]?.spieldatenbank_id
        : clubPlayersRel?.spieldatenbank_id

      if (!spieldatenbankId) return

      const pid = String(spieldatenbankId)

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("player_id", pid)
        .eq("event_id", membersEventId)
        .limit(1)

      if (regErr) throw regErr

      setMembersCupRegistered((reg?.length ?? 0) > 0)
    } catch (error) {
      console.error("Members Cup registration status error:", error)
    } finally {
      setMembersCupRegLoading(false)
    }
  }

  useEffect(() => {
    void fetchMembersCupRegStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, membersRegistrationActive, membersEventId])

  useEffect(() => {
    if (!authUserId || !membersRegistrationActive || !membersEventId) return

    const channel = supabase
      .channel("members-cup-registration-realtime-home")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dko_tournament_registration",
        },
        () => {
          void fetchMembersCupRegStatus()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, membersRegistrationActive, membersEventId])

  return {
    dkoRegistered,
    dkoRegLoading,
    setDkoRegistered,
    membersCupRegistered,
    membersCupRegLoading,
  }
}

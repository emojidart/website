"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { DkoSeriesEventRow, LionCupEvent } from "@/app/_startseite/typen"
import { startOfDay, toHHMM, toISODate } from "@/app/_startseite/utils"

export function useStartseitenTurnierserien() {
  const [cupPrizePool, setCupPrizePool] = useState<number>(0)
  const [summerPrizePool, setSummerPrizePool] = useState<number>(0)
  const [membersPrizePool, setMembersPrizePool] = useState<number>(0)

  const [nextEvent, setNextEvent] = useState<LionCupEvent | null>(null)
  const [nextTournamentEvent, setNextTournamentEvent] = useState<LionCupEvent | null>(null)
  const [lionCupLoading, setLionCupLoading] = useState(true)

  const [nextSummerTournamentEvent, setNextSummerTournamentEvent] = useState<LionCupEvent | null>(null)
  const [summerSpecialLoading, setSummerSpecialLoading] = useState(true)

  const [nextMembersChampionEvent, setNextMembersChampionEvent] = useState<LionCupEvent | null>(null)
  const [membersChampionLoading, setMembersChampionLoading] = useState(true)

  const [lionRegistrationEnabled, setLionRegistrationEnabled] = useState(false)
  const [summerRegistrationEnabled, setSummerRegistrationEnabled] = useState(false)
  const [membersRegistrationEnabled, setMembersRegistrationEnabled] = useState(false)

  useEffect(() => {
    const fetchCupData = async () => {
      try {
        const { data: activeSeries, error: seriesError } = await supabase
          .from("dko_series")
          .select("id")
          .eq("series_type", "lion_cup")
          .eq("is_active", true)
          .maybeSingle()

        if (seriesError) throw seriesError
        if (!activeSeries?.id) {
          setCupPrizePool(0)
          return
        }

        const { data, error } = await supabase
          .from("tournament_series_standings")
          .select("player_name,tournament_id")
          .eq("series_id", activeSeries.id)

        if (error) throw error

        const participants = new Set(
          (data || []).map((r: any) => String(r.player_name || "").trim()).filter(Boolean),
        )
        const appearances = new Set(
          (data || [])
            .filter((r: any) => r?.player_name && r?.tournament_id)
            .map((r: any) => `${String(r.player_name).trim()}:${String(r.tournament_id)}`),
        )

        const totalParticipants = participants.size
        const totalAppearances = appearances.size

        const seriesFees = totalParticipants * 10
        const tournamentFees = totalAppearances * 5

        let hostSponsoring = 0
        if (totalAppearances >= 501) hostSponsoring = 250
        else if (totalAppearances >= 500) hostSponsoring = 100

        setCupPrizePool(seriesFees + tournamentFees + hostSponsoring)
      } catch (error) {
        console.error("Error fetching cup data:", error)
        setCupPrizePool(0)
      }
    }

    fetchCupData()
  }, [])

  useEffect(() => {
    const fetchSummerPrizePool = async () => {
      try {
        const { data, error } = await supabase
          .from("summer_special_total_standings")
          .select("tournaments_played")

        if (error) throw error

        const totalParticipants = data?.length || 0
        const totalAppearances =
          data?.reduce(
            (sum: number, player: any) =>
              sum + Number(player.tournaments_played || 0),
            0,
          ) || 0

        const participationFees = totalParticipants * 10
        const tournamentFees = totalAppearances * 5
        const totalPrizePool = participationFees + tournamentFees

        setSummerPrizePool(totalPrizePool)
      } catch (error) {
        console.error("Error fetching Summer prize pool:", error)
        setSummerPrizePool(0)
      }
    }

    fetchSummerPrizePool()
  }, [])

  useEffect(() => {
    const fetchMembersPrizePool = async () => {
      try {
        const { data, error } = await supabase
          .from("members_cup_results")
          .select("round_robin_id, player_id")

        if (error) throw error

        const uniqueAppearances = new Set(
          (data || [])
            .filter((row: any) => row?.round_robin_id && row?.player_id)
            .map((row: any) => `${row.round_robin_id}:${row.player_id}`),
        )

        setMembersPrizePool(uniqueAppearances.size * 10)
      } catch (error) {
        console.error("Error fetching Members Champion prize pool:", error)
        setMembersPrizePool(0)
      }
    }

    fetchMembersPrizePool()
  }, [])

  useEffect(() => {
    const fetchFromDb = async () => {
      try {
        setLionCupLoading(true)

        const { data: activeLionSeries, error: seriesErr } = await supabase
          .from("dko_series")
          .select("id,name,startgeld,is_active,registration_enabled")
          .eq("series_type", "lion_cup")
          .eq("is_active", true)
          .maybeSingle()

        if (seriesErr) throw seriesErr

        if (!activeLionSeries?.id) {
          setLionRegistrationEnabled(false)
          setNextEvent(null)
          setNextTournamentEvent(null)
          return
        }

        setLionRegistrationEnabled(Boolean(activeLionSeries.registration_enabled))

        const LION_SERIES_ID = String(activeLionSeries.id)

        const { data, error } = await supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
          .eq("series_id", LION_SERIES_ID)
          .order("start_at", { ascending: true })

        if (error) throw error

        const lionEvents = ((data || []) as DkoSeriesEventRow[]).map((r) => {
          const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
          const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
          const effectiveDT = new Date(effectiveIso)
          const originalDT = new Date(r.start_at)
          const cutoffMinutes = Number(r.registration_cutoff_minutes ?? 10) || 10

          return {
            id: r.id,
            series_id: r.series_id,
            title: r.title,
            is_matchday: !!r.is_matchday,
            cutoffMinutes,
            originalDT,
            effectiveDT,
            effectiveISODate: toISODate(effectiveDT),
            effectiveTimeHHMM: toHHMM(effectiveDT),
          }
        })

        const today0 = startOfDay(new Date()).getTime()

        const lionUpcoming = lionEvents
          .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        if (lionUpcoming.length > 0) {
          const first = lionUpcoming[0]
          setNextEvent({
            id: first.id,
            name: "EMD LION CUP",
            event_date: first.effectiveISODate,
            event_time: first.effectiveTimeHHMM,
            event_type: first.is_matchday ? "Turnier" : "Spielfrei",
            description: null,
          })
        } else {
          setNextEvent(null)
        }

        const lionNextMatchday = lionUpcoming.find((e) => e.is_matchday) ?? null

        if (lionNextMatchday) {
          const allMatchdaysSorted = lionEvents
            .filter((e) => e.is_matchday)
            .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

          const idx = allMatchdaysSorted.findIndex((e) => e.id === lionNextMatchday.id)
          const matchday = idx >= 0 ? idx + 1 : 1

          setNextTournamentEvent({
            id: lionNextMatchday.id,
            name: "EMD LION CUP",
            event_date: lionNextMatchday.effectiveISODate,
            event_time: lionNextMatchday.effectiveTimeHHMM,
            event_type: "Turnier",
            matchday,
            description: null,
          })
        } else {
          setNextTournamentEvent(null)
        }
      } catch (error) {
        console.error("Error fetching DKO schedules from DB:", error)
        setLionRegistrationEnabled(false)
        setNextEvent(null)
        setNextTournamentEvent(null)
      } finally {
        setLionCupLoading(false)
      }
    }

    fetchFromDb()
  }, [])

  useEffect(() => {
    const fetchSummerSpecialFromDb = async () => {
      try {
        setSummerSpecialLoading(true)

        const SUMMER_SPECIAL_SERIES_ID = "ff1badbe-0d2c-4bd2-a877-9f1009579599"

        const { data: summerSeries, error: summerSeriesError } = await supabase
          .from("dko_series")
          .select("id,is_active,registration_enabled")
          .eq("id", SUMMER_SPECIAL_SERIES_ID)
          .maybeSingle()

        if (summerSeriesError) throw summerSeriesError

        const summerEnabled = Boolean(summerSeries?.is_active && summerSeries?.registration_enabled)
        setSummerRegistrationEnabled(summerEnabled)

        if (!summerSeries?.is_active) {
          setNextSummerTournamentEvent(null)
          return
        }

        const { data, error } = await supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
          .eq("series_id", SUMMER_SPECIAL_SERIES_ID)
          .order("start_at", { ascending: true })

        if (error) throw error

        const summerEvents = ((data || []) as DkoSeriesEventRow[]).map((r) => {
          const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
          const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
          const effectiveDT = new Date(effectiveIso)

          return {
            id: r.id,
            series_id: r.series_id,
            title: r.title,
            is_matchday: !!r.is_matchday,
            cutoffMinutes: Number(r.registration_cutoff_minutes ?? 10) || 10,
            originalDT: new Date(r.start_at),
            effectiveDT,
            effectiveISODate: toISODate(effectiveDT),
            effectiveTimeHHMM: toHHMM(effectiveDT),
          }
        })

        const today0 = startOfDay(new Date()).getTime()

        const summerUpcoming = summerEvents
          .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        const summerNextMatchday = summerUpcoming.find((e) => e.is_matchday) ?? null

        if (summerNextMatchday) {
          const allMatchdaysSorted = summerEvents
            .filter((e) => e.is_matchday)
            .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

          const idx = allMatchdaysSorted.findIndex((e) => e.id === summerNextMatchday.id)
          const matchday = idx >= 0 ? idx + 1 : 1

          setNextSummerTournamentEvent({
            id: summerNextMatchday.id,
            name: "EMD Summer Special | Steeldart",
            event_date: summerNextMatchday.effectiveISODate,
            event_time: summerNextMatchday.effectiveTimeHHMM,
            event_type: "Turnier",
            matchday,
            description: null,
          })
        } else {
          setNextSummerTournamentEvent(null)
        }
      } catch (error) {
        console.error("Error fetching Summer Special schedule from DB:", error)
        setSummerRegistrationEnabled(false)
        setNextSummerTournamentEvent(null)
      } finally {
        setSummerSpecialLoading(false)
      }
    }

    fetchSummerSpecialFromDb()
  }, [])

  useEffect(() => {
    const fetchMembersChampionFromDb = async () => {
      try {
        setMembersChampionLoading(true)

        const MEMBERS_CHAMPION_SERIES_ID = "baeef5fb-b386-4a75-a1f3-c56090a0ec76"

        const { data: membersSeries, error: membersSeriesError } = await supabase
          .from("dko_series")
          .select("id,is_active,registration_enabled")
          .eq("id", MEMBERS_CHAMPION_SERIES_ID)
          .maybeSingle()

        if (membersSeriesError) throw membersSeriesError

        const membersEnabled = Boolean(membersSeries?.is_active && membersSeries?.registration_enabled)
        setMembersRegistrationEnabled(membersEnabled)

        if (!membersSeries?.is_active) {
          setNextMembersChampionEvent(null)
          return
        }

        const { data, error } = await supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
          .eq("series_id", MEMBERS_CHAMPION_SERIES_ID)
          .order("start_at", { ascending: true })

        if (error) throw error

        const events = ((data || []) as DkoSeriesEventRow[]).map((r) => {
          const isRescheduled = !!r.is_rescheduled && !!r.rescheduled_at
          const effectiveIso = isRescheduled && r.rescheduled_at ? r.rescheduled_at : r.start_at
          const effectiveDT = new Date(effectiveIso)

          return {
            id: r.id,
            series_id: r.series_id,
            title: r.title,
            is_matchday: !!r.is_matchday,
            cutoffMinutes: Number(r.registration_cutoff_minutes ?? 10) || 10,
            originalDT: new Date(r.start_at),
            effectiveDT,
            effectiveISODate: toISODate(effectiveDT),
            effectiveTimeHHMM: toHHMM(effectiveDT),
          }
        })

        const today0 = startOfDay(new Date()).getTime()

        const upcoming = events
          .filter((e) => startOfDay(e.effectiveDT).getTime() >= today0)
          .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

        const nextMatchday = upcoming.find((e) => e.is_matchday) ?? null

        if (nextMatchday) {
          const allMatchdaysSorted = events
            .filter((e) => e.is_matchday)
            .sort((a, b) => a.effectiveDT.getTime() - b.effectiveDT.getTime())

          const idx = allMatchdaysSorted.findIndex((e) => e.id === nextMatchday.id)
          const matchday = idx >= 0 ? idx + 1 : 1

          setNextMembersChampionEvent({
            id: nextMatchday.id,
            name: "EMD Members Champions Cup",
            event_date: nextMatchday.effectiveISODate,
            event_time: nextMatchday.effectiveTimeHHMM,
            event_type: "Turnier",
            matchday,
            description: null,
          })
        } else {
          setNextMembersChampionEvent(null)
        }
      } catch (error) {
        console.error("Error fetching Members Champions Cup schedule from DB:", error)
        setMembersRegistrationEnabled(false)
        setNextMembersChampionEvent(null)
      } finally {
        setMembersChampionLoading(false)
      }
    }

    fetchMembersChampionFromDb()
  }, [])

  return {
    cupPrizePool,
    summerPrizePool,
    membersPrizePool,
    nextEvent,
    nextTournamentEvent,
    lionCupLoading,
    nextSummerTournamentEvent,
    summerSpecialLoading,
    nextMembersChampionEvent,
    membersChampionLoading,
    lionRegistrationEnabled,
    summerRegistrationEnabled,
    membersRegistrationEnabled,
  }
}

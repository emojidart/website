"use client"

import { useMemo } from "react"
import type { CombinedEvent, LionCupEvent } from "@/app/_startseite/typen"
import {
  ensureUhr,
  formatGermanShortDateFromISO,
  getStartDateTimeFromISO,
} from "@/app/_startseite/utils"

type UseStartseitenTurnierTimingOptions = {
  combinedEvents: CombinedEvent[]
  nextEvent: LionCupEvent | null
  nextTournamentEvent: LionCupEvent | null
  nextSummerTournamentEvent: LionCupEvent | null
  nextMembersChampionEvent: LionCupEvent | null
  lionRegistrationEnabled: boolean
  summerRegistrationEnabled: boolean
  membersRegistrationEnabled: boolean
  nowTick: number
}

export function useStartseitenTurnierTiming({
  combinedEvents,
  nextEvent,
  nextTournamentEvent,
  nextSummerTournamentEvent,
  nextMembersChampionEvent,
  lionRegistrationEnabled,
  summerRegistrationEnabled,
  membersRegistrationEnabled,
  nowTick,
}: UseStartseitenTurnierTimingOptions) {
  const createEventDate = (event: LionCupEvent | null) => {
    if (!event) return new Date("2025-11-15T19:00:00")
    const time = event.event_time || "19:00:00"
    return new Date(`${event.event_date}T${time}`)
  }

  const lionCupNextDate = createEventDate(nextTournamentEvent)
  const summerSpecialNextDate = createEventDate(nextSummerTournamentEvent)
  const membersChampionNextDate = createEventDate(nextMembersChampionEvent)
  const isNextEventSpielfrei = nextEvent?.event_type?.toLowerCase() === "spielfrei"

  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const todaysEvents = useMemo(() => {
    return combinedEvents.filter((event) => {
      const start = event.start_date || event.date
      const end = event.end_date || event.date

      if (!start || !end) return false

      return todayISO >= start && todayISO <= end
    })
  }, [combinedEvents, todayISO])

  const liveSelfRegEvent = useMemo(() => {
    const lionToday =
      lionRegistrationEnabled &&
      nextTournamentEvent &&
      nextTournamentEvent.event_type?.toLowerCase() === "turnier" &&
      nextTournamentEvent.event_date === todayISO

    if (lionToday) {
      return {
        title: "Anmeldung geöffnet • LION CUP",
        isoDate: nextTournamentEvent.event_date,
        time: nextTournamentEvent.event_time || "19:30",
      }
    }

    return null
  }, [lionRegistrationEnabled, nextTournamentEvent, todayISO])

  const liveStartDT = liveSelfRegEvent
    ? getStartDateTimeFromISO(liveSelfRegEvent.isoDate, liveSelfRegEvent.time)
    : null

  const liveCutoffDT = liveStartDT
    ? new Date(liveStartDT.getTime() - 10 * 60 * 1000)
    : null

  const liveSecondsLeft = liveCutoffDT
    ? Math.ceil((liveCutoffDT.getTime() - nowTick) / 1000)
    : null

  const liveRegOpen =
    liveSelfRegEvent && (liveSecondsLeft ?? 0) > 0

  const liveDateLabel = liveSelfRegEvent
    ? formatGermanShortDateFromISO(liveSelfRegEvent.isoDate)
    : ""

  const liveTimeLabel = liveSelfRegEvent
    ? ensureUhr(liveSelfRegEvent.time)
    : ""

  const liveMembersSelfRegEvent = useMemo(() => {
    const membersToday =
      membersRegistrationEnabled &&
      nextMembersChampionEvent &&
      nextMembersChampionEvent.event_type?.toLowerCase() === "turnier" &&
      nextMembersChampionEvent.event_date === todayISO

    if (membersToday) {
      return {
        title: "Anmeldung geöffnet • MEMBERS CHAMPIONS CUP",
        isoDate: nextMembersChampionEvent.event_date,
        time: nextMembersChampionEvent.event_time || "19:30",
      }
    }

    return null
  }, [membersRegistrationEnabled, nextMembersChampionEvent, todayISO])

  const liveMembersRegCloseDT = liveMembersSelfRegEvent
    ? new Date(`${liveMembersSelfRegEvent.isoDate}T17:00:00`)
    : null

  const liveMembersUnregCloseDT = liveMembersSelfRegEvent
    ? new Date(`${liveMembersSelfRegEvent.isoDate}T14:00:00`)
    : null

  const liveMembersSecondsLeft = liveMembersRegCloseDT
    ? Math.ceil((liveMembersRegCloseDT.getTime() - nowTick) / 1000)
    : null

  const liveMembersUnregSecondsLeft = liveMembersUnregCloseDT
    ? Math.ceil((liveMembersUnregCloseDT.getTime() - nowTick) / 1000)
    : null

  const liveMembersRegOpen =
    liveMembersSelfRegEvent && (liveMembersSecondsLeft ?? 0) > 0

  const liveMembersUnregOpen =
    liveMembersSelfRegEvent && (liveMembersUnregSecondsLeft ?? 0) > 0

  const liveMembersDateLabel = liveMembersSelfRegEvent
    ? formatGermanShortDateFromISO(liveMembersSelfRegEvent.isoDate)
    : ""

  const liveMembersTimeLabel = liveMembersSelfRegEvent
    ? ensureUhr(liveMembersSelfRegEvent.time)
    : ""

  const liveSummerSelfRegEvent = useMemo(() => {
    const summerToday =
      summerRegistrationEnabled &&
      nextSummerTournamentEvent &&
      nextSummerTournamentEvent.event_type?.toLowerCase() === "turnier" &&
      nextSummerTournamentEvent.event_date === todayISO

    if (summerToday) {
      return {
        title: "Anmeldung geöffnet • SUMMER SPECIAL",
        isoDate: nextSummerTournamentEvent.event_date,
        time: nextSummerTournamentEvent.event_time || "19:00",
      }
    }

    return null
  }, [summerRegistrationEnabled, nextSummerTournamentEvent, todayISO])

  const liveSummerStartDT = liveSummerSelfRegEvent
    ? getStartDateTimeFromISO(
        liveSummerSelfRegEvent.isoDate,
        liveSummerSelfRegEvent.time,
      )
    : null

  const liveSummerRegCloseDT = liveSummerStartDT
    ? new Date(liveSummerStartDT.getTime() - 10 * 60 * 1000)
    : null

  const liveSummerSecondsLeft = liveSummerRegCloseDT
    ? Math.ceil((liveSummerRegCloseDT.getTime() - nowTick) / 1000)
    : null

  const liveSummerRegOpen =
    liveSummerSelfRegEvent && (liveSummerSecondsLeft ?? 0) > 0

  const liveSummerDateLabel = liveSummerSelfRegEvent
    ? formatGermanShortDateFromISO(liveSummerSelfRegEvent.isoDate)
    : ""

  const liveSummerTimeLabel = liveSummerSelfRegEvent
    ? ensureUhr(liveSummerSelfRegEvent.time)
    : ""

  return {
    lionCupNextDate,
    summerSpecialNextDate,
    membersChampionNextDate,
    isNextEventSpielfrei,
    todayISO,
    todaysEvents,
    liveSelfRegEvent,
    liveStartDT,
    liveCutoffDT,
    liveSecondsLeft,
    liveRegOpen,
    liveDateLabel,
    liveTimeLabel,
    liveMembersSelfRegEvent,
    liveMembersRegCloseDT,
    liveMembersUnregCloseDT,
    liveMembersSecondsLeft,
    liveMembersUnregSecondsLeft,
    liveMembersRegOpen,
    liveMembersUnregOpen,
    liveMembersDateLabel,
    liveMembersTimeLabel,
    liveSummerSelfRegEvent,
    liveSummerStartDT,
    liveSummerRegCloseDT,
    liveSummerSecondsLeft,
    liveSummerRegOpen,
    liveSummerDateLabel,
    liveSummerTimeLabel,
  }
}

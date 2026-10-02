"use client"

import { useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import {
  loadCentralEventForSetup,
  syncCentralEventRegistrations,
} from "./einzelturnier-central-event"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

type TournamentMode = "dko" | "round_robin"

type ErrorModalState = {
  open: boolean
  message?: string
}

type Options = {
  centralEventId: string | null
  centralMode: string | null
  centralTeamMode?: string | null
  setLoading: Dispatch<SetStateAction<boolean>>
  setTournamentName: Dispatch<SetStateAction<string>>
  setTournamentEntryFee: Dispatch<SetStateAction<string>>
  setTournamentAccessType: Dispatch<SetStateAction<TournamentAccessType>>
  setTournamentMode: Dispatch<SetStateAction<TournamentMode>>
  fetchRegisteredPlayers: () => Promise<void>
  setShowErrorModal: Dispatch<SetStateAction<ErrorModalState>>
}

export function useEinzelturnierCentralEventSetup(options: Options) {
  const {
    centralEventId,
    centralMode,
    centralTeamMode,
    setLoading,
    setTournamentName,
    setTournamentEntryFee,
    setTournamentAccessType,
    setTournamentMode,
    fetchRegisteredPlayers,
    setShowErrorModal,
  } = options

  useEffect(() => {
    if (!centralEventId) return

    let cancelled = false

    const prepareCentralEvent = async () => {
      try {
        setLoading(true)

        const central = await loadCentralEventForSetup(centralEventId)
        if (cancelled) return

        const resolvedMode: TournamentMode =
          centralMode === "round_robin" || central.event.selected_mode === "round_robin"
            ? "round_robin"
            : "dko"

        setTournamentName(central.event.title || "")
        setTournamentEntryFee(String(central.event.entry_fee ?? 0))
        setTournamentAccessType(
          (central.event.access_type || "club_internal") as TournamentAccessType,
        )
        setTournamentMode(resolvedMode)

        await syncCentralEventRegistrations({
          centralEventId,
          event: central.event,
          registrations: central.registrations,
          teamMode:
            centralTeamMode === "fixed" || centralTeamMode === "drawn"
              ? centralTeamMode
              : "single",
          tournamentMode: resolvedMode,
        })

        if (!cancelled) {
          await fetchRegisteredPlayers()
        }
      } catch (error: any) {
        console.error(
          "Zentrale Anmeldung konnte nicht in DKO/Round Robin übernommen werden:",
          error,
        )

        if (!cancelled) {
          setShowErrorModal({
            open: true,
            message:
              error?.message ||
              "Zentrale Anmeldung konnte nicht in DKO/Round Robin übernommen werden.",
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void prepareCentralEvent()

    return () => {
      cancelled = true
    }

    // centralEventId/team mode bestimmen den Import der Teilnehmer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centralEventId, centralTeamMode])
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export type MembershipModuleCode =
  | "base_membership"
  | "premium_app"
  | "edart_league"
  | "steeldart_league"
  | "internal_tournaments"
  | "external_tournaments"
  | "external_events"
  | "club_events"

export type MembershipTrialAccess = {
  id: string
  module_code: MembershipModuleCode
  starts_on: string
  ends_on: string
  status: string
  note: string | null
}

type MembershipAccessState = {
  loading: boolean
  error: string | null
  playerId: string | null
  membershipId: string | null
  membershipStatus: string | null
  endsOn: string | null

  // Gesamtzugriff = bezahlt ODER gültiger Test
  moduleCodes: MembershipModuleCode[]

  // Zur Anzeige/Diagnose getrennt:
  paidModuleCodes: MembershipModuleCode[]
  trialModuleCodes: MembershipModuleCode[]
  activeTrials: MembershipTrialAccess[]
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function useMembershipAccess() {
  const [state, setState] = useState<MembershipAccessState>({
    loading: true,
    error: null,
    playerId: null,
    membershipId: null,
    membershipStatus: null,
    endsOn: null,
    moduleCodes: [],
    paidModuleCodes: [],
    trialModuleCodes: [],
    activeTrials: [],
  })

  const loadAccess = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.warn("membership access session load warning:", sessionError)
      }

      const user = session?.user ?? null

      if (!user) {
        setState({
          loading: false,
          error: null,
          playerId: null,
          membershipId: null,
          membershipStatus: null,
          endsOn: null,
          moduleCodes: [],
          paidModuleCodes: [],
          trialModuleCodes: [],
          activeTrials: [],
        })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const playerId = profile?.player_id || null

      if (!playerId) {
        setState({
          loading: false,
          error: "Dein Benutzerkonto ist keinem Vereinsmitglied zugeordnet.",
          playerId: null,
          membershipId: null,
          membershipStatus: null,
          endsOn: null,
          moduleCodes: [],
          paidModuleCodes: [],
          trialModuleCodes: [],
          activeTrials: [],
        })
        return
      }

      const today = todayISO()

      const [
        { data: memberships, error: membershipError },
        { data: trials, error: trialsError },
      ] = await Promise.all([
        supabase
          .from("member_memberships")
          .select("id,status,starts_on,ends_on,created_at")
          .eq("player_id", playerId)
          .eq("status", "active")
          .lte("starts_on", today)
          .order("created_at", { ascending: false }),

        supabase
          .from("membership_trials")
          .select("id,module_code,starts_on,ends_on,status,note")
          .eq("player_id", playerId)
          .eq("status", "active")
          .lte("starts_on", today)
          .gte("ends_on", today)
          .order("ends_on", { ascending: true }),
      ])

      if (membershipError) throw membershipError
      if (trialsError) throw trialsError

      const activeMembership =
        (memberships || []).find(
          (membership: any) =>
            !membership.ends_on || String(membership.ends_on) >= today,
        ) || null

      let paidModuleCodes: MembershipModuleCode[] = []

      if (activeMembership) {
        const { data: membershipModuleRows, error: moduleRowsError } =
          await supabase
            .from("member_membership_modules")
            .select(`
              module_id,
              membership_modules (
                code,
                is_active
              )
            `)
            .eq("membership_id", activeMembership.id)

        if (moduleRowsError) throw moduleRowsError

        paidModuleCodes = (membershipModuleRows || [])
          .map((row: any) => row.membership_modules)
          .filter((module: any) => module?.is_active && module?.code)
          .map((module: any) => module.code as MembershipModuleCode)
      }

      const activeTrials = ((trials || []) as any[]).map((trial) => ({
        id: trial.id,
        module_code: trial.module_code as MembershipModuleCode,
        starts_on: trial.starts_on,
        ends_on: trial.ends_on,
        status: trial.status,
        note: trial.note ?? null,
      })) as MembershipTrialAccess[]

      const trialModuleCodes = Array.from(
        new Set(activeTrials.map((trial) => trial.module_code)),
      )

      // Wichtig: Test und bezahlt werden für den Zugriff zusammengeführt.
      const moduleCodes = Array.from(
        new Set([...paidModuleCodes, ...trialModuleCodes]),
      ) as MembershipModuleCode[]

      setState({
        loading: false,
        error: null,
        playerId,
        membershipId: activeMembership?.id || null,
        membershipStatus: activeMembership?.status || null,
        endsOn: activeMembership?.ends_on || null,
        moduleCodes,
        paidModuleCodes,
        trialModuleCodes,
        activeTrials,
      })
    } catch (error: any) {
      const missingSession =
        error?.name === "AuthSessionMissingError" ||
        String(error?.message || "").toLowerCase().includes("auth session missing")

      if (missingSession) {
        setState({
          loading: false,
          error: null,
          playerId: null,
          membershipId: null,
          membershipStatus: null,
          endsOn: null,
          moduleCodes: [],
          paidModuleCodes: [],
          trialModuleCodes: [],
          activeTrials: [],
        })
        return
      }

      console.error("membership access load error:", error)

      setState({
        loading: false,
        error: error?.message || "Mitgliedschaft konnte nicht geprüft werden.",
        playerId: null,
        membershipId: null,
        membershipStatus: null,
        endsOn: null,
        moduleCodes: [],
        paidModuleCodes: [],
        trialModuleCodes: [],
        activeTrials: [],
      })
    }
  }, [])

  useEffect(() => {
    void loadAccess()
  }, [loadAccess])

  const moduleSet = useMemo(
    () => new Set<MembershipModuleCode>(state.moduleCodes),
    [state.moduleCodes],
  )

  const paidModuleSet = useMemo(
    () => new Set<MembershipModuleCode>(state.paidModuleCodes),
    [state.paidModuleCodes],
  )

  const trialModuleSet = useMemo(
    () => new Set<MembershipModuleCode>(state.trialModuleCodes),
    [state.trialModuleCodes],
  )

  const hasModule = useCallback(
    (code: MembershipModuleCode) => moduleSet.has(code),
    [moduleSet],
  )

  const hasPaidModule = useCallback(
    (code: MembershipModuleCode) => paidModuleSet.has(code),
    [paidModuleSet],
  )

  const hasTrialModule = useCallback(
    (code: MembershipModuleCode) => trialModuleSet.has(code),
    [trialModuleSet],
  )

  const hasAllModules = useCallback(
    (codes: MembershipModuleCode[]) =>
      codes.every((code) => moduleSet.has(code)),
    [moduleSet],
  )

  const hasAnyModule = useCallback(
    (codes: MembershipModuleCode[]) =>
      codes.some((code) => moduleSet.has(code)),
    [moduleSet],
  )

  const getTrialForModule = useCallback(
    (code: MembershipModuleCode) =>
      state.activeTrials.find((trial) => trial.module_code === code) || null,
    [state.activeTrials],
  )

  return {
    ...state,

    // Eine gültige Test-Grundmitgliedschaft öffnet dieselben geschützten
    // Mitgliederbereiche wie eine bezahlte Grundmitgliedschaft.
    hasMembership: moduleSet.has("base_membership"),
    hasPaidMembership: !!state.membershipId,

    hasModule,
    hasPaidModule,
    hasTrialModule,
    hasAllModules,
    hasAnyModule,
    getTrialForModule,
    refreshMembershipAccess: loadAccess,
  }
}

import { supabase } from "@/lib/supabase"

export type TournamentAccessType = "" | "public" | "club_internal" | "club_external"

export type PlayerEligibility = {
  eligible: boolean
  reason: string
}

function requiredModuleForAccessType(
  accessType: TournamentAccessType,
): "internal_tournaments" | "external_tournaments" | null {
  if (accessType === "club_internal") return "internal_tournaments"
  if (accessType === "club_external") return "external_tournaments"
  return null
}

export function accessTypeLabel(accessType: TournamentAccessType) {
  if (accessType === "public") return "Öffentlich"
  if (accessType === "club_internal") return "Vereinsintern"
  if (accessType === "club_external") return "Vereins-Auswärts"
  return "Nicht gewählt"
}

export function getPlayerEligibilityFromMap(opts: {
  playerId: number | string
  accessType: TournamentAccessType
  eligibilityByPlayerId: Record<string, PlayerEligibility>
  eligibilityLoading: boolean
}): PlayerEligibility {
  const { playerId, accessType, eligibilityByPlayerId, eligibilityLoading } = opts

  if (!accessType) {
    return { eligible: false, reason: "Zuerst Turnierart auswählen" }
  }

  if (accessType === "public") {
    return { eligible: true, reason: "" }
  }

  return (
    eligibilityByPlayerId[String(playerId)] || {
      eligible: false,
      reason: eligibilityLoading ? "Berechtigung wird geprüft…" : "Nicht teilnahmeberechtigt",
    }
  )
}

export async function verifyPlayerEligibility(
  playerId: number | string,
  accessType: TournamentAccessType,
): Promise<PlayerEligibility> {
  if (!accessType) {
    return { eligible: false, reason: "Bitte zuerst die Turnierart festlegen." }
  }

  if (accessType === "public") {
    return { eligible: true, reason: "" }
  }

  const requiredModule = requiredModuleForAccessType(accessType)
  if (!requiredModule) return { eligible: true, reason: "" }

  const today = new Date().toISOString().split("T")[0]

  const { data: clubPlayer, error: clubPlayerError } = await supabase
    .from("club_players")
    .select("id")
    .eq("spieldatenbank_id", playerId)
    .maybeSingle()

  if (clubPlayerError) throw clubPlayerError
  if (!clubPlayer?.id) {
    return { eligible: false, reason: "Nur für Vereinsmitglieder" }
  }

  const { data: trialRows, error: trialError } = await supabase
    .from("membership_trials")
    .select("id")
    .eq("player_id", clubPlayer.id)
    .eq("module_code", requiredModule)
    .eq("status", "active")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1)

  if (trialError) throw trialError
  if ((trialRows || []).length > 0) return { eligible: true, reason: "" }

  const { data: memberships, error: membershipError } = await supabase
    .from("member_memberships")
    .select("id")
    .eq("player_id", clubPlayer.id)
    .eq("status", "active")
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`)

  if (membershipError) throw membershipError

  const membershipIds = (memberships || []).map((row: any) => row.id).filter(Boolean)
  if (membershipIds.length === 0) {
    return { eligible: false, reason: "Keine aktive Mitgliedschaft" }
  }

  const { data: moduleRow, error: moduleError } = await supabase
    .from("membership_modules")
    .select("id")
    .eq("code", requiredModule)
    .maybeSingle()

  if (moduleError) throw moduleError
  if (!moduleRow?.id) {
    return { eligible: false, reason: "Benötigtes Turnierpaket nicht gefunden" }
  }

  const { data: membershipModules, error: membershipModuleError } = await supabase
    .from("member_membership_modules")
    .select("membership_id")
    .in("membership_id", membershipIds)
    .eq("module_id", moduleRow.id)
    .limit(1)

  if (membershipModuleError) throw membershipModuleError

  if ((membershipModules || []).length > 0) {
    return { eligible: true, reason: "" }
  }

  return {
    eligible: false,
    reason:
      accessType === "club_internal"
        ? "Paket „Interne Turniere“ fehlt"
        : "Paket „Externe Turniere“ fehlt",
  }
}

export async function loadEligibilityMapData(
  accessType: TournamentAccessType,
): Promise<Record<string, PlayerEligibility>> {
  if (!accessType || accessType === "public") return {}

  const requiredModule = requiredModuleForAccessType(accessType)
  if (!requiredModule) return {}

  const today = new Date().toISOString().split("T")[0]

  const { data: clubPlayers, error: clubPlayersError } = await supabase
    .from("club_players")
    .select("id,spieldatenbank_id")
    .not("spieldatenbank_id", "is", null)

  if (clubPlayersError) throw clubPlayersError

  const clubPlayerIds = (clubPlayers || []).map((row: any) => row.id).filter(Boolean)

  const [{ data: moduleRow, error: moduleError }, membershipsResult, trialsResult] = await Promise.all([
    supabase.from("membership_modules").select("id").eq("code", requiredModule).maybeSingle(),
    clubPlayerIds.length
      ? supabase
          .from("member_memberships")
          .select("id,player_id")
          .in("player_id", clubPlayerIds)
          .eq("status", "active")
          .lte("starts_on", today)
          .or(`ends_on.is.null,ends_on.gte.${today}`)
      : Promise.resolve({ data: [], error: null } as any),
    clubPlayerIds.length
      ? supabase
          .from("membership_trials")
          .select("player_id")
          .in("player_id", clubPlayerIds)
          .eq("module_code", requiredModule)
          .eq("status", "active")
          .lte("starts_on", today)
          .gte("ends_on", today)
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (moduleError) throw moduleError
  if (membershipsResult.error) throw membershipsResult.error
  if (trialsResult.error) throw trialsResult.error

  const membershipIds = (membershipsResult.data || []).map((row: any) => row.id).filter(Boolean)

  const membershipModulesResult =
    moduleRow?.id && membershipIds.length
      ? await supabase
          .from("member_membership_modules")
          .select("membership_id")
          .in("membership_id", membershipIds)
          .eq("module_id", moduleRow.id)
      : ({ data: [], error: null } as any)

  if (membershipModulesResult.error) throw membershipModulesResult.error

  const eligibleMembershipIds = new Set(
    (membershipModulesResult.data || []).map((row: any) => String(row.membership_id)),
  )
  const eligiblePlayerIds = new Set<string>()

  ;(membershipsResult.data || []).forEach((row: any) => {
    if (eligibleMembershipIds.has(String(row.id))) {
      eligiblePlayerIds.add(String(row.player_id))
    }
  })

  ;(trialsResult.data || []).forEach((row: any) => {
    eligiblePlayerIds.add(String(row.player_id))
  })

  const nextMap: Record<string, PlayerEligibility> = {}

  ;(clubPlayers || []).forEach((clubPlayer: any) => {
    if (clubPlayer.spieldatenbank_id === null || clubPlayer.spieldatenbank_id === undefined) return

    nextMap[String(clubPlayer.spieldatenbank_id)] = eligiblePlayerIds.has(String(clubPlayer.id))
      ? { eligible: true, reason: "" }
      : {
          eligible: false,
          reason:
            accessType === "club_internal"
              ? "Paket „Interne Turniere“ fehlt"
              : "Paket „Externe Turniere“ fehlt",
        }
  })

  return nextMap
}

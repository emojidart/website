import { supabase } from "@/lib/supabase"

export type SeriesScoringRuntime = {
  id: string
  seriesType: string
  placementMode: "fixed" | "dynamic"
  dynamicLastPlacePoints: number
  dynamicStepPoints: number
  legsScoringActive: boolean
  legsPointsPerWin: number
  undefeatedWinnerBonusActive: boolean
  undefeatedWinnerBonusPoints: number
  pointRules: Array<{ place_from: number; place_to: number; points: number }>
}

export async function loadSeriesScoringRuntime(seriesId?: string | null): Promise<SeriesScoringRuntime | null> {
  if (!seriesId) return null

  const { data: series, error: seriesError } = await supabase
    .from("dko_series")
    .select(
      "id,series_type,placement_scoring_mode,dynamic_last_place_points,dynamic_step_points,legs_scoring_active,legs_points_per_win,undefeated_winner_bonus_active,undefeated_winner_bonus_points",
    )
    .eq("id", seriesId)
    .maybeSingle()

  if (seriesError) throw seriesError
  if (!series) return null

  const { data: rules, error: rulesError } = await supabase
    .from("dko_series_point_rules")
    .select("place_from,place_to,points,sort_order")
    .eq("series_id", seriesId)
    .order("sort_order", { ascending: true })
    .order("place_from", { ascending: true })

  if (rulesError) throw rulesError

  return {
    id: String(series.id),
    seriesType: String(series.series_type || ""),
    placementMode: series.placement_scoring_mode === "fixed" ? "fixed" : "dynamic",
    dynamicLastPlacePoints: Number(series.dynamic_last_place_points ?? 10),
    dynamicStepPoints: Number(series.dynamic_step_points ?? 2),
    legsScoringActive: Boolean(series.legs_scoring_active),
    legsPointsPerWin: Number(series.legs_points_per_win ?? 1),
    undefeatedWinnerBonusActive: Boolean(series.undefeated_winner_bonus_active),
    undefeatedWinnerBonusPoints: Number(series.undefeated_winner_bonus_points ?? 0),
    pointRules: (rules || []).map((row: any) => ({
      place_from: Number(row.place_from || 0),
      place_to: Number(row.place_to || row.place_from || 0),
      points: Number(row.points || 0),
    })),
  }
}

export function calculateSeriesPlacementPoints(
  runtime: SeriesScoringRuntime | null,
  placement: number,
  tiersBelow: number,
  legacyFallback: number,
) {
  if (!runtime) return legacyFallback

  if (runtime.placementMode === "fixed") {
    const rule = runtime.pointRules.find(
      (item) => placement >= item.place_from && placement <= item.place_to,
    )
    return rule ? rule.points : 0
  }

  return runtime.dynamicLastPlacePoints + tiersBelow * runtime.dynamicStepPoints
}

export function calculateSeriesLegPoints(
  runtime: SeriesScoringRuntime | null,
  legsWon: number,
  legacyFallback: number,
) {
  if (!runtime) return legacyFallback
  if (!runtime.legsScoringActive) return 0
  return Math.round(legsWon * runtime.legsPointsPerWin)
}

export function calculateSeriesWinnerBonus(
  runtime: SeriesScoringRuntime | null,
  placement: number,
  matchesLost: number,
  legacyFallback: number,
) {
  if (!runtime) return legacyFallback
  if (!runtime.undefeatedWinnerBonusActive) return 0
  if (placement !== 1 || matchesLost > 0) return 0
  return runtime.undefeatedWinnerBonusPoints
}

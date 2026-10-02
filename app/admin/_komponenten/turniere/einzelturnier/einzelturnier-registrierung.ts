import { supabase } from "@/lib/supabase"
import { stripDoubleSuffix } from "./einzelturnier-helfer"
import type { TournamentAccessType } from "./einzelturnier-berechtigungen"

export async function findPlayerCredit(spieldatenbankId: number) {
  const { data: clubPlayer, error: clubPlayerError } = await supabase
    .from("club_players")
    .select("id")
    .eq("spieldatenbank_id", spieldatenbankId)
    .maybeSingle()

  if (clubPlayerError) throw clubPlayerError
  if (!clubPlayer?.id) return null

  const { data: creditData, error: creditError } = await supabase
    .from("player_credits")
    .select("credit_balance")
    .eq("player_id", clubPlayer.id)
    .maybeSingle()

  if (creditError) throw creditError
  if (!creditData) return null

  return {
    clubPlayerId: String(clubPlayer.id),
    currentBalance: Number(creditData.credit_balance || 0),
  }
}

export async function insertTournamentRegistration(opts: {
  playerId: string
  playerName: string
  paid: boolean
  entryFee: number
  deductedFromCredit: boolean
  accessType: TournamentAccessType
  eventId: string | null
}) {
  const { error } = await supabase.from("dko_tournament_registration").insert({
    player_id: opts.playerId,
    player_name: opts.playerName,
    paid: opts.paid,
    entry_fee: opts.entryFee,
    deducted_from_credit: opts.deductedFromCredit,
    payment_method: "admin",
    access_type: opts.accessType,
    event_id: opts.eventId || null,
  })

  return error
}

export async function deductPlayerCredit(opts: {
  clubPlayerId: string
  amount: number
  newBalance: number
  adminId?: string | null
}) {
  const { error: updateError } = await supabase
    .from("player_credits")
    .update({
      credit_balance: opts.newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("player_id", opts.clubPlayerId)

  if (updateError) throw updateError

  const { error: transactionError } = await supabase.from("credit_transactions").insert({
    player_id: opts.clubPlayerId,
    amount: -opts.amount,
    balance_after: opts.newBalance,
    transaction_type: "tournament_entry_fee",
    admin_id: opts.adminId || null,
  })

  if (transactionError) throw transactionError
}

export async function deleteTournamentRegistration(registrationId: number) {
  const { error } = await supabase
    .from("dko_tournament_registration")
    .delete()
    .eq("id", registrationId)

  if (error) throw error
}

export async function refundTournamentCredit(opts: {
  registrationId: number
  playerName: string
  refundAmount: number
  adminId?: string | null
}): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    const basePlayerName = stripDoubleSuffix(opts.playerName)

    const { data: spielerStamm, error: spielerStammError } = await supabase
      .from("spieldatenbank")
      .select("id")
      .eq("name", basePlayerName)
      .maybeSingle()

    if (spielerStammError || !spielerStamm) {
      return { ok: false, error: spielerStammError || new Error("Spieldatenbank player not found") }
    }

    const { data: clubPlayer, error: clubPlayerError } = await supabase
      .from("club_players")
      .select("id")
      .eq("spieldatenbank_id", spielerStamm.id)
      .maybeSingle()

    if (clubPlayerError || !clubPlayer) {
      return { ok: false, error: clubPlayerError || new Error("Club player not found") }
    }

    const { data: currentCredit, error: fetchError } = await supabase
      .from("player_credits")
      .select("credit_balance")
      .eq("player_id", clubPlayer.id)
      .maybeSingle()

    if (fetchError || !currentCredit) {
      return { ok: false, error: fetchError || new Error("No credit record found") }
    }

    const newBalance = Number(currentCredit.credit_balance || 0) + opts.refundAmount

    const { error: updateError } = await supabase
      .from("player_credits")
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", clubPlayer.id)

    if (updateError) return { ok: false, error: updateError }

    const { error: transactionError } = await supabase.from("credit_transactions").insert({
      player_id: clubPlayer.id,
      amount: opts.refundAmount,
      balance_after: newBalance,
      transaction_type: "tournament_refund",
      admin_id: opts.adminId || null,
    })

    if (transactionError) return { ok: false, error: transactionError }

    const { error: deleteError } = await supabase
      .from("dko_tournament_registration")
      .delete()
      .eq("id", opts.registrationId)

    if (deleteError) return { ok: false, error: deleteError }

    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export async function setTournamentRegistrationPaid(
  registrationId: number,
  paid: boolean,
) {
  const { error } = await supabase
    .from("dko_tournament_registration")
    .update({ paid })
    .eq("id", registrationId)

  if (error) throw error
}

export async function markTournamentRegistrationsPaid(registrationIds: number[]) {
  if (registrationIds.length === 0) return

  const { error } = await supabase
    .from("dko_tournament_registration")
    .update({ paid: true })
    .in("id", registrationIds)

  if (error) throw error
}

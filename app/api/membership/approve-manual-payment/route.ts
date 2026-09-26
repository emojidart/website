import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}


async function endActiveTrialsForPlayer(
  supabase: ReturnType<typeof createClient>,
  playerId: string,
) {
  const { error } = await supabase
    .from("membership_trials")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("player_id", playerId)
    .eq("status", "active")

  if (error) throw error
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: "Supabase Server-Konfiguration fehlt." }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!token) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const requestId = String(body?.requestId || "").trim()
    if (!requestId) return NextResponse.json({ error: "requestId fehlt." }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (authError || !user) {
      return NextResponse.json({ error: "Sitzung ungültig oder abgelaufen." }, { status: 401 })
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (adminError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: "Nur Administratoren dürfen Zahlungen bestätigen." }, { status: 403 })
    }

    const { data: changeRequest, error: requestError } = await supabase
      .from("membership_change_requests")
      .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,request_type,payment_status,starts_on,monthly_total,semiannual_total,annual_total,note")
      .eq("id", requestId)
      .single()

    if (requestError || !changeRequest) {
      return NextResponse.json({ error: "Mitgliedschaftsanfrage wurde nicht gefunden." }, { status: 404 })
    }

    if (changeRequest.request_type !== "change" || changeRequest.requested_status !== "pending") {
      return NextResponse.json({ error: "Diese Mitgliedschaftsanfrage ist nicht mehr offen." }, { status: 409 })
    }

    if (changeRequest.payment_method === "stripe") {
      return NextResponse.json({ error: "Stripe-Zahlungen dürfen nicht manuell bestätigt werden." }, { status: 400 })
    }

    if (changeRequest.payment_status === "paid") {
      return NextResponse.json({ error: "Diese Zahlung wurde bereits bestätigt." }, { status: 409 })
    }

    const { data: requestRows, error: rowError } = await supabase
      .from("membership_change_request_modules")
      .select("module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot")
      .eq("request_id", requestId)

    if (rowError) throw rowError
    if (!requestRows || requestRows.length === 0) {
      return NextResponse.json({ error: "Für diese Anfrage wurden keine Module gefunden." }, { status: 400 })
    }

    const now = new Date().toISOString()
    let membershipId = changeRequest.current_membership_id || ""

    if (membershipId) {
      const { data: currentMembership, error: membershipLookupError } = await supabase
        .from("member_memberships")
        .select("id,payment_method,stripe_subscription_id")
        .eq("id", membershipId)
        .single()

      if (membershipLookupError || !currentMembership) {
        return NextResponse.json({ error: "Bestehende Mitgliedschaft wurde nicht gefunden." }, { status: 404 })
      }

      // Wechsel von Stripe auf Bar/Überweisung: altes Abo zuerst stoppen.
      // Danach wird die Subscription-ID entfernt, damit spätere Stripe-Webhooks
      // diese nun manuelle Mitgliedschaft nicht wieder auf cancelled setzen können.
      if (currentMembership.stripe_subscription_id) {
        if (!stripeSecretKey) {
          return NextResponse.json({ error: "STRIPE_SECRET_KEY fehlt für den Wechsel von Stripe auf manuelle Zahlung." }, { status: 500 })
        }

        const stripe = new Stripe(stripeSecretKey)
        try {
          const subscription = await stripe.subscriptions.retrieve(currentMembership.stripe_subscription_id)
          if (subscription.status !== "canceled") {
            await stripe.subscriptions.cancel(currentMembership.stripe_subscription_id)
          }
        } catch (error: any) {
          if (error?.code !== "resource_missing") throw error
        }
      }

      const { error: updateMembershipError } = await supabase
        .from("member_memberships")
        .update({
          billing_cycle: changeRequest.billing_cycle,
          payment_method: changeRequest.payment_method,
          status: "active",
          starts_on: changeRequest.starts_on || todayISO(),
          ends_on: null,
          stripe_subscription_id: null,
          stripe_checkout_session_id: null,
          stripe_status: currentMembership.stripe_subscription_id ? "cancelled_manual_switch" : null,
          updated_at: now,
        })
        .eq("id", membershipId)

      if (updateMembershipError) throw updateMembershipError
    } else {
      const { data: newMembership, error: membershipError } = await supabase
        .from("member_memberships")
        .insert({
          player_id: changeRequest.player_id,
          billing_cycle: changeRequest.billing_cycle,
          payment_method: changeRequest.payment_method,
          status: "active",
          starts_on: changeRequest.starts_on || todayISO(),
          ends_on: null,
          note: "Über Mitgliederbereich gebucht · manuelle Zahlung bestätigt",
        })
        .select("id")
        .single()

      if (membershipError) throw membershipError
      membershipId = newMembership.id
    }

    const { error: deleteError } = await supabase
      .from("member_membership_modules")
      .delete()
      .eq("membership_id", membershipId)
    if (deleteError) throw deleteError

    const { error: insertError } = await supabase.from("member_membership_modules").insert(
      requestRows.map((row) => ({
        membership_id: membershipId,
        module_id: row.module_id,
        monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
        semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
        annual_price_snapshot: Number(row.annual_price_snapshot || 0),
      })),
    )
    if (insertError) throw insertError

    // Sobald eine reguläre Mitgliedschaft aktiv wird, endet die Testphase vollständig.
    await endActiveTrialsForPlayer(supabase, changeRequest.player_id)

    const { data: baseModule, error: baseError } = await supabase
      .from("membership_modules")
      .select("id")
      .eq("code", "base_membership")
      .eq("is_active", true)
      .maybeSingle()
    if (baseError) throw baseError

    if (baseModule?.id && requestRows.some((row) => row.module_id === baseModule.id)) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ is_guest: false, is_blocked: false, blocked_reason: null, blocked_at: null })
        .eq("player_id", changeRequest.player_id)
      if (profileError) throw profileError
    }

    const { error: approveError } = await supabase
      .from("membership_change_requests")
      .update({
        payment_status: "paid",
        paid_at: now,
        paid_by: user.id,
        requested_status: "approved",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("requested_status", "pending")

    if (approveError) throw approveError

    const moduleIds = requestRows.map((row) => row.module_id)
    const { data: paymentModules, error: paymentModulesError } = await supabase
      .from("membership_modules")
      .select("id,code,name,sort_order")
      .in("id", moduleIds)

    if (paymentModulesError) throw paymentModulesError

    const moduleMap = new Map((paymentModules || []).map((module) => [module.id, module]))
    const amount =
      changeRequest.billing_cycle === "monthly"
        ? Number(changeRequest.monthly_total || 0)
        : changeRequest.billing_cycle === "semiannual"
          ? Number(changeRequest.semiannual_total || 0)
          : Number(changeRequest.annual_total || 0)

    const periodStart = changeRequest.starts_on || todayISO()
    const periodEndDate = new Date(`${periodStart}T12:00:00Z`)
    if (changeRequest.billing_cycle === "monthly") periodEndDate.setUTCMonth(periodEndDate.getUTCMonth() + 1)
    else if (changeRequest.billing_cycle === "semiannual") periodEndDate.setUTCMonth(periodEndDate.getUTCMonth() + 6)
    else periodEndDate.setUTCFullYear(periodEndDate.getUTCFullYear() + 1)
    periodEndDate.setUTCDate(periodEndDate.getUTCDate() - 1)

    const lineItems = requestRows.map((row) => {
      const module = moduleMap.get(row.module_id) as any
      const rowAmount =
        changeRequest.billing_cycle === "monthly"
          ? Number(row.monthly_price_snapshot || 0)
          : changeRequest.billing_cycle === "semiannual"
            ? Number(row.semiannual_price_snapshot || 0)
            : Number(row.annual_price_snapshot || 0)

      return {
        module_id: row.module_id,
        code: module?.code || null,
        name: module?.name || "Mitgliedschaft",
        amount_cents: Math.round(rowAmount * 100),
        quantity: 1,
      }
    })

    const { data: existingLedger, error: existingLedgerError } = await supabase
      .from("membership_payments")
      .select("id")
      .eq("change_request_id", requestId)
      .eq("source", "manual_confirmation")
      .maybeSingle()

    if (existingLedgerError) throw existingLedgerError

    if (!existingLedger) {
      const { error: ledgerError } = await supabase.from("membership_payments").insert({
        player_id: changeRequest.player_id,
        membership_id: membershipId,
        change_request_id: requestId,
        paid_at: now,
        amount_cents: Math.round(amount * 100),
        currency: "EUR",
        interval: changeRequest.billing_cycle,
        period_start: periodStart,
        period_end: periodEndDate.toISOString().slice(0, 10),
        notes: changeRequest.note || "Manuell bestätigter Mitgliedsbeitrag",
        payment_method: changeRequest.payment_method,
        source: "manual_confirmation",
        status: "paid",
        billing_cycle: changeRequest.billing_cycle,
        fee_cents: 0,
        net_amount_cents: Math.round(amount * 100),
        line_items: lineItems,
      })

      if (ledgerError) throw ledgerError
    }

    return NextResponse.json({ ok: true, membershipId })
  } catch (error: any) {
    console.error("approve manual membership payment error:", error)
    return NextResponse.json({ error: error?.message || "Zahlung konnte nicht bestätigt werden." }, { status: 500 })
  }
}

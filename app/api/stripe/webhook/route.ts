import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
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

function stripeId(value: string | Stripe.Customer | Stripe.Subscription | null | undefined) {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function stripeAnyId(value: any): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id || null
}

function unixDate(value: number | null | undefined) {
  if (!value) return null
  return new Date(value * 1000).toISOString().slice(0, 10)
}

async function getStripeFeeAndNet(stripe: Stripe, invoice: any) {
  let paymentIntentId = stripeAnyId(invoice.payment_intent)
  let feeCents = 0
  let netCents = Number(invoice.amount_paid || 0)

  try {
    const chargeId = stripeAnyId(invoice.charge)
    if (chargeId) {
      const charge: any = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] })
      const bt: any = charge?.balance_transaction
      if (bt && typeof bt !== "string") {
        feeCents = Number(bt.fee || 0)
        netCents = Number(bt.net || 0)
      }
      paymentIntentId = paymentIntentId || stripeAnyId(charge?.payment_intent)
      return { feeCents, netCents, paymentIntentId }
    }

    if (paymentIntentId) {
      const pi: any = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      })
      const charge: any = pi?.latest_charge
      const bt: any = charge && typeof charge !== "string" ? charge.balance_transaction : null
      if (bt && typeof bt !== "string") {
        feeCents = Number(bt.fee || 0)
        netCents = Number(bt.net || 0)
      }
    }
  } catch (error) {
    console.warn("membership invoice fee lookup warning", invoice?.id, error)
  }

  return { feeCents, netCents, paymentIntentId }
}

async function recordStripeInvoicePayment(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  invoice: any,
  eventId: string | null,
) {
  const subscriptionId =
    stripeAnyId(invoice.subscription) ||
    stripeAnyId(invoice.parent?.subscription_details?.subscription) ||
    null

  if (!subscriptionId || !invoice?.id || Number(invoice.amount_paid || 0) <= 0) return

  const { data: membership, error: membershipError } = await supabase
    .from("member_memberships")
    .select("id,player_id,billing_cycle,stripe_customer_id,stripe_subscription_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership) {
    console.warn("invoice.paid without matching membership yet", invoice.id, subscriptionId)
    return
  }

  const { feeCents, netCents, paymentIntentId } = await getStripeFeeAndNet(stripe, invoice)
  const firstLine: any = invoice.lines?.data?.[0] || null
  const paidAtUnix = invoice.status_transitions?.paid_at || invoice.created
  const paidAt = new Date(Number(paidAtUnix || 0) * 1000).toISOString()

  const lineItems = (invoice.lines?.data || []).map((line: any) => ({
    name: line.description || line.price?.nickname || "Mitgliedschaft",
    description: line.description || null,
    amount_cents: Number(line.amount || 0),
    quantity: Number(line.quantity || 1),
    price_id: stripeAnyId(line.price),
  }))

  const { error } = await supabase
    .from("membership_payments")
    .upsert(
      {
        player_id: membership.player_id,
        membership_id: membership.id,
        paid_at: paidAt,
        amount_cents: Number(invoice.amount_paid || 0),
        currency: String(invoice.currency || "eur").toUpperCase(),
        interval: membership.billing_cycle || null,
        period_start: unixDate(firstLine?.period?.start || invoice.period_start),
        period_end: unixDate(firstLine?.period?.end || invoice.period_end),
        notes: invoice.billing_reason ? `Stripe · ${invoice.billing_reason}` : "Stripe-Zahlung",
        payment_method: "stripe",
        source: "stripe_invoice",
        status: "paid",
        billing_cycle: membership.billing_cycle || null,
        fee_cents: feeCents,
        net_amount_cents: netCents,
        stripe_invoice_id: invoice.id,
        stripe_invoice_number: invoice.number || null,
        stripe_invoice_pdf_url: invoice.invoice_pdf || null,
        stripe_hosted_invoice_url: invoice.hosted_invoice_url || null,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: stripeAnyId(invoice.customer) || membership.stripe_customer_id || null,
        stripe_subscription_id: subscriptionId,
        stripe_event_id: eventId,
        line_items: lineItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_invoice_id" },
    )

  if (error) throw error
}


async function rewriteRequestToActuallyChargedDelta(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  chargedAmountCents: number,
) {
  const { data: request, error: requestError } = await supabase
    .from("membership_change_requests")
    .select("id,current_membership_id,billing_cycle")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError) throw requestError
  if (!request?.current_membership_id) return

  const { data: currentRows, error: currentRowsError } = await supabase
    .from("member_membership_modules")
    .select("module_id")
    .eq("membership_id", request.current_membership_id)

  if (currentRowsError) throw currentRowsError

  const { data: requestRows, error: requestRowsError } = await supabase
    .from("membership_change_request_modules")
    .select("id,module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot")
    .eq("request_id", requestId)

  if (requestRowsError) throw requestRowsError
  if (!requestRows || requestRows.length === 0) return

  const currentModuleIds = new Set((currentRows || []).map((row) => row.module_id))
  const addedRows = requestRows.filter((row) => !currentModuleIds.has(row.module_id))

  const chargedAmount = Number(chargedAmountCents || 0) / 100

  if (chargedAmount > 0 && addedRows.length > 0) {
    const { error: deleteOldRowsError } = await supabase
      .from("membership_change_request_modules")
      .delete()
      .eq("request_id", requestId)

    if (deleteOldRowsError) throw deleteOldRowsError

    const { error: insertDeltaRowsError } = await supabase
      .from("membership_change_request_modules")
      .insert(
        addedRows.map((row) => ({
          request_id: requestId,
          module_id: row.module_id,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })),
      )

    if (insertDeltaRowsError) throw insertDeltaRowsError
  }

  const monthlyTotal =
    request.billing_cycle === "monthly" ? chargedAmount : Number((chargedAmount / 12).toFixed(2))
  const annualTotal =
    request.billing_cycle === "annual" ? chargedAmount : Number((chargedAmount * 12).toFixed(2))

  const { error: totalUpdateError } = await supabase
    .from("membership_change_requests")
    .update({
      monthly_total: monthlyTotal,
      annual_total: annualTotal,
      note: "Änderungsanfrage über Mitgliederbereich – Stripe Checkout · tatsächlicher Differenz-Zahlungseingang",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (totalUpdateError) throw totalUpdateError
}

async function activateMemberProfileIfBaseIncluded(
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  moduleIds: string[],
) {
  if (!playerId || moduleIds.length === 0) return

  const { data: baseModule, error: baseError } = await supabase
    .from("membership_modules")
    .select("id")
    .eq("code", "base_membership")
    .eq("is_active", true)
    .maybeSingle()

  if (baseError) throw baseError
  if (!baseModule?.id || !moduleIds.includes(baseModule.id)) return

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      is_guest: false,
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
    })
    .eq("player_id", playerId)

  if (profileError) throw profileError
}


async function applyPendingStripeChangeFromSubscription(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  // Solange Stripe eine pending_update hat, ist die neue Paketänderung
  // noch NICHT bezahlt/angewendet. Das bestehende Paket bleibt aktiv.
  if (subscription.pending_update) return

  const requestId = subscription.metadata?.membership_request_id
  if (!requestId) return

  const { data: changeRequest, error: requestError } = await supabase
    .from("membership_change_requests")
    .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,payment_status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError) throw requestError
  if (!changeRequest) return
  if (changeRequest.requested_status !== "pending") return
  if (changeRequest.payment_method !== "stripe") return
  if (!changeRequest.current_membership_id) return

  const { data: requestRows, error: rowsError } = await supabase
    .from("membership_change_request_modules")
    .select("module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot")
    .eq("request_id", requestId)

  if (rowsError) throw rowsError
  if (!requestRows || requestRows.length === 0) return

  const latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id || null

  let actuallyChargedCents = 0

  if (latestInvoiceId) {
    const stripe = new Stripe(stripeSecretKey!)
    const invoice = await stripe.invoices.retrieve(latestInvoiceId)
    actuallyChargedCents = Number(invoice.amount_paid || 0)
  }

  if (actuallyChargedCents > 0) {
    await rewriteRequestToActuallyChargedDelta(supabase, requestId, actuallyChargedCents)
  }

  const now = new Date().toISOString()
  const stripeStatus = subscription.status
  const membershipStatus =
    stripeStatus === "active" || stripeStatus === "trialing" ? "active" : "paused"

  const { error: membershipError } = await supabase
    .from("member_memberships")
    .update({
      billing_cycle: changeRequest.billing_cycle,
      payment_method: "stripe",
      status: membershipStatus,
      stripe_customer_id: stripeId(subscription.customer as any),
      stripe_subscription_id: subscription.id,
      stripe_status: stripeStatus,
      updated_at: now,
    })
    .eq("id", changeRequest.current_membership_id)

  if (membershipError) throw membershipError

  const { error: deleteError } = await supabase
    .from("member_membership_modules")
    .delete()
    .eq("membership_id", changeRequest.current_membership_id)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from("member_membership_modules")
    .insert(
      requestRows.map((row) => ({
        membership_id: changeRequest.current_membership_id,
        module_id: row.module_id,
        monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
        semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
        annual_price_snapshot: Number(row.annual_price_snapshot || 0),
      })),
    )

  if (insertError) throw insertError

  await endActiveTrialsForPlayer(supabase, changeRequest.player_id)

  await activateMemberProfileIfBaseIncluded(
    supabase,
    changeRequest.player_id,
    requestRows.map((row) => row.module_id),
  )

  const { error: approveError } = await supabase
    .from("membership_change_requests")
    .update({
      payment_status: "paid",
      paid_at: now,
      requested_status: "approved",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("requested_status", "pending")

  if (approveError) throw approveError
}


async function applyCreditTopupFromCheckout(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  if (session.metadata?.payment_kind !== "credit_topup") return false
  if (session.payment_status !== "paid") return true

  const topupId = session.metadata?.wallet_topup_id || session.client_reference_id
  if (!topupId) throw new Error("wallet_topup_id fehlt in Stripe Metadata")

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null
  let actualFee = 0
  let actualNet = Number(session.amount_total || 0) / 100

  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] })
    const charge: any = pi.latest_charge
    const bt: any = charge && typeof charge !== "string" ? charge.balance_transaction : null
    if (bt && typeof bt !== "string") {
      actualFee = Number(bt.fee || 0) / 100
      actualNet = Number(bt.net || 0) / 100
    }
  }

  const { error } = await supabase.rpc("apply_wallet_topup", {
    p_topup_id: topupId,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_actual_fee: actualFee,
    p_actual_net: actualNet,
    p_stripe_event_id: eventId,
  })
  if (error) throw error
  return true
}

export async function POST(request: Request) {
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Stripe webhook: server environment is incomplete")
    return NextResponse.json({ error: "Server-Konfiguration unvollständig." }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Stripe-Signatur fehlt." }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error: any) {
    console.error("Stripe webhook signature error:", error?.message || error)
    return NextResponse.json({ error: "Ungültige Stripe-Signatur." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      if (await applyCreditTopupFromCheckout(stripe, supabase, session, event.id)) {
        return NextResponse.json({ received: true })
      }
      const requestId = session.metadata?.membership_request_id || session.client_reference_id

      if (!requestId) {
        console.warn("Stripe checkout completed without membership_request_id", session.id)
        return NextResponse.json({ received: true })
      }

      // Eine Mitgliedschaft darf erst nach tatsächlich erfolgreicher Erstzahlung
      // freigeschaltet werden. "checkout.session.completed" allein reicht nicht.
      if (session.payment_status !== "paid") {
        console.warn(
          "Stripe checkout completed but payment is not paid",
          session.id,
          session.payment_status,
        )
        return NextResponse.json({ received: true })
      }

      const { data: changeRequest, error: requestError } = await supabase
        .from("membership_change_requests")
        .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,starts_on")
        .eq("id", requestId)
        .single()

      if (requestError || !changeRequest) {
        throw requestError || new Error("Mitgliedschaftsanfrage nicht gefunden.")
      }

      // Bereits verarbeitet: Stripe kann dasselbe Event erneut zustellen.
      if (changeRequest.requested_status === "approved") {
        return NextResponse.json({ received: true })
      }

      if (changeRequest.current_membership_id && Number(session.amount_total || 0) > 0) {
        await rewriteRequestToActuallyChargedDelta(
          supabase,
          requestId,
          Number(session.amount_total || 0),
        )
      }

      const { data: requestRows, error: requestRowsError } = await supabase
        .from("membership_change_request_modules")
        .select("module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot")
        .eq("request_id", requestId)

      if (requestRowsError) throw requestRowsError
      if (!requestRows || requestRows.length === 0) {
        throw new Error("Für die Stripe-Anfrage wurden keine Module gefunden.")
      }

      const customerId = stripeId(session.customer as any)
      const subscriptionId = stripeId(session.subscription as any)

      let membershipId = changeRequest.current_membership_id || ""

      if (membershipId) {
        const { error: membershipError } = await supabase
          .from("member_memberships")
          .update({
            billing_cycle: changeRequest.billing_cycle,
            payment_method: "stripe",
            status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_checkout_session_id: session.id,
            stripe_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", membershipId)

        if (membershipError) throw membershipError
      } else {
        const { data: newMembership, error: membershipError } = await supabase
          .from("member_memberships")
          .insert({
            player_id: changeRequest.player_id,
            billing_cycle: changeRequest.billing_cycle,
            payment_method: "stripe",
            status: "active",
            starts_on: changeRequest.starts_on || todayISO(),
            ends_on: null,
            note: "Automatisch über Stripe Checkout freigeschaltet",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_checkout_session_id: session.id,
            stripe_status: "active",
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

      const { error: insertError } = await supabase
        .from("member_membership_modules")
        .insert(
          requestRows.map((row) => ({
            membership_id: membershipId,
            module_id: row.module_id,
            monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
            semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
            annual_price_snapshot: Number(row.annual_price_snapshot || 0),
          })),
        )

      if (insertError) throw insertError

      await endActiveTrialsForPlayer(supabase, changeRequest.player_id)

      // Erst eine bezahlte Grundmitgliedschaft macht aus einem aufgenommenen
      // Gastprofil einen voll freigeschalteten Vereinsaccount.
      await activateMemberProfileIfBaseIncluded(
        supabase,
        changeRequest.player_id,
        requestRows.map((row) => row.module_id),
      )

      const now = new Date().toISOString()
      const { error: approveError } = await supabase
        .from("membership_change_requests")
        .update({
          payment_status: "paid",
          paid_at: now,
          requested_status: "approved",
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", requestId)

      if (approveError) throw approveError
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const status = subscription.status

      const membershipStatus =
        status === "active" || status === "trialing"
          ? "active"
          : status === "canceled"
            ? "cancelled"
            : "paused"

      const { error } = await supabase
        .from("member_memberships")
        .update({
          status: membershipStatus,
          stripe_status: status,
          stripe_customer_id: stripeId(subscription.customer as any),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id)

      if (error) throw error

      if (event.type === "customer.subscription.updated") {
        await applyPendingStripeChangeFromSubscription(supabase, subscription)
      }
    }

    if (event.type === "customer.subscription.pending_update_applied") {
      const subscription = event.data.object as Stripe.Subscription
      await applyPendingStripeChangeFromSubscription(supabase, subscription)
    }

    if (event.type === "customer.subscription.pending_update_expired") {
      // Keine Freischaltung. Das bisherige Paket bleibt unverändert.
      const subscription = event.data.object as Stripe.Subscription
      console.warn("Stripe pending membership update expired", subscription.id)
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription

      const { error } = await supabase
        .from("member_memberships")
        .update({
          status: "cancelled",
          stripe_status: subscription.status,
          ends_on: todayISO(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id)

      if (error) throw error
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ||
            invoice.parent?.subscription_details?.subscription ||
            null

      if (subscriptionId) {
        const { data: membership, error: membershipLookupError } = await supabase
          .from("member_memberships")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle()

        if (membershipLookupError) throw membershipLookupError

        let isPendingPackageChange = false

        if (membership?.id) {
          const { data: pendingChange, error: pendingChangeError } = await supabase
            .from("membership_change_requests")
            .select("id")
            .eq("current_membership_id", membership.id)
            .eq("payment_method", "stripe")
            .eq("requested_status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (pendingChangeError) throw pendingChangeError
          isPendingPackageChange = !!pendingChange?.id
        }

        if (!isPendingPackageChange) {
          // Nur eine echte fehlgeschlagene reguläre Abo-Rechnung pausiert
          // die aktive Mitgliedschaft. Eine fehlgeschlagene Paket-Erweiterung
          // darf das bereits bezahlte bisherige Paket nicht sperren.
          const { error } = await supabase
            .from("member_memberships")
            .update({
              status: "paused",
              stripe_status: "payment_failed",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)

          if (error) throw error
        }
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as any
      const subscriptionId =
        stripeAnyId(invoice.subscription) ||
        stripeAnyId(invoice.parent?.subscription_details?.subscription) ||
        null

      if (subscriptionId) {
        const { error } = await supabase
          .from("member_memberships")
          .update({
            status: "active",
            stripe_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)

        if (error) throw error
      }

      await recordStripeInvoicePayment(stripe, supabase, invoice, event.id)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("stripe webhook processing error:", event.type, error)
    return NextResponse.json(
      { error: error?.message || "Webhook konnte nicht verarbeitet werden." },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function stripeId(value: any): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id || null
}

function unixDate(value: number | null | undefined) {
  if (!value) return null
  return new Date(value * 1000).toISOString().slice(0, 10)
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase Server-Konfiguration fehlt.")
  }

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token) return { error: NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 }) }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Sitzung ungültig oder abgelaufen." }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", authData.user.id)
    .maybeSingle()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: "Nur Administratoren dürfen die Buchhaltung öffnen." }, { status: 403 }) }
  }

  return { supabase, user: authData.user }
}

async function getFeeAndNet(stripe: Stripe, invoice: any) {
  let paymentIntentId = stripeId(invoice.payment_intent)
  let feeCents = 0
  let netCents = Number(invoice.amount_paid || 0)

  try {
    const chargeId = stripeId(invoice.charge)
    if (chargeId) {
      const charge: any = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] })
      const bt: any = charge?.balance_transaction
      if (bt && typeof bt !== "string") {
        feeCents = Number(bt.fee || 0)
        netCents = Number(bt.net || 0)
      }
      paymentIntentId = paymentIntentId || stripeId(charge?.payment_intent)
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
    console.warn("membership payment fee lookup warning", invoice.id, error)
  }

  return { feeCents, netCents, paymentIntentId }
}

async function upsertStripeInvoice(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  membership: any,
  invoice: any,
) {
  if (!invoice?.id || invoice.status !== "paid" || Number(invoice.amount_paid || 0) <= 0) return false

  const { feeCents, netCents, paymentIntentId } = await getFeeAndNet(stripe, invoice)
  const firstLine: any = invoice.lines?.data?.[0] || null
  const paidAtUnix = invoice.status_transitions?.paid_at || invoice.created
  const paidAt = new Date(Number(paidAtUnix || 0) * 1000).toISOString()

  const lineItems = (invoice.lines?.data || []).map((line: any) => ({
    name: line.description || line.price?.nickname || "Mitgliedschaft",
    description: line.description || null,
    amount_cents: Number(line.amount || 0),
    quantity: Number(line.quantity || 1),
    price_id: stripeId(line.price),
  }))

  const subscriptionId =
    stripeId(invoice.subscription) ||
    stripeId(invoice.parent?.subscription_details?.subscription) ||
    membership.stripe_subscription_id ||
    null

  const payload = {
    player_id: membership.player_id,
    membership_id: membership.id,
    change_request_id: null,
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
    stripe_customer_id: stripeId(invoice.customer) || membership.stripe_customer_id || null,
    stripe_subscription_id: subscriptionId,
    stripe_event_id: null,
    line_items: lineItems,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("membership_payments")
    .upsert(payload, { onConflict: "stripe_invoice_id" })

  if (error) throw error
  return true
}

async function listPayments(supabase: ReturnType<typeof createClient>) {
  const { data: payments, error: paymentsError } = await supabase
    .from("membership_payments")
    .select("id,player_id,membership_id,change_request_id,paid_at,amount_cents,currency,interval,period_start,period_end,notes,payment_method,source,status,billing_cycle,fee_cents,net_amount_cents,receipt_no,stripe_invoice_id,stripe_invoice_number,stripe_invoice_pdf_url,stripe_hosted_invoice_url,stripe_payment_intent_id,stripe_customer_id,stripe_subscription_id,line_items,reviewed_at,reviewed_by,review_note")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })

  if (paymentsError) throw paymentsError

  const playerIds = Array.from(new Set((payments || []).map((payment: any) => payment.player_id).filter(Boolean)))
  const { data: players, error: playersError } = playerIds.length
    ? await supabase.from("club_players").select("id,name,email").in("id", playerIds)
    : { data: [], error: null as any }

  if (playersError) throw playersError
  const playerMap = new Map((players || []).map((player: any) => [player.id, player]))

  return (payments || []).map((payment: any) => ({
    ...payment,
    player_name: playerMap.get(payment.player_id)?.name || "Unbekanntes Mitglied",
    player_email: playerMap.get(payment.player_id)?.email || null,
  }))
}


async function listWalletTopups(supabase: ReturnType<typeof createClient>) {
  const { data: topups, error: topupsError } = await supabase
    .from("wallet_topups")
    .select("id,player_id,credit_amount,fee_charged,gross_amount,actual_stripe_fee,actual_stripe_net,stripe_checkout_session_id,stripe_payment_intent_id,stripe_event_id,status,created_at,paid_at,updated_at,reviewed_at,reviewed_by,review_note")
    .order("created_at", { ascending: false })

  if (topupsError) throw topupsError

  const playerIds = Array.from(new Set((topups || []).map((row: any) => row.player_id).filter(Boolean)))
  const { data: players, error: playersError } = playerIds.length
    ? await supabase.from("club_players").select("id,name,email").in("id", playerIds)
    : { data: [], error: null as any }

  if (playersError) throw playersError
  const playerMap = new Map((players || []).map((player: any) => [player.id, player]))

  return (topups || []).map((row: any) => ({
    ...row,
    player_name: playerMap.get(row.player_id)?.name || "Unbekanntes Mitglied",
    player_email: playerMap.get(row.player_id)?.email || null,
  }))
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const [payments, topups] = await Promise.all([
      listPayments(auth.supabase!),
      listWalletTopups(auth.supabase!),
    ])
    return NextResponse.json({ payments, topups })
  } catch (error: any) {
    console.error("membership accounting GET error", error)
    return NextResponse.json({ error: error?.message || "Buchhaltungsdaten konnten nicht geladen werden." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!

    const body = await request.json().catch(() => ({}))

    if (body?.action === "set_reviewed") {
      const target = body?.target === "topup" ? "topup" : "payment"
      const id = String(body?.id || "")
      const reviewed = body?.reviewed !== false
      const reviewNote = typeof body?.review_note === "string" ? body.review_note.trim() : null

      if (!id) {
        return NextResponse.json({ error: "Zahlungs-ID fehlt." }, { status: 400 })
      }

      const table = target === "topup" ? "wallet_topups" : "membership_payments"
      const { error: reviewError } = await supabase
        .from(table)
        .update({
          reviewed_at: reviewed ? new Date().toISOString() : null,
          reviewed_by: reviewed ? auth.user!.id : null,
          review_note: reviewed ? reviewNote || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (reviewError) throw reviewError

      const [payments, topups] = await Promise.all([
        listPayments(supabase),
        listWalletTopups(supabase),
      ])
      return NextResponse.json({ ok: true, payments, topups })
    }

    if (body?.action !== "sync_stripe") {
      return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 })
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY fehlt." }, { status: 500 })
    }

    const stripe = new Stripe(stripeSecretKey)
    const { data: memberships, error: membershipError } = await supabase
      .from("member_memberships")
      .select("id,player_id,billing_cycle,stripe_customer_id,stripe_subscription_id")
      .not("stripe_subscription_id", "is", null)

    if (membershipError) throw membershipError

    let synced = 0

    for (const membership of memberships || []) {
      if (!membership.stripe_subscription_id) continue

      let startingAfter: string | undefined
      do {
        const page = await stripe.invoices.list({
          subscription: membership.stripe_subscription_id,
          status: "paid",
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        })

        for (const invoice of page.data) {
          if (await upsertStripeInvoice(stripe, supabase, membership, invoice)) synced += 1
        }

        startingAfter = page.has_more && page.data.length ? page.data[page.data.length - 1].id : undefined
      } while (startingAfter)
    }

    const [payments, topups] = await Promise.all([
      listPayments(supabase),
      listWalletTopups(supabase),
    ])
    return NextResponse.json({ ok: true, synced, payments, topups })
  } catch (error: any) {
    console.error("membership accounting sync error", error)
    return NextResponse.json({ error: error?.message || "Stripe-Zahlungen konnten nicht synchronisiert werden." }, { status: 500 })
  }
}

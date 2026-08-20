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

function stripeId(value: string | Stripe.Customer | Stripe.Subscription | null | undefined) {
  if (!value) return null
  return typeof value === "string" ? value : value.id
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
      const requestId = session.metadata?.membership_request_id || session.client_reference_id

      if (!requestId) {
        console.warn("Stripe checkout completed without membership_request_id", session.id)
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

      const { data: requestRows, error: requestRowsError } = await supabase
        .from("membership_change_request_modules")
        .select("module_id,monthly_price_snapshot,annual_price_snapshot")
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
            annual_price_snapshot: Number(row.annual_price_snapshot || 0),
          })),
        )

      if (insertError) throw insertError

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

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as any
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ||
            invoice.parent?.subscription_details?.subscription ||
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

import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (configured) return configured
  return new URL(request.url).origin
}

async function applyPaidRequest(
  supabase: ReturnType<typeof createClient>,
  args: {
    requestId: string
    membershipId: string
    billingCycle: "monthly" | "annual"
    playerId: string
    stripeCustomerId: string | null
    stripeSubscriptionId: string
    stripeStatus: string
    requestRows: Array<{
      module_id: string
      monthly_price_snapshot: number
      annual_price_snapshot: number
    }>
  },
) {
  const now = new Date().toISOString()

  const { error: membershipError } = await supabase
    .from("member_memberships")
    .update({
      billing_cycle: args.billingCycle,
      payment_method: "stripe",
      status: args.stripeStatus === "active" || args.stripeStatus === "trialing" ? "active" : "paused",
      stripe_customer_id: args.stripeCustomerId,
      stripe_subscription_id: args.stripeSubscriptionId,
      stripe_status: args.stripeStatus,
      updated_at: now,
    })
    .eq("id", args.membershipId)

  if (membershipError) throw membershipError

  const { error: deleteError } = await supabase
    .from("member_membership_modules")
    .delete()
    .eq("membership_id", args.membershipId)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from("member_membership_modules")
    .insert(
      args.requestRows.map((row) => ({
        membership_id: args.membershipId,
        module_id: row.module_id,
        monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
        annual_price_snapshot: Number(row.annual_price_snapshot || 0),
      })),
    )

  if (insertError) throw insertError

  const { error: approveError } = await supabase
    .from("membership_change_requests")
    .update({
      payment_status: "paid",
      paid_at: now,
      requested_status: "approved",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", args.requestId)

  if (approveError) throw approveError
}

export async function POST(request: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY fehlt." }, { status: 500 })
    }
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: "Supabase Server-Konfiguration fehlt." }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!token) {
      return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestId = String(body?.requestId || "").trim()

    if (!requestId) {
      return NextResponse.json({ error: "requestId fehlt." }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const user = authData?.user

    if (authError || !user) {
      return NextResponse.json({ error: "Sitzung ungültig oder abgelaufen." }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("player_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !profile?.player_id) {
      return NextResponse.json({ error: "Kein Vereinsmitglied mit diesem Konto verknüpft." }, { status: 403 })
    }

    const { data: changeRequest, error: requestError } = await supabase
      .from("membership_change_requests")
      .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,payment_status")
      .eq("id", requestId)
      .eq("player_id", profile.player_id)
      .single()

    if (requestError || !changeRequest) {
      return NextResponse.json({ error: "Mitgliedschaftsanfrage wurde nicht gefunden." }, { status: 404 })
    }

    if (changeRequest.requested_status !== "pending") {
      return NextResponse.json({ error: "Diese Anfrage ist nicht mehr offen." }, { status: 409 })
    }

    if (changeRequest.payment_method !== "stripe") {
      return NextResponse.json({ error: "Diese Anfrage ist nicht für Stripe vorgesehen." }, { status: 400 })
    }

    if (changeRequest.payment_status === "paid") {
      return NextResponse.json({ error: "Diese Anfrage wurde bereits bezahlt." }, { status: 409 })
    }

    const { data: requestRows, error: requestModulesError } = await supabase
      .from("membership_change_request_modules")
      .select("module_id,monthly_price_snapshot,annual_price_snapshot")
      .eq("request_id", requestId)

    if (requestModulesError) throw requestModulesError

    const moduleIds = (requestRows || []).map((row) => row.module_id)
    if (moduleIds.length === 0) {
      return NextResponse.json({ error: "Für diese Anfrage wurden keine Module gefunden." }, { status: 400 })
    }

    const { data: modules, error: modulesError } = await supabase
      .from("membership_modules")
      .select("id,code,name,is_active")
      .in("id", moduleIds)

    if (modulesError) throw modulesError

    const activeModules = (modules || []).filter((module) => module.is_active)
    if (activeModules.length !== moduleIds.length) {
      return NextResponse.json({ error: "Mindestens ein gewähltes Modul ist nicht mehr aktiv." }, { status: 409 })
    }

    const suffix = changeRequest.billing_cycle === "monthly" ? "monthly" : "yearly"
    const lookupKeys = activeModules.map((module) => `${module.code}_${suffix}`)

    const stripe = new Stripe(stripeSecretKey)
    const prices = await stripe.prices.list({
      lookup_keys: lookupKeys,
      active: true,
      limit: 100,
      expand: ["data.product"],
    })

    const priceByLookupKey = new Map(
      prices.data
        .filter((price) => price.lookup_key)
        .map((price) => [price.lookup_key as string, price]),
    )

    const missingKeys = lookupKeys.filter((key) => !priceByLookupKey.has(key))
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: `Stripe-Preis nicht gefunden: ${missingKeys.join(", ")}` },
        { status: 500 },
      )
    }

    const desiredPriceIds = lookupKeys.map((key) => priceByLookupKey.get(key)!.id)

    let existingStripeCustomerId: string | null = null
    let existingStripeSubscriptionId: string | null = null
    let existingMembershipId: string | null = null

    if (changeRequest.current_membership_id) {
      const { data: membership, error: membershipError } = await supabase
        .from("member_memberships")
        .select("id,stripe_customer_id,stripe_subscription_id")
        .eq("id", changeRequest.current_membership_id)
        .maybeSingle()

      if (membershipError) throw membershipError

      existingMembershipId = membership?.id || null
      existingStripeCustomerId = membership?.stripe_customer_id || null
      existingStripeSubscriptionId = membership?.stripe_subscription_id || null
    }

    // Bestehendes Stripe-Abo direkt ändern – kein zweites Abo anlegen.
    if (existingStripeSubscriptionId && existingMembershipId) {
      const subscription = await stripe.subscriptions.retrieve(existingStripeSubscriptionId, {
        expand: ["items.data.price", "customer"],
      })

      if (subscription.status === "canceled") {
        return NextResponse.json(
          { error: "Das bestehende Stripe-Abo ist bereits beendet. Bitte lade die Seite neu." },
          { status: 409 },
        )
      }

      const existingItems = subscription.items.data
      const usedDesired = new Set<string>()
      const items: Stripe.SubscriptionUpdateParams.Item[] = []

      for (const item of existingItems) {
        const currentPriceId =
          typeof item.price === "string" ? item.price : item.price.id

        if (desiredPriceIds.includes(currentPriceId) && !usedDesired.has(currentPriceId)) {
          items.push({ id: item.id, price: currentPriceId, quantity: 1 })
          usedDesired.add(currentPriceId)
        } else {
          items.push({ id: item.id, deleted: true })
        }
      }

      for (const priceId of desiredPriceIds) {
        if (!usedDesired.has(priceId)) {
          items.push({ price: priceId, quantity: 1 })
        }
      }

      const updatedSubscription = await stripe.subscriptions.update(existingStripeSubscriptionId, {
        items,
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        metadata: {
          ...subscription.metadata,
          membership_request_id: requestId,
          player_id: String(profile.player_id),
          billing_cycle: String(changeRequest.billing_cycle),
        },
      })

      const customerId =
        typeof updatedSubscription.customer === "string"
          ? updatedSubscription.customer
          : updatedSubscription.customer?.id || existingStripeCustomerId

      // pending_if_incomplete ist hier entscheidend:
      // Wenn die sofortige Rechnung nicht bezahlt werden kann, wendet Stripe
      // die Paketänderung NICHT an und liefert pending_update zurück.
      if (updatedSubscription.pending_update) {
        return NextResponse.json(
          {
            error:
              "Die Stripe-Zahlung für die Paketänderung konnte nicht abgeschlossen werden. Dein bisheriges Paket bleibt unverändert. Bitte prüfe deine Zahlungsmethode und versuche es erneut.",
            paymentPending: true,
            subscriptionId: updatedSubscription.id,
          },
          { status: 402 },
        )
      }

      // Kein pending_update = Änderung wurde von Stripe tatsächlich angewendet
      // (z. B. Zahlung erfolgreich oder Änderung ohne zusätzlichen Zahlbetrag).
      await applyPaidRequest(supabase, {
        requestId,
        membershipId: existingMembershipId,
        billingCycle: changeRequest.billing_cycle,
        playerId: String(profile.player_id),
        stripeCustomerId: customerId || null,
        stripeSubscriptionId: updatedSubscription.id,
        stripeStatus: updatedSubscription.status,
        requestRows: (requestRows || []).map((row) => ({
          module_id: row.module_id,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })),
      })

      return NextResponse.json({
        updated: true,
        subscriptionId: updatedSubscription.id,
        redirectUrl: `${getBaseUrl(request)}/member-membership?stripe=updated`,
      })
    }

    // Erstabschluss: normales Stripe Checkout.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = desiredPriceIds.map((priceId) => ({
      price: priceId,
      quantity: 1,
    }))

    const baseUrl = getBaseUrl(request)

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      success_url: `${baseUrl}/member-membership?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/member-membership?stripe=cancelled`,
      customer: existingStripeCustomerId || undefined,
      customer_email: existingStripeCustomerId ? undefined : user.email || undefined,
      client_reference_id: requestId,
      metadata: {
        membership_request_id: requestId,
        player_id: String(profile.player_id),
        billing_cycle: String(changeRequest.billing_cycle),
      },
      subscription_data: {
        metadata: {
          membership_request_id: requestId,
          player_id: String(profile.player_id),
          billing_cycle: String(changeRequest.billing_cycle),
        },
      },
      allow_promotion_codes: false,
    })

    if (!session.url) {
      return NextResponse.json({ error: "Stripe Checkout konnte nicht gestartet werden." }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("stripe checkout/update error:", error)
    return NextResponse.json(
      { error: error?.message || "Stripe-Zahlung konnte nicht gestartet oder angepasst werden." },
      { status: 500 },
    )
  }
}

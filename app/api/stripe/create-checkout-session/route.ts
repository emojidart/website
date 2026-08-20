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

    const { data: requestModules, error: requestModulesError } = await supabase
      .from("membership_change_request_modules")
      .select("module_id")
      .eq("request_id", requestId)

    if (requestModulesError) throw requestModulesError

    const moduleIds = (requestModules || []).map((row) => row.module_id)
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

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lookupKeys.map((key) => ({
      price: priceByLookupKey.get(key)!.id,
      quantity: 1,
    }))

    let existingStripeCustomerId: string | null = null
    let existingStripeSubscriptionId: string | null = null

    if (changeRequest.current_membership_id) {
      const { data: membership } = await supabase
        .from("member_memberships")
        .select("stripe_customer_id,stripe_subscription_id")
        .eq("id", changeRequest.current_membership_id)
        .maybeSingle()

      existingStripeCustomerId = membership?.stripe_customer_id || null
      existingStripeSubscriptionId = membership?.stripe_subscription_id || null
    }

    // Bestehende Stripe-Abos werden später über einen eigenen Änderungsflow angepasst.
    // Dadurch verhindern wir versehentlich ein zweites paralleles Abo.
    if (existingStripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "Für deine bestehende Stripe-Mitgliedschaft ist bereits ein Abo aktiv. Paketänderungen werden im nächsten Schritt direkt am bestehenden Abo umgesetzt.",
        },
        { status: 409 },
      )
    }

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
    console.error("stripe create checkout error:", error)
    return NextResponse.json(
      { error: error?.message || "Stripe Checkout konnte nicht gestartet werden." },
      { status: 500 },
    )
  }
}

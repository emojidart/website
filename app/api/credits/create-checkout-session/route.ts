import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function baseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
}

function quote(credit: number) {
  const percent = Number(process.env.CREDIT_STRIPE_PERCENT_FEE || "1.5") / 100
  const fixed = Number(process.env.CREDIT_STRIPE_FIXED_FEE_CENTS || "25") / 100
  const gross = Math.ceil(((credit + fixed) / (1 - percent)) * 100) / 100
  return { credit, fee: Number((gross - credit).toFixed(2)), gross }
}

export async function POST(request: Request) {
  try {
    if (!stripeSecretKey || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server-Konfiguration unvollständig." }, { status: 500 })
    }

    const auth = request.headers.get("authorization") || ""
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
    if (!token) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const rawAmount = Number(body?.amount)
    const quoteOnly = body?.quoteOnly === true

    if (!Number.isFinite(rawAmount)) {
      return NextResponse.json({ error: "Bitte einen gültigen Betrag eingeben." }, { status: 400 })
    }

    const amountCents = Math.round(rawAmount * 100)
    if (amountCents < 100) {
      return NextResponse.json({ error: "Der Mindestbetrag beträgt 1,00 €." }, { status: 400 })
    }
    if (amountCents > 50000) {
      return NextResponse.json({ error: "Der maximale Aufladebetrag beträgt 500,00 €." }, { status: 400 })
    }

    const amount = amountCents / 100

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (!user) return NextResponse.json({ error: "Sitzung ungültig oder abgelaufen." }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles").select("player_id").eq("user_id", user.id).single()
    if (profileError || !profile?.player_id) {
      return NextResponse.json({ error: "Kein Vereinsmitglied verknüpft." }, { status: 403 })
    }

    const q = quote(amount)
    if (quoteOnly) return NextResponse.json(q)

    const { data: topup, error: topupError } = await supabase.from("wallet_topups").insert({
      player_id: profile.player_id,
      credit_amount: q.credit,
      fee_charged: q.fee,
      gross_amount: q.gross,
      status: "pending",
    }).select("id").single()
    if (topupError || !topup) throw topupError || new Error("Topup konnte nicht angelegt werden.")

    const stripe = new Stripe(stripeSecretKey)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(q.gross * 100),
          product_data: {
            name: `${q.credit.toFixed(2)} € EMD Guthaben`,
            description: `inkl. ${q.fee.toFixed(2)} € Zahlungsgebühr`,
          },
        },
      }],
      success_url: `${baseUrl(request)}/member-card?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(request)}/member-card?topup=cancelled`,
      customer_email: user.email || undefined,
      client_reference_id: String(topup.id),
      metadata: {
        payment_kind: "credit_topup",
        wallet_topup_id: String(topup.id),
        player_id: String(profile.player_id),
        credit_amount_cents: String(Math.round(q.credit * 100)),
        fee_charged_cents: String(Math.round(q.fee * 100)),
      },
    })

    await supabase.from("wallet_topups").update({ stripe_checkout_session_id: session.id }).eq("id", topup.id)
    return NextResponse.json({ url: session.url, ...q })
  } catch (e: any) {
    console.error("credit topup checkout error", e)
    return NextResponse.json({ error: e?.message || "Guthaben-Aufladung konnte nicht gestartet werden." }, { status: 500 })
  }
}

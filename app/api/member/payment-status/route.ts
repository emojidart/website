import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
    }
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
    const { data: profile, error: profileError } = await db.from("user_profiles").select("player_id").eq("user_id", user.id).maybeSingle()
    if (profileError || !profile?.player_id) return NextResponse.json({ error: "Kein Mitgliedsprofil" }, { status: 404 })
    const { data: membership, error: membershipError } = await db.from("member_memberships")
      .select("id,status,payment_failed_at,payment_grace_until,stripe_subscription_id,payment_method")
      .eq("player_id", profile.player_id).eq("payment_method", "stripe").order("created_at", { ascending: false }).limit(1).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership?.stripe_subscription_id || !membership.payment_failed_at) return NextResponse.json({ hasIssue: false })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const unpaid: Array<{ id: string; amount: number; url: string | null }> = []
    for await (const invoice of stripe.invoices.list({ subscription: membership.stripe_subscription_id, status: "open", limit: 100 })) {
      if (Number(invoice.amount_remaining || 0) > 0) unpaid.push({ id: invoice.id, amount: Number(invoice.amount_remaining || 0), url: invoice.hosted_invoice_url })
    }
    const deadline = membership.payment_grace_until
    const expired = deadline ? Date.parse(deadline) <= Date.now() : false
    return NextResponse.json({ hasIssue: unpaid.length > 0, expired, deadline, unpaidCount: unpaid.length,
      amountCents: unpaid.reduce((sum, item) => sum + item.amount, 0),
      invoices: unpaid.map(({ id, amount, url }) => ({ id, amountCents: amount, url })) })
  } catch (error) {
    console.error("payment-status error", error)
    return NextResponse.json({ error: "Zahlungsstatus derzeit nicht verfügbar" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function endOfRequestedDayUnix(dateISO: string) {
  const date = new Date(`${dateISO}T23:59:59+02:00`)
  return Math.floor(date.getTime() / 1000)
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
      return NextResponse.json(
        { error: "Sitzung ungültig oder abgelaufen." },
        { status: 401 },
      )
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (adminError || !adminProfile?.is_admin) {
      return NextResponse.json(
        { error: "Nur Administratoren dürfen Kündigungen bestätigen." },
        { status: 403 },
      )
    }

    const { data: changeRequest, error: changeRequestError } = await supabase
      .from("membership_change_requests")
      .select("id,player_id,current_membership_id,requested_status,request_type,requested_end_on")
      .eq("id", requestId)
      .single()

    if (changeRequestError || !changeRequest) {
      return NextResponse.json(
        { error: "Kündigungsanfrage wurde nicht gefunden." },
        { status: 404 },
      )
    }

    if (changeRequest.request_type !== "cancel") {
      return NextResponse.json(
        { error: "Diese Anfrage ist keine Kündigungsanfrage." },
        { status: 400 },
      )
    }

    if (changeRequest.requested_status !== "pending") {
      return NextResponse.json(
        { error: "Diese Kündigungsanfrage ist nicht mehr offen." },
        { status: 409 },
      )
    }

    if (!changeRequest.current_membership_id) {
      return NextResponse.json(
        { error: "Zu dieser Anfrage wurde keine Mitgliedschaft gefunden." },
        { status: 400 },
      )
    }

    if (!changeRequest.requested_end_on) {
      return NextResponse.json(
        { error: "Bei dieser Kündigungsanfrage fehlt das Kündigungsdatum." },
        { status: 400 },
      )
    }

    const { data: membership, error: membershipError } = await supabase
      .from("member_memberships")
      .select("id,payment_method,stripe_subscription_id,status")
      .eq("id", changeRequest.current_membership_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Die Mitgliedschaft wurde nicht gefunden." },
        { status: 404 },
      )
    }

    const now = new Date()
    const requestedEnd = new Date(`${changeRequest.requested_end_on}T23:59:59+02:00`)
    const immediate = requestedEnd.getTime() <= now.getTime()

    let stripeStatus: string | null = null

    if (membership.payment_method === "stripe" && membership.stripe_subscription_id) {
      const stripe = new Stripe(stripeSecretKey)

      if (immediate) {
        const cancelled = await stripe.subscriptions.cancel(
          membership.stripe_subscription_id,
        )
        stripeStatus = cancelled.status
      } else {
        const updated = await stripe.subscriptions.update(
          membership.stripe_subscription_id,
          {
            cancel_at: endOfRequestedDayUnix(changeRequest.requested_end_on),
          },
        )
        stripeStatus = updated.status
      }
    }

    const timestamp = new Date().toISOString()

    const membershipUpdate: Record<string, unknown> = {
      ends_on: changeRequest.requested_end_on,
      updated_at: timestamp,
    }

    if (immediate) {
      membershipUpdate.status = "cancelled"
    }

    if (stripeStatus) {
      membershipUpdate.stripe_status = stripeStatus
    }

    const { error: updateMembershipError } = await supabase
      .from("member_memberships")
      .update(membershipUpdate)
      .eq("id", membership.id)

    if (updateMembershipError) throw updateMembershipError

    const { error: updateRequestError } = await supabase
      .from("membership_change_requests")
      .update({
        requested_status: "approved",
        reviewed_by: user.id,
        reviewed_at: timestamp,
        updated_at: timestamp,
      })
      .eq("id", changeRequest.id)

    if (updateRequestError) throw updateRequestError

    return NextResponse.json({
      ok: true,
      immediate,
      requestedEndOn: changeRequest.requested_end_on,
      stripeStatus,
    })
  } catch (error: any) {
    console.error("stripe membership cancellation error:", error)
    return NextResponse.json(
      { error: error?.message || "Die Kündigung konnte nicht verarbeitet werden." },
      { status: 500 },
    )
  }
}

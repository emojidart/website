import { NextRequest, NextResponse } from "next/server"
import { firebaseAdmin as admin } from "@/lib/firebase-admin"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { user_id, title, message, data } = body

    if (!user_id || !title || !message) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      )
    }

    // 🔎 FCM Token aus DB holen
    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", user_id)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: "No tokens found" },
        { status: 404 }
      )
    }

    // 📦 Nachricht bauen
    const payload = {
      notification: {
        title,
        body: message,
      },
      data: data || {},
    }

    // 🚀 An alle Tokens senden
    const responses = await Promise.all(
      tokens.map((t: any) =>
        admin.messaging().send({
          token: t.token,
          ...payload,
        })
      )
    )

    return NextResponse.json({
      success: true,
      sent: responses.length,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

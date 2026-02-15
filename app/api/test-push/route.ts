import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function makeSupabase() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const user_id: string | null = body?.user_id ?? null
    const title: string | null = body?.title ?? null
    const message: string | null = body?.message ?? null
    const data: Record<string, any> = body?.data ?? {}

    if (!user_id || !title || !message) {
      return NextResponse.json({ success: false, error: "Missing user_id/title/message" }, { status: 400 })
    }

    const supabase = makeSupabase()

    // ✅ Token aus deiner Tabelle holen:
    // PASST DAS BITTE AN, falls deine Tabelle/Spalte anders heißt:
    const { data: tokenRow, error } = await supabase
      .from("fcm_tokens") // <- falls bei dir anders, sag mir den Tabellennamen
      .select("token")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    const token = (tokenRow as any)?.token as string | undefined

    if (!token) {
      return NextResponse.json({ success: false, error: "No token for this user" }, { status: 404 })
    }

    const response = await firebaseAdmin.messaging().send({
      token,
      notification: {
        title,
        body: message,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
      ),
    })

    return NextResponse.json({ success: true, response })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

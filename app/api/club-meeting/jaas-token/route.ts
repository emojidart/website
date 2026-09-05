import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSign } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const APP_ID = process.env.JAAS_APP_ID || ""
const KEY_ID = process.env.JAAS_API_KEY_ID || ""
const PRIVATE_KEY = (process.env.JAAS_PRIVATE_KEY || "").replace(/\\n/g, "\n")

function base64url(value: string | Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function signJwt(payload: Record<string, unknown>) {
  const header = { alg: "RS256", kid: KEY_ID, typ: "JWT" }
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signer = createSign("RSA-SHA256")
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(PRIVATE_KEY)

  return `${signingInput}.${base64url(signature)}`
}

async function getUserAndModerator(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || ""
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!accessToken) {
    return { user: null, moderator: false }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return { user: null, moderator: false }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userResult, error: userError } = await client.auth.getUser(accessToken)
  if (userError || !userResult.user) return { user: null, moderator: false }

  const user = userResult.user
  let moderator = Boolean(user.app_metadata?.is_admin || user.app_metadata?.role === "admin")

  const { data: profile } = await client
    .from("user_profiles")
    .select("is_admin,player_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.is_admin) moderator = true

  if (!moderator && profile?.player_id) {
    const { data: permission } = await client
      .from("user_page_permissions")
      .select("allowed")
      .eq("player_id", profile.player_id)
      .eq("page_key", "club-meeting")
      .eq("allowed", true)
      .maybeSingle()

    moderator = Boolean(permission?.allowed)
  }

  return { user, moderator }
}

export async function POST(request: NextRequest) {
  if (!APP_ID || !KEY_ID || !PRIVATE_KEY) {
    return NextResponse.json(
      { error: "JaaS ist noch nicht vollständig konfiguriert." },
      { status: 500 },
    )
  }

  let body: { roomName?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  const roomName = String(body.roomName || "").trim()
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(roomName)) {
    return NextResponse.json({ error: "Ungültiger Meetingraum." }, { status: 400 })
  }

  const { user, moderator } = await getUserAndModerator(request)

  // Gäste dürfen dank der aktivierten JaaS-Einstellung ohne JWT teilnehmen.
  // Für eingeloggte Mitglieder erzeugen wir ein JWT, damit Name und Rolle automatisch gesetzt werden.
  if (!user) {
    return NextResponse.json({ appId: APP_ID, token: null, moderator: false })
  }

  const now = Math.floor(Date.now() / 1000)
  const metadata = user.user_metadata || {}
  const displayName =
    metadata.full_name ||
    metadata.display_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "Mitglied"

  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: APP_ID,
    room: roomName,
    nbf: now - 10,
    exp: now + 60 * 60 * 3,
    context: {
      user: {
        id: user.id,
        name: displayName,
        email: user.email || "",
        moderator: moderator ? "true" : "false",
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
        "sip-outbound-call": false,
      },
      room: { regex: false },
    },
  }

  return NextResponse.json({
    appId: APP_ID,
    token: signJwt(payload),
    moderator,
    displayName,
  })
}

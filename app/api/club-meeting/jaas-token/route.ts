import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSign } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function env(name: string) {
  return (process.env[name] || "").trim()
}

function getPrivateKey() {
  const base64Value = (process.env.JAAS_PRIVATE_KEY_BASE64 || "").trim()
  if (base64Value) {
    try {
      return Buffer.from(base64Value.replace(/\s+/g, ""), "base64").toString("utf8").trim()
    } catch (error) {
      console.error("JAAS_PRIVATE_KEY_BASE64 decode failed:", error)
    }
  }

  let value = process.env.JAAS_PRIVATE_KEY || ""
  value = value.replace(/\\n/g, "\n").trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).replace(/\\n/g, "\n").trim()
  }

  // Netlify can occasionally flatten a PEM into one line. Rebuild it if possible.
  const oneLine = value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
  const match = oneLine.match(/^-----BEGIN (RSA )?PRIVATE KEY-----\s+(.+?)\s+-----END (RSA )?PRIVATE KEY-----$/)
  if (match) {
    const label = match[1] ? "RSA PRIVATE KEY" : "PRIVATE KEY"
    const body = match[2].replace(/\s+/g, "")
    const lines = body.match(/.{1,64}/g) || []
    value = `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`
  }

  return value
}


function base64url(value: string | Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function signJwt(payload: Record<string, unknown>, keyId: string, privateKey: string) {
  const header = { alg: "RS256", kid: keyId, typ: "JWT" }
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signer = createSign("RSA-SHA256")
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(privateKey)

  return `${signingInput}.${base64url(signature)}`
}

async function getUserAndModerator(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || ""
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!accessToken) return { user: null, moderator: false }

  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
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
  try {
    const appId = env("JAAS_APP_ID")
    const keyId = env("JAAS_API_KEY_ID")
    const privateKey = getPrivateKey()

    if (!appId || !keyId || !privateKey) {
      return NextResponse.json(
        { error: "JaaS ist noch nicht vollständig konfiguriert. Bitte JAAS_APP_ID, JAAS_API_KEY_ID und JAAS_PRIVATE_KEY_BASE64 (empfohlen) bzw. JAAS_PRIVATE_KEY in Netlify prüfen." },
        { status: 500 },
      )
    }

    if (!privateKey.includes("BEGIN PRIVATE KEY") && !privateKey.includes("BEGIN RSA PRIVATE KEY")) {
      return NextResponse.json(
        { error: "JAAS_PRIVATE_KEY hat kein gültiges PEM-Format. Bitte den kompletten Inhalt der .pk-Datei inklusive BEGIN/END PRIVATE KEY einfügen." },
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

    // Gäste dürfen durch die aktivierte JaaS-Einstellung ohne JWT teilnehmen.
    if (!user) {
      return NextResponse.json({ appId, token: null, moderator: false })
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
      sub: appId,
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

    let token: string
    try {
      token = signJwt(payload, keyId, privateKey)
    } catch (error) {
      console.error("JaaS JWT signing failed:", error)
      return NextResponse.json(
        { error: "Der JaaS Private Key konnte nicht gelesen werden. Bitte JAAS_PRIVATE_KEY_BASE64 bzw. JAAS_PRIVATE_KEY in Netlify prüfen und danach neu deployen." },
        { status: 500 },
      )
    }

    return NextResponse.json({ appId, token, moderator, displayName })
  } catch (error) {
    console.error("JaaS token route failed:", error)
    return NextResponse.json(
      { error: "Der Meeting-Server konnte den JaaS-Zugang nicht erstellen. Bitte Netlify Function-Log prüfen." },
      { status: 500 },
    )
  }
}

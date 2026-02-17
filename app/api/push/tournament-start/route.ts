import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import admin from "firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type WebhookPayload = {
  record?: any
  old_record?: any
  new?: any
  old?: any
}

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function initFirebase() {
  if (admin.apps.length > 0) return

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  let serviceAccount: any

  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8")
    serviceAccount = JSON.parse(decoded)
  } else if (jsonRaw) {
    serviceAccount = JSON.parse(jsonRaw)
  } else {
    throw new Error("Missing Firebase service account env")
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

function isNullish(v: any) {
  return v === null || v === undefined || v === ""
}

function buildClickUrl(tournamentType: string, tournamentId: string, matchId: number) {
  const params = new URLSearchParams()
  params.set("tournamentType", tournamentType)
  params.set("tournamentId", tournamentId)
  params.set("matchId", String(matchId))
  return `/?${params.toString()}`
}

async function tokensForUsers(supabase: any, userIds: string[]) {
  const { data, error } = await supabase
    .from("fcm_tokens")
    .select("user_id, token")
    .in("user_id", userIds)

  if (error) throw error

  const map = new Map<string, string[]>()

  for (const row of data ?? []) {
    if (!row?.user_id || !row?.token) continue
    const arr = map.get(row.user_id) ?? []
    arr.push(row.token)
    map.set(row.user_id, arr)
  }

  return map
}

/**
 * 🔥 FIXED: club_players.id IST user_id
 * club_players.player_id = spieldatenbank.id
 */
async function resolveUserIdByPlayerId(supabase: any, playerId: string): Promise<string | null> {
  if (!playerId) return null

  const { data, error } = await supabase
    .from("club_players")
    .select("id")
    .eq("player_id", playerId)
    .limit(1)

  if (!error && data && data.length > 0 && data[0]?.id) {
    return String(data[0].id)
  }

  return null
}

async function sendPush(params: {
  tokens: string[]
  title: string
  body: string
  clickUrl: string
  tag: string
  notifId: string
  extraData?: Record<string, string>
}) {
  const { tokens, title, body, clickUrl, tag, notifId, extraData } = params
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 }

  initFirebase()

  const message: admin.messaging.MulticastMessage = {
    tokens,
    data: {
      title,
      body,
      clickUrl,
      path: clickUrl,
      tag,
      notif_id: notifId,
      ...extraData,
    },
    android: {
      priority: "high",
    },
  }

  return await admin.messaging().sendEachForMulticast(message)
}

export async function POST(req: Request) {
  try {
    const secret = process.env.WEBHOOK_SECRET || ""
    const got = req.headers.get("x-webhook-secret") || ""

    if (!secret || got !== secret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await req.json()) as WebhookPayload
    const rec = payload.record ?? payload.new ?? null
    const old = payload.old_record ?? payload.old ?? null

    if (!rec) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const newMachine = rec.machine_number ?? null
    const oldMachine = old?.machine_number ?? null
    const winner = rec.winner ?? null
    const alreadySent = rec.push_started_sent_at ?? null

    const isStart =
      isNullish(oldMachine) &&
      !isNullish(newMachine) &&
      isNullish(winner) &&
      isNullish(alreadySent)

    if (!isStart) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const tournamentType = String(rec.tournament_type)
    const tournamentId = String(rec.tournament_id)
    const matchId = Number(rec.match_id)

    const p1Name = String(rec.player1 || "")
    const p2Name = String(rec.player2 || "")
    const p1Id = rec.player1_id ? String(rec.player1_id) : ""
    const p2Id = rec.player2_id ? String(rec.player2_id) : ""

    const isFreilos = (name: string) =>
      (name ?? "").toLowerCase().trim().startsWith("freilos")

    const supabase = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    )

    const [p1UserId, p2UserId] = await Promise.all([
      !isFreilos(p1Name) && p1Id ? resolveUserIdByPlayerId(supabase, p1Id) : null,
      !isFreilos(p2Name) && p2Id ? resolveUserIdByPlayerId(supabase, p2Id) : null,
    ])

    console.log("[tournament-start] resolved users", { p1UserId, p2UserId })

    const userIds = [p1UserId, p2UserId].filter(Boolean) as string[]

    const tokenMap = await tokensForUsers(supabase, userIds)

    console.log("[tournament-start] token counts", {
      p1: p1UserId ? (tokenMap.get(p1UserId)?.length ?? 0) : 0,
      p2: p2UserId ? (tokenMap.get(p2UserId)?.length ?? 0) : 0,
    })

    const machineNo = String(newMachine)
    const clickUrl = buildClickUrl(tournamentType, tournamentId, matchId)
    const tag = `tournament:${tournamentType}:${tournamentId}:match:${matchId}`

    const results: any[] = []

    if (p1UserId) {
      const tokens = tokenMap.get(p1UserId) ?? []
      const r = await sendPush({
        tokens,
        title: "🎯 Match startet",
        body: `${p1Name} vs. ${p2Name} · Automat ${machineNo}`,
        clickUrl,
        tag,
        notifId: `${tag}:${p1UserId}`, // 🔥 unique
        extraData: {
          kind: "tournament_match_start",
          opponent: p2Name,
        },
      })
      results.push({ user: p1UserId, success: r.successCount, failed: r.failureCount })
    }

    if (p2UserId) {
      const tokens = tokenMap.get(p2UserId) ?? []
      const r = await sendPush({
        tokens,
        title: "🎯 Match startet",
        body: `${p2Name} vs. ${p1Name} · Automat ${machineNo}`,
        clickUrl,
        tag,
        notifId: `${tag}:${p2UserId}`, // 🔥 unique
        extraData: {
          kind: "tournament_match_start",
          opponent: p1Name,
        },
      })
      results.push({ user: p2UserId, success: r.successCount, failed: r.failureCount })
    }

    await supabase
      .from("dko_match_states")
      .update({ push_started_sent_at: new Date().toISOString() })
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("match_id", matchId)

    return NextResponse.json({
      success: true,
      pushed: results,
    })
  } catch (err: any) {
    console.error("[push/tournament-start] error:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import admin from "firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type WebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: any
  old_record?: any
  // sometimes other shapes appear; we handle defensively
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

  // Recommended: store service account json as base64 in env FIREBASE_SERVICE_ACCOUNT_B64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  let serviceAccount: any
  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8")
    serviceAccount = JSON.parse(decoded)
  } else if (jsonRaw) {
    serviceAccount = JSON.parse(jsonRaw)
  } else {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_B64 (preferred) or FIREBASE_SERVICE_ACCOUNT_JSON in env",
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

function normNull(v: any) {
  return v === undefined ? null : v
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
  if (userIds.length === 0) return new Map<string, string[]>()

  const { data, error } = await supabase
    .from("fcm_tokens")
    .select("user_id, token, platform")
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

async function resolveUserIdByPlayerId(supabase: any, playerId: string): Promise<string | null> {
  if (!playerId) return null

  // 1) primary: club_players (player_id -> user_id)
  {
    const { data, error } = await supabase
      .from("club_players")
      .select("user_id")
      .eq("player_id", playerId)
      .not("user_id", "is", null)
      .limit(1)

    if (!error && data && data.length > 0 && data[0]?.user_id) {
      return String(data[0].user_id)
    }
  }

  // 2) fallback: spieldatenbank has user_id for some entries
  {
    const { data, error } = await supabase
      .from("spieldatenbank")
      .select("user_id")
      .eq("id", playerId)
      .maybeSingle()

    if (!error && data?.user_id) return String(data.user_id)
  }

  return null
}

async function sendPersonalizedPush(params: {
  tokens: string[]
  title: string
  body: string
  clickUrl: string
  tag: string
  notifId: string
  iconUrl?: string | null
  extraData?: Record<string, string>
}) {
  const { tokens, title, body, clickUrl, tag, notifId, iconUrl, extraData } = params
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0, responses: [] as any[] }

  initFirebase()

  // Data-only message for your Android service
  const message: admin.messaging.MulticastMessage = {
    tokens,
    data: {
      title,
      body,
      clickUrl,
      path: clickUrl, // some handlers use "path"
      tag,
      notif_id: notifId,
      iconUrl: iconUrl ?? "",
      ...((extraData ?? {}) as any),
    },
    android: {
      priority: "high",
    },
  }

  const res = await admin.messaging().sendEachForMulticast(message)
  return res
}

export async function POST(req: Request) {
  try {
    // --- Auth webhook secret
    const secret = process.env.WEBHOOK_SECRET || ""
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Server not configured: WEBHOOK_SECRET missing" },
        { status: 500 },
      )
    }

    const got = req.headers.get("x-webhook-secret") || ""
    if (got !== secret) {
      return NextResponse.json({ success: false, error: "Unauthorized webhook" }, { status: 401 })
    }

    const payload = (await req.json()) as WebhookPayload

    // Supabase Database Webhooks typically send record + old_record
    const rec = payload.record ?? payload.new ?? null
    const old = payload.old_record ?? payload.old ?? null

    if (!rec) {
      return NextResponse.json({ success: true, skipped: true, reason: "No record in payload" })
    }

    const newMachine = normNull(rec.machine_number)
    const oldMachine = normNull(old?.machine_number)

    const winnerNew = normNull(rec.winner)
    const alreadySent = normNull(rec.push_started_sent_at)

    // ✅ Start condition:
    // old.machine_number == null AND new.machine_number != null AND winner == null AND push_started_sent_at == null
    const isStart =
      isNullish(oldMachine) && !isNullish(newMachine) && isNullish(winnerNew) && isNullish(alreadySent)

    if (!isStart) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Not a match start transition",
      })
    }

    const tournamentType = String(rec.tournament_type || "")
    const tournamentId = String(rec.tournament_id || "")
    const matchId = Number(rec.match_id)

    if (!tournamentType || !tournamentId || !Number.isFinite(matchId)) {
      return NextResponse.json(
        { success: false, error: "Missing tournament_type/tournament_id/match_id" },
        { status: 400 },
      )
    }

    // Freilos? (your UI uses name startsWith("Freilos"))
    const p1Name = String(rec.player1 || "")
    const p2Name = String(rec.player2 || "")
    const p1Id = rec.player1_id ? String(rec.player1_id) : ""
    const p2Id = rec.player2_id ? String(rec.player2_id) : ""

    const isFreilos = (name: string) => (name ?? "").toLowerCase().trim().startsWith("freilos")

    // supabase service client
    const supabaseUrl = getEnv("SUPABASE_URL")
    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Resolve user ids (only if player has account)
    const [p1UserId, p2UserId] = await Promise.all([
      !isFreilos(p1Name) && p1Id ? resolveUserIdByPlayerId(supabase, p1Id) : Promise.resolve(null),
      !isFreilos(p2Name) && p2Id ? resolveUserIdByPlayerId(supabase, p2Id) : Promise.resolve(null),
    ])

    const userIds = [p1UserId, p2UserId].filter(Boolean) as string[]
    if (userIds.length === 0) {
      // Still mark as sent so it doesn't spam webhook calls forever for this match
      await supabase
        .from("dko_match_states")
        .update({ push_started_sent_at: new Date().toISOString() })
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .eq("match_id", matchId)

      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No users with accounts for this match",
      })
    }

    // tokens
    const tokenMap = await tokensForUsers(supabase, userIds)

    const machineNo = String(newMachine)
    const clickUrl = buildClickUrl(tournamentType, tournamentId, matchId)
    const tag = `tournament:${tournamentType}:${tournamentId}:match:${matchId}`
    const notifId = tag

    // personalized push per user
    const results: any[] = []

    if (p1UserId) {
      const tokens = tokenMap.get(p1UserId) ?? []
      const body = `${p1Name} vs. ${p2Name} · Automat ${machineNo}`
      const r = await sendPersonalizedPush({
        tokens,
        title: "🎯 Match startet",
        body,
        clickUrl,
        tag,
        notifId,
        extraData: {
          kind: "tournament_match_start",
          tournamentType,
          tournamentId,
          matchId: String(matchId),
          machineNumber: machineNo,
          opponent: p2Name,
        },
      })
      results.push({ user_id: p1UserId, tokens: tokens.length, success: r.successCount, failed: r.failureCount })
    }

    if (p2UserId) {
      const tokens = tokenMap.get(p2UserId) ?? []
      const body = `${p2Name} vs. ${p1Name} · Automat ${machineNo}`
      const r = await sendPersonalizedPush({
        tokens,
        title: "🎯 Match startet",
        body,
        clickUrl,
        tag,
        notifId,
        extraData: {
          kind: "tournament_match_start",
          tournamentType,
          tournamentId,
          matchId: String(matchId),
          machineNumber: machineNo,
          opponent: p1Name,
        },
      })
      results.push({ user_id: p2UserId, tokens: tokens.length, success: r.successCount, failed: r.failureCount })
    }

    // mark as sent
    const { error: markErr } = await supabase
      .from("dko_match_states")
      .update({ push_started_sent_at: new Date().toISOString() })
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("match_id", matchId)

    if (markErr) throw markErr

    return NextResponse.json({
      success: true,
      tournamentType,
      tournamentId,
      matchId,
      machine_number: newMachine,
      pushed: results,
    })
  } catch (err: any) {
    console.error("[push/tournament-start] error:", err)
    return NextResponse.json(
      { success: false, error: String(err?.message ?? err ?? "Unknown error") },
      { status: 500 },
    )
  }
}

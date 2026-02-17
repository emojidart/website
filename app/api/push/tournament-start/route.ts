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
  type?: string
  table?: string
  schema?: string
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
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_SERVICE_ACCOUNT_JSON")
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

function isNullish(v: any) {
  return v === null || v === undefined || v === ""
}

function normNull(v: any) {
  return v === undefined ? null : v
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
    .select("user_id, token, platform, updated_at")
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
 * ✅ DEIN SCHEMA (laut dir):
 * club_players.id = auth user id
 * club_players.player_id = spieldatenbank.id (dein "playerId")
 */
async function resolveUserIdByPlayerId(supabase: any, playerId: string): Promise<string | null> {
  if (!playerId) return null

  const { data, error } = await supabase
    .from("club_players")
    .select("id")
    .eq("player_id", playerId)
    .limit(1)

  if (!error && data && data.length > 0 && data[0]?.id) return String(data[0].id)
  return null
}

async function sendDataOnlyPush(params: {
  tokens: string[]
  title: string
  body: string
  clickUrl: string
  tag: string
  notifId: string
  extraData?: Record<string, string>
}) {
  const { tokens, title, body, clickUrl, tag, notifId, extraData } = params
  if (!tokens || tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      responses: [],
      note: "no_tokens",
    }
  }

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
      ...(extraData ?? {}),
    },
    android: { priority: "high" },
  }

  const res = await admin.messaging().sendEachForMulticast(message)
  return res
}

export async function POST(req: Request) {
  const startedAt = Date.now()

  // Wir geben IMMER Debug zurück, damit du im Netlify “Request details” direkt alles siehst.
  const debug: any = {
    stage: "start",
    took_ms: 0,
    auth: { ok: false },
    trigger: {
      isStart: false,
      old_machine: null as any,
      new_machine: null as any,
      winner: null as any,
      alreadySent: null as any,
    },
    record: {
      tournament_type: null as any,
      tournament_id: null as any,
      match_id: null as any,
      player1: null as any,
      player2: null as any,
      player1_id: null as any,
      player2_id: null as any,
    },
    resolved: {
      p1UserId: null as any,
      p2UserId: null as any,
      userIds: [] as string[],
      tokenCounts: {} as any,
    },
    firebase: {
      results: [] as any[],
    },
    db_mark_sent: { ok: false, error: null as any },
    skipped: null as any,
  }

  try {
    // --- Webhook Secret prüfen
    const secret = process.env.WEBHOOK_SECRET || ""
    const got = req.headers.get("x-webhook-secret") || ""
    debug.auth.ok = Boolean(secret) && got === secret

    if (!debug.auth.ok) {
      debug.stage = "unauthorized"
      debug.took_ms = Date.now() - startedAt
      return NextResponse.json({ success: false, debug }, { status: 401 })
    }

    const payload = (await req.json()) as WebhookPayload
    const rec = payload.record ?? payload.new ?? null
    const old = payload.old_record ?? payload.old ?? null

    if (!rec) {
      debug.stage = "no_record"
      debug.skipped = "No record in payload"
      debug.took_ms = Date.now() - startedAt
      return NextResponse.json({ success: true, debug })
    }

    // Trigger condition auswerten
    const newMachine = normNull(rec.machine_number)
    const oldMachine = normNull(old?.machine_number)
    const winnerNew = normNull(rec.winner)
    const alreadySent = normNull(rec.push_started_sent_at)

    debug.trigger.old_machine = oldMachine
    debug.trigger.new_machine = newMachine
    debug.trigger.winner = winnerNew
    debug.trigger.alreadySent = alreadySent

    const isStart =
      isNullish(oldMachine) && !isNullish(newMachine) && isNullish(winnerNew) && isNullish(alreadySent)

    debug.trigger.isStart = isStart

    // Record Basics
    const tournamentType = String(rec.tournament_type || "")
    const tournamentId = String(rec.tournament_id || "")
    const matchId = Number(rec.match_id)

    const p1Name = String(rec.player1 || "")
    const p2Name = String(rec.player2 || "")
    const p1Id = rec.player1_id ? String(rec.player1_id) : ""
    const p2Id = rec.player2_id ? String(rec.player2_id) : ""

    debug.record = {
      tournament_type: tournamentType,
      tournament_id: tournamentId,
      match_id: matchId,
      player1: p1Name,
      player2: p2Name,
      player1_id: p1Id,
      player2_id: p2Id,
    }

    if (!isStart) {
      debug.stage = "skipped_not_start"
      debug.skipped = "Not a match start transition"
      debug.took_ms = Date.now() - startedAt
      return NextResponse.json({ success: true, debug })
    }

    if (!tournamentType || !tournamentId || !Number.isFinite(matchId)) {
      debug.stage = "bad_request"
      debug.skipped = "Missing tournament_type/tournament_id/match_id"
      debug.took_ms = Date.now() - startedAt
      return NextResponse.json({ success: false, debug }, { status: 400 })
    }

    const isFreilos = (name: string) => (name ?? "").toLowerCase().trim().startsWith("freilos")

    // Supabase service client
    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // UserIDs für beide Spieler
    const [p1UserId, p2UserId] = await Promise.all([
      !isFreilos(p1Name) && p1Id ? resolveUserIdByPlayerId(supabase, p1Id) : Promise.resolve(null),
      !isFreilos(p2Name) && p2Id ? resolveUserIdByPlayerId(supabase, p2Id) : Promise.resolve(null),
    ])

    debug.resolved.p1UserId = p1UserId
    debug.resolved.p2UserId = p2UserId

    const userIds = [p1UserId, p2UserId].filter(Boolean) as string[]
    debug.resolved.userIds = userIds

    if (userIds.length === 0) {
      // trotzdem markieren, damit es nicht ständig feuert
      const { error } = await supabase
        .from("dko_match_states")
        .update({ push_started_sent_at: new Date().toISOString() })
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .eq("match_id", matchId)

      debug.db_mark_sent.ok = !error
      debug.db_mark_sent.error = error ? String(error.message ?? error) : null

      debug.stage = "skipped_no_users"
      debug.skipped = "No users with accounts for this match"
      debug.took_ms = Date.now() - startedAt
      return NextResponse.json({ success: true, debug })
    }

    // Tokens laden
    const tokenMap = await tokensForUsers(supabase, userIds)
    debug.resolved.tokenCounts = Object.fromEntries(userIds.map((u) => [u, tokenMap.get(u)?.length ?? 0]))

    const machineNo = String(newMachine)
    const clickUrl = buildClickUrl(tournamentType, tournamentId, matchId)
    const tag = `tournament:${tournamentType}:${tournamentId}:match:${matchId}`

    // Push pro User
    const firebaseResults: any[] = []

    if (p1UserId) {
      const tokens = tokenMap.get(p1UserId) ?? []
      const notifId = `${tag}:${p1UserId}` // ✅ unique pro user

      const r: any = await sendDataOnlyPush({
        tokens,
        title: "🎯 Match startet",
        body: `${p1Name} vs. ${p2Name} · Automat ${machineNo}`,
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

      firebaseResults.push({
        user_id: p1UserId,
        tokens: tokens.length,
        success: r?.successCount ?? 0,
        failed: r?.failureCount ?? 0,
        errors:
          (r?.responses ?? [])
            .filter((x: any) => !x.success)
            .map((x: any) => ({
              code: x.error?.code ?? null,
              message: x.error?.message ?? null,
            })) ?? [],
      })
    }

    if (p2UserId) {
      const tokens = tokenMap.get(p2UserId) ?? []
      const notifId = `${tag}:${p2UserId}` // ✅ unique pro user

      const r: any = await sendDataOnlyPush({
        tokens,
        title: "🎯 Match startet",
        body: `${p2Name} vs. ${p1Name} · Automat ${machineNo}`,
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

      firebaseResults.push({
        user_id: p2UserId,
        tokens: tokens.length,
        success: r?.successCount ?? 0,
        failed: r?.failureCount ?? 0,
        errors:
          (r?.responses ?? [])
            .filter((x: any) => !x.success)
            .map((x: any) => ({
              code: x.error?.code ?? null,
              message: x.error?.message ?? null,
            })) ?? [],
      })
    }

    debug.firebase.results = firebaseResults

    // Als “gesendet” markieren (damit webhook nicht spammt)
    const { error: markErr } = await supabase
      .from("dko_match_states")
      .update({ push_started_sent_at: new Date().toISOString() })
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("match_id", matchId)

    debug.db_mark_sent.ok = !markErr
    debug.db_mark_sent.error = markErr ? String(markErr.message ?? markErr) : null

    debug.stage = "done"
    debug.took_ms = Date.now() - startedAt

    return NextResponse.json({ success: true, debug })
  } catch (err: any) {
    debug.stage = "error"
    debug.took_ms = Date.now() - startedAt
    debug.error = String(err?.message ?? err ?? "Unknown error")
    return NextResponse.json({ success: false, debug }, { status: 500 })
  }
}

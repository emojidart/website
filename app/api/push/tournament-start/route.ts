// app/api/push/tournament-start/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

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

async function resolveAuthUserIdBySpielerId(supabase: any, spielerId: string): Promise<string | null> {
  if (!spielerId) return null

  const { data: cp, error: cpErr } = await supabase
    .from("club_players")
    .select("id")
    .eq("spieldatenbank_id", spielerId)
    .limit(1)
    .maybeSingle()

  if (cpErr) throw cpErr
  if (!cp?.id) return null

  const { data: up, error: upErr } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("player_id", String(cp.id))
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (upErr) throw upErr
  if (!up?.user_id) return null

  return String(up.user_id)
}

async function tokensForUsers(supabase: any, userIds: string[]) {
  const map = new Map<string, string[]>()
  if (userIds.length === 0) return map

  const { data, error } = await supabase
    .from("fcm_tokens")
    .select("user_id, token, platform")
    .in("user_id", userIds)
    .eq("platform", "android")

  if (error) throw error

  for (const row of data ?? []) {
    if (!row?.user_id || !row?.token) continue
    const uid = String(row.user_id)
    const arr = map.get(uid) ?? []
    arr.push(String(row.token))
    map.set(uid, arr)
  }

  return map
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "tournament-start" })
}

export async function POST(req: Request) {
  const started = Date.now()

  const debug: any = {
    stage: "start",
    took_ms: 0,
    auth: {},
    record: {},
    resolved: {},
    tokens: {},
    fcm: {},
    mark_sent: {},
    skipped: "",
    error: "",
  }

  try {
    // --- Secret check
    const secret = process.env.WEBHOOK_SECRET || ""
    const got = req.headers.get("x-webhook-secret") || ""
    debug.auth = { got: got ? "present" : "missing" }

    if (!secret) {
      debug.stage = "error_missing_server_secret"
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: false, debug, error: "WEBHOOK_SECRET missing" }, { status: 500 })
    }
    if (got !== secret) {
      debug.stage = "error_unauthorized"
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: false, debug, error: "Unauthorized webhook" }, { status: 401 })
    }

    const payload = (await req.json().catch(() => null)) as WebhookPayload | null
    if (!payload) {
      debug.stage = "error_bad_json"
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: false, debug, error: "Bad JSON" }, { status: 400 })
    }

    const rec = payload.record ?? payload.new ?? null
    const old = payload.old_record ?? payload.old ?? null

    if (!rec) {
      debug.stage = "skipped_no_record"
      debug.skipped = "No record in payload"
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: true, debug })
    }

    debug.record = {
      tournament_type: rec.tournament_type,
      tournament_id: rec.tournament_id,
      match_id: rec.match_id,
      player1: rec.player1,
      player2: rec.player2,
      player1_id: rec.player1_id,
      player2_id: rec.player2_id,
      machine_number: rec.machine_number,
      winner: rec.winner,
      push_started_sent_at: rec.push_started_sent_at,
      old_machine_number: old?.machine_number ?? null,
    }

    // --- Start condition
    const newMachine = normNull(rec.machine_number)
    const oldMachine = normNull(old?.machine_number)
    const winnerNew = normNull(rec.winner)
    const alreadySent = normNull(rec.push_started_sent_at)

    const isStart =
      isNullish(oldMachine) && !isNullish(newMachine) && isNullish(winnerNew) && isNullish(alreadySent)

    if (!isStart) {
      debug.stage = "skipped_not_start_transition"
      debug.skipped = "Not a match start transition"
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: true, debug })
    }

    const tournamentType = String(rec.tournament_type || "")
    const tournamentId = String(rec.tournament_id || "")
    const matchId = Number(rec.match_id)

    if (!tournamentType || !tournamentId || !Number.isFinite(matchId)) {
      debug.stage = "error_missing_ids"
      debug.took_ms = Date.now() - started
      return NextResponse.json(
        { success: false, debug, error: "Missing tournament_type/tournament_id/match_id" },
        { status: 400 },
      )
    }

    const p1Name = String(rec.player1 || "")
    const p2Name = String(rec.player2 || "")
    const p1SpielerId = rec.player1_id ? String(rec.player1_id) : ""
    const p2SpielerId = rec.player2_id ? String(rec.player2_id) : ""

    const isFreilos = (name: string) => (name ?? "").toLowerCase().trim().startsWith("freilos")

    // --- Supabase service client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)")
    if (!supabaseKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    debug.stage = "resolve_users"

    const [p1AuthUid, p2AuthUid] = await Promise.all([
      !isFreilos(p1Name) && p1SpielerId ? resolveAuthUserIdBySpielerId(supabase, p1SpielerId) : Promise.resolve(null),
      !isFreilos(p2Name) && p2SpielerId ? resolveAuthUserIdBySpielerId(supabase, p2SpielerId) : Promise.resolve(null),
    ])

    debug.resolved = {
      p1: { spieler_id: p1SpielerId, auth_uid: p1AuthUid },
      p2: { spieler_id: p2SpielerId, auth_uid: p2AuthUid },
    }

    const userIds = [p1AuthUid, p2AuthUid].filter(Boolean) as string[]
    if (userIds.length === 0) {
      debug.stage = "skipped_no_users"
      debug.skipped = "No mapped users"

      // trotzdem markieren, damit es nicht dauernd triggert
      const { error: markErr } = await supabase
        .from("dko_match_states")
        .update({ push_started_sent_at: new Date().toISOString() })
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .eq("match_id", matchId)

      debug.mark_sent = { ok: !markErr, error: markErr?.message ?? null }
      debug.took_ms = Date.now() - started
      return NextResponse.json({ success: true, debug })
    }

    debug.stage = "load_tokens"
    const tokenMap = await tokensForUsers(supabase, userIds)

    debug.tokens = {
      requested_user_ids: userIds,
      counts: Object.fromEntries(userIds.map((u) => [u, (tokenMap.get(u) ?? []).length])),
    }

    const machineNo = String(newMachine)
    const clickUrl = buildClickUrl(tournamentType, tournamentId, matchId)
    const tag = `tournament:${tournamentType}:${tournamentId}:match:${matchId}`
    const notifId = tag

    const admin = getFirebaseAdmin()

    debug.stage = "send_push"

    const pushed: any[] = []

    async function sendTo(uid: string, title: string, body: string, opponent: string) {
      const tokens = tokenMap.get(uid) ?? []
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        data: {
          title,
          body,
          clickUrl,
          path: clickUrl,
          tag,
          notif_id: notifId,
          kind: "tournament_match_start",
          tournamentType,
          tournamentId,
          matchId: String(matchId),
          machineNumber: machineNo,
          opponent,
        },
        android: { priority: "high" },
      })

      const errors = (res.responses || [])
        .filter((r) => !r.success)
        .map((r) => r.error?.code || r.error?.message)

      pushed.push({
        user_id: uid,
        tokens: tokens.length,
        success: res.successCount,
        failed: res.failureCount,
        errors: errors.slice(0, 5),
      })

      // Optional: ungültige Tokens löschen
      const badTokens = (res.responses || [])
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean) as string[]

      if (badTokens.length > 0) {
        await supabase.from("fcm_tokens").delete().in("token", badTokens)
      }

      return res
    }

    if (p1AuthUid) {
      await sendTo(p1AuthUid, "🎯 Match startet", `${p1Name} vs. ${p2Name} · Automat ${machineNo}`, p2Name)
    }
    if (p2AuthUid) {
      await sendTo(p2AuthUid, "🎯 Match startet", `${p2Name} vs. ${p1Name} · Automat ${machineNo}`, p1Name)
    }

    debug.fcm = { pushed }

    // ❗ Optional (empfohlen): nur markieren wenn mind. 1 Success
    const anySuccess = pushed.some((p) => (p.success ?? 0) > 0)

    debug.stage = "mark_sent"
    const { error: markErr } = await supabase
      .from("dko_match_states")
      .update({ push_started_sent_at: new Date().toISOString() })
      .eq("tournament_type", tournamentType)
      .eq("tournament_id", tournamentId)
      .eq("match_id", matchId)

    debug.mark_sent = { ok: !markErr, error: markErr?.message ?? null, anySuccess }
    if (markErr) throw markErr

    debug.stage = "done"
    debug.took_ms = Date.now() - started
    return NextResponse.json({ success: true, debug })
  } catch (err: any) {
    debug.stage = "error_exception"
    debug.error = String(err?.message ?? err ?? "Unknown error")
    debug.took_ms = Date.now() - started
    console.error("[push/tournament-start] error:", err)
    return NextResponse.json({ success: false, debug }, { status: 500 })
  }
}
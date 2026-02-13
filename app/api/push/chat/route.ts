import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import webpush from "web-push"

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand"

const CLUB_ROOM_ID = "11111111-1111-1111-1111-111111111111"
const FREIZEIT_ROOM_ID = "22222222-2222-2222-2222-222222222222"
const VORSTAND_ROOM_ID = "33333333-3333-3333-3333-333333333333"
const CAPTAINS_ROOM_ID = "44444444-4444-4444-4444-444444444444"

const ROLE_TABLE = "club_roles"
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

const THROTTLE_SECONDS = 60

function nowIso() {
  return new Date().toISOString()
}

function secondsAgoIso(sec: number) {
  return new Date(Date.now() - sec * 1000).toISOString()
}

function pickTitle(scope: ChatScope) {
  if (scope === "team") return "Team-Chat"
  if (scope === "captains") return "Captain-Chat"
  if (scope === "vorstand") return "Vorstand"
  if (scope === "freizeit") return "Freizeit"
  return "Vereinsinfo"
}

function pickEmoji(scope: ChatScope) {
  if (scope === "team") return "💬"
  if (scope === "captains") return "👥"
  if (scope === "vorstand") return "🛡️"
  if (scope === "freizeit") return "☕"
  return "ℹ️"
}

function normalizePreview(text: string) {
  const t = (text || "").trim()
  if (!t) return ""
  return t.length > 140 ? t.slice(0, 140) + "…" : t
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const room_id: string | null = body?.room_id ?? null
    const scope: ChatScope | null = body?.scope ?? null
    const message: string | null = body?.message ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!room_id || !scope || !message || !sender_profile_id) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    // --- Auth: Bearer Token erforderlich (damit nicht jeder pushen kann)
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const bearer =
      authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null
    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const cookieStore = await cookies()

    // Wichtig: Service Role für DB-Lesen (Team-Members / Profiles / Roles)
    const supabase = createServerClient(
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

    // Sender-User via token validieren
    const { data: senderAuth, error: senderAuthErr } = await supabase.auth.getUser(bearer)
    if (senderAuthErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
    const senderAuthUserId = senderAuth.user.id

    // Sender-Profile prüfen (profile.id -> profile.user_id)
    const { data: senderProfile, error: senderProfileErr } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("id", sender_profile_id)
      .maybeSingle()

    if (senderProfileErr || !senderProfile) {
      return NextResponse.json({ success: false, error: "Sender profile not found" }, { status: 400 })
    }

    if ((senderProfile as any).user_id !== senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    // --- Empfänger ermitteln (auth.user_id)
    let targetAuthUserIds: string[] = []

    if (scope === "team") {
      // team chat: room_id == team_id
      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", room_id)
        .is("left_at", null)

      if (memErr) throw memErr

      const playerIds = Array.from(new Set(((mems as any[]) || []).map((m) => m.player_id).filter(Boolean)))
      if (playerIds.length === 0) {
        return NextResponse.json({ success: true, sent: 0, info: "No team members" })
      }

      const { data: profs, error: profErr } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("player_id", playerIds)

      if (profErr) throw profErr

      targetAuthUserIds = Array.from(new Set(((profs as any[]) || []).map((p) => p.user_id).filter(Boolean)))
    } else if (scope === "captains") {
      // all captains & co-captains
      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id")
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null)

      if (memErr) throw memErr

      const playerIds = Array.from(new Set(((mems as any[]) || []).map((m) => m.player_id).filter(Boolean)))
      if (playerIds.length === 0) return NextResponse.json({ success: true, sent: 0, info: "No captains" })

      const { data: profs, error: profErr } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("player_id", playerIds)

      if (profErr) throw profErr

      targetAuthUserIds = Array.from(new Set(((profs as any[]) || []).map((p) => p.user_id).filter(Boolean)))
    } else if (scope === "vorstand") {
      // board roles
      const { data: roles, error: rolesErr } = await supabase
        .from(ROLE_TABLE)
        .select("user_id,role")
        .in("role", BOARD_ROLES)

      if (rolesErr) throw rolesErr
      targetAuthUserIds = Array.from(new Set(((roles as any[]) || []).map((r) => r.user_id).filter(Boolean)))
    } else if (scope === "club" || scope === "freizeit") {
      // optional: all users with a profile
      const { data: profs, error: profErr } = await supabase
        .from("user_profiles")
        .select("user_id")
        .not("user_id", "is", null)

      if (profErr) throw profErr
      targetAuthUserIds = Array.from(new Set(((profs as any[]) || []).map((p) => p.user_id).filter(Boolean)))
    } else {
      return NextResponse.json({ success: false, error: "Invalid scope" }, { status: 400 })
    }

    // Sender nie pushen
    targetAuthUserIds = targetAuthUserIds.filter((uid) => uid !== senderAuthUserId)

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, info: "No recipients" })
    }

    // --- Push subs holen (throttle via last_used)
    const cutoff = secondsAgoIso(THROTTLE_SECONDS)

    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id,user_id,endpoint,auth,p256dh,last_used")
      .in("user_id", targetAuthUserIds)

    if (subErr) throw subErr

    const allSubs = (subs as any[]) || []
    const throttled = allSubs.filter((s) => !s.last_used || s.last_used < cutoff)

    if (throttled.length === 0) {
      return NextResponse.json({ success: true, sent: 0, throttled: true })
    }

    // --- web-push config
    const vapidPublic =
      process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ success: false, error: "Missing VAPID keys on server" }, { status: 500 })
    }

    webpush.setVapidDetails("mailto:admin@emojsdartverein.at", vapidPublic, vapidPrivate)

    // ===== Step 1: WhatsApp-Style Title/Body (echte DB-Daten) =====

    // Sendername (club_players.name) holen
    let senderName = "Jemand"
    const senderPlayerId = (senderProfile as any)?.player_id

    if (senderPlayerId) {
      const { data: sp, error: spErr } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderPlayerId)
        .maybeSingle()

      if (!spErr && (sp as any)?.name) senderName = (sp as any).name
    }

    // Chatname je nach Scope (bei Team: teams.name)
    let chatName = pickTitle(scope)

    if (scope === "team") {
      const { data: t, error: tErr } = await supabase.from("teams").select("name").eq("id", room_id).maybeSingle()
      if (!tErr && (t as any)?.name) chatName = (t as any).name
    }

    const title = `${pickEmoji(scope)} ${chatName}`
    const bodyText = `${senderName}: ${normalizePreview(message)}`

    const payload = JSON.stringify({
      title,
      body: bodyText,
      url: "/chat-app", // Step 2 machen wir als nächstes: /chat-app?scope=...&room=...
      room_id,
      scope,
    })

    // Send pushes
    let sent = 0
    const toDelete: string[] = []
    const updatedIds: string[] = []

    await Promise.all(
      throttled.map(async (s) => {
        try {
          const subscription = {
            endpoint: s.endpoint,
            keys: { auth: s.auth, p256dh: s.p256dh },
          }

          await webpush.sendNotification(subscription as any, payload)
          sent += 1
          updatedIds.push(s.id)
        } catch (e: any) {
          const statusCode = e?.statusCode
          // 410/404 => subscription invalid -> delete
          if (statusCode === 410 || statusCode === 404) {
            toDelete.push(s.id)
          } else {
            // leave it, could be temporary
            console.warn("[push-chat] send failed:", statusCode || e?.message || e)
          }
        }
      }),
    )

    // Update last_used for throttled devices
    if (updatedIds.length > 0) {
      await supabase.from("push_subscriptions").update({ last_used: nowIso() }).in("id", updatedIds)
    }

    // Remove dead subs
    if (toDelete.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toDelete)
    }

    return NextResponse.json({
      success: true,
      sent,
      recipients: targetAuthUserIds.length,
      subscriptions: allSubs.length,
      throttled_skipped: allSubs.length - throttled.length,
      deleted_dead: toDelete.length,
    })
    } catch (error: any) {
    console.error("[push-chat] error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error) || "Failed",
        name: error?.name,
        stack: error?.stack,
      },
      { status: 500 },
    )
  }
}


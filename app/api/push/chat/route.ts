import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import webpush from "web-push"

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand"

const ROLE_TABLE = "club_roles"
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

// ✅ 0 = KEIN Throttle (jede Nachricht pushen)
const THROTTLE_SECONDS = 0

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

function normalizePreview(text: string) {
  const t = (text || "").trim()
  if (!t) return ""
  return t.length > 140 ? t.slice(0, 140) + "…" : t
}

function makeChatTag(scope: ChatScope, room_id: string) {
  return `chat:${scope}:${room_id}`
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

    // --- Auth: Bearer Token erforderlich
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const bearer =
      authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null
    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const cookieStore = await cookies()

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

    // Sender-Profile prüfen
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

    // Sender-Name holen
    let senderName = "Jemand"
    const senderPlayerId = (senderProfile as any).player_id as string | null
    if (senderPlayerId) {
      const { data: cp } = await supabase.from("club_players").select("name").eq("id", senderPlayerId).maybeSingle()
      if ((cp as any)?.name) senderName = (cp as any).name
    }

    // --- Standard Icons (WICHTIG: badge != icon ist schöner auf Android)
    const DEFAULT_ICON = "/icon-192.png"
    const DEFAULT_BADGE = "/badge-72.png" // <-- leg diese Datei an (kleines, simples Badge)

    let iconToUse = DEFAULT_ICON
    let badgeToUse = DEFAULT_BADGE

    // Titel (Teamname bei Team-Chat)
    let titleToUse = pickTitle(scope)

    if (scope === "team") {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("name,logo_url")
        .eq("id", room_id)
        .maybeSingle()

      const teamName = (teamRow as any)?.name as string | null
      const logoUrl = (teamRow as any)?.logo_url as string | null

      if (teamName) titleToUse = `🎯 ${teamName}`
      if (logoUrl) iconToUse = logoUrl
    } else if (scope === "vorstand") {
      titleToUse = `🛡️ ${pickTitle(scope)}`
    } else if (scope === "captains") {
      titleToUse = `👑 ${pickTitle(scope)}`
    } else if (scope === "freizeit") {
      titleToUse = `☕ ${pickTitle(scope)}`
    } else if (scope === "club") {
      titleToUse = `ℹ️ ${pickTitle(scope)}`
    }

    // --- Empfänger ermitteln (auth.user_id)
    let targetAuthUserIds: string[] = []

    if (scope === "team") {
      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", room_id)
        .is("left_at", null)
      if (memErr) throw memErr

      const playerIds = Array.from(new Set(((mems as any[]) || []).map((m) => m.player_id).filter(Boolean)))
      if (playerIds.length === 0) return NextResponse.json({ success: true, sent: 0, info: "No team members" })

      const { data: profs, error: profErr } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("player_id", playerIds)
      if (profErr) throw profErr

      targetAuthUserIds = Array.from(new Set(((profs as any[]) || []).map((p) => p.user_id).filter(Boolean)))
    } else if (scope === "captains") {
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
      const { data: roles, error: rolesErr } = await supabase
        .from(ROLE_TABLE)
        .select("user_id,role")
        .in("role", BOARD_ROLES)
      if (rolesErr) throw rolesErr

      targetAuthUserIds = Array.from(new Set(((roles as any[]) || []).map((r) => r.user_id).filter(Boolean)))
    } else if (scope === "club" || scope === "freizeit") {
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

    // --- Push subs holen
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id,user_id,endpoint,auth,p256dh,last_used")
      .in("user_id", targetAuthUserIds)
    if (subErr) throw subErr

    const allSubs = (subs as any[]) || []

    const cutoff = THROTTLE_SECONDS > 0 ? secondsAgoIso(THROTTLE_SECONDS) : null
    const toSend =
      THROTTLE_SECONDS > 0 ? allSubs.filter((s) => !s.last_used || s.last_used < cutoff!) : allSubs

    if (toSend.length === 0) {
      return NextResponse.json({ success: true, sent: 0, throttled: true })
    }

    // --- web-push config
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ success: false, error: "Missing VAPID keys on server" }, { status: 500 })
    }

    webpush.setVapidDetails("mailto:admin@emojsdartverein.at", vapidPublic, vapidPrivate)

    const chatBody = `${senderName}: ${normalizePreview(message)}`
    const chatTag = makeChatTag(scope, room_id)

    // ✅ ANDROID: Actions + data + timestamp geben das "App Feeling"
    const payload = JSON.stringify({
      title: titleToUse,
      body: chatBody,
      icon: iconToUse,
      badge: badgeToUse,
      tag: chatTag,
      renotify: true,
      timestamp: Date.now(),

      actions: [
        { action: "open", title: "Öffnen" },
        { action: "reply", title: "Antworten" },
      ],

      // Alles was du fürs Routing brauchst in data:
      data: {
        url: "/chat-app",
        room_id,
        scope,
        senderName,
      },

      // optional später:
      // image: "https://.../banner.png",
    })

    // Send pushes
    let sent = 0
    const toDelete: string[] = []
    const updatedIds: string[] = []

    await Promise.all(
      toSend.map(async (s) => {
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
          if (statusCode === 410 || statusCode === 404) {
            toDelete.push(s.id)
          } else {
            console.warn("[push-chat] send failed:", statusCode || e?.message || e)
          }
        }
      }),
    )

    // last_used updaten (Tracking)
    if (updatedIds.length > 0) {
      await supabase.from("push_subscriptions").update({ last_used: nowIso() }).in("id", updatedIds)
    }

    // Dead subs löschen
    if (toDelete.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toDelete)
    }

    return NextResponse.json({
      success: true,
      sent,
      recipients: targetAuthUserIds.length,
      subscriptions: allSubs.length,
      throttled_skipped: allSubs.length - toSend.length,
      deleted_dead: toDelete.length,
    })
  } catch (error: any) {
    console.error("[push-chat] error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed" }, { status: 500 })
  }
}

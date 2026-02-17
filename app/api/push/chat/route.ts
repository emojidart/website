// app/api/push/chat/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand"

const ROLE_TABLE = "club_roles"
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

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
  return t.length > 240 ? t.slice(0, 240) + "…" : t
}

function makeChatTag(scope: ChatScope, room_id: string) {
  return `chat:${scope}:${room_id}`
}

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) | 0
  }
  return 2000 + Math.abs(h % 100000)
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

    const authHeader = request.headers.get("authorization") || ""
    const bearer =
      authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      },
    )

    const { data: senderAuth, error: authErr } =
      await supabase.auth.getUser(bearer)

    if (authErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const senderAuthUserId = senderAuth.user.id

    const { data: senderProfile } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("id", sender_profile_id)
      .maybeSingle()

    if (!senderProfile) {
      return NextResponse.json({ success: false, error: "Sender profile not found" }, { status: 400 })
    }

    if ((senderProfile as any).user_id !== senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    let senderName = "Jemand"
    const senderPlayerId = (senderProfile as any).player_id

    if (senderPlayerId) {
      const { data: cp } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderPlayerId)
        .maybeSingle()

      if ((cp as any)?.name) senderName = (cp as any).name
    }

    let conversation = pickTitle(scope)
    let iconUrl: string | null = null
    let teamId: string | null = null

    // 🔥 TEAM CHAT FIX (chat_room_id ist die Wahrheit)
    if (scope === "team") {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("id,name,logo_url")
        .eq("chat_room_id", room_id)
        .maybeSingle()

      if (!teamRow) {
        return NextResponse.json(
          { success: false, error: "Team not found for chat_room_id" },
          { status: 400 }
        )
      }

      teamId = teamRow.id

      if (teamRow.name) conversation = `🎯 ${teamRow.name}`
      if (teamRow.logo_url) iconUrl = teamRow.logo_url
    }

    let targetAuthUserIds: string[] = []

    if (scope === "team" && teamId) {
      const { data: mems } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .is("left_at", null)

      const playerIds = Array.from(
        new Set(((mems as any[]) || []).map((m) => m.player_id))
      )

      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("player_id", playerIds)

      targetAuthUserIds = Array.from(
        new Set(((profs as any[]) || []).map((p) => p.user_id))
      )
    }

    targetAuthUserIds = targetAuthUserIds.filter(
      (uid) => uid !== senderAuthUserId
    )

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const { data: rows } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    const tokens = Array.from(
      new Set(((rows as any[]) || []).map((r) => r.token))
    )

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const cleanMessage = normalizePreview(message)
    const bodyLine = `${senderName}: ${cleanMessage}`

    const tag = makeChatTag(scope, room_id)
    const notif_id = stableNotifIdFromTag(tag)

    const clickUrl =
      scope === "team"
        ? `/chat-app?scope=team&room_id=${encodeURIComponent(room_id)}`
        : `/chat-app?scope=${encodeURIComponent(scope)}`

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        room_id: String(room_id),
        scope: String(scope),
        clickUrl,
        conversation: String(conversation),
        senderName: String(senderName),
        message: String(cleanMessage),
        body: String(bodyLine),
        tag: String(tag),
        notif_id: String(notif_id),
        iconUrl: iconUrl || "",
        ts: String(Date.now()),
      },
      android: { priority: "high" },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
    })
  } catch (e: any) {
    console.error("[push-chat-fcm] error:", e)
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    )
  }
}

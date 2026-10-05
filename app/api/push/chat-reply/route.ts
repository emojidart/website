import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "node:crypto"
import { sendPushAndCleanup } from "@/lib/sendPushAndCleanup"

type ChatScope = "team" | "match" | "captains" | "club" | "freizeit" | "vorstand" | "test"

const ROLE_TABLE = "club_roles"
const ROLE_USER_COL = "user_id"
const ROLE_COL = "role"
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

const TEST_ROOM_ID = "66666666-6666-6666-6666-666666666666"
const TEST_AUTH_USER_IDS = [
  "966f979e-e14d-4d86-abbe-21a2d93eade9",
  "9bff9eb4-661e-44f8-9e8c-6712dec8da6a",
]

function uniqStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function pickTitle(scope: ChatScope) {
  if (scope === "team") return "Team-Chat"
  if (scope === "captains") return "Captain-Chat"
  if (scope === "vorstand") return "Vorstand"
  if (scope === "freizeit") return "Freizeit"
  if (scope === "test") return "🧪 Jimmy Testchat"
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
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 2000 + Math.abs(h % 100000)
}

function verifyReplyToken(token: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

  const parts = String(token || "").split(".")
  if (parts.length !== 2) return null

  const [body, sig] = parts
  const expected = createHmac("sha256", secret).update(body).digest("base64url")

  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: any
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    return null
  }

  if (payload?.v !== 1) return null
  if (!payload?.uid || !payload?.room_id || !payload?.scope || !payload?.exp) return null
  if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null

  return payload as {
    uid: string
    room_id: string
    scope: ChatScope
    team_id?: string | null
    exp: number
    jti: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = String(body?.reply_token || "")
    const message = String(body?.message || "").trim()

    if (!token || !message) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ success: false, error: "Message too long" }, { status: 400 })
    }

    const payload = verifyReplyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid or expired reply token" }, { status: 401 })
    }

    const { uid, room_id, scope } = payload

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id,is_guest")
      .eq("user_id", uid)
      .maybeSingle()

    if (profileError || !profile?.id) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 403 })
    }

    // Zusätzliche serverseitige Berechtigungsprüfung.
    if (scope === "test") {
      if (room_id !== TEST_ROOM_ID || !TEST_AUTH_USER_IDS.includes(uid)) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
    } else if (scope === "team" || scope === "match") {
      const teamId = payload.team_id
      if (!teamId || !profile.player_id) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
      const { data: member } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .eq("player_id", profile.player_id)
        .is("left_at", null)
        .maybeSingle()
      if (!member) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
    } else if (scope === "captains") {
      if (!profile.player_id) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
      const { data: captain } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("player_id", profile.player_id)
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null)
        .limit(1)
        .maybeSingle()
      if (!captain) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
    } else if (scope === "vorstand") {
      const { data: role } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_USER_COL},${ROLE_COL}`)
        .eq(ROLE_USER_COL, uid)
        .in(ROLE_COL, BOARD_ROLES)
        .limit(1)
        .maybeSingle()
      if (!role) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
    } else if (scope === "club" || scope === "freizeit") {
      if (profile.is_guest) {
        return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
      }
    }

    const { error: insertError } = await supabase.from("chat_messages").insert({
      user_id: profile.id,
      message,
      room_id,
      scope,
      reply_to_message_id: null,
    })

    if (insertError) {
      console.error("[push-chat-reply] insert", insertError)
      return NextResponse.json({ success: false, error: "Message insert failed" }, { status: 500 })
    }

    // Senderdaten für die Folge-Pushs.
    let senderName = "Jemand"
    let senderAvatarUrl: string | null = null
    if (profile.player_id) {
      const { data: cp } = await supabase
        .from("club_players")
        .select("name,photo_url")
        .eq("id", profile.player_id)
        .maybeSingle()
      if (cp?.name) senderName = cp.name
      if (cp?.photo_url) senderAvatarUrl = cp.photo_url
    }

    let conversation = pickTitle(scope)
    let iconUrl: string | null = null
    let teamId: string | null = payload.team_id ?? null

    if (scope === "team") {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("id,name,logo_url")
        .eq("chat_room_id", room_id)
        .maybeSingle()
      if (teamRow) {
        teamId = teamRow.id
        if (teamRow.name) conversation = `🎯 ${teamRow.name}`
        if (teamRow.logo_url) iconUrl = teamRow.logo_url
      }
    }

    if (scope === "match" && teamId) {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("id,name,logo_url")
        .eq("id", teamId)
        .maybeSingle()
      if (teamRow) {
        if (teamRow.name) conversation = `🎯 ${teamRow.name}`
        if (teamRow.logo_url) iconUrl = teamRow.logo_url
      }
    }

    let targetAuthUserIds: string[] = []

    if (scope === "test") {
      targetAuthUserIds = [...TEST_AUTH_USER_IDS]
    }

    if ((scope === "team" || scope === "match") && teamId) {
      const { data: mems } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .is("left_at", null)

      const playerIds = uniqStrings(((mems as any[]) || []).map((m) => m.player_id))
      if (playerIds.length > 0) {
        const { data: profs } = await supabase
          .from("user_profiles")
          .select("user_id,player_id")
          .in("player_id", playerIds)
        targetAuthUserIds = uniqStrings(((profs as any[]) || []).map((p) => p.user_id))
      }
    }

    if (scope === "club" || scope === "freizeit") {
      const { data: profs } = await supabase.from("user_profiles").select("user_id,is_guest")
      targetAuthUserIds = uniqStrings(
        ((profs as any[]) || []).filter((p) => !p.is_guest).map((p) => p.user_id)
      )
    }

    if (scope === "captains") {
      const { data: mems } = await supabase
        .from("team_members")
        .select("player_id,role")
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null)

      const playerIds = uniqStrings(((mems as any[]) || []).map((m) => m.player_id))
      if (playerIds.length > 0) {
        const { data: profs } = await supabase
          .from("user_profiles")
          .select("user_id,player_id")
          .in("player_id", playerIds)
        targetAuthUserIds = uniqStrings(((profs as any[]) || []).map((p) => p.user_id))
      }
    }

    if (scope === "vorstand") {
      const { data: roles } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_USER_COL},${ROLE_COL}`)
        .in(ROLE_COL, BOARD_ROLES)
      targetAuthUserIds = uniqStrings(((roles as any[]) || []).map((r) => r[ROLE_USER_COL]))
    }

    targetAuthUserIds = targetAuthUserIds.filter((id) => id !== uid)

    if (targetAuthUserIds.length > 0) {
      const { data: tokenRows } = await supabase
        .from("fcm_tokens")
        .select("token")
        .in("user_id", targetAuthUserIds)

      const tokens = uniqStrings(((tokenRows as any[]) || []).map((r) => r.token))
      if (tokens.length > 0) {
        const cleanMessage = normalizePreview(message)
        const bodyLine = `${senderName}: ${cleanMessage}`
        const tag = makeChatTag(scope, room_id)
        const notif_id = stableNotifIdFromTag(tag)

        let clickUrl = `/chat-app?tab=chats&scope=${encodeURIComponent(scope)}&room_id=${encodeURIComponent(room_id)}`
        if (scope === "match") {
          clickUrl = `/chat-app?tab=aufstellung&match_id=${encodeURIComponent(room_id)}&team_id=${encodeURIComponent(teamId ?? "")}&chat=match`
        }

        // Folge-Push ohne Reply-Token ist absichtlich okay; der nächste normale
        // Chat-Push aus dem Web bekommt wieder einen frischen, usergebundenen Reply-Token.
        await sendPushAndCleanup(tokens, {
          data: {
            room_id: String(room_id),
            scope: String(scope),
            clickUrl,
            conversation,
            senderName,
            message: cleanMessage,
            body: bodyLine,
            tag,
            notif_id: String(notif_id),
            iconUrl: iconUrl || "",
            avatarUrl: senderAvatarUrl || "",
            ts: String(Date.now()),
          },
          android: { priority: "high" },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[push-chat-reply] error", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: 500 }
    )
  }
}

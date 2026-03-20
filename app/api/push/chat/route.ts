import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { sendPushAndCleanup } from "@/lib/sendPushAndCleanup"

type ChatScope = "team" | "match" | "captains" | "club" | "freizeit" | "vorstand"

const ROLE_TABLE = "club_roles"
const ROLE_USER_COL = "user_id"
const ROLE_COL = "role"
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

function uniqStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const room_id: string | null = body?.room_id ?? null
    const scope: ChatScope | null = body?.scope ?? null
    const message: string | null = body?.message ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null
    const team_id: string | null = body?.team_id ?? null

    console.log("========== PUSH CHAT DEBUG START ==========")
    console.log("[push-chat] body:", body)
    console.log("[push-chat] room_id:", room_id)
    console.log("[push-chat] scope:", scope)
    console.log("[push-chat] sender_profile_id:", sender_profile_id)
    console.log("[push-chat] team_id:", team_id)

    if (!room_id || !scope || !sender_profile_id) {
      console.log("[push-chat] ERROR: Missing params")
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null

    if (!bearer) {
      console.log("[push-chat] ERROR: Missing bearer token")
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
      }
    )

    const { data: senderAuth, error: authErr } = await supabase.auth.getUser(bearer)

    console.log("[push-chat] senderAuth error:", authErr)
    console.log("[push-chat] senderAuth user:", senderAuth?.user?.id)

    if (authErr || !senderAuth?.user?.id) {
      console.log("[push-chat] ERROR: Invalid token")
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const senderAuthUserId = senderAuth.user.id

    const { data: senderProfile, error: senderProfileError } = await supabase
      .from("user_profiles")
      .select("id,user_id,player_id")
      .eq("id", sender_profile_id)
      .maybeSingle()

    console.log("[push-chat] senderProfile error:", senderProfileError)
    console.log("[push-chat] senderProfile:", senderProfile)

    if (!senderProfile) {
      console.log("[push-chat] ERROR: Sender profile not found")
      return NextResponse.json({ success: false, error: "Sender profile not found" }, { status: 400 })
    }

    if ((senderProfile as any).user_id !== senderAuthUserId) {
      console.log("[push-chat] ERROR: Sender mismatch")
      console.log("[push-chat] senderProfile.user_id:", (senderProfile as any).user_id)
      console.log("[push-chat] senderAuthUserId:", senderAuthUserId)
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    let senderName = "Jemand"
    const senderPlayerId = (senderProfile as any).player_id

    if (senderPlayerId) {
      const { data: cp, error: cpError } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderPlayerId)
        .maybeSingle()

      console.log("[push-chat] sender club_player error:", cpError)
      console.log("[push-chat] sender club_player:", cp)

      if ((cp as any)?.name) senderName = (cp as any).name
    }

    console.log("[push-chat] senderName:", senderName)

    let conversation = pickTitle(scope)
    let iconUrl: string | null = null
    let teamId: string | null = null

    if (scope === "team") {
      const { data: teamRow, error: teamRowError } = await supabase
        .from("teams")
        .select("id,name,logo_url")
        .eq("chat_room_id", room_id)
        .maybeSingle()

      console.log("[push-chat] team lookup by chat_room_id error:", teamRowError)
      console.log("[push-chat] team lookup by chat_room_id result:", teamRow)

      if (!teamRow) {
        console.log("[push-chat] ERROR: Team not found for chat_room_id")
        return NextResponse.json(
          { success: false, error: "Team not found for chat_room_id" },
          { status: 400 }
        )
      }

      teamId = teamRow.id
      if (teamRow.name) conversation = `🎯 ${teamRow.name}`
      if (teamRow.logo_url) iconUrl = teamRow.logo_url
    }

    if (scope === "match") {
      if (!team_id) {
        console.log("[push-chat] ERROR: Missing team_id for match push")
        return NextResponse.json(
          { success: false, error: "Missing team_id for match push" },
          { status: 400 }
        )
      }

      const { data: teamRow, error: teamRowError } = await supabase
        .from("teams")
        .select("id,name,logo_url")
        .eq("id", team_id)
        .maybeSingle()

      console.log("[push-chat] team lookup by team_id error:", teamRowError)
      console.log("[push-chat] team lookup by team_id result:", teamRow)

      if (!teamRow) {
        console.log("[push-chat] ERROR: Team not found for team_id")
        return NextResponse.json(
          { success: false, error: "Team not found for team_id" },
          { status: 400 }
        )
      }

      teamId = teamRow.id
      if (teamRow.name) conversation = `🎯 ${teamRow.name}`
      if (teamRow.logo_url) iconUrl = teamRow.logo_url
    }

    console.log("[push-chat] resolved conversation:", conversation)
    console.log("[push-chat] resolved iconUrl:", iconUrl)
    console.log("[push-chat] resolved teamId:", teamId)

    let targetAuthUserIds: string[] = []

    if ((scope === "team" || scope === "match") && teamId) {
      const { data: mems, error: memsError } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", teamId)
        .is("left_at", null)

      console.log("[push-chat] team_members error:", memsError)
      console.log("[push-chat] team_members rows:", mems)

      const playerIds = uniqStrings(((mems as any[]) || []).map((m) => m.player_id))

      console.log("[push-chat] playerIds from team_members:", playerIds)
      console.log("[push-chat] playerIds count:", playerIds.length)

      if (playerIds.length > 0) {
        const { data: profs, error: profsError } = await supabase
          .from("user_profiles")
          .select("user_id,player_id")
          .in("player_id", playerIds)

        console.log("[push-chat] user_profiles by player_id error:", profsError)
        console.log("[push-chat] user_profiles by player_id rows:", profs)

        targetAuthUserIds = uniqStrings(((profs as any[]) || []).map((p) => p.user_id))
      }
    }

    if (scope === "club" || scope === "freizeit") {
      const { data: profs, error: profsError } = await supabase
        .from("user_profiles")
        .select("user_id")

      console.log("[push-chat] global user_profiles error:", profsError)
      console.log("[push-chat] global user_profiles rows:", profs)

      targetAuthUserIds = uniqStrings(((profs as any[]) || []).map((p) => p.user_id))
    }

    if (scope === "captains") {
      const { data: mems, error: memsError } = await supabase
        .from("team_members")
        .select("player_id,role")
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null)

      console.log("[push-chat] captains team_members error:", memsError)
      console.log("[push-chat] captains team_members rows:", mems)

      const playerIds = uniqStrings(((mems as any[]) || []).map((m) => m.player_id))

      console.log("[push-chat] captains playerIds:", playerIds)
      console.log("[push-chat] captains playerIds count:", playerIds.length)

      if (playerIds.length > 0) {
        const { data: profs, error: profsError } = await supabase
          .from("user_profiles")
          .select("user_id,player_id")
          .in("player_id", playerIds)

        console.log("[push-chat] captains user_profiles error:", profsError)
        console.log("[push-chat] captains user_profiles rows:", profs)

        targetAuthUserIds = uniqStrings(((profs as any[]) || []).map((p) => p.user_id))
      }
    }

    if (scope === "vorstand") {
      const { data: roles, error: rolesError } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_USER_COL},${ROLE_COL}`)
        .in(ROLE_COL, BOARD_ROLES)

      console.log("[push-chat] vorstand roles error:", rolesError)
      console.log("[push-chat] vorstand roles rows:", roles)

      targetAuthUserIds = uniqStrings(((roles as any[]) || []).map((r) => r[ROLE_USER_COL]))
    }

    console.log("[push-chat] targetAuthUserIds BEFORE sender filter:", targetAuthUserIds)
    console.log("[push-chat] targetAuthUserIds BEFORE sender filter count:", targetAuthUserIds.length)

    targetAuthUserIds = targetAuthUserIds.filter((uid) => uid !== senderAuthUserId)

    console.log("[push-chat] senderAuthUserId filtered out:", senderAuthUserId)
    console.log("[push-chat] targetAuthUserIds AFTER sender filter:", targetAuthUserIds)
    console.log("[push-chat] targetAuthUserIds AFTER sender filter count:", targetAuthUserIds.length)

    if (targetAuthUserIds.length === 0) {
      console.log("[push-chat] EARLY EXIT: no targetAuthUserIds")
      console.log("========== PUSH CHAT DEBUG END ==========")
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        debug: {
          scope,
          room_id,
          senderAuthUserId,
          sender_profile_id,
          targetAuthUserIds: [],
          tokenUserIds: [],
          usersWithoutToken: [],
          tokenCount: 0,
        },
      })
    }

    const { data: rows, error: rowsError } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    console.log("[push-chat] fcm_tokens error:", rowsError)
    console.log("[push-chat] fcm_tokens rows:", rows)

    const tokens = uniqStrings(((rows as any[]) || []).map((r) => r.token))
    const tokenUserIds = uniqStrings(((rows as any[]) || []).map((r) => r.user_id))
    const usersWithoutToken = targetAuthUserIds.filter((uid) => !tokenUserIds.includes(uid))

    console.log("[push-chat] resolved tokens:", tokens)
    console.log("[push-chat] resolved token count:", tokens.length)
    console.log("[push-chat] user_ids with token rows:", tokenUserIds)
    console.log("[push-chat] user_ids with token count:", tokenUserIds.length)
    console.log("[push-chat] users WITHOUT token:", usersWithoutToken)
    console.log("[push-chat] users WITHOUT token count:", usersWithoutToken.length)

    if (tokens.length === 0) {
      console.log("[push-chat] EARLY EXIT: no tokens found")
      console.log("========== PUSH CHAT DEBUG END ==========")
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        debug: {
          scope,
          room_id,
          senderAuthUserId,
          sender_profile_id,
          targetAuthUserIds,
          tokenUserIds,
          usersWithoutToken,
          tokenCount: 0,
        },
      })
    }

    const cleanMessage = normalizePreview(message || "")
    const bodyLine = cleanMessage ? `${senderName}: ${cleanMessage}` : `${senderName} hat eine Nachricht gesendet`

    const tag = makeChatTag(scope, room_id)
    const notif_id = stableNotifIdFromTag(tag)

    let clickUrl = "/chat-app"

if (scope === "match") {
  clickUrl = `/member-availability?match_id=${encodeURIComponent(room_id)}&team_id=${encodeURIComponent(teamId ?? "")}&chat=match`
}

if (scope === "team") {
  clickUrl = `/chat-app?scope=team&room_id=${encodeURIComponent(room_id)}`
}

if (scope === "club") {
  clickUrl = `/chat-app?scope=club&room_id=${encodeURIComponent(room_id)}`
}

if (scope === "freizeit") {
  clickUrl = `/chat-app?scope=freizeit&room_id=${encodeURIComponent(room_id)}`
}

if (scope === "captains") {
  clickUrl = `/chat-app?scope=captains&room_id=${encodeURIComponent(room_id)}`
}

if (scope === "vorstand") {
  clickUrl = `/chat-app?scope=vorstand&room_id=${encodeURIComponent(room_id)}`
}

    console.log("[push-chat] cleanMessage:", cleanMessage)
    console.log("[push-chat] bodyLine:", bodyLine)
    console.log("[push-chat] tag:", tag)
    console.log("[push-chat] notif_id:", notif_id)
    console.log("[push-chat] clickUrl:", clickUrl)

    const result = await sendPushAndCleanup(tokens, {
      data: {
        room_id: String(room_id),
        scope: String(scope),
        clickUrl: String(clickUrl),
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

    console.log("[push-chat] sendPushAndCleanup result:", result)
    console.log("[push-chat] success:", result.success)
    console.log("[push-chat] failed:", result.failed)
    console.log("=========== PUSH CHAT DEBUG END ===========")

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      debug: {
        scope,
        room_id,
        senderAuthUserId,
        sender_profile_id,
        targetAuthUserIds,
        tokenUserIds,
        usersWithoutToken,
        tokenCount: tokens.length,
      },
    })
  } catch (e: any) {
    console.error("[push-chat-fcm] error:", e)
    console.log("=========== PUSH CHAT DEBUG END ===========")
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    )
  }
}
// app/api/push/board-invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 5000 + Math.abs(h % 100000)
}

function formatDateDE(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTimeDE(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const event_id: string | null = body?.event_id ?? null
    if (!event_id) {
      return NextResponse.json({ success: false, error: "Missing event_id" }, { status: 400 })
    }

    // ---- Bearer Token prüfen ----
    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null

    if (!bearer) {
      return NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 })
    }

    const cookieStore = await cookies()

    // Service Role (wie bei dir)
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

    // ---- Token validieren ----
    const { data: senderAuth, error: authErr } = await supabase.auth.getUser(bearer)
    if (authErr || !senderAuth?.user?.id) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
    const senderUserId = senderAuth.user.id

    // ---- Nur Vorstand darf pushen ----
    const { data: roleRows, error: roleErr } = await supabase
      .from("club_roles")
      .select("role")
      .eq("user_id", senderUserId)

    if (roleErr) {
      return NextResponse.json({ success: false, error: "Role check failed" }, { status: 500 })
    }

    const isVorstand = (roleRows || []).some((r: any) => r.role === "Vorstand")
    if (!isVorstand) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 })
    }

    // ---- Event holen ----
    const { data: ev, error: evErr } = await supabase
      .from("board_events")
      .select("id, title, description, starts_at")
      .eq("id", event_id)
      .maybeSingle()

    if (evErr || !ev) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 400 })
    }

    // ---- Eingeladene Spieler holen ----
    const { data: invites, error: invErr } = await supabase
      .from("board_event_invites")
      .select("player_id")
      .eq("event_id", event_id)

    if (invErr) {
      return NextResponse.json({ success: false, error: "Invite lookup failed" }, { status: 500 })
    }

    const playerIds = Array.from(new Set((invites || []).map((r: any) => r.player_id).filter(Boolean)))
    if (playerIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No invited players" })
    }

    // ---- player_id -> user_id ----
    const { data: profiles, error: profErr } = await supabase
      .from("user_profiles")
      .select("user_id, player_id")
      .in("player_id", playerIds)

    if (profErr) {
      return NextResponse.json({ success: false, error: "Profile lookup failed" }, { status: 500 })
    }

    const userIds = Array.from(new Set((profiles || []).map((p: any) => p.user_id).filter(Boolean)))
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No users for invited players" })
    }

    // Optional: nicht an sich selbst schicken
    const filteredUserIds = userIds.filter((u) => u !== senderUserId)
    if (filteredUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "Skip self only" })
    }

    // ---- Tokens holen ----
    const { data: tokenRows, error: tokErr } = await supabase
      .from("fcm_tokens")
      .select("token")
      .in("user_id", filteredUserIds)

    if (tokErr) {
      return NextResponse.json({ success: false, error: "Token lookup failed" }, { status: 500 })
    }

    const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean)))
    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No tokens" })
    }

    // ---- Push Text ----
    const when = `${formatDateDE(String(ev.starts_at))} • ${formatTimeDE(String(ev.starts_at))}`
    const conversation = "📌 Vorstand Termin"
    const bodyText =
      `Du wurdest eingeladen:\n` +
      `${ev.title}\n` +
      `${when}` +
      (ev.description ? `\n\n${ev.description}` : "")

    // wohin beim Klick?
    // du kannst später in deiner Kalenderseite "open=board_<id>" auslesen, wenn du willst.
    const clickUrl = `/vereinskalender-app?open=board_${event_id}`

    const tag = `board:invite:${event_id}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        type: "board_invite",
        event_id: String(event_id),
        clickUrl: String(clickUrl),
        conversation: String(conversation),
        body: String(bodyText),
        tag: String(tag),
        notif_id: String(notif_id),
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
    console.error("[push-board-invite] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
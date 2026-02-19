// app/api/push/lineup/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function formatMatchDate(dateString: string) {
  const d = new Date(dateString)
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${wd} ${day}.${month}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const team_id: string | null = body?.team_id ?? null
    const match_id: string | null = body?.match_id ?? null
    const action: "confirmed" | "changed" | null = body?.action ?? null
    const sender_profile_id: string | null = body?.sender_profile_id ?? null

    if (!team_id || !match_id || !action || !sender_profile_id) {
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

    // 🔐 Auth prüfen
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

    if (!senderProfile || senderProfile.user_id !== senderAuthUserId) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 403 })
    }

    // 👤 Sender Name
    let senderName = "Jemand"
    if (senderProfile.player_id) {
      const { data: cp } = await supabase
        .from("club_players")
        .select("name")
        .eq("id", senderProfile.player_id)
        .maybeSingle()

      if (cp?.name) senderName = cp.name
    }

    // 📅 Match + Teams holen
    const { data: match } = await supabase
      .from("matches")
      .select(`
        match_date,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq("id", match_id)
      .maybeSingle()

    const formattedDate = match?.match_date
      ? formatMatchDate(match.match_date)
      : ""

    const homeName = match?.home_team?.name ?? "Team A"
    const awayName = match?.away_team?.name ?? "Team B"

    const headerLine = `${formattedDate} • ${homeName} vs ${awayName}`

    // 👥 Starter holen
    const { data: startersRaw } = await supabase
      .from("match_lineups")
      .select("position, club_players:club_players(name)")
      .eq("match_id", match_id)
      .eq("team_id", team_id)
      .eq("is_substitute", false)
      .order("position", { ascending: true })

    const starters = ((startersRaw as any[]) || [])
      .map(r => r.club_players?.name)
      .filter(Boolean)

    // 🔁 Ersatz holen
    const { data: subsRaw } = await supabase
      .from("match_lineups")
      .select("club_players:club_players(name)")
      .eq("match_id", match_id)
      .eq("team_id", team_id)
      .eq("is_substitute", true)

    const substitutes = ((subsRaw as any[]) || [])
      .map(r => r.club_players?.name)
      .filter(Boolean)

    // 📄 Nachricht sauber aufbauen (mehrzeilig!)
    const lines: string[] = []

    lines.push(headerLine)
    lines.push("")

    if (action === "confirmed") {
      lines.push("✅ Aufstellung bestätigt")
    } else {
      lines.push("⚠️ Aufstellung geändert")
    }

    lines.push("")

    if (starters.length > 0) {
      lines.push("🎯 Fix:")
      starters.forEach(name => lines.push(`• ${name}`))
      lines.push("")
    }

    if (substitutes.length > 0) {
      lines.push("🔁 Ersatz:")
      substitutes.forEach(name => lines.push(`• ${name}`))
    }

    const bodyText = lines.join("\n")

    // 👥 Empfänger (Team-Mitglieder)
    const { data: mems } = await supabase
      .from("team_members")
      .select("player_id")
      .eq("team_id", team_id)
      .is("left_at", null)

    const playerIds = Array.from(
      new Set(((mems as any[]) || []).map(m => m.player_id))
    )

    const { data: profs } = await supabase
      .from("user_profiles")
      .select("user_id")
      .in("player_id", playerIds)

    let targetAuthUserIds = Array.from(
      new Set(((profs as any[]) || []).map(p => p.user_id))
    )

    targetAuthUserIds = targetAuthUserIds.filter(
      uid => uid !== senderAuthUserId
    )

    if (targetAuthUserIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const { data: rows } = await supabase
      .from("fcm_tokens")
      .select("token,user_id")
      .in("user_id", targetAuthUserIds)

    const tokens = Array.from(
      new Set(((rows as any[]) || []).map(r => r.token))
    )

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const admin = getFirebaseAdmin()

    const clickUrl = `/member-availability`

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        conversation: "📋 Aufstellung",
        body: bodyText,
        clickUrl,
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
    console.error("[push-lineup] error:", e)
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    )
  }
}

"use server"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (!token) return { error: "Nicht angemeldet." as const }

  const sb = admin()
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  if (authError || !authData.user) return { error: "Sitzung ungültig." as const }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", authData.user.id)
    .maybeSingle()

  if (!profile?.is_admin) return { error: "Keine Admin-Berechtigung." as const }

  return { sb, user: authData.user }
}

async function getAuthUsersByEmail(sb: ReturnType<typeof admin>) {
  const result = new Map<string, string>()

  // Für eure Vereinsgröße reicht das locker; bei >1000 Usern könnte später paginiert werden.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  for (const user of data.users || []) {
    const email = String(user.email || "").trim().toLowerCase()
    if (email) result.set(email, user.id)
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if ("error" in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: 403 })
    }

    const { sb } = access

    const [{ data: players, error: playersError }, { data: profiles, error: profilesError }, { data: managers, error: managersError }] =
      await Promise.all([
        sb
          .from("club_players")
          .select("id,name,email,is_active")
          .or("is_active.eq.true,is_active.is.null")
          .order("name", { ascending: true }),
        sb.from("user_profiles").select("user_id,player_id"),
        sb.from("clubhouse_managers").select("user_id,player_id"),
      ])

    if (playersError) throw playersError
    if (profilesError) throw profilesError
    if (managersError) throw managersError

    const authByEmail = await getAuthUsersByEmail(sb)
    const profileByPlayer = new Map<string, string>()

    for (const profile of profiles || []) {
      if (profile.player_id && profile.user_id && !profileByPlayer.has(String(profile.player_id))) {
        profileByPlayer.set(String(profile.player_id), String(profile.user_id))
      }
    }

    const managerPlayerIds = new Set(
      (managers || []).map((m: any) => String(m.player_id || "")).filter(Boolean),
    )

    const rows = (players || []).map((player: any) => {
      const playerId = String(player.id)
      const email = String(player.email || "").trim()
      const emailAuthId = email ? authByEmail.get(email.toLowerCase()) || null : null
      const profileAuthId = profileByPlayer.get(playerId) || null

      // Sicherste Reihenfolge:
      // 1. Exaktes Auth-Konto mit derselben Spieler-E-Mail
      // 2. user_profiles.player_id, aber nur wenn keine widersprüchliche E-Mail-Auflösung existiert.
      let resolvedUserId: string | null = null
      let accountState: "linked" | "email_match" | "missing" | "conflict" = "missing"

      if (emailAuthId) {
        resolvedUserId = emailAuthId
        accountState = profileAuthId === emailAuthId ? "linked" : "email_match"
      } else if (profileAuthId) {
        // Es gibt eine Profil-Zuordnung, aber kein Auth-Konto unter der Spieler-E-Mail.
        // Das kann bei alten/falschen Verknüpfungen auf ein Admin-Konto zeigen.
        accountState = "conflict"
      }

      return {
        id: playerId,
        name: player.name,
        email: player.email,
        is_active: player.is_active,
        resolved_user_id: resolvedUserId,
        account_state: accountState,
        enabled: managerPlayerIds.has(playerId),
      }
    })

    return NextResponse.json({
      success: true,
      players: rows,
      managerCount: managerPlayerIds.size,
    })
  } catch (error: any) {
    console.error("[clubhouse-managers GET]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Fehler beim Laden." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if ("error" in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: 403 })
    }

    const { sb, user } = access
    const body = await request.json().catch(() => ({}))
    const playerId = String(body?.player_id || "")
    const enabled = Boolean(body?.enabled)

    if (!playerId) {
      return NextResponse.json({ success: false, error: "Spieler-ID fehlt." }, { status: 400 })
    }

    const { data: player, error: playerError } = await sb
      .from("club_players")
      .select("id,name,email")
      .eq("id", playerId)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json({ success: false, error: "Spieler nicht gefunden." }, { status: 404 })
    }

    if (!enabled) {
      const { error } = await sb
        .from("clubhouse_managers")
        .delete()
        .eq("player_id", playerId)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    const email = String(player.email || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { success: false, error: `${player.name} hat keine E-Mail-Adresse hinterlegt.` },
        { status: 400 },
      )
    }

    const authByEmail = await getAuthUsersByEmail(sb)
    const targetUserId = authByEmail.get(email) || null

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `Für ${player.name} wurde unter ${player.email} kein Login-Konto gefunden.`,
        },
        { status: 400 },
      )
    }

    // Pro Spieler genau eine Berechtigung; veraltete Zuordnung vorher entfernen.
    const { error: deleteError } = await sb
      .from("clubhouse_managers")
      .delete()
      .eq("player_id", playerId)

    if (deleteError) throw deleteError

    const { error: insertError } = await sb.from("clubhouse_managers").insert({
      player_id: playerId,
      user_id: targetUserId,
      created_by: user.id,
    })

    if (insertError) throw insertError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[clubhouse-managers POST]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Speichern fehlgeschlagen." },
      { status: 500 },
    )
  }
}

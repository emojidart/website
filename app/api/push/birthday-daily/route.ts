// app/api/push/birthday-daily/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

export const runtime = "nodejs" // wichtig wegen Firebase Admin

export async function GET() {
  return NextResponse.json({ ok: true, route: "birthday-daily" })
}

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 6000 + Math.abs(h % 100000)
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export async function POST(request: NextRequest) {
  try {
    // ✅ CRON Schutz (Server -> Server)
    const secret = (process.env.BIRTHDAY_CRON_SECRET ?? "").trim()
    const got = (request.headers.get("x-cron-secret") ?? "").trim()

    if (!secret || got !== secret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ Service Role
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    // ✅ Heute
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()

    // 1) Geburtstagskinder heute
    const { data: bdays, error: bErr } = await supabase
      .from("club_players")
      .select("id, name, birthdate")
      .not("birthdate", "is", null)

    if (bErr) {
      console.error("birthday fetch error:", bErr)
      return NextResponse.json({ success: false, error: "birthday fetch failed" }, { status: 500 })
    }

    const todayBirthdayPlayers = (bdays || []).filter((p: any) => {
      const bd = String(p.birthdate || "")
      const parts = bd.split("-")
      if (parts.length < 3) return false
      const m = Number(parts[1])
      const d = Number(parts[2])
      return m === month && d === day
    })

    if (todayBirthdayPlayers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "no birthdays today" })
    }

    const admin = getFirebaseAdmin()
    let totalSent = 0
    let totalFailed = 0

    // 2) Für jedes Geburtstagskind: nur an diese Person schicken
    for (const p of todayBirthdayPlayers as any[]) {
      const pid = String(p.id)
      const pname = String(p.name || "Jemand")

      // ✅ 1x pro Jahr Log prüfen
      const { data: already, error: aErr } = await supabase
        .from("birthday_push_log")
        .select("id")
        .eq("player_id", pid)
        .eq("year", year)
        .maybeSingle()

      if (aErr) console.error("birthday log lookup error:", aErr)
      if (already?.id) continue

      // ✅ player_id -> user_id (über user_profiles)
      const { data: prof, error: pErr } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("player_id", pid)
        .maybeSingle()

      if (pErr) {
        console.error("profile lookup error:", pErr)
        continue
      }

      const targetUserId = (prof as any)?.user_id as string | null
      if (!targetUserId) {
        // kein Account verknüpft -> kein Push möglich
        continue
      }

      // ✅ Tokens nur von diesem User
      const { data: tokenRows, error: tokErr } = await supabase
        .from("fcm_tokens")
        .select("token")
        .eq("user_id", targetUserId)

      if (tokErr) {
        console.error("token fetch error:", tokErr)
        continue
      }

      const tokens = Array.from(new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean)))
      if (tokens.length === 0) continue

      // ✅ Push Text: echte Gratulation NUR ans Geburtstagskind
      const conversation = "🎂 Happy Birthday!"
      const bodyText = `Alles Gute zum Geburtstag, ${pname}! 🎉🥳\nDein EMD Dartverein ❤️`

      const tag = `birthday:${year}:${pad2(month)}-${pad2(day)}:${pid}`
      const notif_id = stableNotifIdFromTag(tag)

      const clickUrl = `/vereinskalender-app` // oder z.B. /profil

      const multicast = await admin.messaging().sendEachForMulticast({
        tokens,
        data: {
          type: "birthday_greeting",
          player_id: pid,
          player_name: pname,

          clickUrl: String(clickUrl),
          conversation: String(conversation),
          body: String(bodyText),

          tag: String(tag),
          notif_id: String(notif_id),
          ts: String(Date.now()),
        },
        android: { priority: "high" },
      })

      totalSent += multicast.successCount
      totalFailed += multicast.failureCount

      // ✅ loggen (damit nur 1x/Jahr)
      const { error: insErr } = await supabase.from("birthday_push_log").insert({
        player_id: pid,
        year,
      })
      if (insErr) console.error("birthday log insert error:", insErr)
    }

    return NextResponse.json({
      success: true,
      birthdays: todayBirthdayPlayers.map((x: any) => ({ id: x.id, name: x.name })),
      sent: totalSent,
      failed: totalFailed,
    })
  } catch (e: any) {
    console.error("[push-birthday-daily] error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 })
  }
}
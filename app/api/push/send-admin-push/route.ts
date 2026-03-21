import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFirebaseAdmin } from "@/lib/firebase-admin"

function stableNotifIdFromTag(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return 3000 + Math.abs(h % 100000)
}

function trimText(s: string, maxLen: number) {
  const t = (s || "").trim()
  if (!t) return ""
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen - 1).trimEnd() + "…"
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const text = String(formData.get("text") || "").trim()
    const push_date = String(formData.get("push_date") || "").trim()
    const push_time = String(formData.get("push_time") || "").trim()
    const send_to_all = String(formData.get("send_to_all") || "false") === "true"
    const selected_player_ids_raw = String(formData.get("selected_player_ids") || "[]")
    const photo = formData.get("photo") as File | null

    if (!text) {
      return NextResponse.json({ success: false, error: "Text is required" }, { status: 400 })
    }

    let selected_player_ids: string[] = []
    try {
      selected_player_ids = JSON.parse(selected_player_ids_raw)
    } catch {
      selected_player_ids = []
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let imageUrl = ""

    if (photo && photo.size > 0) {
      const ext = photo.name.split(".").pop() || "jpg"
      const filePath = `admin-push/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const bytes = await photo.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const { error: uploadError } = await supabase.storage
        .from("admin-push-media")
        .upload(filePath, buffer, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json(
          { success: false, error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from("admin-push-media")
        .getPublicUrl(filePath)

      imageUrl = publicUrlData?.publicUrl || ""
    }

    let tokens: string[] = []

    if (send_to_all) {
      const { data: privateRows, error: privateErr } = await supabase
        .from("fcm_tokens")
        .select("token")

      if (privateErr) {
        return NextResponse.json(
          { success: false, error: `Token load failed: ${privateErr.message}` },
          { status: 500 }
        )
      }

      tokens = Array.from(
        new Set(((privateRows as any[]) || []).map((r) => r.token).filter(Boolean))
      )
    } else {
      if (!selected_player_ids.length) {
        return NextResponse.json(
          { success: false, error: "No players selected" },
          { status: 400 }
        )
      }

      const { data: profiles, error: profilesErr } = await supabase
        .from("user_profiles")
        .select("user_id, player_id")
        .in("player_id", selected_player_ids)

      if (profilesErr) {
        return NextResponse.json(
          { success: false, error: `Profile load failed: ${profilesErr.message}` },
          { status: 500 }
        )
      }

      const userIds = Array.from(
        new Set(((profiles as any[]) || []).map((p) => p.user_id).filter(Boolean))
      )

      if (userIds.length === 0) {
        return NextResponse.json({
          success: true,
          sent: 0,
          failed: 0,
          debug: {
            reason: "no_user_ids_for_selected_players",
            selected_player_ids,
          },
        })
      }

      const { data: tokenRows, error: tokenErr } = await supabase
        .from("fcm_tokens")
        .select("token, user_id")
        .in("user_id", userIds)

      if (tokenErr) {
        return NextResponse.json(
          { success: false, error: `Token load failed: ${tokenErr.message}` },
          { status: 500 }
        )
      }

      tokens = Array.from(
        new Set(((tokenRows as any[]) || []).map((r) => r.token).filter(Boolean))
      )
    }

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        debug: {
          reason: "no_tokens_found",
          send_to_all,
          selected_player_ids,
        },
      })
    }

    const title = "📢 Vereinsinfo"
    const dateStr = push_date || ""
    const timeStr = push_time || ""
    const when = [dateStr, timeStr].filter(Boolean).join(" • ")
    const bodyText = [trimText(text, 220), when].filter(Boolean).join(" • ")

    const tag = `admin-push:${Date.now()}`
    const notif_id = stableNotifIdFromTag(tag)

    const admin = getFirebaseAdmin()

    const multicast = await admin.messaging().sendEachForMulticast({
      tokens,
      android: { priority: "high" },
      data: {
        type: "admin_push",
        clickUrl: "/",

        title: title,
        text: text,
        body: bodyText,
        message: bodyText,
        senderName: "EMD Vereinsapp",
        conversation: title,

        imageUrl: imageUrl,
        iconUrl: imageUrl,

        push_date: dateStr,
        push_time: timeStr,

        tag: String(tag),
        notif_id: String(notif_id),
        ts: String(Date.now()),
      },
    })

    return NextResponse.json({
      success: true,
      sent: multicast.successCount,
      failed: multicast.failureCount,
      debug: {
        tokenCount: tokens.length,
        send_to_all,
        selected_player_ids,
      },
    })
  } catch (e: any) {
    console.error("[send-admin-push] error:", e)
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    )
  }
}
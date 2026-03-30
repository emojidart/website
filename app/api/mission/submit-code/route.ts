import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SECRET_TRIGGER_CODE = "193"
const SECRET_SECOND_CODE = "058"

export async function POST(req: Request) {
  try {
    const { userId, playerId, code } = await req.json()

    if (!userId || !code) {
      return NextResponse.json({ message: "Fehlende Daten" }, { status: 400 })
    }

    const normalized = code.trim().toUpperCase()

    // 🔐 SECRET 1
    if (normalized === SECRET_TRIGGER_CODE) {
      await supabase.from("oster_mission_secret_progress").upsert(
        {
          user_id: userId,
          secret_193_unlocked: true,
          secret_193_unlocked_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

      return NextResponse.json({ type: "secret_193" })
    }

    // 🔐 SECRET 2
    if (normalized === SECRET_SECOND_CODE) {
      await supabase.from("oster_mission_secret_progress").upsert(
        {
          user_id: userId,
          secret_193_unlocked: true,
          secret_058_unlocked: true,
          secret_058_unlocked_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

      return NextResponse.json({ type: "secret_058" })
    }

    // 🔎 NORMALER CODE (NUR SERVER!)
    const { data: codeRow } = await supabase
      .from("oster_mission_codes")
      .select("*")
      .eq("code_value", normalized)
      .maybeSingle()

    if (!codeRow) {
      return NextResponse.json(
        { message: "Falscher Code" },
        { status: 400 }
      )
    }

    // ❌ Schon gelöst?
    const { data: existing } = await supabase
      .from("oster_mission_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("day_number", codeRow.day_number)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: "Bereits gelöst" },
        { status: 400 }
      )
    }

    // 💾 Speichern
    await supabase.from("oster_mission_progress").insert({
      user_id: userId,
      player_id: playerId,
      day_number: codeRow.day_number,
      code_value: codeRow.code_value,
      letter: codeRow.letter,
    })

    return NextResponse.json({
      type: "day_code",
      dayNumber: codeRow.day_number,
      letter: codeRow.letter,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server Fehler" },
      { status: 500 }
    )
  }
}
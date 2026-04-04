import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SECRET_TRIGGER_CODE = "193"
const SECRET_SECOND_CODE = "058"

const TOTAL_DAYS = 7

const RELEASE_DATES = [
  "2026-03-30T00:01:00+02:00",
  "2026-03-31T08:00:00+02:00",
  "2026-04-01T08:00:00+02:00",
  "2026-04-02T08:00:00+02:00",
  "2026-04-03T08:00:00+02:00",
  "2026-04-04T08:00:00+02:00",
  "2026-04-05T08:00:00+02:00",
]

function getAvailableDay() {
  const now = new Date()

  const unlockedCount = RELEASE_DATES.filter((date) => {
    return new Date(date).getTime() <= now.getTime()
  }).length

  return Math.min(unlockedCount, TOTAL_DAYS)
}

export async function POST(req: Request) {
  try {
    const { userId, playerId, code } = await req.json()

    if (!userId || !code) {
      return NextResponse.json({ message: "Fehlende Daten" }, { status: 400 })
    }

    const normalized = code.trim().toUpperCase()
	
	// 4 = spezieller Frontend-Trigger für Tag 4
// KEIN Eintrag in oster_mission_secret_progress
if (normalized === "4") {
  return NextResponse.json({
    type: "day_code",
    dayNumber: 4,
    letter: "",
    openHint4Modal: true,
  })
}

    if (normalized === SECRET_TRIGGER_CODE) {
      const { error } = await supabase
        .from("oster_mission_secret_progress")
        .upsert(
          {
            user_id: userId,
            secret_193_unlocked: true,
            secret_193_unlocked_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (error) {
        console.error("secret 193 save error:", error)
        return NextResponse.json(
          { message: "Secret konnte nicht gespeichert werden." },
          { status: 500 }
        )
      }

      return NextResponse.json({ type: "secret_193" })
    }

    if (normalized === SECRET_SECOND_CODE) {
      const { error } = await supabase
        .from("oster_mission_secret_progress")
        .upsert(
          {
            user_id: userId,
            secret_193_unlocked: true,
            secret_058_unlocked: true,
            secret_058_unlocked_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (error) {
        console.error("secret 058 save error:", error)
        return NextResponse.json(
          { message: "Secret konnte nicht gespeichert werden." },
          { status: 500 }
        )
      }

      return NextResponse.json({ type: "secret_058" })
    }

    const { data: codeRow, error: codeError } = await supabase
      .from("oster_mission_codes")
      .select("*")
      .eq("code_value", normalized)
      .maybeSingle()

    if (codeError) {
      console.error("code lookup error:", codeError)
      return NextResponse.json(
        { message: "Code konnte nicht geprüft werden." },
        { status: 500 }
      )
    }

    if (!codeRow) {
      return NextResponse.json(
        { message: "Falscher Code" },
        { status: 400 }
      )
    }

    const availableDay = getAvailableDay()

    if (availableDay <= 0) {
      return NextResponse.json(
        { message: "Aktuell ist noch kein Rätseltag freigeschaltet." },
        { status: 400 }
      )
    }

    const { data: solvedRows, error: solvedError } = await supabase
      .from("oster_mission_progress")
      .select("day_number")
      .eq("user_id", userId)
      .order("day_number", { ascending: true })

    if (solvedError) {
      console.error("solved rows error:", solvedError)
      return NextResponse.json(
        { message: "Fortschritt konnte nicht geprüft werden." },
        { status: 500 }
      )
    }

    const solvedDays = new Set((solvedRows ?? []).map((row) => row.day_number))
    const nextExpectedDay = Math.min((solvedRows?.length ?? 0) + 1, availableDay)

    if (solvedDays.has(codeRow.day_number)) {
      return NextResponse.json(
        { message: `Tag ${codeRow.day_number} wurde bereits gelöst.` },
        { status: 400 }
      )
    }

    if (codeRow.day_number > availableDay) {
      return NextResponse.json(
  { message: "Dieser Code ist leider nicht korrekt." },
  { status: 400 }
)
    }

    if (codeRow.day_number !== nextExpectedDay) {
      return NextResponse.json(
  { message: "Dieser Code ist leider nicht korrekt." },
  { status: 400 }
)
    }

    const { error: insertError } = await supabase
      .from("oster_mission_progress")
      .insert({
        user_id: userId,
        player_id: playerId,
        day_number: codeRow.day_number,
        code_value: codeRow.code_value,
        letter: codeRow.letter,
      })

    if (insertError) {
      console.error("insert progress error:", insertError)
      return NextResponse.json(
        { message: "Der richtige Code konnte nicht gespeichert werden." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      type: "day_code",
      dayNumber: codeRow.day_number,
      letter: codeRow.letter,
    })
  } catch (err) {
    console.error("submit-code route error:", err)
    return NextResponse.json(
      { message: "Server Fehler" },
      { status: 500 }
    )
  }
}
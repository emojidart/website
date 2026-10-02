import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}

function cleanSearch(value: string) {
  return value
    .trim()
    .replace(/[%_*,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80)
}

export async function GET(request: Request) {
  try {
    const q = cleanSearch(
      new URL(request.url).searchParams.get("q") || "",
    )

    if (q.length < 3) {
      return NextResponse.json({ players: [] })
    }

    const supabase = adminClient()
    const numeric = /^\d+$/.test(q)

    let rows: any[] = []

    if (numeric) {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id,name,verein,sportdarts_player_number,sportdarts_name")
        .eq("sportdarts_player_number", q)
        .limit(5)

      if (error) throw error
      rows = data || []
    } else {
      const [{ data: byName, error: nameError }, { data: bySportdartsName, error: sportError }] =
        await Promise.all([
          supabase
            .from("spieldatenbank")
            .select("id,name,verein,sportdarts_player_number,sportdarts_name")
            .ilike("name", `%${q}%`)
            .limit(5),
          supabase
            .from("spieldatenbank")
            .select("id,name,verein,sportdarts_player_number,sportdarts_name")
            .ilike("sportdarts_name", `%${q}%`)
            .limit(5),
        ])

      if (nameError) throw nameError
      if (sportError) throw sportError

      const unique = new Map<string, any>()
      ;[...(byName || []), ...(bySportdartsName || [])].forEach((row: any) => {
        unique.set(String(row.id), row)
      })

      rows = Array.from(unique.values()).slice(0, 8)
    }

    if (!rows.length) {
      return NextResponse.json({ players: [] })
    }

    const ids = rows.map((row) => String(row.id))

    const { data: memberships, error: memberError } = await supabase
      .from("club_players")
      .select("spieldatenbank_id")
      .in("spieldatenbank_id", ids)
      .eq("is_active", true)
      .is("club_left_at", null)

    if (memberError) throw memberError

    const internalIds = new Set(
      (memberships || [])
        .map((row: any) => row.spieldatenbank_id)
        .filter(Boolean)
        .map(String),
    )

    const needle = q.toLocaleLowerCase("de-AT")

    const players = rows
      .filter((row) => !internalIds.has(String(row.id)))
      .sort((a, b) => {
        const aNumber =
          String(a.sportdarts_player_number || "") === q ? 0 : 1
        const bNumber =
          String(b.sportdarts_player_number || "") === q ? 0 : 1
        if (aNumber !== bNumber) return aNumber - bNumber

        const an = String(a.name || "").toLocaleLowerCase("de-AT")
        const bn = String(b.name || "").toLocaleLowerCase("de-AT")

        const aExact = an === needle ? 0 : 1
        const bExact = bn === needle ? 0 : 1
        if (aExact !== bExact) return aExact - bExact

        const aStart = an.startsWith(needle) ? 0 : 1
        const bStart = bn.startsWith(needle) ? 0 : 1
        if (aStart !== bStart) return aStart - bStart

        return an.localeCompare(bn, "de")
      })
      .slice(0, 5)
      .map((row) => ({
        player_id: String(row.id),
        name: String(row.name || ""),
        verein: row.verein ? String(row.verein) : null,
        sportdarts_player_number: row.sportdarts_player_number
          ? String(row.sportdarts_player_number)
          : null,
        sportdarts_name: row.sportdarts_name
          ? String(row.sportdarts_name)
          : null,
      }))

    return NextResponse.json({ players })
  } catch (error) {
    console.error("Terminal tournament player search error:", error)
    return NextResponse.json(
      { error: "Spielersuche konnte nicht durchgeführt werden." },
      { status: 500 },
    )
  }
}

"use client"

import { useSearchParams } from "next/navigation"
import Bracket8 from "@/components/tournament-bracket-8er"
import Bracket16 from "@/components/tournament-bracket_16er"
import Bracket32 from "@/components/tournament-bracket_32er"
import Bracket64 from "@/components/tournament-bracket_64er"
import Bracket128 from "@/components/tournament-bracket_128er"

/** Remount only the bracket on a new tournament ID: its internal initialization refs
 * and bracket state must never leak between parallel Herren/Damen tournaments. */
export function EmdDkoKeyedBracket({ size }: { size: 8 | 16 | 32 | 64 | 128 }) {
  const params = useSearchParams()
  const id = params.get("tournamentId") || "new"
  const key = `${size}:${id}`

  switch (size) {
    case 8: return <Bracket8 key={key} />
    case 16: return <Bracket16 key={key} />
    case 32: return <Bracket32 key={key} />
    case 64: return <Bracket64 key={key} />
    case 128: return <Bracket128 key={key} />
  }
}

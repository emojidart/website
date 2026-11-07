import type { ReactNode } from "react"
import { TournamentSurface } from "@/components/tournaments/tournament-surface"
import "./members.css"

/** Reuses the established EMD surface tokens; no second palette. */
export function MemberSurface({ children }: { children: ReactNode }) {
  return <TournamentSurface><div className="emd-member-surface">{children}</div></TournamentSurface>
}

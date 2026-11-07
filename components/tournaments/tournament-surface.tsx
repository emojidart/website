import type { ReactNode } from "react"
import "./tournaments.css"

/** Local tokens deliberately leave the home page and global primitives untouched. */
export function TournamentSurface({ children }: { children: ReactNode }) {
  return <div className="emd-tournament-surface">{children}</div>
}

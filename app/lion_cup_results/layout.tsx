import type { ReactNode } from "react"
import { TournamentSurface } from "@/components/tournaments/tournament-surface"
export default function Layout({ children }: { children: ReactNode }) { return <TournamentSurface>{children}</TournamentSurface> }

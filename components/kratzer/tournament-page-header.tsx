"use client"

import { TournamentPageTitle } from "@/components/tournaments/tournament-ui"

interface TournamentPageHeaderProps {
  title: string
  subtitle?: string
}

export function TournamentPageHeader({ title, subtitle }: TournamentPageHeaderProps) {
  return (
    <TournamentPageTitle title={title} description={subtitle} eyebrow="EMD · Kratzer" />
  )
}

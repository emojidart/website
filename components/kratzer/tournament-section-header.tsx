"use client"

import type { ReactNode } from "react"

interface TournamentSectionHeaderProps {
  title: string
  icon: ReactNode
}

export function TournamentSectionHeader({
  title,
  icon,
}: TournamentSectionHeaderProps) {
  return (
    <div className="border-b pb-4 mb-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
        {icon}
        {title}
      </h2>
    </div>
  )
}
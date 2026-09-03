"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SectionCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

export function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="mb-0 border-b border-gray-100 bg-gray-50/60 px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-950">
          {icon}
          {title}
        </h2>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
  )
}
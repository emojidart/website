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
    <Card className="mb-8 p-5 shadow-xl border-gray-200">
      <CardHeader className="border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
          {icon}
          {title}
        </h2>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  )
}
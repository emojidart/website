"use client"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SectionCardProps { title: string; icon: ReactNode; children: ReactNode }

export function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,.55)]">
      <CardHeader className="mb-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-orange-100 bg-orange-50 text-orange-600">{icon}</span>
          <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  )
}

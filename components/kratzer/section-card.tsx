"use client"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SectionCardProps { title: string; icon: ReactNode; children: ReactNode }

export function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <Card className="mb-5 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#090b0f] text-white shadow-[0_18px_55px_-42px_rgba(0,0,0,.85)]">
      <CardHeader className="mb-0 border-b border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-orange-300/20 bg-orange-500/[0.08] text-orange-300">{icon}</span>
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">{title}</h2>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  )
}

import React from "react"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  gradient: string
}

export function StatCard({ icon, label, value, gradient }: StatCardProps) {

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm bg-card border border-border">

      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />

      <div className="relative p-4 flex flex-col items-center text-center">

        <div className="mb-2 text-muted-foreground">{icon}</div>

        <div className="text-sm text-muted-foreground">{label}</div>

        <div className="text-xl font-bold text-foreground">{value}</div>

      </div>

    </div>
  )
}
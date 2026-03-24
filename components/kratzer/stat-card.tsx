import React from "react"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  gradient: string
}

export function StatCard({ icon, label, value, gradient }: StatCardProps) {

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm bg-white border border-gray-200">

      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />

      <div className="relative p-4 flex flex-col items-center text-center">

        <div className="mb-2 text-gray-700">{icon}</div>

        <div className="text-sm text-gray-500">{label}</div>

        <div className="text-xl font-bold text-gray-900">{value}</div>

      </div>

    </div>
  )
}
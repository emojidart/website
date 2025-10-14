import { Card, CardContent } from "@/components/ui/card"
import type { ReactNode } from "react"

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  gradient: string
}

export default function StatCard({ icon, label, value, gradient }: StatCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

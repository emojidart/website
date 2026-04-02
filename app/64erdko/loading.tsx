import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}
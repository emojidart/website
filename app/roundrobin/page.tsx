import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import RoundRobinClient from "./RoundRobinClient"

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton kind="tournament" label="Bereich wird geladen…" />}>
      <RoundRobinClient />
    </Suspense>
  )
}

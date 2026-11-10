import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import ChatAppClient from "./chat-app-client"

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton kind="cards" label="Bereich wird geladen…" />}>
      <ChatAppClient />
    </Suspense>
  )
}

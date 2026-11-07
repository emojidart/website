import { SectionSkeleton } from "@/components/loading/loading"

import { Suspense } from "react"
import ChatAppClient from "@/app/chat-app/chat-app-client"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"

export default function Page() {
  return (
    <MembershipAccessGate
      required={["edart_league", "steeldart_league"]}
      requireAll={false}
      title="Liga-Chat nicht freigeschaltet"
      description="Für den Liga-Chat benötigst du ein E-Dart- oder Steeldart-Liga-Paket."
    >
      <Suspense fallback={<SectionSkeleton kind="cards" label="Bereich wird geladen…" />}>
        <ChatAppClient
          backHref="/member-league-app"
          backLabel="Liga"
          contextLabel="Ligazentrale"
        />
      </Suspense>
    </MembershipAccessGate>
  )
}

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
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#040609] p-6 text-sm font-bold text-white/40">Lade Liga-Chat…</div>}>
        <ChatAppClient
          backHref="/member-league-app"
          backLabel="Liga"
          contextLabel="Ligazentrale"
        />
      </Suspense>
    </MembershipAccessGate>
  )
}

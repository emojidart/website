import { Suspense } from "react"
import ChatAppClient from "./chat-app-client"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"

export default function Page() {
  return (
    <MembershipAccessGate
      required={["base_membership"]}
      requireAll={false}
      title="Vereinschat nicht freigeschaltet"
      description="Für den Vereinschat benötigst du eine aktive Grundmitgliedschaft."
    >
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#040609] p-6 text-sm font-bold text-white/40">Lade Chat…</div>}>
        <ChatAppClient
          backHref="/member-profile-app"
          backLabel="Profil"
          contextLabel="EMD Vereinsapp"
        />
      </Suspense>
    </MembershipAccessGate>
  )
}

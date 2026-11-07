import { Suspense } from "react"
import ChatAppClient from "@/app/chat-app/chat-app-client"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"

function LeagueChatLoading() {
  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#111820] text-white" role="status" aria-busy="true" aria-label="Liga-Chat wird geladen">
      <div className="flex h-full w-full min-h-0 flex-col border-r border-white/[0.06] bg-[#111820] lg:w-[405px] lg:shrink-0 xl:w-[430px]">
        <div className="border-b border-white/[0.05] bg-[#171f27] px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-white/10" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-7 w-20 animate-pulse rounded-full bg-white/10" />)}
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-hidden p-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl p-3">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-3/5 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden min-w-0 flex-1 flex-col bg-[#0d141b] lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="m-4 h-12 animate-pulse rounded-xl bg-white/10" />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <MembershipAccessGate
      required={["edart_league", "steeldart_league"]}
      requireAll={false}
      title="Liga-Chat nicht freigeschaltet"
      description="Für den Liga-Chat benötigst du ein E-Dart- oder Steeldart-Liga-Paket."
    >
      <Suspense fallback={<LeagueChatLoading />}>
        <ChatAppClient
          backHref="/member-league-app"
          backLabel="Liga"
          contextLabel="Ligazentrale"
        />
      </Suspense>
    </MembershipAccessGate>
  )
}

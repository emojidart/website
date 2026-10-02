import { Suspense } from "react"
import ChatAppClient from "./chat-app-client"

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#040609] p-6 text-sm font-bold text-white/35">Lade Chat…</div>}>
      <ChatAppClient />
    </Suspense>
  )
}

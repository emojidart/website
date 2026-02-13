import { Suspense } from "react"
import ChatAppClient from "./chat-app-client"

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Lade Chat…</div>}>
      <ChatAppClient />
    </Suspense>
  )
}

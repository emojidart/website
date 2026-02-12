import { Suspense } from "react"
import RoundRobinClient from "./RoundRobinClient"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RoundRobinClient />
    </Suspense>
  )
}

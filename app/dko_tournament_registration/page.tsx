"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LegacyDkoTournamentRegistrationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    router.replace(`/admin/einzelturnier${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  return null
}

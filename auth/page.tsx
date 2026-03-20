"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackClient />
    </Suspense>
  )
}

function CallbackLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  )
}

function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [msg, setMsg] = useState("Anmeldung wird verarbeitet…")

  useEffect(() => {
    const run = async () => {
      const next = searchParams.get("next") || "/member-set-password"

      try {
        const code = searchParams.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            router.replace(
              `/member-login?error=${encodeURIComponent("Reset-Link ungültig oder abgelaufen. Bitte erneut Passwort vergessen wählen.")}`
            )
            return
          }

          router.replace(next)
          return
        }

        const hash = window.location.hash
        if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
          const { error } = await supabase.auth.getSession()

          if (error) {
            router.replace(
              `/member-login?error=${encodeURIComponent("Reset-Link konnte nicht verarbeitet werden. Bitte erneut versuchen.")}`
            )
            return
          }

          router.replace(next)
          return
        }

        setMsg("Ungültiger Link. Bitte Passwort-Reset erneut anfordern.")
      } catch {
        router.replace(
          `/member-login?error=${encodeURIComponent("Beim Verarbeiten des Reset-Links ist ein Fehler aufgetreten.")}`
        )
      }
    }

    run()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">{msg}</p>
        </div>
      </main>
    </div>
  )
}
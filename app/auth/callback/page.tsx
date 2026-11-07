"use client"

import { PageLoader, SectionSkeleton, LoadingIndicator } from "@/components/loading/loading"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<SectionSkeleton kind="cards" label="Bereich wird geladen…" />}>
      <AuthCallbackClient />
    </Suspense>
  )
}

function CallbackLoading() {
  return <PageLoader label="Zugang wird vorbereitet…" fullPage />
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
        const tokenHash = searchParams.get("token_hash")
        const type = searchParams.get("type")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            router.replace(
              `/member-login?error=${encodeURIComponent(
                `Reset-Link ungültig oder abgelaufen: ${error.message}`
              )}`
            )
            return
          }

          router.replace(next)
          return
        }

        if (type === "recovery" && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          })

          if (error) {
            router.replace(
              `/member-login?error=${encodeURIComponent(
                `Recovery-Link ungültig oder abgelaufen: ${error.message}`
              )}`
            )
            return
          }

          router.replace(next)
          return
        }

        const hash = window.location.hash
        if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
          const { data, error } = await supabase.auth.getSession()

          if (error || !data.session) {
            router.replace(
              `/member-login?error=${encodeURIComponent(
                "Reset-Link konnte nicht verarbeitet werden. Bitte erneut versuchen."
              )}`
            )
            return
          }

          router.replace(next)
          return
        }

        router.replace(
          `/member-login?error=${encodeURIComponent(
            "Ungültiger oder unvollständiger Reset-Link. Bitte Passwort-Reset erneut anfordern."
          )}`
        )
      } catch (e: any) {
        router.replace(
          `/member-login?error=${encodeURIComponent(
            e?.message || "Beim Verarbeiten des Reset-Links ist ein Fehler aufgetreten."
          )}`
        )
      }
    }

    run()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingIndicator className="w-8 h-8 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
      </main>
    </div>
  )
}
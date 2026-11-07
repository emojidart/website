"use client"

import { PageLoader, SectionSkeleton } from "@/components/loading/loading"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { Lock, Save } from "lucide-react"

export default function MemberSetPasswordPage() {
  return (
    <Suspense fallback={<SectionSkeleton kind="cards" label="Bereich wird geladen…" />}>
      <MemberSetPasswordClient />
    </Suspense>
  )
}

function SetPasswordSkeleton() {
  return <PageLoader label="Zugang wird vorbereitet…" fullPage />
}

function MemberSetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const run = async () => {
      setMsg("")

      const tokenHash = searchParams.get("token_hash")
      const type = searchParams.get("type")

      if (type === "recovery" && tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        })

        if (error) {
          setReady(false)
          setMsg(`Link ungültig oder abgelaufen: ${error.message}`)
          return
        }

        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        setReady(true)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setReady(true)
        return
      }

      setReady(false)
      setMsg("Ungültiger oder abgelaufener Link. Bitte erneut „Passwort vergessen“ drücken.")
    }

    run()
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg("")

    if (password.length < 8) {
      setMsg("Passwort muss mindestens 8 Zeichen haben.")
      return
    }

    if (password !== password2) {
      setMsg("Passwörter stimmen nicht überein.")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setMsg(`Fehler: ${error.message}`)
        return
      }

      setMsg("Passwort gespeichert! Weiterleitung…")
      setTimeout(() => router.replace("/member-profile-app"), 700)
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "Passwort konnte nicht gespeichert werden.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto max-w-md px-4 pb-12 pt-24">
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Passwort festlegen</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Bitte setze jetzt dein neues Passwort.</p>
          </CardHeader>

          <CardContent>
            {msg ? (
              <div
                role="status"
                aria-live="polite"
                className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                  msg.includes("gespeichert")
                    ? "bg-green-500/10 text-green-200 border border-green-400/25"
                    : "bg-red-500/10 text-red-200 border border-red-400/25"
                }`}
              >
                {msg}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Neues Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 rounded-xl"
                    placeholder="mind. 8 Zeichen"
                    autoComplete="new-password"
                    required
                    disabled={!ready}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password2" className="text-sm font-medium text-foreground">Passwort wiederholen</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    id="password2"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="pl-12 h-12 rounded-xl"
                    placeholder="nochmal eingeben"
                    autoComplete="new-password"
                    required
                    disabled={!ready}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!ready || loading} loading={Boolean(loading)} loadingLabel="Speichere…">{(
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Passwort speichern
                  </span>
                )}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
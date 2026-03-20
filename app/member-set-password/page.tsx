"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { Lock, Save } from "lucide-react"

export default function MemberSetPasswordPage() {
  return (
    <Suspense fallback={<SetPasswordSkeleton />}>
      <MemberSetPasswordClient />
    </Suspense>
  )
}

function SetPasswordSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  )
}

function MemberSetPasswordClient() {
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let unsub: null | (() => void) = null

    const run = async () => {
      setMsg("")

      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setReady(true)
        return
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setReady(true)
          setMsg("")
        }
      })

      unsub = () => authListener.subscription.unsubscribe()

      setReady(false)
      setMsg("Ungültiger oder abgelaufener Link. Bitte auf der Login-Seite erneut „Passwort vergessen“ drücken.")
    }

    run()

    return () => {
      if (unsub) unsub()
    }
  }, [])

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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-10 max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black">Passwort festlegen</CardTitle>
            <p className="text-sm text-gray-600 mt-2">Bitte setze jetzt dein neues Passwort.</p>
          </CardHeader>

          <CardContent>
            {msg ? (
              <div
                className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                  msg.includes("gespeichert")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Neues Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
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
                <label className="text-sm font-semibold text-gray-700">Passwort wiederholen</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
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

              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!ready || loading}>
                {loading ? (
                  "Speichere…"
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Passwort speichern
                  </span>
                )}
              </Button>

              {!ready ? (
                <div className="text-xs text-gray-500 mt-2">
                  Bitte den neuesten Passwort-Reset-Link direkt aus der E-Mail öffnen.
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
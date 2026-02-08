"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { Lock, Save } from "lucide-react"

export default function MemberSetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  // 1) Stelle sicher, dass eine Session existiert (Recovery Link muss sie liefern)
  useEffect(() => {
    let unsub: null | (() => void) = null

    const run = async () => {
      setMsg("")

      // Supabase verarbeitet dank detectSessionInUrl + implicit die URL selbst.
      // Wir warten kurz und schauen dann ob eine Session da ist.
      const check = async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setReady(true)
          return true
        }
        return false
      }

      // Erstcheck
      if (await check()) return

      // Falls noch nicht da: auf Auth-Event warten (wenn detectSessionInUrl async fertig wird)
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          setReady(true)
          setMsg("")
        }
      })
      unsub = () => data.subscription.unsubscribe()

      // Wenn alter Link mit ?code=... kommt: versuchen (kann nur im selben Browser klappen)
      const code = searchParams.get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setReady(false)
          setMsg(
            `Link ungültig/abgelaufen: ${error.message}\n\nTipp: Bitte „Passwort vergessen“ nochmal drücken und den neuen Link öffnen.`
          )
          return
        }

        // URL säubern
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        // Session nochmal checken
        if (!(await check())) {
          setReady(false)
          setMsg("Konnte Session nicht aktivieren. Bitte Passwort-Reset erneut anfordern.")
        }
        return
      }

      // Kein code & keine session
      setReady(false)
      setMsg("Ungültiger oder abgelaufener Link. Bitte auf der Login-Seite erneut „Passwort vergessen“ drücken.")
    }

    run()

    return () => {
      if (unsub) unsub()
    }
  }, [searchParams])

  // 2) Passwort setzen
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
                  Wenn du den Link am falschen Gerät geöffnet hast: Bitte auf der Login-Seite erneut „Passwort vergessen“
                  drücken und den neuen Link öffnen.
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

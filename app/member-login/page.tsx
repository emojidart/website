"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Mail, Lock, ArrowRight, Users, Crown, ShieldCheck, KeyRound, AlertTriangle, Info, Eye, EyeOff } from "lucide-react"

export default function MemberLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <MemberLoginClient />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </main>
      <MobileBottomNav />
    </div>
  )
}

function MemberLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  
  const mapAuthError = (error: any) => {
    const msg = error?.message?.toLowerCase() || ""

    if (msg.includes("invalid login credentials")) {
      return "E-Mail oder Passwort ist nicht korrekt."
    }

    if (msg.includes("email not confirmed")) {
      return "Bitte bestätige zuerst deine E-Mail-Adresse."
    }

    if (msg.includes("too many requests")) {
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut."
    }

    return "Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben."
  }

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) return
    setMessage("Aktiviere Link…")
    router.replace(`/member-set-password?code=${encodeURIComponent(code)}`)
  }, [searchParams, router])

  useEffect(() => {
    if (!authLoading && session) router.push("/member-profile-app")
  }, [session, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setMessage(mapAuthError(error))
        return
      }

      if (data.user) router.push("/member-profile-app")
      else setMessage("Anmeldung fehlgeschlagen. Bitte versuche es erneut.")
    } catch (err: any) {
      setMessage("Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    setMessage("")
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail) {
        setMessage("Bitte zuerst deine E-Mail-Adresse eingeben.")
        return
      }

      const redirectTo = `${window.location.origin}/member-set-password`
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })

      if (error) {
        setMessage("Zurücksetzen fehlgeschlagen. Bitte prüfe deine E-Mail-Adresse.")
        return
      }

      setMessage("Reset-Mail wurde gesendet. Bitte Link in der Mail klicken.")
    } catch (e: any) {
      setMessage("Zurücksetzen fehlgeschlagen. Bitte versuche es erneut.")
    } finally {
      setResetLoading(false)
    }
  }

  if (authLoading) return <LoginSkeleton />

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Member-Zugang</h1>
            <p className="text-gray-600 text-lg">Willkommen bei Emoj!&apos;s Dartverein</p>

            <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-gray-900">Wichtige Info</div>
                      <div className="text-sm text-gray-700">
                        Falls du dich nicht mehr einloggen kannst, setze bitte dein Passwort einmalig zurück.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl border-orange-200 bg-white hover:bg-orange-50"
                      onClick={() => setIsInfoOpen(true)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <DialogContent className="sm:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-orange-600" />
                    Hinweis zum Login
                  </DialogTitle>
                  <DialogDescription>
                    Infolge eines technischen Sicherheitsupdates kann es vorkommen, dass sich einzelne Benutzer nicht mehr wie gewohnt anmelden können.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <Button className="rounded-xl" onClick={() => setIsInfoOpen(false)}>
                    Verstanden
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine.email@example.com"
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Dein Passwort"
                      className="pl-12 pr-12 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="text-center p-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl"
                >
                  {loading ? "Wird geladen…" : "Anmelden"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={resetLoading || loading}
                  onClick={handlePasswordReset}
                  className="w-full h-12 rounded-xl border-2"
                >
                  {resetLoading ? "Sende Reset-Mail…" : "Passwort vergessen"}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  Noch keinen Zugang?{" "}
                  <Link href="/member-account-request" className="font-semibold text-orange-600">
                    Mit Code registrieren
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

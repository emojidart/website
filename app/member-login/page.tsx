"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Mail, Lock, ArrowRight, Users, Crown, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MemberLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  // ✅ Handle invite/confirmation links that land on /member-login with tokens in URL hash
  // Example:
  // /member-login#access_token=...&refresh_token=...&type=invite
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window === "undefined") return
        const hash = window.location.hash || ""
        if (!hash || hash.length < 2) return

        const params = new URLSearchParams(hash.replace(/^#/, ""))
        const type = params.get("type")
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")

        if (type === "invite" && access_token && refresh_token) {
          setLoading(true)
          setMessage("Einladung bestätigt – bitte Passwort festlegen...")

          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            setMessage(`Aktivierung fehlgeschlagen: ${error.message}`)
            setLoading(false)
            return
          }

          // Remove tokens from the URL (security/cleanliness)
          window.history.replaceState({}, document.title, window.location.pathname)

          // Go to password setup page (your app uses /member-set-password)
          router.replace("/member-set-password")
        }
      } catch (e: any) {
        setMessage(`Aktivierung fehlgeschlagen: ${e?.message || "Unbekannter Fehler"}`)
        setLoading(false)
      }
    }

    run()
  }, [router])

  // Redirect if already logged in (but NOT if we're in the invite-hash flow)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || ""
      if (hash.includes("type=invite")) return
    }
    if (!authLoading && session) {
      router.push("/member-profile")
    }
  }, [session, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setMessage("Anmeldung erfolgreich!")
        router.push("/member-profile")
      }
    } catch (error: any) {
      setMessage(`Anmeldung fehlgeschlagen: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

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
          </div>

          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-6 text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Kapitäne</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Co-Kapitäne</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Spieler</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Dein Passwort"
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-orange-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                {message && (
                  <div
                    className={`text-center p-4 rounded-xl text-sm font-medium ${
                      message.includes("erfolgreich") || message.includes("Einladung bestätigt")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {message}
                  </div>
                )}

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Wird geladen...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Anmelden
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

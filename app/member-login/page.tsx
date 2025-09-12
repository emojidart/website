"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Mail, Lock, ArrowRight, Users, Crown, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"

export default function MemberLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
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

      if (error) {
        throw error
      }

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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Member-Zugang</h1>
            <p className="text-gray-600 text-lg">Willkommen zurück bei Emoj!'s Dartverein</p>
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
                      placeholder="deine@email.de"
                      className="pl-12 h-14 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50 transition-all duration-200 text-lg rounded-xl"
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
                      className="pl-12 h-14 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50 transition-all duration-200 text-lg rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 uppercase tracking-wide"
                >
                  {loading ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Anmeldung läuft...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <span>Anmelden</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>

                {/* Status Message */}
                {message && (
                  <div
                    className={`p-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      message.includes("fehlgeschlagen") || message.includes("error")
                        ? "bg-red-50 text-red-700 border-2 border-red-200"
                        : "bg-green-50 text-green-700 border-2 border-green-200"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-2">
              Noch kein Account? Wende dich an deinen Kapitän oder Co-Kapitän.
            </p>
            <p className="text-xs text-gray-400">Zugang nur für Vereinsmitglieder</p>
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Mail, Lock, ArrowRight, Shield } from "lucide-react"

interface AuthSectionProps {
  isVisible: boolean
  onLoginSuccess: () => void
  authMessage: string
  setAuthMessage: (message: string) => void
}

export function AuthSection({ isVisible, onLoginSuccess, authMessage, setAuthMessage }: AuthSectionProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthMessage("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setAuthMessage("Anmeldung erfolgreich!")
        onLoginSuccess()
      }
    } catch (error: any) {
      setAuthMessage(`Anmeldung fehlgeschlagen: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-6 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Admin-Zugang</h1>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="font-medium">Administratoren-Portal</span>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleLogin} className="space-y-6">
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
                    placeholder="admin@beispiel.de"
                    className="pl-12 h-14 border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50 transition-all duration-200 text-lg rounded-xl"
                    required
                  />
                </div>
              </div>

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
                    placeholder="Ihr Passwort eingeben"
                    className="pl-12 h-14 border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50 transition-all duration-200 text-lg rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 uppercase tracking-wide"
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

              {authMessage && (
                <div
                  className={`p-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    authMessage.includes("fehlgeschlagen") || authMessage.includes("error")
                      ? "bg-red-50 text-red-700 border-2 border-red-200"
                      : "bg-green-50 text-green-700 border-2 border-green-200"
                  }`}
                >
                  {authMessage}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

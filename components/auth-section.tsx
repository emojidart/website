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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h1>
          <p className="text-gray-600">Melden Sie sich in Ihrem Admin-Bereich an</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">Admin-Zugang</h2>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@beispiel.de"
                    className="pl-10 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ihr Passwort eingeben"
                    className="pl-10 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Anmeldung läuft...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Anmelden</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>

              {/* Status Message */}
              {authMessage && (
                <div
                  className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    authMessage.includes("fehlgeschlagen") || authMessage.includes("error")
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : "bg-green-50 text-green-700 border border-green-100"
                  }`}
                >
                  {authMessage}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">Sicherer Admin-Zugang für die Turnierverwaltung</p>
        </div>
      </div>
    </div>
  )
}

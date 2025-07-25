"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthMessage("Logge ein...")

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setAuthMessage(`Login-Fehler: ${error.message}`)
    } else {
      setAuthMessage("Erfolgreich eingeloggt!")
      onLoginSuccess() // Callback to hide auth section and update parent state
    }
    setLoading(false)
  }

  if (!isVisible) return null

  return (
    <section className="auth-section flex justify-center p-4">
      <Card className="w-full max-w-md bg-brutal-card-bg text-brutal-text border-brutal-border rounded-xl shadow-2xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-extrabold text-center text-brutal-accent-gold drop-shadow-md">
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">
                E-Mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="E-Mail Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Passwort
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brutal-accent-red hover:bg-brutal-accent-gold text-brutal-bg font-extrabold text-lg rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? "Logge ein..." : "Login"}
            </Button>
          </form>
          {authMessage && (
            <p
              className={`auth-message mt-8 text-center text-xl font-semibold ${authMessage.includes("Fehler") ? "text-destructive" : "text-green-500"}`}
            >
              {authMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useState } from "react"
import Link from "next/link"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Mail,
  Lock,
  UserRound,
  Phone,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
} from "lucide-react"

export default function GastzugangPage() {
  const [fullName, setFullName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      const res = await fetch("/api/guest-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          playerName,
          email,
          phone,
          password,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage(data?.error || "Antrag konnte nicht gesendet werden.")
        return
      }

      setSuccess(true)
      setMessage(
        "Dein Gastantrag wurde erfolgreich übermittelt. Nach Prüfung wird dein Zugang freigeschaltet.",
      )

      setFullName("")
      setPlayerName("")
      setEmail("")
      setPhone("")
      setPassword("")
    } catch {
      setMessage("Ein Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900">
              Gastzugang beantragen
            </h1>

            <p className="text-gray-600 mt-2">
              Für die Nutzung der EMD VereinsApp als Gast
            </p>
          </div>

          <Card className="rounded-3xl shadow-xl border border-gray-200 bg-white">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    Vor- und Nachname
                  </label>

                  <div className="relative mt-1">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Max Mustermann"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    Spielername / Dartname
                  </label>

                  <div className="relative mt-1">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Optional, falls abweichend"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    E-Mail-Adresse
                  </label>

                  <div className="relative mt-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine.email@example.com"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    Telefonnummer
                  </label>

                  <div className="relative mt-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Optional"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 uppercase">
                    Passwort
                  </label>

                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      className="pl-12 pr-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {message && (
                  <div
                    className={
                      success
                        ? "p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl text-center"
                        : "p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl text-center"
                    }
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {loading ? "Wird gesendet…" : "Gastzugang beantragen"}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  Bereits freigeschaltet?{" "}
                  <Link href="/guest-login" className="font-bold text-orange-600">
                    Zum Gast-Login
                  </Link>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Vereinsmitglied?{" "}
                  <Link href="/member-login" className="font-bold text-orange-600">
                    Zum Member-Login
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
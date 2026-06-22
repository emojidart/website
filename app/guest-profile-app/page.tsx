"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import {
  Loader2,
  LogOut,
  UserRound,
  Mail,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"

type GuestRequest = {
  id: string
  full_name: string
  player_name: string | null
  email: string
  phone: string | null
  status: string
  created_at: string
}

export default function GuestProfileAppPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [guestRequest, setGuestRequest] = useState<GuestRequest | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!authLoading && !session?.user) {
      router.push("/guest-login")
    }
  }, [authLoading, session, router])

  useEffect(() => {
    if (session?.user) {
      void loadGuestProfile()
    }
  }, [session?.user?.id])

  const loadGuestProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setMessage("")

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_guest, is_blocked, blocked_reason")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/guest-login")
        return
      }

      if (!profileData.is_guest) {
        await supabase.auth.signOut()
        router.push("/member-login")
        return
      }

      if (profileData.is_blocked) {
        await supabase.auth.signOut()
        router.push("/guest-login")
        return
      }

      const { data: requestData, error: requestError } = await supabase
        .from("guest_requests")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle()

      if (requestError) throw requestError

      if (!requestData) {
        setMessage("Zu diesem Gastkonto wurde kein Antrag gefunden.")
        return
      }

      setGuestRequest(requestData as GuestRequest)
    } catch (err: any) {
      console.error("Guest profile error:", err)
      setMessage(err?.message || "Gastprofil konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/guest-login")
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center p-4 pb-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
            <p className="text-sm font-semibold text-gray-600">
              Gastprofil wird geladen...
            </p>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (message || !guestRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 pb-24">
          <Card className="w-full max-w-md rounded-3xl shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">
                Gastprofil nicht verfügbar
              </h1>

              <p className="text-sm text-gray-600 mb-6">
                {message || "Es konnte kein Gastprofil geladen werden."}
              </p>

              <Button onClick={handleLogout} className="w-full">
                Zurück zum Gast-Login
              </Button>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-orange-600 uppercase">
                EMD VereinsApp
              </div>

              <h1 className="text-3xl font-black text-gray-900">
                Gastprofil
              </h1>

              <p className="text-gray-600 mt-1">
                Willkommen im Gastbereich
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>

          <Card className="rounded-3xl shadow-xl border border-gray-200 bg-white overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-orange-500 to-orange-600" />

            <CardContent className="p-6 -mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center">
                  <UserRound className="w-12 h-12 text-orange-600" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-green-600 text-white">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Freigeschaltet
                    </Badge>

                    <Badge variant="outline">
                      Gastzugang
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black text-gray-900">
                    {guestRequest.full_name}
                  </h2>

                  {guestRequest.player_name && (
                    <p className="text-gray-600 font-semibold mt-1">
                      Spielername: {guestRequest.player_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    E-Mail
                  </div>

                  <div className="flex items-center gap-2 font-semibold text-gray-900 break-all">
                    <Mail className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    {guestRequest.email}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Status
                  </div>

                  <div className="font-semibold text-green-700">
                    Zugang freigeschaltet
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-gray-900 mb-2">
                Gastbereich
              </h3>

              <p className="text-gray-600">
                Hier werden später offene Turniere, dein Spielerprofil,
                Statistiken und weitere Gastfunktionen angezeigt.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
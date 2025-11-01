"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCircle, Mail, MapPin, Calendar, CreditCard, QrCode, Download, Target } from "lucide-react"
import type { UserProfile } from "@/types"
import { QRCodeSVG } from "qrcode.react"
import html2canvas from "html2canvas"
import Image from "next/image"

export default function MemberCardPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(
          "id, user_id, player_id, club_players!inner(id, name, photo_url, throwing_hand, age, origin, created_at, spieldatenbank_id, spieldatenbank(id, player_code, name, verein))",
        )
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError("Fehler beim Laden des Profils")
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = () => {
    return <Target className="h-5 w-5 text-orange-600" />
  }

  const downloadCard = async () => {
    if (!cardRef.current) return

    try {
      setDownloading(true)

      const clonedCard = cardRef.current.cloneNode(true) as HTMLElement
      clonedCard.style.position = "absolute"
      clonedCard.style.left = "-9999px"
      clonedCard.style.top = "-9999px"
      document.body.appendChild(clonedCard)

      const convertStylesToInline = (element: HTMLElement) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null)
        let node: HTMLElement | null

        while ((node = walker.nextNode() as HTMLElement)) {
          const computed = window.getComputedStyle(node)
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i]
            const value = computed.getPropertyValue(prop)
            if (value) {
              node.style.setProperty(prop, value, "important")
            }
          }
        }
      }

      convertStylesToInline(clonedCard)

      const canvas = await html2canvas(clonedCard, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      })

      document.body.removeChild(clonedCard)

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `mitgliedskarte-${profile?.club_players?.name?.replace(/\s+/g, "-")}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Error downloading card:", err)
      alert("Fehler beim Herunterladen der Karte")
    } finally {
      setDownloading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || "Profil nicht gefunden"}</h1>
            <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
          </div>
        </main>
      </div>
    )
  }

  const playerCode = profile.club_players?.spieldatenbank?.player_code || "Noch kein Turniercode"
  const memberSince = profile.club_players?.created_at
    ? new Date(profile.club_players.created_at).toLocaleDateString("de-DE")
    : "01.01.2023"
  const memberNumber = playerCode

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Meine Mitgliedskarte</h1>
          <p className="text-base sm:text-lg text-gray-600">Deine digitale Vereinsmitgliedskarte</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card
            ref={cardRef}
            className="mb-6 border-0 shadow-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24" />

            <CardContent className="p-6 sm:p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">EMD Darts Verein</p>
                  <p className="text-xs opacity-75">Mitgliedskarte</p>
                </div>
                {/* Logo verbessert */}
                <Image
                  src="/icon-192.png"
                  alt="EMD Darts Verein Logo"
                  width={64}
                  height={64}
                  className="opacity-90 drop-shadow-lg"
                />
              </div>

              <div className="flex items-start gap-4 mb-6">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white/20 shadow-xl">
                  <AvatarImage
                    src={
                      profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"
                    }
                    alt={profile.club_players?.name || "Spieler"}
                  />
                  <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-xl font-bold">
                    {(profile.club_players?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-grow text-white">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-1">{profile.club_players?.name || "Mitglied"}</h2>
                  <div className="flex items-center gap-2 mb-2">
                    {getRoleIcon()}
                    <span className="text-sm font-medium opacity-90">Vereinsmitglied</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-mono">{memberNumber}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div>
                  <p className="text-xs text-white/70 mb-1">Mitglied seit</p>
                  <p className="text-sm font-semibold text-white">{memberSince}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-0 shadow-xl bg-white">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">QR-Code</h3>
                <QrCode className="h-6 w-6 text-orange-600" />
              </div>

              <div className="bg-gray-50 rounded-xl p-6 sm:p-8 text-center">
                <div className="inline-block bg-white p-4 rounded-xl shadow-lg mb-4">
                  {playerCode !== "Noch kein Turniercode" ? (
                    <QRCodeSVG value={playerCode} size={192} level="H" includeMargin={true} />
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {playerCode !== "Noch kein Turniercode"
                    ? "Scanne diesen Code für schnellen Turnieranmeldung"
                    : "QR-Code wird erstellt nach erster Turnieranmeldung"}
                </p>
                <p className="text-xs text-gray-500 font-mono">{memberNumber}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-0 shadow-xl bg-white">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Mitgliedsinformationen</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <UserCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">Name</p>
                    <p className="text-sm text-gray-600">{profile.club_players?.name || "Nicht verfügbar"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">E-Mail</p>
                    <p className="text-sm text-gray-600">{session?.user?.email || "Nicht verfügbar"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">Herkunft</p>
                    <p className="text-sm text-gray-600">{profile.club_players?.origin || "Nicht verfügbar"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">Alter</p>
                    <p className="text-sm text-gray-600">
                      {profile.club_players?.age ? `${profile.club_players.age} Jahre` : "Nicht verfügbar"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={downloadCard}
              disabled={downloading}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Wird heruntergeladen..." : "Karte herunterladen"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => router.push("/member-profile-app")}
            >
              Zum Profil
            </Button>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

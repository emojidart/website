"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Euro,
  Swords,
  User,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
  ArrowLeft,
  PartyPopper,
  Gamepad2,
  UserCheck,
  Trash2,
  AlertTriangle,
  Home,
  CalendarDays,
  FileText,
} from "lucide-react"
import Image from "next/image"
import { FAQChatWidget } from "@/components/faq-chat-widget"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Tournament {
  id: string
  name: string
  date: string
  time: string
  location: string
  entry_fee: number
  mode: string
  details: string | null
  photo_url: string | null
  max_participants: number | null
}

interface Event {
  id: string
  name: string
  event_date: string
  event_time: string | null
  location: string | null
  event_type: string
  description: string | null
  photo_url: string | null
  max_participants: number | null
}

interface Registration {
  id: string
  player_name: string
  email: string
  phone: string | null
  registered_at: string
}

function getEventTypeIcon(eventType: string) {
  const type = eventType.toLowerCase()
  if (type.includes("party")) return PartyPopper
  if (type.includes("spiel")) return Gamepad2
  if (type.includes("turnier")) return Trophy
  return Users
}

function getEventTypeLabel(eventType: string) {
  const type = eventType.toLowerCase()
  if (type.includes("party")) return "Party"
  if (type.includes("spiel")) return "Spielabend"
  if (type.includes("turnier")) return "Turnier"
  if (type.includes("versammlung")) return "Versammlung"
  return eventType
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ]
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getStorageKey(eventId: string): string {
  return `registration_${eventId}`
}

function saveRegistrationToStorage(eventId: string, registrationId: string, email: string) {
  try {
    localStorage.setItem(getStorageKey(eventId), JSON.stringify({ registrationId, email, timestamp: Date.now() }))
  } catch (error) {
    console.error("Error saving to localStorage:", error)
  }
}

function getRegistrationFromStorage(eventId: string): { registrationId: string; email: string } | null {
  try {
    const data = localStorage.getItem(getStorageKey(eventId))
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error)
  }
  return null
}

function removeRegistrationFromStorage(eventId: string) {
  try {
    localStorage.removeItem(getStorageKey(eventId))
  } catch (error) {
    console.error("Error removing from localStorage:", error)
  }
}

export default function AnmeldungPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [eventData, setEventData] = useState<(Tournament | Event) | null>(null)
  const [eventType, setEventType] = useState<"tournament" | "event" | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [playerName, setPlayerName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [myRegistration, setMyRegistration] = useState<Registration | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(true)

  const [showCancelModal, setShowCancelModal] = useState(false)

  const fetchEventData = async () => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single()

      if (tournamentData && !tournamentError) {
        setEventData(tournamentData)
        setEventType("tournament")
        return
      }

      const { data: eventData, error: eventError } = await supabase.from("events").select("*").eq("id", id).single()

      if (eventData && !eventError) {
        setEventData(eventData)
        setEventType("event")
        return
      }

      setMessage({ type: "error", text: "Veranstaltung nicht gefunden." })
    } catch (error) {
      console.error("Error fetching event data:", error)
      setMessage({ type: "error", text: "Fehler beim Laden der Veranstaltung." })
    }
  }

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", id)
        .order("registered_at", { ascending: true })

      if (error) {
        console.error("Error fetching registrations:", error)
        return
      }

      setRegistrations(data || [])

      const stored = getRegistrationFromStorage(id)
      if (stored) {
        const myReg = data?.find((reg) => reg.id === stored.registrationId)
        if (myReg) {
          setMyRegistration(myReg)
        } else {
          removeRegistrationFromStorage(id)
          setMyRegistration(null)
        }
      }
    } catch (error) {
      console.error("Error fetching registrations:", error)
    }
  }

  const checkExistingRegistration = async () => {
    setCheckingRegistration(true)
    const stored = getRegistrationFromStorage(id)

    if (stored) {
      try {
        const { data, error } = await supabase
          .from("tournament_registrations")
          .select("*")
          .eq("id", stored.registrationId)
          .eq("tournament_id", id)
          .single()

        if (data && !error) {
          setMyRegistration(data)
        } else {
          removeRegistrationFromStorage(id)
        }
      } catch (error) {
        console.error("Error checking registration:", error)
        removeRegistrationFromStorage(id)
      }
    }

    setCheckingRegistration(false)
  }

  useEffect(() => {
    const initializeData = async () => {
      await fetchEventData()
      await fetchRegistrations()
      await checkExistingRegistration()
      setLoading(false)
    }

    initializeData()

    const channel = supabase
      .channel(`registrations-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_registrations",
          filter: `tournament_id=eq.${id}`,
        },
        (payload) => {
          fetchRegistrations()
          fetchEventData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    if (!playerName || !email) {
      setMessage({ type: "error", text: "Bitte fülle alle Pflichtfelder aus." })
      setSubmitting(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Bitte gib eine gültige E-Mail-Adresse ein." })
      setSubmitting(false)
      return
    }

    try {
      const { data: existingRegistration, error: checkError } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", id)
        .eq("email", email)
        .maybeSingle()

      if (existingRegistration) {
        setMessage({ type: "error", text: "Diese E-Mail-Adresse ist bereits für diese Veranstaltung angemeldet." })
        setSubmitting(false)
        return
      }
    } catch (error) {
      console.error("Error checking existing registration:", error)
    }

    try {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .insert([
          {
            tournament_id: id,
            player_name: playerName,
            email: email,
            phone: phone || null,
          },
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      if (data) {
        saveRegistrationToStorage(id, data.id, email)
        setMyRegistration(data)
      }

      setMessage({ type: "success", text: "Anmeldung erfolgreich! Wir freuen uns auf dich!" })
      setPlayerName("")
      setEmail("")
      setPhone("")

      setTimeout(() => {
        setMessage(null)
      }, 5000)
    } catch (error: any) {
      console.error("Error during registration:", error)
      if (error.code === "23505") {
        setMessage({ type: "error", text: "Du bist bereits für diese Veranstaltung angemeldet." })
      } else {
        setMessage({ type: "error", text: `Fehler bei der Anmeldung: ${error.message}` })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnregister = async () => {
    if (!myRegistration) return

    setShowCancelModal(false)
    setSubmitting(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("tournament_registrations").delete().eq("id", myRegistration.id)

      if (error) {
        throw error
      }

      removeRegistrationFromStorage(id)
      setMyRegistration(null)
      setMessage({ type: "success", text: "Deine Anmeldung wurde erfolgreich storniert." })

      await fetchRegistrations()

      setTimeout(() => {
        setMessage(null)
      }, 5000)
    } catch (error: any) {
      console.error("Error during unregistration:", error)
      setMessage({ type: "error", text: `Fehler beim Stornieren: ${error.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || checkingRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Lade Veranstaltung...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Veranstaltung nicht gefunden</h3>
              <p className="text-gray-500 mb-6">Die angeforderte Veranstaltung existiert nicht.</p>
              <Button onClick={() => router.push("/veranstaltungen")} className="w-full">
                Zurück zu Veranstaltungen
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const isTournament = eventType === "tournament"
  const tournament = isTournament ? (eventData as Tournament) : null
  const event = !isTournament ? (eventData as Event) : null

  const name = isTournament ? tournament!.name : event!.name
  const date = isTournament ? tournament!.date : event!.event_date
  const time = isTournament ? tournament!.time : event!.event_time || "19:00"
  const location = isTournament ? tournament!.location : event!.location || "Wird bekannt gegeben"
  const details = isTournament ? tournament!.details : event!.description
  const photoUrl = isTournament ? tournament!.photo_url : event!.photo_url
  const maxParticipants = isTournament ? tournament!.max_participants : event!.max_participants

  const EventIcon = !isTournament && event?.event_type ? getEventTypeIcon(event.event_type) : Trophy

  const spotsLeft = maxParticipants ? maxParticipants - registrations.length : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/stadium-crowd-atmosphere.jpg')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-900 px-4 py-2 rounded-full font-bold text-sm mb-4">
              <Trophy className="w-4 h-4" />
              <span>{isTournament ? "TURNIER ANMELDUNG" : "EVENT ANMELDUNG"}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 text-balance">{name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-orange-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {new Date(date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{time} Uhr</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{location}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/veranstaltungen")}
          className="mb-4 hover:bg-white/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Veranstaltungen
        </Button>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-6">
            <Card className="border-0 shadow-xl overflow-hidden">
              {photoUrl && (
                <div className="relative h-48 sm:h-64 bg-gradient-to-br from-gray-200 to-gray-300">
                  <Image
                    src={photoUrl || "/placeholder.svg"}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {isTournament ? "TURNIER" : getEventTypeLabel(event!.event_type).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <EventIcon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 text-balance">{name}</h2>
                    {details && <p className="text-gray-600 text-sm sm:text-base text-pretty">{details}</p>}
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Datum</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Uhrzeit</p>
                      <p className="text-sm font-semibold text-gray-900">{time} Uhr</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Ort</p>
                      <p className="text-sm font-semibold text-gray-900">{location}</p>
                    </div>
                  </div>

                  {isTournament && tournament && (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {tournament.mode === "edart" ? (
                          <Target className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : tournament.mode === "steeldart" ? (
                          <Swords className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <Users className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Modus</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {tournament.mode === "edart"
                              ? "E-Dart"
                              : tournament.mode === "steeldart"
                                ? "Steel Dart"
                                : "Beide Modi"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                        <Euro className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-orange-700 font-medium">Startgeld</p>
                          <p className="text-lg font-bold text-orange-900">€{tournament.entry_fee.toFixed(2)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Angemeldete Teilnehmer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {maxParticipants && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Plätze belegt</span>
                      <span className="text-lg font-bold text-blue-900">
                        {registrations.length} / {maxParticipants}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((registrations.length / maxParticipants) * 100, 100)}%` }}
                      />
                    </div>
                    {spotsLeft !== null && spotsLeft > 0 && (
                      <p className="text-xs text-blue-700 mt-2 font-medium">
                        Noch {spotsLeft} {spotsLeft === 1 ? "Platz" : "Plätze"} verfügbar
                      </p>
                    )}
                    {isFull && <p className="text-xs text-red-700 mt-2 font-bold">Alle Plätze belegt!</p>}
                  </div>
                )}

                {registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 text-sm">Noch keine Anmeldungen</p>
                    <p className="text-gray-400 text-xs mt-1">Sei der Erste!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {registrations.map((registration, index) => (
                      <div
                        key={registration.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="relative">
                          <div
                            className={`w-10 h-10 rounded-full ${getAvatarColor(registration.player_name)} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                          >
                            {getInitials(registration.player_name)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-gray-700">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{registration.player_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(registration.registered_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4 border-b border-gray-100">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {myRegistration ? (
                    <>
                      <UserCheck className="w-6 h-6 text-green-600" />
                      Du bist angemeldet
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 text-primary" />
                      Jetzt anmelden
                    </>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  {myRegistration
                    ? "Deine Anmeldung wurde erfolgreich gespeichert."
                    : "Fülle das Formular aus, um dich für diese Veranstaltung anzumelden."}
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {myRegistration ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-12 h-12 rounded-full ${getAvatarColor(myRegistration.player_name)} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                        >
                          {getInitials(myRegistration.player_name)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{myRegistration.player_name}</p>
                          <p className="text-sm text-gray-600">{myRegistration.email}</p>
                          {myRegistration.phone && <p className="text-sm text-gray-600">{myRegistration.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Angemeldet am{" "}
                          {new Date(myRegistration.registered_at).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900">
                        <strong>Wichtig:</strong> Bitte erscheine pünktlich zur Veranstaltung. Bei Verhinderung melde
                        dich bitte rechtzeitig ab.
                      </p>
                    </div>

                    {message && (
                      <div
                        className={`p-4 rounded-lg text-sm font-medium flex items-start gap-3 ${
                          message.type === "error"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-green-50 text-green-800 border border-green-200"
                        }`}
                      >
                        {message.type === "error" ? (
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{message.text}</span>
                      </div>
                    )}

                    <Button
                      onClick={() => setShowCancelModal(true)}
                      disabled={submitting}
                      variant="destructive"
                      className="w-full h-12 font-bold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Wird storniert...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5" />
                          <span>Anmeldung stornieren</span>
                        </div>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">Du kannst deine Anmeldung jederzeit stornieren.</p>
                  </div>
                ) : isFull ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Ausgebucht</h3>
                    <p className="text-gray-600 text-sm">
                      Leider sind alle Plätze für diese Veranstaltung bereits belegt.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="playerName" className="flex items-center gap-2 text-gray-700 font-semibold">
                        <User className="w-4 h-4" /> Name *
                      </Label>
                      <Input
                        id="playerName"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Dein vollständiger Name"
                        required
                        className="h-11 border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 font-semibold">
                        <Mail className="w-4 h-4" /> E-Mail *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.de"
                        required
                        className="h-11 border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700 font-semibold">
                        <Phone className="w-4 h-4" /> Telefon (optional)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+49 123 456789"
                        className="h-11 border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>

                    {message && (
                      <div
                        className={`p-4 rounded-lg text-sm font-medium flex items-start gap-3 ${
                          message.type === "error"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-green-50 text-green-800 border border-green-200"
                        }`}
                      >
                        {message.type === "error" ? (
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{message.text}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-bold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Wird angemeldet...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          <span>Verbindlich anmelden</span>
                        </div>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      Mit der Anmeldung bestätigst du, dass du an der Veranstaltung teilnehmen wirst.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-bold">Anmeldung stornieren?</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Bist du sicher, dass du deine Anmeldung für <strong className="text-gray-900">{name}</strong> stornieren
              möchtest?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Wichtiger Hinweis:</p>
                <p>
                  Nach der Stornierung wird dein Platz für andere Teilnehmer freigegeben. Du kannst dich danach erneut
                  anmelden, sofern noch Plätze verfügbar sind.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnregister}
              className="w-full sm:w-auto order-1 sm:order-2 font-semibold"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Ja, stornieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FAQChatWidget />

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 md:hidden">
        <div className="flex items-center justify-around h-16">
          <a
            href="/"
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-primary transition-colors"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </a>
          <a
            href="/veranstaltungen"
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-primary transition-colors"
          >
            <CalendarDays className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Events</span>
          </a>
          <a
            href="/tournament-series-app"
            className="flex flex-col items-center justify-center flex-1 h-full text-primary transition-colors"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Anmeldung</span>
          </a>
        </div>
      </nav>
    </div>
  )
}

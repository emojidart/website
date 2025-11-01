"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Info,
  Euro,
  Target,
  Swords,
  Users,
  PartyPopper,
  Gamepad2,
  Filter,
  Search,
  Home,
  CalendarDays,
  Crown,
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

interface CombinedEvent {
  id: string
  name: string
  date: string
  time: string
  location: string
  details: string | null
  photo_url: string | null
  type: "tournament" | "event"
  eventType?: string
  entry_fee?: number
  mode?: string
  max_participants?: number | null
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

export default function VeranstaltungenPage() {
  const [combinedEvents, setCombinedEvents] = useState<CombinedEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<CombinedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "tournament" | "event">("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchEventsAndTournaments = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from("tournaments")
          .select("*")
          .gte("date", today)
          .order("date", { ascending: true })
          .order("time", { ascending: true })

        if (tournamentsError) {
          console.error("Error fetching tournaments:", tournamentsError)
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .not("name", "ilike", "%LION%")
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })

        if (eventsError) {
          console.error("Error fetching events:", eventsError)
        }

        const combined: CombinedEvent[] = []

        if (tournamentsData) {
          tournamentsData.forEach((tournament) => {
            combined.push({
              id: tournament.id,
              name: tournament.name,
              date: tournament.date,
              time: tournament.time,
              location: tournament.location,
              details: tournament.details,
              photo_url: tournament.photo_url,
              type: "tournament",
              entry_fee: tournament.entry_fee,
              mode: tournament.mode,
            })
          })
        }

        if (eventsData) {
          eventsData.forEach((event) => {
            combined.push({
              id: event.id,
              name: event.name,
              date: event.event_date,
              time: event.event_time || "19:00",
              location: event.location || "Wird bekannt gegeben",
              details: event.description,
              photo_url: event.photo_url,
              type: "event",
              eventType: event.event_type,
              max_participants: event.max_participants,
            })
          })
        }

        combined.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`)
          const dateB = new Date(`${b.date}T${b.time}`)
          return dateA.getTime() - dateB.getTime()
        })

        setCombinedEvents(combined)
        setFilteredEvents(combined)
      } catch (error) {
        console.error("Error fetching events and tournaments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEventsAndTournaments()
  }, [])

  useEffect(() => {
    let filtered = combinedEvents

    if (filterType !== "all") {
      filtered = filtered.filter((event) => event.type === filterType)
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.details?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredEvents(filtered)
  }, [filterType, searchQuery, combinedEvents])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Lade Veranstaltungen...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/stadium-crowd-atmosphere.jpg')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-900 px-4 py-2 rounded-full font-bold text-sm mb-6">
              <Trophy className="w-4 h-4" />
              <span>ALLE VERANSTALTUNGEN</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 text-balance">
              Turniere & Veranstaltungen
            </h1>
            <p className="text-lg sm:text-xl text-orange-100 mb-8 text-pretty">
              Entdecke alle kommenden Turniere, Events und Veranstaltungen von EMD Dart. Melde dich jetzt an und sei
              dabei!
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                className="font-semibold"
              >
                <Filter className="w-4 h-4 mr-2" />
                Alle ({combinedEvents.length})
              </Button>
              <Button
                variant={filterType === "tournament" ? "default" : "outline"}
                onClick={() => setFilterType("tournament")}
                className="font-semibold"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Turniere ({combinedEvents.filter((e) => e.type === "tournament").length})
              </Button>
              <Button
                variant={filterType === "event" ? "default" : "outline"}
                onClick={() => setFilterType("event")}
                className="font-semibold"
              >
                <PartyPopper className="w-4 h-4 mr-2" />
                Events ({combinedEvents.filter((e) => e.type === "event").length})
              </Button>
            </div>

            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Name, Ort..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              {filteredEvents.length} {filteredEvents.length === 1 ? "Veranstaltung" : "Veranstaltungen"} gefunden
            </p>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Keine Veranstaltungen gefunden</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Versuche es mit anderen Suchbegriffen."
                  : "Derzeit sind keine weiteren Turniere oder Veranstaltungen geplant."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((item) => {
              const EventIcon = item.type === "event" && item.eventType ? getEventTypeIcon(item.eventType) : Trophy

              return (
                <Dialog key={item.id}>
                  <DialogTrigger asChild>
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer hover:-translate-y-1">
                      <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                        {item.photo_url ? (
                          <Image
                            src={item.photo_url || "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                            <EventIcon className="h-20 w-20 text-primary" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            {item.type === "tournament"
                              ? "TURNIER"
                              : getEventTypeLabel(item.eventType || "").toUpperCase()}
                          </span>
                        </div>
                        {item.type === "tournament" && item.mode && (
                          <div className="absolute top-4 right-4">
                            <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                              {item.mode === "edart" ? "E-DART" : item.mode === "steeldart" ? "STEEL" : "BEIDE"}
                            </span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.date)
                            .toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                            .toUpperCase()}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem]">
                          {item.name}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <span>{item.time} Uhr</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{item.location}</span>
                          </div>
                          {item.type === "tournament" && item.entry_fee !== undefined && (
                            <div className="flex items-center gap-2">
                              <Euro className="w-4 h-4 text-orange-600 flex-shrink-0" />
                              <span className="font-semibold">€{item.entry_fee.toFixed(2)} Startgeld</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-black text-primary pr-8">
                        {item.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {item.photo_url && (
                        <div
                          className="relative w-full h-40 sm:h-56 rounded-xl overflow-hidden cursor-pointer group"
                          onClick={() => setFullscreenPhoto(item.photo_url)}
                        >
                          <Image
                            src={item.photo_url || "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 95vw, 800px"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2 sm:p-3">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 sm:p-4 border border-orange-200">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <EventIcon className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">
                              {item.type === "tournament" ? "Turnierinformationen" : "Veranstaltungsinformationen"}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-700">Alle wichtigen Details</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-gray-900">Datum</p>
                            <p className="text-sm text-gray-700">
                              {new Date(item.date).toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-gray-900">Uhrzeit</p>
                            <p className="text-sm text-gray-700">{item.time} Uhr</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-gray-900">Ort</p>
                            <p className="text-sm text-gray-700">{item.location}</p>
                          </div>
                        </div>

                        {item.type === "tournament" && (
                          <>
                            <div className="flex items-start gap-2.5">
                              {item.mode === "edart" ? (
                                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                              ) : item.mode === "steeldart" ? (
                                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold text-sm sm:text-base text-gray-900">Modus</p>
                                <p className="text-sm text-gray-700">
                                  {item.mode === "edart"
                                    ? "E-Dart"
                                    : item.mode === "steeldart"
                                      ? "Steel Dart"
                                      : "Beide Modi"}
                                </p>
                              </div>
                            </div>
                            {item.entry_fee !== undefined && (
                              <div className="flex items-start gap-2.5">
                                <Euro className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-sm sm:text-base text-gray-900">Startgeld</p>
                                  <p className="text-sm text-gray-700">€{item.entry_fee.toFixed(2)}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {item.type === "event" && item.eventType && (
                          <div className="flex items-start gap-2.5">
                            <EventIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-sm sm:text-base text-gray-900">Art der Veranstaltung</p>
                              <p className="text-sm text-gray-700">{getEventTypeLabel(item.eventType)}</p>
                            </div>
                          </div>
                        )}

                        {item.max_participants && (
                          <div className="flex items-start gap-2.5">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-sm sm:text-base text-gray-900">Max. Teilnehmer</p>
                              <p className="text-sm text-gray-700">{item.max_participants}</p>
                            </div>
                          </div>
                        )}

                        {item.details && (
                          <div className="flex items-start gap-2.5">
                            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-sm sm:text-base text-gray-900">Details</p>
                              <p className="text-sm text-gray-700">{item.details}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm sm:text-base py-3 sm:py-4"
                        onClick={() => (window.location.href = `/veranstaltungen/${item.id}/anmeldung`)}
                        disabled={item.type === "event"}
                      >
                        {item.type === "tournament" ? "Jetzt anmelden" : "Mehr Infos"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        )}
      </div>

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 z-[110] bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-3 transition-all duration-200 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation()
              setFullscreenPhoto(null)
            }}
            aria-label="Foto schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full h-full max-w-7xl max-h-[90vh]">
            <Image
              src={fullscreenPhoto || "/placeholder.svg"}
              alt="Vollbild"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

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
            className="flex flex-col items-center justify-center flex-1 h-full text-primary transition-colors"
          >
            <CalendarDays className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Events</span>
          </a>
          <a
            href="/upcoming-tournaments-app"
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-primary transition-colors"
          >
            <Crown className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Lion Cup</span>
          </a>
        </div>
      </nav>
    </div>
  )
}

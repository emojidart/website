"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Target,
  Trophy,
  CalendarDays,
  Users,
  Star,
  MapPin,
  Clock,
  Home,
  Plane,
  RotateCcw,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface Match {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  venue: string
  home_score: number | null
  away_score: number | null
  status: string
  week_number: number
  match_format?: "team" | "individual" | "best_of_three"
  division_type?: "team_division" | "individual_division"
  home_team: {
    id: string
    name: string
    logo_url?: string
  } | null
  away_team: {
    id: string
    name: string
    logo_url?: string
  } | null
  home_opponent_team: any | null
  away_opponent_team: any | null
  home_team_type: string
  away_team_type: string
  season: {
    id: string
    name: string
    type: string
  } | null
}

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  description?: string
  start_time?: string
}

type CalendarItem = Match | Event

export default function CalendarPage() {
  const router = useRouter()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState("Alle Ligen")
  const [selectedTeam, setSelectedTeam] = useState("Alle Teams")
  const [selectedItemType, setSelectedItemType] = useState("Alle")
  const [viewMode, setViewMode] = useState<"month" | "list">("month")
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [leagues, setLeagues] = useState<string[]>(["Alle Ligen"])
  const [teams, setTeams] = useState<string[]>(["Alle Teams"])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isMultiItemDialogOpen, setIsMultiItemDialogOpen] = useState(false)
  const [isMobileBottomSheetOpen, setIsMobileBottomSheetOpen] = useState(false)
  const [mobileSelectedDate, setMobileSelectedDate] = useState<Date | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([{ id: "0", name: "Alle Spieler" }])
  const [selectedResultType, setSelectedResultType] = useState("Alle") // Declare the variable here

  const fetchData = async () => {
    try {
      setLoading(true)

      const matchesResponse = await supabase
        .from("matches")
        .select(`*,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
        .order("match_date", { ascending: true })

      if (matchesResponse.error) {
        console.error("Error fetching matches:", matchesResponse.error)
        return
      }

      let enrichedEvents = []
      try {
        const eventsResponse = await supabase.from("events").select("*").order("event_date", { ascending: true })

        if (eventsResponse.error) {
          console.error("Error fetching events:", eventsResponse.error)
          // Continue without events if there's an error
        } else {
          enrichedEvents = eventsResponse.data || []
        }
      } catch (eventError) {
        console.error("Events table might not exist or no permissions:", eventError)
        // Continue without events
      }

      const enrichedMatches = matchesResponse.data || []

      setMatches(enrichedMatches)
      setEvents(enrichedEvents)

      const uniqueLeagues = new Set<string>(["Alle Ligen"])
      const uniqueTeams = new Set<string>(["Alle Teams"])

      enrichedMatches.forEach((match) => {
        if (match.season?.name) {
          uniqueLeagues.add(match.season.name)
        }
        if (match.home_team?.name) {
          uniqueTeams.add(match.home_team.name)
        }
        if (match.away_team?.name) {
          uniqueTeams.add(match.away_team.name)
        }
        if (match.home_opponent_team?.name) {
          uniqueTeams.add(match.home_opponent_team.name)
        }
        if (match.away_opponent_team?.name) {
          uniqueTeams.add(match.away_opponent_team.name)
        }
      })

      setLeagues(Array.from(uniqueLeagues))
      setTeams(Array.from(uniqueTeams))
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredMatches = matches.filter((match) => {
    const leagueMatch = selectedLeague === "Alle Ligen" || match.season?.name === selectedLeague
    const teamMatch =
      selectedTeam === "Alle Teams" ||
      match.home_team?.name === selectedTeam ||
      match.away_team?.name === selectedTeam ||
      match.home_opponent_team?.name === selectedTeam ||
      match.away_opponent_team?.name === selectedTeam

    let resultTypeMatch = true
    if (selectedItemType === "Spiele") {
      if (selectedResultType === "Gespielt") {
        resultTypeMatch = match.status === "completed" || match.status === "finished"
      } else if (selectedResultType === "Geplant") {
        resultTypeMatch = match.status === "scheduled"
      }
    }

    return leagueMatch && teamMatch && resultTypeMatch
  })

  const filteredEvents = events.filter((event) => {
    if (selectedItemType === "Spiele") return false
    if (selectedItemType === "Events" && !["Versammlung", "Spielfrei"].includes(event.event_type)) return false
    if (selectedItemType === "Turniere" && !["Turnier", "Cup"].includes(event.event_type)) return false
    return true
  })

  const getItemsForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    const matchesForDate =
      selectedItemType !== "Events" && selectedItemType !== "Turniere"
        ? filteredMatches.filter((match) => match.match_date === dateStr)
        : []

    const eventsForDate =
      selectedItemType !== "Spiele" ? filteredEvents.filter((event) => event.event_date === dateStr) : []

    return [...matchesForDate, ...eventsForDate]
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const openMatchDialog = (match: Match) => {
    setSelectedMatch(match)
    setIsMatchDialogOpen(true)
  }

  const openEventDialog = (event: Event) => {
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleItemClick = (item: CalendarItem) => {
    if ("match_date" in item) {
      openMatchDialog(item as Match)
    } else {
      openEventDialog(item as Event)
    }
  }

  const openMultiItemDialog = (date: Date, items: CalendarItem[]) => {
    setSelectedDate(date)
    setIsMultiItemDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    if (status === "completed" || status === "finished") {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Beendet</Badge>
    } else if (status === "live" || status === "in_progress") {
      return <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">Live</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Anstehend</Badge>
    }
  }

  const isHomeGame = (match: Match, teamName?: string) => {
    return match.home_team_type === "own"
  }

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ]

  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

  const getTeamDisplayName = (match: Match, isHome: boolean) => {
    if (isHome) {
      if (match.home_team_type === "own") {
        return match.home_team?.name || "Heimteam"
      } else {
        return match.home_opponent_team?.name || "Heimteam"
      }
    } else {
      if (match.away_team_type === "own") {
        return match.away_team?.name || "Auswärtsteam"
      } else {
        return match.away_opponent_team?.name || "Auswärtsteam"
      }
    }
  }

  const getTeamLogo = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team_type === "own" ? match.home_team?.logo_url : null
    } else {
      return match.away_team_type === "own" ? match.away_team?.logo_url : null
    }
  }

  const isEvent = (item: CalendarItem): item is Event => {
    return "event_date" in item
  }

  const getEventTypeBadge = (eventType: string) => {
    if (eventType === "Turnier") {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Turnier</Badge>
    } else if (eventType === "Versammlung") {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Event</Badge>
    } else if (eventType === "Spielfrei") {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Spielfrei</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Event</Badge>
    }
  }

  const formatTimeWithoutSeconds = (timeString: string) => {
    if (!timeString) return timeString
    return timeString.substring(0, 5) // Remove seconds (HH:MM:SS -> HH:MM)
  }

  const handleMobileTileClick = (date: Date, items: CalendarItem[]) => {
    if (items.length === 0) return

    // On mobile, always show bottom sheet for any day with items
    setMobileSelectedDate(date)
    setIsMobileBottomSheetOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="flex-grow pt-8 pb-20">
          <div className="container mx-auto px-4 max-w-6xl bg-white">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Lade Spieldaten...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="flex-grow pt-8 pb-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Profil
            </Button>
          </div>

          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 uppercase tracking-wide">
              Vereinskalender
            </h1>
            <p className="text-gray-600 text-base lg:text-lg">Alle Liga-Spiele und Termine von Emoj!'s Dartverein</p>
          </div>

          <div className="mb-6 lg:mb-8">
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-4 lg:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("month")}
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Monat
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="flex items-center gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Liste
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:gap-4 lg:flex-wrap">
                    <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alle">Alle Termine</SelectItem>
                        <SelectItem value="Spiele">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-600" />
                            Nur Spiele
                          </div>
                        </SelectItem>
                        <SelectItem value="Turniere">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-purple-600" />
                            Nur Turniere
                          </div>
                        </SelectItem>
                        <SelectItem value="Events">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-green-600" />
                            Nur Events & Spielfrei
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Liga auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league} value={league}>
                            {league}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Team auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team} value={team}>
                            {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedResultType} onValueChange={setSelectedResultType}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Ergebnis-Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alle">Alle Ergebnisse</SelectItem>
                        <SelectItem value="Gespielt">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200">Gespielt</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="Geplant">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Geplant</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedItemType("Alle")
                        setSelectedLeague("Alle Ligen")
                        setSelectedTeam("Alle Teams")
                        setSelectedResultType("Alle")
                      }}
                      className="w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-200"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Zurücksetzen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {viewMode === "month" && (
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-2xl font-bold">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Heute
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs lg:text-sm font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                  {Array.from({ length: 42 }, (_, index) => {
                    const day = getDaysInMonth(currentDate)[index]
                    const isToday = day?.toDateString() === new Date().toDateString()
                    const itemsForDay = day ? getItemsForDate(day) : []

                    return (
                      <div
                        key={index}
                        className={`p-1 lg:p-2 border border-gray-200 rounded-lg transition-colors overflow-hidden ${
                          isToday ? "bg-orange-50 border-orange-300" : "bg-white hover:bg-gray-50"
                        } 
                        h-20 sm:h-24 md:h-32 lg:h-44 cursor-pointer`}
                        onClick={() => {
                          if (day && itemsForDay.length > 0) {
                            // On mobile (< 768px), use bottom sheet, on desktop use existing behavior
                            if (window.innerWidth < 768) {
                              handleMobileTileClick(day, itemsForDay)
                            } else {
                              if (itemsForDay.length === 1) {
                                handleItemClick(itemsForDay[0])
                              } else {
                                openMultiItemDialog(day, itemsForDay)
                              }
                            }
                          }
                        }}
                      >
                        {day && (
                          <div
                            className={`text-sm sm:text-base lg:text-xl font-medium mb-1 ${
                              isToday ? "text-orange-600" : "text-gray-900"
                            }`}
                          >
                            {day.getDate()}
                          </div>
                        )}

                        <div className="space-y-1 overflow-hidden">
                          {/* Mobile view: Show only count of items */}
                          <div className="block md:hidden">
                            {itemsForDay.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {(() => {
                                  const eventTypes = itemsForDay.reduce(
                                    (acc, item) => {
                                      const type = item.type || "event"
                                      acc[type] = (acc[type] || 0) + 1
                                      return acc
                                    },
                                    {} as Record<string, number>,
                                  )

                                  return Object.entries(eventTypes).map(([type, count]) => {
                                    const getTypeConfig = (eventType: string) => {
                                      switch (eventType) {
                                        case "tournament":
                                          return {
                                            bg: "bg-amber-500",
                                            text: "text-white",
                                            label: "T",
                                            name: "Turnier",
                                          }
                                        case "game":
                                          return {
                                            bg: "bg-green-500",
                                            text: "text-white",
                                            label: "S",
                                            name: "Spiel",
                                          }
                                        case "training":
                                          return {
                                            bg: "bg-blue-500",
                                            text: "text-white",
                                            label: "Tr",
                                            name: "Training",
                                          }
                                        default:
                                          return {
                                            bg: "bg-purple-500",
                                            text: "text-white",
                                            label: "E",
                                            name: "Event",
                                          }
                                      }
                                    }

                                    const config = getTypeConfig(type)

                                    return (
                                      <div
                                        key={type}
                                        className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium rounded-md ${config.bg} ${config.text} shadow-sm`}
                                        title={`${count} ${config.name}${count > 1 ? (type === "game" ? "e" : type === "training" ? "s" : "s") : ""}`}
                                      >
                                        {count > 1 ? count : config.label}
                                      </div>
                                    )
                                  })
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Desktop view: Show items as before */}
                          <div className="hidden md:block space-y-1">
                            {itemsForDay.slice(0, 4).map((item, itemIndex) => {
                              if (isEvent(item)) {
                                return (
                                  <button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEventDialog(item)
                                    }}
                                    className="w-full text-left p-1.5 rounded text-xs sm:text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors font-medium min-h-[28px] leading-tight"
                                  >
                                    <div className="flex items-center gap-1">
                                      <Trophy className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {item.name.length > 20 ? `${item.name.substring(0, 20)}...` : item.name}
                                      </span>
                                    </div>
                                  </button>
                                )
                              } else {
                                return (
                                  <button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openMatchDialog(item)
                                    }}
                                    className={`w-full text-left p-1.5 rounded text-xs sm:text-sm transition-colors font-medium min-h-[28px] leading-tight ${
                                      isHomeGame(item)
                                        ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                        : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isHomeGame(item) ? (
                                        <Home className="h-3 w-3 flex-shrink-0" />
                                      ) : (
                                        <Plane className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      <div className="flex flex-col leading-none">
                                        <span className="truncate text-xs">
                                          {getTeamDisplayName(item, true).length > 15
                                            ? `${getTeamDisplayName(item, true).substring(0, 15)}...`
                                            : getTeamDisplayName(item, true)}
                                        </span>
                                        <span className="text-xs opacity-75">vs</span>
                                        <span className="truncate text-xs">
                                          {getTeamDisplayName(item, false).length > 15
                                            ? `${getTeamDisplayName(item, false).substring(0, 15)}...`
                                            : getTeamDisplayName(item, false)}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                )
                              }
                            })}
                            {itemsForDay.length > 4 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openMultiItemDialog(day!, itemsForDay)
                                }}
                                className="w-full text-left p-1.5 rounded text-xs sm:text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium min-h-[28px] border-2 border-dashed border-gray-400"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-semibold">+{itemsForDay.length - 4} weitere Termine</span>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {viewMode === "list" && (
            <div className="space-y-4 lg:space-y-6">
              {[...filteredMatches, ...filteredEvents].length === 0 ? (
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-8 lg:p-12 text-center">
                    <Target className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Keine Termine gefunden</h3>
                    <p className="text-gray-600">Mit den aktuellen Filtern wurden keine Termine gefunden.</p>
                  </CardContent>
                </Card>
              ) : (
                [...filteredMatches, ...filteredEvents]
                  .sort((a, b) => {
                    const dateA = "match_date" in a ? a.match_date : a.event_date
                    const dateB = "match_date" in b ? b.match_date : b.event_date
                    return dateA.localeCompare(dateB)
                  })
                  .map((item) => {
                    if (isEvent(item)) {
                      return (
                        <Card key={item.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-shadow">
                          <CardContent className="p-4 lg:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                                  <div className="flex items-center gap-2">{getEventTypeBadge(item.event_type)}</div>
                                </div>

                                <div className="mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                                  {item.description && <p className="text-gray-600 text-sm">{item.description}</p>}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(item.event_date).toLocaleDateString("de-DE", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.event_type === "Turnier" ? (
                                      <>
                                        <Trophy className="h-4 w-4 text-purple-600" />
                                        <span className="text-purple-600 font-medium">Turnier</span>
                                      </>
                                    ) : (
                                      <>
                                        <Star className="h-4 w-4 text-green-600" />
                                        <span className="text-green-600 font-medium">Vereinsevent</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:justify-end">
                                <Button
                                  onClick={() => openEventDialog(item)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    } else {
                      const match = item as Match
                      return (
                        <Card key={match.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-shadow">
                          <CardContent className="p-4 lg:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(match.status)}
                                    <Badge variant="outline" className="text-xs">
                                      {match.season?.name || "Liga"}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600">Spieltag {match.week_number}</div>
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                                      <AvatarImage
                                        src={getTeamLogo(match, true) || "/placeholder.svg?height=40&width=40"}
                                      />
                                      <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                                        {getTeamDisplayName(match, true).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-sm lg:text-base truncate">
                                      {getTeamDisplayName(match, true)}
                                    </span>
                                  </div>

                                  <div className="text-center px-2">
                                    {match.status === "completed" || match.status === "finished" ? (
                                      <div className="text-lg lg:text-xl font-bold">
                                        {match.home_score} : {match.away_score}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 font-bold">vs</div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 flex-1 justify-end">
                                    <span className="font-semibold text-sm lg:text-base truncate text-right">
                                      {getTeamDisplayName(match, false)}
                                    </span>
                                    <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                                      <AvatarImage
                                        src={getTeamLogo(match, false) || "/placeholder.svg?height=40&width=40"}
                                      />
                                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                        {getTeamDisplayName(match, false).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(match.match_date).toLocaleDateString("de-DE", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {formatTimeWithoutSeconds(match.match_time)} Uhr
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {match.venue}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isHomeGame(match) ? (
                                      <>
                                        <Home className="h-4 w-4 text-orange-600" />
                                        <span className="text-orange-600 font-medium">Heimspiel</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plane className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600 font-medium">Auswärtsspiel</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:justify-end">
                                <Button
                                  onClick={() => openMatchDialog(match)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                  })
              )}
            </div>
          )}

          <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
            <DialogContent className="max-w-md lg:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl lg:text-2xl">Spiel Details</DialogTitle>
                <DialogDescription>Detaillierte Informationen zum Spiel</DialogDescription>
              </DialogHeader>

              {selectedMatch && (
                <div className="space-y-6">
                  <div className="flex justify-center">{getStatusBadge(selectedMatch.status)}</div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarImage
                            src={getTeamLogo(selectedMatch, true) || "/placeholder.svg?height=64&width=64"}
                          />
                          <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                            {getTeamDisplayName(selectedMatch, true).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-sm">{getTeamDisplayName(selectedMatch, true)}</div>
                      </div>

                      <div className="text-center px-4">
                        {selectedMatch.status === "completed" || selectedMatch.status === "finished" ? (
                          <div className="text-3xl font-bold">
                            {selectedMatch.home_score} : {selectedMatch.away_score}
                          </div>
                        ) : (
                          <div className="text-2xl text-gray-400 font-bold">vs</div>
                        )}
                      </div>

                      <div className="text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarImage
                            src={getTeamLogo(selectedMatch, false) || "/placeholder.svg?height=64&width=64"}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {getTeamDisplayName(selectedMatch, false).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-sm">{getTeamDisplayName(selectedMatch, false)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span>
                        {new Date(selectedMatch.match_date).toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <span>{formatTimeWithoutSeconds(selectedMatch.match_time)} Uhr</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-600" />
                      <span>{selectedMatch.venue}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-gray-600" />
                      <span>
                        {selectedMatch.season?.name || "Liga"} - Spieltag {selectedMatch.week_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isHomeGame(selectedMatch) ? (
                        <>
                          <Home className="h-5 w-5 text-orange-600" />
                          <span className="text-orange-600 font-medium">Heimspiel</span>
                        </>
                      ) : (
                        <>
                          <Plane className="h-5 w-5 text-blue-600" />
                          <span className="text-blue-600 font-medium">Auswärtsspiel</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="outline" className="bg-transparent">
                      <Users className="h-4 w-4 mr-2" />
                      Team Details
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogContent className="max-w-md lg:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl lg:text-2xl">Event Details</DialogTitle>
                <DialogDescription>Detaillierte Informationen zum Event</DialogDescription>
              </DialogHeader>

              {selectedEvent && (
                <div className="space-y-6">
                  <div className="flex justify-center">{getEventTypeBadge(selectedEvent.event_type)}</div>

                  <div className="text-center">
                    <div className="mb-4">
                      <div className="h-16 w-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                        {selectedEvent.event_type === "Turnier" ? (
                          <Trophy className="h-8 w-8 text-orange-600" />
                        ) : (
                          <CalendarDays className="h-8 w-8 text-orange-600" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h3>
                      {selectedEvent.description && <p className="text-gray-600 mt-2">{selectedEvent.description}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span>
                        {new Date(selectedEvent.event_date).toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedEvent.event_type === "Turnier" ? (
                        <>
                          <Trophy className="h-5 w-5 text-purple-600" />
                          <span className="text-purple-600 font-medium">Turnier</span>
                        </>
                      ) : (
                        <>
                          <Star className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-medium">Vereinsevent</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isMultiItemDialogOpen} onOpenChange={setIsMultiItemDialogOpen}>
            <DialogContent className="max-w-md lg:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl lg:text-2xl">
                  Termine am{" "}
                  {selectedDate?.toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogTitle>
                <DialogDescription>Alle Termine an diesem Tag</DialogDescription>
              </DialogHeader>

              {selectedDate && (
                <div className="space-y-4">
                  {getItemsForDate(selectedDate).map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setIsMultiItemDialogOpen(false)
                        handleItemClick(item)
                      }}
                    >
                      <CardContent className="p-4">
                        {isEvent(item) ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium">{item.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.event_type === "Turnier" ? (
                                <Trophy className="h-4 w-4 text-purple-600" />
                              ) : (
                                <CalendarDays className="h-4 w-4 text-green-600" />
                              )}
                              {getEventTypeBadge(item.event_type)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium">{formatTimeWithoutSeconds(item.match_time)}</div>
                              <div className="text-sm">
                                {getTeamDisplayName(item, true)} vs {getTeamDisplayName(item, false)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isHomeGame(item) ? (
                                <Home className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Plane className="h-4 w-4 text-blue-600" />
                              )}
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {isMobileBottomSheetOpen && mobileSelectedDate && (
            <div className="fixed inset-0 z-50 md:hidden">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileBottomSheetOpen(false)} />

              {/* Bottom Sheet */}
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[70vh] overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-4 border-b">
                  <h3 className="text-lg font-semibold">
                    {mobileSelectedDate.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getItemsForDate(mobileSelectedDate).length}{" "}
                    {getItemsForDate(mobileSelectedDate).length === 1 ? "Termin" : "Termine"}
                  </p>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[50vh]">
                  <div className="p-4 space-y-3">
                    {getItemsForDate(mobileSelectedDate).map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setIsMobileBottomSheetOpen(false)
                          handleItemClick(item)
                        }}
                      >
                        <CardContent className="p-4">
                          {isEvent(item) ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Trophy className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-base">{item.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {item.start_time && format(new Date(`2000-01-01T${item.start_time}`), "HH:mm")} Uhr
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">{getEventTypeBadge(item.event_type)}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isHomeGame(item) ? "bg-orange-100" : "bg-blue-100"}`}>
                                  {isHomeGame(item) ? (
                                    <Home className="h-5 w-5 text-orange-600" />
                                  ) : (
                                    <Plane className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-base">
                                    {getTeamDisplayName(item, true)} vs {getTeamDisplayName(item, false)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {item.match_time && format(new Date(`2000-01-01T${item.match_time}`), "HH:mm")} Uhr
                                    {item.season?.name && ` • ${item.season.name}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">{getStatusBadge(item.status)}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

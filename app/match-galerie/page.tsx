"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Calendar, Trophy, Filter } from "lucide-react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

// shadcn Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const photoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
}

type SeasonRow = {
  id: string
  name: string
  year: number | null
  type: string | null
}

export default function MatchGaleriePage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [matches, setMatches] = useState<any[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")

  const [loading, setLoading] = useState(true)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  const selectedSeasonLabel = useMemo(() => {
    const s = seasons.find((x) => x.id === selectedSeasonId)
    if (!s) return "Alle Meisterschaften"
    const year = s.year ? ` ${s.year}` : ""
    return `${s.name}${year}`
  }, [seasons, selectedSeasonId])

  // 1) Seasons laden
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const { data, error } = await supabase
          .from("seasons")
          .select("id,name,year,type")
          .order("year", { ascending: false })
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching seasons:", error)
          setSeasons([])
          setSelectedSeasonId("")
          return
        }

        const rows = (data || []) as SeasonRow[]
        setSeasons(rows)

        // Default: neueste Saison
        if (rows.length > 0) setSelectedSeasonId(rows[0].id)
      } catch (e) {
        console.error("Error loading seasons:", e)
        setSeasons([])
        setSelectedSeasonId("")
      }
    }

    loadSeasons()
  }, [])

  // 2) Matches laden (abhängig vom Filter)
  useEffect(() => {
    const loadMatchPhotos = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from("matches")
          .select(
            `
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
            season:seasons(id, name, year, type)
          `
          )
          .not("team_photo_url", "is", null)
          .order("match_date", { ascending: false })

        // ✅ HIER: Filter direkt über matches.season_id (FK)
        if (selectedSeasonId) {
          query = query.eq("season_id", selectedSeasonId)
        }

        const { data: matchesData, error: matchesError } = await query

        if (matchesError) {
          console.error("Error fetching matches with photos:", matchesError)
          setMatches([])
          return
        }

        const { data: opponentTeamsData, error: opponentError } = await supabase
          .from("opponent_teams")
          .select("*")
          .order("name")

        if (opponentError) {
          console.error("Error fetching opponent teams:", opponentError)
        }

        const enrichedMatches =
          matchesData?.map((match: any) => {
            const homeOpponentTeam = match.home_opponent_team_id
              ? opponentTeamsData?.find((team: any) => team.id === match.home_opponent_team_id)
              : null
            const awayOpponentTeam = match.away_opponent_team_id
              ? opponentTeamsData?.find((team: any) => team.id === match.away_opponent_team_id)
              : null

            return {
              ...match,
              home_opponent_team: homeOpponentTeam,
              away_opponent_team: awayOpponentTeam,
            }
          }) || []

        setMatches(enrichedMatches)
      } catch (error) {
        console.error("Error loading match photos:", error)
        setMatches([])
      } finally {
        setLoading(false)
      }
    }

    loadMatchPhotos()
  }, [selectedSeasonId])

  const handlePhotoClick = (photoUrl: string, match: any) => {
    if (isMobile) return
    setSelectedPhotoUrl(photoUrl)
    setSelectedMatch(match)
    setIsPhotoModalOpen(true)
  }

  const getMatchResultText = (match: any) => {
    if (match.status !== "completed") return "Geplant"

    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0
    if (homeScore === awayScore) return "Unentschieden"

    const isOurHomeTeam = match.home_team?.id
    const isOurAwayTeam = match.away_team?.id

    if (homeScore > awayScore) return isOurHomeTeam ? "Heimsieg" : "Niederlage"
    if (awayScore > homeScore) return isOurAwayTeam ? "Auswärtssieg" : "Niederlage"
    return "Unentschieden"
  }

  const getMatchResultColor = (match: any) => {
    if (match.status !== "completed") return "bg-blue-100 text-blue-700"

    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0
    if (homeScore === awayScore) return "bg-yellow-100 text-yellow-700"

    const isOurHomeTeam = match.home_team?.id
    const isOurAwayTeam = match.away_team?.id

    if (homeScore > awayScore) return isOurHomeTeam ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    if (awayScore > homeScore) return isOurAwayTeam ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const getMatchTitle = (match: any) => {
    let homeTeamName = "Unbekanntes Team"
    if (match.home_team?.name) homeTeamName = match.home_team.name
    else if (match.home_opponent_team?.name) homeTeamName = match.home_opponent_team.name

    let awayTeamName = "Unbekanntes Team"
    if (match.away_team?.name) awayTeamName = match.away_team.name
    else if (match.away_opponent_team?.name) awayTeamName = match.away_opponent_team.name

    return `${homeTeamName} vs ${awayTeamName}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Header />
        <main className="pt-8 pb-20">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-6 backdrop-blur-sm">
                <Camera className="h-12 w-12 text-white mx-auto" />
              </div>
              <p className="mt-4 text-gray-600">Lade Match-Galerie...</p>
            </div>
          </div>
        </main>
        <MobileBottomNav />
        <FAQChatWidget />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Header />
        <main className="pt-8 pb-20">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Anmeldung erforderlich</h1>
              <p className="text-gray-600 mb-6">Du musst angemeldet sein, um die Match-Galerie zu sehen.</p>
            </div>
          </div>
        </main>
        <MobileBottomNav />
        <FAQChatWidget />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />

      <main className="pt-8 pb-20">
        <motion.div
          className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
                <span className="block text-white">MATCH-GALERIE</span>
                <span className="block text-orange-200">{selectedSeasonLabel}</span>
              </h1>

              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100 mb-3 sm:mb-4">
                Alle Teamfotos und Spielmomente
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-orange-100">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Meisterschaft</span>
                </div>

                <div className="w-full sm:w-[360px]">
                  <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Meisterschaft auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => {
                        const year = s.year ? ` ${s.year}` : ""
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-medium">{matches.length} Fotos</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                  Match-Fotos ({matches.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 sm:p-6">
                {matches.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">Noch keine Match-Fotos verfügbar</p>
                    <p className="text-sm mt-2">Fotos werden nach den Spielen hochgeladen</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {matches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        variants={photoVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                        className={`group ${!isMobile ? "cursor-pointer" : ""}`}
                        onClick={() => handlePhotoClick(match.team_photo_url, match)}
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                          <div className="relative aspect-square overflow-hidden">
                            <Image
                              src={match.team_photo_url || "/placeholder.svg"}
                              alt={`Match zwischen ${match.home_team?.name || match.home_opponent_team?.name} und ${
                                match.away_team?.name || match.away_opponent_team?.name
                              }`}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                            {!isMobile && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                                  <Camera className="h-4 w-4 text-gray-700" />
                                </div>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-3 sm:p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(match.match_date).toLocaleDateString("de-DE", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                <Badge className={`text-xs ${getMatchResultColor(match)}`}>
                                  {getMatchResultText(match)}
                                </Badge>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    {match.home_team?.logo_url ? (
                                      <img
                                        src={match.home_team.logo_url || "/placeholder.svg"}
                                        alt={`${match.home_team.name} Logo`}
                                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Trophy className="h-2 w-2 text-gray-500" />
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-900 truncate">
                                      {match.home_team?.name || match.home_opponent_team?.name || "Team"}
                                    </span>
                                  </div>
                                  {match.status === "completed" && (
                                    <span className="text-xs font-bold text-gray-600">{match.home_score || 0}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    {match.away_team?.logo_url ? (
                                      <img
                                        src={match.away_team.logo_url || "/placeholder.svg"}
                                        alt={`${match.away_team.name} Logo`}
                                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Trophy className="h-2 w-2 text-gray-500" />
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-900 truncate">
                                      {match.away_team?.name || match.away_opponent_team?.name || "Team"}
                                    </span>
                                  </div>
                                  {match.status === "completed" && (
                                    <span className="text-xs font-bold text-gray-600">{match.away_score || 0}</span>
                                  )}
                                </div>
                              </div>

                              {match.dart_type && (
                                <div className="flex justify-center">
                                  <Badge variant="outline" className="text-xs">
                                    {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent className="w-[95vw] max-w-5xl mx-auto max-h-[95vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-orange-600" />
                  <DialogTitle className="text-lg font-semibold">
                    {selectedMatch && getMatchTitle(selectedMatch)}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMatch && (
                    <>
                      <Badge className={`text-xs ${getMatchResultColor(selectedMatch)}`}>
                        {getMatchResultText(selectedMatch)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedMatch.match_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="relative w-full h-[70vh] sm:h-[80vh]">
              {selectedPhotoUrl && (
                <Image
                  src={selectedPhotoUrl || "/placeholder.svg"}
                  alt="Match-Foto"
                  fill
                  className="object-contain"
                  sizes="95vw"
                />
              )}
            </div>

            {selectedMatch && selectedMatch.status === "completed" && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {selectedMatch.home_team?.logo_url ? (
                        <img
                          src={selectedMatch.home_team.logo_url || "/placeholder.svg"}
                          alt={`${selectedMatch.home_team.name} Logo`}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <Trophy className="h-3 w-3 text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium">
                        {selectedMatch.home_team?.name || selectedMatch.home_opponent_team?.name}
                      </span>
                    </div>
                    <span className="text-xl font-bold">{selectedMatch.home_score || 0}</span>
                  </div>

                  <span className="text-xl font-medium text-gray-400">:</span>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{selectedMatch.away_score || 0}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {selectedMatch.away_team?.name || selectedMatch.away_opponent_team?.name}
                      </span>
                      {selectedMatch.away_team?.logo_url ? (
                        <img
                          src={selectedMatch.away_team.logo_url || "/placeholder.svg"}
                          alt={`${selectedMatch.away_team.name} Logo`}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <Trophy className="h-3 w-3 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <MobileBottomNav />
      <FAQChatWidget />
    </div>
  )
}
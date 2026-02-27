"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Calendar, Trophy, Filter, Heart, MessageCircle, Send, X, Users } from "lucide-react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// shadcn Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

type CommentRow = {
  id: string
  match_id: string
  user_id: string
  body: string
  created_at: string
  display_name?: string
  photo_url?: string | null
}

type LikedUser = { user_id: string; name: string; photo_url: string | null }

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

  // ✅ Social
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({})
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({})

  const [likedUsers, setLikedUsers] = useState<Record<string, LikedUser[]>>({})
  const [likedUsersOpen, setLikedUsersOpen] = useState(false)

  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [commentSending, setCommentSending] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoadedFor, setCommentsLoadedFor] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)

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

        // ✅ Filter direkt über matches.season_id (FK)
        if (selectedSeasonId) {
          query = query.eq("season_id", selectedSeasonId)
        }

        const { data: matchesData, error: matchesError } = await query

        if (matchesError) {
          console.error("Error fetching matches with photos:", matchesError)
          setMatches([])
          return
        }

        const { data: opponentTeamsData, error: opponentError } = await supabase.from("opponent_teams").select("*").order("name")
        if (opponentError) console.error("Error fetching opponent teams:", opponentError)

        const enrichedMatches =
          matchesData?.map((match: any) => {
            const homeOpponentTeam = match.home_opponent_team_id ? opponentTeamsData?.find((t: any) => t.id === match.home_opponent_team_id) : null
            const awayOpponentTeam = match.away_opponent_team_id ? opponentTeamsData?.find((t: any) => t.id === match.away_opponent_team_id) : null
            return { ...match, home_opponent_team: homeOpponentTeam, away_opponent_team: awayOpponentTeam }
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

  const loadSocialCountsForMatches = async (matchIds: string[]) => {
    try {
      if (!session?.user?.id) return
      if (!matchIds.length) return

      const { data: likesData, error: likesError } = await supabase
        .from("match_photo_likes")
        .select("match_id,user_id")
        .in("match_id", matchIds)

      if (likesError) console.error("Error loading likes:", likesError)

      const nextLikeCounts: Record<string, number> = {}
      const nextLikedByMe: Record<string, boolean> = {}

      ;(likesData || []).forEach((r: any) => {
        const mid = String(r.match_id)
        nextLikeCounts[mid] = (nextLikeCounts[mid] || 0) + 1
        if (String(r.user_id) === session.user.id) nextLikedByMe[mid] = true
      })

      const { data: comData, error: comError } = await supabase
        .from("match_photo_comments")
        .select("match_id")
        .in("match_id", matchIds)

      if (comError) console.error("Error loading comment counts:", comError)

      const nextCommentCounts: Record<string, number> = {}
      ;(comData || []).forEach((r: any) => {
        const mid = String(r.match_id)
        nextCommentCounts[mid] = (nextCommentCounts[mid] || 0) + 1
      })

      setLikeCounts((p) => ({ ...p, ...nextLikeCounts }))
      setLikedByMe((p) => ({ ...p, ...nextLikedByMe }))
      setCommentCounts((p) => ({ ...p, ...nextCommentCounts }))
    } catch (e) {
      console.error("loadSocialCountsForMatches error:", e)
    }
  }

  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return
      const ids = (matches || []).map((m) => String(m.id)).filter(Boolean)
      if (!ids.length) return
      await loadSocialCountsForMatches(ids)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches?.length, session?.user?.id])

  const loadLikedUsersForMatch = async (matchId: string) => {
    try {
      const { data: likes, error: likeErr } = await supabase
        .from("match_photo_likes")
        .select("user_id")
        .eq("match_id", matchId)

      if (likeErr) {
        console.error("loadLikedUsersForMatch likeErr:", likeErr)
        setLikedUsers((p) => ({ ...p, [matchId]: [] }))
        return
      }

      const userIds = Array.from(new Set((likes || []).map((x: any) => String(x.user_id))))
      if (userIds.length === 0) {
        setLikedUsers((p) => ({ ...p, [matchId]: [] }))
        return
      }

      const { data: profiles, error: profErr } = await supabase
        .from("user_profiles")
        .select("user_id, club_players(name, photo_url)")
        .in("user_id", userIds)

      if (profErr) console.error("loadLikedUsersForMatch profErr:", profErr)

      const map: Record<string, { name: string; photo_url: string | null }> = {}
      ;(profiles || []).forEach((p: any) => {
        map[String(p.user_id)] = {
          name: p.club_players?.name || "User",
          photo_url: p.club_players?.photo_url || null,
        }
      })

      const result = userIds.map((uid) => ({
        user_id: uid,
        name: map[uid]?.name || "User",
        photo_url: map[uid]?.photo_url || null,
      }))

      setLikedUsers((p) => ({ ...p, [matchId]: result }))
    } catch (e) {
      console.error("loadLikedUsersForMatch error:", e)
    }
  }

  const toggleLike = async (matchId: string) => {
    try {
      if (!session?.user?.id) return

      setLikeLoading((p) => ({ ...p, [matchId]: true }))
      const already = !!likedByMe[matchId]

      // optimistic
      setLikedByMe((p) => ({ ...p, [matchId]: !already }))
      setLikeCounts((p) => ({
        ...p,
        [matchId]: Math.max(0, (p[matchId] || 0) + (already ? -1 : 1)),
      }))

      if (already) {
        const { error } = await supabase.from("match_photo_likes").delete().eq("match_id", matchId).eq("user_id", session.user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("match_photo_likes").insert({ match_id: matchId, user_id: session.user.id })
        if (error) throw error
      }

      // refresh list if open
      if (selectedMatch?.id && String(selectedMatch.id) === matchId) {
        loadLikedUsersForMatch(matchId)
      }
    } catch (e) {
      console.error("toggleLike error:", e)
      await loadSocialCountsForMatches([matchId])
      if (selectedMatch?.id && String(selectedMatch.id) === matchId) {
        loadLikedUsersForMatch(matchId)
      }
    } finally {
      setLikeLoading((p) => ({ ...p, [matchId]: false }))
    }
  }

  const loadCommentsForMatch = async (matchId: string) => {
    try {
      if (!session?.user?.id) return
      setCommentsLoading(true)
      setCommentError(null)

      const { data, error } = await supabase
        .from("match_photo_comments")
        .select("id,match_id,user_id,body,created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading comments:", error)
        setComments([])
        setCommentError("Kommentare konnten nicht geladen werden.")
        return
      }

      const rows = (data || []) as CommentRow[]
      const userIds = Array.from(new Set(rows.map((c) => c.user_id)))
      if (userIds.length === 0) {
        setComments([])
        return
      }

      const { data: profiles, error: perr } = await supabase
        .from("user_profiles")
        .select("user_id, club_players(name, photo_url)")
        .in("user_id", userIds)

      if (perr) console.error("Error loading commenter profiles:", perr)

      const map: Record<string, { name?: string; photo_url?: string | null }> = {}
      ;(profiles || []).forEach((p: any) => {
        map[String(p.user_id)] = {
          name: p.club_players?.name || "User",
          photo_url: p.club_players?.photo_url || null,
        }
      })

      const enriched = rows.map((c) => ({
        ...c,
        display_name: c.user_id === session.user.id ? "Du" : map[c.user_id]?.name || "User",
        photo_url: map[c.user_id]?.photo_url || null,
      }))

      setComments(enriched)
    } catch (e) {
      console.error("loadCommentsForMatch error:", e)
      setComments([])
      setCommentError("Kommentare konnten nicht geladen werden.")
    } finally {
      setCommentsLoading(false)
    }
  }

  const sendComment = async () => {
    try {
      if (!session?.user?.id) return
      if (!selectedMatch?.id) return
      const body = commentInput.trim()
      if (!body) return

      setCommentSending(true)
      setCommentError(null)

      const { error } = await supabase.from("match_photo_comments").insert({
        match_id: selectedMatch.id,
        user_id: session.user.id,
        body,
      })

      if (error) {
        console.error("Insert comment error:", error)
        setCommentError("Kommentar konnte nicht gespeichert werden.")
        return
      }

      setCommentInput("")
      await loadCommentsForMatch(String(selectedMatch.id))

      setCommentCounts((p) => ({
        ...p,
        [String(selectedMatch.id)]: (p[String(selectedMatch.id)] || 0) + 1,
      }))
    } catch (e) {
      console.error("sendComment error:", e)
      setCommentError("Kommentar konnte nicht gespeichert werden.")
    } finally {
      setCommentSending(false)
    }
  }

  useEffect(() => {
    const mid = selectedMatch?.id ? String(selectedMatch.id) : null
    if (!isPhotoModalOpen) return
    if (!mid) return
    if (commentsLoadedFor === mid) return

    setCommentsLoadedFor(mid)
    loadCommentsForMatch(mid)
    loadLikedUsersForMatch(mid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhotoModalOpen, selectedMatch?.id, commentsLoadedFor])

  const openPhotoModal = (photoUrl: string, match: any) => {
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

  const matchesGrid = useMemo(() => {
    if (matches.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Noch keine Match-Fotos verfügbar</p>
          <p className="text-sm mt-2">Fotos werden nach den Spielen hochgeladen</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {matches.map((match, index) => {
          const mid = String(match.id)
          const likes = likeCounts[mid] || 0
          const ccount = commentCounts[mid] || 0
          const isLiked = !!likedByMe[mid]
          const isLikeBusy = !!likeLoading[mid]

          return (
            <motion.div
              key={match.id}
              variants={photoVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => openPhotoModal(match.team_photo_url, match)}
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
                      <Badge className={`text-xs ${getMatchResultColor(match)}`}>{getMatchResultText(match)}</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {match.home_team?.logo_url ? (
                            <img src={match.home_team.logo_url || "/placeholder.svg"} alt={`${match.home_team.name} Logo`} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Trophy className="h-2 w-2 text-gray-500" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900 truncate">{match.home_team?.name || match.home_opponent_team?.name || "Team"}</span>
                        </div>
                        {match.status === "completed" && <span className="text-xs font-bold text-gray-600">{match.home_score || 0}</span>}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {match.away_team?.logo_url ? (
                            <img src={match.away_team.logo_url || "/placeholder.svg"} alt={`${match.away_team.name} Logo`} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Trophy className="h-2 w-2 text-gray-500" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900 truncate">{match.away_team?.name || match.away_opponent_team?.name || "Team"}</span>
                        </div>
                        {match.status === "completed" && <span className="text-xs font-bold text-gray-600">{match.away_score || 0}</span>}
                      </div>
                    </div>

                    {match.dart_type && (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          {match.dart_type === "edart" ? "E-Dart" : "Steeldart"}
                        </Badge>
                      </div>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 text-sm ${isLiked ? "text-red-600" : "text-gray-600"} hover:text-red-600 transition-colors disabled:opacity-50`}
                          disabled={isLikeBusy}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLike(mid)
                          }}
                          aria-label="Like"
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-red-600" : ""}`} />
                          <span className="text-xs font-semibold">{likes}</span>
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-orange-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            openPhotoModal(match.team_photo_url, match)
                          }}
                          aria-label="Kommentare"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs font-semibold">{ccount}</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-gray-400">Tippe für Details</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    )
  }, [matches, likeCounts, commentCounts, likedByMe, likeLoading, isMobile])

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

  const currentMatchId = selectedMatch?.id ? String(selectedMatch.id) : null
  const currentLikedUsers = currentMatchId ? likedUsers[currentMatchId] || [] : []

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />

      <main className="pt-8 pb-20">
        <motion.div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 backdrop-blur-sm">
                <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto" />
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-2 sm:mb-4">
                <span className="block text-white">MATCH-GALERIE</span>
                <span className="block text-orange-200">{selectedSeasonLabel}</span>
              </h1>

              <p className="text-sm sm:text-lg md:text-xl font-bold uppercase text-orange-100 mb-3 sm:mb-4">Alle Teamfotos und Spielmomente</p>

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

              <CardContent className="p-3 sm:p-6">{matchesGrid}</CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ✅ MODAL */}
        <Dialog
          open={isPhotoModalOpen}
          onOpenChange={(open) => {
            setIsPhotoModalOpen(open)
            if (!open) {
              setSelectedPhotoUrl(null)
              setSelectedMatch(null)
              setComments([])
              setCommentInput("")
              setCommentsLoadedFor(null)
              setCommentError(null)
              setLikedUsersOpen(false)
            }
          }}
        >
          <DialogContent className="w-[98vw] max-w-5xl mx-auto max-h-[95vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 flex items-center justify-center border">
                    <Camera className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base sm:text-lg font-bold truncate">{selectedMatch && getMatchTitle(selectedMatch)}</DialogTitle>
                    {selectedMatch && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(selectedMatch.match_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} •{" "}
                        <span className="font-semibold">{getMatchResultText(selectedMatch)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border bg-white hover:bg-gray-50"
                  onClick={() => setIsPhotoModalOpen(false)}
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Image */}
              <div className="relative w-full h-[42vh] sm:h-[60vh] lg:h-[80vh] lg:col-span-3 bg-black">
                {selectedPhotoUrl && <Image src={selectedPhotoUrl || "/placeholder.svg"} alt="Match-Foto" fill className="object-contain" sizes="95vw" />}
              </div>

              {/* Right panel */}
              <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l bg-white flex flex-col">
                {selectedMatch && (
                  <>
                    {/* Interaktion + Like-Liste */}
                    <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Interaktion</div>
                          <div className="text-sm font-semibold text-gray-900">Likes & Kommentare</div>

                          <button
                            type="button"
                            className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-orange-700"
                            onClick={() => setLikedUsersOpen((v) => !v)}
                          >
                            <Users className="h-4 w-4" />
                            Wer hat geliked?
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50 transition-colors ${
                              likedByMe[String(selectedMatch.id)] ? "text-red-600" : "text-gray-700"
                            }`}
                            disabled={!!likeLoading[String(selectedMatch.id)]}
                            onClick={() => toggleLike(String(selectedMatch.id))}
                          >
                            <Heart className={`h-4 w-4 ${likedByMe[String(selectedMatch.id)] ? "fill-red-600" : ""}`} />
                            <span className="text-sm font-bold">{likeCounts[String(selectedMatch.id)] || 0}</span>
                          </button>

                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white text-gray-700">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm font-bold">{commentCounts[String(selectedMatch.id)] || 0}</span>
                          </div>
                        </div>
                      </div>

                      {likedUsersOpen && (
                        <div className="mt-3 rounded-2xl border bg-white p-3">
                          {currentLikedUsers.length === 0 ? (
                            <div className="text-sm text-gray-500">Noch keine Likes.</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {currentLikedUsers.slice(0, 20).map((u) => (
                                <div key={u.user_id} className="flex items-center gap-2 rounded-2xl border bg-gray-50 px-2.5 py-1.5">
                                  {u.photo_url ? (
                                    <img src={u.photo_url || "/placeholder.svg"} alt={u.name} className="w-6 h-6 rounded-full object-cover border" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-[11px] font-bold text-gray-600">
                                      {u.name.slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="text-xs font-semibold text-gray-800 max-w-[140px] truncate">{u.name}</div>
                                </div>
                              ))}
                              {currentLikedUsers.length > 20 && (
                                <div className="text-xs text-gray-500 self-center">+{currentLikedUsers.length - 20} weitere</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comments list */}
                    <div className="flex-1 p-4 overflow-auto bg-gray-50">
                      <div className="text-sm font-bold text-gray-900 mb-3">Kommentare</div>

                      {commentError && (
                        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3">{commentError}</div>
                      )}

                      {commentsLoading ? (
                        <div className="text-sm text-gray-500">Lade Kommentare…</div>
                      ) : comments.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-white border rounded-2xl p-4">Noch keine Kommentare. Sei der Erste 🙂</div>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((c) => {
                            const isMe = c.user_id === session.user.id
                            return (
                              <div key={c.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                {!isMe && (
                                  <div className="shrink-0">
                                    {c.photo_url ? (
                                      <img src={c.photo_url || "/placeholder.svg"} alt="Profil" className="w-8 h-8 rounded-full object-cover border" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-gray-600">
                                        {String(c.display_name || "U").slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="max-w-[85%] rounded-2xl border px-3 py-2 bg-white">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-semibold text-gray-900 truncate">{c.display_name || "User"}</div>
                                    <div className="text-[11px] text-gray-400">
                                      {new Date(c.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  </div>
                                  <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{c.body}</div>
                                </div>

                                {isMe && <div className="shrink-0 w-8" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* ✅ Composer (mobile nice) */}
                    <div className="p-3 border-t bg-white">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Kommentar schreiben…"
                          className="flex-1 min-h-[44px] max-h-[120px] rounded-2xl border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                        />

                        <button
                          type="button"
                          onClick={sendComment}
                          disabled={commentSending || !commentInput.trim()}
                          className="h-[44px] w-[44px] inline-flex items-center justify-center rounded-2xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Senden"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] text-gray-400">Tipp: kurz & freundlich 🙂</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <MobileBottomNav />
      <FAQChatWidget />
    </div>
  )
}
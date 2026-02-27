"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Calendar,
  Trophy,
  ArrowLeft,
  Filter,
  Heart,
  MessageCircle,
  Send,
  X,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Header } from "@/components/header"

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

type CommentRow = {
  id: string
  match_id: string
  user_id: string
  body: string
  created_at: string
  display_name?: string
  photo_url?: string | null
}

export default function MatchGalerieAppPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
const [initialLoading, setInitialLoading] = useState(true)
const [filterLoading, setFilterLoading] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("") // Filter
  const [loading, setLoading] = useState(true)

  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  const isMobile = useIsMobile()

  // ✅ Social state
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({})
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({})

  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [commentSending, setCommentSending] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  // Saison-Label für Header
  const selectedSeasonLabel = useMemo(() => {
    const s = seasons.find((x) => x.id === selectedSeasonId)
    if (!s) return "Alle Meisterschaften"
    const year = s.year ? ` ${s.year}` : ""
    return `${s.name}${year}`
  }, [seasons, selectedSeasonId])

  // 1) Seasons laden (Meisterschaften)
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

        // Default: neueste Saison automatisch auswählen (wenn vorhanden)
        if (rows.length > 0) {
          setSelectedSeasonId(rows[0].id)
        } else {
          setSelectedSeasonId("")
        }
      } catch (e) {
        console.error("Error loading seasons:", e)
        setSeasons([])
        setSelectedSeasonId("")
      }
    }

    loadSeasons()
  }, [])

  const loadSocialCountsForMatches = async (matchIds: string[]) => {
    try {
      if (!session?.user?.id) return
      if (!matchIds.length) return

      // Likes rows (for counts + likedByMe)
      const { data: likesData, error: likesError } = await supabase
        .from("match_photo_likes")
        .select("match_id,user_id")
        .in("match_id", matchIds)

      if (likesError) {
        console.error("Error loading likes:", likesError)
      }

      const nextLikeCounts: Record<string, number> = {}
      const nextLikedByMe: Record<string, boolean> = {}

      ;(likesData || []).forEach((r: any) => {
        const mid = String(r.match_id)
        nextLikeCounts[mid] = (nextLikeCounts[mid] || 0) + 1
        if (String(r.user_id) === session.user.id) nextLikedByMe[mid] = true
      })

      // Comments rows (for counts only)
      const { data: commentsData, error: commentsError } = await supabase
        .from("match_photo_comments")
        .select("match_id")
        .in("match_id", matchIds)

      if (commentsError) {
        console.error("Error loading comment counts:", commentsError)
      }

      const nextCommentCounts: Record<string, number> = {}
      ;(commentsData || []).forEach((r: any) => {
        const mid = String(r.match_id)
        nextCommentCounts[mid] = (nextCommentCounts[mid] || 0) + 1
      })

      setLikeCounts((prev) => ({ ...prev, ...nextLikeCounts }))
      setLikedByMe((prev) => ({ ...prev, ...nextLikedByMe }))
      setCommentCounts((prev) => ({ ...prev, ...nextCommentCounts }))
    } catch (e) {
      console.error("loadSocialCountsForMatches error:", e)
    }
  }

  const loadCommentsForMatch = async (matchId: string) => {
    try {
      if (!session?.user?.id) return
      setCommentsLoading(true)

      const { data, error } = await supabase
        .from("match_photo_comments")
        .select("id,match_id,user_id,body,created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading comments:", error)
        setComments([])
        return
      }

      const rows = (data || []) as CommentRow[]
      const userIds = Array.from(new Set(rows.map((c) => c.user_id)))

      // Map user_id -> display name / photo via user_profiles -> club_players
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, club_players(name, photo_url)")
        .in("user_id", userIds)

      if (profilesError) {
        console.error("Error loading commenter profiles:", profilesError)
      }

      const map: Record<string, { name?: string; photo_url?: string | null }> = {}
      ;(profilesData || []).forEach((p: any) => {
        map[String(p.user_id)] = {
          name: p.club_players?.name || "User",
          photo_url: p.club_players?.photo_url || null,
        }
      })

      const enriched = rows.map((c) => ({
        ...c,
        display_name:
          c.user_id === session.user.id
            ? "Du"
            : map[c.user_id]?.name || "User",
        photo_url: map[c.user_id]?.photo_url || null,
      }))

      setComments(enriched)
    } catch (e) {
      console.error("loadCommentsForMatch error:", e)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const toggleLike = async (matchId: string) => {
    try {
      if (!session?.user?.id) return

      setLikeLoading((p) => ({ ...p, [matchId]: true }))

      const already = !!likedByMe[matchId]

      // Optimistic UI
      setLikedByMe((p) => ({ ...p, [matchId]: !already }))
      setLikeCounts((p) => ({
        ...p,
        [matchId]: Math.max(0, (p[matchId] || 0) + (already ? -1 : 1)),
      }))

      if (already) {
        const { error } = await supabase
          .from("match_photo_likes")
          .delete()
          .eq("match_id", matchId)
          .eq("user_id", session.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("match_photo_likes").insert({
          match_id: matchId,
          user_id: session.user.id,
        })
        if (error) throw error
      }
    } catch (e) {
      console.error("toggleLike error:", e)
      // fallback: reload counts for this match
      await loadSocialCountsForMatches([matchId])
    } finally {
      setLikeLoading((p) => ({ ...p, [matchId]: false }))
    }
  }

  const sendComment = async () => {
    try {
      if (!session?.user?.id) return
      if (!selectedMatch?.id) return

      const body = commentInput.trim()
      if (!body) return

      setCommentSending(true)

      const { error } = await supabase.from("match_photo_comments").insert({
        match_id: selectedMatch.id,
        user_id: session.user.id,
        body,
      })

      if (error) throw error

      setCommentInput("")

      // Refresh comments + counts
      await loadCommentsForMatch(selectedMatch.id)

      setCommentCounts((p) => ({
        ...p,
        [selectedMatch.id]: (p[selectedMatch.id] || 0) + 1,
      }))
    } catch (e) {
      console.error("sendComment error:", e)
    } finally {
      setCommentSending(false)
    }
  }

  // 2) Matches laden (abhängig vom Filter)
  useEffect(() => {
    const loadMatchPhotos = async () => {
      if (initialLoading) setInitialLoading(true)
else setFilterLoading(true)
      try {
        // Base Query
        let query = supabase
          .from("matches")
          .select(
            `
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
            season:seasons!inner(id, name, year, type)
          `
          )
          .not("team_photo_url", "is", null)
          .order("match_date", { ascending: false })

        // Filter: wenn Saison gewählt
        if (selectedSeasonId) {
          query = query.eq("season.id", selectedSeasonId)
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
        setInitialLoading(false)
setFilterLoading(false)
      }
    }

    loadMatchPhotos()
  }, [selectedSeasonId])

  // ✅ Load social counts when matches change
  useEffect(() => {
    if (!session?.user?.id) return
    const ids = (matches || []).map((m) => String(m.id)).filter(Boolean)
    if (!ids.length) return
    loadSocialCountsForMatches(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches?.length, session?.user?.id])

  
 const [commentsLoadedFor, setCommentsLoadedFor] = useState<string | null>(null)

useEffect(() => {
  const mid = selectedMatch?.id ? String(selectedMatch.id) : null
  if (!isPhotoModalOpen) return
  if (!mid) return
  if (commentsLoadedFor === mid) return

  setCommentsLoadedFor(mid)
  loadCommentsForMatch(mid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isPhotoModalOpen, selectedMatch?.id, commentsLoadedFor])

  const handlePhotoClick = (photoUrl: string, match: any) => {
   
    setSelectedPhotoUrl(photoUrl)
    setSelectedMatch(match)
    setIsPhotoModalOpen(true)
  }

  const getMatchResultText = (match: any) => {
    if (match.status !== "completed") return "Geplant"

    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0
    if (homeScore === awayScore) return "Unentschieden"

    const isOurHomeTeam = !!match.home_team?.id
    const isOurAwayTeam = !!match.away_team?.id

    if (homeScore > awayScore) return isOurHomeTeam ? "Heimsieg" : "Niederlage"
    if (awayScore > homeScore) return isOurAwayTeam ? "Auswärtssieg" : "Niederlage"
    return "Unentschieden"
  }

  const getMatchResultColor = (match: any) => {
    if (match.status !== "completed") return "bg-blue-100 text-blue-700"

    const homeScore = match.home_score || 0
    const awayScore = match.away_score || 0
    if (homeScore === awayScore) return "bg-yellow-100 text-yellow-700"

    const isOurHomeTeam = !!match.home_team?.id
    const isOurAwayTeam = !!match.away_team?.id

    if (homeScore > awayScore) return isOurHomeTeam ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    if (awayScore > homeScore) return isOurAwayTeam ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const getMatchTitle = (match: any) => {
    const homeTeamName = match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
    const awayTeamName = match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"
    return `${homeTeamName} vs ${awayTeamName}`
  }

  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-4 max-w-6xl">{children}</main>
      <MobileBottomNav />
    </div>
  )

  if (authLoading || initialLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-center text-gray-600 -mt-10">Lade Match-Galerie...</p>
      </PageShell>
    )
  }

  if (!session) {
    return (
      <PageShell>
        <div className="text-center py-10">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Anmeldung erforderlich</h1>
          <p className="text-gray-600 mb-6">Du musst angemeldet sein, um die Match-Galerie zu sehen.</p>
          <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Back Button LINKS wie Lobby */}
      <Button
        variant="outline"
        onClick={() => router.push("/member-profile-app")}
        className="mb-4 flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
        size="sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Profil
      </Button>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* HEADER */}
        <motion.div variants={itemVariants} className="text-center mb-2">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-xl border border-purple-200 p-6 text-white">
            <div className="bg-white/10 rounded-full p-3 w-14 h-14 mx-auto mb-4 backdrop-blur-sm">
              <Camera className="h-8 w-8 text-white mx-auto" />
            </div>

            <h1 className="text-2xl font-extrabold uppercase leading-none tracking-tighter mb-2">
              <span className="block text-white">MATCH-GALERIE</span>
              <span className="block text-purple-200 text-lg">{selectedSeasonLabel}</span>
            </h1>

            <p className="text-sm font-bold uppercase text-purple-100 mb-4">Alle Teamfotos und Spielmomente</p>

            {/* FILTER */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-purple-100">
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

              <div className="flex items-center gap-2 text-purple-100">
                <Camera className="h-4 w-4" />
                <span className="text-sm font-medium">{matches.length} Fotos</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* LISTE */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5" />
                Match-Fotos ({matches.length})
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              {matches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-base">Noch keine Match-Fotos verfügbar</p>
                  <p className="text-sm mt-2">Fotos werden nach den Spielen hochgeladen</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className={`group cursor-pointer`}
                        onClick={() => handlePhotoClick(match.team_photo_url, match)}
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform group-hover:scale-[1.02]">
                          <div className="relative aspect-square overflow-hidden">
                            <Image
                              src={match.team_photo_url || "/placeholder.svg"}
                              alt={`Match zwischen ${match.home_team?.name || match.home_opponent_team?.name} und ${
                                match.away_team?.name || match.away_opponent_team?.name
                              }`}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110"
                              sizes="(max-width: 640px) 100vw, 50vw"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                          </div>

                          <CardContent className="p-3">
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

                              {/* ✅ Like/Comment row */}
                              <div className="pt-2 border-t flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1 text-sm ${
                                      isLiked ? "text-red-600" : "text-gray-600"
                                    } hover:text-red-600 transition-colors disabled:opacity-50`}
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
                                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-purple-700 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handlePhotoClick(match.team_photo_url, match)
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
              )}
            </CardContent>
          </Card>
        </motion.div>

{/* MODAL */}
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
    }
  }}
>
          <DialogContent className="w-[95vw] max-w-5xl mx-auto max-h-[95vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2 border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Camera className="h-5 w-5 text-purple-600" />
                  <DialogTitle className="text-lg font-semibold truncate">
                    {selectedMatch && getMatchTitle(selectedMatch)}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedMatch && (
                    <>
                      <Badge className={`text-xs ${getMatchResultColor(selectedMatch)}`}>
                        {getMatchResultText(selectedMatch)}
                      </Badge>
                      <span className="text-sm text-gray-500 hidden sm:inline">
                        {new Date(selectedMatch.match_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border bg-white hover:bg-gray-50"
                    onClick={() => setIsPhotoModalOpen(false)}
                    aria-label="Schließen"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Image */}
              <div className="relative w-full h-[45vh] sm:h-[60vh] lg:h-[80vh] lg:col-span-3 bg-black">
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

              {/* Right panel: like + comments */}
              <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l bg-white">
                {selectedMatch && (
                  <>
                    {/* Like bar */}
                    <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Interaktion</div>
                          <div className="text-sm font-semibold text-gray-900">Gefällt dir das Foto?</div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 transition-colors ${
                              likedByMe[String(selectedMatch.id)] ? "text-red-600" : "text-gray-700"
                            }`}
                            disabled={!!likeLoading[String(selectedMatch.id)]}
                            onClick={() => toggleLike(String(selectedMatch.id))}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                likedByMe[String(selectedMatch.id)] ? "fill-red-600" : ""
                              }`}
                            />
                            <span className="text-sm font-semibold">{likeCounts[String(selectedMatch.id)] || 0}</span>
                          </button>

                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-gray-700">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm font-semibold">{commentCounts[String(selectedMatch.id)] || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="p-4">
                      <div className="text-sm font-bold text-gray-900 mb-3">Kommentare</div>

                      <div className="max-h-[220px] sm:max-h-[280px] overflow-auto rounded-xl border bg-gray-50 p-3">
                        {commentsLoading ? (
                          <div className="text-sm text-gray-500">Lade Kommentare…</div>
                        ) : comments.length === 0 ? (
                          <div className="text-sm text-gray-500">Noch keine Kommentare. Sei der Erste 🙂</div>
                        ) : (
                          <div className="space-y-3">
                            {comments.map((c) => (
                              <div key={c.id} className="bg-white rounded-xl border p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {c.photo_url ? (
                                      <img
                                        src={c.photo_url || "/placeholder.svg"}
                                        alt="Profil"
                                        className="w-7 h-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        {String(c.display_name || "U").slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-gray-900 truncate">
                                        {c.display_name || "User"}
                                      </div>
                                      <div className="text-[11px] text-gray-400">
                                        {new Date(c.created_at).toLocaleString("de-DE", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
                                  {c.body}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Comment input */}
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] uppercase tracking-wide text-gray-500">
                            Kommentar schreiben
                          </label>
                          <textarea
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Schreib etwas…"
                            className="mt-1 w-full min-h-[42px] max-h-[120px] rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>

                        <Button
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                          disabled={commentSending || !commentInput.trim()}
                          onClick={sendComment}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Senden
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-400">
                        Tipp: Halte es kurz & freundlich 🙂
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Optional: Score footer (dein bestehender Teil) */}
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
      </motion.div>
    </PageShell>
  )
}
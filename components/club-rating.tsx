"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, MessageSquare, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Rating {
  id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  user_name?: string
}

export function ClubRating() {
  const [user, setUser] = useState<any>(null)
  const [userRating, setUserRating] = useState<Rating | null>(null)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedRating, setSelectedRating] = useState(0)
  const [comment, setComment] = useState("")
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [allRatings, setAllRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Lade aktuell angemeldeten User
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  // Lade Ratings und setze Realtime Subscription
  useEffect(() => {
    loadRatings()

    const subscription = supabase
      .channel("ratings_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
        },
        () => {
          loadRatings()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const loadRatings = async () => {
    try {
      setLoading(true)

      // Alle Ratings abrufen
      const { data: allRatingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("*")
        .order("created_at", { ascending: false })

      if (ratingsError) {
        console.error("[v0] Error loading ratings:", ratingsError)
        return
      }

      if (allRatingsData && allRatingsData.length > 0) {
        // User-IDs extrahieren
        const userIds = [...new Set(allRatingsData.map((r: any) => r.user_id))]

        // Namen aus club_players holen (korrekte Spalte user_id)
        const { data: playersData, error: playersError } = await supabase
          .from("club_players")
          .select("user_id, name")
          .in("user_id", userIds)

        if (playersError) {
          console.error("[v0] Error loading players:", playersError)
        }

        // Map für schnelle Zuordnung
        const userMap = new Map(
          (playersData || []).map((p: any) => [p.user_id, p.name || "Anonymer Benutzer"])
        )

        const ratingsWithNames = allRatingsData.map((rating: any) => ({
          ...rating,
          user_name: userMap.get(rating.user_id) || "Anonymer Benutzer",
        }))

        // Durchschnitt und Anzahl
        const avg =
          allRatingsData.reduce((sum, r) => sum + r.rating, 0) /
          allRatingsData.length
        setAverageRating(avg)
        setTotalRatings(allRatingsData.length)
        setAllRatings(ratingsWithNames)
      } else {
        setAllRatings([])
        setAverageRating(0)
        setTotalRatings(0)
      }

      // Prüfen, ob der angemeldete User schon bewertet hat
      if (user) {
        const { data: userRatingData } = await supabase
          .from("ratings")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (userRatingData) {
          setUserRating(userRatingData)
          setSelectedRating(userRatingData.rating)
          setComment(userRatingData.comment || "")
        }
      }
    } catch (error) {
      console.error("[v0] Error loading ratings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!user) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melde dich an, um eine Bewertung abzugeben.",
        variant: "destructive",
      })
      return
    }

    if (selectedRating === 0) {
      toast({
        title: "Bewertung fehlt",
        description: "Bitte wähle eine Sternebewertung aus.",
        variant: "destructive",
      })
      return
    }

    if (userRating) {
      toast({
        title: "Bereits bewertet",
        description: "Du hast bereits eine Bewertung abgegeben.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const ratingData = {
        user_id: user.id,
        rating: selectedRating,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("ratings").insert([ratingData])
      if (error) throw error

      toast({
        title: "Bewertung abgegeben",
        description: "Vielen Dank für deine Bewertung!",
      })

      await loadRatings()
    } catch (error: any) {
      console.error("[v0] Error submitting rating:", error)
      toast({
        title: "Fehler",
        description: error.message || "Bewertung konnte nicht gespeichert werden.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SectionSkeleton kind="cards" />
    )
  }

  return (
    <div className="text-foreground bg-card   rounded-2xl p-4 space-y-4">
      {/* Bewertung abgeben */}
      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Bewerte unsere Seite</h3>
            <p className="text-sm text-muted-foreground">Teile deine Erfahrung mit anderen</p>
          </div>

          {totalRatings > 0 && (
            <div className="text-foreground bg-card   rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-8 h-8 fill-orange-500 text-orange-500" />
                    <span className="text-3xl font-semibold text-foreground">{averageRating.toFixed(1)}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Durchschnitt</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {totalRatings} {totalRatings === 1 ? "Bewertung" : "Bewertungen"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!user ? (
            <div className="text-center py-4 bg-muted rounded-xl">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Melde dich an, um eine Bewertung abzugeben</p>
              <Button
                onClick={() => (window.location.href = "/member-login")}
                className="bg-card     text-white"
              >
                Zur Anmeldung
              </Button>
            </div>
          ) : userRating ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-3 text-center">Du hast bereits bewertet</p>
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 ${
                        star <= userRating.rating ? "fill-orange-500 text-orange-500" : "fill-gray-200 text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                {userRating.comment && (
                  <div className="bg-card rounded-lg p-3 border border-green-100">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Dein Kommentar:</p>
                    <p className="text-sm text-muted-foreground">{userRating.comment}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center mt-3">Vielen Dank für deine Bewertung!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Wie gefällt dir unser Verein?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredStar || selectedRating)
                            ? "fill-orange-500 text-orange-500"
                            : "fill-gray-200 text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-muted-foreground mb-2">
                  Kommentar (optional)
                </label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Teile deine Gedanken mit uns..."
                  className="resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{comment.length}/500 Zeichen</p>
              </div>

              <Button
                onClick={handleSubmitRating}
                disabled={submitting || selectedRating === 0}
                className="w-full bg-card     text-white shadow-md disabled:opacity-50"
               loading={Boolean(submitting)} loadingLabel="Wird gespeichert...">{(
                  "Bewertung abgeben"
                )}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alle Bewertungen anzeigen */}
      {allRatings.length > 0 && (
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Alle Bewertungen ({allRatings.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allRatings.map((rating) => (
                <div key={rating.id} className="border border-border rounded-lg p-3 bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating.rating ? "fill-orange-500 text-orange-500" : "fill-gray-200 text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{rating.user_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rating.created_at).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  {rating.comment && <p className="text-sm text-muted-foreground">{rating.comment}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

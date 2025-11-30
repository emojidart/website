"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Trophy, CheckCircle, XCircle, Calendar, User, Award, TrendingUp, Gift } from "lucide-react"
import Link from "next/link"

interface QuizResponse {
  id: string
  user_id: string
  day: number
  selected_answer: string
  is_correct: boolean
  answered_at: string
}

interface UserProfile {
  user_id: string
  player_id: string
  club_players: {
    name: string
  }
}

interface ParticipantStats {
  user_id: string
  player_name: string
  total_answers: number
  correct_answers: number
  accuracy_percentage: number
  last_answered: string
  responses: QuizResponse[]
}

export default function AdminAdventQuizPage() {
  const { session, isAdmin, adminLoading } = useAuth()
  const [participants, setParticipants] = useState<ParticipantStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantStats | null>(null)
  const [sortBy, setSortBy] = useState<"accuracy" | "total">("accuracy")

  const fetchQuizData = async () => {
    try {
      setLoading(true)

      const { data: responses, error: responsesError } = await supabase
        .from("advent_quiz_responses")
        .select("*")
        .order("answered_at", { ascending: false })

      if (responsesError) throw responsesError

      const { data: profiles, error: profilesError } = await supabase.from("user_profiles").select(`
          user_id,
          player_id,
          club_players!inner (
            name
          )
        `)

      if (profilesError) throw profilesError

      const participantMap = new Map<string, ParticipantStats>()

      responses?.forEach((response) => {
        const profile = profiles?.find((p) => p.user_id === response.user_id)

        if (!profile) return

        const playerName = profile.club_players?.name || "Unbekannt"

        if (!participantMap.has(response.user_id)) {
          participantMap.set(response.user_id, {
            user_id: response.user_id,
            player_name: playerName,
            total_answers: 0,
            correct_answers: 0,
            accuracy_percentage: 0,
            last_answered: response.answered_at,
            responses: [],
          })
        }

        const participant = participantMap.get(response.user_id)!
        participant.total_answers++
        if (response.is_correct) participant.correct_answers++
        participant.responses.push(response)

        if (new Date(response.answered_at) > new Date(participant.last_answered)) {
          participant.last_answered = response.answered_at
        }
      })

      const participantList = Array.from(participantMap.values()).map((p) => ({
        ...p,
        accuracy_percentage: p.total_answers > 0 ? (p.correct_answers / p.total_answers) * 100 : 0,
        responses: p.responses.sort((a, b) => a.day - b.day),
      }))

      setParticipants(participantList)
    } catch (error) {
      console.error("Error fetching quiz data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && isAdmin) {
      fetchQuizData()
    }
  }, [session, isAdmin])

  const sortedParticipants = [...participants].sort((a, b) => {
    if (sortBy === "accuracy") {
      return b.accuracy_percentage - a.accuracy_percentage || b.total_answers - a.total_answers
    }
    return b.correct_answers - a.correct_answers
  })

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: Trophy, color: "bg-yellow-500", text: "🥇 1." }
    if (index === 1) return { icon: Award, color: "bg-gray-400", text: "🥈 2." }
    if (index === 2) return { icon: Award, color: "bg-orange-600", text: "🥉 3." }
    return { icon: User, color: "bg-gray-300", text: `#${index + 1}` }
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Berechtigungen werden geprüft...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Zugriff verweigert</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Sie haben keine Admin-Berechtigung für diesen Bereich.</p>
                <Link href="/admin">
                  <Button className="w-full">Zurück zum Admin-Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="mb-3 md:mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 text-xs md:text-sm px-2">
                ← Zurück
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Gift className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">Adventskalender Quiz</h1>
              <p className="text-xs md:text-base text-gray-600">Auswertung aller Teilnehmer</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="pt-4 md:pt-6 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Teilnehmer</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{participants.length}</p>
                </div>
                <User className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Antworten gesamt</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {participants.reduce((sum, p) => sum + p.total_answers, 0)}
                  </p>
                </div>
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Ø Genauigkeit</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {participants.length > 0
                      ? Math.round(
                          participants.reduce((sum, p) => sum + p.accuracy_percentage, 0) / participants.length,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-2">
          <Button
            variant={sortBy === "accuracy" ? "default" : "outline"}
            onClick={() => setSortBy("accuracy")}
            size="sm"
            className="w-full sm:w-auto text-xs md:text-sm"
          >
            Nach Genauigkeit
          </Button>
          <Button
            variant={sortBy === "total" ? "default" : "outline"}
            onClick={() => setSortBy("total")}
            size="sm"
            className="w-full sm:w-auto text-xs md:text-sm"
          >
            Nach richtigen Antworten
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm md:text-base text-gray-600">Daten werden geladen...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Participants List */}
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Rangliste</h2>

              {sortedParticipants.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm md:text-base text-gray-600">Noch keine Teilnehmer.</p>
                  </CardContent>
                </Card>
              ) : (
                sortedParticipants.map((participant, index) => {
                  const rank = getRankBadge(index)
                  return (
                    <Card
                      key={participant.user_id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedParticipant?.user_id === participant.user_id ? "ring-2 ring-red-500" : ""
                      }`}
                      onClick={() => setSelectedParticipant(participant)}
                    >
                      <CardHeader className="pb-3 px-4 md:px-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${rank.color} text-white text-xs`}>{rank.text}</Badge>
                            </div>
                            <CardTitle className="text-base md:text-lg mb-1 truncate">
                              {participant.player_name}
                            </CardTitle>

                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs md:text-sm mt-3">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                                <span className="font-semibold text-green-600">{participant.correct_answers}</span>
                                <span className="text-gray-600 truncate">/ {participant.total_answers} richtig</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                                <span className="font-semibold text-blue-600">
                                  {participant.accuracy_percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Participant Details */}
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Detailansicht</h2>

              {selectedParticipant ? (
                <Card>
                  <CardHeader className="px-4 md:px-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base md:text-xl mb-1">{selectedParticipant.player_name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 md:px-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm text-gray-600">Richtig</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-green-600">
                          {selectedParticipant.correct_answers}
                        </p>
                      </div>

                      <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm text-gray-600">Genauigkeit</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-blue-600">
                          {selectedParticipant.accuracy_percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm md:text-base text-gray-900 mb-3">Antworten pro Tag</h4>
                      <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                        {selectedParticipant.responses.map((response) => (
                          <div
                            key={response.id}
                            className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 rounded-lg gap-2"
                          >
                            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="font-bold text-sm md:text-base text-red-600">{response.day}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                                  Tag {response.day} - Antwort {response.selected_answer}
                                </p>
                                <p className="text-[10px] md:text-xs text-gray-600">
                                  {new Date(response.answered_at).toLocaleDateString("de-DE")}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {response.is_correct ? (
                                <Badge className="bg-green-500 text-white text-[10px] md:text-xs px-1.5 md:px-2">
                                  <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />✓
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500 text-white text-[10px] md:text-xs px-1.5 md:px-2">
                                  <XCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />✗
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm md:text-base text-gray-600">
                      Wählen Sie einen Teilnehmer aus, um Details anzuzeigen.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

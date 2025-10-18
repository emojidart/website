"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Target,
  TrendingUp,
  Award,
  Clock,
  Circle,
  BarChart3,
  Flame,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  ArrowLeft,
  Dumbbell,
  Trash2,
  Users,
  CheckCircle2,
} from "lucide-react"

interface TrainingSession {
  id: string
  type: string
  score: number
  maxScore: number
  date: string
  completed: boolean
}

interface TrainingType {
  id: string
  name: string
  description: string
  icon: any
  color: string
  maxScore: number
  difficulty: "Anfänger" | "Fortgeschritten" | "Profi"
}

interface TeamMemberStats {
  user_id: string
  player_name: string
  total_sessions: number
  best_scores: { [key: string]: number }
  avg_scores: { [key: string]: number }
  total_hits: { [key: string]: number }
  total_misses: { [key: string]: number }
  avg_accuracy: { [key: string]: number }
  avg_duration: { [key: string]: number }
}

const trainingTypes: TrainingType[] = [
  {
    id: "around-the-clock",
    name: "Around the Clock",
    description: "Treffe alle Zahlen von 1-20 in der richtigen Reihenfolge",
    icon: Clock,
    color: "orange",
    maxScore: 20,
    difficulty: "Anfänger",
  },
  {
    id: "doubles-training",
    name: "Doubles Training",
    description: "Trainiere alle Doppelfelder (D1-D20 + Bull)",
    icon: Target,
    color: "red",
    maxScore: 21,
    difficulty: "Fortgeschritten",
  },
  {
    id: "triples-training",
    name: "Triples Training",
    description: "Trainiere alle Dreifachfelder (T1-T20)",
    icon: TrendingUp,
    color: "green",
    maxScore: 20,
    difficulty: "Fortgeschritten",
  },
  {
    id: "checkout-training",
    name: "Checkout Training",
    description: "Übe wichtige Finish-Kombinationen (40-170)",
    icon: Award,
    color: "blue",
    maxScore: 100,
    difficulty: "Profi",
  },
  {
    id: "bullseye-challenge",
    name: "Bullseye Challenge",
    description: "10 Minuten nur auf Bull - Präzision & Muskelgedächtnis",
    icon: Target,
    color: "red",
    maxScore: 50,
    difficulty: "Fortgeschritten",
  },
]

const trainingTips = [
  {
    category: "Technik",
    tips: [
      {
        title: "Perfekte Standposition",
        description:
          "Stelle dich seitlich zur Scheibe, dominanter Fuß vorne. Das meiste Gewicht auf dem vorderen Fuß, Körper entspannt aber ausgerichtet mit Blick aufs Ziel.",
        icon: "🎯",
      },
      {
        title: "Dart-Griff",
        description:
          "Halte den Dart fest aber nicht zu fest - typischerweise mit Daumen, Zeige- und Mittelfinger für Kontrolle. Ziel ist ein flüssiger, geschmeidiger Release.",
        icon: "✋",
      },
      {
        title: "Ellbogen-Position",
        description:
          "Dein Ellbogen sollte stillstehen und leicht über der Dart-Linie sein. Nutze Handgelenk-Action für Spin und Präzision.",
        icon: "💪",
      },
      {
        title: "Follow-Through",
        description:
          "Konsistenz in deiner Wurfbewegung und Follow-Through ist der Schlüssel. Zeige nach dem Wurf auf dein Ziel.",
        icon: "🎪",
      },
    ],
  },
  {
    category: "Mentales Training",
    tips: [
      {
        title: "Positive Einstellung",
        description: "Behalte eine positive Einstellung. Visualisiere den Dart, der dein Ziel trifft, bevor du wirfst.",
        icon: "🧠",
      },
      {
        title: "Ruhe bewahren",
        description: "Bleib ruhig und gefasst unter Druck. Kontrolliere deine Atmung und ignoriere Ablenkungen.",
        icon: "🧘",
      },
      {
        title: "Routine entwickeln",
        description: "Entwickle eine Pre-Shot-Routine und halte dich daran. Konsistenz schafft Vertrauen.",
        icon: "🔄",
      },
    ],
  },
  {
    category: "Trainingsplan",
    tips: [
      {
        title: "Regelmäßigkeit schlägt Intensität",
        description: "Besser 20 Minuten täglich als 3 Stunden einmal pro Woche. Muskelgedächtnis braucht Wiederholung.",
        icon: "📅",
      },
      {
        title: "Gezieltes Training",
        description: "Fokussiere dich auf spezifische Schwächen. Wenn Doubles dein Problem sind, trainiere Doubles!",
        icon: "🎯",
      },
      {
        title: "Tracking ist wichtig",
        description: "Dokumentiere deine Sessions. Du kannst nur verbessern, was du misst.",
        icon: "📊",
      },
      {
        title: "Warm-Up nicht vergessen",
        description: "Starte jede Session mit 5-10 Minuten lockerem Werfen, um dich einzufinden.",
        icon: "🔥",
      },
    ],
  },
]

export default function TrainingPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [selectedTraining, setSelectedTraining] = useState<TrainingType | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [currentScore, setCurrentScore] = useState(0)
  const [currentTarget, setCurrentTarget] = useState(1)
  const [dartsThrown, setDartsThrown] = useState(0)
  const [hits, setHits] = useState(0)
  const [sessionTime, setSessionTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [throwHistory, setThrowHistory] = useState<{ target: number; hit: boolean; time: number }[]>([])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([])
  const [loadingTeamStats, setLoadingTeamStats] = useState(false)
  const [progressView, setProgressView] = useState<"my-progress" | "team-progress">("my-progress")

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      loadTrainingSessions()
    }
  }, [session])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && isRecording) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, isRecording])

  useEffect(() => {
    if (progressView === "team-progress" && teamStats.length === 0) {
      loadTeamStats()
    }
  }, [progressView])

  const loadTrainingSessions = async () => {
    if (!session?.user) return

    try {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("completed_at", { ascending: false })

      if (error) throw error

      const transformedSessions: TrainingSession[] = (data || []).map((session) => ({
        id: session.id,
        type: session.training_type,
        score: session.score,
        maxScore: trainingTypes.find((t) => t.id === session.training_type)?.maxScore || 0,
        date: session.completed_at,
        completed: true,
      }))

      setSessions(transformedSessions)
    } catch (err) {
      console.error("Error loading training sessions:", err)
    }
  }

  const loadTeamStats = async () => {
    if (!session?.user) return

    setLoadingTeamStats(true)
    try {
      const { data: allSessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .order("score", { ascending: false })

      if (sessionsError) throw sessionsError

      const userIds = [...new Set(allSessions?.map((s) => s.user_id) || [])]

      const { data: userProfiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, user_id, player_id")
        .in("user_id", userIds)

      if (profilesError) throw profilesError

      const playerIds = [...new Set(userProfiles?.map((p) => p.player_id).filter(Boolean) || [])]

      const { data: clubPlayers, error: playersError } = await supabase
        .from("club_players")
        .select("id, name")
        .in("id", playerIds)

      if (playersError) throw playersError

      const playerNameMap = new Map(clubPlayers?.map((p) => [p.id, p.name]) || [])
      const userPlayerMap = new Map(userProfiles?.map((p) => [p.user_id, p.player_id]) || [])

      const userNameMap = new Map(
        userIds.map((userId) => {
          const playerId = userPlayerMap.get(userId)
          const playerName = playerId ? playerNameMap.get(playerId) : null
          return [userId, playerName || "Unbekannt"]
        }),
      )

      const userStatsMap = new Map<string, TeamMemberStats>()

      allSessions?.forEach((session: any) => {
        const userId = session.user_id
        const playerName = userNameMap.get(userId) || "Unbekannt"

        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            player_name: playerName,
            total_sessions: 0,
            best_scores: {},
            avg_scores: {},
            total_hits: {},
            total_misses: {},
            avg_accuracy: {},
            avg_duration: {},
          })
        }

        const userStats = userStatsMap.get(userId)!
        userStats.total_sessions++

        const trainingType = session.training_type

        if (!userStats.best_scores[trainingType]) {
          userStats.best_scores[trainingType] = session.score
          userStats.avg_scores[trainingType] = session.score
          userStats.total_hits[trainingType] = session.hits || 0
          userStats.total_misses[trainingType] = session.misses || 0
          userStats.avg_accuracy[trainingType] = session.accuracy || 0
          userStats.avg_duration[trainingType] = session.duration || 0
        } else {
          userStats.best_scores[trainingType] = Math.max(userStats.best_scores[trainingType], session.score)

          const sessionsForType = allSessions.filter(
            (s: any) => s.user_id === userId && s.training_type === trainingType,
          ).length

          const currentAvgScore = userStats.avg_scores[trainingType]
          userStats.avg_scores[trainingType] = Math.round(
            (currentAvgScore * (sessionsForType - 1) + session.score) / sessionsForType,
          )

          userStats.total_hits[trainingType] = (userStats.total_hits[trainingType] || 0) + (session.hits || 0)
          userStats.total_misses[trainingType] = (userStats.total_misses[trainingType] || 0) + (session.misses || 0)

          const currentAvgAccuracy = userStats.avg_accuracy[trainingType]
          userStats.avg_accuracy[trainingType] = Math.round(
            (currentAvgAccuracy * (sessionsForType - 1) + (session.accuracy || 0)) / sessionsForType,
          )

          const currentAvgDuration = userStats.avg_duration[trainingType]
          userStats.avg_duration[trainingType] = Math.round(
            (currentAvgDuration * (sessionsForType - 1) + (session.duration || 0)) / sessionsForType,
          )
        }
      })

      const statsArray = Array.from(userStatsMap.values()).sort((a, b) => b.total_sessions - a.total_sessions)
      setTeamStats(statsArray)
    } catch (err) {
      console.error("Error loading team stats:", err)
    } finally {
      setLoadingTeamStats(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from("training_sessions").delete().eq("id", sessionId)

      if (error) throw error

      await loadTrainingSessions()
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (err) {
      console.error("Error deleting session:", err)
      alert("Fehler beim Löschen der Session. Bitte versuche es erneut.")
    }
  }

  const deleteAllSessions = async () => {
    if (!session?.user) return

    try {
      const { error } = await supabase.from("training_sessions").delete().eq("user_id", session.user.id)

      if (error) throw error

      await loadTrainingSessions()
      setDeleteAllDialogOpen(false)
    } catch (err) {
      console.error("Error deleting all sessions:", err)
      alert("Fehler beim Löschen aller Sessions. Bitte versuche es erneut.")
    }
  }

  const startTraining = (training: TrainingType) => {
    setSelectedTraining(training)
    setIsRecording(true)
    setCurrentScore(0)
    setCurrentTarget(1)
    setDartsThrown(0)
    setHits(0)
    setSessionTime(0)
    setIsTimerRunning(true)
    setThrowHistory([])
  }

  const recordHit = () => {
    setHits((prev) => prev + 1)
    setCurrentScore((prev) => prev + 1)
    setDartsThrown((prev) => prev + 1)
    setThrowHistory((prev) => [...prev, { target: currentTarget, hit: true, time: sessionTime }])

    if (selectedTraining?.id === "around-the-clock" && currentTarget < 20) {
      setCurrentTarget((prev) => prev + 1)
    } else if (selectedTraining?.id === "around-the-clock" && currentTarget === 20) {
      setIsTimerRunning(false)
    } else if (selectedTraining?.id === "doubles-training" && currentTarget < 20) {
      setCurrentTarget((prev) => prev + 1)
    } else if (selectedTraining?.id === "doubles-training" && currentTarget === 20) {
      setIsTimerRunning(false)
    } else if (selectedTraining?.id === "triples-training" && currentTarget < 20) {
      setCurrentTarget((prev) => prev + 1)
    } else if (selectedTraining?.id === "triples-training" && currentTarget === 20) {
      setIsTimerRunning(false)
    }
  }

  const recordMiss = () => {
    setDartsThrown((prev) => prev + 1)
    setThrowHistory((prev) => [...prev, { target: currentTarget, hit: false, time: sessionTime }])
  }

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev)
  }

  const resetSession = () => {
    setCurrentScore(0)
    setCurrentTarget(1)
    setDartsThrown(0)
    setHits(0)
    setSessionTime(0)
    setIsTimerRunning(false)
    setThrowHistory([])
  }

  const saveTrainingSession = async () => {
    if (!selectedTraining || !session?.user) return

    try {
      const { error } = await supabase.from("training_sessions").insert({
        user_id: session.user.id,
        training_type: selectedTraining.id,
        score: currentScore,
        hits: hits,
        misses: dartsThrown - hits,
        accuracy: getAccuracy(),
        duration: sessionTime,
      })

      if (error) throw error

      await loadTrainingSessions()

      setIsRecording(false)
      setSelectedTraining(null)
      resetSession()
    } catch (err) {
      console.error("Error saving training session:", err)
      alert("Fehler beim Speichern der Session. Bitte versuche es erneut.")
    }
  }

  const cancelTraining = () => {
    setIsRecording(false)
    setSelectedTraining(null)
    resetSession()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getAccuracy = () => {
    if (dartsThrown === 0) return 0
    return Math.round((hits / dartsThrown) * 100)
  }

  const getSessionsByType = (typeId: string) => {
    return sessions.filter((s) => s.type === typeId)
  }

  const getBestScore = (typeId: string) => {
    const typeSessions = getSessionsByType(typeId)
    if (typeSessions.length === 0) return 0
    return Math.max(...typeSessions.map((s) => s.score))
  }

  const getAverageScore = (typeId: string) => {
    const typeSessions = getSessionsByType(typeId)
    if (typeSessions.length === 0) return 0
    const sum = typeSessions.reduce((acc, s) => acc + s.score, 0)
    return Math.round(sum / typeSessions.length)
  }

  const getTotalSessions = () => sessions.length

  const getCompletionRate = (typeId: string) => {
    const training = trainingTypes.find((t) => t.id === typeId)
    if (!training) return 0
    const best = getBestScore(typeId)
    return Math.round((best / training.maxScore) * 100)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Anfänger":
        return "bg-green-100 text-green-700 border-green-300"
      case "Fortgeschritten":
        return "bg-orange-100 text-orange-700 border-orange-300"
      case "Profi":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const isTrainingCompleted = () => {
    if (selectedTraining?.id === "around-the-clock") {
      return currentTarget === 20 && currentScore >= 20
    } else if (selectedTraining?.id === "doubles-training") {
      return currentTarget === 20 && currentScore >= 20
    } else if (selectedTraining?.id === "triples-training") {
      return currentTarget === 20 && currentScore >= 20
    }
    return false
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl">
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Dart Training</h1>
          <p className="text-lg sm:text-xl text-gray-600">
            Verbessere deine Fähigkeiten mit gezielten Trainingsübungen
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                Gesamt Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{getTotalSessions()}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-red-600" />
                Trainingsarten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{trainingTypes.length}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Abgeschlossen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{sessions.filter((s) => s.completed).length}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Flame className="h-4 w-4 text-blue-600" />
                Diese Woche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {
                  sessions.filter((s) => {
                    const sessionDate = new Date(s.date)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return sessionDate > weekAgo
                  }).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="training" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto">
            <TabsTrigger value="training" className="text-xs sm:text-sm px-2 py-2">
              Training starten
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs sm:text-sm px-2 py-2">
              Fortschritt
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-xs sm:text-sm px-2 py-2">
              Tipps & Tricks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-6">
            {isRecording && selectedTraining ? (
              <div className="space-y-4">
                <Card className="border-2 border-orange-500 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                          <selectedTraining.icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
                          <span className="truncate">{selectedTraining.name}</span>
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-1">
                          {selectedTraining.description}
                        </CardDescription>
                      </div>
                      <Badge className={getDifficultyColor(selectedTraining.difficulty)}>
                        {selectedTraining.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-center">
                        <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl sm:text-3xl font-bold text-orange-600">{formatTime(sessionTime)}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Zeit</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-center">
                        <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">{currentScore}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Score</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-center">
                        <Target className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">{dartsThrown}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Würfe</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-center">
                        <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600">{getAccuracy()}%</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Genauigkeit</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Live Training Session</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {(selectedTraining.id === "around-the-clock" ||
                      selectedTraining.id === "doubles-training" ||
                      selectedTraining.id === "triples-training") && (
                      <div className="text-center p-6 sm:p-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl border-2 border-orange-300">
                        <div className="text-xs sm:text-sm text-gray-600 mb-2">Aktuelles Ziel</div>
                        <div className="text-5xl sm:text-7xl font-bold text-orange-600 mb-2">{currentTarget}</div>
                        <Progress value={(currentTarget / 20) * 100} className="h-2 sm:h-3 max-w-md mx-auto" />
                        <div className="text-xs sm:text-sm text-gray-600 mt-2">{currentTarget} von 20</div>
                      </div>
                    )}

                    {isTrainingCompleted() && (
                      <div className="text-center p-6 sm:p-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl border-2 border-green-400 animate-pulse">
                        <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 text-green-600" />
                        <div className="text-2xl sm:text-3xl font-bold text-green-700 mb-2">
                          Training abgeschlossen!
                        </div>
                        <div className="text-sm sm:text-base text-green-600">
                          Glückwunsch! Du hast alle Ziele erreicht.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <Button
                        onClick={recordHit}
                        size="lg"
                        disabled={isTrainingCompleted()}
                        className="h-20 sm:h-24 text-lg sm:text-2xl font-bold bg-green-600 hover:bg-green-700 text-white touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3" />
                        Treffer!
                      </Button>
                      <Button
                        onClick={recordMiss}
                        size="lg"
                        variant="outline"
                        disabled={isTrainingCompleted()}
                        className="h-20 sm:h-24 text-lg sm:text-2xl font-bold border-2 border-red-300 hover:bg-red-50 bg-transparent touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Circle className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3" />
                        Verfehlt
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                      <Button
                        onClick={() => setCurrentScore(Math.max(0, currentScore - 1))}
                        variant="outline"
                        size="lg"
                        disabled={isTrainingCompleted()}
                        className="h-10 w-10 sm:h-12 sm:w-12 bg-transparent touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <div className="text-center">
                        <div className="text-xs sm:text-sm text-gray-600">Manueller Score</div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{currentScore}</div>
                      </div>
                      <Button
                        onClick={() => setCurrentScore(Math.min(selectedTraining.maxScore, currentScore + 1))}
                        variant="outline"
                        size="lg"
                        disabled={isTrainingCompleted()}
                        className="h-10 w-10 sm:h-12 sm:w-12 bg-transparent touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={toggleTimer}
                        variant="outline"
                        disabled={isTrainingCompleted()}
                        className="flex-1 h-12 bg-transparent touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTimerRunning ? (
                          <>
                            <Pause className="h-5 w-5 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5 mr-2" />
                            Fortsetzen
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetSession}
                        variant="outline"
                        className="flex-1 h-12 bg-transparent touch-manipulation"
                      >
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Zurücksetzen
                      </Button>
                    </div>

                    {throwHistory.length > 0 && !isTrainingCompleted() && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-600">Letzte Würfe</h4>
                        <div className="flex flex-wrap gap-2">
                          {throwHistory
                            .slice(-10)
                            .reverse()
                            .map((throw_, idx) => (
                              <div
                                key={idx}
                                className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${
                                  throw_.hit
                                    ? "bg-green-100 text-green-700 border border-green-300"
                                    : "bg-red-100 text-red-700 border border-red-300"
                                }`}
                              >
                                {throw_.hit ? "✓" : "✗"} #{throw_.target}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <Button
                        onClick={saveTrainingSession}
                        disabled={!isTrainingCompleted()}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-14 text-base sm:text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trophy className="h-5 w-5 mr-2" />
                        Session beenden & speichern
                      </Button>
                      <Button
                        onClick={cancelTraining}
                        variant="outline"
                        className="h-14 px-6 sm:px-8 border-gray-300 hover:bg-gray-100 bg-transparent touch-manipulation"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingTypes.map((training) => {
                  const Icon = training.icon
                  const bestScore = getBestScore(training.id)
                  const avgScore = getAverageScore(training.id)
                  const sessionCount = getSessionsByType(training.id).length

                  return (
                    <Card
                      key={training.id}
                      className="hover:shadow-xl transition-all duration-300 border-2 hover:border-orange-400 cursor-pointer group"
                      onClick={() => startTraining(training)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className={`p-3 rounded-lg bg-${training.color}-100 group-hover:scale-110 transition-transform`}
                          >
                            <Icon className={`h-6 w-6 text-${training.color}-600`} />
                          </div>
                          <Badge className={getDifficultyColor(training.difficulty)}>{training.difficulty}</Badge>
                        </div>
                        <CardTitle className="text-xl group-hover:text-orange-600 transition-colors">
                          {training.name}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">{training.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {sessionCount > 0 ? (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Bester Score:</span>
                                <span className="font-bold text-green-600">
                                  {bestScore} / {training.maxScore}
                                </span>
                              </div>
                              <Progress value={(bestScore / training.maxScore) * 100} className="h-2" />
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t">
                              <span className="text-gray-600">Durchschnitt:</span>
                              <span className="font-semibold">{avgScore}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Sessions:</span>
                              <span className="font-semibold">{sessionCount}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Noch keine Sessions aufgezeichnet
                          </div>
                        )}
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation()
                            startTraining(training)
                          }}
                        >
                          Training starten
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Tabs
              value={progressView}
              onValueChange={(value) => setProgressView(value as "my-progress" | "team-progress")}
              className="space-y-6"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 h-auto">
                <TabsTrigger value="my-progress" className="text-xs sm:text-sm px-2 py-2">
                  Mein Fortschritt
                </TabsTrigger>
                <TabsTrigger value="team-progress" className="text-xs sm:text-sm px-2 py-2">
                  <Users className="h-4 w-4 mr-2" />
                  Team Fortschritt
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-progress" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">Dein Trainingsfortschritt</CardTitle>
                        <CardDescription>
                          Übersicht über alle deine Trainingseinheiten und Verbesserungen
                        </CardDescription>
                      </div>
                      {sessions.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteAllDialogOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Alles löschen
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {trainingTypes.map((training) => {
                      const Icon = training.icon
                      const bestScore = getBestScore(training.id)
                      const avgScore = getAverageScore(training.id)
                      const sessionCount = getSessionsByType(training.id).length
                      const completionRate = getCompletionRate(training.id)

                      return (
                        <div
                          key={training.id}
                          className="border rounded-lg p-6 space-y-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg bg-${training.color}-100`}>
                                <Icon className={`h-6 w-6 text-${training.color}-600`} />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{training.name}</h3>
                                <p className="text-sm text-gray-600">{sessionCount} Sessions absolviert</p>
                              </div>
                            </div>
                            <Badge className={getDifficultyColor(training.difficulty)}>{training.difficulty}</Badge>
                          </div>

                          {sessionCount > 0 ? (
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-600">Fortschritt</span>
                                  <span className="font-bold">{completionRate}%</span>
                                </div>
                                <Progress value={completionRate} className="h-3" />
                              </div>

                              <div className="grid grid-cols-3 gap-4 pt-2">
                                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-2xl font-bold text-green-600">{bestScore}</div>
                                  <div className="text-xs text-gray-600 mt-1">Bester Score</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-2xl font-bold text-blue-600">{avgScore}</div>
                                  <div className="text-xs text-gray-600 mt-1">Durchschnitt</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="text-2xl font-bold text-orange-600">{sessionCount}</div>
                                  <div className="text-xs text-gray-600 mt-1">Sessions</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-500">
                              <Circle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">Noch keine Daten vorhanden</p>
                              <p className="text-xs text-gray-400 mt-1">Starte dein erstes Training!</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {sessions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Letzte Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {sessions
                          .slice(-10)
                          .reverse()
                          .map((session) => {
                            const training = trainingTypes.find((t) => t.id === session.type)
                            if (!training) return null
                            const Icon = training.icon

                            return (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg bg-${training.color}-100`}>
                                    <Icon className={`h-5 w-5 text-${training.color}-600`} />
                                  </div>
                                  <div>
                                    <div className="font-semibold">{training.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {new Date(session.date).toLocaleDateString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-orange-600">{session.score}</div>
                                    <div className="text-sm text-gray-500">von {session.maxScore}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSessionToDelete(session.id)
                                      setDeleteDialogOpen(true)
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="team-progress" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-6 w-6 text-orange-600" />
                      Team Fortschritt
                    </CardTitle>
                    <CardDescription>Vergleiche deine Leistung mit anderen Mitgliedern</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingTeamStats ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-6 border-2 rounded-lg bg-gray-50 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-10 h-10 rounded-full bg-gray-300" />
                              <div className="flex-1 space-y-2">
                                <div className="h-5 bg-gray-300 rounded w-1/3" />
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="p-3 bg-gray-200 rounded-lg h-20" />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : teamStats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p>Noch keine Team-Daten verfügbar</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {teamStats.map((member, index) => {
                          const memberTrainings = trainingTypes.filter((training) => {
                            const bestScore = member.best_scores[training.id] || 0
                            return bestScore > 0
                          })

                          if (memberTrainings.length === 0) return null

                          return (
                            <div
                              key={member.user_id}
                              className={`p-6 border-2 rounded-lg transition-all ${
                                member.user_id === session?.user?.id
                                  ? "border-orange-400 bg-orange-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                      index === 0
                                        ? "bg-yellow-400 text-yellow-900"
                                        : index === 1
                                          ? "bg-gray-300 text-gray-700"
                                          : index === 2
                                            ? "bg-orange-400 text-orange-900"
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                      {member.player_name}
                                      {member.user_id === session?.user?.id && (
                                        <Badge className="bg-orange-600 text-white">Du</Badge>
                                      )}
                                    </h3>
                                    <p className="text-sm text-gray-600">{member.total_sessions} Sessions absolviert</p>
                                  </div>
                                </div>
                                <Trophy className="h-8 w-8 text-orange-600" />
                              </div>

                              <div className="space-y-4">
                                {memberTrainings.map((training) => {
                                  const bestScore = member.best_scores[training.id] || 0
                                  const avgScore = member.avg_scores[training.id] || 0
                                  const totalHits = member.total_hits[training.id] || 0
                                  const totalMisses = member.total_misses[training.id] || 0
                                  const avgAccuracy = member.avg_accuracy[training.id] || 0
                                  const avgDuration = member.avg_duration[training.id] || 0

                                  return (
                                    <div key={training.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                        <training.icon className="h-4 w-4" />
                                        {training.name}
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                        <div className="text-center p-2 bg-white rounded border border-green-200">
                                          <div className="text-xs text-gray-600">Punkte</div>
                                          <div className="text-lg font-bold text-green-600">{bestScore}</div>
                                          <div className="text-xs text-gray-500">Ø {avgScore}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded border border-blue-200">
                                          <div className="text-xs text-gray-600">Treffer</div>
                                          <div className="text-lg font-bold text-blue-600">{totalHits}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded border border-red-200">
                                          <div className="text-xs text-gray-600">Fehlwürfe</div>
                                          <div className="text-lg font-bold text-red-600">{totalMisses}</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded border border-purple-200">
                                          <div className="text-xs text-gray-600">Genauigkeit</div>
                                          <div className="text-lg font-bold text-purple-600">{avgAccuracy}%</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded border border-orange-200">
                                          <div className="text-xs text-gray-600">Zeit</div>
                                          <div className="text-lg font-bold text-orange-600">
                                            {Math.floor(avgDuration / 60)}:
                                            {(avgDuration % 60).toString().padStart(2, "0")}
                                          </div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded border border-gray-200">
                                          <div className="text-xs text-gray-600">Maximum</div>
                                          <div className="text-lg font-bold text-gray-600">{training.maxScore}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-red-50">
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-orange-600" />
                  Profi-Tipps für besseres Dart
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Bewährte Methoden und Techniken von professionellen Dart-Spielern und Trainern
                </CardDescription>
              </CardHeader>
            </Card>

            {trainingTips.map((section, idx) => (
              <Card key={idx} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-orange-700">{section.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.tips.map((tip, tipIdx) => (
                      <div
                        key={tipIdx}
                        className="p-5 border-2 rounded-lg hover:border-orange-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0">{tip.icon}</div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-lg text-gray-900">{tip.title}</h4>
                            <p className="text-gray-700 leading-relaxed text-sm">{tip.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                  Empfohlene Trainingsroutinen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-5 border-l-4 border-l-green-500 bg-green-50 rounded-r-lg">
                    <h4 className="font-bold text-lg mb-2 text-green-900">Anfänger (0-3 Monate)</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">•</span>
                        <span>
                          <strong>Around the Clock</strong> - 3x pro Woche, 15 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">•</span>
                        <span>
                          <strong>Freies Training</strong> - 3x pro Woche, 10 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">•</span>
                        <span>
                          <strong>Bullseye Challenge</strong> - täglich 5 Minuten als Warm-Up
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 border-l-4 border-l-orange-500 bg-orange-50 rounded-r-lg">
                    <h4 className="font-bold text-lg mb-2 text-orange-900">Fortgeschritten (3-12 Monate)</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>
                          <strong>20-20-20 Drill</strong> - 4x pro Woche, 20 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>
                          <strong>Doubles Training</strong> - 3x pro Woche, 15 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>
                          <strong>Bob's 27</strong> - 2x pro Woche, 10 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>
                          <strong>High Score Challenge</strong> - täglich 10 Minuten
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 border-l-4 border-l-red-500 bg-red-50 rounded-r-lg">
                    <h4 className="font-bold text-lg mb-2 text-red-900">Profi (12+ Monate)</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          <strong>Treble 20 Marathon</strong> - täglich 15 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          <strong>Checkout Training</strong> - 5x pro Woche, 20 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          <strong>Triples Training</strong> - 4x pro Woche, 20 Minuten
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          <strong>Match-Simulation</strong> - 2x pro Woche, 30 Minuten
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h4 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    Pro-Tipp: Die 80/20 Regel
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    Verbringe 80% deiner Trainingszeit mit gezielten Übungen (Doubles, Triples, Checkouts) und nur 20%
                    mit Spielen. Spiele sind wichtig für die Anwendung, aber gezielte Übungen bringen die größte
                    Verbesserung!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3 text-red-700">
                  Häufige Fehler vermeiden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border-l-4 border-l-red-500 bg-white rounded-r-lg">
                    <h4 className="font-bold text-red-900 mb-1">Zu fester Griff</h4>
                    <p className="text-gray-700 text-sm">
                      Ein zu fester Griff führt zu Verkrampfung. Der Dart sollte kontrolliert aber locker gehalten
                      werden.
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-l-red-500 bg-white rounded-r-lg">
                    <h4 className="font-bold text-red-900 mb-1">Beweglicher Ellbogen</h4>
                    <p className="text-gray-700 text-sm">
                      Der Ellbogen sollte als Fixpunkt dienen. Bewegung sollte nur aus dem Unterarm und Handgelenk
                      kommen.
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-l-red-500 bg-white rounded-r-lg">
                    <h4 className="font-bold text-red-900 mb-1">Kein Follow-Through</h4>
                    <p className="text-gray-700 text-sm">
                      Stoppe nicht abrupt nach dem Release. Lass deine Hand natürlich zum Ziel zeigen.
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-l-red-500 bg-white rounded-r-lg">
                    <h4 className="font-bold text-red-900 mb-1">Unregelmäßiges Training</h4>
                    <p className="text-gray-700 text-sm">
                      Sporadisches Training bringt keine Verbesserung. Lieber kurz aber regelmäßig trainieren.
                    </p>
                  </div>
                  <div className="p-4 border-l-4 border-l-red-500 bg-white rounded-r-lg">
                    <h4 className="font-bold text-red-900 mb-1">Nur Spiele spielen</h4>
                    <p className="text-gray-700 text-sm">
                      Spiele sind wichtig, aber gezielte Übungen bringen mehr Fortschritt. Nutze die Trainingsmodi!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diese Trainings-Session wirklich löschen? Diese Aktion kann nicht rückgangig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && deleteSession(sessionToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Sessions löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du wirklich ALLE deine Trainings-Sessions löschen? Diese Aktion kann nicht rückgängig gemacht
              werden und alle deine Fortschritte gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllSessions} className="bg-red-600 hover:bg-red-700">
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

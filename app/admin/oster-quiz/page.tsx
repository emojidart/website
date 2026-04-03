"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  Trophy,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Award,
  TrendingUp,
  KeyRound,
  Search,
  RefreshCcw,
  ChevronLeft,
} from "lucide-react"

interface MissionProgressRow {
  id: number
  user_id: string
  player_id: string | number | null
  day_number: number
  code_value: string
  letter: string
  solved_at: string
}

interface MissionSubmissionRow {
  id: number
  user_id: string
  player_id: string | number | null
  solution_word: string
  is_correct: boolean
  created_at?: string | null
}

interface ClubPlayerRow {
  id: string | number
  name: string
}

interface ParticipantStats {
  user_id: string
  player_id: string | number | null
  participant_name: string
  total_answers: number
  solved_days: number[]
  collected_letters: string
  last_answered: string
  responses: MissionProgressRow[]
  final_submission: MissionSubmissionRow | null
}

const TOTAL_DAYS = 7

export default function AdminOsterMissionPage() {
  const { session, isAdmin, adminLoading } = useAuth()

  const [participants, setParticipants] = useState<ParticipantStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantStats | null>(null)
  const [sortBy, setSortBy] = useState<"progress" | "name" | "latest">("progress")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchMissionData = async () => {
    try {
      setLoading(true)

      const { data: progressRows, error: progressError } = await supabase
        .from("oster_mission_progress")
        .select("*")
        .order("solved_at", { ascending: false })

      if (progressError) throw progressError

      const { data: submissionsRows, error: submissionsError } = await supabase
        .from("oster_mission_submissions")
        .select("*")

      if (submissionsError) throw submissionsError

      const { data: clubPlayersRows, error: clubPlayersError } = await supabase
        .from("club_players")
        .select("id, name")
        .order("name", { ascending: true })

      if (clubPlayersError) throw clubPlayersError

      const playerNameMap = new Map<string, string>()
      ;((clubPlayersRows ?? []) as ClubPlayerRow[]).forEach((player) => {
        playerNameMap.set(String(player.id), player.name)
      })

      const participantMap = new Map<string, ParticipantStats>()

      ;((progressRows ?? []) as MissionProgressRow[]).forEach((response) => {
        const playerId = response.player_id ?? null
        const playerIdKey = playerId !== null ? String(playerId) : null
        const playerName =
          playerIdKey !== null
            ? playerNameMap.get(playerIdKey) ?? `Unbekannt (${playerIdKey})`
            : "Ohne Player-Zuordnung"

        if (!participantMap.has(response.user_id)) {
          participantMap.set(response.user_id, {
            user_id: response.user_id,
            player_id: playerId,
            participant_name: playerName,
            total_answers: 0,
            solved_days: [],
            collected_letters: "",
            last_answered: response.solved_at ?? "",
            responses: [],
            final_submission: null,
          })
        }

        const participantStats = participantMap.get(response.user_id)!

        participantStats.total_answers += 1
        participantStats.responses.push(response)

        if (!participantStats.solved_days.includes(response.day_number)) {
          participantStats.solved_days.push(response.day_number)
        }

        if (response.solved_at) {
          if (!participantStats.last_answered) {
            participantStats.last_answered = response.solved_at
          } else if (
            new Date(response.solved_at).getTime() > new Date(participantStats.last_answered).getTime()
          ) {
            participantStats.last_answered = response.solved_at
          }
        }

        if (!participantStats.player_id && playerId) {
          participantStats.player_id = playerId
          participantStats.participant_name = playerName
        }
      })

      ;((submissionsRows ?? []) as MissionSubmissionRow[]).forEach((submission) => {
        const existing = participantMap.get(submission.user_id)

        if (existing) {
          if (!existing.final_submission) {
            existing.final_submission = submission
          }
        } else {
          const playerId = submission.player_id ?? null
          const playerIdKey = playerId !== null ? String(playerId) : null
          const playerName =
            playerIdKey !== null
              ? playerNameMap.get(playerIdKey) ?? `Unbekannt (${playerIdKey})`
              : "Ohne Player-Zuordnung"

          participantMap.set(submission.user_id, {
            user_id: submission.user_id,
            player_id: playerId,
            participant_name: playerName,
            total_answers: 0,
            solved_days: [],
            collected_letters: "",
            last_answered: "",
            responses: [],
            final_submission: submission,
          })
        }
      })

      const participantList = Array.from(participantMap.values()).map((participant) => {
        const sortedResponses = [...participant.responses].sort((a, b) => a.day_number - b.day_number)
        const letters = sortedResponses.map((r) => (r.letter || "").trim()).join("").toUpperCase()
        const solvedDaysSorted = [...participant.solved_days].sort((a, b) => a - b)

        return {
          ...participant,
          responses: sortedResponses,
          solved_days: solvedDaysSorted,
          collected_letters: letters,
        }
      })

      setParticipants(participantList)

      setSelectedParticipant((prev) => {
        if (!participantList.length) return null
        if (!prev) return participantList[0]
        return participantList.find((p) => p.user_id === prev.user_id) ?? participantList[0]
      })
    } catch (error) {
      console.error("Error fetching Oster Mission admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && isAdmin) {
      fetchMissionData()
    }
  }, [session, isAdmin])

  const filteredAndSortedParticipants = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    const filtered = participants.filter((participant) => {
      if (!search) return true

      return (
        participant.participant_name.toLowerCase().includes(search) ||
        participant.user_id.toLowerCase().includes(search) ||
        String(participant.player_id ?? "").toLowerCase().includes(search) ||
        participant.collected_letters.toLowerCase().includes(search) ||
        participant.solved_days.join(",").includes(search) ||
        (participant.final_submission?.solution_word ?? "").toLowerCase().includes(search)
      )
    })

    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.participant_name.localeCompare(b.participant_name, "de")
      }

      if (sortBy === "latest") {
        const aDate = a.last_answered ? new Date(a.last_answered).getTime() : 0
        const bDate = b.last_answered ? new Date(b.last_answered).getTime() : 0
        return bDate - aDate
      }

      return (
        b.solved_days.length - a.solved_days.length ||
        b.total_answers - a.total_answers ||
        a.participant_name.localeCompare(b.participant_name, "de")
      )
    })
  }, [participants, sortBy, searchTerm])

  const totals = useMemo(() => {
    const totalAnswers = participants.reduce((sum, p) => sum + p.total_answers, 0)
    const totalFinalCorrect = participants.filter((p) => p.final_submission?.is_correct).length
    const averageProgress =
      participants.length > 0
        ? participants.reduce((sum, p) => sum + p.solved_days.length, 0) / participants.length
        : 0

    return {
      totalParticipants: participants.length,
      totalAnswers,
      totalFinalCorrect,
      averageProgress,
    }
  }, [participants])

  const getRankBadge = (index: number) => {
    if (index === 0) return { color: "bg-yellow-500", text: "🥇 1." }
    if (index === 1) return { color: "bg-slate-400", text: "🥈 2." }
    if (index === 2) return { color: "bg-orange-600", text: "🥉 3." }
    return { color: "bg-slate-300", text: `#${index + 1}` }
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <p className="text-sm text-slate-600">Berechtigungen werden geprüft...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="flex items-center justify-center py-20">
            <Card className="w-full max-w-md rounded-3xl border-0 shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-slate-900">Zugriff verweigert</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-6 text-slate-600">
                  Du hast keine Admin-Berechtigung für diesen Bereich.
                </p>
                <Link href="/admin">
                  <Button className="w-full rounded-2xl bg-orange-600 hover:bg-orange-700">
                    Zurück zum Admin-Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-6">
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 rounded-xl px-2 text-slate-500 hover:bg-transparent hover:text-slate-700"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <KeyRound className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Oster Mission Admin
              </h1>
              <p className="text-sm text-slate-500 md:text-base">
                Übersicht aller Eingaben, Buchstaben und Finalantworten
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 md:text-sm">Teilnehmer</p>
                  <p className="text-2xl font-black text-slate-900">{totals.totalParticipants}</p>
                </div>
                <User className="h-7 w-7 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 md:text-sm">Antworten</p>
                  <p className="text-2xl font-black text-slate-900">{totals.totalAnswers}</p>
                </div>
                <Calendar className="h-7 w-7 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 md:text-sm">Finale richtig</p>
                  <p className="text-2xl font-black text-slate-900">{totals.totalFinalCorrect}</p>
                </div>
                <Trophy className="h-7 w-7 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 md:text-sm">Ø gelöste Tage</p>
                  <p className="text-2xl font-black text-slate-900">
                    {totals.averageProgress.toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="h-7 w-7 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-5 rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nach Name, User-ID, Player-ID oder Lösungswort suchen..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-orange-500"
                />
              </div>

              <Button
                variant={sortBy === "progress" ? "default" : "outline"}
                onClick={() => setSortBy("progress")}
                className={`rounded-xl ${
                  sortBy === "progress" ? "bg-orange-600 hover:bg-orange-700" : ""
                }`}
              >
                Fortschritt
              </Button>

              <Button
                variant={sortBy === "name" ? "default" : "outline"}
                onClick={() => setSortBy("name")}
                className={`rounded-xl ${sortBy === "name" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              >
                Name
              </Button>

              <Button
                variant={sortBy === "latest" ? "default" : "outline"}
                onClick={() => setSortBy("latest")}
                className={`rounded-xl ${sortBy === "latest" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              >
                Letzte Aktivität
              </Button>

              <Button variant="outline" onClick={fetchMissionData} className="rounded-xl">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Neu laden
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <p className="text-sm text-slate-600">Daten werden geladen...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-black text-slate-900">
                    Teilnehmerübersicht
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {filteredAndSortedParticipants.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
                      Keine Daten gefunden.
                    </div>
                  ) : (
                    filteredAndSortedParticipants.map((participant, index) => {
                      const rank = getRankBadge(index)
                      const progressPercent = Math.round(
                        (participant.solved_days.length / TOTAL_DAYS) * 100
                      )

                      return (
                        <button
                          key={participant.user_id}
                          type="button"
                          onClick={() => setSelectedParticipant(participant)}
                          className={`w-full rounded-3xl border p-5 text-left transition ${
                            selectedParticipant?.user_id === participant.user_id
                              ? "border-orange-400 bg-orange-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center gap-2">
                                <Badge className={`${rank.color} rounded-full text-white`}>
                                  {rank.text}
                                </Badge>

                                {participant.final_submission?.is_correct && (
                                  <Badge className="rounded-full bg-green-600 text-white">
                                    Finale richtig
                                  </Badge>
                                )}
                              </div>

                              <p className="truncate text-xl font-black text-slate-900">
                                {participant.participant_name}
                              </p>

                              <p className="mt-2 break-all text-xs text-slate-500">
                                User-ID: {participant.user_id}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Player-ID: {participant.player_id ?? "—"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-3xl font-black text-orange-600">
                                {participant.solved_days.length}/{TOTAL_DAYS}
                              </p>
                              <p className="text-xs text-slate-500">gelöst</p>
                            </div>
                          </div>

                          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {participant.solved_days.length > 0 ? (
                              participant.solved_days.map((day) => (
                                <Badge
                                  key={day}
                                  variant="outline"
                                  className="rounded-full border-slate-300 bg-white px-3 py-1 text-slate-700"
                                >
                                  Tag {day}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">Noch keine Eingaben</span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="xl:col-span-3">
              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-black text-slate-900">
                    Detailansicht
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 md:p-6">
                  {!selectedParticipant ? (
                    <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Wähle links einen Teilnehmer aus.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900">
                            {selectedParticipant.participant_name}
                          </h2>
                          <p className="mt-2 text-sm text-slate-500">
                            Player-ID: {selectedParticipant.player_id ?? "—"}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-400">
                            User-ID: {selectedParticipant.user_id}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-orange-50 px-5 py-4 text-center">
                          <p className="text-xs uppercase tracking-wide text-orange-700">
                            Fortschritt
                          </p>
                          <p className="mt-1 text-4xl font-black text-orange-600">
                            {selectedParticipant.solved_days.length}/{TOTAL_DAYS}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Gelöste Tage</p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {selectedParticipant.solved_days.length}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Antworten gesamt</p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {selectedParticipant.total_answers}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Letzte Aktivität</p>
                          <p className="mt-2 text-sm font-bold text-slate-900">
                            {selectedParticipant.last_answered
                              ? new Date(selectedParticipant.last_answered).toLocaleString("de-AT")
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                          Gesammelte Buchstaben
                        </p>
                        <p className="mt-3 break-all text-5xl font-black tracking-[0.2em] text-orange-600">
                          {selectedParticipant.collected_letters || "—"}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <h3 className="text-xl font-black text-slate-900">Finaleingabe</h3>

                          {selectedParticipant.final_submission ? (
                            selectedParticipant.final_submission.is_correct ? (
                              <Badge className="w-fit rounded-full bg-green-600 px-3 py-1 text-white">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Richtig
                              </Badge>
                            ) : (
                              <Badge className="w-fit rounded-full bg-red-600 px-3 py-1 text-white">
                                <XCircle className="mr-1 h-3 w-3" />
                                Falsch
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="w-fit rounded-full">
                              Keine Finaleingabe
                            </Badge>
                          )}
                        </div>

                        {selectedParticipant.final_submission ? (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">
                              <span className="font-bold text-slate-900">Lösungswort:</span>{" "}
                              {selectedParticipant.final_submission.solution_word || "—"}
                            </p>
                            <p className="text-sm text-slate-600">
                              <span className="font-bold text-slate-900">Zeit:</span>{" "}
                              {selectedParticipant.final_submission.created_at
                                ? new Date(
                                    selectedParticipant.final_submission.created_at
                                  ).toLocaleString("de-AT")
                                : "Kein Zeitstempel"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Noch keine Finalantwort vorhanden.</p>
                        )}
                      </div>

                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">Eingegebene Antworten</h3>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            {selectedParticipant.responses.length} Einträge
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {selectedParticipant.responses.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                              Keine Antworten vorhanden.
                            </div>
                          ) : (
                            selectedParticipant.responses.map((response) => (
                              <div
                                key={response.id}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-sm font-black text-white">
                                    {response.day_number}
                                  </div>

                                  <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <Badge className="rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">
                                        Tag {response.day_number}
                                      </Badge>
                                      <Badge variant="outline" className="rounded-full">
                                        Buchstabe: {response.letter || "—"}
                                      </Badge>
                                    </div>

                                    <p className="text-sm text-slate-700">
                                      <span className="font-semibold text-slate-900">Code:</span>{" "}
                                      {response.code_value || "—"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {response.solved_at
                                        ? new Date(response.solved_at).toLocaleString("de-AT")
                                        : "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-2xl font-black text-green-600">
                                    {response.letter || "—"}
                                  </p>
                                  <p className="text-xs text-slate-400">Buchstabe</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
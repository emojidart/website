"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { KeyRound, Lock, Search, Timer, Trophy } from "lucide-react"

type MissionProgressRow = {
  id: number
  user_id: string
  day_number: number
  code_value: string
  letter: string
  solved_at: string
}

type MissionSubmissionRow = {
  id: number
  user_id: string
  solution_word: string
  is_correct: boolean
  submitted_at: string
}

const SOLUTION_LENGTH = 9
const FINAL_WORD = "BULLSEYES"

const HINTS: Record<number, { label: string; text: string }> = {
  1: {
    label: "Erster Hinweis",
    text: `Finde heraus, ob du wirklich aufmerksam liest.
Achte nicht nur auf den Inhalt, sondern auf den Anfang.
Quellen können Hinweise enthalten.

Nicht jeder findet sofort die Lösung.
Doch wer nach HINWEIS fragt, wird Sie entdecken.`,
  },
  2: {
    label: "Zweiter Hinweis",
    text: `Manchmal sprechen Zahlen eine eigene Sprache.

1 – 19 – 16 – 9 – 14 – 1 – 12 – 12

Der Schlüssel liegt nicht auf dem Dartboard,
sondern im Alphabet.`,
  },
  3: {
    label: "Dritter Hinweis",
    text: `Manche Hinweise zeigen nicht auf ein Wort,
sondern auf einen Ort. Wer sie entschlüsselt, kennt noch nicht die Antwort,
aber er weiß, wo sie zu finden ist.

....- --... .-.-.- ---.. .---- .---- .---- --..--
.---- ...-- .-.-.- ----- -.... ---.. .....

Kleiner Hinweis: Es ergeben sich Koordinaten.
Gesucht wird ein Wort mit 4 Buchstaben.`,
  },
}

const RELEASE_DATES = [
  "2026-03-28T08:00:00+01:00",
  "2026-03-29T08:00:00+02:00",
  "2026-03-30T08:00:00+02:00",
  "2026-03-31T08:00:00+02:00",
  "2026-04-01T08:00:00+02:00",
  "2026-04-02T08:00:00+02:00",
  "2026-04-03T08:00:00+02:00",
  "2026-04-04T08:00:00+02:00",
  "2026-04-05T08:00:00+02:00",
]

export default function OsterMissionPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<number | string | null>(null)
  const [loading, setLoading] = useState(true)
  const [codeInput, setCodeInput] = useState("")
  const [finalInput, setFinalInput] = useState("")
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState<MissionProgressRow[]>([])
  const [hasCorrectFinalSubmission, setHasCorrectFinalSubmission] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const letterSlots = useMemo(() => {
    const slots = Array(SOLUTION_LENGTH).fill("_")
    for (const row of progress) {
      if (row.day_number >= 1 && row.day_number <= SOLUTION_LENGTH) {
        slots[row.day_number - 1] = row.letter
      }
    }
    return slots
  }, [progress])

  const progressPercent = useMemo(() => {
    return Math.round((progress.length / SOLUTION_LENGTH) * 100)
  }, [progress.length])

  const nextRelease = useMemo(() => {
    return RELEASE_DATES.map((date) => new Date(date)).find((date) => date.getTime() > now.getTime()) ?? null
  }, [now])

  const countdownText = useMemo(() => {
    if (!nextRelease) return "Alle Rätseltage sind freigeschaltet."

    const diff = nextRelease.getTime() - now.getTime()
    if (diff <= 0) return "Das nächste Rätsel ist jetzt verfügbar."

    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts = []
    if (days > 0) parts.push(`${days}d`)
    parts.push(`${hours}h`)
    parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)

    return parts.join(" ")
  }, [nextRelease, now])

  const currentDay = useMemo(() => {
    return Math.min(progress.length + 1, SOLUTION_LENGTH)
  }, [progress.length])

  const activeHint = useMemo(() => {
    return (
      HINTS[currentDay] ?? {
        label: `Tag ${currentDay}`,
        text: "Das nächste Rätsel wird bald freigeschaltet.",
      }
    )
  }, [currentDay])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const authUserId = data.session?.user?.id ?? null

      if (!authUserId) {
        setLoading(false)
        return
      }

      setUserId(authUserId)

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", authUserId)
        .maybeSingle()

      setPlayerId((profileData as any)?.player_id ?? null)

      await Promise.all([loadProgress(authUserId), loadFinalSubmission(authUserId)])
      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUserId = session?.user?.id ?? null
      setUserId(authUserId)

      if (!authUserId) {
        setPlayerId(null)
        setProgress([])
        setHasCorrectFinalSubmission(false)
        setLoading(false)
        return
      }

      setLoading(true)
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", authUserId)
        .maybeSingle()

      setPlayerId((profileData as any)?.player_id ?? null)
      await Promise.all([loadProgress(authUserId), loadFinalSubmission(authUserId)])
      setLoading(false)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const loadProgress = async (uid: string) => {
    const { data, error } = await supabase
      .from("oster_mission_progress")
      .select("*")
      .eq("user_id", uid)
      .order("day_number", { ascending: true })

    if (!error && data) setProgress(data)
  }

  const loadFinalSubmission = async (uid: string) => {
    const { data, error } = await supabase
      .from("oster_mission_submissions")
      .select("*")
      .eq("user_id", uid)
      .eq("is_correct", true)
      .limit(1)

    if (!error && data && data.length > 0) setHasCorrectFinalSubmission(true)
  }

  const normalize = (value: string) => value.trim().toUpperCase()

  const handleCodeSubmit = async () => {
    if (!userId) {
      setMessage("Bitte zuerst einloggen.")
      return
    }

    const normalizedCode = normalize(codeInput)
    if (!normalizedCode) return

    const { data: codeRow, error: codeError } = await supabase
      .from("oster_mission_codes")
      .select("*")
      .eq("code_value", normalizedCode)
      .maybeSingle()

    if (codeError || !codeRow) {
      setMessage("Dieser Code ist leider nicht korrekt.")
      return
    }

    const { data: existing } = await supabase
      .from("oster_mission_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("day_number", codeRow.day_number)
      .maybeSingle()

    if (existing) {
      setMessage(`Tag ${codeRow.day_number} wurde bereits gelöst.`)
      setCodeInput("")
      return
    }

    const { error: insertError } = await supabase.from("oster_mission_progress").insert({
      user_id: userId,
      player_id: playerId,
      day_number: codeRow.day_number,
      code_value: codeRow.code_value,
      letter: codeRow.letter,
    })

    if (insertError) {
      setMessage("Der Code war richtig, konnte aber nicht gespeichert werden.")
      return
    }

    await loadProgress(userId)
    setCodeInput("")
    setMessage(`Richtig! Dein Buchstabe für Tag ${codeRow.day_number}: ${codeRow.letter}`)
  }

  const handleFinalSubmit = async () => {
    if (!userId) {
      setMessage("Bitte zuerst einloggen.")
      return
    }

    if (progress.length < SOLUTION_LENGTH) {
      setMessage("Du brauchst erst alle Buchstaben.")
      return
    }

    const normalizedWord = normalize(finalInput)
    const isCorrect = normalizedWord === FINAL_WORD

    const { error } = await supabase.from("oster_mission_submissions").insert({
      user_id: userId,
      player_id: playerId,
      solution_word: normalizedWord,
      is_correct: isCorrect,
    })

    if (error) {
      setMessage("Deine Lösung konnte nicht gespeichert werden.")
      return
    }

    if (isCorrect) {
      setHasCorrectFinalSubmission(true)
      setMessage("Glückwunsch! Du hast das Rätsel gelöst. Unter allen richtigen Lösungen wird ein Gewinner gezogen.")
    } else {
      setMessage("Das Lösungswort ist leider noch nicht richtig.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white p-6 sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border border-white/15">
                <Search className="h-3.5 w-3.5" />
                Oster Mission
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-[0.95]">Der versteckte Code</h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base text-orange-50/95 leading-relaxed">
                Gib hier deine gefundenen Codes ein, sammle Buchstaben und knackle am Ende das Lösungswort.
              </p>
            </div>
          </section>

          {!loading && !userId && (
            <Card className="mt-5 rounded-2xl border border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-5">
                <p className="font-black text-red-800">Bitte zuerst einloggen.</p>
                <p className="mt-1 text-sm text-red-700">Die Mission ist nur für eingeloggte Benutzer verfügbar.</p>
              </CardContent>
            </Card>
          )}

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">Code eingeben</h2>
                    <p className="text-sm text-gray-600">Jeder richtige Code schaltet einen Buchstaben frei.</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="z. B. EI-01-SCHATTEN"
                    className="h-12 rounded-2xl"
                    disabled={!userId}
                  />
                  <Button onClick={handleCodeSubmit} className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 font-black" disabled={!userId}>
                    Prüfen
                  </Button>
                </div>

                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-orange-700">{activeHint.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-900 whitespace-pre-line">
                    {activeHint.text}
                  </p>
                </div>

                {message && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-800">
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Deine Buchstaben</h2>
                      <p className="text-sm text-gray-600">28.03 bis 05.04 · 9 Buchstaben</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 sm:grid-cols-9 gap-2">
                    {letterSlots.map((letter, index) => (
                      <div key={index} className="h-12 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center text-lg font-black">
                        {letter}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Fortschritt & Countdown</h2>
                      <p className="text-sm text-gray-600">Bleib täglich dran und verpasse keinen Hinweis.</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                      <span>Fortschritt</span>
                      <span>{progress.length} / {SOLUTION_LENGTH} gelöst · {progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-orange-700">Nächstes Rätsel</p>
                    <p className="mt-2 text-2xl font-black text-gray-900">{countdownText}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {nextRelease
                        ? `Freischaltung am ${nextRelease.toLocaleString("de-AT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "Das Finale ist jetzt komplett spielbar."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Lösungswort</h2>
                      <p className="text-sm text-gray-600">Groß- oder Kleinschreibung ist egal.</p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Input
                      value={finalInput}
                      onChange={(e) => setFinalInput(e.target.value)}
                      placeholder="Lösungswort eingeben"
                      className="h-12 rounded-2xl"
                      disabled={!userId || hasCorrectFinalSubmission}
                    />
                    <Button onClick={handleFinalSubmit} className="h-12 rounded-2xl bg-gray-900 hover:bg-black font-black" disabled={!userId || hasCorrectFinalSubmission}>
                      Absenden
                    </Button>
                  </div>

                  {hasCorrectFinalSubmission && (
                    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                      Glückwunsch! Du hast das Rätsel gelöst. Unter allen richtigen Lösungen wird ein Gewinner gezogen.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
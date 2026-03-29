"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Info,
  KeyRound,
  Lock,
  Search,
  Timer,
  Trophy,
} from "lucide-react"

type MissionProgressRow = {
  id: number
  user_id: string
  day_number: number
  code_value: string
  letter: string
  solved_at: string
}

type SecretProgressRow = {
  user_id: string
  player_id: number | string | null
  secret_193_unlocked: boolean
  secret_058_unlocked: boolean
  secret_193_unlocked_at: string | null
  secret_058_unlocked_at: string | null
  created_at?: string
  updated_at?: string
}

type MessageType = "success" | "error" | "info"

const TOTAL_DAYS = 7
const FINAL_WORD = "TURNIER"
const LETTER_SLOT_COUNT = FINAL_WORD.length

const SECRET_TRIGGER_CODE = "193"
const SECRET_SECOND_CODE = "058"

const HINTS: Record<number, { label: string; text: string; link?: string; linkLabel?: string }> = {
  1: {
  label: "Erster Hinweis",
  text: (
    <>
      <strong>F</strong>inde heraus, ob du wirklich aufmerksam liest.{"\n"}
      <strong>A</strong>chte nicht nur auf den Inhalt, sondern auf den Anfang.{"\n"}
      <strong>Q</strong>uellen können Hinweise enthalten.{"\n\n"}
      Nicht jeder findet sofort die Lösung.{"\n"}
      Doch wer nach HINWEIS fragt, wird sie entdecken.
    </>
  ),
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
  4: {
    label: "Vierter Hinweis",
    text: `Die Spur führt zu einem Turnier im Januar.

An diesem Tag trat genau ein Spieler mit Bonuspunkten auf.

Finde dieses Turnier.

Nimm die Gesamtpunkte des Siegers
und ziehe die Punkte des Zweitplatzierten ab.

Das Ergebnis ist dein Code.`,
  },
  5: {
    label: "Fünfter Hinweis",
    text: `Die Spur führt in die Herbstsaison 2025.

In den Statistiken versteckt sich ein besonderer Spieler.

Nur eine Person hat dort 21× die 17 getroffen.

Finde diesen Spieler.

Hinweis: Der vollständige Name ist der Code.`,
  },
  6: {
    label: "Sechster Hinweis",
    text: `Die Spur führt zu einem Sieger.

Finde heraus,
wer das UK Open im Jahr 2019 gewonnen hat.

Suche anschließend sein Einlauflied auf Youtube
Official Music Video.

Gehe zu Minute 2:33.

Dort wird ein Wort gesungen.

Dieses Wort ist dein Code.`,
  },
7: {
  label: "Siebter Hinweis",
  text: `Die letzte Spur liegt außerhalb dieser Seite.

Du bekommst dort das Geld von Bill Gates.

Kaufe genau:

• Zeit am Handgelenk ×2
• Geschwindigkeit aus Italien ×1
• Fast Food ×4
• Ein Jahr Unterhaltung ×1
• Ein Gerät für die Hosentasche ×1

Nimm von der verbleibenden Gesamtsumme die letzten drei Ziffern.

Diese Zahl ist dein Code.`,
  link: "https://neal.fun/spend/",
  linkLabel: "Seite öffnen",
},
  8: {
    label: "Siebter Hinweis",
    text: `Das Finale wartet schon.
Nicht jede Antwort öffnet sofort die letzte Tür.`,
  },
}

const RELEASE_DATES = [
  "2026-03-30T00:01:00+02:00",
  "2026-03-31T08:00:00+02:00",
  "2026-04-01T08:00:00+02:00",
  "2026-04-02T08:00:00+02:00",
  "2026-04-03T08:00:00+02:00",
  "2026-04-04T08:00:00+02:00",
  "2026-04-05T08:00:00+02:00",
]


const withTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Timeout"))
    }, ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId!)
  }
}







export default function OsterMissionPage() {
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<number | string | null>(null)
  const [loading, setLoading] = useState(true)

  const [codeInput, setCodeInput] = useState("")
  const [finalInput, setFinalInput] = useState("")
  const [secretInput, setSecretInput] = useState("")

  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<MessageType>("info")

  const [progress, setProgress] = useState<MissionProgressRow[]>([])
  const [hasCorrectFinalSubmission, setHasCorrectFinalSubmission] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  const [submittingCode, setSubmittingCode] = useState(false)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [submittingSecret, setSubmittingSecret] = useState(false)

  const [showSecretPopup193, setShowSecretPopup193] = useState(false)
  const [showSecretPopup058, setShowSecretPopup058] = useState(false)
  const [secret193Unlocked, setSecret193Unlocked] = useState(false)
  const [secret058Unlocked, setSecret058Unlocked] = useState(false)

  const messageRef = useRef<HTMLDivElement | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const secretInputRef = useRef<HTMLInputElement | null>(null)
  const finalInputRef = useRef<HTMLInputElement | null>(null)

  const setFeedback = (text: string, type: MessageType) => {
    setMessage(text)
    setMessageType(type)

    requestAnimationFrame(() => {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    })
  }

  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toUpperCase()

  const focusCodeInput = () => {
    requestAnimationFrame(() => codeInputRef.current?.focus())
  }

  const focusSecretInput = () => {
    requestAnimationFrame(() => secretInputRef.current?.focus())
  }

  const focusFinalInput = () => {
    requestAnimationFrame(() => finalInputRef.current?.focus())
  }

  const collectedLetters = useMemo(() => {
    return progress
      .sort((a, b) => a.day_number - b.day_number)
      .map((row) => (row.letter ?? "").toString())
      .join("")
      .toUpperCase()
  }, [progress])

  const letterSlots = useMemo(() => {
    const chars = collectedLetters.slice(0, LETTER_SLOT_COUNT).split("")
    const slots = Array(LETTER_SLOT_COUNT).fill("_")

    chars.forEach((char, index) => {
      slots[index] = char
    })

    return slots
  }, [collectedLetters])

  const progressPercent = useMemo(() => {
    return Math.round((progress.length / TOTAL_DAYS) * 100)
  }, [progress.length])

  const hasAllCodesCollected = useMemo(() => {
    return progress.length >= TOTAL_DAYS
  }, [progress.length])

  const isCodeInputLocked = !userId || submittingCode || hasAllCodesCollected
  const isFinalInputLocked =
    !userId || hasCorrectFinalSubmission || submittingFinal

  const nextRelease = useMemo(() => {
    if (!mounted || !now) return null
    return (
      RELEASE_DATES.map((date) => new Date(date)).find(
        (date) => date.getTime() > now.getTime()
      ) ?? null
    )
  }, [mounted, now])

  const countdownText = useMemo(() => {
    if (!mounted || !now) return "Wird geladen..."
    if (!nextRelease) return "Alle Rätseltage sind freigeschaltet."

    const diff = nextRelease.getTime() - now.getTime()
    if (diff <= 0) return "Das nächste Rätsel ist jetzt verfügbar."

    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    parts.push(`${hours}h`)
    parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)

    return parts.join(" ")
  }, [mounted, nextRelease, now])
const availableDay = useMemo(() => {
  if (!mounted || !now) return 0

  const unlockedCount = RELEASE_DATES.filter((date) => {
    return new Date(date).getTime() <= now.getTime()
  }).length

  return Math.min(unlockedCount, TOTAL_DAYS)
}, [mounted, now])

const nextReleaseLabel = useMemo(() => {
  if (!mounted || !now) return "Freischaltung wird geladen..."
  if (!nextRelease) return "Das Finale ist jetzt komplett spielbar."

  return `Freischaltung am ${nextRelease.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`
}, [mounted, nextRelease, now])


const currentDay = useMemo(() => {
  if (availableDay <= 0) return 1
  return Math.min(progress.length + 1, availableDay, TOTAL_DAYS)
}, [availableDay, progress.length])

const activeHint = useMemo(() => {
  if (hasCorrectFinalSubmission) {
    return null
  }
  if (availableDay <= 0) {
  return {
    label: "Noch gesperrt",
    text: "Das Rätsel wird erst um 08:00 Uhr freigeschaltet.",
  }
}

  if (hasAllCodesCollected) {
    return {
      label: "Alle Hinweise abgeschlossen",
      text: "Du hast alle 7 Buchstaben gesammelt.",
    }
  }

  if (secret058Unlocked) {
    return {
      label: "Finale freigeschaltet",
      text: "Du hast den geheimen Pfad abgeschlossen.",
    }
  }

  if (secret193Unlocked && !secret058Unlocked) {
    return {
      label: "Geheimer Pfad aktiv",
      text: "Du hast den versteckten Weg gefunden. Folge jetzt dieser Spur...",
    }
  }

  // 👉 wenn nächster Tag noch nicht freigeschaltet → NICHTS anzeigen
if (progress.length >= availableDay) {
  return null
}

// 👉 sonst normalen Hinweis anzeigen
const nextDay = progress.length + 1

return (
  HINTS[nextDay] ?? {
    label: `Tag ${nextDay}`,
    text: "Das nächste Rätsel wird bald freigeschaltet.",
  }
)
}, [
  availableDay,
  currentDay,
  hasAllCodesCollected,
  hasCorrectFinalSubmission,
  secret058Unlocked,
  secret193Unlocked,
])

  useEffect(() => {
    setMounted(true)
    setNow(new Date())

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

      await Promise.all([
        loadProgress(authUserId),
        loadFinalSubmission(authUserId),
        loadSecretProgress(authUserId),
      ])

      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUserId = session?.user?.id ?? null
        setUserId(authUserId)

        if (!authUserId) {
          setPlayerId(null)
          setProgress([])
          setHasCorrectFinalSubmission(false)
          setSecret193Unlocked(false)
          setSecret058Unlocked(false)
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

        await Promise.all([
          loadProgress(authUserId),
          loadFinalSubmission(authUserId),
          loadSecretProgress(authUserId),
        ])

        setLoading(false)
      }
    )

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

    if (error) {
      console.error("loadProgress error:", error)
      setProgress([])
      return
    }

    setProgress((data ?? []) as MissionProgressRow[])
  }

  const loadFinalSubmission = async (uid: string) => {
    const { data, error } = await supabase
      .from("oster_mission_submissions")
      .select("id")
      .eq("user_id", uid)
      .eq("is_correct", true)
      .limit(1)

    if (error) {
      console.error("loadFinalSubmission error:", error)
      setHasCorrectFinalSubmission(false)
      return
    }

    setHasCorrectFinalSubmission(Boolean(data && data.length > 0))
  }

  const loadSecretProgress = async (uid: string) => {
    const { data, error } = await supabase
      .from("oster_mission_secret_progress")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle()

    if (error) {
      console.error("loadSecretProgress error:", error)
      setSecret193Unlocked(false)
      setSecret058Unlocked(false)
      return
    }

    const row = data as SecretProgressRow | null

    setSecret193Unlocked(Boolean(row?.secret_193_unlocked))
    setSecret058Unlocked(Boolean(row?.secret_058_unlocked))
  }
  
  
  const refreshMissionState = async (uid?: string | null) => {
  const activeUserId = uid ?? userId

  if (!activeUserId) return

  try {
    await Promise.all([
      loadProgress(activeUserId),
      loadFinalSubmission(activeUserId),
      loadSecretProgress(activeUserId),
    ])
    setNow(new Date())
  } catch (err) {
    console.error("refreshMissionState error:", err)
  }
}
  
  
  
  

const handleCodeSubmit = async () => {
  if (submittingCode) return

  if (!userId) {
    setFeedback("Bitte zuerst einloggen.", "error")
    return
  }

  if (hasAllCodesCollected) {
    setFeedback(
      "Du hast bereits alle 7 Codes eingegeben. Die Code-Eingabe ist abgeschlossen.",
      "info"
    )
    return
  }

  const normalizedCode = normalize(codeInput)

  if (!normalizedCode) {
    setFeedback("Bitte gib zuerst einen Code ein.", "error")
    focusCodeInput()
    return
  }

  setSubmittingCode(true)

  try {
   if (normalizedCode === "4") {
  setCodeInput("")
  setMessage("🔍 Geheimer Pfad entdeckt...")

  // 👉 Weiterleitung zu Protokoll IV
  window.location.href = "/mission/protokoll-vier"

  return
}

    if (normalizedCode === SECRET_TRIGGER_CODE) {
      const { error } = await supabase
        .from("oster_mission_secret_progress")
        .upsert(
          {
            user_id: userId,
            secret_193_unlocked: true,
            secret_193_unlocked_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (error) {
        console.error("secret 193 save error:", error)
        setFeedback(
          "Der geheime Fortschritt konnte nicht gespeichert werden.",
          "error"
        )
        focusCodeInput()
        return
      }

      setCodeInput("")
      setMessage("")
      setSecret193Unlocked(true)
      setShowSecretPopup193(true)
      focusSecretInput()
      return
    }

   const { data: codeRow, error: codeError } = await withTimeout(
  supabase
    .from("oster_mission_codes")
    .select("*")
    .eq("code_value", normalizedCode)
    .maybeSingle(),
  10000
)

    if (codeError || !codeRow) {
      setFeedback("Dieser Code ist leider nicht korrekt.", "error")
      focusCodeInput()
      return
    }

   const { data: existing } = await withTimeout(
  supabase
    .from("oster_mission_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("day_number", codeRow.day_number)
    .maybeSingle(),
  10000
)

    if (existing) {
      setCodeInput("")
      setFeedback(`Tag ${codeRow.day_number} wurde bereits gelöst.`, "info")
      focusCodeInput()
      return
    }

    const { error: insertError } = await withTimeout(
  supabase
    .from("oster_mission_progress")
    .insert({
      user_id: userId,
      player_id: playerId,
      day_number: codeRow.day_number,
      code_value: codeRow.code_value,
      letter: codeRow.letter,
    }),
  10000
)

    if (insertError) {
      console.error("insert progress error:", insertError)
      setFeedback(
        "Der Code war richtig, konnte aber nicht gespeichert werden.",
        "error"
      )
      focusCodeInput()
      return
    }

  await withTimeout(
  Promise.all([
    loadProgress(userId),
    loadFinalSubmission(userId),
    loadSecretProgress(userId),
  ]),
  10000
)

    setCodeInput("")
    setFeedback(
      `Richtig! Für Tag ${codeRow.day_number} wurde ${codeRow.letter} freigeschaltet.`,
      "success"
    )
    focusCodeInput()
  } catch (err) {
  console.error("handleCodeSubmit crashed:", err)

  const isTimeout =
    err instanceof Error && err.message === "Timeout"

  setFeedback(
    isTimeout
      ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
      : "Beim Prüfen ist ein Fehler aufgetreten. Bitte versuche es erneut.",
    "error"
  )
} finally {
    setSubmittingCode(false)
  }
}
  
  
  
  
  
  
  

  const handleSecretSubmit = async () => {
    if (submittingSecret) return

    if (!userId) {
      setFeedback("Bitte zuerst einloggen.", "error")
      return
    }

    const normalizedSecret = normalize(secretInput)

    if (!normalizedSecret) {
      setFeedback("Bitte gib zuerst den geheimen Code ein.", "error")
      focusSecretInput()
      return
    }

    setSubmittingSecret(true)

    try {
      if (normalizedSecret !== SECRET_SECOND_CODE) {
        setFeedback(
          "Das ist noch nicht der richtige versteckte Code.",
          "error"
        )
        focusSecretInput()
        return
      }

     const { error } = await supabase
  .from("oster_mission_secret_progress")
  .upsert(
    {
      user_id: userId,
      secret_193_unlocked: true,
      secret_058_unlocked: true,
      secret_058_unlocked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

      if (error) {
        console.error("secret 058 save error:", error)
        setFeedback(
          "Der finale Geheimstatus konnte nicht gespeichert werden.",
          "error"
        )
        return
      }

      setSecretInput("")
      setSecret193Unlocked(true)
      setSecret058Unlocked(true)
      setShowSecretPopup058(true)
      setFeedback("Geheimer Pfad erkannt.", "success")
    } finally {
      setSubmittingSecret(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (submittingFinal) return

    if (!userId) {
      setFeedback("Bitte zuerst einloggen.", "error")
      return
    }

    if (hasCorrectFinalSubmission) {
      setFeedback(
        "Du hast bereits eine richtige Lösung eingereicht. Weitere Einsendungen sind gesperrt.",
        "info"
      )
      return
    }

    if (progress.length < TOTAL_DAYS) {
      setFeedback("Du musst zuerst alle 7 Tage lösen.", "error")
      focusFinalInput()
      return
    }

    const normalizedWord = normalize(finalInput)

    if (!normalizedWord) {
      setFeedback("Bitte gib zuerst ein Lösungswort ein.", "error")
      focusFinalInput()
      return
    }

    setSubmittingFinal(true)

    try {
      const isCorrect = normalizedWord === FINAL_WORD

      const { error } = await supabase
        .from("oster_mission_submissions")
        .insert({
          user_id: userId,
          player_id: playerId,
          solution_word: normalizedWord,
          is_correct: isCorrect,
        })

      if (error) {
        console.error("final submission error:", error)
        setFeedback("Deine Lösung konnte nicht gespeichert werden.", "error")
        focusFinalInput()
        return
      }

      if (isCorrect) {
        setHasCorrectFinalSubmission(true)
        setFinalInput("")
        setFeedback(
          "Glückwunsch! Du hast das Rätsel gelöst. Unter allen richtigen Lösungen wird ein Gewinner gezogen.",
          "success"
        )
        return
      }

      setFeedback("Das Lösungswort ist leider noch nicht richtig.", "error")
      focusFinalInput()
    } finally {
      setSubmittingFinal(false)
    }
  }

  const messageStyles =
    messageType === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800"

  const MessageIcon =
    messageType === "success"
      ? CheckCircle2
      : messageType === "error"
        ? AlertCircle
        : Info

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 pb-20 text-gray-900">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-6 text-white sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider">
                <Search className="h-3.5 w-3.5" />
                Oster Mission
              </div>
              <h1 className="mt-4 text-3xl font-black leading-[0.95] sm:text-4xl lg:text-5xl">
                Der versteckte Code
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-orange-50/95 sm:text-base">
                Gib hier deine gefundenen Codes ein, sammle Buchstaben und
                knackle am Ende das Lösungswort.
              </p>
            </div>
          </section>

          {!loading && !userId && (
            <Card className="mt-5 rounded-2xl border border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-5">
                <p className="font-black text-red-800">
                  Bitte zuerst einloggen.
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Die Mission ist nur für eingeloggte Benutzer verfügbar.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
                    <KeyRound className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">Code eingeben</h2>
                    <p className="text-sm text-gray-600">
                      Jeder richtige Code schaltet einen Buchstaben frei.
                    </p>
                  </div>
                </div>

                <form
                  className="mt-5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleCodeSubmit()
                  }}
                >
                  <Input
                    ref={codeInputRef}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder={
                      hasAllCodesCollected
                        ? "Alle 7 Codes wurden bereits eingegeben"
                        : "Code eingeben"
                    }
                    className="h-12 rounded-2xl"
                    disabled={isCodeInputLocked}
                  />
                  <Button
                    type="submit"
                    className="h-12 rounded-2xl bg-orange-600 font-black hover:bg-orange-700"
                    disabled={isCodeInputLocked}
                  >
                    {submittingCode
                      ? "Prüft..."
                      : hasAllCodesCollected
                        ? "Abgeschlossen"
                        : "Prüfen"}
                  </Button>
                </form>

                {hasAllCodesCollected && (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                    Alle 7 Codes wurden gespeichert. Die Code-Eingabe ist jetzt
                    gesperrt.
                  </div>
                )}

              <AnimatePresence>
  {!hasAllCodesCollected && secret193Unlocked && !secret058Unlocked && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                        Versteckter Pfad aktiv
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        Du hast die erste Tür geöffnet. Wenn du den nächsten
                        geheimen Code findest, gib ihn hier ein.
                      </p>

                      <form
                        className="mt-4 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSecretSubmit()
                        }}
                      >
                        <Input
                          ref={secretInputRef}
                          value={secretInput}
                          onChange={(e) => setSecretInput(e.target.value)}
                          placeholder="Geheimer Code"
                          className="h-12 rounded-2xl border-zinc-700 bg-black text-white placeholder:text-zinc-500"
                          disabled={submittingSecret}
                        />
                        <Button
                          type="submit"
                          className="h-12 rounded-2xl bg-zinc-100 font-black text-zinc-900 hover:bg-white"
                          disabled={submittingSecret}
                        >
                          {submittingSecret ? "Prüft..." : "Öffnen"}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
				
				
{secret058Unlocked && !hasAllCodesCollected && !hasCorrectFinalSubmission && (
  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
    <p className="text-[11px] font-black uppercase tracking-wider text-green-700">
      Finale freigeschaltet
    </p>

    <p className="mt-2 text-sm font-semibold leading-relaxed text-green-900">
      Du hast den geheimen Pfad abgeschlossen. Das Finale wartet auf dich.
    </p>

    <div className="mt-4">
      <Button
        asChild
        className="rounded-2xl bg-green-600 font-black text-white hover:bg-green-700"
      >
        <Link href="/mission/finale">Zum Finale</Link>
      </Button>
    </div>
  </div>
)}



                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      key={`${messageType}-${message}`}
                      ref={messageRef}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`mt-4 rounded-2xl border p-4 text-sm font-semibold shadow-sm ${messageStyles}`}
                    >
                      <div className="flex items-start gap-3">
                        <MessageIcon className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>{message}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

           {activeHint && (
  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
    <p className="text-[11px] font-black uppercase tracking-wider text-orange-700">
      {activeHint.label}
    </p>

    <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-gray-900">
      {activeHint.text}
    </p>

    {activeHint.link && (
      <div className="mt-4">
        <Button
          type="button"
          onClick={() => window.open(activeHint.link, "_blank", "noopener,noreferrer")}
          className="rounded-2xl bg-orange-600 font-black text-white hover:bg-orange-700"
        >
          {activeHint.linkLabel ?? "Link öffnen"}
        </Button>
      </div>
    )}
  </div>
)}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
                      <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Deine Buchstaben</h2>
                      <p className="text-sm text-gray-600">
                        {TOTAL_DAYS} Tage · {LETTER_SLOT_COUNT} Buchstaben
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {letterSlots.map((letter, index) => (
                      <div
                        key={index}
                        className="flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-lg font-black"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
                      <Timer className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">
                        Fortschritt & Countdown
                      </h2>
                      <p className="text-sm text-gray-600">
                        Bleib täglich dran und verpasse keinen Hinweis.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                      <span>Fortschritt</span>
                      <span>
                        {progress.length} / {TOTAL_DAYS} gelöst ·{" "}
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-orange-700">
                      Nächstes Rätsel
                    </p>
                    <p className="mt-2 text-2xl font-black text-gray-900">
                      {countdownText}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {nextReleaseLabel}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
                      <Trophy className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Lösungswort</h2>
                      <p className="text-sm text-gray-600">
                        Groß- oder Kleinschreibung ist egal.
                      </p>
                    </div>
                  </div>

                  <form
                    className="mt-5 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleFinalSubmit()
                    }}
                  >
                    <Input
                      ref={finalInputRef}
                      value={finalInput}
                      onChange={(e) => setFinalInput(e.target.value)}
                      placeholder={
                        hasCorrectFinalSubmission
                          ? "Richtige Lösung bereits eingereicht"
                          : "Lösungswort eingeben"
                      }
                      className="h-12 rounded-2xl"
                      disabled={isFinalInputLocked}
                    />
                    <Button
                      type="submit"
                      className="h-12 rounded-2xl bg-gray-900 font-black hover:bg-black"
                      disabled={isFinalInputLocked}
                    >
                      {submittingFinal
                        ? "Sendet..."
                        : hasCorrectFinalSubmission
                          ? "Gespeichert"
                          : "Absenden"}
                    </Button>
                  </form>

                  {hasCorrectFinalSubmission && (
                    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                      Glückwunsch! Du hast bereits eine richtige Lösung
                      eingereicht. Das Formular ist jetzt gesperrt.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {showSecretPopup193 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 shadow-2xl"
              initial={{ scale: 0.96, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 18 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                Signal erkannt
              </p>

              <h3 className="mt-3 text-2xl font-black leading-tight text-white">
                193 war nur der Anfang.
              </h3>

              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                Du hast die erste Tür geöffnet.
                <br />
                <br />
                Auf unserer Seite warten mehrere falsche Pfade.
                Nur einer führt dich weiter.
              </p>

              <div className="mt-5 rounded-2xl border border-orange-500/20 bg-black/40 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400">
                  Nächster Schritt
                </p>
                <p className="mt-2 text-sm text-orange-200">
                  Suche den versteckten Code auf unserer Website und gib ihn hier
                  in der Mission ein.
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSecretPopup193(false)
                    focusSecretInput()
                  }}
                  className="flex-1 rounded-2xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
                >
                  Schließen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSecretPopup058 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 shadow-2xl"
              initial={{ scale: 0.96, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 18 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                Pfad bestätigt
              </p>

              <h3 className="mt-3 text-2xl font-black leading-tight text-white">
                Du hast den richtigen Weg gefunden.
              </h3>

              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                Der verborgene Code wurde erkannt.
                <br />
                <br />
                Die letzte Tür steht offen. Dahinter wartet das Finale.
              </p>

              <div className="mt-5 rounded-2xl border border-orange-500/20 bg-black/40 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400">
                  Finale freigeschaltet
                </p>
                <p className="mt-2 break-all font-mono text-sm text-orange-200">
                  /mission/finale
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSecretPopup058(false)}
                  className="flex-1 rounded-2xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
                >
                  Später
                </Button>

                <Button
                  asChild
                  className="flex-1 rounded-2xl bg-orange-600 font-black hover:bg-orange-700"
                >
                  <Link href="/mission/finale">Zum Finale</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileBottomNav />
    </div>
  )
}
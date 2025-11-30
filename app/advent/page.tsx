"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AdventCalendarDoors } from "@/components/advent-calendar-doors"
import { QuizDialog } from "@/components/quiz-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface CompletedQuiz {
  day: number
  selected_answer: string
  is_correct: boolean
}

interface Participant {
  id: string
  email: string
  name: string
}

export default function AdventPage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>([])
  const [loading, setLoading] = useState(false)
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: string; delay: string; duration: string }>>([])
  const [showTerms, setShowTerms] = useState(false)

  // Participant State for public participation
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [showRegistration, setShowRegistration] = useState(false)
  const [registrationName, setRegistrationName] = useState("")
  const [registrationEmail, setRegistrationEmail] = useState("")
  const [registrationLoading, setRegistrationLoading] = useState(false)

  // Load Participant from localStorage on start
  useEffect(() => {
    const savedParticipant = localStorage.getItem("advent_participant")
    if (savedParticipant) {
      const p = JSON.parse(savedParticipant)
      setParticipant(p)
      fetchCompletedQuizzes(p.id)
    }
  }, [])

  useEffect(() => {
    const snowflakeArray = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${12 + Math.random() * 8}s`,
    }))
    setSnowflakes(snowflakeArray)
  }, [])

  // Fetch with participant_id instead of user_id
  const fetchCompletedQuizzes = async (participantId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("advent_quiz_responses")
        .select("day, selected_answer, is_correct")
        .eq("participant_id", participantId)
        .order("day", { ascending: true })

      if (error) throw error

      setCompletedQuizzes(data || [])
    } catch (error) {
      console.error("Error fetching completed quizzes:", error)
    } finally {
      setLoading(false)
    }
  }

  // Registration/Login function
  const handleRegistration = async () => {
    if (!registrationEmail || !registrationName) {
      alert("Bitte Name und E-Mail eingeben!")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registrationEmail)) {
      alert("Bitte eine gültige E-Mail-Adresse eingeben!")
      return
    }

    setRegistrationLoading(true)
    try {
      // Check if Email already exists
      const { data: existingParticipant, error: checkError } = await supabase
        .from("advent_participants")
        .select("*")
        .eq("email", registrationEmail.toLowerCase())
        .single()

      let participantData: Participant

      if (existingParticipant) {
        // Email exists already - use existing participant
        participantData = existingParticipant
      } else {
        // New participant - create new entry
        const { data: newParticipant, error: insertError } = await supabase
          .from("advent_participants")
          .insert({
            email: registrationEmail.toLowerCase(),
            name: registrationName,
          })
          .select()
          .single()

        if (insertError) throw insertError
        participantData = newParticipant
      }

      // Save in localStorage
      localStorage.setItem("advent_participant", JSON.stringify(participantData))
      setParticipant(participantData)
      setShowRegistration(false)

      // Load completed quizzes
      await fetchCompletedQuizzes(participantData.id)
    } catch (error) {
      console.error("Error during registration:", error)
      alert("Fehler bei der Registrierung. Bitte versuche es erneut.")
    } finally {
      setRegistrationLoading(false)
    }
  }

  // Show registration if door clicked but no participant
  const handleDoorClick = (day: number) => {
    if (!participant) {
      setShowRegistration(true)
    } else {
      setSelectedDay(day)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-800 to-red-900 flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent mx-auto mb-4" />
            <p className="text-yellow-400 text-lg font-semibold">Adventkalender wird geladen...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-800 to-red-900 flex flex-col relative overflow-hidden">
      <Header />

      <div className="snowflake-container">
        {snowflakes.map((snowflake) => (
          <div
            key={snowflake.id}
            className="snowflake animate-snowfall"
            style={{
              left: snowflake.left,
              animationDelay: snowflake.delay,
              animationDuration: snowflake.duration,
              top: "-20px",
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 pb-24 relative z-20">
        {/* Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-black text-yellow-400 drop-shadow-lg mb-2"
            style={{ textShadow: "3px 3px 6px rgba(0,0,0,0.7), 0 0 20px rgba(250, 204, 21, 0.5)" }}
          >
            🎄 EMD-XMAS 🎄
          </h1>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-black text-yellow-300 drop-shadow-lg"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
          >
            ADVENTSKALENDER 2025
          </h2>
          <p className="text-yellow-200 mt-2 text-sm md:text-base font-semibold">
            ❄️ Wissensquiz über den Emoj!'s Dartverein! ❄️
          </p>
          {participant && (
            <p className="text-green-300 mt-2 text-sm md:text-base font-bold">Willkommen, {participant.name}! 👋</p>
          )}
        </div>

        {/* Terms and Conditions Button */}
        <div className="max-w-2xl mx-auto mb-8">
          <button
            onClick={() => setShowTerms(true)}
            className="w-full bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-yellow-400/40 shadow-lg hover:bg-white/15 hover:border-yellow-400/60 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          >
            <div className="flex items-center justify-center gap-3">
              <Info className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-300 text-base md:text-lg font-bold">Teilnahmebedingungen ansehen</span>
            </div>
          </button>
        </div>

        {/* Calendar Grid */}
        <AdventCalendarDoors
          selectedDay={selectedDay}
          onSelectDay={handleDoorClick}
          completedQuizzes={completedQuizzes}
        />

        {/* Quiz Dialog */}
        {selectedDay && participant && (
          <QuizDialog
            day={selectedDay}
            onClose={() => setSelectedDay(null)}
            onQuizSubmitted={() => {
              fetchCompletedQuizzes(participant.id)
            }}
            completedQuizzes={completedQuizzes}
            participantId={participant.id}
          />
        )}

        {/* Registration Modal */}
        <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
          <DialogContent className="max-w-md bg-white border-4 border-yellow-400/50 shadow-2xl">
            <DialogHeader className="border-b-2 border-yellow-400/20 pb-4">
              <DialogTitle className="text-2xl md:text-3xl font-black text-red-800 flex items-center gap-3">
                🎄 Mitspielen!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-gray-700">
                Gib einfach deinen Namen und deine E-Mail-Adresse ein, um am Quiz teilzunehmen!
              </p>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-semibold">
                  Dein Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Max Mustermann"
                  value={registrationName}
                  onChange={(e) => setRegistrationName(e.target.value)}
                  className="border-2 border-gray-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold">
                  Deine E-Mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@beispiel.de"
                  value={registrationEmail}
                  onChange={(e) => setRegistrationEmail(e.target.value)}
                  className="border-2 border-gray-300 focus:border-green-500"
                />
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-blue-800">
                  💡 Wenn du bereits teilgenommen hast, gib einfach dieselbe E-Mail ein und du kannst weitermachen!
                </p>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-yellow-400/20 flex gap-3">
              <Button onClick={() => setShowRegistration(false)} variant="outline" className="flex-1">
                Abbrechen
              </Button>
              <Button
                onClick={handleRegistration}
                disabled={registrationLoading || !registrationName || !registrationEmail}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
              >
                {registrationLoading ? "Lädt..." : "Los geht's! 🎯"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terms and Conditions Modal */}
        <Dialog open={showTerms} onOpenChange={setShowTerms}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-4 border-yellow-400/50 shadow-2xl">
            <DialogHeader className="border-b-2 border-yellow-400/20 pb-4">
              <DialogTitle className="text-2xl md:text-3xl font-black text-red-800 flex items-center gap-3">
                <Info className="w-7 h-7 text-yellow-600" />
                Teilnahmebedingungen
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Spielprinzip */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-600">
                <h3 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">🎯 Spielprinzip</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Bei diesem Adventskalender handelt es sich um ein reines Wissensquiz über den Emoj!'s Dartverein e.V.
                  Jeden Tag vom 1. bis 24. Dezember wird ein neues Türchen mit einer Quizfrage über die Geschichte und
                  Erfolge unseres Vereins freigeschaltet.
                </p>
              </div>

              {/* Quiz-Kronen */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border-l-4 border-yellow-600">
                <h3 className="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  👑 Quiz-Kronen System
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                  Durch richtige Antworten können Quiz-Kronen gesammelt werden. Diese dienen ausschließlich der internen
                  Punktewertung und haben <strong>keinen materiellen Wert</strong>.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Die Quiz-Kronen sind ein spielerisches Element zur Förderung des Gemeinschaftsgefühls und des
                  Vereinswissens. Sie können nicht eingelöst, verkauft oder übertragen werden.
                </p>
              </div>

              {/* Unentgeltliche Teilnahme */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-l-4 border-blue-600">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
                  🎁 Unentgeltliche Teilnahme
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                  Die Teilnahme am Adventskalender-Quiz ist <strong>vollständig kostenlos und unentgeltlich</strong>.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Es werden <strong>keine Gewinne ausgespielt</strong> und es findet <strong>keine Verlosung</strong>{" "}
                  statt. Das Quiz dient ausschließlich der Unterhaltung und dem Wissensaustausch.
                </p>
              </div>

              {/* Kein Glücksspiel */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-600">
                <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center gap-2">⚖️ Kein Glücksspiel</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                  Dies ist <strong>kein Glücksspiel</strong> im Sinne des Glücksspielgesetzes, da:
                </p>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-2">
                  <li>
                    Das Ergebnis ausschließlich auf <strong>Wissen und Können</strong> basiert
                  </li>
                  <li>Keine Gewinnchancen oder materielle Preise existieren</li>
                  <li>Kein Einsatz oder Entgelt erforderlich ist</li>
                  <li>Die Quiz-Kronen keinen Vermögenswert darstellen</li>
                </ul>
              </div>

              {/* Datenschutz */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border-l-4 border-gray-600">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">🔒 Datenschutz</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Die Antworten und Quiz-Kronen werden ausschließlich für vereinsinterne Zwecke gespeichert und nicht an
                  Dritte weitergegeben. Deine E-Mail-Adresse wird nur zur Identifikation verwendet.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-yellow-400/20">
              <Button
                onClick={() => setShowTerms(false)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 text-base shadow-lg"
              >
                Verstanden - Quiz spielen! 🎄
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <MobileBottomNav />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { QUIZ_DATA } from "@/lib/quiz-data"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CompletedQuiz {
  day: number
  selected_answer: string
  is_correct: boolean
}

interface QuizDialogProps {
  day: number
  onClose: () => void
  onQuizSubmitted: () => void
  completedQuizzes: CompletedQuiz[]
  userId: string
}

export function QuizDialog({ day, onClose, onQuizSubmitted, completedQuizzes, userId }: QuizDialogProps) {
  const submitted = completedQuizzes.some((q) => q.day === day)
  const previousAnswer = completedQuizzes.find((q) => q.day === day)

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(previousAnswer?.selected_answer || null)
  const [loading, setLoading] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(submitted)

  const quiz = QUIZ_DATA[day]

  useEffect(() => {
    const checkExistingAnswer = async () => {
      if (!userId || submitted) return

      try {
        const { data, error } = await supabase
          .from("advent_quiz_responses")
          .select("day, selected_answer, is_correct")
          .eq("user_id", userId)
          .eq("day", day)
          .single()

        if (data && !error) {
          setAlreadyAnswered(true)
          setSelectedAnswer(data.selected_answer)
        }
      } catch (error) {
        // Kein Fehler werfen wenn keine Antwort gefunden wurde
      }
    }

    checkExistingAnswer()
  }, [userId, day, submitted])

  if (!quiz) {
    return null
  }

  const handleSubmit = async () => {
    if (!selectedAnswer || !userId) return

    if (alreadyAnswered) {
      console.log("[v0] Quiz wurde bereits beantwortet")
      return
    }

    setLoading(true)
    try {
      const isCorrect = selectedAnswer === quiz.correctAnswer

      const { error } = await supabase.from("advent_quiz_responses").insert({
        user_id: userId,
        day,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      })

      if (error) {
        if (error.code === "23505") {
          alert("Du hast diese Frage bereits auf einem anderen Gerät beantwortet!")
          onQuizSubmitted()
          onClose()
          return
        }
        throw error
      }

      onQuizSubmitted()
      onClose()
    } catch (error) {
      console.error("Error saving response:", error)
    } finally {
      setLoading(false)
    }
  }

  const dateStr = String(day).padStart(2, "0")
  const currentAnswer = selectedAnswer
  const isAnswered = alreadyAnswered || submitted

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-white border-4 border-green-600 shadow-2xl p-4 md:p-6">
        <DialogHeader className="border-b-4 border-green-600 pb-3 md:pb-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-2xl md:text-3xl font-black text-green-700 flex items-center gap-2 md:gap-3">
              <span className="text-3xl md:text-4xl">🎄</span>
              <span>Tag {dateStr}</span>
            </DialogTitle>
            <span className="text-sm md:text-xl text-gray-400 whitespace-nowrap">Dez 2025</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Question */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 md:p-6 rounded-xl border-2 border-green-200">
            <div className="flex gap-2 md:gap-3 items-start">
              <span className="text-2xl md:text-3xl">❓</span>
              <h3 className="text-lg md:text-2xl font-bold text-gray-800 leading-relaxed">{quiz.question}</h3>
            </div>
          </div>

          {/* Answers */}
          <div className="space-y-3 md:space-y-4">
            {["A", "B"].map((option) => (
              <button
                key={option}
                onClick={() => !isAnswered && setSelectedAnswer(option)}
                disabled={isAnswered}
                className={`w-full p-4 md:p-6 rounded-xl border-3 transition-all text-left ${
                  currentAnswer === option
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 border-green-600 text-white shadow-lg scale-[1.02]"
                    : "bg-white border-gray-300 hover:border-green-400 hover:shadow-md text-gray-800"
                } ${isAnswered ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:scale-[1.01]"}`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <span
                    className={`text-xl md:text-3xl font-black ${
                      currentAnswer === option ? "text-white" : "text-green-600"
                    }`}
                  >
                    {option}
                  </span>
                  <span className="text-base md:text-xl font-semibold flex-1 leading-snug">{quiz.answers[option]}</span>
                  {currentAnswer === option && <span className="text-xl md:text-2xl">✓</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {isAnswered && (
            <div className="p-4 md:p-5 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 border-3 border-green-500">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">✓</span>
                <p className="text-base md:text-lg font-bold text-green-800">Deine Antwort wurde gespeichert!</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 md:gap-3 pt-2 md:pt-4 pb-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12 md:h-14 text-base md:text-lg font-bold bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200 hover:border-gray-400"
            >
              Schließen
            </Button>
            {!isAnswered && (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || loading}
                className="flex-1 h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg disabled:opacity-50"
              >
                {loading ? "Speichert..." : "Senden "}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

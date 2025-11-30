"use client"

import { useState } from "react"

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionModalProps {
  question: Question
  onAnswer: () => void
  onClose: () => void
}

export function QuestionModal({ question, onAnswer, onClose }: QuestionModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleSelectOption = (index: number) => {
    if (!answered) {
      setSelectedOption(index)
    }
  }

  const handleSubmit = () => {
    if (selectedOption !== null) {
      const correct = selectedOption === question.correctAnswer
      setIsCorrect(correct)
      setAnswered(true)

      setTimeout(() => {
        onAnswer()
      }, 1500)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-foreground/20 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest">Frage</span>
            <h2 className="text-3xl font-light text-foreground">#{question.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-3xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="mb-8">
          <p className="text-lg font-light text-foreground text-balance leading-relaxed">{question.question}</p>
        </div>

        <div className="space-y-3 mb-8">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={answered}
              className={`w-full p-4 rounded-lg text-left font-light transition-all duration-200 border-2 flex items-center gap-3 ${
                selectedOption === index
                  ? answered
                    ? isCorrect
                      ? "border-secondary bg-secondary/10 text-foreground"
                      : "border-destructive bg-destructive/10 text-foreground"
                    : "border-secondary bg-secondary/10 text-foreground"
                  : answered && index === question.correctAnswer
                    ? "border-secondary bg-secondary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-secondary/50 hover:bg-card/80"
              } ${!answered && selectedOption !== index ? "cursor-pointer" : ""} ${answered ? "cursor-not-allowed" : ""}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  selectedOption === index
                    ? answered
                      ? isCorrect
                        ? "border-secondary bg-secondary"
                        : "border-destructive bg-destructive"
                      : "border-secondary bg-secondary"
                    : answered && index === question.correctAnswer
                      ? "border-secondary bg-secondary"
                      : "border-border"
                }`}
              >
                {(selectedOption === index || (answered && index === question.correctAnswer)) && (
                  <span className="text-white text-xs font-semibold">✓</span>
                )}
              </div>
              <span>{option}</span>
            </button>
          ))}
        </div>

        {answered && (
          <div
            className={`mb-8 p-4 rounded-lg text-center font-light transition-all duration-300 ${
              isCorrect
                ? "bg-secondary/15 text-secondary border border-secondary/30"
                : "bg-destructive/15 text-destructive border border-destructive/30"
            }`}
          >
            {isCorrect ? (
              <div>
                <div className="text-2xl mb-2">✨</div>
                <span className="font-semibold">Richtig!</span>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-2">→</div>
                <span className="font-semibold">Leider falsch!</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!answered ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-border text-foreground font-light hover:bg-card/80 hover:border-secondary/50 transition-all duration-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedOption === null}
                className="flex-1 px-4 py-3 rounded-lg bg-secondary text-primary font-light hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200"
              >
                Antwort
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-lg bg-secondary text-primary font-light hover:bg-secondary/90 transition-all duration-200"
            >
              Weiter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

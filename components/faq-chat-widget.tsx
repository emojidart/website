"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TypingIndicator } from "@/components/typing-indicator"
import { Send, Sparkles, MessageCircle, X } from "lucide-react"

type FAQ = { id: number; question: string; answer: string; keywords: string[] }

export function FAQChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([
    { from: "bot", text: "Hallo! 👋 Ich bin dein EMD Chat-Assistent. Wie kann ich dir helfen?" },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFAQs = async () => {
      const { data } = await supabase.from("faqs").select("*")
      if (data) setFaqs(data)
    }
    fetchFAQs()
  }, [])

  const scrollToBottom = () => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100)
  }

  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9äöüß ]/gi, "")

  const simulateTyping = async (answer: string) => {
    const baseDelay = 800
    const typingSpeed = 30
    const delay = baseDelay + Math.min(answer.length * typingSpeed, 2000)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  const handleAsk = async (q: string) => {
    if (!q.trim() || isTyping) return

    const query = normalize(q)
    const matched = faqs.find((f) => f.keywords.some((k) => query.includes(normalize(k))))
    const answer = matched
      ? matched.answer
      : "Das kann ich dir nicht beantworten. 🧐 Versuche es mit einer anderen Frage!"

    setMessages((prev) => [...prev, { from: "user", text: q }])
    setInput("")
    scrollToBottom()

    setIsTyping(true)
    scrollToBottom()

    await simulateTyping(answer)

    setIsTyping(false)
    setMessages((prev) => [...prev, { from: "bot", text: answer }])
    scrollToBottom()
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [isOpen])

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Widget Panel - Responsive Größen für mobile Geräte hinzugefügt */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[380px] w-auto h-[calc(100vh-10rem)] sm:h-[600px] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header - Padding für mobile optimiert */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-3 sm:p-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold">FAQ Assistent</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-orange-100 text-xs">Stelle mir deine Fragen – ich helfe dir gerne weiter!</p>
          </div>

          {/* Chat Messages - Padding für mobile optimiert */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm ${
                      msg.from === "user"
                        ? "bg-gray-100 text-gray-900 rounded-br-sm"
                        : "bg-orange-600 text-white rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isTyping && <TypingIndicator />}
            </div>
          </div>

          {/* Input Area - Padding und Button-Größe für mobile optimiert */}
          <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-2 bg-gray-50 rounded-full p-1.5 sm:p-2 border border-gray-200">
              <Input
                placeholder="Deine Frage eingeben..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk(input)}
                disabled={isTyping}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
              />
              <Button
                onClick={() => handleAsk(input)}
                disabled={isTyping || !input.trim()}
                size="icon"
                className="rounded-full bg-orange-600 hover:bg-orange-700 shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

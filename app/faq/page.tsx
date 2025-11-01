"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { TypingIndicator } from "@/components/typing-indicator"
import { Send, Sparkles } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

type FAQ = { id: number; question: string; answer: string; keywords: string[] }

export default function ProFAQChat() {
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
    const typingSpeed = 30 // ms per character
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-orange-50 to-white">
      <Header />

      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">FAQ Assistent</h1>
          </div>
          <p className="text-orange-100 text-sm">Stelle mir deine Fragen – ich helfe dir gerne weiter!</p>
        </div>
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`px-4 py-3 rounded-2xl max-w-[80%] shadow-sm ${
                  msg.from === "user"
                    ? "bg-gray-100 text-gray-900 rounded-br-sm"
                    : "bg-orange-600 text-white rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {isTyping && <TypingIndicator />}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-2 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 bg-white rounded-full shadow-lg p-2 border border-gray-200">
            <Input
              placeholder="Deine Frage eingeben..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk(input)}
              disabled={isTyping}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
            <Button
              onClick={() => handleAsk(input)}
              disabled={isTyping || !input.trim()}
              size="icon"
              className="rounded-full bg-orange-600 hover:bg-orange-700 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}

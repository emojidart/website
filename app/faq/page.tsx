"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { TypingIndicator } from "@/components/typing-indicator"
import { Send, Sparkles, MessageCircle } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"

type FAQ = { id: number; question: string; answer: string; keywords: string[] }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

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
    const answer = matched ? matched.answer : "Das kann ich dir nicht beantworten. 🧐 Versuche es mit einer anderen Frage!"

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
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      {/* fixed header */}
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header-Card */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">FAQ Assistent</h1>
                  <p className="text-sm text-gray-600 mt-1">Stelle mir deine Fragen – ich helfe dir gerne weiter!</p>
                 
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chatbereich  */}
          <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* kleine Chat-Header-Zeile */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900">Chat</p>
                <p className="text-xs text-gray-500">Tippe eine Frage und sende sie ab</p>
              </div>
            </div>

            {/* scroll area */}
            <div ref={chatRef} className="h-[60vh] sm:h-[62vh] overflow-y-auto p-4 pb-28">
              <div className="flex flex-col gap-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.from === "user" ? "justify-end" : "justify-start"
                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[85%] shadow-sm border ${
                        msg.from === "user"
                          ? "bg-gray-100 text-gray-900 border-gray-200 rounded-br-sm"
                          : "bg-orange-600 text-white border-orange-600 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isTyping && <TypingIndicator />}
              </div>
            </div>
          </motion.div>

          {/* Inputbar  */}
          <div className="fixed bottom-20 left-0 right-0 px-4">
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Deine Frage eingeben..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAsk(input)}
                    disabled={isTyping}
                    className="h-11 rounded-2xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  />
                  <Button
                    onClick={() => handleAsk(input)}
                    disabled={isTyping || !input.trim()}
                    size="icon"
                    className="h-11 w-11 rounded-2xl bg-orange-600 hover:bg-orange-700 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 px-1">
                {isTyping ? "Assistent tippt…" : ""}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
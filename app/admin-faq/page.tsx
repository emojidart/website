"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function FAQChat() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<{user: string, bot: string}[]>([])
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  const sendMessage = async () => {
    if (!input.trim()) return

    // Benutzer-Nachricht sofort hinzufügen
    setMessages(prev => [...prev, { user: input, bot: "" }])
    const userMsg = input
    setInput("")
    setTyping(true)

    // Supabase abfragen
    const { data: faqs } = await supabase.from('faqs').select('*')
    const lower = userMsg.toLowerCase()

    const match = faqs?.find(faq =>
      faq.keywords.some((k: string) => lower.includes(k.toLowerCase()))
    )

    const answer = match ? match.answer : "Sorry, dazu habe ich noch keine Infos. 🧐"

    // Leere Bot-Nachricht erstmal setzen
    setMessages(prev => [...prev.slice(0, -1), { ...prev[prev.length - 1], bot: "" }])

    // kleine Pause, damit ... angezeigt wird
    await new Promise(r => setTimeout(r, 500))

    // Bot-Antwort Buchstabe für Buchstabe
    await typeBotMessage(answer)
  }

  const typeBotMessage = async (text: string) => {
    let displayed = ""
    for (let char of text) {
      displayed += char
      setMessages(prev => {
        const newMsgs = [...prev]
        const lastIndex = newMsgs.length - 1
        newMsgs[lastIndex] = { ...newMsgs[lastIndex], bot: displayed }
        return newMsgs
      })
      await new Promise(r => setTimeout(r, 30)) // 30ms pro Buchstabe
    }
    setTyping(false)
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 bg-white shadow rounded flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-4">Live FAQ Chat</h2>

      <div className="flex-1 space-y-2 overflow-y-auto mb-4 border p-2 rounded">
        {messages.map((m, i) => (
          <div key={i}>
            <p className="font-semibold">Du: {m.user}</p>
            <p className="text-orange-600">
              Bot: {m.bot}{typing && i === messages.length - 1 ? " ..." : ""}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-grow border rounded px-2 py-1"
          placeholder="Schreibe deine Frage..."
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-orange-600 text-white px-4 rounded"
        >
          Senden
        </button>
      </div>
    </div>
  )
}

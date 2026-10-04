"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, MessageCircle, Share2, CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function MessengerInstallPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as any).standalone === true)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
      setMessage("EMD Messenger wurde hinzugefügt.")
    }

    window.addEventListener("beforeinstallprompt", onPrompt as EventListener)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async () => {
    setMessage("")
    if (installed) {
      router.push("/chat-app")
      return
    }
    if (prompt) {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === "accepted") {
        setPrompt(null)
      }
      return
    }
    if (ios) {
      setMessage("Öffne Teilen und wähle „Zum Home-Bildschirm“.")
    } else {
      setMessage("Öffne das Browser-Menü und wähle „App installieren“.")
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050608] px-4 py-6 text-white sm:flex sm:items-center sm:justify-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(14,165,233,.10),transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <button onClick={() => router.back()} className="mb-5 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-white/55 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0a0d12]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,.65)] backdrop-blur-2xl sm:p-7">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-orange-300/20 bg-orange-500/10 text-orange-200 shadow-[0_0_35px_rgba(249,115,22,.15)]">
            <MessageCircle className="h-8 w-8" />
          </div>

          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/70">EMD Messenger</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Direkt am Homescreen</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/50">Chats, Aktuelles und Aufstellungen direkt öffnen – wie eine eigene App.</p>

          {installed ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.08] p-4 text-sm font-bold text-emerald-100">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> Bereits installiert
            </div>
          ) : ios ? (
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-sm font-semibold leading-6 text-white/65">
              <div className="flex items-center gap-2 font-black text-white"><Share2 className="h-4 w-4 text-orange-300" /> Auf iPhone/iPad</div>
              <div className="mt-2">Teilen → <span className="font-black text-white">Zum Home-Bildschirm</span> → Hinzufügen</div>
            </div>
          ) : null}

          {message ? <div className="mt-4 rounded-2xl border border-orange-300/15 bg-orange-500/[0.08] px-4 py-3 text-sm font-bold text-orange-100">{message}</div> : null}

          <button
            onClick={() => void install()}
            className="mt-6 flex h-13 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_0_32px_rgba(249,115,22,.22)] transition hover:bg-orange-400 active:scale-[0.99]"
          >
            {installed ? <><ExternalLink className="mr-2 h-4 w-4" /> Messenger öffnen</> : <><Download className="mr-2 h-4 w-4" /> Messenger installieren</>}
          </button>
        </section>
      </div>
    </main>
  )
}

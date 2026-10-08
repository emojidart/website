"use client"

import { useEffect, useState } from "react"
import { MonitorDown, X, Smartphone } from "lucide-react"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone) ||
    document.documentElement.classList.contains("is-native")
}

export function InstallEmdApp() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop")

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setPlatform(ios ? "ios" : /Android/i.test(ua) ? "android" : "desktop")
    setInstalled(isInstalled())
    setReady(true)

    function handleInstallPrompt(event: Event) {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    function handleInstalled() {
      setInstalled(true)
      setPromptEvent(null)
      setShowHelp(false)
    }
    const media = window.matchMedia("(display-mode: standalone)")
    const sync = () => setInstalled(isInstalled())
    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    media.addEventListener?.("change", sync)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      media.removeEventListener?.("change", sync)
    }
  }, [])

  if (!ready || installed) return null

  async function install() {
    if (!promptEvent) {
      setShowHelp(true)
      return
    }
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      setPromptEvent(null)
      if (choice.outcome === "accepted") {
        // appinstalled event confirms successful installation
        setShowHelp(false)
      }
    } catch {
      setShowHelp(true)
    }
  }

  return (
    <div className="relative min-w-[180px] flex-1 sm:flex-none" aria-label="EMD App installieren">
      <button
        type="button"
        onClick={install}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-300/30 bg-orange-600 px-4 text-sm font-black text-white shadow-lg shadow-orange-950/25 transition hover:bg-orange-500 sm:h-14"
      >
        <MonitorDown size={19} /> App installieren
      </button>
      {showHelp && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(320px,90vw)] rounded-xl border border-orange-400/30 bg-[#101720] p-4 text-sm text-white shadow-2xl">
          <button type="button" onClick={() => setShowHelp(false)} className="absolute right-2 top-2 p-1 text-white/60" aria-label="Hinweis schließen"><X size={17}/></button>
          <div className="mb-2 flex items-center gap-2 pr-5 font-bold text-orange-300"><Smartphone size={17} /> So installierst du EMD</div>
          {platform === "ios" ? (
            <p>Website in Safari öffnen, auf Teilen tippen und „Zum Home-Bildschirm“ wählen.</p>
          ) : platform === "android" ? (
            <p>Website in Chrome öffnen, auf ⋮ tippen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</p>
          ) : (
            <p>Website in Edge öffnen: ⋯ → Apps → Diese Website als App installieren. In Chrome „Installieren“ im Browsermenü suchen.</p>
          )}
        </div>
      )}
    </div>
  )
}

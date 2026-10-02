"use client"

import { useEffect, useState } from "react"
import { Download, MonitorDown, Smartphone } from "lucide-react"

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.emojisdartverein.app"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function VereinAppInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

    if (standalone) setIsInstalled(true)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setMessage("App wurde installiert.")
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const installOnComputer = async () => {
    if (isInstalled) {
      setMessage("Die App ist auf diesem Gerät bereits installiert.")
      return
    }

    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      if (choice.outcome === "accepted") {
        setMessage("Installation gestartet.")
      } else {
        setMessage("Installation abgebrochen.")
      }

      setInstallPrompt(null)
      return
    }

    setMessage(
      "Falls kein Installationsfenster erscheint: In Chrome oder Edge oben rechts im Browser-Menü „App installieren“ wählen.",
    )
  }

  const showIphoneHelp = () => {
    setMessage(
      "Auf iPhone/iPad in Safari: Teilen antippen und danach „Zum Home-Bildschirm“ wählen.",
    )
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/30 p-3.5 backdrop-blur-xl sm:p-4">
      <div className="mb-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
          EMD VereinsApp
        </div>
        <div className="mt-1 text-sm font-black text-white sm:text-base">
          Direkt auf Smartphone oder PC installieren
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0d10]/95 px-4 transition hover:border-orange-300/30 hover:bg-[#11151a]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Smartphone className="h-5 w-5 text-orange-200" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
              Android
            </div>
            <div className="truncate text-sm font-black text-white">Google Play</div>
          </div>
          <Download className="ml-auto h-4 w-4 text-white/30 group-hover:text-orange-300" />
        </a>

        <button
          type="button"
          onClick={installOnComputer}
          className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0d10]/95 px-4 text-left transition hover:border-sky-300/30 hover:bg-[#11151a]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <MonitorDown className="h-5 w-5 text-sky-200" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
              Windows / PC
            </div>
            <div className="truncate text-sm font-black text-white">
              {isInstalled ? "Bereits installiert" : "App installieren"}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={showIphoneHelp}
          className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0d10]/95 px-4 text-left transition hover:border-white/20 hover:bg-[#11151a]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[22px] font-semibold leading-none text-white">
            
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
              iPhone / iPad
            </div>
            <div className="truncate text-sm font-black text-white">Installieren</div>
          </div>
        </button>
      </div>

      {message ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold leading-5 text-white/55">
          {message}
        </div>
      ) : null}
    </div>
  )
}

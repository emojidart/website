"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Clock3, RotateCcw, ShieldCheck } from "lucide-react"

const IDLE_MS = 60 * 1000
const WARNING_SECONDS = 20

function hasCriticalInteractionOpen() {
  if (typeof document === "undefined") return false

  if (document.querySelector('[data-terminal-idle-lock="true"]')) return true

  const dialog = document.querySelector(
    '[role="dialog"], [aria-modal="true"], dialog[open], [data-state="open"][role="dialog"]',
  )
  if (dialog) return true

  return false
}

export default function TerminalIdleGuard() {
  const router = useRouter()
  const pathname = usePathname()

  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)

  const idleTimerRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const clearCountdown = useCallback(() => {
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const goHome = useCallback(() => {
    clearIdleTimer()
    clearCountdown()
    setWarningOpen(false)
    setSecondsLeft(WARNING_SECONDS)
    router.replace("/terminal")
  }, [clearCountdown, clearIdleTimer, router])

  const armIdleTimer = useCallback(() => {
    clearIdleTimer()

    if (pathname === "/terminal") return

    // Im Turniermodus niemals mitten in PIN-/Ergebniseingabe eingreifen.
    if (pathname.startsWith("/terminal/turniermodus")) return

    idleTimerRef.current = window.setTimeout(() => {
      if (hasCriticalInteractionOpen()) {
        armIdleTimer()
        return
      }

      setSecondsLeft(WARNING_SECONDS)
      setWarningOpen(true)
    }, IDLE_MS)
  }, [clearIdleTimer, pathname])

  const registerActivity = useCallback(() => {
    if (warningOpen) return
    armIdleTimer()
  }, [armIdleTimer, warningOpen])

  const stayHere = useCallback(() => {
    clearCountdown()
    setWarningOpen(false)
    setSecondsLeft(WARNING_SECONDS)
    window.setTimeout(() => armIdleTimer(), 0)
  }, [armIdleTimer, clearCountdown])

  useEffect(() => {
    setWarningOpen(false)
    setSecondsLeft(WARNING_SECONDS)
    clearCountdown()
    armIdleTimer()
  }, [pathname, armIdleTimer, clearCountdown])

  useEffect(() => {
    // Nur echte Benutzeraktionen setzen die Inaktivität zurück.
    // "pointermove" absichtlich NICHT: Maus-/Touchpad-Rauschen kann sonst
    // den Timer unbemerkt permanent zurücksetzen.
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ]

    const handler = () => registerActivity()
    events.forEach((eventName) =>
      window.addEventListener(eventName, handler, { passive: true }),
    )

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handler))
    }
  }, [registerActivity])

  useEffect(() => {
    if (!warningOpen) {
      clearCountdown()
      return
    }

    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.setTimeout(goHome, 0)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return clearCountdown
  }, [warningOpen, clearCountdown, goHome])

  useEffect(() => {
    return () => {
      clearIdleTimer()
      clearCountdown()
    }
  }, [clearCountdown, clearIdleTimer])

  if (!warningOpen) return null

  const progress = Math.max(0, Math.min(100, (secondsLeft / WARNING_SECONDS) * 100))

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden bg-black/82 px-5 text-white backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.18]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(249,115,22,.17),transparent_28%),radial-gradient(circle_at_75%_85%,rgba(14,165,233,.10),transparent_30%)]" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[38px] border border-orange-300/20 bg-[#07090d]/94 p-7 text-center shadow-[0_35px_120px_rgba(0,0,0,.72)] sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-orange-300/20 bg-orange-500/10 text-orange-300 shadow-[0_0_55px_rgba(249,115,22,.16)]">
          <Clock3 className="h-10 w-10" />
        </div>

        <div className="mt-6 text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/75">
          EMD Club Terminal
        </div>
        <h2 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Noch da?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-white/45 sm:text-lg">
          Aus Sicherheitsgründen wird der Terminal bei Inaktivität automatisch zurückgesetzt.
        </p>

        <div className="mt-7 flex items-end justify-center gap-3">
          <div className="text-7xl font-black tracking-[-0.07em] text-white sm:text-8xl">
            {secondsLeft}
          </div>
          <div className="pb-3 text-sm font-black uppercase tracking-[0.2em] text-white/30">
            Sekunden
          </div>
        </div>

        <div className="mx-auto mt-5 h-2 max-w-lg overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-300 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={stayHere}
            className="flex min-h-[72px] items-center justify-center gap-3 rounded-[22px] border border-orange-300/25 bg-orange-500 px-5 text-base font-black text-white shadow-[0_18px_50px_-24px_rgba(249,115,22,.75)] transition active:scale-[.985]"
          >
            <ShieldCheck className="h-5 w-5" />
            JA, ICH BIN NOCH DA
          </button>

          <button
            type="button"
            onClick={goHome}
            className="flex min-h-[72px] items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.055] px-5 text-base font-black text-white/75 transition active:scale-[.985]"
          >
            <RotateCcw className="h-5 w-5" />
            ZURÜCK ZUM START
          </button>
        </div>

        <div className="mt-5 text-xs font-semibold text-white/25">
          Eine Berührung auf „Ich bin noch da“ setzt den Timer zurück.
        </div>
      </div>
    </div>
  )
}

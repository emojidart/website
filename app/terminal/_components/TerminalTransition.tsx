"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import TerminalLoader from "./TerminalLoader"

type TransitionContextValue = {
  navigate: (href: string, label?: string) => void
  active: boolean
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

const TOTAL_TRANSITION_MS = 2000
const NAVIGATE_AT_MS = 1500
const SAFETY_AFTER_ROUTE_MS = 140

export function TerminalTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const navTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const pendingHrefRef = useRef<string | null>(null)

  const [active, setActive] = useState(false)
  const [label, setLabel] = useState("Bereich wird geöffnet")

  const clearTimers = () => {
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    navTimerRef.current = null
    hideTimerRef.current = null
  }

  const navigate = useCallback((href: string, nextLabel = "Bereich wird geöffnet") => {
    if (active) return

    clearTimers()
    router.prefetch(href)

    startedAtRef.current = performance.now()
    pendingHrefRef.current = href
    setLabel(nextLabel)
    setActive(true)

    // Neue Route schon VOR Ende der 2 Sekunden einsetzen.
    // Der dunkle Loader bleibt dabei oben und verdeckt jeden Paint-Wechsel.
    navTimerRef.current = window.setTimeout(() => {
      router.push(href)
      navTimerRef.current = null
    }, NAVIGATE_AT_MS)
  }, [active, router])

  useEffect(() => {
    if (!active || !pendingHrefRef.current) return

    const targetPath = pendingHrefRef.current.split("?")[0]
    if (pathname !== targetPath) return

    const elapsed = performance.now() - startedAtRef.current
    const remaining = Math.max(TOTAL_TRANSITION_MS - elapsed, SAFETY_AFTER_ROUTE_MS)

    // Overlay bleibt bis mindestens Sekunde 2 stehen und zusätzlich lange genug,
    // dass die neue Route bereits einen dunklen Frame gepainted hat.
    hideTimerRef.current = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setActive(false)
          pendingHrefRef.current = null
          hideTimerRef.current = null
        })
      })
    }, remaining)

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [pathname, active])

  useEffect(() => {
    return () => clearTimers()
  }, [])

  return (
    <TransitionContext.Provider value={{ navigate, active }}>
      <div className="relative min-h-[100svh] bg-[#050608] text-white">
        <div className="pointer-events-none fixed inset-0 -z-50 bg-[#050608]" />
        {children}
      </div>
      {active && <TerminalLoader label={label} />}
    </TransitionContext.Provider>
  )
}

export function useTerminalTransition() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error("useTerminalTransition must be used inside TerminalTransitionProvider")
  return ctx
}

"use client"

import { InlineLoader } from "@/components/loading/loading"

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import TerminalIdleGuard from "./TerminalIdleGuard"

type TransitionContextValue = { navigate: (href: string, label?: string) => void; active: boolean }
const TransitionContext = createContext<TransitionContextValue | null>(null)

export function TerminalTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [active, startTransition] = useTransition()
  const [label, setLabel] = useState("Bereich wird geöffnet")
  const navigate = useCallback((href: string, nextLabel = "Bereich wird geöffnet") => {
    if (active) return
    setLabel(nextLabel)
    router.prefetch(href)
    startTransition(() => router.push(href))
  }, [active, router])
  return <TransitionContext.Provider value={{ navigate, active }}>
    <div className="relative min-h-[100svh] bg-[#172235] text-white">{children}</div>
    {!active && <TerminalIdleGuard/>}
    {active && <InlineLoader label={label} className="emd-terminal-transition-status"/>}
  </TransitionContext.Provider>
}

export function useTerminalTransition() {
  const context = useContext(TransitionContext)
  if (!context) throw new Error("useTerminalTransition must be used inside TerminalTransitionProvider")
  return context
}

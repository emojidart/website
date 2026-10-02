"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

type TouchFx = {
  x: number
  y: number
  id: number
}

function AppTouchFeedback() {
  const [mounted, setMounted] = useState(false)
  const [fx, setFx] = useState<TouchFx | null>(null)
  const timerRef = useRef<number | null>(null)
  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    target: HTMLElement
    moved: boolean
  } | null>(null)

  useEffect(() => {
    setMounted(true)

    const clearFxTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      const interactive = target?.closest("button, a, [role='button']") as HTMLElement | null

      if (!interactive) {
        gestureRef.current = null
        return
      }
      if ((interactive as HTMLButtonElement).disabled) return
      if (interactive.getAttribute("aria-disabled") === "true") return
      if (interactive.hasAttribute("data-no-app-touch-fx")) return

      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        target: interactive,
        moved: false,
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId) return

      const dx = event.clientX - gesture.startX
      const dy = event.clientY - gesture.startY

      // Sobald der Finger scrollt/wischt, ist es kein Tap mehr.
      if (Math.hypot(dx, dy) > 10) {
        gesture.moved = true
        setFx(null)
        clearFxTimer()
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      const gesture = gestureRef.current
      gestureRef.current = null

      if (!gesture || gesture.pointerId !== event.pointerId || gesture.moved) return
      if (!document.contains(gesture.target)) return

      const rect = gesture.target.getBoundingClientRect()

      clearFxTimer()
      setFx({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: Date.now(),
      })

      timerRef.current = window.setTimeout(() => {
        setFx(null)
        timerRef.current = null
      }, 480)
    }

    const onPointerCancel = () => {
      gestureRef.current = null
      setFx(null)
      clearFxTimer()
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointermove", onPointerMove, true)
    document.addEventListener("pointerup", onPointerUp, true)
    document.addEventListener("pointercancel", onPointerCancel, true)

    return () => {
      setMounted(false)
      gestureRef.current = null
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointermove", onPointerMove, true)
      document.removeEventListener("pointerup", onPointerUp, true)
      document.removeEventListener("pointercancel", onPointerCancel, true)
      clearFxTimer()
    }
  }, [])

  if (!mounted || !fx) return null

  return createPortal(
    <div
      key={fx.id}
      className="emd-app-touch-fx"
      style={{ left: `${fx.x}px`, top: `${fx.y}px` }}
      aria-hidden="true"
    >
      <span className="emd-app-touch-fx__outer" />
      <span className="emd-app-touch-fx__inner" />
      <span className="emd-app-touch-fx__dot" />
    </div>,
    document.body,
  )
}

export default function AppThemeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Terminal und Admin haben jeweils ihr eigenes, isoliertes Design.
  if (pathname.startsWith("/terminal") || pathname.startsWith("/admin")) {
    return <>{children}</>
  }

  return (
    <div className="emd-app-theme-shell">
      <AppTouchFeedback />
      {children}
    </div>
  )
}

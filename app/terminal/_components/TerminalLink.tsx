"use client"

import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import { useTerminalTransition } from "./TerminalTransition"

type Ripple = {
  x: number
  y: number
  id: number
}

const TAP_FEEDBACK_MS = 520

export default function TerminalLink({
  href,
  className = "",
  label = "Bereich wird geöffnet",
  children,
}: {
  href: string
  className?: string
  label?: string
  children: ReactNode
}) {
  const { navigate, active } = useTerminalTransition()
  const [pressed, setPressed] = useState(false)
  const [ripple, setRipple] = useState<Ripple | null>(null)
  const clickLockedRef = useRef(false)

  const startTouchFeedback = (event: PointerEvent<HTMLAnchorElement>) => {
    if (active || clickLockedRef.current) return

    const rect = event.currentTarget.getBoundingClientRect()
    setPressed(true)
    setRipple({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: Date.now(),
    })
  }

  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (active || clickLockedRef.current) return

    clickLockedRef.current = true
    setPressed(true)

    window.setTimeout(() => {
      navigate(href, label)
      setPressed(false)
      setRipple(null)
      clickLockedRef.current = false
    }, TAP_FEEDBACK_MS)
  }

  return (
    <a
      href={href}
      onPointerDown={startTouchFeedback}
      onClick={go}
      className={`relative isolate touch-manipulation select-none overflow-hidden will-change-transform ${className}`}
      style={{
        transform: pressed ? "scale(1.055)" : undefined,
        filter: pressed ? "brightness(1.16) saturate(1.14)" : undefined,
        transitionProperty: "transform, box-shadow, border-color, background-color, filter",
        transitionDuration: pressed ? "150ms" : "260ms",
        transitionTimingFunction: "cubic-bezier(.16,1,.3,1)",
        boxShadow: pressed
          ? "0 0 0 2px rgba(251,146,60,.75), 0 0 28px rgba(249,115,22,.65), 0 0 58px rgba(14,165,233,.28), 0 22px 58px rgba(0,0,0,.48)"
          : undefined,
      }}
    >
      {children}

      {pressed && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[35] rounded-[inherit] border-2 border-orange-300/75 animate-[terminal-card-pulse_.52s_ease-out_forwards]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[4px] z-[34] rounded-[inherit] border border-cyan-200/45"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[30] rounded-[inherit] bg-[radial-gradient(circle_at_center,rgba(249,115,22,.30),rgba(14,165,233,.14)_52%,transparent_82%)]"
          />
        </>
      )}

      {ripple && (
        <>
          <span
            key={`outer-${ripple.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute z-[60] h-24 w-24 rounded-full border-[3px] border-orange-200/90 bg-orange-300/18 shadow-[0_0_28px_rgba(249,115,22,.75)] animate-[terminal-ripple-outer_.50s_ease-out_forwards]"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: "translate(-50%, -50%) scale(.18)",
            }}
          />
          <span
            key={`inner-${ripple.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute z-[61] h-12 w-12 rounded-full border-2 border-cyan-100/85 bg-white/20 shadow-[0_0_24px_rgba(56,189,248,.65)] animate-[terminal-ripple-inner_.46s_ease-out_forwards]"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: "translate(-50%, -50%) scale(.28)",
            }}
          />
          <span
            key={`dot-${ripple.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute z-[62] h-4 w-4 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.95)] animate-[terminal-touch-dot_.42s_ease-out_forwards]"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: "translate(-50%, -50%)",
            }}
          />
        </>
      )}

      <style jsx>{`
        @keyframes terminal-card-pulse {
          0% {
            opacity: 0.55;
          }
          35% {
            opacity: 1;
          }
          100% {
            opacity: 0.55;
          }
        }

        @keyframes terminal-ripple-outer {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.18);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(5.2);
          }
        }

        @keyframes terminal-ripple-inner {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.28);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(4.2);
          }
        }

        @keyframes terminal-touch-dot {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.7);
          }
          45% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.1);
          }
        }
      `}</style>
    </a>
  )
}

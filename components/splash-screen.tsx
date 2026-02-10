"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [progress, setProgress] = useState(6)
  const [ready, setReady] = useState(false)

  const startRef = useRef<number>(0)
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Mindestzeit → damit jeder alles erkennt
  const MIN_SHOW_MS = 3500


  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Progress: langsam bis ~90%, dann wenn ready + Mindestdauer vorbei → 100%
  useEffect(() => {
    startRef.current = performance.now()
    let raf = 0

    const tick = (t: number) => {
      const elapsed = t - startRef.current

      setProgress((p) => {
        if (!ready || elapsed < MIN_SHOW_MS) {
          const target = 90
          const speed = prefersReducedMotion ? 0.02 : 0.014 // kleiner = langsamer
          const next = p + (target - p) * speed
          return Math.min(target, next)
        }

        const next = p + (100 - p) * 0.14
        return next > 99.4 ? 100 : next
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, prefersReducedMotion])

  // Ready: window load + fonts
  useEffect(() => {
    let cancelled = false
    const done = () => !cancelled && setReady(true)

    if (document.readyState === "complete") done()
    else window.addEventListener("load", done)

    const fontsReady = (document as any).fonts?.ready
    if (fontsReady?.then) fontsReady.then(done).catch(() => {})

    return () => {
      cancelled = true
      window.removeEventListener("load", done)
    }
  }, [])

  // Wenn 100: fade + hide
  useEffect(() => {
    if (progress < 100) return

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 320)
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      document.body.style.backgroundColor = "white"
    }, 1200)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [progress])

  // Subtiler 3D-Tilt (Desktop)
  useEffect(() => {
    if (prefersReducedMotion) return
    const el = cardRef.current
    if (!el) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - (r.left + r.width / 2)) / r.width
      const y = (e.clientY - (r.top + r.height / 2)) / r.height
      el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(
        2
      )}deg) rotateY(${(x * 8).toFixed(2)}deg)`
    }

    const reset = () => {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)"
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", reset)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", reset)
    }
  }, [prefersReducedMotion])

  if (!isVisible) return null
  const pct = Math.round(progress)

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background */}
      <div className="absolute inset-0 emd-bg" />
      <div className="absolute inset-0 emd-grain opacity-[0.10]" />

      <div
        ref={cardRef}
        className="relative flex flex-col items-center gap-6 select-none"
        style={{ transform: "perspective(900px) rotateX(0deg) rotateY(0deg)" }}
      >
        {/* Logo (OHNE Ring) */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32">
          {/* Glow */}
          <div className="absolute inset-[-18px] sm:inset-[-22px] rounded-full emd-glow" />

          {/* Light sweep */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="emd-sweep" />
          </div>

          <Image
            src="/images/emd-logo.png"
            alt="EMD Dart Logo"
            width={128}
            height={128}
            className="relative z-10 object-contain drop-shadow-2xl"
            priority
          />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white text-shadow text-center">
          Offizielle Website des EMD
        </h1>

        {/* Progress */}
        <div className="w-64 sm:w-80">
          <div className="flex justify-between mb-2 text-white/80 text-sm font-semibold">
            <span>Lade Inhalte…</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 emd-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center text-[11px] sm:text-xs text-white/70">
            {pct < 100 ? "Bitte kurz warten…" : "Bereit!"}
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .emd-bg {
          background: radial-gradient(
              1100px circle at 25% 20%,
              rgba(255, 255, 255, 0.11),
              transparent 55%
            ),
            radial-gradient(
              900px circle at 80% 70%,
              rgba(255, 255, 255, 0.08),
              transparent 55%
            ),
            linear-gradient(135deg, #f97316, #ea580c, #c2410c);
          background-size: 150% 150%;
          animation: emdBgMove 18s ease-in-out infinite;
        }
        @keyframes emdBgMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .emd-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
          pointer-events: none;
        }

        .emd-glow {
          background: radial-gradient(
            closest-side,
            rgba(255, 255, 255, 0.22),
            rgba(255, 255, 255, 0.1) 40%,
            transparent 70%
          );
          animation: emdGlowPulse 3.2s ease-in-out infinite;
          filter: blur(1px);
        }
        @keyframes emdGlowPulse {
          0% {
            transform: scale(0.98);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
          100% {
            transform: scale(0.98);
            opacity: 0.78;
          }
        }

        .emd-sweep {
          position: absolute;
          top: -30%;
          left: -70%;
          width: 55%;
          height: 160%;
          transform: rotate(20deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          animation: emdSweep 3.6s ease-in-out infinite;
          opacity: 0.85;
          filter: blur(0.3px);
        }
        @keyframes emdSweep {
          0% {
            transform: translateX(-30%) rotate(20deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateX(320%) rotate(20deg);
            opacity: 0;
          }
        }

        .emd-fill {
          transition: width 220ms ease;
          filter: drop-shadow(0 6px 14px rgba(255, 255, 255, 0.18));
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}

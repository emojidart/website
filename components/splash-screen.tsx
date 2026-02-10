"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 5500)

    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      document.body.style.backgroundColor = "white"
    }, 6500)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 flex items-center justify-center transition-opacity duration-700 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="animate-splash-logo-enter flex items-center justify-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32 relative">
            <Image
              src="/images/emd-logo.png"
              alt="EMD Dart Logo"
              width={128}
              height={128}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        <div className="animate-splash-text-enter text-center">
          <h1 className="text-2xl sm:text-4xl font-black text-white text-shadow">
            Offizielle Website des EMD
          </h1>
          
        </div>

        {/* Ladebalken (wie SplashIntro) */}
        <div className="animate-splash-dots-enter mt-4 w-64 sm:w-80">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div className="emd-splash-bar h-full rounded-full bg-white/85" />
          </div>
          <div className="mt-3 text-center text-xs sm:text-sm font-semibold text-white/80">
            Bitte einen Moment – wir bereiten alles vor.
          </div>
        </div>

        {/* CSS nur für den Balken (kein Tailwind-Config nötig) */}
        <style jsx global>{`
          .emd-splash-bar {
            width: 42%;
            transform: translateX(-130%);
            animation: emdSplashBar 1.05s ease-in-out infinite;
            filter: drop-shadow(0 6px 14px rgba(255, 255, 255, 0.25));
          }
          @keyframes emdSplashBar {
            0% {
              transform: translateX(-130%);
              opacity: 0.65;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(240%);
              opacity: 0.75;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

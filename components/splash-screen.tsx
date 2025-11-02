"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 5000)

    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 6000)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 flex items-center justify-center transition-opacity duration-1000 ${
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
          <h1 className="text-2xl sm:text-4xl font-black text-white text-shadow">EMD Dart</h1>
          <p className="text-white/80 text-sm sm:text-base mt-2">Willkommen</p>
        </div>

        <div className="animate-splash-dots-enter flex gap-1.5 mt-4">
          <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  )
}

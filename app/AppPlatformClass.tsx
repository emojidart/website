"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

export default function AppPlatformClass() {
  useEffect(() => {
    try {
      if (Capacitor.isNativePlatform()) {
        document.documentElement.classList.add("is-native")
      } else {
        document.documentElement.classList.remove("is-native")
      }
    } catch {}
  }, [])

  return null
}

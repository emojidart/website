"use client"

import { useEffect } from "react"

export default function StatusBarFix() {
  useEffect(() => {
    ;(async () => {
      try {
        const core = await import("@capacitor/core")
        if (!core.Capacitor.isNativePlatform()) return

        const sb = await import("@capacitor/status-bar")

        await sb.StatusBar.setOverlaysWebView({ overlay: false })
        await sb.StatusBar.setBackgroundColor({ color: "#ffffff" })
        await sb.StatusBar.setStyle({ style: sb.Style.Dark })
      } catch {
        // Plugin nicht verfügbar -> ignoriere
      }
    })()
  }, [])

  return null
}
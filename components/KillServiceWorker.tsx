"use client"
import { useEffect } from "react"

export default function KillServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister())
    })

    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
  }, [])

  return null
}
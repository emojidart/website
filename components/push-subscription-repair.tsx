"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

export function PushSubscriptionRepair() {
  const { user } = useAuth()
  const ranRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      if (!user) return
      if (ranRef.current) return
      ranRef.current = true

      try {
        if (!("serviceWorker" in navigator)) return
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!sub) return

        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        // wichtig: wir schicken das echte PushSubscription-Objekt (endpoint + keys)
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
              auth: arrayBufferToBase64(sub.getKey("auth")!),
            },
          }),
        })
      } catch (e) {
        // absichtlich still: Repair soll nicht nerven
        console.warn("[push-repair] failed:", e)
      }
    }

    run()
  }, [user])

  return null
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return window.btoa(binary)
}

"use client"

import { useEffect } from "react"
import { App } from "@capacitor/app"
import { supabase } from "@/lib/supabase"

export default function SupabaseSessionGuard() {
  useEffect(() => {
    const sub = App.addListener("appStateChange", async ({ isActive }) => {
  if (!isActive) return

  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    await supabase.auth.refreshSession()
  }
})

return () => {
  sub.then((listener) => listener.remove())
}
  }, [])

  return null
}
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useStartseitenAuthUser() {
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setAuthUserId(data.session?.user?.id ?? null)
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  return authUserId
}

"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useKratzerAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const applyUser = (nextUser: any) => {
      if (!mounted) return

      setCurrentUser((previousUser: any) => {
        const previousId = previousUser?.id ?? null
        const nextId = nextUser?.id ?? null

        // Supabase kann bei INITIAL_SESSION, SIGNED_IN und TOKEN_REFRESH
        // denselben Benutzer mehrfach liefern. Solange sich die User-ID
        // nicht ändert, behalten wir dasselbe State-Objekt und verhindern
        // damit unnötige Folge-Effects auf der Kratzer-Seite.
        if (previousId === nextId) return previousUser

        return nextUser
      })

      setLoading(false)
    }

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      applyUser(user)
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user || null)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return {
    currentUser,
    setCurrentUser,
    loading,
    setLoading,
  }
}
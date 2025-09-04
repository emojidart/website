"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  authMessage: string
  setAuthMessage: (message: string) => void
  // <CHANGE> Added admin status
  isAdmin: boolean
  adminLoading: boolean
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState("")
  // <CHANGE> Added admin state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  // <CHANGE> Function to check admin status
  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("user_profiles").select("is_admin").eq("user_id", userId).single()

      if (error) {
        console.error("Error checking admin status:", error)
        setIsAdmin(false)
      } else {
        setIsAdmin(data?.is_admin || false)
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)

      // <CHANGE> Check admin status when user changes
      if (session?.user) {
        checkAdminStatus(session.user.id)
      } else {
        setIsAdmin(false)
        setAdminLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)

      // <CHANGE> Check admin status on initial load
      if (session?.user) {
        checkAdminStatus(session.user.id)
      } else {
        setIsAdmin(false)
        setAdminLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { session, user, loading, authMessage, setAuthMessage, isAdmin, adminLoading }
}

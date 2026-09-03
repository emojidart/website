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
  clubRoles: string[]
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState("")
  // <CHANGE> Added admin state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)
  const [clubRoles, setClubRoles] = useState<string[]>([])

  // <CHANGE> Function to check admin status + club roles
  const checkAdminStatus = async (userId: string) => {
    try {
      // Admin-Flag kann je nach Schema entweder über user_id ODER über id = auth.uid() gespeichert sein.
      // Wir probieren zuerst user_id, dann fallback auf id.
      let isAdminValue = false

      const { data: byUserId, error: errUserId } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", userId)
        .maybeSingle()

      if (errUserId) {
        console.error("Error checking admin status (user_id):", errUserId)
      }
      if (byUserId?.is_admin) {
        isAdminValue = true
      } else {
        const { data: byId, error: errId } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("id", userId)
          .maybeSingle()

        if (errId) {
          console.error("Error checking admin status (id):", errId)
        }
        if (byId?.is_admin) isAdminValue = true
      }

      setIsAdmin(!!isAdminValue)

      // Club-Rollen laden (Supervisor/Kassier/...)
      const { data: rolesData, error: rolesError } = await supabase
        .from("club_roles")
        .select("role")
        .eq("user_id", userId)

      if (rolesError) {
        console.error("Error loading club roles:", rolesError)
        setClubRoles([])
      } else {
        setClubRoles((rolesData || []).map((r: any) => r.role).filter(Boolean))
      }
    } catch (error) {
      console.error("Error checking admin/roles:", error)
      setIsAdmin(false)
      setClubRoles([])
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let authEventVersion = 0

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return

      setSession(nextSession)
      setUser(nextSession?.user || null)
      setLoading(false)

      if (nextSession?.user) {
        setAdminLoading(true)
        void checkAdminStatus(nextSession.user.id)
      } else {
        setIsAdmin(false)
        setClubRoles([])
        setAdminLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1
      applySession(nextSession)
    })

    const initialVersion = authEventVersion

    void supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mounted) return

      if (error) {
        console.error("Error loading auth session:", error)
        if (authEventVersion === initialVersion) {
          applySession(null)
        }
        return
      }

      // Wenn inzwischen SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED ausgelöst wurde,
      // darf das ältere getSession-Ergebnis den aktuellen Auth-State nicht überschreiben.
      if (authEventVersion !== initialVersion) return

      applySession(initialSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { session, user, loading, authMessage, setAuthMessage, isAdmin, adminLoading, clubRoles }
}

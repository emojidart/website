"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  GUEST_HOME_ROUTE,
  GUEST_LOGIN_ROUTE,
  MEMBER_HOME_ROUTE,
  MEMBER_LOGIN_ROUTE,
  isForbiddenForGuestsPath,
  isGuestPath,
  isProtectedMemberPath,
  isPublicPath,
} from "@/lib/access-control"

type UserAccessProfile = {
  is_guest: boolean | null
  is_blocked: boolean | null
  blocked_reason: string | null
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        <div className="text-sm font-bold text-gray-600">
          Zugriff wird geprüft...
        </div>
      </div>
    </div>
  )
}

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkAccess = async () => {
      try {
        setChecking(true)

        if (authLoading) return

        const pathIsPublic = isPublicPath(pathname)
        const pathIsGuest = isGuestPath(pathname)
        const pathIsMemberProtected = isProtectedMemberPath(pathname)

        if (!session?.user) {
          if (pathIsMemberProtected) {
            router.replace(MEMBER_LOGIN_ROUTE)
            return
          }

          if (pathIsGuest && pathname !== GUEST_LOGIN_ROUTE) {
            router.replace(GUEST_LOGIN_ROUTE)
            return
          }

          if (mounted) setChecking(false)
          return
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("is_guest,is_blocked,blocked_reason")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error("[AppRouteGuard] Profil konnte nicht geprüft werden:", error)
          setChecking(false)
          return
        }

        const userProfile = profile as UserAccessProfile | null

        if (!userProfile) {
          setChecking(false)
          return
        }

        if (userProfile.is_blocked) {
          await supabase.auth.signOut()

          if (userProfile.is_guest) {
            router.replace(GUEST_LOGIN_ROUTE)
            return
          }

          router.replace(MEMBER_LOGIN_ROUTE)
          return
        }

        if (userProfile.is_guest) {
          if (isForbiddenForGuestsPath(pathname)) {
            router.replace(GUEST_HOME_ROUTE)
            return
          }

          if (!pathIsPublic && !pathIsGuest) {
            router.replace(GUEST_HOME_ROUTE)
            return
          }

          setChecking(false)
          return
        }

        if (!userProfile.is_guest && pathIsGuest) {
          router.replace(MEMBER_HOME_ROUTE)
          return
        }

        setChecking(false)
      } catch (err) {
        console.error("[AppRouteGuard] Fehler:", err)
        if (mounted) setChecking(false)
      }
    }

    void checkAccess()

    return () => {
      mounted = false
    }
  }, [authLoading, session?.user, pathname, router])

  if (checking || authLoading) {
    return <LoadingScreen />
  }

  return <>{children}</>
}
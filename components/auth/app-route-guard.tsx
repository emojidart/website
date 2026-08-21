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
  MEMBER_MEMBERSHIP_ROUTE,
  isForbiddenForGuestsPath,
  isGuestPath,
  isProtectedMemberPath,
  isPublicPath,
} from "@/lib/access-control"

type UserAccessProfile = {
  player_id: string | null
  is_guest: boolean | null
  is_admin: boolean | null
  is_blocked: boolean | null
  blocked_reason: string | null
}

function isPublicDachEventsPath(pathname: string) {
  if (pathname === "/dach-veranstaltungen") return true

  const parts = pathname.split("/").filter(Boolean)

  // Öffentliche Detailseite: /dach-veranstaltungen/[id]
  return (
    parts.length === 2 &&
    parts[0] === "dach-veranstaltungen" &&
    !["neu", "meine", "nachrichten"].includes(parts[1])
  )
}

function isDachEventsManagementPath(pathname: string) {
  return (
    pathname === "/dach-veranstaltungen/neu" ||
    pathname === "/dach-veranstaltungen/meine" ||
    /^\/dach-veranstaltungen\/[^/]+\/bearbeiten$/.test(pathname)
  )
}

function isPublicDartMarketplacePath(pathname: string) {
  if (pathname === "/dartboerse") return true

  const parts = pathname.split("/").filter(Boolean)

  // Öffentliche Detailseite: /dartboerse/[id]
  return (
    parts.length === 2 &&
    parts[0] === "dartboerse" &&
    !["neu", "meine", "nachrichten"].includes(parts[1])
  )
}

function isDartMarketplaceManagementPath(pathname: string) {
  return (
    pathname === "/dartboerse/neu" ||
    pathname === "/dartboerse/meine" ||
    pathname === "/dartboerse/nachrichten" ||
    /^\/dartboerse\/nachrichten\/[^/]+$/.test(pathname) ||
    /^\/dartboerse\/[^/]+\/bearbeiten$/.test(pathname)
  )
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

        const pathIsPublic =
          isPublicPath(pathname) ||
          isPublicDachEventsPath(pathname) ||
          isPublicDartMarketplacePath(pathname)

        const pathIsGuest = isGuestPath(pathname)
        const pathIsDachManagement = isDachEventsManagementPath(pathname)
        const pathIsDartMarketplaceManagement =
          isDartMarketplaceManagementPath(pathname)
        const pathIsSharedManagement =
          pathIsDachManagement || pathIsDartMarketplaceManagement
        const pathIsMemberProtected = isProtectedMemberPath(pathname)
        const pathIsMembershipPayment = pathname === MEMBER_MEMBERSHIP_ROUTE

        if (!session?.user) {
          if (pathIsMemberProtected) {
            router.replace(MEMBER_LOGIN_ROUTE)
            return
          }

          if (
            (pathIsGuest || pathIsSharedManagement) &&
            pathname !== GUEST_LOGIN_ROUTE
          ) {
            router.replace(GUEST_LOGIN_ROUTE)
            return
          }

          if (mounted) setChecking(false)
          return
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("player_id,is_guest,is_admin,is_blocked,blocked_reason")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error(
            "[AppRouteGuard] Profil konnte nicht geprüft werden:",
            error,
          )
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
          // DACH-Veranstaltungen und Dartbörse sind ausdrücklich auch für
          // freigeschaltete Gastzugänge erlaubt.
          if (
            isForbiddenForGuestsPath(pathname) &&
            !pathIsPublic &&
            !pathIsSharedManagement
          ) {
            router.replace(GUEST_HOME_ROUTE)
            return
          }

          if (!pathIsPublic && !pathIsGuest && !pathIsSharedManagement) {
            router.replace(GUEST_HOME_ROUTE)
            return
          }

          setChecking(false)
          return
        }

        // Die Grundmitgliedschaft wird nur dann verpflichtend geprüft,
        // wenn ein aufgenommenes Vereinsmitglied sein Mitgliederprofil öffnet.
        // Andere geschützte Seiten werden durch diese Membership-Prüfung
        // nicht automatisch auf /member-membership umgeleitet.
        const shouldRequireBaseMembership =
          !userProfile.is_guest &&
          pathname === "/member-profile-app" &&
          !pathIsMembershipPayment

        if (shouldRequireBaseMembership) {
          const currentPlayerId = userProfile.player_id
          let hasActiveBaseMembership = false

          if (currentPlayerId) {
            const [{ data: baseModules, error: baseModuleError }, { data: activeMemberships, error: membershipError }] =
              await Promise.all([
                supabase
                  .from("membership_modules")
                  .select("id")
                  .eq("is_required_base", true)
                  .eq("is_active", true),
                supabase
                  .from("member_memberships")
                  .select("id")
                  .eq("player_id", currentPlayerId)
                  .eq("status", "active"),
              ])

            if (baseModuleError) {
              console.error("[AppRouteGuard] Grundmodul konnte nicht geprüft werden:", baseModuleError)
            } else if (membershipError) {
              console.error("[AppRouteGuard] Mitgliedschaft konnte nicht geprüft werden:", membershipError)
            } else {
              const baseModuleIds = (baseModules || []).map((row: any) => String(row.id))
              const membershipIds = (activeMemberships || []).map((row: any) => String(row.id))

              if (baseModuleIds.length > 0 && membershipIds.length > 0) {
                const { data: baseRows, error: baseRowsError } = await supabase
                  .from("member_membership_modules")
                  .select("membership_id,module_id")
                  .in("membership_id", membershipIds)
                  .in("module_id", baseModuleIds)
                  .limit(1)

                if (baseRowsError) {
                  console.error("[AppRouteGuard] Grundmitgliedschaft konnte nicht geprüft werden:", baseRowsError)
                } else {
                  hasActiveBaseMembership = (baseRows || []).length > 0
                }
              }
            }
          }

          if (!hasActiveBaseMembership) {
            router.replace(`${MEMBER_MEMBERSHIP_ROUTE}?required=base`)
            return
          }
        }

        // Mitglieder dürfen ebenfalls alle Dartbörsen- und
        // DACH-Veranstaltungsseiten verwenden. /member-membership ist bewusst
        // auch für bereits aufgenommene Gäste erreichbar und darf bei normalen
        // Mitgliedern deshalb nicht auf die Startseite umgeleitet werden.
        if (
          !userProfile.is_guest &&
          pathIsGuest &&
          !pathIsSharedManagement &&
          !pathIsMembershipPayment
        ) {
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

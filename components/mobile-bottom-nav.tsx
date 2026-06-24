"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Trophy,
  Users,
  UserCircle,
  LogIn,
  MoreHorizontal,
  HelpCircle,
  LogOut,
  MessageCircle,
  Images,
  LayoutDashboard,
  History,
  Radio,
  CreditCard,
  X,
  Building2,
  CalendarDays,
  ClipboardList,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type NavItem = {
  key: string
  name: string
  href?: string
  icon: LucideIcon
  requiresLogin?: boolean
  adminOnly?: boolean
  memberOnly?: boolean
  guestOnly?: boolean
  danger?: boolean
  onClick?: () => void
}

type Section = {
  title: string
  variant?: "grid" | "list"
  items: NavItem[]
}

/** ---------- CONFIG ---------- */

const BOTTOM_BAR: NavItem[] = [
  { key: "home", name: "Home", href: "/", icon: Home },
  { key: "events", name: "Events", href: "/veranstaltungen", icon: CalendarDays },
  { key: "liga", name: "Liga", href: "/liga-statistiken-app", icon: Trophy },
  { key: "verein", name: "Verein", href: "/new-club", icon: Users },
]

const QUICK_BASE: Omit<NavItem, "key">[] = [
  { name: "Lion Cup", href: "/tournament-series-app", icon: Trophy },
  { name: "Live", href: "/live-all-app", icon: Radio },
  { name: "History", href: "/tournament-history", icon: History },
  {
    name: "Chat",
    href: "/chat-app",
    icon: MessageCircle,
    requiresLogin: true,
  },
  {
    name: "Vereinskalender",
    href: "/vereinskalender-app",
    icon: CalendarDays,
    requiresLogin: true,
    memberOnly: true,
  },
  {
    name: "Aufstellung",
    href: "/member-availability",
    icon: ClipboardList,
    requiresLogin: true,
    memberOnly: true,
  },
]

const LIVE_ITEMS: NavItem[] = [
  { key: "liveticker", name: "Liveticker", href: "/live-all-app", icon: Radio },
  { key: "livestream", name: "Livestream", href: "/livestream", icon: Radio },
]

const INFO_ITEMS: NavItem[] = [
  { key: "emd", name: "EMD Campus", href: "/emd-campus", icon: Building2 },
  { key: "faq", name: "FAQ", href: "/faq", icon: MessageCircle },
  { key: "about", name: "Über uns", href: "/uber-uns", icon: HelpCircle },
  { key: "kontakt", name: "Kontakt", href: "/kontakt", icon: MessageCircle },
]

/** ---------- HELPERS ---------- */

function filterByAuth(
  items: NavItem[],
  isLoggedIn: boolean,
  isAdmin: boolean,
  isGuest: boolean,
) {
  return items.filter((it) => {
    if (it.requiresLogin && !isLoggedIn) return false
    if (it.adminOnly && (!isLoggedIn || !isAdmin || isGuest)) return false
    if (it.memberOnly && (!isLoggedIn || isGuest)) return false
    if (it.guestOnly && (!isLoggedIn || !isGuest)) return false
    return true
  })
}

function NavLink({
  item,
  onAfter,
  className,
}: {
  item: NavItem
  onAfter?: () => void
  className?: string
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href!}
      onClick={onAfter}
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 border border-transparent",
        "hover:bg-gray-50 text-gray-900",
        className,
      )}
    >
      <Icon className="h-5 w-5 text-orange-600" />
      <span className="font-semibold">{item.name}</span>
    </Link>
  )
}

function NavButton({ item, className }: { item: NavItem; className?: string }) {
  const Icon = item.icon

  return (
    <button
      onClick={item.onClick}
      className={cn(
        "flex items-center gap-3 w-full rounded-xl p-3 border border-transparent font-semibold",
        item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-900 hover:bg-gray-50",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
      {item.name}
    </button>
  )
}

/** ---------- COMPONENT ---------- */

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()

  const isLoggedIn = !!user

  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  const closeMore = useCallback(() => setIsMoreOpen(false), [])
  const toggleMore = useCallback(() => setIsMoreOpen((v) => !v), [])

  useEffect(() => {
    let mounted = true

    const loadGuestStatus = async () => {
      try {
        setProfileChecked(false)

        if (!user?.id) {
          if (!mounted) return
          setIsGuest(false)
          setProfileChecked(true)
          return
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .select("is_guest")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.error("[MobileBottomNav] Gaststatus konnte nicht geladen werden:", error)
          setIsGuest(false)
          setProfileChecked(true)
          return
        }

        setIsGuest(Boolean(data?.is_guest))
        setProfileChecked(true)
      } catch (error) {
        console.error("[MobileBottomNav] Gaststatus Fehler:", error)
        if (!mounted) return
        setIsGuest(false)
        setProfileChecked(true)
      }
    }

    void loadGuestStatus()

    return () => {
      mounted = false
    }
  }, [user?.id])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    closeMore()
    router.push("/")
  }, [closeMore, router])

  useEffect(() => {
    if (!isMoreOpen) return

    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeMore()

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isMoreOpen, closeMore])

  const sections: Section[] = useMemo(() => {
    const profileHref = isLoggedIn
      ? isGuest
        ? "/guest-profile-app"
        : "/member-profile-app"
      : "/login"

    const profileName = isLoggedIn ? (isGuest ? "Gast-Profil" : "Profil") : "Login"

    const quickRaw: NavItem[] = [
      ...QUICK_BASE.map((x) => ({
        ...x,
        key: `q_${x.name}`,
        name: x.name,
        href: x.name === "Chat" && isGuest ? "/chat-app?scope=community" : x.href,
      })),
      {
        key: "q_profile",
        name: profileName,
        href: profileHref,
        icon: isLoggedIn ? UserCircle : LogIn,
      },
    ]

    const accountRaw: NavItem[] = [
      {
        key: "admin",
        name: "Admin",
        href: "/admin",
        icon: LayoutDashboard,
        adminOnly: true,
      },
      {
        key: "card",
        name: "Mitgliedskarte",
        href: "/member-card",
        icon: CreditCard,
        requiresLogin: true,
        memberOnly: true,
      },
      {
        key: "gallery",
        name: "Match Galerie",
        href: "/match-galerie",
        icon: Images,
        requiresLogin: true,
        memberOnly: true,
      },
      {
        key: "logout",
        name: "Abmelden",
        icon: LogOut,
        danger: true,
        requiresLogin: true,
        onClick: handleLogout,
      },
    ]

    const quick = filterByAuth(quickRaw, isLoggedIn, isAdmin, isGuest)
    const account = filterByAuth(accountRaw, isLoggedIn, isAdmin, isGuest)
    const live = filterByAuth(LIVE_ITEMS, isLoggedIn, isAdmin, isGuest)
    const info = filterByAuth(INFO_ITEMS, isLoggedIn, isAdmin, isGuest)

    return [
      { title: "Schnellzugriff", variant: "grid", items: quick },
      { title: "Account", variant: "list", items: account },
      { title: "Live", variant: "list", items: live },
      { title: "Info", variant: "list", items: info },
    ]
  }, [isLoggedIn, isAdmin, isGuest, handleLogout])

  const BOTTOM_OFFSET = "0px"
  const SPACER_H = "calc(4rem + max(12px, env(safe-area-inset-bottom)))"

  if (loading || (isLoggedIn && !profileChecked)) {
    return <div className="md:hidden" style={{ height: SPACER_H }} />
  }

  return (
    <>
      {/* Spacer: Content hat unten Platz für fixed Nav + Offset */}
      <div className="md:hidden" style={{ height: SPACER_H }} />

      {/* MORE OVERLAY */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            aria-label="Schließen"
            className="absolute inset-0 bg-black/40"
            onClick={closeMore}
          />

          {/* Sheet sitzt über Nav + Offset */}
          <div className="absolute left-0 right-0 bottom-0" style={{ paddingBottom: SPACER_H }}>
            <div className="mx-3 overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b bg-white p-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Mehr Optionen
                </h3>

                <button
                  onClick={closeMore}
                  className="rounded-lg p-2 hover:bg-gray-100"
                  aria-label="Schließen"
                >
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
                {sections.map((sec) => {
                  if (sec.items.length === 0) return null

                  return (
                    <section key={sec.title}>
                      <div className="mb-2 text-xs font-bold uppercase text-gray-500">
                        {sec.title}
                      </div>

                      {sec.variant === "grid" ? (
                        <div className="grid grid-cols-2 gap-2">
                          {sec.items.map((item) => (
                            <NavLink
                              key={item.key}
                              item={item}
                              onAfter={closeMore}
                              className="bg-white border border-gray-200 hover:bg-gray-50"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sec.items.map((item) =>
                            item.onClick ? (
                              <NavButton key={item.key} item={item} />
                            ) : (
                              <NavLink key={item.key} item={item} onAfter={closeMore} />
                            ),
                          )}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav
        className="fixed left-0 right-0 bottom-0 z-50 md:hidden border-t border-gray-200 bg-white shadow-2xl"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="grid h-16 grid-cols-5">
          {BOTTOM_BAR.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.key}
                href={item.href!}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all",
                  isActive ? "text-orange-600" : "text-gray-500 hover:text-orange-600",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.6 : 2.2} />
                <span className="text-[10px] font-semibold">
                  {item.name}
                </span>
              </Link>
            )
          })}

          <button
            onClick={toggleMore}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all",
              isMoreOpen ? "text-orange-600" : "text-gray-500 hover:text-orange-600",
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-[10px] font-semibold">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
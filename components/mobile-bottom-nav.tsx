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
  LayoutDashboard,
  History,
  Radio,
  X,
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
  { name: "Turnierserien", href: "/turniere/serien", icon: Trophy },
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
        "group flex items-center gap-3 rounded-2xl border p-3 transition-all",
        "border-white/[0.07] bg-white/[0.035] text-white/65 hover:border-orange-300/20 hover:bg-orange-500/[0.08] hover:text-white",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-200 transition-colors group-hover:border-orange-300/20 group-hover:bg-orange-500/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span>
    </Link>
  )
}

function NavButton({ item, className }: { item: NavItem; className?: string }) {
  const Icon = item.icon

  return (
    <button
      onClick={item.onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border p-3 font-semibold transition-all",
        item.danger
          ? "border-red-400/10 bg-red-500/[0.05] text-red-300 hover:border-red-400/20 hover:bg-red-500/[0.09]"
          : "border-white/[0.07] bg-white/[0.035] text-white/65 hover:border-orange-300/20 hover:bg-orange-500/[0.08] hover:text-white",
        className,
      )}
    >
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
        item.danger
          ? "border-red-400/15 bg-red-500/10 text-red-300"
          : "border-white/10 bg-white/5 text-orange-200",
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{item.name}</span>
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
  const SPACER_H = "calc(4.5rem + max(10px, env(safe-area-inset-bottom)))"

  if (loading || (isLoggedIn && !profileChecked)) {
    return <div className="md:hidden" style={{ height: SPACER_H }} />
  }

  return (
    <>
      {/* Spacer: Content hat unten Platz für fixed Nav + Offset */}
      <div className="md:hidden" style={{ height: SPACER_H }} />

      {/* MORE OVERLAY */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            aria-label="Schließen"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onPointerUp={(event) => {
              event.preventDefault()
              event.stopPropagation()
              closeMore()
            }}
          />

          {/* Sheet sitzt über Nav + Offset */}
          <div className="absolute left-0 right-0 bottom-0" style={{ paddingBottom: SPACER_H }}>
            <div className="mx-3 overflow-hidden rounded-t-[28px] border border-white/10 bg-[#050608] shadow-[0_-28px_80px_-30px_rgba(0,0,0,.98)]">
              <div className="relative flex items-center justify-between overflow-hidden border-b border-white/10 bg-[#070a0f] p-4 text-white">
                <h3 className="text-lg font-black text-white">
                  Mehr Optionen
                </h3>

                <button
                  type="button"
                  onPointerUp={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    closeMore()
                  }}
                  className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-white/10 bg-white/5 p-0 text-white/50 transition hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[68vh] space-y-5 overflow-y-auto bg-[#050608] p-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
                {sections.map((sec) => {
                  if (sec.items.length === 0) return null

                  return (
                    <section key={sec.title}>
                      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                        {sec.title}
                      </div>

                      {sec.variant === "grid" ? (
                        <div className="grid grid-cols-2 gap-2">
                          {sec.items.map((item) => (
                            <NavLink
                              key={item.key}
                              item={item}
                              onAfter={closeMore}
                              className="min-h-[74px] rounded-2xl"
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
        className="fixed inset-x-0 bottom-0 z-[90] md:hidden pointer-events-none"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto mx-2 overflow-hidden rounded-[22px] border border-white/10 bg-[#06080d]/96 shadow-[0_-16px_46px_-24px_rgba(0,0,0,.98)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] h-[68px] rounded-[22px] bg-[radial-gradient(circle_at_50%_110%,rgba(249,115,22,.12),transparent_52%)]" />
          <div className="relative grid h-[68px] grid-cols-5 px-1">
            {BOTTOM_BAR.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.key}
                  href={item.href!}
                  className="group flex min-h-[58px] min-w-0 touch-manipulation select-none items-center justify-center px-0.5"
                >
                  <span
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all",
                      isActive
                        ? "bg-orange-500/[0.12] text-orange-200 shadow-[0_0_24px_rgba(249,115,22,.08)]"
                        : "text-white/38 group-active:bg-white/[0.05] group-active:text-white/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-9 items-center justify-center rounded-xl border transition-all",
                        isActive
                          ? "border-orange-300/20 bg-orange-500/10 text-orange-200"
                          : "border-transparent bg-transparent text-white/42",
                      )}
                    >
                      <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.5 : 2.1} />
                    </span>
                    <span className={cn(
                      "max-w-[62px] truncate text-[9px] font-bold leading-none",
                      isActive ? "text-orange-100" : "text-white/38",
                    )}>
                      {item.name}
                    </span>
                  </span>
                </Link>
              )
            })}

            <button
              type="button"
              onPointerUp={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsMoreOpen(true)
              }}
              className="group relative z-[2] flex min-h-[58px] min-w-0 touch-manipulation select-none items-center justify-center px-0.5"
              aria-label="Mehr Optionen"
              aria-expanded={isMoreOpen}
            >
              <span
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all",
                  isMoreOpen
                    ? "bg-orange-500/[0.12] text-orange-200 shadow-[0_0_24px_rgba(249,115,22,.08)]"
                    : "text-white/38 group-active:bg-white/[0.05] group-active:text-white/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-9 items-center justify-center rounded-xl border transition-all",
                    isMoreOpen
                      ? "border-orange-300/20 bg-orange-500/10 text-orange-200"
                      : "border-transparent bg-transparent text-white/42",
                  )}
                >
                  <MoreHorizontal className="h-[19px] w-[19px]" />
                </span>
                <span className={cn(
                  "text-[9px] font-bold leading-none",
                  isMoreOpen ? "text-orange-100" : "text-white/38",
                )}>
                  Mehr
                </span>
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
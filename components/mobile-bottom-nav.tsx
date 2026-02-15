"use client"

import { useEffect, useMemo, useState } from "react"
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
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type NavItem = {
  name: string
  href: string
  icon: any
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()
  const isLoggedIn = !!user
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const closeMore = () => setIsMoreMenuOpen(false)

  useEffect(() => {
    if (!isMoreMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMore()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isMoreMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    closeMore()
    router.push("/")
  }

  /* ===== MAIN BAR ===== */
  const staticNavItems: NavItem[] = useMemo(
    () => [
      { name: "Home", href: "/", icon: Home },
      { name: "Events", href: "/veranstaltungen", icon: CalendarDays },
      { name: "Liga", href: "/liga-statistiken-app", icon: Trophy },
      { name: "Verein", href: "/new-club", icon: Users },
    ],
    [],
  )

  /* ===== QUICK BAR ===== */
  const quickItems: NavItem[] = useMemo(
    () => [
      { name: "Lion Cup", href: "/tournament-series-app", icon: Trophy },
      { name: "Live", href: "/live-all-app", icon: Radio },
      { name: "History", href: "/tournament-history", icon: History },
      {
        name: isLoggedIn ? "Profil" : "Login",
        href: isLoggedIn ? "/member-profile-app" : "/member-login",
        icon: isLoggedIn ? UserCircle : LogIn,
      },
    ],
    [isLoggedIn],
  )

  /* ===== MORE MENU ===== */
  const moreMenuItems = useMemo(() => {
    const items: any[] = [
      {
        name: isLoggedIn ? "Profil" : "Login",
        href: isLoggedIn ? "/member-profile-app" : "/member-login",
        icon: isLoggedIn ? UserCircle : LogIn,
        action: null,
      },
      {
        name: "Mitgliedskarte",
        href: "/member-card",
        icon: CreditCard,
        action: null,
        requiresLogin: true,
      },
      { name: "Liveticker", href: "/live-all-app", icon: Radio, action: null },
      { name: "Livestream", href: "/livestream", icon: Radio, action: null },
      { name: "EMD Campus", href: "/emd-campus", icon: Building2, action: null },
      { name: "Match Galerie", href: "/match-galerie", icon: Images, action: null, requiresLogin: true },
      { name: "FAQ", href: "/faq", icon: MessageCircle, action: null },
      { name: "Über uns", href: "/uber-uns", icon: HelpCircle, action: null },
      { name: "Kontakt", href: "/kontakt", icon: MessageCircle, action: null },
    ]

    let filtered = items.filter((it) => !(it.requiresLogin && !isLoggedIn))

    if (isAdmin) {
      filtered.splice(5, 0, { name: "Admin", href: "/admin", icon: LayoutDashboard, action: null })
    }

    if (isLoggedIn) {
      filtered.push({ name: "Abmelden", href: "#", icon: LogOut, action: handleLogout, danger: true })
    }

    return filtered
  }, [isLoggedIn, isAdmin])

  /* ===== HELPERS ===== */
  const QuickLink = ({ href, name, icon }: NavItem) => {
    const active = pathname === href
    const Icon = icon
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center justify-center gap-1 text-xs font-semibold px-2",
          active ? "text-orange-600" : "text-gray-700 hover:text-gray-900",
        )}
        onClick={closeMore}
      >
        <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2.3} />
        <span className="truncate">{name}</span>
      </Link>
    )
  }

  if (loading) return <div className="h-28 md:hidden" />

  return (
    <>
      {/* Spacer damit Content nicht unter der Nav liegt */}
      <div className="h-28 md:hidden" />

      {/* ===== MORE OVERLAY ===== */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop - klick schließt */}
          <button aria-label="Schließen" className="absolute inset-0 bg-black/30" onClick={closeMore} />

          {/* Bottom Sheet */}
          <div className="absolute left-0 right-0 bottom-0 pb-28 safe-pb">
            <div className="mx-3 rounded-t-2xl bg-white shadow-2xl border overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                  <h3 className="text-lg font-semibold ml-2">Mehr Optionen</h3>
                </div>
                <button
                  aria-label="Schließen"
                  onClick={closeMore}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto px-4 pb-4 space-y-2">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon
                  const danger = item.danger

                  if (item.action) {
                    return (
                      <button
                        key={item.name}
                        onClick={item.action}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg w-full text-left transition-colors",
                          danger ? "text-red-600 font-semibold hover:bg-red-50" : "hover:bg-gray-100 text-gray-900",
                        )}
                      >
                        <Icon className={cn("h-6 w-6", danger ? "text-red-600" : "text-gray-800")} strokeWidth={2.3} />
                        <span>{item.name}</span>
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 text-gray-900"
                      onClick={closeMore}
                    >
                      <Icon className="h-6 w-6 text-gray-800" strokeWidth={2.3} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== NAV ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-pb">
        {/* Quickbar */}
        <div className="mx-3 mb-2 rounded-2xl bg-white/90 backdrop-blur border shadow-lg">
          <div className="grid grid-cols-4 h-10">
            {quickItems.map((q) => (
              <QuickLink key={q.href} {...q} />
            ))}
          </div>
        </div>

        {/* Main Bar */}
        <div className="bg-white border-t shadow-lg">
          <div className="grid grid-cols-5 h-16">
            {staticNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1",
                    isActive ? "text-orange-600" : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2.3} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              )
            })}

            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                isMoreMenuOpen ? "text-orange-600" : "text-gray-600 hover:text-gray-900",
              )}
            >
              <MoreHorizontal className="h-6 w-6" />
              <span className="text-[10px] font-medium">Mehr</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

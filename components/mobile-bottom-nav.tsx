"use client"

import { useState } from "react"
import {
  Home,
  Trophy,
  Users,
  UserCircle,
  LogIn,
  Table,
  MoreHorizontal,
  HelpCircle,
  LogOut,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isLoggedIn = !!user
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMoreMenuOpen(false)
    router.push("/")
  }

  const staticNavItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Turniere",
      href: "/veranstaltungen",
      icon: Trophy,
    },
    {
      name: "Liga",
      href: "/liga-statistiken-app",
      icon: Table,
    },
    {
      name: "Verein",
      href: "/new-club",
      icon: Users,
    },
  ]

  const moreMenuItems = [
    {
      name: isLoggedIn ? "Profil" : "Login",
      href: isLoggedIn ? "/member-profile-app" : "/member-login",
      icon: isLoggedIn ? UserCircle : LogIn,
      action: null,
    },
    {
      name: "FAQ",
      href: "/faq",
      icon: MessageCircle,
      action: null,
    },
    {
      name: "Über uns",
      href: "/uber-uns",
      icon: HelpCircle,
      action: null,
    },
    {
      name: "Kontakt",
      href: "/kontakt",
      icon: MessageCircle,
      action: null,
    },
  ]

  if (isLoggedIn) {
    moreMenuItems.splice(1, 0, {
      name: "Mitgliedskarte",
      href: "/member-card",
      icon: UserCircle,
      action: null,
    })

    moreMenuItems.push({
      name: "Abmelden",
      href: "#",
      icon: LogOut,
      action: handleLogout,
    })
  }

  if (loading) {
    return (
      <>
        <div className="h-20 md:hidden" />
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
          <div className="grid grid-cols-5 h-16">
            {staticNavItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.href} className="flex flex-col items-center justify-center gap-1 text-gray-400">
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.name}</span>
                </div>
              )
            })}
            <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
              <MoreHorizontal className="h-6 w-6" />
              <span className="text-xs font-medium">Mehr</span>
            </div>
          </div>
        </nav>
      </>
    )
  }

  return (
    <>
      <div className="h-20 md:hidden" />

      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden" onClick={() => setIsMoreMenuOpen(false)}>
          <div className="absolute bottom-16 right-0 left-0 bg-white rounded-t-2xl shadow-2xl">
            <div className="p-4">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mehr Optionen</h3>
              <div className="space-y-2">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon

                  if (item.action) {
                    return (
                      <button
                        key={item.name}
                        onClick={item.action}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 w-full text-left"
                      >
                        <Icon className="h-6 w-6 text-gray-600" />
                        <span className="text-base font-medium text-gray-900">{item.name}</span>
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsMoreMenuOpen(false)}
                    >
                      <Icon className="h-6 w-6 text-gray-600" />
                      <span className="text-base font-medium text-gray-900">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16">
          {staticNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                  isActive ? "text-orange-600" : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={2} />
            <span className="text-[10px] font-medium">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}

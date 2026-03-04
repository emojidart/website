"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  LogIn,
  Sparkles,
  LayoutDashboard,
  ArrowLeft,
  BarChart3,
  X,
  Menu,
  CalendarDays,
  Trophy,
  Users,
  Radio,
  History,
  Building2,
  MessageCircle,
  HelpCircle,
  UserCircle,
  CreditCard,
  Images,
  GraduationCap,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

type HeaderVariant = "site" | "app"

type HeaderProps = {
  variant?: HeaderVariant
  title?: string
  subtitle?: string
  backHref?: string
  onBackClick?: () => void
}

type DrawerItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  requiresLogin?: boolean
  adminOnly?: boolean
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

export function Header({
  variant = "site",
  title = "EMD Vereinsapp",
  subtitle,
  backHref,
  onBackClick,
}: HeaderProps) {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const openDrawer = () => setDrawerOpen(true)
  const closeDrawer = () => setDrawerOpen(false)
  const toggleDrawer = () => setDrawerOpen((v) => !v)

  // ✅ Anti-Flicker: Sobald Auth einmal "ready" war (user !== undefined), bleibt es so
  const authReadyRef = React.useRef(false)
  React.useEffect(() => {
    if (user !== undefined) authReadyRef.current = true
  }, [user])
  const authReady = authReadyRef.current

  React.useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

  // Auto-close drawer on route change
  React.useEffect(() => {
    if (!drawerOpen) return
    closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleAuthClick = () => {
    if (user) router.push("/member-profile-app")
    else router.push("/member-login")
  }

  const handleApplyClick = () => {
    router.push("/player-search")
  }

  const handleAdminClick = () => {
    router.push("/admin")
  }

  const handleCampusClick = () => {
    router.push("/emd-campus")
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
  }

  // Drawer Sections
  const drawerSections: Array<{ title: string; items: DrawerItem[] }> = [
    {
      title: "Hauptmenü",
      items: [
        { href: "/", label: "Home", icon: BarChart3 },
        { href: "/veranstaltungen", label: "Events", icon: CalendarDays },
        { href: "/liga-statistiken-app", label: "Liga", icon: Trophy },
        { href: "/new-club", label: "Verein", icon: Users },
      ],
    },
    {
      title: "Schnellzugriff",
      items: [
        { href: "/tournament-series-app", label: "Lion Cup", icon: Trophy },
        { href: "/live-all-app", label: "Live", icon: Radio },
        { href: "/tournament-history", label: "History", icon: History },
      ],
    },
    {
      title: "Info",
      items: [
        { href: "/emd-campus", label: "EMD Campus", icon: Building2 },
        { href: "/faq", label: "FAQ", icon: HelpCircle },
        { href: "/uber-uns", label: "Über uns", icon: MessageCircle },
        { href: "/kontakt", label: "Kontakt", icon: MessageCircle },
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: user ? "/member-profile-app" : "/member-login",
          label: user ? "Profil" : "Login",
          icon: user ? UserCircle : LogIn,
        },
        { href: "/admin", label: "Admin", icon: LayoutDashboard, adminOnly: true },
        { href: "/member-card", label: "Mitgliedskarte", icon: CreditCard, requiresLogin: true },
        { href: "/match-galerie", label: "Match Galerie", icon: Images, requiresLogin: true },
      ],
    },
  ]

  const canShow = (it: DrawerItem) => {
    if (it.requiresLogin && !user) return false
    if (it.adminOnly && !(user && isAdmin)) return false
    return true
  }

  /* ================= APP HEADER (wie gehabt) ================= */
  if (variant === "app") {
    const handleBack = () => {
      if (onBackClick) return onBackClick()
      if (backHref) return router.push(backHref)
      router.back()
    }

    return (
      <header className="fixed top-0 left-0 right-0 z-50 w-full">
        <div className="bg-white/90 backdrop-blur border-b border-orange-100 shadow-sm">
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="flex h-14 items-center gap-3">
              {backHref || onBackClick ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-base sm:text-lg font-extrabold text-gray-900">{title}</div>
                    {subtitle ? <div className="truncate text-xs sm:text-sm text-gray-500">{subtitle}</div> : null}
                  </div>
                </div>
              </div>

              <div className="ml-auto" />
            </div>
          </div>
        </div>
      </header>
    )
  }

  /* ================= SITE HEADER (mit Drawer + Anti-Flicker) ================= */
  return (
    <>
      {/* DRAWER */}
      {drawerOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[60]">
          {/* overlay */}
          <button aria-label="Schließen" className="absolute inset-0 bg-black/40" onClick={closeDrawer} />

          <aside className="absolute left-0 top-0 bottom-0 w-[320px] lg:w-[380px] bg-white shadow-2xl border-r border-gray-200">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 shadow-sm overflow-hidden">
                  <Image
                    src="/images/brutal-darts-bg---.png"
                    alt="EMD Logo"
                    width={26}
                    height={26}
                    className="object-contain"
                    priority
                  />
                </span>
                <div className="font-extrabold text-gray-900">{title}</div>
              </div>

              <button onClick={closeDrawer} className="rounded-xl p-2 hover:bg-gray-100" aria-label="Schließen">
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto h-full">
              {/* ✅ NEU: EMD Campus Button direkt unter "Jetzt bewerben" */}
              <Button
                onClick={() => {
                  closeDrawer()
                  handleApplyClick()
                }}
                className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold mb-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Jetzt bewerben
              </Button>

              <Button
                onClick={() => {
                  closeDrawer()
                  handleCampusClick()
                }}
                variant="outline"
                className="w-full h-11 rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-semibold mb-3"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                EMD Campus
              </Button>

              <div className="space-y-5 pb-20">
                {drawerSections.map((sec) => (
                  <section key={sec.title}>
                    <div className="mb-2 px-2 text-xs font-bold uppercase text-gray-500">{sec.title}</div>

                    <div className="space-y-1">
                      {sec.items.filter(canShow).map((it) => {
                        const Icon = it.icon
                        const active = isActive(it.href)

                        return (
                          <Link
                            key={it.href + it.label}
                            href={it.href}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                              active
                                ? "bg-orange-50 text-orange-800 ring-1 ring-orange-200"
                                : "text-gray-800 hover:bg-gray-50",
                            )}
                            onClick={closeDrawer}
                          >
                            <Icon className={cn("h-5 w-5", active ? "text-orange-700" : "text-orange-600")} />
                            <span className="font-semibold">{it.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                ))}

                {user && isAdmin ? (
                  <Button
                    onClick={() => {
                      closeDrawer()
                      handleAdminClick()
                    }}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    ADMIN
                  </Button>
                ) : null}

                <Button
                  onClick={() => {
                    closeDrawer()
                    handleAuthClick()
                  }}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {user ? "PROFIL" : "LOGIN"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full">
        <div className="bg-white/90 backdrop-blur border-b border-orange-100 shadow-sm">
          {/* gleiche Breite wie Seiten */}
          <div className="mx-auto w-full px-4 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
            <div className="flex h-12 sm:h-14 items-center justify-between gap-3">
              {/* LEFT */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={toggleDrawer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"
                  aria-label="Menü öffnen"
                >
                  <Menu className="h-5 w-5 text-gray-800" />
                </button>

                <Link href="/" className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 shadow-sm overflow-hidden">
                    <Image
                      src="/images/brutal-darts-bg---.png"
                      alt="EMD Logo"
                      width={26}
                      height={26}
                      className="object-contain"
                      priority
                    />
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-gray-900 tracking-wide">{title}</span>
                </Link>
              </div>

              {/* RIGHT (Desktop) - ✅ stabil, kein Blitzen */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                {/* ✅ NEU: EMD Campus Button im normalen Header (rechts) */}
                <Button
                  onClick={handleCampusClick}
                  variant="outline"
                  className="h-9 rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-semibold"
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  EMD Campus
                </Button>

                <Button
                  onClick={handleApplyClick}
                  className="h-9 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Jetzt bewerben
                </Button>

                {/* Admin Slot: Platz bleibt stabil */}
                <div className="min-w-[110px]">
                  {authReady ? (
                    user && isAdmin ? (
                      <Button
                        onClick={handleAdminClick}
                        variant="outline"
                        className="h-9 w-full rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        ADMIN
                      </Button>
                    ) : (
                      <div className="h-9" />
                    )
                  ) : (
                    <div className="h-9 rounded-xl border border-orange-200 bg-white/60" />
                  )}
                </div>

                {/* Profil/Login: immer stabil */}
                <Button
                  onClick={authReady ? handleAuthClick : undefined}
                  disabled={!authReady}
                  variant="outline"
                  className="h-9 min-w-[120px] rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50 disabled:opacity-100 disabled:text-orange-700/60 disabled:hover:bg-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {authReady ? (user ? "PROFIL" : "LOGIN") : "…"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
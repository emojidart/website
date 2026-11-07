"use client"

import * as React from "react"
import { createPortal } from "react-dom"
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
  GraduationCap,
  ClipboardList,
  ChevronRight,
  ChevronsUpDown,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

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
  memberOnly?: boolean
  guestOnly?: boolean
}

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand" | "community"

type TeamMembershipRow = {
  role: string | null
  teams: {
    chat_room_id: string | null
  } | null
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

// GLOBAL room ids
const CLUB_ROOM_ID = "11111111-1111-1111-1111-111111111111"
const FREIZEIT_ROOM_ID = "22222222-2222-2222-2222-222222222222"
const VORSTAND_ROOM_ID = "33333333-3333-3333-3333-333333333333"
const CAPTAINS_ROOM_ID = "44444444-4444-4444-4444-444444444444"
const COMMUNITY_ROOM_ID = "55555555-5555-5555-5555-555555555555"

const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

function getUserLabel(user: { email?: string | null } | null | undefined) {
  if (!user?.email) return "Profil"
  const local = user.email.split("@")[0] || "Profil"
  return local.length > 18 ? `${local.slice(0, 18)}…` : local
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
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(["Hauptmenü"])
  const toggleGroup = (title: string) => setExpandedGroups((groups) => groups.includes(title) ? groups.filter((g) => g !== title) : [...groups, title])
  const [chatUnreadCount, setChatUnreadCount] = React.useState(0)
  const [isGuest, setIsGuest] = React.useState(false)
  const [profileChecked, setProfileChecked] = React.useState(false)
  const [areaSwitcherOpen, setAreaSwitcherOpen] = React.useState(false)
  const areaSwitcherRef = React.useRef<HTMLDivElement | null>(null)
  const drawerRef = React.useRef<HTMLElement | null>(null)
  const drawerTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [portalReady, setPortalReady] = React.useState(false)

  const closeDrawer = () => setDrawerOpen(false)
  const toggleDrawer = () => setDrawerOpen((v) => !v)

  const authReadyRef = React.useRef(false)

  React.useEffect(() => {
    if (user !== undefined) authReadyRef.current = true
  }, [user])

  const authReady = authReadyRef.current

  React.useEffect(() => {
    setPortalReady(true)
  }, [])

  React.useEffect(() => {
    let mounted = true

    const checkGuestProfile = async () => {
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
          console.error("[Header] Gaststatus konnte nicht geladen werden:", error)
          setIsGuest(false)
          setProfileChecked(true)
          return
        }

        setIsGuest(Boolean(data?.is_guest))
        setProfileChecked(true)
      } catch (error) {
        console.error("[Header] Gaststatus Fehler:", error)
        if (!mounted) return
        setIsGuest(false)
        setProfileChecked(true)
      }
    }

    void checkGuestProfile()

    return () => {
      mounted = false
    }
  }, [user?.id])

  React.useEffect(() => {
    if (!drawerOpen || !portalReady) return
    const drawer = drawerRef.current
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter(element => element.getClientRects().length > 0)
    focusable()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeDrawer()
      } else if (event.key === "Tab") {
        const items = focusable()
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && (document.activeElement === first || !drawer?.contains(document.activeElement))) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !drawer?.contains(document.activeElement))) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = originalOverflow
      drawerTriggerRef.current?.focus()
    }
  }, [drawerOpen, portalReady])

  React.useEffect(() => {
    if (!drawerOpen) return
    closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  React.useEffect(() => {
    setAreaSwitcherOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (!areaSwitcherOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!areaSwitcherRef.current?.contains(event.target as Node)) {
        setAreaSwitcherOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAreaSwitcherOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [areaSwitcherOpen])

  const navigateTo = (href: string) => {
    if (href.split("?")[0] !== pathname && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("emd:route-start", { detail: { href } }))
    }
    router.push(href)
  }

  const handleAuthClick = () => {
    if (user && isGuest) {
      navigateTo("/guest-profile-app")
      return
    }

    if (user) {
      navigateTo("/member-profile-app")
      return
    }

    navigateTo("/login")
  }

  const handleJoinClick = () => {
    navigateTo("/verein-beitreten")
  }

  const handleAdminClick = () => {
    navigateTo("/admin")
  }

  const handleChatClick = () => {
    navigateTo(isGuest ? "/chat-app?scope=community" : "/chat-app")
  }

  const openArea = (href: string) => {
    setAreaSwitcherOpen(false)
    navigateTo(href)
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    const targetPath = href.split("?")[0]
    return pathname === targetPath || pathname?.startsWith(`${targetPath}/`)
  }

  const unreadKey = React.useCallback((roomId: string, scope: ChatScope) => `${roomId}:${scope}`, [])

  const loadChatUnreadCount = React.useCallback(async () => {
    if (!user?.id) {
      setChatUnreadCount(0)
      return
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id,is_guest")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError || !profile?.id) {
        setChatUnreadCount(0)
        return
      }

      const profileId = profile.id
      const playerId = profile.player_id ?? null

      const isGuestProfile = Boolean(profile?.is_guest)

      const { data: roleRows } = await supabase
        .from("club_roles")
        .select("role")
        .eq("user_id", user.id)

      const canSeeVorstandChat = ((roleRows as Array<{ role: string }> | null) ?? []).some((r) =>
        BOARD_ROLES.includes(r.role),
      )

      let memberships: TeamMembershipRow[] = []

      if (playerId) {
        const { data: membershipRows } = await supabase
          .from("team_members")
          .select("role, teams:teams(chat_room_id)")
          .eq("player_id", playerId)
          .is("left_at", null)

        memberships = (membershipRows as TeamMembershipRow[] | null) ?? []
      }

      const canSeeCaptainChat = memberships.some(
        (m) => m.role === "Captain" || m.role === "Co-Captain",
      )

      const targets: Array<{ roomId: string; scope: ChatScope }> = [
        { roomId: COMMUNITY_ROOM_ID, scope: "community" },
      ]

      if (!isGuestProfile) {
        targets.push(
          { roomId: CLUB_ROOM_ID, scope: "club" },
          { roomId: FREIZEIT_ROOM_ID, scope: "freizeit" },
        )

        if (canSeeVorstandChat) {
          targets.push({ roomId: VORSTAND_ROOM_ID, scope: "vorstand" })
        }

        if (canSeeCaptainChat || canSeeVorstandChat) {
          targets.push({ roomId: CAPTAINS_ROOM_ID, scope: "captains" })
        }

        memberships.forEach((m) => {
          const roomId = m.teams?.chat_room_id
          if (roomId) {
            targets.push({ roomId, scope: "team" })
          }
        })
      }

      const dedupedTargets = Array.from(
        new Map(targets.map((t) => [unreadKey(t.roomId, t.scope), t])).values(),
      )

      const counts = await Promise.all(
        dedupedTargets.map(async ({ roomId, scope }) => {
          const { data: visitData } = await supabase
            .from("user_room_visits")
            .select("last_visit_at")
            .eq("user_id", profileId)
            .eq("room_id", roomId)
            .eq("scope", scope)
            .maybeSingle()

          const lastVisit =
            (visitData as { last_visit_at?: string } | null)?.last_visit_at ?? "1970-01-01T00:00:00Z"

          const { count, error } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", roomId)
            .eq("scope", scope)
            .gt("created_at", lastVisit)
            .neq("user_id", profileId)

          if (error) return 0
          return count ?? 0
        }),
      )

      const total = counts.reduce((sum, n) => sum + n, 0)
      setChatUnreadCount(total)
    } catch (error) {
      console.error("loadChatUnreadCount error", error)
      setChatUnreadCount(0)
    }
  }, [user?.id, isGuest, unreadKey])

  React.useEffect(() => {
    if (!authReady) return
    if (!profileChecked) return
    loadChatUnreadCount()
  }, [authReady, profileChecked, loadChatUnreadCount])

  const drawerSections: Array<{ title: string; items: DrawerItem[] }> = [
    {
      title: "Hauptmenü",
      items: [
        { href: "/", label: "Start", icon: BarChart3 },
        { href: "/veranstaltungen", label: "Termine", icon: CalendarDays },
        { href: "/liga-statistiken-app", label: "Liga", icon: Trophy },
        { href: "/new-club", label: "Verein", icon: Users },
      ],
    },
    {
      title: "Schnellzugriff",
      items: [
        { href: "/lion-cup", label: "Lion Cup", icon: Trophy },
        { href: "/live-all-app", label: "Live", icon: Radio },
        { href: "/tournament-history", label: "Verlauf", icon: History },
        { href: user && isGuest ? "/chat-app?scope=community" : "/chat-app", label: "Chat", icon: MessageCircle, requiresLogin: true },
        { href: "/vereinskalender-app", label: "Vereinskalender", icon: CalendarDays, requiresLogin: true, memberOnly: true },
        { href: "/member-availability", label: "Line-up", icon: ClipboardList, requiresLogin: true, memberOnly: true },
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
      title: "Konto",
      items: [
        {
          href: user ? (isGuest ? "/guest-profile-app" : "/member-profile-app") : "/login",
          label: user ? (isGuest ? "Gast-Profil" : "Profil") : "Anmelden",
          icon: user ? UserCircle : LogIn,
        },
        { href: "/admin", label: "Admin", icon: LayoutDashboard, adminOnly: true },
      ],
    },
  ]

  const canShow = (it: DrawerItem) => {
    if (it.requiresLogin && !user) return false
    if (it.adminOnly && !(user && isAdmin)) return false
    if (it.memberOnly && (!user || isGuest)) return false
    if (it.guestOnly && (!user || !isGuest)) return false
    return true
  }

  const renderChatBadge = () => {
    if (!user || chatUnreadCount <= 0) return null

    return (
      <span className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white shadow-sm">
        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
      </span>
    )
  }

  const drawerPortal =
    portalReady && drawerOpen
      ? createPortal(
          (
        <div className="fixed inset-0 z-[9999]">
          <button
            aria-label="Schließen"
            className="emd-nav-backdrop absolute inset-0"
            onClick={closeDrawer}
          />

          <aside ref={drawerRef} className="emd-nav-drawer absolute bottom-0 right-0 top-0 flex flex-col w-[min(92vw,410px)] overflow-hidden border-l border-white/10 bg-[#172235] text-white" role="dialog" aria-modal="true" aria-label="EMD Navigation">
            <div className="emd-nav-head relative overflow-hidden border-b border-white/10 bg-[#233248] p-5 pt-[max(env(safe-area-inset-top),20px)]">

              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-orange-300/15 bg-orange-500/10 shadow-sm">
                    <Image
                      src="/images/brutal-darts-bg---.png"
                      alt="EMD Logo"
                      width={28}
                      height={28}
                      className="h-auto object-contain"
                      style={{ width: "auto", height: "28px" }}
                      priority
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold tracking-tight text-white">{title}</div>
                    {user ? (
                      <div className="truncate text-xs text-slate-400">
                        {isGuest ? "Gastzugang" : user.email}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Willkommen bei EMD</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={closeDrawer}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="emd-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#172235] p-4 pb-[calc(env(safe-area-inset-bottom)+48px)] text-white">
              {!user ? (
                <Button
                  onClick={() => {
                    closeDrawer()
                    handleJoinClick()
                  }}
                  className="mb-3 h-11 w-full rounded-2xl bg-[#f59b50] font-semibold text-[#101722] shadow-none hover:bg-[#ffb375]"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Jetzt beitreten
                </Button>
              ) : null}

              <div className="space-y-2 pb-8">
                {drawerSections.map((sec) => {
                  const visibleItems = sec.items.filter(canShow)

                  if (visibleItems.length === 0) return null

                  return (
                    <section key={sec.title} className="emd-nav-section">
                      <button type="button" className="emd-nav-accordion" aria-expanded={expandedGroups.includes(sec.title)} onClick={() => toggleGroup(sec.title)}>
                        <span className="emd-nav-accord-icon">{sec.title === "Hauptmenü" ? <BarChart3 className="h-5 w-5" /> : sec.title === "Schnellzugriff" ? <Trophy className="h-5 w-5" /> : sec.title === "Konto" ? <UserCircle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}</span>
                        <span className="flex-1">{sec.title}</span>
                        <span className="text-xs font-medium text-[#aebed0]">{visibleItems.length}</span>
                        <ChevronDown className="emd-nav-chevron h-5 w-5" />
                      </button>
                      {expandedGroups.includes(sec.title) && (
                        <div className="emd-nav-items">
                          {visibleItems.map((it) => {
                            const Icon = it.icon
                            const active = isActive(it.href)
                            const isChatItem = it.href === "/chat-app" || it.href.startsWith("/chat-app?")
                            return (
                              <Link key={it.href + it.label} href={it.href} aria-current={active ? "page" : undefined}
                                className="group flex items-center gap-3 min-h-12 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff985c]"
                                onClick={closeDrawer}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"><Icon className="h-[18px] w-[18px]" /></span>
                                <span className="min-w-0 flex-1 truncate font-semibold">{it.label}</span>
                                {isChatItem && chatUnreadCount > 0 ? renderChatBadge() : <ChevronRight className="h-4 w-4 shrink-0 text-[#8091aa]" />}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })}

                {user && isAdmin && !isGuest ? (
                  <Button
                    onClick={() => {
                      closeDrawer()
                      handleAdminClick()
                    }}
                    variant="outline"
                    className="h-11 w-full rounded-2xl border-white/10 bg-white/5 font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    ADMIN
                  </Button>
                ) : null}

                <Button
                  onClick={() => {
                    closeDrawer()
                    handleAuthClick()
                  }}
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-white/10 bg-white/5 font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {user ? <UserCircle className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {user ? (isGuest ? "Gast-Profil öffnen" : "Spielerbereich öffnen") : "Anmelden"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
          ),
          document.body,
        )
      : null

  if (variant === "app") {
    const handleBack = () => {
      if (onBackClick) return onBackClick()
      if (backHref) return navigateTo(backHref)
      router.back()
    }

    return (
      <>
        {drawerPortal}
        <header className="emd-main-header fixed left-0 right-0 top-0 z-50 w-full border-b border-white/[0.08] bg-[#101722] shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="relative overflow-hidden">


          <div className="relative mx-auto w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-7 xl:px-8">
            <div className="flex h-14 items-center gap-3">
              {backHref || onBackClick ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  aria-label="Zurück"
                  className="h-11 w-11 shrink-0 rounded-2xl border-orange-300/25 bg-black/30 p-0 text-[#f59b50] shadow-sm transition hover:border-orange-300/45 hover:bg-orange-500/[0.12] hover:text-white focus-visible:text-white"
                >
                  <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
                </Button>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.10] text-[#f59b50] shadow-sm">
                    <BarChart3 className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-[-0.02em] text-white sm:text-lg">
                      {title}
                    </div>
                    {subtitle ? (
                      <div className="truncate text-xs font-semibold text-white/65 sm:text-sm">
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="ml-auto" />

              <button
                ref={drawerTriggerRef}
                onClick={toggleDrawer}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50] hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                aria-label="Menü öffnen"
                aria-expanded={drawerOpen}
                title="Menü"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        </header>
      </>
    )
  }

  return (
    <>
      {drawerPortal}



      <header className="emd-main-header fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-[#101722] shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-7 xl:px-8">
          <div className="flex h-14 items-center gap-3">
            <Link href="/" aria-label="EMD Startseite" className="flex min-h-11 min-w-0 items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-300/15 bg-orange-500/10 shadow-sm">
                  <Image
                    src="/images/brutal-darts-bg---.png"
                    alt="EMD Logo"
                    width={26}
                    height={26}
                    className="object-contain"
                    priority
                  />
                </span>
                <span className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
                  {title}
                </span>
              </Link>

            <nav aria-label="Hauptnavigation" className="ml-auto hidden items-center gap-1 xl:flex">
              {drawerSections[0].items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50]",
                    isActive(item.href) ? "bg-orange-500/10 text-[#f59b50]" : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              {user ? (
                <Button
                  onClick={handleChatClick}
                  variant="outline"
                  className="relative h-11 rounded-xl border-white/10 bg-white/5 px-4 font-semibold text-white/70 shadow-none hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4 text-orange-300" />
                  <span>Chat</span>
                  {chatUnreadCount > 0 ? (
                    <span className="ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white shadow-sm">
                      {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                    </span>
                  ) : null}
                </Button>
              ) : null}

              {authReady ? (
                user ? (
                  isAdmin && !isGuest ? (
                    <div ref={areaSwitcherRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setAreaSwitcherOpen((open) => !open)}
                        className="group flex h-11 min-w-[192px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 pl-2.5 pr-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50] hover:border-orange-300/20 hover:bg-orange-500/10"
                        aria-expanded={areaSwitcherOpen}
                        aria-haspopup="menu"
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/15 bg-orange-500/10 text-[#f59b50]">
                          <LayoutDashboard className="h-4.5 w-4.5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/70">
                            Bereich
                          </span>
                          <span className="block truncate text-sm font-semibold text-white">
                            Schnell wechseln
                          </span>
                        </span>

                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/60" />
                      </button>

                      {areaSwitcherOpen ? (
                        <div
                          role="menu"
                          className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#101722] p-2 shadow-sm"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openArea("/admin")}
                            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-white/70 hover:border-orange-300/15 hover:bg-orange-500/10 hover:text-white"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#f59b50]">
                              <LayoutDashboard className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">Adminbereich</span>
                              <span className="block text-[11px] font-semibold text-white/60">Verwaltung & Organisation</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openArea("/member-profile-app")}
                            className="group mt-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-white/70 hover:border-orange-300/15 hover:bg-orange-500/10 hover:text-white"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#f59b50]">
                              <UserCircle className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">Spielerbereich</span>
                              <span className="block text-[11px] font-semibold text-white/60">Profil, Karte & Mitgliedschaft</span>
                            </span>
                          </button>

                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={handleAuthClick}
                      className="group flex h-11 min-w-[190px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 pl-2.5 pr-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50] hover:border-orange-300/20 hover:bg-orange-500/10"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/15 bg-orange-500/10 text-[#f59b50]">
                        <UserCircle className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-right">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/70">
                          {isGuest ? "Gast" : "Spielerbereich"}
                        </span>
                        <span className="block truncate text-sm font-semibold text-white">
                          {isGuest ? "Gastzugang" : getUserLabel(user)}
                        </span>
                      </span>
                    </button>
                  )
                ) : (
                  <Button
                    onClick={handleAuthClick}
                    variant="outline"
                    className="h-11 rounded-xl border-white/10 bg-white/5 px-4 font-semibold text-white/70 shadow-none hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                  >
                    <LogIn className="mr-2 h-4 w-4 text-orange-300" />
                    Anmelden
                  </Button>
                )
              ) : (
                <div className="h-10 w-[190px] rounded-xl border border-white/10 bg-white/5" />
              )}
            </div>

            <button
              ref={drawerTriggerRef}
                onClick={toggleDrawer}
              className="emd-nav-trigger ml-auto xl:ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50] hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
              aria-label="Menü öffnen"
                aria-expanded={drawerOpen}
              title="Menü"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
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
  const [chatUnreadCount, setChatUnreadCount] = React.useState(0)
  const [isGuest, setIsGuest] = React.useState(false)
  const [profileChecked, setProfileChecked] = React.useState(false)
  const [areaSwitcherOpen, setAreaSwitcherOpen] = React.useState(false)
  const areaSwitcherRef = React.useRef<HTMLDivElement | null>(null)
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
    if (!drawerOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

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

  const handleAuthClick = () => {
    if (user && isGuest) {
      router.push("/guest-profile-app")
      return
    }

    if (user) {
      router.push("/member-profile-app")
      return
    }

    router.push("/login")
  }

  const handleJoinClick = () => {
    router.push("/verein-beitreten")
  }

  const handleAdminClick = () => {
    router.push("/admin")
  }

  const handleChatClick = () => {
    router.push(isGuest ? "/chat-app?scope=community" : "/chat-app")
  }

  const openArea = (href: string) => {
    setAreaSwitcherOpen(false)
    router.push(href)
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
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
        { href: "/", label: "Home", icon: BarChart3 },
        { href: "/veranstaltungen", label: "Events", icon: CalendarDays },
        { href: "/liga-statistiken-app", label: "Liga", icon: Trophy },
        { href: "/new-club", label: "Verein", icon: Users },
      ],
    },
    {
      title: "Schnellzugriff",
      items: [
        { href: "/lion-cup", label: "Lion Cup", icon: Trophy },
        { href: "/live-all-app", label: "Live", icon: Radio },
        { href: "/tournament-history", label: "History", icon: History },
        { href: user && isGuest ? "/chat-app?scope=community" : "/chat-app", label: "Chat", icon: MessageCircle, requiresLogin: true },
        { href: "/vereinskalender-app", label: "Vereinskalender", icon: CalendarDays, requiresLogin: true, memberOnly: true },
        { href: "/member-availability", label: "Aufstellung", icon: ClipboardList, requiresLogin: true, memberOnly: true },
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
          href: user ? (isGuest ? "/guest-profile-app" : "/member-profile-app") : "/login",
          label: user ? (isGuest ? "Gast-Profil" : "Profil") : "Login",
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
      <span className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          <aside className="absolute bottom-0 right-0 top-0 w-[min(90vw,380px)] overflow-hidden border-l border-white/10 bg-[#050608] text-white shadow-[-28px_0_90px_-36px_rgba(0,0,0,.98)]">
            <div className="relative overflow-hidden border-b border-white/10 bg-[#070a0f] p-4 pt-[max(env(safe-area-inset-top),16px)]">
              <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-orange-300/15 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,.08)]">
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
                    <div className="truncate text-sm font-black tracking-tight text-white">{title}</div>
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
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-full overflow-y-auto bg-[#050608] p-3 pb-[calc(env(safe-area-inset-bottom)+84px)] text-white">
              {!user ? (
                <Button
                  onClick={() => {
                    closeDrawer()
                    handleJoinClick()
                  }}
                  className="mb-3 h-11 w-full rounded-2xl bg-orange-600 font-bold text-white shadow-none hover:bg-orange-500"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Jetzt beitreten
                </Button>
              ) : null}

              <div className="space-y-5 pb-20">
                {drawerSections.map((sec) => {
                  const visibleItems = sec.items.filter(canShow)

                  if (visibleItems.length === 0) return null

                  return (
                    <section key={sec.title}>
                      <div className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                        {sec.title}
                      </div>

                      <div className="space-y-1">
                        {visibleItems.map((it) => {
                          const Icon = it.icon
                          const active = isActive(it.href)
                          const isChatItem = it.href === "/chat-app" || it.href.startsWith("/chat-app?")
                          const chatBadge = isChatItem ? renderChatBadge() : null

                          return (
                            <Link
                              key={it.href + it.label}
                              href={it.href}
                              className={cn(
                                "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                                active
                                  ? "border-orange-300/20 bg-orange-500/10 text-white"
                                  : "border-transparent text-white/58 hover:border-white/10 hover:bg-white/5 hover:text-white",
                              )}
                              onClick={closeDrawer}
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                                  active
                                    ? "border-orange-300/20 bg-orange-500/10 text-orange-200"
                                    : "border-white/10 bg-white/5 text-white/42 group-hover:text-white/70",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-bold">{it.label}</span>
                              {chatBadge || <ChevronRight className="h-4 w-4 shrink-0 text-white/18" />}
                            </Link>
                          )
                        })}
                      </div>
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
                    className="h-11 w-full rounded-2xl border-white/10 bg-white/5 font-bold text-white/70 hover:bg-white/10 hover:text-white"
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
                  className="h-11 w-full rounded-2xl border-white/10 bg-white/5 font-bold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {user ? <UserCircle className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {user ? (isGuest ? "Gast-Profil öffnen" : "Spielerbereich öffnen") : "Login"}
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
      if (backHref) return router.push(backHref)
      router.back()
    }

    return (
      <>
        {drawerPortal}
        <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/[0.08] bg-[#05070b]/96 shadow-[0_10px_35px_-22px_rgba(0,0,0,.95)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,.10),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(14,165,233,.06),transparent_34%)]" />

          <div className="relative mx-auto w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-7 xl:px-8">
            <div className="flex h-14 items-center gap-3">
              {backHref || onBackClick ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="h-10 w-10 shrink-0 rounded-2xl border-orange-300/25 bg-black/30 p-0 text-orange-200 shadow-[0_0_18px_rgba(249,115,22,.10)] transition hover:border-orange-300/45 hover:bg-orange-500/[0.12] hover:text-white focus-visible:text-white"
                >
                  <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
                </Button>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.10] text-orange-200 shadow-[0_0_20px_rgba(249,115,22,.10)]">
                    <BarChart3 className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-base font-black tracking-[-0.02em] text-white sm:text-lg">
                      {title}
                    </div>
                    {subtitle ? (
                      <div className="truncate text-xs font-semibold text-white/38 sm:text-sm">
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="ml-auto" />

              <button
                onClick={toggleDrawer}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition-colors hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                aria-label="Menü öffnen"
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



      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-[#06080d]/96 shadow-[0_12px_42px_-28px_rgba(0,0,0,.95)] backdrop-blur-2xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-7 xl:px-8">
          <div className="flex h-14 items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-300/15 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,.08)]">
                  <Image
                    src="/images/brutal-darts-bg---.png"
                    alt="EMD Logo"
                    width={26}
                    height={26}
                    className="object-contain"
                    priority
                  />
                </span>
                <span className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                  {title}
                </span>
              </Link>

            <div className="hidden items-center gap-2 lg:flex">
              {user ? (
                <Button
                  onClick={handleChatClick}
                  variant="outline"
                  className="relative h-10 rounded-xl border-white/10 bg-white/5 px-4 font-bold text-white/70 shadow-none hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4 text-orange-300" />
                  <span>Chat</span>
                  {chatUnreadCount > 0 ? (
                    <span className="ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
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
                        className="group flex h-10 min-w-[192px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 pl-2.5 pr-2.5 text-left transition-colors hover:border-orange-300/20 hover:bg-orange-500/10"
                        aria-expanded={areaSwitcherOpen}
                        aria-haspopup="menu"
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/15 bg-orange-500/10 text-orange-200">
                          <LayoutDashboard className="h-4.5 w-4.5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-orange-300/70">
                            Bereich
                          </span>
                          <span className="block truncate text-sm font-bold text-white">
                            Schnell wechseln
                          </span>
                        </span>

                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/35" />
                      </button>

                      {areaSwitcherOpen ? (
                        <div
                          role="menu"
                          className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#050608] p-2 shadow-[0_30px_90px_-30px_rgba(0,0,0,1)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openArea("/admin")}
                            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-white/70 hover:border-orange-300/15 hover:bg-orange-500/10 hover:text-white"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-200">
                              <LayoutDashboard className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black">Adminbereich</span>
                              <span className="block text-[11px] font-semibold text-white/35">Verwaltung & Organisation</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openArea("/member-profile-app")}
                            className="group mt-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-white/70 hover:border-orange-300/15 hover:bg-orange-500/10 hover:text-white"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-200">
                              <UserCircle className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black">Spielerbereich</span>
                              <span className="block text-[11px] font-semibold text-white/35">Profil, Karte & Mitgliedschaft</span>
                            </span>
                          </button>

                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={handleAuthClick}
                      className="group flex h-10 min-w-[190px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 pl-2.5 pr-3.5 text-left transition-colors hover:border-orange-300/20 hover:bg-orange-500/10"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/15 bg-orange-500/10 text-orange-200">
                        <UserCircle className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-right">
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-orange-300/70">
                          {isGuest ? "Gast" : "Spielerbereich"}
                        </span>
                        <span className="block truncate text-sm font-bold text-white">
                          {isGuest ? "Gastzugang" : getUserLabel(user)}
                        </span>
                      </span>
                    </button>
                  )
                ) : (
                  <Button
                    onClick={handleAuthClick}
                    variant="outline"
                    className="h-10 rounded-xl border-white/10 bg-white/5 px-4 font-bold text-white/70 shadow-none hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
                  >
                    <LogIn className="mr-2 h-4 w-4 text-orange-300" />
                    Login
                  </Button>
                )
              ) : (
                <div className="h-10 w-[190px] rounded-xl border border-white/10 bg-white/5" />
              )}
            </div>

            <button
              onClick={toggleDrawer}
              className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition-colors hover:border-orange-300/20 hover:bg-orange-500/10 hover:text-white"
              aria-label="Menü öffnen"
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
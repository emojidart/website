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
  ClipboardList,
  ChevronRight,
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
}

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand"

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

  const closeDrawer = () => setDrawerOpen(false)
  const toggleDrawer = () => setDrawerOpen((v) => !v)

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

  const handleChatClick = () => {
    router.push("/chat-app")
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
        .select("id,user_id,player_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError || !profile?.id) {
        setChatUnreadCount(0)
        return
      }

      const profileId = profile.id
      const playerId = profile.player_id ?? null

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
        { roomId: CLUB_ROOM_ID, scope: "club" },
        { roomId: FREIZEIT_ROOM_ID, scope: "freizeit" },
      ]

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
  }, [user?.id, unreadKey])

  React.useEffect(() => {
    if (!authReady) return
    loadChatUnreadCount()
  }, [authReady, loadChatUnreadCount])

  React.useEffect(() => {
    if (!user?.id) return

    let isMounted = true

    const setup = async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!isMounted) return

      const profileId = profile?.id
      if (!profileId) return

      const channel = supabase
        .channel(`header-chat-unread-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
          },
          async () => {
            await loadChatUnreadCount()
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_room_visits",
            filter: `user_id=eq.${profileId}`,
          },
          async () => {
            await loadChatUnreadCount()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    let cleanupFn: (() => void) | undefined

    setup().then((cleanup) => {
      cleanupFn = cleanup
    })

    return () => {
      isMounted = false
      if (cleanupFn) cleanupFn()
    }
  }, [user?.id, loadChatUnreadCount])

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
        { href: "/chat-app", label: "Chat", icon: MessageCircle, requiresLogin: true },
        { href: "/vereinskalender-app", label: "Vereinskalender", icon: CalendarDays, requiresLogin: true },
        { href: "/member-availability", label: "Aufstellung", icon: ClipboardList, requiresLogin: true },
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

  const renderChatBadge = () => {
    if (!user || chatUnreadCount <= 0) return null

    return (
      <span className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
      </span>
    )
  }

  if (variant === "app") {
    const handleBack = () => {
      if (onBackClick) return onBackClick()
      if (backHref) return router.push(backHref)
      router.back()
    }

    return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full bg-white border-b border-orange-100 shadow-sm pt-[env(safe-area-inset-top)]">
  <div className="bg-white">
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
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-base font-extrabold text-gray-900 sm:text-lg">{title}</div>
                    {subtitle ? <div className="truncate text-xs text-gray-500 sm:text-sm">{subtitle}</div> : null}
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

  return (
    <>
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <button aria-label="Schließen" className="absolute inset-0 bg-black/40" onClick={closeDrawer} />

          <aside className="absolute bottom-0 left-0 top-0 w-[320px] border-r border-gray-200 bg-white shadow-2xl lg:w-[380px]">
            <div className="border-b p-4 pt-[max(env(safe-area-inset-top),16px)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-orange-600 shadow-sm">
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
                    <div className="truncate font-extrabold text-gray-900">{title}</div>
                    {user ? (
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                    ) : (
                      <div className="text-xs text-gray-500">Willkommen bei EMD</div>
                    )}
                  </div>
                </div>

                <button onClick={closeDrawer} className="rounded-xl p-2 hover:bg-gray-100" aria-label="Schließen">
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="h-full overflow-y-auto p-3 pb-[env(safe-area-inset-bottom)]">
              <Button
                onClick={() => {
                  closeDrawer()
                  handleApplyClick()
                }}
                className="mb-2 h-11 w-full rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Jetzt bewerben
              </Button>

              <Button
                onClick={() => {
                  closeDrawer()
                  handleCampusClick()
                }}
                variant="outline"
                className="mb-3 h-11 w-full rounded-xl border-orange-200 bg-white font-semibold text-orange-700 hover:bg-orange-50"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                EMD Campus
              </Button>

              <div className="space-y-5 pb-20">
                {drawerSections.map((sec) => (
                  <section key={sec.title}>
                    <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                      {sec.title}
                    </div>

                    <div className="space-y-1">
                      {sec.items.filter(canShow).map((it) => {
                        const Icon = it.icon
                        const active = isActive(it.href)
                        const isChatItem = it.href === "/chat-app"

                        return (
                          <Link
                            key={it.href + it.label}
                            href={it.href}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                              active
                                ? "bg-orange-50 text-orange-800 ring-1 ring-orange-200"
                                : "text-gray-800 hover:bg-gray-50",
                            )}
                            onClick={closeDrawer}
                          >
                            <Icon className={cn("h-5 w-5 shrink-0", active ? "text-orange-700" : "text-orange-600")} />
                            <span className="font-semibold">{it.label}</span>
                            {isChatItem ? renderChatBadge() : <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />}
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
                    className="h-11 w-full rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
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
                  className="h-11 w-full rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                >
                  {user ? <UserCircle className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {user ? "Profil öffnen" : "Login"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <header className="fixed left-0 right-0 top-0 z-50 w-full bg-white border-b border-orange-100 shadow-sm pt-[env(safe-area-inset-top)]">
  <div className="bg-white">
          <div className="mx-auto w-full max-w-2xl px-4 lg:max-w-screen-xl 2xl:max-w-screen-2xl">
            <div className="flex h-14 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  onClick={toggleDrawer}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100"
                  aria-label="Menü öffnen"
                >
                  <Menu className="h-5 w-5 text-gray-800" />
                </button>

                <Link href="/" className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-600 shadow-sm">
                    <Image
                      src="/images/brutal-darts-bg---.png"
                      alt="EMD Logo"
                      width={26}
                      height={26}
                      className="object-contain"
                      priority
                    />
                  </span>
                  <span className="truncate text-sm font-extrabold tracking-wide text-gray-900 sm:text-base">
                    {title}
                  </span>
                </Link>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                {user ? (
                  <Button
                    onClick={handleChatClick}
                    variant="outline"
                    className="relative h-10 rounded-xl border-orange-200 bg-white px-4 font-semibold text-orange-700 hover:bg-orange-50"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Chat</span>
                    {chatUnreadCount > 0 ? (
                      <span className="ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                      </span>
                    ) : null}
                  </Button>
                ) : null}

                <Button
                  onClick={handleCampusClick}
                  variant="outline"
                  className="h-10 rounded-xl border-orange-200 bg-white px-4 font-semibold text-orange-700 hover:bg-orange-50"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  EMD Campus
                </Button>

                <Button
                  onClick={handleApplyClick}
                  className="h-10 rounded-xl bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Jetzt bewerben
                </Button>

                {authReady ? (
                  user && isAdmin ? (
                    <Button
                      onClick={handleAdminClick}
                      variant="outline"
                      className="h-10 rounded-xl border-orange-200 bg-white px-4 text-orange-700 hover:bg-orange-50"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      ADMIN
                    </Button>
                  ) : null
                ) : (
                  <div className="h-10 w-[110px] rounded-xl border border-orange-200 bg-white/60" />
                )}

                {authReady ? (
                  user ? (
                    <button
                      onClick={handleAuthClick}
                      className="group flex h-10 max-w-[220px] items-center gap-2 rounded-xl border border-orange-200 bg-white pl-2 pr-3 text-left text-orange-700 transition hover:bg-orange-50"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                        <UserCircle className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-medium uppercase tracking-wide text-orange-500">
                          Profil
                        </span>
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {getUserLabel(user)}
                        </span>
                      </span>
                    </button>
                  ) : (
                    <Button
                      onClick={handleAuthClick}
                      variant="outline"
                      className="h-10 rounded-xl border-orange-200 bg-white px-4 font-semibold text-orange-700 hover:bg-orange-50"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Button>
                  )
                ) : (
                  <div className="h-10 w-[148px] rounded-xl border border-orange-200 bg-white/60" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
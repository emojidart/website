"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type React from "react"
import PatternPad from "@/components/terminal/PatternPad"

import { Button } from "@/components/ui/button"
import { Loader2, Pencil} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { useDues } from "@/hooks/vereinsverwaltung/useDues"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  BarChart3,
  Users,
  Crown,
  ShieldCheck,
  Target,
  Trophy,
  Sparkles,
  ArrowRight,
  LogOut,
  Camera,
  Upload,
  Euro,
  Table,
  HelpCircle,
  Inbox,
  AlertTriangle,
  Bell,
  CheckCircle,
    Dumbbell,
  Printer,
  Trash2,
  ShoppingBag,
  Gift,
  KeyRound,
  CreditCard,
  FileText,
  FileCheck2,
  Download,
  ExternalLink,
  PenLine,
  RotateCcw,
  LockKeyhole,
  X,
} from "lucide-react"
import type { UserProfile, TeamMembership, Match, Notification } from "@/types"

type UserProfileWithLastSeen = UserProfile & { last_seen_at?: string | null }
type UserPagePermission = { page_key: string; allowed: boolean }

const formatDate = (date: string | Date) => {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatTime = (time: string) => {
  if (!time) return ""
  const [h, m] = time.split(":")
  if (!h || !m) return time
  return `${h}:${m}`
}

const getMatchStartDateTime = (match: any): Date | null => {
  const dateStr = match?.match_date
  if (!dateStr) return null
  const timeStr = match?.match_time
  if (timeStr) return new Date(`${dateStr}T${timeStr}`)
  return new Date(`${dateStr}T00:00:00`)
}

const formatCountdown = (target: Date) => {
  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return "Startet jetzt"

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return `${days} ${days === 1 ? "Tag" : "Tage"} · ${hours} Std.`
  }

  if (hours > 0) {
    return `${hours} Std. · ${minutes} Min.`
  }

  return `${Math.max(1, minutes)} Min.`
}

const formatCompactDate = (date: string | Date) => {
  const d = new Date(date)
  const weekday = d.toLocaleDateString("de-AT", { weekday: "short" }).replace(".", "")
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${weekday}, ${day}.${month}.`
}

const formatCurrencyEUR = (value: number) => {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0)
}

const formatMonthYearDE = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
}


const daysUntilDate = (iso: string | null | undefined) => {
  if (!iso) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${iso}T00:00:00`)
  target.setHours(0, 0, 0, 0)

  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

const formatShortDateAT = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const trialModuleLabel = (code: string) => {
  if (code === "premium_app") return "EMD App"
  if (code === "edart_league") return "E-Dart Liga"
  if (code === "steeldart_league") return "Steeldart Liga"
  if (code === "internal_tournaments") return "Interne Turniere"
  if (code === "external_tournaments") return "Externe Turniere"
  if (code === "external_events") return "Externe Veranstaltungen"
  if (code === "club_events") return "Vereinsveranstaltungen"
  if (code === "base_membership") return "Grundmitgliedschaft"
  return code
}

type MemberJoinDocument = {
  id: string
  storage_path: string
  title: string
  category: string
  version: string
  is_required: boolean
  minors_only: boolean
  sort_order: number
}

type MemberDocAcceptanceSnapshot = {
  document_id: string
  title: string
  category: string
  version: string
  storage_path: string
  opened_at: string
  accepted_at: string
}

type MemberDocAcceptanceRow = {
  id: string
  document_acceptances: MemberDocAcceptanceSnapshot[]
  signed_at: string
  guardian_full_name: string | null
  guardian_signed_at: string | null
  archive_file_name: string | null
  archive_sha256: string | null
  created_at: string
}

type JoinArchiveRow = {
  id: string
  request_id: string
  stage: "submitted" | "approved"
  file_name: string
  sha256: string
  generated_at: string
}

const MEMBER_DOC_CATEGORY_LABELS: Record<string, string> = {
  application: "Aufnahmeantrag / Beitrittserklärung",
  statutes: "Vereinssatzung / Vereinsregeln",
  confidentiality: "Verschwiegenheitserklärung",
  privacy: "Datenschutz / DSGVO",
  guardian: "Einverständnis gesetzliche Vertretung",
  other: "Vereinsdokument",
}

function memberDocAge(birthdate?: string | null) {
  if (!birthdate) return null
  const birth = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function MemberSignaturePad({ label, onChange }: { label: string; onChange: (value: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return
    const previous = hasInk ? canvas.toDataURL("image/png") : null
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(175 * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.4
    ctx.strokeStyle = "#0f172a"
    if (previous) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 175)
      img.src = previous
    }
  }

  useEffect(() => {
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastRef.current = point(event)
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const next = point(event)
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    lastRef.current = next
    if (!hasInk) setHasInk(true)
  }
  const finish = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    const canvas = canvasRef.current
    if (canvas && hasInk) onChange(canvas.toDataURL("image/png", 0.85))
  }
  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-slate-900">{label}</div>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <RotateCcw className="mr-1 h-4 w-4" /> Neu
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-[175px] w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
        />
      </div>
      <div className="text-xs font-semibold text-slate-500">Mit Maus, Touchpad, Finger oder Stift unterschreiben.</div>
    </div>
  )
}



type MessengerDownloadPlugin = {
  downloadApk: () => Promise<{ downloadId?: number }>
}

const NativeMessengerDownload = registerPlugin<MessengerDownloadPlugin>("MessengerDownload")

export default function MemberProfileAppPage() {
  const CHAT_SCOPE: "team" | "captains" | "club" = "team"

  const { session, loading: authLoading } = useAuth()
  const {
    loading: membershipAccessLoading,
    endsOn: normalMembershipEndsOn,
    activeTrials,
    hasModule,
  } = useMembershipAccess()

  const router = useRouter()

  const [profile, setProfile] = useState<UserProfileWithLastSeen | null>(null)
  const [photoDecision, setPhotoDecision] = useState<{
    id: string
    status: "approved" | "rejected"
    admin_note: string | null
    reviewed_at: string | null
  } | null>(null)
  const [nameDecision, setNameDecision] = useState<{
    id: string
    status: "approved" | "rejected"
    requested_name: string | null
    admin_note: string | null
    reviewed_at: string | null
  } | null>(null)
const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [isBlocked, setIsBlocked] = useState(false)
const [blockedReason, setBlockedReason] = useState<string | null>(null)
const [userPagePermissions, setUserPagePermissions] = useState<UserPagePermission[]>([])

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoMessage, setPhotoMessage] = useState("")
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [isTerminalPinDialogOpen, setIsTerminalPinDialogOpen] = useState(false)
  const [terminalPin, setTerminalPin] = useState("")
  const [terminalPinConfirm, setTerminalPinConfirm] = useState("")
  const [terminalPattern, setTerminalPattern] = useState<number[]>([])
  const [terminalPatternConfirm, setTerminalPatternConfirm] = useState<number[]>([])
  const [terminalAuthMethod, setTerminalAuthMethod] = useState<"pin" | "pattern">("pin")
  const [savedTerminalAuthMethod, setSavedTerminalAuthMethod] = useState<"pin" | "pattern" | null>(null)
  const [terminalAuthStatusLoading, setTerminalAuthStatusLoading] = useState(false)
  const [terminalPinSaving, setTerminalPinSaving] = useState(false)
  const [terminalPinMessage, setTerminalPinMessage] = useState("")

  const [memberDocsEnabled, setMemberDocsEnabled] = useState(false)
  const [memberDocsMandatory, setMemberDocsMandatory] = useState(false)
  const [memberDocs, setMemberDocs] = useState<MemberJoinDocument[]>([])
  const [memberDocAcceptances, setMemberDocAcceptances] = useState<MemberDocAcceptanceRow[]>([])
  const [joinArchives, setJoinArchives] = useState<JoinArchiveRow[]>([])
  const [memberDocsLoading, setMemberDocsLoading] = useState(false)
  const [memberDocsSaving, setMemberDocsSaving] = useState(false)
  const [memberDocsMessage, setMemberDocsMessage] = useState<string | null>(null)
  const [memberDocsModalOpen, setMemberDocsModalOpen] = useState(false)
  const [memberDocsAccepted, setMemberDocsAccepted] = useState<Record<string, MemberDocAcceptanceSnapshot>>({})
  const [memberDocsOpened, setMemberDocsOpened] = useState<Record<string, string>>({})
  const [memberDocsViewer, setMemberDocsViewer] = useState<{ doc: MemberJoinDocument; url: string } | null>(null)
  const [memberDocsViewerReadyAt, setMemberDocsViewerReadyAt] = useState<number | null>(null)
  const [, setMemberDocsViewerTick] = useState(0)
  const [memberSignature, setMemberSignature] = useState<string | null>(null)
  const [memberGuardianName, setMemberGuardianName] = useState("")
  const [memberGuardianSignature, setMemberGuardianSignature] = useState<string | null>(null)
  const [memberArchiveLoading, setMemberArchiveLoading] = useState<string | null>(null)

  const [statistics, setStatistics] = useState({
  legsWon: 0,
  legsLost: 0,
  legsPlayed: 0,
  winPercentage: 0,
  total180s: 0,
  total180er: 0,
})

  const clubPlayersForDues = useMemo(() => {
    if (!profile?.club_players) return []
    return [profile.club_players as any]
  }, [profile])

  // ✅ useDues: periodsByPlayer ist eine Map<playerId, periods[]>
  const { summaryRows: duesSummaryRows, periodsByPlayer } = useDues(session?.user ?? null, clubPlayersForDues as any, () => {})

  const myDues = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return null
    return duesSummaryRows.find((r) => r.player_id === pid) ?? null
  }, [duesSummaryRows, profile])

  // ✅ FIX: periodsByPlayer ist Map -> periodsByPlayer.get(pid)
  // ✅ FIX: Felder heißen due_on & amount
  const myDuesDetail = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) {
      return {
        overdueCount: 0,
        dueCount: 0,
        unpaidCount: 0,
        overdueAmount: 0,
        dueAmount: 0,
        unpaidAmount: 0,
        nextUnpaidDueDate: null as string | null,
      }
    }

    // ✅ periodsByPlayer ist eine Map => get(pid)
    const periods = (periodsByPlayer as any)?.get?.(pid) || []

    const overdue = periods.filter((p: any) => p.status_tone === "overdue")
    const due = periods.filter((p: any) => p.status_tone === "due")

    // ✅ Feld heißt amount (nicht amount_due)
    const overdueAmount = overdue.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    const dueAmount = due.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    const unpaidPeriods = [...overdue, ...due]
    const unpaidAmount = unpaidPeriods.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    // ✅ Feld heißt due_on (nicht due_date)
    const nextUnpaid = unpaidPeriods
      .slice()
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))[0]

    return {
      overdueCount: overdue.length,
      dueCount: due.length,
      unpaidCount: unpaidPeriods.length,
      overdueAmount,
      dueAmount,
      unpaidAmount,
      nextUnpaidDueDate: nextUnpaid?.due_on ?? null,
    }
  }, [periodsByPlayer, profile])

  const overdueMonthsLabel = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return []

    const periods = (periodsByPlayer as any)?.get?.(pid) || []
    const overdue = periods
      .filter((p: any) => p.status_tone === "overdue")
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))

    return Array.from(new Set(overdue.map((p: any) => formatMonthYearDE(p.due_on))))
  }, [periodsByPlayer, profile])

  const dueMonthsLabel = useMemo(() => {
    const pid = profile?.club_players?.id
    if (!pid) return []

    const periods = (periodsByPlayer as any)?.get?.(pid) || []
    const due = periods
      .filter((p: any) => p.status_tone === "due")
      .sort((a: any, b: any) => String(a.due_on).localeCompare(String(b.due_on)))

    return Array.from(new Set(due.map((p: any) => formatMonthYearDE(p.due_on))))
  }, [periodsByPlayer, profile])

  const duesBadgeText = useMemo(() => {
    const overdue = myDuesDetail.overdueCount
    const due = myDuesDetail.dueCount
    const unpaid = myDuesDetail.unpaidCount
    if (unpaid <= 0) return null

    const parts: string[] = []
    if (overdue > 0) parts.push(`${overdue}× überfällig`)
    if (due > 0) parts.push(`${due}× fällig`)
    return parts.join(" • ")
  }, [myDuesDetail])

  const membershipExpiryDays = daysUntilDate(normalMembershipEndsOn)

  const expiringTrials = useMemo(
    () =>
      (activeTrials || [])
        .map((trial: any) => ({
          ...trial,
          daysLeft: daysUntilDate(trial.ends_on),
        }))
        .filter(
          (trial: any) =>
            trial.daysLeft !== null &&
            trial.daysLeft >= 0 &&
            trial.daysLeft <= 30,
        )
        .sort((a: any, b: any) => Number(a.daysLeft) - Number(b.daysLeft)),
    [activeTrials],
  )

  const showNormalMembershipExpiry =
    membershipExpiryDays !== null &&
    membershipExpiryDays >= 0 &&
    membershipExpiryDays <= 30

  const [pendingMatches, setPendingMatches] = useState<Match[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [nextMatchSummary, setNextMatchSummary] = useState<null | {
    match: Match
    teamId: string
    counts: { yes: number; maybe: number; no: number; none: number }
    myStatus: "none" | "yes" | "maybe" | "no"
    myLineup: "none" | "starter" | "substitute"
  }>(null)
  const [countdown, setCountdown] = useState<string>("")

  const [chatRooms, setChatRooms] = useState<Array<{ id: string; name: string }>>([])
  const [leagueMailboxUnread, setLeagueMailboxUnread] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [messengerActivationCode, setMessengerActivationCode] = useState<string | null>(null)
  const [messengerActivationExpiresAt, setMessengerActivationExpiresAt] = useState<string | null>(null)
  const [messengerActivationLoading, setMessengerActivationLoading] = useState(false)
  const [messengerActivationMessage, setMessengerActivationMessage] = useState<string | null>(null)
  const [messengerDevices, setMessengerDevices] = useState<Array<{
    id: string
    device_name: string | null
    platform: string | null
    app_version: string | null
    activated_at: string
    last_seen_at: string
    revoked_at: string | null
  }>>([])


  useEffect(() => {
    const target = nextMatchSummary ? getMatchStartDateTime(nextMatchSummary.match as any) : null
    if (!target) {
      setCountdown("")
      return
    }
    const updateCountdown = () => setCountdown(formatCountdown(target))
    updateCountdown()
    const id = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(id)
  }, [nextMatchSummary])

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (!session?.user) return
    void loadTerminalAuthStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadTerminalAuthStatus = async () => {
    try {
      setTerminalAuthStatusLoading(true)
      const { data, error } = await supabase.rpc("terminal_get_my_auth_method")
      if (error) throw error
      const method = data === "pattern" ? "pattern" : data === "pin" ? "pin" : null
      setSavedTerminalAuthMethod(method)
      if (method) setTerminalAuthMethod(method)
    } catch (error) {
      console.error("Terminal auth status error:", error)
      setSavedTerminalAuthMethod(null)
    } finally {
      setTerminalAuthStatusLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return
    void loadProfileChangeDecisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadProfileChangeDecisions = async () => {
    if (!session?.user?.id) return

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [{ data: photoData, error: photoError }, { data: nameData, error: nameError }] = await Promise.all([
        supabase
          .from("profile_change_requests")
          .select("id,status,admin_note,reviewed_at")
          .eq("user_id", session.user.id)
          .eq("request_type", "photo")
          .in("status", ["approved", "rejected"])
          .is("user_acknowledged_at", null)
          .gte("reviewed_at", sevenDaysAgo)
          .order("reviewed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profile_change_requests")
          .select("id,status,requested_name,admin_note,reviewed_at")
          .eq("user_id", session.user.id)
          .eq("request_type", "name")
          .in("status", ["approved", "rejected"])
          .is("user_acknowledged_at", null)
          .gte("reviewed_at", sevenDaysAgo)
          .order("reviewed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (photoError) throw photoError
      if (nameError) throw nameError

      setPhotoDecision((photoData as any) || null)
      setNameDecision((nameData as any) || null)
    } catch (error) {
      console.error("Profile change decision load error:", error)
      setPhotoDecision(null)
      setNameDecision(null)
    }
  }

  const acknowledgeProfileDecision = async (requestId: string, kind: "photo" | "name") => {
    try {
      const { error } = await supabase.rpc("acknowledge_profile_change_request", {
        p_request_id: requestId,
      })
      if (error) throw error

      if (kind === "photo") setPhotoDecision(null)
      else setNameDecision(null)
    } catch (error) {
      console.error("Profile decision acknowledge error:", error)
    }
  }

  useEffect(() => {
    const rooms = (teamMemberships || [])
      .map((m: any) => ({
        id: m.teams?.chat_room_id,
        name: m.teams?.name || "Team-Chat",
      }))
      .filter((r: any) => !!r.id)

    setChatRooms(rooms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberships?.length])

  useEffect(() => {
    if (!profile?.id) return
    if (chatRooms.length === 0) return
    fetchUnreadCounts(chatRooms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, chatRooms?.length])

  useEffect(() => {
    if (membershipAccessLoading) return
    const playerId = (profile as any)?.player_id
    if (!playerId) return

    void fetchNextMatchSummary(playerId, teamMemberships)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipAccessLoading, profile?.player_id, teamMemberships])

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel("realtime-chat-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => fetchUnreadCounts(chatRooms))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, chatRooms])

  const fetchNotifications = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_player_id", playerId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      const enrichedNotifications = await Promise.all(
        (data || []).map(async (notification: any) => {
          if (notification.statistics_entry_id) {
            const { data: legData } = await supabase
              .from("leg_statistics")
              .select(`match_id, leg_number, player_legs_won, opponent_legs_won, player_id`)
              .eq("id", notification.statistics_entry_id)
              .single()

            if (legData) {
              const { data: matchData } = await supabase
                .from("matches")
                .select(
                  `match_date, home_team_type, away_team_type,
                   home_team:teams!matches_home_team_id_fkey(name),
                   away_team:teams!matches_away_team_id_fkey(name),
                   home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(name),
                   away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(name)`,
                )
                .eq("id", (legData as any).match_id)
                .single()

              const { data: playerData } = await supabase.from("club_players").select("name").eq("id", (legData as any).player_id).single()

              return { ...notification, leg_statistics: legData, match: matchData, player: playerData }
            }
          }
          return notification
        }),
      )

      setNotifications(enrichedNotifications as any)
    } catch (err) {
      console.error("Error fetching notifications:", err)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)
      if (error) throw error
      setNotifications((prev: any) => prev.filter((n: any) => n.id !== notificationId))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const fetchUnreadCounts = async (roomsOverride?: Array<{ id: string; name: string }>) => {
    const rooms = roomsOverride ?? chatRooms
    if (!profile?.id || rooms.length === 0) return

    try {
      const counts: Record<string, number> = {}

      for (const room of rooms) {
        const { data: visitData, error: visitError } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", room.id)
          .eq("scope", CHAT_SCOPE)
          .maybeSingle()

        if (visitError && (visitError as any).code === "42P01") {
          counts[room.id] = 0
          continue
        }

        const lastVisit = (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count, error: countError } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", lastVisit)
          .neq("user_id", profile.id)

        counts[room.id] = countError ? 0 : count || 0
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0)

  const fetchLeagueMailboxUnread = async () => {
    if (!session?.user?.id) {
      setLeagueMailboxUnread(0)
      return
    }

    try {
      const { data: participantRows, error: participantError } = await supabase
        .from("league_mail_participants")
        .select("thread_id,last_read_at")
        .eq("user_id", session.user.id)

      if (participantError) throw participantError

      const rows = participantRows || []
      const ids = rows.map((row: any) => row.thread_id).filter(Boolean)

      if (ids.length === 0) {
        setLeagueMailboxUnread(0)
        return
      }

      const { data: threadRows, error: threadError } = await supabase
        .from("league_mail_threads")
        .select("id,last_message_at")
        .in("id", ids)

      if (threadError) throw threadError

      const readMap = new Map(rows.map((row: any) => [row.thread_id, row.last_read_at]))
      const count = (threadRows || []).filter((thread: any) => {
        const lastRead = readMap.get(thread.id)
        if (!lastRead) return true
        return new Date(thread.last_message_at).getTime() > new Date(String(lastRead)).getTime()
      }).length

      setLeagueMailboxUnread(count)
    } catch (error) {
      console.error("League mailbox unread count error:", error)
      setLeagueMailboxUnread(0)
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return
    void fetchLeagueMailboxUnread()

    const channel = supabase
      .channel(`member_profile_league_mail_${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_mail_threads" }, () => void fetchLeagueMailboxUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "league_mail_messages" }, () => void fetchLeagueMailboxUnread())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])


  type AvailabilityStatus = "yes" | "maybe" | "no"

  const statusBadge = (s: "none" | AvailabilityStatus) => {
    if (s === "yes") return <Badge className="bg-green-600 text-white">Ja</Badge>
    if (s === "maybe") return <Badge className="bg-yellow-600 text-white">Nur wenn Not am Mann</Badge>
    if (s === "no") return <Badge className="bg-red-600 text-white">Nein</Badge>
    return <Badge variant="outline">Keine Antwort</Badge>
  }

  const getAvailabilityNudge = (status: "none" | AvailabilityStatus, lineup: "none" | "starter" | "substitute") => {
    const lineupHint =
      lineup === "starter" ? " Du bist aktuell in der Aufstellung." : lineup === "substitute" ? " Du bist als Ersatz vorgesehen." : ""

    if (status === "yes") return `Super, danke für deine Zusage!${lineupHint}`
    if (status === "maybe") return `Danke! Wenn Not am Mann ist, melden wir uns – wenn möglich, halte dir den Termin frei.${lineupHint}`
    if (status === "no") return `Schade – vielleicht hast du beim nächsten Spiel Zeit.${lineupHint}`
    return `Bitte gib kurz Bescheid, ob du kannst – das hilft bei der Planung.${lineupHint}`
  }

  const fetchNextMatchSummary = async (playerId: string, memberships: TeamMembership[]) => {
    try {
      const eligibleMemberships = memberships.filter((membership: any) => {
        const dartType = membership?.teams?.dart_type

        if (dartType === "edart") return hasModule("edart_league")
        if (dartType === "steeldart") return hasModule("steeldart_league")

        // Alte/sonstige Teams ohne Liga-Typ sollen hier keinen Liga-Hinweis erzeugen.
        return false
      })

      const teamIds = eligibleMemberships.map((t: any) => t.team_id).filter(Boolean)

      if (!playerId || teamIds.length === 0) {
        setNextMatchSummary(null)
        return
      }

      const today = new Date().toISOString().split("T")[0]
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`*,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
          away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .gte("match_date", today)
        .neq("status", "completed")
        .order("match_date", { ascending: true })
        .limit(1)

      if (matchesError) throw matchesError
      const next = (matchesData as any[] | null)?.[0] as Match | undefined
      if (!next) {
        setNextMatchSummary(null)
        return
      }

      const teamId = teamIds.includes((next as any).home_team_id) ? (next as any).home_team_id : (next as any).away_team_id

      const [{ data: av }, { data: lu }] = await Promise.all([
        supabase.from("match_availability").select("player_id,status").eq("match_id", (next as any).id).eq("team_id", teamId),
        supabase.from("match_lineups").select("player_id,is_substitute,position").eq("match_id", (next as any).id).eq("team_id", teamId),
      ])

      const rows = (av as any[] | null) ?? []
      const counts = { yes: 0, maybe: 0, no: 0, none: 0 }
      for (const r of rows) {
        if (r.status === "yes") counts.yes += 1
        else if (r.status === "maybe") counts.maybe += 1
        else if (r.status === "no") counts.no += 1
      }

const matchDate = (next as any).match_date as string // "YYYY-MM-DD"

const { count: teamMemberCount, error: teamMemberCountError } = await supabase
  .from("team_members")
  .select("id", { count: "exact", head: true })
  .eq("team_id", teamId)
  .lte("joined_at", matchDate)
  .or(`left_at.is.null,left_at.gt.${matchDate}`)

if (teamMemberCountError) throw teamMemberCountError

      const total = teamMemberCount ?? rows.length
      const answered = counts.yes + counts.maybe + counts.no
      counts.none = Math.max(0, total - answered)

      const myRow = rows.find((r) => r.player_id === playerId)
      const myStatus = (myRow?.status as AvailabilityStatus | undefined) ?? "none"

      const lineupRows = (lu as any[] | null) ?? []
      const myLu = lineupRows.find((r) => r.player_id === playerId)
      const myLineup: "none" | "starter" | "substitute" = myLu ? (myLu.is_substitute ? "substitute" : "starter") : "none"

      setNextMatchSummary({ match: next, teamId, counts, myStatus, myLineup })
    } catch (e) {
      console.error("fetchNextMatchSummary error", e)
      setNextMatchSummary(null)
    }
  }

const fetchProfile = async () => {
  if (!session?.user) return

  try {
    setLoading(true)
    setError(null)
    setIsBlocked(false)
    setBlockedReason(null)

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        user_id,
        player_id,
        last_seen_at,
        is_blocked,
        blocked_reason,
        club_players (
          id,
          name,
          photo_url,
          throwing_hand,
          age,
          birthdate,
          email,
          phone,
          street,
          house_number,
          postal_code,
          city,
          origin,
          club_joined_at,
          club_left_at
        )
      `)
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (profileError) throw profileError

    if (!profileData) {
      setError("Für dieses Konto wurde noch kein Profil gefunden.")
      setProfile(null)
      return
    }

    if ((profileData as any).is_blocked) {
      setIsBlocked(true)
      setBlockedReason((profileData as any).blocked_reason ?? null)
      setProfile(profileData as any)
      return
    }

    setProfile(profileData as any)

    if ((profileData as any)?.player_id) {
      const { data: permissionRows, error: permissionErr } = await supabase
        .from("user_page_permissions")
        .select("page_key, allowed")
        .eq("player_id", (profileData as any).player_id)

      if (permissionErr) throw permissionErr
      setUserPagePermissions((permissionRows ?? []) as any)
    } else {
      setUserPagePermissions([])
    }

    if ((profileData as any)?.player_id) {
      await fetchNotifications((profileData as any).player_id)

      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select(`
          id,
          team_id,
          role,
          teams (id, name, logo_url, chat_room_id, dart_type)
        `)
        .eq("player_id", (profileData as any).player_id)
        .is("left_at", null)

      if (teamError) throw teamError
      setTeamMemberships((teamData || []) as any)

      await fetchNextMatchSummary((profileData as any).player_id, (teamData || []) as any)

      const { data: legStats, error: legStatsError } = await supabase
        .from("leg_statistics")
        .select("match_id, player_legs_won, opponent_legs_won, throws_180")
        .eq("player_id", (profileData as any).player_id)

      if (legStatsError) throw legStatsError

      if (legStats) {
        const legsWon = (legStats as any[]).reduce(
          (sum, s) => sum + (Number(s.player_legs_won) || 0),
          0
        )

        const legsLost = (legStats as any[]).reduce(
          (sum, s) => sum + (Number(s.opponent_legs_won) || 0),
          0
        )

        const legsPlayed = legsWon + legsLost

        const winPercentage =
          legsPlayed > 0 ? Math.round((legsWon / legsPlayed) * 100) : 0

        const total180s = (legStats as any[]).reduce(
          (sum, s) => sum + (Number(s.throws_180) || 0),
          0
        )

        const totalEvents = new Set(
          (legStats as any[]).map((s) => s.match_id).filter(Boolean)
        ).size

        setStatistics((prev) => ({
          ...prev,
          legsWon,
          legsLost,
          legsPlayed,
          winPercentage,
          total180s,
          totalEvents,
        }))
      }
    }
  } catch (err: any) {
    console.error("Error fetching profile:", {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      full: err,
    })
    setError("Fehler beim Laden des Profils")
  } finally {
    setLoading(false)
  }
}










	  


  const loadMemberDocuments = async () => {
    if (!session?.user) return
    try {
      setMemberDocsLoading(true)
      const [settingsRes, docsRes, acceptanceRes, joinArchiveRes] = await Promise.all([
        supabase.from("club_join_settings").select("documents_enabled,existing_members_must_accept").eq("id", "default").maybeSingle(),
        supabase.from("club_join_documents").select("id,storage_path,title,category,version,is_required,minors_only,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("member_document_acceptances").select("id,document_acceptances,signed_at,guardian_full_name,guardian_signed_at,archive_file_name,archive_sha256,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("club_join_archives").select("id,request_id,stage,file_name,sha256,generated_at").eq("user_id", session.user.id).order("generated_at", { ascending: false }),
      ])
      if (settingsRes.error) throw settingsRes.error
      if (docsRes.error) throw docsRes.error
      if (acceptanceRes.error) throw acceptanceRes.error
      if (joinArchiveRes.error) throw joinArchiveRes.error
      setMemberDocsEnabled(!!settingsRes.data?.documents_enabled)
      setMemberDocsMandatory(!!settingsRes.data?.existing_members_must_accept)
      setMemberDocs((docsRes.data || []) as MemberJoinDocument[])
      setMemberDocAcceptances((acceptanceRes.data || []) as MemberDocAcceptanceRow[])
      setJoinArchives((joinArchiveRes.data || []) as JoinArchiveRow[])
    } catch (error: any) {
      console.error("member documents load error:", error)
      setMemberDocsMessage(error?.message || "Vereinsunterlagen konnten nicht geladen werden.")
    } finally {
      setMemberDocsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id && (profile as any)?.club_players?.id) void loadMemberDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, (profile as any)?.club_players?.id])

  useEffect(() => {
    if (!memberDocsViewerReadyAt) return
    const timer = window.setInterval(() => setMemberDocsViewerTick((v) => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [memberDocsViewerReadyAt])

  const memberAge = memberDocAge((profile as any)?.club_players?.birthdate)
  const memberIsMinor = memberAge !== null && memberAge < 18
  const visibleMemberDocs = useMemo(
    () => memberDocsEnabled ? memberDocs.filter((doc) => !doc.minors_only || memberIsMinor) : [],
    [memberDocs, memberDocsEnabled, memberIsMinor],
  )
  const requiredMemberDocs = visibleMemberDocs.filter((doc) => doc.is_required)
  const latestMemberAcceptance = memberDocAcceptances[0] || null
  const memberDocsCurrent = useMemo(() => {
    if (!memberDocsEnabled || requiredMemberDocs.length === 0) return true
    if (!latestMemberAcceptance?.signed_at) return false
    const accepted = new Map<string, MemberDocAcceptanceSnapshot>((latestMemberAcceptance.document_acceptances || []).map((doc) => [doc.document_id, doc]))
    const requiredOk = requiredMemberDocs.every((doc) => {
      const row = accepted.get(doc.id)
      return !!row && row.version === doc.version && !!row.accepted_at
    })
    const guardianOk = !memberIsMinor || (!!latestMemberAcceptance.guardian_full_name && !!latestMemberAcceptance.guardian_signed_at)
    return requiredOk && guardianOk
  }, [memberDocsEnabled, requiredMemberDocs, latestMemberAcceptance, memberIsMinor])
  const memberDocsBlockAccess = memberDocsEnabled && memberDocsMandatory && requiredMemberDocs.length > 0 && !memberDocsCurrent

  useEffect(() => {
    if (memberDocsBlockAccess) setMemberDocsModalOpen(true)
  }, [memberDocsBlockAccess])

  const openMemberDocument = async (doc: MemberJoinDocument) => {
    try {
      setMemberDocsMessage(null)
      const { data, error } = await supabase.storage.from("club-documents").createSignedUrl(doc.storage_path, 900)
      if (error) throw error
      if (!data?.signedUrl) throw new Error("Dokument konnte nicht geöffnet werden.")
      const now = new Date().toISOString()
      setMemberDocsOpened((prev) => ({ ...prev, [doc.id]: prev[doc.id] || now }))
      setMemberDocsViewer({ doc, url: data.signedUrl })
      setMemberDocsViewerReadyAt(Date.now())
      setMemberDocsViewerTick(0)
    } catch (error: any) {
      setMemberDocsMessage(error?.message || "Dokument konnte nicht geöffnet werden.")
    }
  }

  const memberViewerCanAccept = !!memberDocsViewerReadyAt && Date.now() - memberDocsViewerReadyAt >= 1800
  const acceptMemberViewer = () => {
    if (!memberDocsViewer || !memberViewerCanAccept) return
    const now = new Date().toISOString()
    setMemberDocsAccepted((prev) => ({
      ...prev,
      [memberDocsViewer.doc.id]: {
        document_id: memberDocsViewer.doc.id,
        title: memberDocsViewer.doc.title,
        category: memberDocsViewer.doc.category,
        version: memberDocsViewer.doc.version,
        storage_path: memberDocsViewer.doc.storage_path,
        opened_at: memberDocsOpened[memberDocsViewer.doc.id] || now,
        accepted_at: now,
      },
    }))
    setMemberDocsViewer(null)
    setMemberDocsViewerReadyAt(null)
  }

  const memberAllRequiredAccepted = requiredMemberDocs.every((doc) => !!memberDocsAccepted[doc.id])
  const memberGuardianComplete = !memberIsMinor || (!!memberGuardianName.trim() && !!memberGuardianSignature)
  const memberDocsReadyToSubmit = memberAllRequiredAccepted && !!memberSignature && memberGuardianComplete

  const submitMemberDocuments = async () => {
    if (!session?.access_token || !memberDocsReadyToSubmit) return
    try {
      setMemberDocsSaving(true)
      setMemberDocsMessage(null)
      const response = await fetch("/api/member-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          documents: visibleMemberDocs.filter((doc) => memberDocsAccepted[doc.id]).map((doc) => memberDocsAccepted[doc.id]),
          signature: memberSignature,
          guardianName: memberIsMinor ? memberGuardianName.trim() : null,
          guardianSignature: memberIsMinor ? memberGuardianSignature : null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Unterlagen konnten nicht gespeichert werden.")
      setMemberDocsMessage("Unterlagen wurden vollständig bestätigt und archiviert.")
      setMemberDocsAccepted({})
      setMemberSignature(null)
      setMemberGuardianName("")
      setMemberGuardianSignature(null)
      await loadMemberDocuments()
      setMemberDocsModalOpen(false)
    } catch (error: any) {
      setMemberDocsMessage(error?.message || "Unterlagen konnten nicht gespeichert werden.")
    } finally {
      setMemberDocsSaving(false)
    }
  }

  const downloadMemberAcceptance = async (row: MemberDocAcceptanceRow) => {
    if (!session?.access_token) return
    try {
      setMemberArchiveLoading(`member:${row.id}`)
      const response = await fetch(`/api/member-documents?id=${encodeURIComponent(row.id)}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "PDF konnte nicht geöffnet werden.")
      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (error: any) {
      setMemberDocsMessage(error?.message || "PDF konnte nicht geöffnet werden.")
    } finally {
      setMemberArchiveLoading(null)
    }
  }

  const downloadJoinArchiveForMember = async (row: JoinArchiveRow) => {
    if (!session?.access_token) return
    try {
      setMemberArchiveLoading(`join:${row.id}`)
      const response = await fetch("/api/club-join-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ requestId: row.request_id, stage: row.stage, action: "download" }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "PDF konnte nicht geöffnet werden.")
      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (error: any) {
      setMemberDocsMessage(error?.message || "PDF konnte nicht geöffnet werden.")
    } finally {
      setMemberArchiveLoading(null)
    }
  }


  const loadMessengerDevices = async () => {
    if (!session?.user?.id) {
      setMessengerDevices([])
      return
    }

    const { data, error } = await supabase
      .from("messenger_devices")
      .select("id,device_name,platform,app_version,activated_at,last_seen_at,revoked_at")
      .eq("user_id", session.user.id)
      .is("revoked_at", null)
      .order("activated_at", { ascending: false })

    if (error) {
      console.error("Messenger devices load error:", error)
      return
    }

    setMessengerDevices((data || []) as any)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    void loadMessengerDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const createMessengerActivationCode = async () => {
    if (!session?.access_token || messengerActivationLoading) return

    setMessengerActivationLoading(true)
    setMessengerActivationMessage(null)

    try {
      const { data, error } = await supabase.functions.invoke("messenger-activation", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: "create",
        },
      })

      if (error) throw error
      if (!data?.code) throw new Error(data?.error || "Aktivierungscode konnte nicht erstellt werden.")

      setMessengerActivationCode(String(data.code))
      setMessengerActivationExpiresAt(data.expiresAt || null)
      setMessengerActivationMessage("Code ist 10 Minuten gültig und kann nur einmal verwendet werden.")
    } catch (error: any) {
      console.error("Messenger activation code error:", error)
      setMessengerActivationMessage(
        error?.context?.body?.error ||
        error?.message ||
        "Aktivierungscode konnte nicht erstellt werden.",
      )
    } finally {
      setMessengerActivationLoading(false)
    }
  }

  const openMessengerInstall = async () => {
    if (typeof window === "undefined") return

    const apkUrl = "https://emojisdartverein.com/downloads/emd-messenger.apk"

    if (!Capacitor.isNativePlatform()) {
      window.location.href = apkUrl
      return
    }

    try {
      await NativeMessengerDownload.downloadApk()
    } catch (error) {
      console.error("Messenger APK download failed:", error)
      window.location.href = apkUrl
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const saveTerminalAuth = async () => {
    setTerminalPinMessage("")

    let secret = ""
    if (terminalAuthMethod === "pin") {
      if (!/^\d{4}$/.test(terminalPin)) {
        setTerminalPinMessage("Bitte genau 4 Ziffern eingeben.")
        return
      }
      if (terminalPin !== terminalPinConfirm) {
        setTerminalPinMessage("Die beiden PINs stimmen nicht überein.")
        return
      }
      secret = terminalPin
    } else {
      if (terminalPattern.length < 4) {
        setTerminalPinMessage("Das Muster muss mindestens 4 Punkte enthalten.")
        return
      }
      if (terminalPattern.join("-") !== terminalPatternConfirm.join("-")) {
        setTerminalPinMessage("Die beiden Muster stimmen nicht überein.")
        return
      }
      secret = terminalPattern.join("-")
    }

    try {
      setTerminalPinSaving(true)
      const { error } = await supabase.rpc("terminal_set_my_auth", {
        p_method: terminalAuthMethod,
        p_secret: secret,
      })
      if (error) throw error

      setTerminalPinMessage(
        terminalAuthMethod === "pattern"
          ? "Terminal-Muster wurde gespeichert."
          : "Terminal-PIN wurde gespeichert.",
      )
      setSavedTerminalAuthMethod(terminalAuthMethod)
      setTerminalPin("")
      setTerminalPinConfirm("")
      setTerminalPattern([])
      setTerminalPatternConfirm([])

      window.setTimeout(() => {
        setIsTerminalPinDialogOpen(false)
        setTerminalPinMessage("")
      }, 1200)
    } catch (error) {
      console.error("Terminal auth save error:", error)
      setTerminalPinMessage("Terminal-Anmeldung konnte nicht gespeichert werden.")
    } finally {
      setTerminalPinSaving(false)
    }
  }

  const handlePhotoUpload = async () => {
    if (!photoFile || !session?.user?.id || !(profile as any)?.club_players?.id) return

    setPhotoUploading(true)
    setPhotoMessage("")

    try {
      const rawExt = (photoFile.name.split(".").pop() || "jpg").toLowerCase()
      const fileExtension = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg"
      const safeOriginalName = photoFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_")
      const filePath = `${session.user.id}/${Date.now()}-${safeOriginalName}`

      const { error: uploadError } = await supabase.storage
        .from("profile-change-requests")
        .upload(filePath, photoFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: photoFile.type || `image/${fileExtension}`,
        })

      if (uploadError) throw uploadError

      const { error: requestError } = await supabase.rpc("submit_member_photo_change_request", {
        p_upload_path: filePath,
        p_original_filename: photoFile.name,
      })

      if (requestError) throw requestError

      setPhotoMessage(
        "Anfrage gesendet. Dein aktuelles Profilbild bleibt unverändert, bis der Vorstand das neue Foto bearbeitet und freigibt.",
      )
      setPhotoDecision(null)
      setPhotoFile(null)
      setPhotoPreview(null)

      window.setTimeout(() => {
        setIsPhotoDialogOpen(false)
        setPhotoMessage("")
      }, 2200)
    } catch (error: any) {
      console.error("Profile photo request error:", error)
      setPhotoMessage(`Fehler: ${error?.message || "Anfrage konnte nicht gesendet werden."}`)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Captain":
        return <Crown className="h-5 w-5 text-yellow-600" />
      case "Co-Captain":
        return <ShieldCheck className="h-5 w-5 text-blue-600" />
      default:
        return <Target className="h-5 w-5 text-orange-600" />
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "Captain":
        return "Kapitän"
      case "Co-Captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  const hasClubRole = userPagePermissions.some((p) => p.allowed)
  const hasLeagueAccess = hasModule("edart_league") || hasModule("steeldart_league")

  const navigationGroups = [
    {
      title: "Verein & Service",
      description: "Kalender, Bonuspunkte, Börse und Hilfe",
      items: [
        { title: "Vereinskalender", description: "Termine & Veranstaltungen", icon: Calendar, href: "/vereinskalender-app" },
        { title: "Dartbörse", description: "Darts & Zubehör", icon: ShoppingBag, href: "/dartboerse" },
        { title: "Meine Bonuspunkte", description: "Punkte & Rang ansehen", icon: Sparkles, href: "/meine-bonus-punkte" },
        { title: "Support", description: "Hilfe & Anfragen", icon: HelpCircle, href: "/support-app" },
      ],
    },
  ]

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  const formatLastSeen = (timestamp?: string | null) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  const getTeamDisplayName = (match: Match, isHome: boolean) => {
    if (!match) return "Unbekannt"

    if (isHome) {
      if ((match as any).home_team_type === "own" && (match as any).home_team) return (match as any).home_team.name
      if ((match as any).home_team_type === "opponent" && (match as any).home_opponent_team) return (match as any).home_opponent_team.name
    } else {
      if ((match as any).away_team_type === "own" && (match as any).away_team) return (match as any).away_team.name
      if ((match as any).away_team_type === "opponent" && (match as any).away_opponent_team) return (match as any).away_opponent_team.name
    }
    return "Unbekannt"
  }

  const isLeadershipRole = () => {
    return teamMemberships.some((m: any) => m.role === "Captain" || m.role === "Co-Captain")
  }

   // ✅ LOADING VIEW 
  if (loading) {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-24 overflow-x-hidden">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 pb-20 pt-12 sm:pt-14">
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-gray-200">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">Profil wird geladen</p>
              <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  )
}
if (isBlocked) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-wide text-white/80">
                      Zugang gesperrt
                    </div>
                    <div className="text-xl font-extrabold">
                      Konto derzeit nicht verfügbar
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Dein Zugang wurde vorübergehend gesperrt.
                </p>

                {blockedReason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-4">
                    <span className="font-semibold">Grund:</span> {blockedReason}
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-6">
                  Bitte wende dich an die Vereinsleitung, falls du glaubst, dass das ein Fehler ist.
                </p>

                <Button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Abmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

if (error || !profile) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-3xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {error || "Profil nicht gefunden"}
              </h1>

              <p className="text-sm text-gray-600 mb-6">
                Es konnte kein vollständiges Mitgliederprofil geladen werden.
              </p>

              <Button onClick={() => router.push("/member-login")}>
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

  const primaryTeam = teamMemberships[0]
  const hasMultipleTeams = teamMemberships.length > 1

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* High-End 2026 background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
          <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
          <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                  </span>
                  Mein EMD · Mitgliederbereich
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative shrink-0">
                    <div className="absolute inset-[-6px] rounded-full bg-[conic-gradient(from_90deg,rgba(249,115,22,.85),rgba(255,255,255,.12),rgba(14,165,233,.7),rgba(249,115,22,.85))] opacity-70 blur-[1px]" />
                    <Avatar className="relative h-[76px] w-[76px] border-2 border-[#080b10] shadow-[0_16px_50px_rgba(0,0,0,.55)] sm:h-24 sm:w-24">
                      <AvatarImage
                        src={profile.club_players?.photo_url || "/placeholder.svg?height=96&width=96&query=dart player avatar"}
                        alt={profile.club_players?.name || "Spieler"}
                      />
                      <AvatarFallback className="bg-orange-500 text-2xl font-black text-white sm:text-3xl">
                        {(profile.club_players?.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => setIsPhotoDialogOpen(true)}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#11151c] text-white shadow-xl transition duration-300 hover:scale-105 hover:bg-orange-500"
                      aria-label="Profilfoto-Änderung anfragen"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Willkommen zurück</p>
                    <h1 className="mt-1 truncate text-[clamp(1.8rem,5vw,3.4rem)] font-black leading-none tracking-[-0.055em] text-white">
                      {profile.club_players?.name || "Vereinsmitglied"}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {teamMemberships.length > 0 ? (
                        teamMemberships.slice(0, 3).map((membership: any) => (
                          <span
                            key={membership.id}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-[11px] font-bold text-white/70"
                          >
                            <span className="truncate">{membership.teams?.name || "Team"}</span>
                            <span className="text-white/25">·</span>
                            <span className="shrink-0 text-orange-300">{getRoleLabel(membership.role)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-semibold text-white/45">Emoj!´s Dartverein</span>
                      )}
                      {teamMemberships.length > 3 ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-white/45">
                          +{teamMemberships.length - 3} weitere
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:max-w-[620px] xl:justify-end">
                <Button asChild variant="outline" className="h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white hover:bg-white/[0.09] hover:text-white">
                  <Link href="/profil-daten-app"><Pencil className="mr-2 h-4 w-4" />Profil</Link>
                </Button>
                <Button asChild className="h-11 rounded-2xl border border-orange-400/30 bg-orange-500 px-4 font-black text-white shadow-[0_0_30px_rgba(249,115,22,.17)] hover:bg-orange-400">
                  <Link href="/member-card"><CreditCard className="mr-2 h-4 w-4" />Mitgliedskarte</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTerminalPin("")
                    setTerminalPinConfirm("")
                    setTerminalPattern([])
                    setTerminalPatternConfirm([])
                    setTerminalPinMessage("")
                    if (savedTerminalAuthMethod) setTerminalAuthMethod(savedTerminalAuthMethod)
                    setIsTerminalPinDialogOpen(true)
                  }}
                  className={`h-11 rounded-2xl px-4 font-black ${
                    savedTerminalAuthMethod
                      ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100 hover:bg-emerald-500/[0.13] hover:text-white"
                      : "border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]"
                  }`}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {terminalAuthStatusLoading
                    ? "Terminal-Anmeldung"
                    : savedTerminalAuthMethod === "pattern"
                      ? "Muster aktiv · ändern"
                      : savedTerminalAuthMethod === "pin"
                        ? "PIN aktiv · ändern"
                        : "Terminal-Anmeldung einrichten"}
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white hover:bg-white/[0.09] hover:text-white">
                  <Link href="/member-membership">Mitgliedschaft</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white hover:bg-white/[0.09] hover:text-white">
                  <Link href="/chat-app"><MessageCircle className="mr-2 h-4 w-4" />Chat</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white hover:bg-white/[0.09] hover:text-white">
                  <Link href="/member-availability"><CheckCircle className="mr-2 h-4 w-4" />Aufstellung</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2.5 sm:mt-8 sm:gap-3">
              {[
                { label: "Teams", value: teamMemberships.length, icon: Users },
                { label: "Nächstes Spiel", value: nextMatchSummary ? formatCompactDate((nextMatchSummary.match as any).match_date) : "Offen", icon: Calendar },
                { label: "Team-Chat", value: totalUnread, icon: MessageCircle },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-white/[0.05] p-3.5 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-xl sm:border-white/[0.08] sm:bg-white/[0.045] sm:shadow-none sm:p-4">
                    <div className="pointer-events-none absolute inset-0 opacity-100 transition duration-500 bg-[radial-gradient(circle_at_15%_100%,rgba(249,115,22,.10),transparent_42%),radial-gradient(circle_at_92%_0%,rgba(14,165,233,.055),transparent_38%)] sm:opacity-0 sm:bg-[linear-gradient(130deg,rgba(249,115,22,.08),transparent_52%)] group-hover:opacity-100" />
                    <div className="relative text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:text-[10px]">{item.label}</div>
                    <div className="relative mt-2.5 flex items-end justify-between gap-2">
                      <div className="truncate text-lg font-black tracking-tight text-white sm:text-2xl">{item.value}</div>
                      <Icon className="h-4 w-4 shrink-0 text-orange-400 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="group relative overflow-hidden rounded-[26px] border border-orange-300/[0.14] bg-[#090b10]/92 p-4 shadow-[0_26px_90px_-52px_rgba(249,115,22,.65)] backdrop-blur-2xl sm:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(249,115,22,.18),transparent_38%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,.09),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-x-[10%] bottom-0 h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-orange-300/20 bg-orange-500/10 text-orange-200 shadow-[0_0_28px_rgba(249,115,22,.13)]">
                    <MessageCircle className="h-7 w-7" />
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#090b10] bg-orange-500 px-1 text-[9px] font-black text-white">EMD</span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/70">EMD Messenger</div>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Messenger verbinden</h2>
                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-white/45">
                      Messenger installieren und anschließend einmalig mit einem 6-stelligen Code mit deinem EMD Konto verbinden.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={openMessengerInstall}
                  className="h-12 shrink-0 rounded-2xl border border-orange-300/25 bg-orange-500 px-5 font-black text-white shadow-[0_0_30px_rgba(249,115,22,.22)] transition hover:bg-orange-400 active:scale-[0.985]"
                >
                  <Download className="mr-2 h-4 w-4" /> Messenger installieren
                </Button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_.95fr]">
                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Aktivierung</div>
                      <div className="mt-1 text-base font-black text-white">
                        {messengerActivationCode ? "Dein einmaliger Code" : "Messenger auf neuem Gerät verbinden"}
                      </div>
                    </div>
                    <KeyRound className="h-5 w-5 shrink-0 text-orange-300" />
                  </div>

                  {messengerActivationCode ? (
                    <div className="mt-4">
                      <div className="rounded-2xl border border-orange-300/20 bg-orange-500/10 px-4 py-4 text-center">
                        <div className="select-all text-3xl font-black tracking-[0.32em] text-orange-100">
                          {messengerActivationCode}
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-white/40">
                        {messengerActivationMessage || "10 Minuten gültig · einmal verwendbar"}
                        {messengerActivationExpiresAt ? ` · bis ${new Date(messengerActivationExpiresAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold leading-5 text-white/40">
                      Öffne danach den EMD Messenger und gib diesen Code dort ein. Dein Passwort wird im Messenger nicht benötigt.
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={() => void createMessengerActivationCode()}
                    disabled={messengerActivationLoading}
                    className="mt-4 h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] font-black text-white hover:bg-white/[0.09]"
                  >
                    <KeyRound className="mr-2 h-4 w-4 text-orange-300" />
                    {messengerActivationLoading
                      ? "Code wird erstellt…"
                      : messengerActivationCode
                        ? "Neuen Code erstellen"
                        : "Aktivierungscode erstellen"}
                  </Button>

                  {!messengerActivationCode && messengerActivationMessage ? (
                    <div className="mt-3 text-xs font-semibold text-red-200">{messengerActivationMessage}</div>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Verbundene Geräte</div>
                      <div className="mt-1 text-base font-black text-white">
                        {messengerDevices.length > 0
                          ? `${messengerDevices.length} ${messengerDevices.length === 1 ? "Gerät" : "Geräte"} aktiviert`
                          : "Noch kein Gerät aktiviert"}
                      </div>
                    </div>
                    <ShieldCheck className={`h-5 w-5 shrink-0 ${messengerDevices.length > 0 ? "text-emerald-300" : "text-white/25"}`} />
                  </div>

                  <div className="mt-3 space-y-2">
                    {messengerDevices.length > 0 ? messengerDevices.slice(0, 3).map((device) => (
                      <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/15 px-3 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">{device.device_name || "EMD Messenger Gerät"}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-white/35">
                            Aktiviert am {new Date(device.activated_at).toLocaleDateString("de-AT")}
                            {device.app_version ? ` · App ${device.app_version}` : ""}
                          </div>
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/[0.08] px-3 py-4 text-sm font-semibold leading-5 text-white/35">
                        Nach der ersten erfolgreichen Code-Eingabe erscheint dein Messenger-Gerät hier automatisch.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(photoDecision || nameDecision) ? (
          <section className="mt-4 grid gap-3">
            {nameDecision ? (
              <div className={`overflow-hidden rounded-[24px] border p-4 backdrop-blur-xl sm:p-5 ${
                nameDecision.status === "approved"
                  ? "border-emerald-300/20 bg-emerald-500/[0.08]"
                  : "border-red-300/20 bg-red-500/[0.08]"
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      nameDecision.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-red-500/15 text-red-200"
                    }`}>
                      {nameDecision.status === "approved" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                        nameDecision.status === "approved" ? "text-emerald-200/60" : "text-red-200/60"
                      }`}>
                        Namensänderung
                      </div>
                      <div className="mt-1 text-lg font-black text-white">
                        {nameDecision.status === "approved"
                          ? "Deine Namensänderung wurde übernommen."
                          : "Deine Namensänderung wurde nicht übernommen."}
                      </div>
                      {nameDecision.requested_name ? (
                        <div className="mt-1 text-sm font-semibold text-white/45">
                          Angefragter Name: {nameDecision.requested_name}
                        </div>
                      ) : null}
                      {nameDecision.admin_note ? (
                        <div className="mt-2 text-sm font-semibold leading-6 text-white/55">
                          Hinweis: {nameDecision.admin_note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void acknowledgeProfileDecision(nameDecision.id, "name")}
                    className="shrink-0 rounded-xl border-white/10 bg-white/[0.05] font-black text-white/75 hover:bg-white/[0.09] hover:text-white"
                  >
                    Verstanden
                  </Button>
                </div>
              </div>
            ) : null}

            {photoDecision ? (
              <div className={`overflow-hidden rounded-[24px] border p-4 backdrop-blur-xl sm:p-5 ${
                photoDecision.status === "approved"
                  ? "border-emerald-300/20 bg-emerald-500/[0.08]"
                  : "border-red-300/20 bg-red-500/[0.08]"
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      photoDecision.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-red-500/15 text-red-200"
                    }`}>
                      {photoDecision.status === "approved" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                        photoDecision.status === "approved" ? "text-emerald-200/60" : "text-red-200/60"
                      }`}>
                        Profilbild-Anfrage
                      </div>
                      <div className="mt-1 text-lg font-black text-white">
                        {photoDecision.status === "approved"
                          ? "Dein neues Profilbild wurde übernommen."
                          : "Deine Profilbild-Änderung wurde nicht übernommen."}
                      </div>
                      {photoDecision.admin_note ? (
                        <div className="mt-2 text-sm font-semibold leading-6 text-white/55">
                          Hinweis: {photoDecision.admin_note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void acknowledgeProfileDecision(photoDecision.id, "photo")}
                    className="shrink-0 rounded-xl border-white/10 bg-white/[0.05] font-black text-white/75 hover:bg-white/[0.09] hover:text-white"
                  >
                    Verstanden
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
        {/* Alerts */}
        {!membershipAccessLoading && (showNormalMembershipExpiry || expiringTrials.length > 0) ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {showNormalMembershipExpiry && normalMembershipEndsOn ? (
              <div className="flex flex-col gap-3 rounded-[22px] border border-amber-300/15 bg-amber-300/[0.07] px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-white">Mitgliedschaft läuft bald aus</div>
                    <div className="mt-0.5 text-sm text-white/50">Freigeschaltet bis {formatShortDateAT(normalMembershipEndsOn)}.</div>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-xl border-white/10 bg-white/[0.05] text-white hover:bg-white/10 hover:text-white">
                  <Link href="/member-membership">Ansehen</Link>
                </Button>
              </div>
            ) : null}

            {expiringTrials.map((trial: any) => (
              <div key={trial.id} className="flex flex-col gap-3 rounded-[22px] border border-violet-300/15 bg-violet-400/[0.07] px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
                    <Gift className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-white">Testphase: {trialModuleLabel(trial.module_code)}</div>
                    <div className="mt-0.5 text-sm text-white/50">Kostenlos bis {formatShortDateAT(trial.ends_on)}.</div>
                  </div>
                </div>
                <div className="text-xs font-black uppercase tracking-wide text-violet-200">Noch {trial.daysLeft} Tage</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Documents */}
        <section id="vereinsunterlagen" className="mt-4 overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                <FileCheck2 className="h-4 w-4 text-orange-400" /> Vereinsunterlagen
              </div>
              <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">Meine Dokumente & Bestätigungen</h2>
            </div>
            {memberDocsEnabled && requiredMemberDocs.length > 0 ? (
              <Badge className={memberDocsCurrent ? "w-fit border border-emerald-300/20 bg-emerald-500/15 text-emerald-200" : "w-fit border border-amber-300/20 bg-amber-500/15 text-amber-200"}>
                {memberDocsCurrent ? "Aktuell vollständig" : "Bestätigung offen"}
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit border-white/10 bg-white/[0.04] text-white/45">Noch nicht freigeschaltet</Badge>
            )}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {memberDocsLoading ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-white/55"><Loader2 className="h-4 w-4 animate-spin text-orange-400" /> Unterlagen werden geladen…</div>
            ) : !memberDocsEnabled ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-5">
                <div className="font-black text-white">Aktuell keine Vereinsunterlagen zur digitalen Bestätigung freigeschaltet.</div>
                <div className="mt-1 text-sm font-semibold text-white/45">Sobald die Vereinsleitung die finalen Dokumente freigibt, erscheinen sie automatisch hier.</div>
              </div>
            ) : visibleMemberDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-5 text-sm font-semibold text-white/50">Aktuell sind keine aktiven Dokumente hinterlegt.</div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-white">{visibleMemberDocs.length} Dokument{visibleMemberDocs.length === 1 ? "" : "e"} freigeschaltet</div>
                  <div className="mt-1 text-sm font-semibold text-white/50">{memberDocsCurrent ? "Du hast die aktuell erforderlichen Versionen bereits bestätigt." : "Bitte lies und bestätige die aktuell erforderlichen Unterlagen."}</div>
                </div>
                <Button type="button" onClick={() => setMemberDocsModalOpen(true)} className="rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400">
                  <FileText className="mr-2 h-4 w-4" /> {memberDocsCurrent ? "Unterlagen ansehen" : "Jetzt bestätigen"}
                </Button>
              </div>
            )}

            {(joinArchives.length > 0 || memberDocAcceptances.some((r) => r.archive_file_name)) ? (
              <div>
                <div className="mb-2 text-sm font-black text-white/80">Meine PDF-Akten</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {joinArchives.map((row) => (
                    <button key={row.id} type="button" onClick={() => void downloadJoinArchiveForMember(row)} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-orange-400/25 hover:bg-white/[0.065]">
                      <div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.stage === "approved" ? "Aufnahmebestätigung" : "Beitrittsanfrage"}</div><div className="text-xs font-semibold text-white/35">{formatDate(row.generated_at)}</div></div>
                      {memberArchiveLoading === `join:${row.id}` ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : <Download className="h-4 w-4 text-white/35 transition group-hover:text-orange-300" />}
                    </button>
                  ))}
                  {memberDocAcceptances.filter((r) => r.archive_file_name).map((row) => (
                    <button key={row.id} type="button" onClick={() => void downloadMemberAcceptance(row)} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-orange-400/25 hover:bg-white/[0.065]">
                      <div className="min-w-0"><div className="truncate text-sm font-black text-white">Vereinsunterlagen bestätigt</div><div className="text-xs font-semibold text-white/35">{formatDate(row.created_at)}</div></div>
                      {memberArchiveLoading === `member:${row.id}` ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : <Download className="h-4 w-4 text-white/35 transition group-hover:text-orange-300" />}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {memberDocsMessage ? <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-bold text-white/60">{memberDocsMessage}</div> : null}
          </div>
        </section>

        {/* Main dashboard */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.72fr)]">
          <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Nächstes Spiel</div>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
                  {nextMatchSummary ? "Dein nächster Termin" : "Aktuell kein Spiel geplant"}
                </h2>
              </div>
              <Button
                size="sm"
                disabled={!nextMatchSummary}
                onClick={() => nextMatchSummary && router.push(`/member-availability?matchId=${(nextMatchSummary.match as any).id}`)}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 font-black text-white hover:bg-orange-500 disabled:opacity-30"
              >
                Öffnen <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 sm:p-5">
              {!nextMatchSummary ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/40">
                  Sobald ein neues Ligaspiel feststeht, erscheint es hier.
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#080b10] px-4 py-5 text-white sm:px-5">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-500/15 blur-[70px]" />
                    <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-[80px]" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Begegnung</div>
                        <div className="mt-2 text-xl font-black tracking-[-0.03em] sm:text-2xl">
                          {getTeamDisplayName(nextMatchSummary.match, true)}
                          <span className="mx-2 font-medium text-white/20">vs</span>
                          {getTeamDisplayName(nextMatchSummary.match, false)}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-2xl border border-orange-300/15 bg-orange-500/[0.08] px-3.5 py-2.5">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Start in</div>
                        <div className="mt-0.5 whitespace-nowrap text-sm font-black text-orange-300">{countdown || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "Termin", icon: Calendar, value: `${formatDate((nextMatchSummary.match as any).match_date)}${(nextMatchSummary.match as any).match_time ? ` · ${formatTime((nextMatchSummary.match as any).match_time)}` : ""}` },
                      { label: "Ort", icon: MapPin, value: (nextMatchSummary.match as any).venue || "Noch offen" },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]">
                            <Icon className="h-4 w-4 text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">{item.label}</div>
                            <div className="truncate text-sm font-bold text-white/75">{item.value}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Zusagen", value: nextMatchSummary.counts.yes, dot: "bg-emerald-400" },
                      { label: "Vielleicht", value: nextMatchSummary.counts.maybe, dot: "bg-amber-400" },
                      { label: "Absagen", value: nextMatchSummary.counts.no, dot: "bg-rose-400" },
                      { label: "Offen", value: nextMatchSummary.counts.none, dot: "bg-white/25" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-3.5">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                          <span className={`h-2 w-2 rounded-full ${item.dot}`} />{item.label}
                        </div>
                        <div className="mt-2 text-2xl font-black tracking-tight text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Dein Status</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {statusBadge(nextMatchSummary.myStatus)}
                        {nextMatchSummary.myLineup === "starter" ? (
                          <Badge className="rounded-full bg-orange-500 text-white">Stamm</Badge>
                        ) : nextMatchSummary.myLineup === "substitute" ? (
                          <Badge className="rounded-full border border-white/10 bg-white/[0.06] text-white/70">Ersatz</Badge>
                        ) : (
                          <Badge className="rounded-full border border-white/10 bg-transparent text-white/45">Noch nicht aufgestellt</Badge>
                        )}
                      </div>
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-white/50">{getAvailabilityNudge(nextMatchSummary.myStatus, nextMatchSummary.myLineup)}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-5">
              <div className="pointer-events-none absolute right-[-50px] top-[-50px] h-36 w-36 rounded-full bg-sky-500/10 blur-[55px]" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Performance</div>
                  <h2 className="mt-1 text-lg font-black text-white">Liga-Statistik</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                  <BarChart3 className="h-5 w-5 text-orange-400" />
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Legs gewonnen", value: statistics.legsWon },
                  { label: "Siegquote", value: `${statistics.winPercentage}%` },
                  { label: "Leg-Bilanz", value: `${statistics.legsWon}:${statistics.legsLost}` },
                  { label: "180er", value: statistics.total180s },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-3.5">
                    <div className="text-[9px] font-black uppercase tracking-[0.13em] text-white/28">{stat.label}</div>
                    <div className="mt-1.5 text-xl font-black tracking-tight text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {totalUnread > 0 ? (
              <button
                type="button"
                onClick={() => router.push('/chat-app')}
                className="group relative w-full overflow-hidden rounded-[26px] border border-orange-300/15 bg-orange-500/[0.075] p-4 text-left backdrop-blur-xl transition duration-300 hover:border-orange-300/30 hover:bg-orange-500/[0.12] sm:p-5"
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-500/20 blur-[45px]" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/75">Team-Chat</div>
                    <div className="mt-1 text-lg font-black text-white">{totalUnread} neue Nachricht{totalUnread === 1 ? '' : 'en'}</div>
                    <div className="mt-1 text-sm text-white/45">Direkt zu deinen Team-Chats</div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-orange-300 transition group-hover:scale-105 group-hover:bg-orange-500 group-hover:text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                </div>
              </button>
            ) : null}

            {leagueMailboxUnread > 0 ? (
              <button
                type="button"
                onClick={() => router.push('/league-mailbox')}
                className="group relative w-full overflow-hidden rounded-[26px] border border-sky-300/15 bg-sky-500/[0.075] p-4 text-left backdrop-blur-xl transition duration-300 hover:border-sky-300/30 hover:bg-sky-500/[0.12] sm:p-5"
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-500/20 blur-[45px]" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/75">Liga-Postfach</div>
                    <div className="mt-1 text-lg font-black text-white">{leagueMailboxUnread} neue Nachricht{leagueMailboxUnread === 1 ? '' : 'en'}</div>
                    <div className="mt-1 text-sm text-white/45">Private Liga-Fälle und Hinweise öffnen</div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sky-300 transition group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white">
                    <Inbox className="h-5 w-5" />
                  </div>
                </div>
              </button>
            ) : null}
          </aside>
        </div>

        {hasClubRole ? (
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="group relative mt-4 flex w-full items-center justify-between gap-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#080b10]/90 px-4 py-4 text-left text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] transition duration-300 hover:border-orange-400/25 sm:px-5"
          >
            <div className="pointer-events-none absolute right-[10%] top-[-80px] h-44 w-44 rounded-full bg-orange-500/10 blur-[60px]" />
            <div className="relative min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/28">Vereinsbereich</div>
              <div className="mt-1 text-lg font-black">Admin & Verwaltung</div>
              <div className="mt-0.5 text-sm text-white/42">Beiträge, Teams und Organisation</div>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] transition group-hover:bg-orange-500">
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </button>
        ) : null}

        {/* Zentrale Bereiche */}
        <section className="mt-5">
          <div className="mb-3 px-1">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-300/55">Bereiche</div>
            <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-white">Deine Bereiche</h2>
            <p className="mt-1 text-sm text-white/38">Liga, Turniere und Training zentral gebündelt.</p>
          </div>
        {/* Ligabereich – zentraler Einstieg */}
        <button
          type="button"
          disabled={!hasLeagueAccess}
          onClick={() => {
            if (!hasLeagueAccess) return
            router.push("/member-league-app")
          }}
          aria-disabled={!hasLeagueAccess}
          className={[
            "group relative mt-4 block min-h-[190px] w-full overflow-hidden rounded-[28px] border text-left backdrop-blur-xl transition duration-300 sm:min-h-[220px]",
            hasLeagueAccess
              ? "cursor-pointer border-orange-300/[0.14] bg-black/35 shadow-[0_28px_80px_-46px_rgba(0,0,0,.95)] hover:-translate-y-0.5 hover:border-orange-300/30 hover:shadow-[0_30px_85px_-42px_rgba(249,115,22,.22)] active:scale-[0.995]"
              : "cursor-not-allowed border-white/[0.06] bg-black/30 opacity-55 grayscale",
          ].join(" ")}
        >
          <div
            className={[
              "pointer-events-none absolute inset-0 bg-cover bg-center transition duration-700",
              hasLeagueAccess ? "group-hover:scale-[1.025]" : "",
            ].join(" ")}
            style={{ backgroundImage: "url('/league/spielplan.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,.97)_0%,rgba(4,6,9,.84)_42%,rgba(4,6,9,.42)_72%,rgba(4,6,9,.60)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.10),rgba(4,6,9,.18)_48%,rgba(4,6,9,.72))]" />
          <div className="pointer-events-none absolute -left-12 bottom-[-50px] h-40 w-40 rounded-full bg-orange-500/[0.16] blur-[55px]" />
          <div className="pointer-events-none absolute right-[18%] top-[-70px] h-44 w-44 rounded-full bg-sky-500/[0.10] blur-[65px]" />

          <div className="relative flex min-h-[190px] flex-col justify-between p-5 sm:min-h-[220px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-2xl border",
                  hasLeagueAccess
                    ? "border-orange-300/[0.18] bg-orange-500/[0.10] text-orange-200 shadow-[0_0_24px_rgba(249,115,22,.10)]"
                    : "border-white/[0.08] bg-white/[0.04] text-white/35",
                ].join(" ")}
              >
                <Trophy className="h-6 w-6" />
              </div>

              {hasLeagueAccess ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-black/40 text-white/70 transition duration-300 group-hover:border-orange-300/35 group-hover:bg-orange-500 group-hover:text-white">
                  <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5" />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-black/35 text-white/30">
                  <LockKeyhole className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="max-w-2xl">
              <div
                className={[
                  "text-[10px] font-black uppercase tracking-[0.22em]",
                  hasLeagueAccess ? "text-orange-300/70" : "text-white/30",
                ].join(" ")}
              >
                Liga
              </div>

              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                Ligabereich Sportdarts
              </h2>

              {hasLeagueAccess ? (
                <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/50 sm:text-base">
                  Sportdarts: Zusagen, Spielplan, Teams, Tabellen, Live-Spiele, Ergebnisse und Statistik.
                </p>
              ) : (
                <div className="mt-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1.5 text-[11px] font-black text-white/45">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Kein Liga-Paket aktiv
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/35 sm:text-base">
                    Für den Sportdarts-Ligabereich benötigst du ein E-Dart- oder Steeldart-Liga-Paket.
                  </p>
                </div>
              )}
            </div>
          </div>
        </button>
        {hasLeagueAccess ? (

          <button
            type="button"
            onClick={() => router.push("/league-mailbox")}
            className="group relative mt-3 block w-full overflow-hidden rounded-[24px] border border-sky-300/[0.12] bg-sky-500/[0.055] p-4 text-left backdrop-blur-xl transition duration-300 hover:border-sky-300/25 hover:bg-sky-500/[0.09] sm:p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/[0.14] bg-sky-500/[0.08] text-sky-200">
                  <Inbox className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">Liga-Kommunikation</div>
                  <div className="mt-0.5 text-lg font-black text-white">Liga-Postfach</div>
                  <div className="mt-0.5 text-sm font-semibold text-white/38">Nachrichten und Rückmeldungen direkt mit der Ligaverwaltung.</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {leagueMailboxUnread > 0 ? (
                  <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-black text-white">{leagueMailboxUnread}</span>
                ) : null}
                <ArrowRight className="h-5 w-5 text-white/35 transition group-hover:translate-x-1 group-hover:text-sky-300" />
              </div>
            </div>
          </button>
        ) : null}

        {/* Ligabereich Intern – vorbereitet, aktuell bewusst deaktiviert */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={() => router.push("/internal-matches")}
          className="group relative mt-3 block min-h-[178px] w-full cursor-not-allowed overflow-hidden rounded-[28px] border border-white/[0.06] bg-black/30 text-left opacity-55 grayscale shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:min-h-[205px]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.42]"
            style={{ backgroundImage: "url('/league/meine-spiele.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,.98)_0%,rgba(4,6,9,.91)_46%,rgba(4,6,9,.72)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.25),rgba(4,6,9,.78))]" />

          <div className="relative flex min-h-[178px] flex-col justify-between p-5 sm:min-h-[205px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/35">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-black/35 text-white/30">
                <LockKeyhole className="h-5 w-5" />
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                <Clock className="h-3.5 w-3.5" />
                Demnächst verfügbar
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white/70 sm:text-3xl">
                Ligabereich Intern
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/32 sm:text-base">
                Interne Spiele, Aufstellungen und Live-Ergebnisse werden hier gebündelt.
              </p>
            </div>
          </div>
        </button>
        {/* Turnierbereich – zentraler Einstieg */}
        <button
          type="button"
          onClick={() => router.push("/member-tournament-app")}
          className="group relative mt-3 block min-h-[178px] w-full overflow-hidden rounded-[28px] border border-sky-300/[0.12] bg-black/35 text-left shadow-[0_28px_80px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-sky-300/28 hover:shadow-[0_30px_85px_-42px_rgba(14,165,233,.20)] active:scale-[0.995] sm:min-h-[205px]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.88] transition duration-700 group-hover:scale-[1.025]"
            style={{ backgroundImage: "url('/league/ergebnisse.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,.97)_0%,rgba(4,6,9,.86)_43%,rgba(4,6,9,.48)_73%,rgba(4,6,9,.66)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.08),rgba(4,6,9,.20)_50%,rgba(4,6,9,.76))]" />
          <div className="pointer-events-none absolute -left-10 bottom-[-55px] h-40 w-40 rounded-full bg-orange-500/[0.14] blur-[55px]" />
          <div className="pointer-events-none absolute right-[14%] top-[-65px] h-44 w-44 rounded-full bg-sky-500/[0.14] blur-[65px]" />

          <div className="relative flex min-h-[178px] flex-col justify-between p-5 sm:min-h-[205px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/[0.16] bg-sky-500/[0.09] text-sky-100 shadow-[0_0_24px_rgba(14,165,233,.10)]">
                <Trophy className="h-6 w-6" />
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-black/40 text-white/70 transition duration-300 group-hover:border-sky-300/35 group-hover:bg-sky-500 group-hover:text-white">
                <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/65">
                Turniere
              </div>
              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                Turnierbereich
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/50 sm:text-base">
                Turnierstatistiken, DACH-Turniere und weitere Turnierfunktionen zentral an einem Ort.
              </p>
            </div>
          </div>
        </button>

        {/* Trainingsbereich */}
        <button
          type="button"
          onClick={() => router.push("/member-training-app")}
          className="group relative mt-3 block min-h-[178px] w-full overflow-hidden rounded-[28px] border border-emerald-300/[0.11] bg-black/35 text-left shadow-[0_28px_80px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/28 hover:shadow-[0_30px_85px_-42px_rgba(16,185,129,.16)] active:scale-[0.995] sm:min-h-[205px]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.72] transition duration-700 group-hover:scale-[1.025]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,9,.97)_0%,rgba(4,6,9,.86)_45%,rgba(4,6,9,.58)_76%,rgba(4,6,9,.72)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.12),rgba(4,6,9,.22)_50%,rgba(4,6,9,.78))]" />
          <div className="pointer-events-none absolute -left-12 bottom-[-55px] h-40 w-40 rounded-full bg-emerald-500/[0.12] blur-[55px]" />
          <div className="pointer-events-none absolute right-[16%] top-[-65px] h-44 w-44 rounded-full bg-sky-500/[0.09] blur-[65px]" />

          <div className="relative flex min-h-[178px] flex-col justify-between p-5 sm:min-h-[205px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/[0.16] bg-emerald-500/[0.08] text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,.08)]">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-black/40 text-white/70 transition duration-300 group-hover:border-emerald-300/35 group-hover:bg-emerald-500 group-hover:text-white">
                <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">
                Training
              </div>
              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                Trainingsbereich
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/50 sm:text-base">
                Training, Fortschritt, Trainingstreffs und Zusagen zentral an einem Ort.
              </p>
            </div>
          </div>
        </button>

        </section>

        {/* Navigation */}
        <div className="mt-8 space-y-8">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item: any) => !item.requiresLeadership || isLeadershipRole())
            if (visibleItems.length === 0) return null

            return (
              <section key={group.title}>
                <div className="mb-3 px-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-300/55">Mein EMD</div>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-white">{group.title}</h2>
                  <p className="mt-1 text-sm text-white/38">{group.description}</p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((item: any) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => router.push(item.href)}
                        className="group relative flex min-h-[112px] w-full items-center gap-3.5 overflow-hidden rounded-[22px] border border-orange-300/[0.10] bg-black/30 p-3.5 text-left shadow-[0_0_28px_rgba(249,115,22,.065),0_18px_45px_-38px_rgba(0,0,0,.92)] backdrop-blur-xl transition duration-300 active:scale-[0.985] active:border-orange-300/25 active:bg-white/[0.055] hover:-translate-y-0.5 hover:border-orange-400/25 hover:bg-white/[0.05] sm:border-white/[0.075] sm:bg-black/25 sm:shadow-[0_18px_45px_-38px_rgba(0,0,0,.9)] sm:p-4"
                      >
                        <div className="pointer-events-none absolute inset-0 sm:hidden">
                          <div className="absolute -left-10 bottom-[-42px] h-28 w-28 rounded-full bg-orange-500/[0.13] blur-[34px]" />
                          <div className="absolute -right-10 top-[-44px] h-24 w-24 rounded-full bg-sky-400/[0.075] blur-[30px]" />
                          <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/15 to-transparent" />
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-orange-400/35 to-transparent transition duration-300 sm:via-orange-400/0 group-hover:via-orange-400/80" />
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.13] bg-orange-500/[0.055] shadow-[0_0_18px_rgba(249,115,22,.07)] transition duration-300 sm:border-white/[0.075] sm:bg-white/[0.035] sm:shadow-none group-hover:border-orange-400/20 group-hover:bg-orange-500/[0.1]">
                          <div className="pointer-events-none absolute inset-[7px] rounded-xl bg-orange-400/[0.035] blur-[8px] sm:hidden" />
                          <Icon className="relative h-5 w-5 text-orange-200/70 transition duration-300 sm:text-white/45 group-hover:text-orange-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-black text-white/90">{item.title}</div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-white/18 transition duration-300 group-hover:translate-x-1 group-hover:text-orange-300" />
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/35 sm:text-sm">{item.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {hasMultipleTeams ? (
          <section className="mt-8 rounded-[24px] border border-white/[0.08] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/28">Deine Teams</div>
            <div className="mt-1 text-lg font-black text-white">{teamMemberships.length} aktive Teams</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {teamMemberships.map((membership: any) => (
                <div key={membership.id} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm">
                  {getRoleIcon(membership.role)}
                  <span className="font-bold text-white/75">{membership.teams?.name || 'Team'}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40">{getRoleLabel(membership.role)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 flex flex-col gap-3 rounded-[24px] border border-white/[0.08] bg-black/25 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/28">Konto</div>
            <div className="mt-1 text-base font-black text-white">Kontoeinstellungen</div>
            <div className="mt-0.5 text-sm text-white/38">Profil verwalten oder eine Löschanfrage stellen.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
              <Link href="/profil-daten-app">Profil bearbeiten</Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/konto-loeschen')} className="rounded-xl border-red-300/15 bg-red-500/[0.05] text-red-300 hover:bg-red-500/[0.12] hover:text-red-200">
              <Trash2 className="mr-2 h-4 w-4" />Löschen
            </Button>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto mt-7 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white/30 transition hover:bg-white/[0.04] hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />Abmelden
        </button>
      </main>


      {isTerminalPinDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Terminal-Anmeldung einrichten" onClick={() => !terminalPinSaving && setIsTerminalPinDialogOpen(false)}>
          <div className="my-auto w-full max-w-lg rounded-3xl border border-orange-400/25 bg-[#101722] p-5 text-white shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">Mein EMD</p><h2 className="mt-2 text-2xl font-black">Terminal-Anmeldung</h2><p className="mt-2 text-sm text-slate-300">PIN oder Muster für das Vereinsterminal festlegen bzw. ändern.</p></div>
              <button type="button" onClick={() => setIsTerminalPinDialogOpen(false)} disabled={terminalPinSaving} aria-label="Schließen" className="rounded-xl border border-white/15 p-2 text-white/70 disabled:opacity-40"><X className="h-5 w-5"/></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className={`rounded-xl border p-3 font-bold ${terminalAuthMethod === "pin" ? "border-orange-400 bg-orange-500/20" : "border-white/10 bg-white/5"}`} onClick={() => {setTerminalAuthMethod("pin");setTerminalPinMessage("")}}>4-stellige PIN</button>
              <button type="button" className={`rounded-xl border p-3 font-bold ${terminalAuthMethod === "pattern" ? "border-orange-400 bg-orange-500/20" : "border-white/10 bg-white/5"}`} onClick={() => {setTerminalAuthMethod("pattern");setTerminalPinMessage("")}}>Entsperrmuster</button>
            </div>
            {terminalAuthMethod === "pin" ? (
              <div className="mt-5 grid gap-3">
                <label className="text-sm font-semibold">Neue PIN<input autoComplete="new-password" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={terminalPin} onChange={e => setTerminalPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4 Ziffern" className="mt-1 block w-full rounded-xl border border-white/15 bg-white/10 p-3 text-lg text-white outline-none focus:border-orange-400"/></label>
                <label className="text-sm font-semibold">PIN wiederholen<input autoComplete="new-password" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={terminalPinConfirm} onChange={e => setTerminalPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN bestätigen" className="mt-1 block w-full rounded-xl border border-white/15 bg-white/10 p-3 text-lg text-white outline-none focus:border-orange-400"/></label>
              </div>
            ) : (
              <div className="mt-5 space-y-4"><div><p className="mb-2 text-sm font-semibold">Neues Muster zeichnen</p><PatternPad value={terminalPattern} onChange={setTerminalPattern}/></div><div><p className="mb-2 text-sm font-semibold">Muster wiederholen</p><PatternPad value={terminalPatternConfirm} onChange={setTerminalPatternConfirm}/></div></div>
            )}
            {terminalPinMessage && <p role="status" className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-orange-200">{terminalPinMessage}</p>}
            <div className="mt-6 flex gap-3"><button type="button" disabled={terminalPinSaving} onClick={() => setIsTerminalPinDialogOpen(false)} className="flex-1 rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40">Abbrechen</button><button type="button" disabled={terminalPinSaving} onClick={() => void saveTerminalAuth()} className="flex-1 rounded-xl bg-orange-600 px-4 py-3 font-black disabled:opacity-40">{terminalPinSaving ? "Speichern …" : "Speichern"}</button></div>
          </div>
        </div>
      )}
      <MobileBottomNav />
    </div>
  )
}

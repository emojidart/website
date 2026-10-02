"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Header } from "@/components/header"
import PatternPad from "@/components/terminal/PatternPad"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MarketplaceUnreadBadge } from "@/components/dartboerse/marketplace-unread-badge"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import {
  Loader2,
  LogOut,
  UserRound,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Trophy,
  Medal,
  Target,
  Activity,
  CalendarDays,
  Star,
  Gift,
  Swords,
  TrendingUp,
  PlusCircle,
  ListChecks,
  Globe2,
  ArrowRight,
  MessageCircle,
  ShoppingBag,
  Store,
  UserPlus,
  Clock3,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Camera,
  Upload,
  X,
} from "lucide-react"

type GuestRequest = {
  id: string
  full_name: string
  player_name: string | null
  email: string
  phone: string | null
  status: string
  created_at: string
  auth_user_id?: string | null
  linked_spieldatenbank_id?: string | number | null
  photo_url?: string | null
}

type ClubJoinRequest = {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  created_at: string
}

type MembershipOverview = {
  status: "none" | "trial" | "membership"
  trialEndsOn: string | null
}

type SpieldatenbankPlayer = {
  id: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
}

type SummerStanding = {
  player_name: string
  total_points: number | null
  placement_points: number | null
  legs_won: number | null
  legs_lost: number | null
  tournaments_played: number | null
  total_matches_played: number | null
  total_matches_won: number | null
  total_matches_lost: number | null
  manual_bonus_points: number | null
  winner_side_bonus_points: number | null
  participation_bonus_points: number | null
}

type SummerEntry = {
  id: string
  tournament_id: string | null
  tournament_name: string | null
  tournament_type: string | null
  tournament_date: string | null
  player_name: string
  placement: number | null
  legs_won: number | null
  legs_lost: number | null
  matches_played: number | null
  matches_won: number | null
  matches_lost: number | null
  placement_points: number | null
  bonus_points: number | null
  winner_side_bonus: boolean | null
  form: string | null
}

type DkoRanking = {
  id?: string
  tournament_id: string
  tournament_type: string
  tournament_name: string | null
  player_name: string
  placement: number | null
  eliminated_at: string | null
}

function n(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function formatDate(value?: string | null) {
  if (!value) return "—"

  try {
    return new Date(value).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function getPlacementLabel(placement?: number | null) {
  if (!placement) return "—"
  if (placement === 1) return "1. Platz"
  if (placement === 2) return "2. Platz"
  if (placement === 3) return "3. Platz"
  return `${placement}. Platz`
}

function getPlacementBadgeClass(placement?: number | null) {
  if (placement === 1) return "bg-amber-500/[0.08]0/[0.08]0 text-white"
  if (placement === 2) return "bg-white/[0.035]0 text-white"
  if (placement === 3) return "bg-amber-600 text-white"
  return "bg-orange-600 text-white"
}

function StatBox({
  label,
  value,
  icon,
  tone = "orange",
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone?: "orange" | "green" | "blue" | "purple" | "gray" | "yellow"
}) {
  const styles =
    tone === "green"
      ? "border-emerald-300/15 bg-emerald-500/[0.07] text-emerald-100"
      : tone === "blue"
        ? "border-sky-300/15 bg-sky-500/[0.07] text-sky-100"
        : tone === "purple"
          ? "border-violet-300/15 bg-violet-500/[0.07] text-violet-100"
          : tone === "gray"
            ? "border-white/[0.08] bg-white/[0.035] text-white/80"
            : tone === "yellow"
              ? "border-amber-300/15 bg-amber-500/[0.08]0/[0.07] text-amber-100"
              : "border-orange-300/15 bg-orange-500/[0.08]0/[0.07] text-orange-100"

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase opacity-80">
            {label}
          </div>
          <div className="text-2xl font-black mt-1">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25">
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}

export default function GuestProfileAppPage() {
  const rememberPublicAreaOrigin = () => {
    window.sessionStorage.setItem("emd:public-area-origin", window.location.pathname + window.location.search)
  }
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const switchingToMemberLoginRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)

  const [guestRequest, setGuestRequest] = useState<GuestRequest | null>(null)
  const [clubJoinRequest, setClubJoinRequest] = useState<ClubJoinRequest | null>(null)
  const [membershipOverview, setMembershipOverview] = useState<MembershipOverview>({
    status: "none",
    trialEndsOn: null,
  })
  const [linkedPlayer, setLinkedPlayer] = useState<SpieldatenbankPlayer | null>(null)

  const [summerStanding, setSummerStanding] = useState<SummerStanding | null>(null)
  const [summerEntries, setSummerEntries] = useState<SummerEntry[]>([])
  const [dkoRankings, setDkoRankings] = useState<DkoRanking[]>([])

  const [message, setMessage] = useState("")
  const [statsMessage, setStatsMessage] = useState("")

  const [terminalPinExists, setTerminalPinExists] = useState(false)
  const [terminalPin, setTerminalPin] = useState("")
  const [terminalPinRepeat, setTerminalPinRepeat] = useState("")
  const [terminalPattern, setTerminalPattern] = useState<number[]>([])
  const [terminalPatternRepeat, setTerminalPatternRepeat] = useState<number[]>([])
  const [terminalAuthMethod, setTerminalAuthMethod] = useState<"pin" | "pattern">("pin")
  const [savedTerminalAuthMethod, setSavedTerminalAuthMethod] = useState<"pin" | "pattern" | null>(null)
  const [terminalPinLoading, setTerminalPinLoading] = useState(false)
  const [terminalPinSaving, setTerminalPinSaving] = useState(false)
  const [terminalPinMessage, setTerminalPinMessage] = useState("")
  const [showTerminalPin, setShowTerminalPin] = useState(false)
  const [guestPhotoDialogOpen, setGuestPhotoDialogOpen] = useState(false)
  const [guestPhotoFile, setGuestPhotoFile] = useState<File | null>(null)
  const [guestPhotoPreview, setGuestPhotoPreview] = useState<string | null>(null)
  const [guestPhotoUploading, setGuestPhotoUploading] = useState(false)
  const [guestPhotoMessage, setGuestPhotoMessage] = useState("")

  useEffect(() => {
    if (authLoading || session?.user) return

    const redirectAfterLogout = window.sessionStorage.getItem("emd:post-logout-redirect")
    if (redirectAfterLogout) {
      window.sessionStorage.removeItem("emd:post-logout-redirect")
      window.location.replace(redirectAfterLogout)
      return
    }

    if (!switchingToMemberLoginRef.current) {
      router.push("/guest-login")
    }
  }, [authLoading, session, router])

  useEffect(() => {
    if (session?.user) {
      void loadGuestProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (guestRequest) {
      void loadGuestStats(guestRequest)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestRequest?.id, guestRequest?.linked_spieldatenbank_id, guestRequest?.player_name])

  useEffect(() => {
    if (session?.user) {
      void loadTerminalPinStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadTerminalPinStatus = async () => {
    try {
      setTerminalPinLoading(true)
      const [{ data: exists, error: existsError }, { data: method, error: methodError }] = await Promise.all([
        supabase.rpc("guest_terminal_has_pin"),
        supabase.rpc("guest_terminal_get_my_auth_method"),
      ])
      if (existsError) throw existsError
      if (methodError) throw methodError
      setTerminalPinExists(Boolean(exists))
      const savedMethod = method === "pattern" ? "pattern" : method === "pin" ? "pin" : null
      setSavedTerminalAuthMethod(savedMethod)
      if (savedMethod) setTerminalAuthMethod(savedMethod)
    } catch (err) {
      console.error("Guest terminal auth status error:", err)
      setTerminalPinMessage("Terminal-Status konnte nicht geladen werden.")
    } finally {
      setTerminalPinLoading(false)
    }
  }

  const saveTerminalAuth = async () => {
    setTerminalPinMessage("")
    let secret = ""

    if (terminalAuthMethod === "pin") {
      if (!/^\d{4}$/.test(terminalPin)) {
        setTerminalPinMessage("Die Terminal-PIN muss genau aus 4 Ziffern bestehen.")
        return
      }
      if (terminalPin !== terminalPinRepeat) {
        setTerminalPinMessage("Die beiden PIN-Eingaben stimmen nicht überein.")
        return
      }
      secret = terminalPin
    } else {
      if (terminalPattern.length < 4) {
        setTerminalPinMessage("Das Muster muss mindestens 4 Punkte enthalten.")
        return
      }
      if (terminalPattern.join("-") !== terminalPatternRepeat.join("-")) {
        setTerminalPinMessage("Die beiden Muster stimmen nicht überein.")
        return
      }
      secret = terminalPattern.join("-")
    }

    try {
      setTerminalPinSaving(true)
      const { error } = await supabase.rpc("guest_terminal_set_my_auth", {
        p_method: terminalAuthMethod,
        p_secret: secret,
      })
      if (error) throw error

      setTerminalPinExists(true)
      setSavedTerminalAuthMethod(terminalAuthMethod)
      setTerminalPin("")
      setTerminalPinRepeat("")
      setTerminalPattern([])
      setTerminalPatternRepeat([])
      setTerminalPinMessage(
        terminalAuthMethod === "pattern"
          ? "Terminal-Muster wurde gespeichert."
          : "Terminal-PIN wurde gespeichert.",
      )
    } catch (err: any) {
      console.error("Guest terminal auth save error:", err)
      setTerminalPinMessage(err?.message || "Terminal-Anmeldung konnte nicht gespeichert werden.")
    } finally {
      setTerminalPinSaving(false)
    }
  }

  const loadGuestProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setMessage("")

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_guest, is_blocked, blocked_reason, player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/guest-login")
        return
      }

      if (!profileData.is_guest) {
        // Mitglied erkannt: Session nicht zerstören.
        window.location.replace("/member-profile-app")
        return
      }

      if (profileData.is_blocked) {
        await supabase.auth.signOut()
        router.push("/guest-login")
        return
      }

      const [
        { data: requestData, error: requestError },
        { data: joinRequestData, error: joinRequestError },
      ] = await Promise.all([
        supabase
          .from("guest_requests")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .maybeSingle(),

        supabase
          .from("club_join_requests")
          .select("id,status,created_at")
          .eq("user_id", session.user.id)
          .in("status", ["pending", "approved"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (requestError) throw requestError
      if (joinRequestError) throw joinRequestError

      if (!requestData) {
        setMessage("Zu diesem Gastkonto wurde kein Antrag gefunden.")
        return
      }

      setGuestRequest(requestData as GuestRequest)
      setClubJoinRequest((joinRequestData as ClubJoinRequest | null) ?? null)

      // Den Mitgliedschaftsstatus über dieselbe player_id prüfen, die auch
      // /member-membership verwendet. Dadurch erkennt das Gastprofil sowohl
      // eine reguläre Mitgliedschaft als auch eine aktuell laufende Testphase.
      setMembershipOverview({ status: "none", trialEndsOn: null })

      if (profileData.player_id) {
        const today = new Date().toISOString().split("T")[0]

        const [
          { data: membershipData, error: membershipError },
          { data: trialData, error: trialError },
        ] = await Promise.all([
          supabase
            .from("member_memberships")
            .select("id,status,starts_on,ends_on,created_at")
            .eq("player_id", profileData.player_id)
            .order("created_at", { ascending: false }),

          supabase
            .from("membership_trials")
            .select("id,module_code,starts_on,ends_on,status")
            .eq("player_id", profileData.player_id)
            .eq("status", "active")
            .lte("starts_on", today)
            .gte("ends_on", today)
            .order("ends_on", { ascending: false }),
        ])

        if (membershipError) throw membershipError
        if (trialError) throw trialError

        const currentMembership = (membershipData ?? []).find(
          (membership: any) =>
            membership.status === "active" &&
            membership.starts_on <= today &&
            (!membership.ends_on || membership.ends_on >= today),
        )

        if (currentMembership) {
          setMembershipOverview({ status: "membership", trialEndsOn: null })
        } else if ((trialData ?? []).length > 0) {
          setMembershipOverview({
            status: "trial",
            trialEndsOn: trialData?.[0]?.ends_on ?? null,
          })
        }
      }
    } catch (err: any) {
      console.error("Guest profile error:", err)
      setMessage(err?.message || "Gastprofil konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const loadGuestStats = async (request: GuestRequest) => {
    try {
      setStatsLoading(true)
      setStatsMessage("")
      setLinkedPlayer(null)
      setSummerStanding(null)
      setSummerEntries([])
      setDkoRankings([])

      let cleanName = request.player_name?.trim() || ""

      if (request.linked_spieldatenbank_id) {
        const { data: playerData, error: playerError } = await supabase
          .from("spieldatenbank")
          .select("id,name,verein,ligastatus,geschlecht")
          .eq("id", request.linked_spieldatenbank_id)
          .maybeSingle()

        if (playerError) throw playerError

        if (playerData) {
          const player = playerData as SpieldatenbankPlayer
          setLinkedPlayer(player)
          cleanName = player.name?.trim() || cleanName
        }
      }

      if (!request.linked_spieldatenbank_id && !cleanName) {
        setStatsMessage(
          "Dein Gastkonto wurde noch nicht mit einem Spieler aus der Spieldatenbank verknüpft.",
        )
        return
      }

      if (!cleanName) {
        setStatsMessage(
          "Der verknüpfte Spieler wurde gefunden, aber es konnte kein Spielername gelesen werden.",
        )
        return
      }

      const { data: standingData, error: standingError } = await supabase
        .from("summer_special_total_standings")
        .select("*")
        .eq("player_name", cleanName)
        .maybeSingle()

      if (standingError) {
        console.warn("Summer total standings warning:", standingError)
      }

      setSummerStanding((standingData as SummerStanding | null) ?? null)

      const { data: entriesData, error: entriesError } = await supabase
        .from("summer_special_standings")
        .select("*")
        .eq("player_name", cleanName)
        .order("tournament_date", { ascending: false })

      if (entriesError) {
        console.warn("Summer entries warning:", entriesError)
      }

      const cleanSummerEntries = (entriesData ?? []) as SummerEntry[]
      setSummerEntries(cleanSummerEntries)

      const { data: dkoData, error: dkoError } = await supabase
        .from("dko_rankings")
        .select("*")
        .eq("player_name", cleanName)
        .order("eliminated_at", { ascending: false })

      if (dkoError) {
        console.warn("DKO rankings warning:", dkoError)
      }

      const summerTournamentIds = new Set(
        cleanSummerEntries
          .map((entry) => entry.tournament_id)
          .filter(Boolean) as string[],
      )

      const cleanedDkoRankings = ((dkoData ?? []) as DkoRanking[]).filter((ranking) => {
        const name = String(ranking.tournament_name ?? "").toLowerCase()
        const type = String(ranking.tournament_type ?? "").toLowerCase()
        const id = String(ranking.tournament_id ?? "")

        if (summerTournamentIds.has(id)) return false
        if (name.includes("summer special")) return false
        if (type.includes("summer")) return false

        return true
      })

      setDkoRankings(cleanedDkoRankings)
    } catch (err: any) {
      console.error("Guest stats error:", err)
      setStatsMessage("Statistiken konnten nicht geladen werden.")
    } finally {
      setStatsLoading(false)
    }
  }

  const handleGuestPhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setGuestPhotoFile(file)
    setGuestPhotoMessage("")

    if (!file) {
      setGuestPhotoPreview(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setGuestPhotoPreview(String(e.target?.result || ""))
    reader.readAsDataURL(file)
  }

  const handleGuestPhotoUpload = async () => {
    if (!session?.user?.id || !guestPhotoFile) return

    setGuestPhotoUploading(true)
    setGuestPhotoMessage("")

    try {
      const rawExt = (guestPhotoFile.name.split(".").pop() || "jpg").toLowerCase()
      const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg"
      const path = `${session.user.id}/profile-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("guest-profile-avatars")
        .upload(path, guestPhotoFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: guestPhotoFile.type || `image/${ext}`,
        })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from("guest-profile-avatars")
        .getPublicUrl(path)

      const photoUrl = publicData.publicUrl

      const { error: saveError } = await supabase.rpc("guest_set_my_profile_photo", {
        p_photo_url: photoUrl,
      })
      if (saveError) throw saveError

      setGuestRequest((current) => current ? { ...current, photo_url: photoUrl } : current)
      setGuestPhotoMessage("Profilbild wurde geändert.")
      setGuestPhotoFile(null)
      setGuestPhotoPreview(null)

      window.setTimeout(() => {
        setGuestPhotoDialogOpen(false)
        setGuestPhotoMessage("")
      }, 1200)
    } catch (error: any) {
      console.error("Guest profile photo upload error:", error)
      setGuestPhotoMessage(`Fehler: ${error?.message || "Profilbild konnte nicht geändert werden."}`)
    } finally {
      setGuestPhotoUploading(false)
    }
  }

  const handleLogout = async () => {
    window.sessionStorage.removeItem("emd:post-logout-redirect")
    await supabase.auth.signOut()
    window.location.replace("/guest-login")
  }

  const handleSwitchToMemberLogin = async () => {
    switchingToMemberLoginRef.current = true
    window.sessionStorage.removeItem("emd:post-logout-redirect")

    // Bestehende Session behalten; Member-Login/Guard übernimmt die Prüfung.
    window.location.replace("/member-login")
  }

  const displayPlayerName =
    linkedPlayer?.name ||
    guestRequest?.player_name ||
    "Noch kein Spieler verknüpft"

  const totalBonus = useMemo(() => {
    if (!summerStanding) return 0

    return (
      n(summerStanding.manual_bonus_points) +
      n(summerStanding.winner_side_bonus_points) +
      n(summerStanding.participation_bonus_points)
    )
  }, [summerStanding])

  const winRate = useMemo(() => {
    if (!summerStanding) return "0.0"
    const played = n(summerStanding.total_matches_played)
    const won = n(summerStanding.total_matches_won)

    if (played <= 0) return "0.0"
    return ((won / played) * 100).toFixed(1)
  }, [summerStanding])

  const legDiff = useMemo(() => {
    if (!summerStanding) return 0
    return n(summerStanding.legs_won) - n(summerStanding.legs_lost)
  }, [summerStanding])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center p-4 pb-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-300" />
            <p className="text-sm font-semibold text-white/45">
              Gastprofil wird geladen...
            </p>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  if (message || !guestRequest) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 pb-24">
          <Card className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-[#0b0f15] shadow-[0_30px_90px_-45px_rgba(0,0,0,.95)]">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-500/10">
                <AlertTriangle className="h-7 w-7 text-rose-300" />
              </div>

              <h1 className="mb-2 text-2xl font-black text-white">
                Gastprofil nicht verfügbar
              </h1>

              <p className="mb-6 text-sm text-white/45">
                {message || "Es konnte kein Gastprofil geladen werden."}
              </p>

              <Button onClick={handleLogout} className="w-full">
                Zurück zum Gast-Login
              </Button>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.76),rgba(3,5,9,.95)_48%,rgba(2,4,7,.99))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(14,165,233,.12),transparent_28%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">
                EMD VereinsApp
              </div>

              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                Gastprofil
              </h1>

              <p className="mt-1 text-sm font-semibold text-white/42">
                Willkommen im Gastbereich
              </p>
            </div>

           <div className="flex items-center gap-2">
  <MarketplaceUnreadBadge compact />

  <Button
    variant="outline"
    onClick={handleLogout}
    className="h-11 rounded-2xl border-white/10 bg-white/[0.045] px-4 text-white/65 hover:bg-white/[0.09] hover:text-white"
  >
    <LogOut className="w-4 h-4 mr-2" />
    Abmelden
  </Button>
</div>
          </div>

{clubJoinRequest?.status === "approved" && membershipOverview.status !== "none" ? (
                <div className="overflow-hidden rounded-[24px] border border-emerald-300/30 bg-emerald-500/[0.10] shadow-[0_0_50px_rgba(16,185,129,.10)]">
                  <div className="h-1.5 bg-emerald-400" />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-500/15">
                          <ShieldCheck className="h-6 w-6 text-emerald-200" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/60">
                            Mitgliederzugang freigeschaltet
                          </div>
                          <div className="mt-1 text-xl font-black text-white">
                            {membershipOverview.status === "trial"
                              ? "Dein Mitgliederzugang ist jetzt aktiv"
                              : "Deine Mitgliedschaft ist jetzt aktiv"}
                          </div>
                          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-100/75">
                            Dein Vereinsbeitritt wurde bestätigt. Ab sofort kannst du alle für dich freigeschalteten Funktionen im Mitgliederbereich nutzen.
                          </p>
                          <p className="mt-1 text-sm font-bold text-white/70">
                            Bitte melde dich einmal ab und anschließend über den Member-Login wieder an.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => void handleSwitchToMemberLogin()}
                        className="h-12 shrink-0 rounded-2xl bg-emerald-500 px-5 font-black text-black shadow-[0_0_30px_rgba(16,185,129,.18)] hover:bg-emerald-400"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Zum Member-Login
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

                    <Card className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#0b0f15]/94 shadow-[0_32px_100px_-55px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-orange-400/80 via-orange-500/30 to-sky-400/50" />

            <CardContent className="p-4 sm:p-6 lg:p-7">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-orange-300/20 bg-orange-500/[0.08] shadow-[0_18px_50px_rgba(0,0,0,.45)] sm:h-24 sm:w-24">
                    {guestRequest.photo_url ? (
                      <img src={guestRequest.photo_url} alt={guestRequest.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-10 w-10 text-orange-300 sm:h-12 sm:w-12" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestPhotoFile(null)
                      setGuestPhotoPreview(null)
                      setGuestPhotoMessage("")
                      setGuestPhotoDialogOpen(true)
                    }}
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#11151c] text-white shadow-xl transition hover:scale-105 hover:bg-orange-500"
                    aria-label="Profilbild ändern"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="rounded-full border border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Freigeschaltet
                    </Badge>

                    <Badge variant="outline" className="rounded-full border-orange-300/20 bg-orange-500/[0.08]0/[0.07] text-orange-200">
                      Gastzugang
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
                    {guestRequest.full_name}
                  </h2>
                  <div className="mt-1 text-[11px] font-bold text-white/28">
                    Name kann im Gastprofil nicht geändert werden.
                  </div>

                  <p className="mt-1 font-semibold text-white/48">
                    Spieler: {displayPlayerName}
                  </p>

                  {linkedPlayer?.verein || linkedPlayer?.ligastatus ? (
                    <p className="mt-1 text-sm text-white/30">
                      {linkedPlayer?.verein || "Kein Verein"} ·{" "}
                      {linkedPlayer?.ligastatus || "Kein Ligastatus"}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                    E-Mail
                  </div>

                  <div className="flex items-center gap-2 break-all font-semibold text-white/80">
                    <Mail className="h-4 w-4 flex-shrink-0 text-orange-300" />
                    {guestRequest.email}
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                    Status
                  </div>

                  <div className="font-semibold text-emerald-300">
                    Zugang freigeschaltet
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[#0b0f15]/94 shadow-[0_24px_80px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-emerald-400/70 via-emerald-500/25 to-transparent" />
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10">
                  <KeyRound className="h-6 w-6 text-emerald-200" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Vereins-Terminal</div>
                  <h3 className="mt-1 text-xl font-black text-white">Terminal-Anmeldung</h3>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-white/45">
                Wähle PIN oder Entsperrmuster. Am Club-Terminal suchst du zuerst deinen Namen und bestätigst danach mit deiner persönlichen Methode.
              </p>

              {terminalPinLoading ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/40">
                  Terminal-Status wird geladen …
                </div>
              ) : savedTerminalAuthMethod ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.07] px-4 py-3">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Derzeit aktiv</div>
                    <div className="mt-1 text-sm font-black text-emerald-100">
                      {savedTerminalAuthMethod === "pattern" ? "Entsperrmuster" : "4-stellige PIN"}
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                    Aktiv
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] px-4 py-3 text-sm font-bold text-amber-100/75">
                  Noch keine Terminal-Anmeldung eingerichtet.
                </div>
              )}

              <div className="mx-auto mt-5 w-full max-w-4xl">
                <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] bg-black/30 p-1.5">
                <button type="button" onClick={() => setTerminalAuthMethod("pin")}
                  className={`relative min-h-[50px] rounded-xl px-3 text-sm font-black transition ${
                    terminalAuthMethod === "pin"
                      ? "border border-orange-300/35 bg-orange-500 text-white shadow-[0_8px_30px_rgba(249,115,22,.20)]"
                      : "border border-transparent bg-white/[0.035] text-white/45 hover:bg-white/[0.06]"
                  }`}>
                  4-stellige PIN
                  {terminalAuthMethod === "pin" ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white">Aktiv</span>
                  ) : null}
                </button>
                <button type="button" onClick={() => setTerminalAuthMethod("pattern")}
                  className={`relative min-h-[50px] rounded-xl px-3 text-sm font-black transition ${
                    terminalAuthMethod === "pattern"
                      ? "border border-orange-300/35 bg-orange-500 text-white shadow-[0_8px_30px_rgba(249,115,22,.20)]"
                      : "border border-transparent bg-white/[0.035] text-white/45 hover:bg-white/[0.06]"
                  }`}>
                  Entsperrmuster
                  {terminalAuthMethod === "pattern" ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white">Aktiv</span>
                  ) : null}
                </button>
              </div>
              <div className="mt-3 text-center text-[11px] font-bold text-white/30">
                Aktuell ausgewählt: <span className="text-orange-300">{terminalAuthMethod === "pin" ? "4-stellige PIN" : "Entsperrmuster"}</span>
              </div>

              {terminalAuthMethod === "pin" ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Input type={showTerminalPin ? "text" : "password"} value={terminalPin}
                    onChange={(e) => setTerminalPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric" autoComplete="off" placeholder="4 Ziffern"
                    className="h-12 rounded-xl border-white/10 bg-black/30 text-center text-lg font-black tracking-[0.35em] text-white" />
                  <Input type={showTerminalPin ? "text" : "password"} value={terminalPinRepeat}
                    onChange={(e) => setTerminalPinRepeat(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric" autoComplete="off" placeholder="PIN wiederholen"
                    className="h-12 rounded-xl border-white/10 bg-black/30 text-center text-lg font-black tracking-[0.35em] text-white" />
                </div>
              ) : (
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div><div className="mb-2 text-center text-xs font-black text-white/35">MUSTER</div>
                    <PatternPad value={terminalPattern} onChange={setTerminalPattern} /></div>
                  <div><div className="mb-2 text-center text-xs font-black text-white/35">WIEDERHOLEN</div>
                    <PatternPad value={terminalPatternRepeat} onChange={setTerminalPatternRepeat} /></div>
                </div>
              )}

              <Button type="button" onClick={() => void saveTerminalAuth()} disabled={terminalPinSaving}
                className="mt-5 h-11 w-full rounded-xl bg-emerald-500 font-black text-black hover:bg-emerald-400 disabled:opacity-40">
                {terminalPinSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                {savedTerminalAuthMethod
                  ? terminalAuthMethod === savedTerminalAuthMethod
                    ? terminalAuthMethod === "pattern"
                      ? "Muster ändern"
                      : "PIN ändern"
                    : terminalAuthMethod === "pattern"
                      ? "Auf Muster wechseln"
                      : "Auf PIN wechseln"
                  : "Terminal-Anmeldung speichern"}
              </Button>

              {terminalPinMessage ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-white/70">
                  {terminalPinMessage}
                </div>
              ) : null}
              </div>


            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0b0f15]/92 shadow-[0_24px_80px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-orange-400/70 via-orange-500/25 to-transparent" />
            <CardContent className="p-5 sm:p-6">
              {clubJoinRequest?.status === "pending" ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08]0/[0.08]">
                      <Clock3 className="h-5 w-5 text-orange-300" />
                    </div>
                    <div>
                      <div className="font-black text-white">Beitrittsanfrage wird geprüft</div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-white/42">
                        Deine Anfrage ist beim Verein eingelangt. Bis zur Bestätigung bleibst du ganz normal Gast.
                      </p>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="h-11 rounded-2xl border-orange-300/20 bg-orange-500/[0.08]0/[0.06] text-orange-100 hover:bg-orange-500/[0.08]0/[0.12]">
                    <Link href="/club-join">Anfrage ansehen</Link>
                  </Button>
                </div>
              ) : clubJoinRequest?.status === "approved" ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.08]">
                      <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="font-black text-white">
                        {membershipOverview.status === "membership"
                          ? "Mitgliedschaft aktiv"
                          : membershipOverview.status === "trial"
                            ? "Testzugang aktiv"
                            : "Beitritt bestätigt"}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-white/42">
                        {membershipOverview.status === "membership"
                          ? "Deine Aufnahme in den Verein und deine Mitgliedschaft sind aktiv."
                          : membershipOverview.status === "trial"
                            ? `Deine Aufnahme in den Verein wurde bestätigt. Deine Testphase ist${membershipOverview.trialEndsOn ? ` bis ${new Date(`${membershipOverview.trialEndsOn}T00:00:00`).toLocaleDateString("de-AT")}` : ""} freigeschaltet.`
                            : "Deine Aufnahme in den Verein wurde bestätigt. Schließe jetzt mindestens die Grundmitgliedschaft ab, damit dein Vereinszugang freigeschaltet wird."}
                      </p>
                    </div>
                  </div>

                  <Button asChild className="h-11 rounded-2xl border border-emerald-300/20 bg-emerald-500 px-4 font-black text-white hover:bg-emerald-400">
                    <Link href="/member-membership">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {membershipOverview.status === "none"
                        ? "Mitgliedschaft abschließen"
                        : "Meine Mitgliedschaft"}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08]0/[0.08]">
                      <UserPlus className="h-5 w-5 text-orange-300" />
                    </div>
                    <div>
                      <div className="font-black text-white">Du möchtest Vereinsmitglied werden?</div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-white/42">
                        Stelle direkt mit deinem bestehenden Gastkonto eine Beitrittsanfrage.
                      </p>
                    </div>
                  </div>

                  <Button asChild className="h-11 rounded-2xl border border-orange-300/20 bg-orange-500/[0.08]0 px-4 font-black text-white hover:bg-orange-400">
                    <Link href="/club-join">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Verein beitreten
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0b0f15]/92 shadow-[0_24px_80px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-orange-400/70 via-sky-400/25 to-transparent" />

            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                    DACH-Turnierkalender
                  </div>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                    Veranstaltungen verwalten
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-white/42">
                    Eigene Turniere einreichen, Prüfstatus verfolgen, bearbeiten oder absagen.
                  </p>
                </div>

                <Button asChild className="h-11 rounded-2xl border border-orange-300/20 bg-orange-500/[0.08]0 px-4 font-black text-white hover:bg-orange-400">
                  <Link href="/turniere/neu" onClick={rememberPublicAreaOrigin}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Veranstaltung anlegen
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/turniere/meine"
                  onClick={rememberPublicAreaOrigin}
                  className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25">
                    <ListChecks className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="mt-3 font-black text-white">Meine Veranstaltungen</div>
                  <div className="mt-1 text-sm leading-6 text-white/42">
                    Status sehen, bearbeiten und absagen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">
                    Öffnen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href="/turniere/neu"
                  onClick={rememberPublicAreaOrigin}
                  className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25">
                    <PlusCircle className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="mt-3 font-black text-white">Neue Veranstaltung</div>
                  <div className="mt-1 text-sm leading-6 text-white/42">
                    Turnier oder Event zur Prüfung einreichen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">
                    Jetzt anlegen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href="/turniere/entdecken"
                  onClick={rememberPublicAreaOrigin}
                  className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25">
                    <Globe2 className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="mt-3 font-black text-white">Alle Veranstaltungen</div>
                  <div className="mt-1 text-sm leading-6 text-white/42">
                    Freigegebene DACH-Turniere durchsuchen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">
                    Kalender ansehen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0b0f15]/92 shadow-[0_24px_80px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-orange-400/70 via-violet-400/20 to-transparent" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">Dartbörse</div>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">Kaufen, verkaufen und schreiben</h3>
                  <p className="mt-1 text-sm leading-6 text-white/42">Inserate durchsuchen, eigene Artikel anbieten und direkt mit Verkäufern schreiben.</p>
                </div>
                <Button asChild className="h-11 rounded-2xl border border-orange-300/20 bg-orange-500/[0.08]0 px-4 font-black text-white hover:bg-orange-400">
                  <Link href="/dartboerse/neu" onClick={rememberPublicAreaOrigin}><PlusCircle className="w-4 h-4 mr-2" />Inserat erstellen</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/dartboerse" onClick={rememberPublicAreaOrigin} className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25"><Store className="h-5 w-5 text-orange-300" /></div>
                  <div className="mt-3 font-black text-white">Dartbörse öffnen</div><div className="mt-1 text-sm leading-6 text-white/42">Aktuelle Angebote entdecken.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">Öffnen<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
                <Link href="/dartboerse/meine" onClick={rememberPublicAreaOrigin} className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25"><ShoppingBag className="h-5 w-5 text-orange-300" /></div>
                  <div className="mt-3 font-black text-white">Meine Inserate</div><div className="mt-1 text-sm leading-6 text-white/42">Angebote verwalten und Status sehen.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">Verwalten<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
                <Link href="/dartboerse/nachrichten" onClick={rememberPublicAreaOrigin} className="group rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-orange-300/20 hover:bg-white/[0.06]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25"><MessageCircle className="h-5 w-5 text-orange-300" /></div>
                  <div className="mt-3 font-black text-white">Meine Nachrichten</div><div className="mt-1 text-sm leading-6 text-white/42">Direkt mit Käufern und Verkäufern schreiben.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-300">Nachrichten<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0b0f15]/92 shadow-[0_24px_80px_-58px_rgba(0,0,0,.98)] backdrop-blur-xl">
            <div className="h-px bg-gradient-to-r from-orange-400/70 via-orange-500/25 to-transparent" />

            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.03em] text-white">
                    Meine Statistiken
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-white/42">
                    Deine persönlichen Turnierdaten aus der EMD VereinsApp.
                  </p>
                </div>

                {statsLoading ? (
                  <Badge variant="outline" className="w-fit">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Lade Statistiken
                  </Badge>
                ) : (
                  <Badge className="w-fit bg-orange-600 text-white">
                    <Activity className="w-3 h-3 mr-1" />
                    Live Daten
                  </Badge>
                )}
              </div>

              {!guestRequest.linked_spieldatenbank_id && !guestRequest.player_name ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] p-5 text-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-black">
                        Noch nicht mit Spieler verknüpft
                      </div>
                      <p className="text-sm mt-1">
                        Dein Gastkonto wurde noch nicht mit einem Spieler aus der
                        Spieldatenbank verknüpft. Sobald die Freischaltung fertig ist,
                        erscheinen hier deine Turnierstatistiken.
                      </p>
                    </div>
                  </div>
                </div>
              ) : statsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-9 h-9 animate-spin text-orange-300" />
                    <p className="text-sm font-semibold text-white/45">
                      Statistiken werden geladen...
                    </p>
                  </div>
                </div>
              ) : statsMessage ? (
                <div className="rounded-2xl border border-rose-300/20 bg-rose-500/[0.08] p-5 text-rose-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-black">Hinweis</div>
                      <p className="text-sm mt-1">{statsMessage}</p>
                    </div>
                  </div>
                </div>
              ) : !summerStanding && summerEntries.length === 0 && dkoRankings.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 text-white/60">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 mt-0.5 text-orange-300 flex-shrink-0" />
                    <div>
                      <div className="font-black text-white">
                        Noch keine Turnierdaten gefunden
                      </div>
                      <p className="text-sm mt-1">
                        Dein Spieler ist verknüpft. Sobald Ergebnisse für{" "}
                        <span className="font-black">{displayPlayerName}</span>{" "}
                        gespeichert wurden, erscheinen deine Statistiken automatisch hier.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {summerStanding && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Trophy className="h-5 w-5 text-orange-300" />
                        <h4 className="text-xl font-black text-white">
                          Summer Special Gesamtwertung
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatBox
                          label="Gesamtpunkte"
                          value={n(summerStanding.total_points)}
                          icon={<Trophy className="w-6 h-6" />}
                          tone="orange"
                        />

                        <StatBox
                          label="Turniere"
                          value={`${n(summerStanding.tournaments_played)}/13`}
                          icon={<CalendarDays className="w-6 h-6" />}
                          tone="blue"
                        />

                        <StatBox
                          label="Siegrate"
                          value={`${winRate}%`}
                          icon={<TrendingUp className="w-6 h-6" />}
                          tone="green"
                        />

                        <StatBox
                          label="Bonus"
                          value={totalBonus}
                          icon={<Gift className="w-6 h-6" />}
                          tone="yellow"
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MiniInfo
                          label="Platzierungspunkte"
                          value={n(summerStanding.placement_points)}
                        />
                        <MiniInfo
                          label="Legs gewonnen"
                          value={n(summerStanding.legs_won)}
                        />
                        <MiniInfo
                          label="Legs verloren"
                          value={n(summerStanding.legs_lost)}
                        />
                        <MiniInfo
                          label="Leg-Differenz"
                          value={legDiff >= 0 ? `+${legDiff}` : legDiff}
                        />
                        <MiniInfo
                          label="Matches"
                          value={n(summerStanding.total_matches_played)}
                        />
                        <MiniInfo
                          label="Matches gewonnen"
                          value={n(summerStanding.total_matches_won)}
                        />
                        <MiniInfo
                          label="Matches verloren"
                          value={n(summerStanding.total_matches_lost)}
                        />
                        <MiniInfo
                          label="Gewinnerseiten-Bonus"
                          value={n(summerStanding.winner_side_bonus_points)}
                        />
                      </div>
                    </section>
                  )}

                  {summerEntries.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Medal className="h-5 w-5 text-orange-300" />
                        <h4 className="text-xl font-black text-white">
                          Meine Summer-Special Turniere
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {summerEntries.map((entry, index) => {
                          const bonus =
                            n(entry.bonus_points) + (entry.winner_side_bonus ? 5 : 0)

                          return (
                            <div
                              key={
                                entry.id ||
                                `${entry.player_name}-${entry.tournament_date}-${index}`
                              }
                              className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge className={getPlacementBadgeClass(entry.placement)}>
                                      {getPlacementLabel(entry.placement)}
                                    </Badge>

                                    {entry.winner_side_bonus ? (
                                      <Badge className="bg-amber-500/[0.08]0/[0.08]0 text-white">
                                        <Star className="w-3 h-3 mr-1" />
                                        Gewinnerseite +5
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="font-black text-white">
                                    {entry.tournament_name || "Summer Special Turnier"}
                                  </div>

                                  <div className="mt-1 text-sm leading-6 text-white/42">
                                    {formatDate(entry.tournament_date)}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                  <MiniInfo
                                    label="Punkte"
                                    value={
                                      n(entry.placement_points) +
                                      n(entry.legs_won) +
                                      bonus
                                    }
                                  />
                                  <MiniInfo
                                    label="Legs"
                                    value={`${n(entry.legs_won)}:${n(entry.legs_lost)}`}
                                  />
                                  <MiniInfo
                                    label="Matches"
                                    value={`${n(entry.matches_won)}/${n(entry.matches_played)}`}
                                  />
                                  <MiniInfo label="Bonus" value={bonus} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {dkoRankings.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Swords className="h-5 w-5 text-orange-300" />
                        <h4 className="text-xl font-black text-white">
                          Meine weiteren Turniere
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {dkoRankings.map((ranking, index) => (
                          <div
                            key={`${ranking.tournament_id}-${ranking.tournament_type}-${index}`}
                            className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge className={getPlacementBadgeClass(ranking.placement)}>
                                    {getPlacementLabel(ranking.placement)}
                                  </Badge>

                                  <Badge variant="outline">
                                    {ranking.tournament_type}
                                  </Badge>
                                </div>

                                <div className="font-black text-white">
                                  {ranking.tournament_name || "DKO Turnier"}
                                </div>

                                <div className="mt-1 text-sm leading-6 text-white/42">
                                  {formatDate(ranking.eliminated_at)}
                                </div>
                              </div>

                              <div className="w-12 h-12 rounded-2xl bg-orange-500/[0.08] border border-orange-300/20 flex items-center justify-center">
                                <Target className="w-6 h-6 text-orange-300" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
      {guestPhotoDialogOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <div className="w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0f15] shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300/60">Gastprofil</div>
                <h3 className="mt-1 text-xl font-black text-white">Profilbild ändern</h3>
              </div>
              <button
                type="button"
                onClick={() => setGuestPhotoDialogOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-emerald-100/75">
                Als Gast kannst du dein Profilbild selbst ändern. Dein Name bleibt unverändert.
              </div>

              <label className="block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-white/[0.035] p-5 text-center transition hover:border-orange-300/30 hover:bg-orange-500/[0.04]">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGuestPhotoFileChange} className="hidden" />
                <Upload className="mx-auto h-6 w-6 text-orange-300" />
                <div className="mt-2 text-sm font-black text-white">Foto auswählen</div>
                <div className="mt-1 text-xs font-semibold text-white/30">JPG, PNG oder WEBP</div>
              </label>

              {guestPhotoPreview ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <img src={guestPhotoPreview} alt="Vorschau" className="mx-auto h-32 w-32 rounded-[28px] object-cover" />
                </div>
              ) : null}

              {guestPhotoMessage ? (
                <div className={`rounded-xl px-3 py-2 text-sm font-bold ${
                  guestPhotoMessage.startsWith("Fehler")
                    ? "border border-red-300/15 bg-red-500/[0.06] text-red-100"
                    : "border border-emerald-300/15 bg-emerald-500/[0.06] text-emerald-100"
                }`}>
                  {guestPhotoMessage}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={() => void handleGuestPhotoUpload()}
                disabled={!guestPhotoFile || guestPhotoUploading}
                className="h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400 disabled:opacity-40"
              >
                {guestPhotoUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gespeichert …</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Profilbild speichern</>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
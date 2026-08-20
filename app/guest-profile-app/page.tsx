"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
}

type ClubJoinRequest = {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  created_at: string
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
  if (placement === 1) return "bg-yellow-500 text-white"
  if (placement === 2) return "bg-gray-500 text-white"
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
      ? "bg-green-50 border-green-200 text-green-800"
      : tone === "blue"
        ? "bg-blue-50 border-blue-200 text-blue-800"
        : tone === "purple"
          ? "bg-purple-50 border-purple-200 text-purple-800"
          : tone === "gray"
            ? "bg-gray-50 border-gray-200 text-gray-800"
            : tone === "yellow"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-orange-50 border-orange-200 text-orange-800"

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase opacity-80">
            {label}
          </div>
          <div className="text-2xl font-black mt-1">{value}</div>
        </div>

        <div className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center">
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
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-[11px] font-black uppercase text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  )
}

export default function GuestProfileAppPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)

  const [guestRequest, setGuestRequest] = useState<GuestRequest | null>(null)
  const [clubJoinRequest, setClubJoinRequest] = useState<ClubJoinRequest | null>(null)
  const [linkedPlayer, setLinkedPlayer] = useState<SpieldatenbankPlayer | null>(null)

  const [summerStanding, setSummerStanding] = useState<SummerStanding | null>(null)
  const [summerEntries, setSummerEntries] = useState<SummerEntry[]>([])
  const [dkoRankings, setDkoRankings] = useState<DkoRanking[]>([])

  const [message, setMessage] = useState("")
  const [statsMessage, setStatsMessage] = useState("")

  useEffect(() => {
    if (!authLoading && !session?.user) {
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

  const loadGuestProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setMessage("")

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_guest, is_blocked, blocked_reason")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/guest-login")
        return
      }

      if (!profileData.is_guest) {
        await supabase.auth.signOut()
        router.push("/member-login")
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/guest-login")
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center p-4 pb-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
            <p className="text-sm font-semibold text-gray-600">
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 pb-24">
          <Card className="w-full max-w-md rounded-3xl shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">
                Gastprofil nicht verfügbar
              </h1>

              <p className="text-sm text-gray-600 mb-6">
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-orange-600 uppercase">
                EMD VereinsApp
              </div>

              <h1 className="text-3xl font-black text-gray-900">
                Gastprofil
              </h1>

              <p className="text-gray-600 mt-1">
                Willkommen im Gastbereich
              </p>
            </div>

           <div className="flex items-center gap-2">
  <MarketplaceUnreadBadge compact />

  <Button
    variant="outline"
    onClick={handleLogout}
    className="border-red-200 text-red-600 hover:bg-red-50"
  >
    <LogOut className="w-4 h-4 mr-2" />
    Abmelden
  </Button>
</div>
          </div>

          <Card className="rounded-3xl shadow-xl border border-gray-200 bg-white overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-orange-500 to-orange-600" />

            <CardContent className="p-6 -mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center">
                  <UserRound className="w-12 h-12 text-orange-600" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-green-600 text-white">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Freigeschaltet
                    </Badge>

                    <Badge variant="outline">
                      Gastzugang
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black text-gray-900">
                    {guestRequest.full_name}
                  </h2>

                  <p className="text-gray-600 font-semibold mt-1">
                    Spieler: {displayPlayerName}
                  </p>

                  {linkedPlayer?.verein || linkedPlayer?.ligastatus ? (
                    <p className="text-sm text-gray-500 mt-1">
                      {linkedPlayer?.verein || "Kein Verein"} ·{" "}
                      {linkedPlayer?.ligastatus || "Kein Ligastatus"}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    E-Mail
                  </div>

                  <div className="flex items-center gap-2 font-semibold text-gray-900 break-all">
                    <Mail className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    {guestRequest.email}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Status
                  </div>

                  <div className="font-semibold text-green-700">
                    Zugang freigeschaltet
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
            <CardContent className="p-5 sm:p-6">
              {clubJoinRequest?.status === "pending" ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                      <Clock3 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900">Beitrittsanfrage wird geprüft</div>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        Deine Anfrage ist beim Verein eingelangt. Bis zur Bestätigung bleibst du ganz normal Gast.
                      </p>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="rounded-xl border-orange-200">
                    <Link href="/club-join">Anfrage ansehen</Link>
                  </Button>
                </div>
              ) : clubJoinRequest?.status === "approved" ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50">
                      <ShieldCheck className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900">Beitritt bestätigt</div>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        Deine Aufnahme in den Verein wurde bestätigt. Schließe jetzt mindestens die Grundmitgliedschaft ab, damit dein Vereinszugang freigeschaltet wird.
                      </p>
                    </div>
                  </div>

                  <Button asChild className="rounded-xl bg-green-700 font-black text-white hover:bg-green-800">
                    <Link href="/member-membership">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Mitgliedschaft abschließen
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                      <UserPlus className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900">Du möchtest Vereinsmitglied werden?</div>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        Stelle direkt mit deinem bestehenden Gastkonto eine Beitrittsanfrage.
                      </p>
                    </div>
                  </div>

                  <Button asChild className="rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700">
                    <Link href="/club-join">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Verein beitreten
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-slate-900 via-orange-600 to-orange-500" />

            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-black uppercase text-orange-600">
                    DACH-Turnierkalender
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">
                    Veranstaltungen verwalten
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Eigene Turniere einreichen, Prüfstatus verfolgen, bearbeiten oder absagen.
                  </p>
                </div>

                <Button asChild className="rounded-2xl bg-orange-600 hover:bg-orange-700">
                  <Link href="/dach-veranstaltungen/neu">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Veranstaltung anlegen
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/dach-veranstaltungen/meine"
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="font-black text-gray-900 mt-3">Meine Veranstaltungen</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Status sehen, bearbeiten und absagen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">
                    Öffnen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href="/dach-veranstaltungen/neu"
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                    <PlusCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="font-black text-gray-900 mt-3">Neue Veranstaltung</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Turnier oder Event zur Prüfung einreichen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">
                    Jetzt anlegen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href="/dach-veranstaltungen"
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                    <Globe2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="font-black text-gray-900 mt-3">Alle Veranstaltungen</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Freigegebene DACH-Turniere durchsuchen.
                  </div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">
                    Kalender ansehen
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-slate-950 via-orange-600 to-orange-500" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-black uppercase text-orange-600">Dartbörse</div>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">Kaufen, verkaufen und schreiben</h3>
                  <p className="text-sm text-gray-600 mt-1">Inserate durchsuchen, eigene Artikel anbieten und direkt mit Verkäufern schreiben.</p>
                </div>
                <Button asChild className="rounded-2xl bg-orange-600 hover:bg-orange-700">
                  <Link href="/dartboerse/neu"><PlusCircle className="w-4 h-4 mr-2" />Inserat erstellen</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/dartboerse" className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition">
                  <div className="w-11 h-11 rounded-2xl bg-white border flex items-center justify-center"><Store className="w-5 h-5 text-orange-600" /></div>
                  <div className="font-black mt-3">Dartbörse öffnen</div><div className="text-sm text-gray-600 mt-1">Aktuelle Angebote entdecken.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">Öffnen<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
                <Link href="/dartboerse/meine" className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition">
                  <div className="w-11 h-11 rounded-2xl bg-white border flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-orange-600" /></div>
                  <div className="font-black mt-3">Meine Inserate</div><div className="text-sm text-gray-600 mt-1">Angebote verwalten und Status sehen.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">Verwalten<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
                <Link href="/dartboerse/nachrichten" className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-orange-300 hover:bg-orange-50 transition">
                  <div className="w-11 h-11 rounded-2xl bg-white border flex items-center justify-center"><MessageCircle className="w-5 h-5 text-orange-600" /></div>
                  <div className="font-black mt-3">Meine Nachrichten</div><div className="text-sm text-gray-600 mt-1">Direkt mit Käufern und Verkäufern schreiben.</div>
                  <div className="mt-3 flex items-center text-sm font-bold text-orange-700">Nachrichten<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" /></div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">
                    Meine Statistiken
                  </h3>

                  <p className="text-sm text-gray-600 mt-1">
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
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
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
                    <Loader2 className="w-9 h-9 animate-spin text-orange-600" />
                    <p className="text-sm font-semibold text-gray-600">
                      Statistiken werden geladen...
                    </p>
                  </div>
                </div>
              ) : statsMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-black">Hinweis</div>
                      <p className="text-sm mt-1">{statsMessage}</p>
                    </div>
                  </div>
                </div>
              ) : !summerStanding && summerEntries.length === 0 && dkoRankings.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-gray-700">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 mt-0.5 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="font-black text-gray-900">
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
                        <Trophy className="w-5 h-5 text-orange-600" />
                        <h4 className="text-xl font-black text-gray-900">
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
                        <Medal className="w-5 h-5 text-orange-600" />
                        <h4 className="text-xl font-black text-gray-900">
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
                              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge className={getPlacementBadgeClass(entry.placement)}>
                                      {getPlacementLabel(entry.placement)}
                                    </Badge>

                                    {entry.winner_side_bonus ? (
                                      <Badge className="bg-yellow-500 text-white">
                                        <Star className="w-3 h-3 mr-1" />
                                        Gewinnerseite +5
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="font-black text-gray-900">
                                    {entry.tournament_name || "Summer Special Turnier"}
                                  </div>

                                  <div className="text-sm text-gray-600 mt-1">
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
                        <Swords className="w-5 h-5 text-orange-600" />
                        <h4 className="text-xl font-black text-gray-900">
                          Meine weiteren Turniere
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {dkoRankings.map((ranking, index) => (
                          <div
                            key={`${ranking.tournament_id}-${ranking.tournament_type}-${index}`}
                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
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

                                <div className="font-black text-gray-900">
                                  {ranking.tournament_name || "DKO Turnier"}
                                </div>

                                <div className="text-sm text-gray-600 mt-1">
                                  {formatDate(ranking.eliminated_at)}
                                </div>
                              </div>

                              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                                <Target className="w-6 h-6 text-orange-600" />
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
    </div>
  )
}
"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { MembershipAccessGate } from "@/components/member/membership/membership-access-gate"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  Crown,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ClipboardList,
  Eye,
  MessageCircle,
  Send,
  Clock,
} from "lucide-react"

type AvailabilityStatus = "yes" | "maybe" | "no"

const MATCH_CARD_PREFIX = "[[EMD_MATCH_CARD|"

function makeChatMatchCardMessage(matchId: string, teamId: string) {
  return `${MATCH_CARD_PREFIX}${matchId}|${teamId}]]`
}

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: { id: string; name: string; photo_url: string | null } | null
}

interface TeamMembership {
  id: string
  team_id: string
  role: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
    dart_type?: "edart" | "steeldart" | null
  } | null
}

interface OpponentTeam {
  id: string
  name: string
  venue?: string | null
  venue_name?: string | null
  captain_phone?: string | null
}

interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_type: "own" | "opponent" | "club_team"
  away_team_type: "own" | "opponent" | "club_team"
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  match_time: string | null
  venue: string
  week_number: number
  home_score: number | null
  away_score: number | null
  status: string
  season_id: string
  dart_type: string
  match_format: string | null
  home_team?: { id: string; name: string }
  away_team?: { id: string; name: string }
  home_opponent_team?: OpponentTeam | null
  away_opponent_team?: OpponentTeam | null
  season?: { id: string; name: string; type: string }
}

type AvailabilityRow = {
  player_id: string
  status: AvailabilityStatus
  note: string | null
  updated_at: string
  club_players?: { id: string; name: string; photo_url: string | null } | null
}

type TeamPlayer = {
  id: string
  name: string
  photo_url: string | null
}

type LineupRow = {
  id: string
  player_id: string
  position: number
  is_substitute: boolean
  club_players?: { id: string; name: string; photo_url: string | null } | null
}

type LineupHeader = {
  status: string
  current_version: number | null
  confirmed_version: number | null
  confirmed_at: string | null
  confirmed_by: string | null
}

type ChatMessage = {
  id: string
  user_id: string
  room_id: string
  message: string
  created_at: string
  sender?: { name: string; photo_url: string | null } | null
}

function formatDate(dateString: string) {
  const d = new Date(dateString)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function formatTime(timeString: string | null) {
  if (!timeString) return ""
  const parts = timeString.split(":")
  return `${parts[0]}:${parts[1]}`
}

function normalizeDartType(value: string | null | undefined) {
  const v = String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "")
  if (v.includes("edart")) return "edart" as const
  if (v.includes("steel")) return "steeldart" as const
  return "" as const
}

function statusBadge(s: AvailabilityStatus | "none") {
  if (s === "yes") return <Badge className="bg-green-600 text-white">Ja</Badge>
  if (s === "maybe") return <Badge className="bg-yellow-600 text-white">Nur wenn Not am Mann</Badge>
  if (s === "no") return <Badge className="bg-red-600 text-white">Nein</Badge>
  return <Badge variant="outline">keine Antwort</Badge>
}

function leadershipIcon(role: string | null) {
  if (role === "Captain") return <Crown className="h-4 w-4 text-yellow-600" />
  if (role === "Co-Captain") return <ShieldCheck className="h-4 w-4 text-blue-600" />
  return null
}

function normalizePhoneForLinks(input: string) {
  return input.replace(/[^\d+]/g, "")
}

function whatsappUrlFromPhone(phone: string) {
  let p = normalizePhoneForLinks(phone).trim()
  if (p.startsWith("+")) p = p.slice(1)
  if (p.startsWith("00")) p = p.slice(2)
  return `https://wa.me/${p}`
}

function getOpponentForMatch(match: Match) {
  if (match.home_team_type === "opponent") return match.home_opponent_team ?? null
  if (match.away_team_type === "opponent") return match.away_opponent_team ?? null
  return null
}

function getMatchStartDateTime(match: Match) {
  const t = (match.match_time ? match.match_time.slice(0, 5) : "23:59") + ":00"
  return new Date(`${match.match_date}T${t}`)
}

function isMatchLocked(match: Match) {
  if (match.status === "completed") return true
  const dt = getMatchStartDateTime(match)
  const ms = dt.getTime()
  if (!Number.isFinite(ms)) return false
  return Date.now() >= ms
}

function InfoCallout() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[28px]">
      <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] shadow-[0_0_18px_rgba(249,115,22,.07)]">
            <MessageCircle className="h-5 w-5 text-orange-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">So funktioniert’s</div>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">Deine Verfügbarkeit</h2>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/50">
          Gib pro Spiel kurz an, ob du dabei bist. Captain und Co-Captain sehen sofort, mit wem sie für die Aufstellung planen können.
        </p>
      </div>

      <div className="grid gap-2.5 p-3.5 sm:grid-cols-3 sm:p-4">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.055] p-3.5 shadow-[0_0_24px_rgba(16,185,129,.045)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div className="text-sm font-black text-white">Ja</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-white/45">Du bist sicher dabei.</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/15 bg-amber-500/[0.055] p-3.5 shadow-[0_0_24px_rgba(245,158,11,.045)]">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <div className="text-sm font-black text-white">Nur wenn nötig</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-white/45">Du kannst einspringen, wenn jemand gebraucht wird.</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-red-300/15 bg-red-500/[0.055] p-3.5 shadow-[0_0_24px_rgba(244,63,94,.045)]">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div className="text-sm font-black text-white">Nein</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-white/45">Du bist für dieses Spiel nicht verfügbar.</div>
        </div>
      </div>
    </div>
  )
}

function MemberAvailabilityInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [modalTab, setModalTab] = useState<"availability" | "lineup" | "chat">("availability")
  const [dialogMatch, setDialogMatch] = useState<Match | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])
  const [myStatus, setMyStatus] = useState<AvailabilityStatus>("maybe")
  const [myNote, setMyNote] = useState("")

  const [lineupPlayers, setLineupPlayers] = useState<LineupRow[]>([])
  const [savingLineup, setSavingLineup] = useState(false)
  const [draftLineup, setDraftLineup] = useState<LineupRow[]>([])
  const [draftDirty, setDraftDirty] = useState(false)
  const [lineupEditMode, setLineupEditMode] = useState(false)
  const [lineupHeader, setLineupHeader] = useState<LineupHeader | null>(null)
  const [confirmingLineup, setConfirmingLineup] = useState(false)
  const [lineupError, setLineupError] = useState<string | null>(null)
  const [publishingChatCard, setPublishingChatCard] = useState(false)
  const [chatCardResult, setChatCardResult] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatText, setChatText] = useState("")
  const [remindSending, setRemindSending] = useState<Record<string, boolean>>({})
  const [remindOk, setRemindOk] = useState<Record<string, boolean>>({})
  const [remindAllSending, setRemindAllSending] = useState(false)
  const [remindAllResult, setRemindAllResult] = useState<string | null>(null)
  const [cooldownOpen, setCooldownOpen] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const effectiveLineup = useMemo(
    () => (lineupEditMode ? draftLineup : lineupPlayers),
    [lineupEditMode, draftLineup, lineupPlayers],
  )

  const activeRoomId = useMemo(() => dialogMatch?.id ?? null, [dialogMatch])

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (!session?.user) return
    ;(async () => {
      setLoading(true)
      await fetchUserProfile()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (!profile?.player_id || teamMemberships.length === 0) return
    void fetchMatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, teamMemberships])

  useEffect(() => {
    if (!session?.user || matches.length === 0) return
    const matchId = searchParams.get("match_id")
    const teamId = searchParams.get("team_id")
    if (!matchId) return
    const m = matches.find((x) => x.id === matchId)
    if (!m) return

    ;(async () => {
      await openMatchDialog(m)
      if (teamId) {
        setSelectedTeamId(teamId)
        await loadMatchData(m.id, teamId, m)
      }

      if (searchParams.get("tab") === "lineup") {
        setModalTab("lineup")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, matches])

  async function fetchUserProfile() {
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select(`id, user_id, player_id, club_players (id, name, photo_url)`)
      .eq("user_id", session!.user.id)
      .single()

    if (profileError) return

    setProfile(profileData as any)

    if (profileData?.player_id) {
      const { data: teamData } = await supabase
        .from("team_members")
        .select(`id, team_id, role, teams (id, name, logo_url, dart_type)`)
        .eq("player_id", profileData.player_id)
        .is("left_at", null)

      setTeamMemberships((teamData as any) || [])
    }
  }

  async function fetchMatches() {
    const teamIds = teamMemberships.map((t) => t.team_id)
    if (teamIds.length === 0) {
      setMatches([])
      return
    }

    const [matchesRes, oppRes] = await Promise.all([
      supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, dart_type),
          away_team:teams!matches_away_team_id_fkey(id, name, dart_type),
          season:seasons(id, name, type)
        `)
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .order("match_date", { ascending: true }),
      supabase.from("opponent_teams").select("*"),
    ])

    const opp = (oppRes.data as any) || []
    const enriched = (((matchesRes.data as any) || []).map((m: any) => ({
      ...m,
      home_opponent_team: m.home_opponent_team_id ? opp.find((x: any) => x.id === m.home_opponent_team_id) : null,
      away_opponent_team: m.away_opponent_team_id ? opp.find((x: any) => x.id === m.away_opponent_team_id) : null,
    }))) as Match[]

    setMatches(enriched)
  }

  function getTeamDisplayName(match: Match, isHome: boolean) {
    if (isHome) {
      if (match.home_team_type === "own" && match.home_team) return match.home_team.name
      if (match.home_team_type === "opponent" && match.home_opponent_team) return match.home_opponent_team.name
      if (match.home_team) return match.home_team.name
    } else {
      if (match.away_team_type === "own" && match.away_team) return match.away_team.name
      if (match.away_team_type === "opponent" && match.away_opponent_team) return match.away_opponent_team.name
      if (match.away_team) return match.away_team.name
    }
    return "Unbekannt"
  }

  function myTeamsForMatch(match: Match) {
    const ids = new Set(teamMemberships.map((t) => t.team_id))
    const list: TeamMembership[] = []
    if (ids.has(match.home_team_id)) {
      const found = teamMemberships.find((t) => t.team_id === match.home_team_id)
      if (found) list.push(found)
    }
    if (ids.has(match.away_team_id)) {
      const found = teamMemberships.find((t) => t.team_id === match.away_team_id)
      if (found) list.push(found)
    }
    return list
  }

  async function openMatchDialog(match: Match) {
    setModalTab("availability")
    setDialogMatch(match)
    const myTeams = myTeamsForMatch(match)
    const defaultTeamId = myTeams[0]?.team_id ?? null
    setSelectedTeamId(defaultTeamId)
    setIsDialogOpen(true)
    setLineupEditMode(false)

    if (defaultTeamId) {
      await loadMatchData(match.id, defaultTeamId, match)
    } else {
      setTeamPlayers([])
      setAvailability([])
      setLineupPlayers([])
      setLineupHeader(null)
    }
  }

  async function loadChat(roomId: string) {
    setChatLoading(true)
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,user_id,room_id,message,created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200)

      if (error) throw error

      const rows = (data as any[]) || []
      if (rows.length === 0) {
        setChatMessages([])
        return
      }

      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)))
      const { data: profiles } = await supabase.from("user_profiles").select("id, player_id").in("id", profileIds)
      const profileToPlayer = new Map<string, string>()

      ;(profiles as any[] | null)?.forEach((p) => {
        if (p?.id && p?.player_id) profileToPlayer.set(p.id, p.player_id)
      })

      const playerIds = Array.from(new Set((profiles as any[] | null)?.map((p) => p.player_id).filter(Boolean) ?? []))
      const { data: players } = await supabase.from("club_players").select("id,name,photo_url").in("id", playerIds)
      const playerMap = new Map<string, { name: string; photo_url: string | null }>()

      ;(players as any[] | null)?.forEach((p) => {
        playerMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null })
      })

      setChatMessages(rows.map((r) => {
        const playerId = profileToPlayer.get(r.user_id)
        return { ...r, sender: playerId ? playerMap.get(playerId) ?? null : null }
      }) as any)
    } catch (e) {
      console.error("loadChat error", e)
      setChatMessages([])
    } finally {
      setChatLoading(false)
    }
  }

  function subscribeToChat(roomId: string) {
    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const incoming = payload.new as any
          const { data: prof } = await supabase
            .from("user_profiles")
            .select("player_id")
            .eq("id", incoming.user_id)
            .maybeSingle()

          let sender: { name: string; photo_url: string | null } | null = null
          const playerId = (prof as any)?.player_id
          if (playerId) {
            const { data: cp } = await supabase
              .from("club_players")
              .select("name,photo_url")
              .eq("id", playerId)
              .maybeSingle()
            if (cp) sender = { name: (cp as any).name, photo_url: (cp as any).photo_url ?? null }
          }

          setChatMessages((prev) => [...prev, { ...incoming, sender }])
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  useEffect(() => {
    if (!isDialogOpen || !activeRoomId) return
    void loadChat(activeRoomId)
    const unsub = subscribeToChat(activeRoomId)
    return () => { void unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, activeRoomId])

  async function sendChatMessage() {
    if (!dialogMatch || !profile?.id || !activeRoomId) return
    const text = chatText.trim()
    if (!text || chatSending) return

    setChatSending(true)
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: profile.id,
        room_id: activeRoomId,
        message: text,
      })
      if (error) throw error

      await fetch("/api/push/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          room_id: activeRoomId,
          scope: "match",
          team_id: selectedTeamId,
          sender_profile_id: profile.id,
          message: text,
        }),
      })

      setChatText("")
    } catch (e) {
      console.error("sendChatMessage error", e)
    } finally {
      setChatSending(false)
    }
  }

  function getRequiredLeagueModuleForMatch(match: Match | null, teamId: string | null) {
    if (!teamId) return null
    const myTeam = teamMemberships.find((membership) => membership.team_id === teamId)
    const dartType = normalizeDartType(myTeam?.teams?.dart_type || match?.dart_type)

    if (dartType === "edart") return "edart_league"
    if (dartType === "steeldart") return "steeldart_league"
    return null
  }

  async function loadMatchData(matchId: string, teamId: string, currentMatch?: Match | null) {
    if (!profile?.player_id) return

    const requiredModule = getRequiredLeagueModuleForMatch(currentMatch ?? dialogMatch, teamId)

    if (!requiredModule) {
      setLineupError("Die Liga-Art des Teams konnte nicht ermittelt werden. Bitte prüfe teams.dart_type.")
      setTeamPlayers([])
      setAvailability([])
      setLineupPlayers([])
      setDraftLineup([])
      return
    }

    const { data: eligibleRows, error: eligibleErr } = await supabase.rpc(
      "eligible_team_players_for_league",
      {
        p_team_id: teamId,
        p_required_module_code: requiredModule,
      },
    )

    if (eligibleErr) {
      console.error("eligible_team_players_for_league error:", eligibleErr)
      setTeamPlayers([])
      setAvailability([])
      setLineupPlayers([])
      setDraftLineup([])
      return
    }

    const eligiblePlayerIds = new Set<string>(
      ((eligibleRows as any[]) || []).map((row: any) => row.player_id).filter(Boolean),
    )

    const { data: tm, error: tmErr } = await supabase
      .from("team_members")
      .select(`player_id, club_players:club_players!team_members_player_id_fkey(id, name, photo_url)`)
      .eq("team_id", teamId)
      .is("left_at", null)

    if (tmErr) console.error("team_members error:", tmErr)

    const activePlayerIds = new Set<string>(
      ((tm as any) || [])
        .map((r: any) => r.player_id)
        .filter((playerId: string) => eligiblePlayerIds.has(playerId)),
    )

    const players: TeamPlayer[] = ((tm as any) || [])
      .filter((r: any) => activePlayerIds.has(r.player_id))
      .map((r: any) => r.club_players)
      .filter(Boolean)

    setTeamPlayers(players)

    const { data: av } = await supabase
      .from("match_availability")
      .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
      .eq("match_id", matchId)
      .eq("team_id", teamId)

    const rows = (((av as any) || []) as AvailabilityRow[]).filter((r) => activePlayerIds.has(r.player_id))
    setAvailability(rows)

    const mine = rows.find((x) => x.player_id === profile.player_id)
    setMyStatus(mine?.status ?? "maybe")
    setMyNote(mine?.note ?? "")

    const { data: lu } = await supabase
      .from("match_lineups")
      .select("id,player_id,position,is_substitute, club_players:club_players(id,name,photo_url)")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .order("position", { ascending: true })

    const loaded = ((((lu as any) || []) as LineupRow[]).filter((r) => activePlayerIds.has(r.player_id)))
    setLineupPlayers(loaded)
    setDraftLineup(loaded)
    setDraftDirty(false)

    const { data: lh } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version,confirmed_at,confirmed_by")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .maybeSingle()

    setLineupHeader((lh as any) ?? null)

    const isConfirmed =
      (lh as any)?.status === "confirmed" &&
      (lh as any)?.confirmed_version != null &&
      (lh as any)?.confirmed_version === (lh as any)?.current_version

    const isStale =
      (lh as any)?.status === "confirmed" &&
      (lh as any)?.confirmed_version != null &&
      (lh as any)?.current_version != null &&
      (lh as any)?.confirmed_version < (lh as any)?.current_version

    setLineupEditMode(!isConfirmed && !isStale)
  }

  const isCaptainOrCoForTeam = useMemo(() => {
    if (!selectedTeamId) return false
    const m = teamMemberships.find((t) => t.team_id === selectedTeamId)
    return m?.role === "Captain" || m?.role === "Co-Captain"
  }, [selectedTeamId, teamMemberships])

  const availabilityByPlayer = useMemo(() => {
    const m = new Map<string, AvailabilityRow>()
    for (const a of availability) m.set(a.player_id, a)
    return m
  }, [availability])

  const displayPlayers = useMemo(() => {
    if (teamPlayers.length > 0) return teamPlayers

    const m = new Map<string, TeamPlayer>()
    for (const a of availability) {
      const cp = a.club_players
      if (cp?.id) m.set(cp.id, { id: cp.id, name: cp.name, photo_url: cp.photo_url })
    }
    for (const lp of lineupPlayers) {
      const cp = lp.club_players
      if (cp?.id) m.set(cp.id, { id: cp.id, name: cp.name, photo_url: cp.photo_url })
    }
    return Array.from(m.values())
  }, [teamPlayers, availability, lineupPlayers])

  const noAnswerPlayerIds = useMemo(() => {
    const myId = profile?.player_id ?? null
    return displayPlayers
      .map((p) => p.id)
      .filter((pid) => pid !== myId)
      .filter((pid) => (availabilityByPlayer.get(pid)?.status ?? "none") === "none")
  }, [displayPlayers, availabilityByPlayer, profile?.player_id])

  const dialogIsLocked = useMemo(
    () => (dialogMatch ? isMatchLocked(dialogMatch) : false),
    [dialogMatch],
  )

  async function setAvailabilityStatus(status: AvailabilityStatus) {
    if (!dialogMatch || !selectedTeamId || !profile?.player_id) return
    if (isMatchLocked(dialogMatch)) return

    setMyStatus(status)

    await supabase.from("match_availability").upsert(
      {
        match_id: dialogMatch.id,
        team_id: selectedTeamId,
        player_id: profile.player_id,
        status,
        note: myNote,
      },
      { onConflict: "match_id,player_id" },
    )

    await loadMatchData(dialogMatch.id, selectedTeamId, dialogMatch)
  }

  async function saveNote() {
    if (!dialogMatch || !selectedTeamId || !profile?.player_id) return
    if (isMatchLocked(dialogMatch)) return

    await supabase.from("match_availability").upsert(
      {
        match_id: dialogMatch.id,
        team_id: selectedTeamId,
        player_id: profile.player_id,
        status: myStatus,
        note: myNote,
      },
      { onConflict: "match_id,player_id" },
    )

    await loadMatchData(dialogMatch.id, selectedTeamId, dialogMatch)
  }

  function setLineupPlayer(playerId: string, mode: "remove" | "starter" | "substitute") {
    if (!dialogMatch || !selectedTeamId) return
    if (!isCaptainOrCoForTeam) return
    if (isMatchLocked(dialogMatch)) return
    if ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode) return

    if (mode !== "remove" && !teamPlayers.some((player) => player.id === playerId)) {
      setLineupError("Dieser Spieler hat für diese Liga kein aktives Paket bzw. keine gültige Testfreischaltung.")
      return
    }

    setDraftLineup((prev) => {
      const next = [...prev]
      const idx = next.findIndex((p) => p.player_id === playerId)
      const startersCount = next.filter((p) => !p.is_substitute).length

      if (mode === "remove" && idx !== -1) next.splice(idx, 1)

      if (mode === "substitute") {
        if (idx !== -1) {
          next[idx] = { ...next[idx], is_substitute: true, position: 0 }
        } else {
          next.push({
            id: `draft_${playerId}`,
            player_id: playerId,
            position: 0,
            is_substitute: true,
          } as any)
        }
      }

      if (mode === "starter") {
        if (idx !== -1) {
          if (next[idx].is_substitute) {
            next[idx] = { ...next[idx], is_substitute: false, position: startersCount + 1 }
          }
        } else {
          next.push({
            id: `draft_${playerId}`,
            player_id: playerId,
            position: startersCount + 1,
            is_substitute: false,
          } as any)
        }
      }

      const starters = next
        .filter((p) => !p.is_substitute)
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((p, i) => ({ ...p, position: i + 1 }))

      const subs = next.filter((p) => p.is_substitute).map((p) => ({ ...p, position: 0 }))
      return [...starters, ...subs]
    })

    setDraftDirty(true)
  }

  async function saveDraftLineup() {
    if (!dialogMatch || !selectedTeamId) return
    if (!isCaptainOrCoForTeam) return
    if (isMatchLocked(dialogMatch)) return
    if (!draftDirty) return

    setSavingLineup(true)
    try {
      const matchId = dialogMatch.id
      const teamId = selectedTeamId

      await supabase.from("match_lineups").delete().eq("match_id", matchId).eq("team_id", teamId)

      const allowedPlayerIds = new Set(teamPlayers.map((player) => player.id))
      const rowsToInsert = draftLineup
        .filter((p) => allowedPlayerIds.has(p.player_id))
        .map((p) => ({
          match_id: matchId,
          team_id: teamId,
          player_id: p.player_id,
          position: p.is_substitute ? 0 : p.position,
          is_substitute: p.is_substitute,
        }))

      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from("match_lineups").insert(rowsToInsert)
        if (error) throw error
      }

      await loadMatchData(matchId, teamId, dialogMatch)
      setDraftDirty(false)
      setLineupEditMode(true)
    } catch (e: any) {
      console.error("saveDraftLineup error", e)

      const message = String(e?.message || "")

      if (message.includes("Spielbeginn")) {
        setLineupError("Die Aufstellung ist bereits gesperrt. Ab Spielbeginn sind keine Änderungen mehr möglich.")
      } else if (message.includes("Captain")) {
        setLineupError("Nur Captain oder Co-Captain dürfen die Aufstellung ändern.")
      } else {
        setLineupError("Die Aufstellung konnte nicht gespeichert werden. Bitte nochmals versuchen.")
      }
    } finally {
      setSavingLineup(false)
    }
  }

  async function publishMatchCardToTeamChat() {
    if (!dialogMatch || !selectedTeamId || !profile?.id || !isCaptainOrCoForTeam) {
      return { ok: false, created: false }
    }

    const response = await fetch("/api/push/team-match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        action: "publish",
        team_id: selectedTeamId,
        match_id: dialogMatch.id,
        sender_profile_id: profile.id,
      }),
    })

    const json = await response.json().catch(() => null)
    if (!response.ok || !json?.success) {
      throw new Error(json?.error || "Veröffentlichen fehlgeschlagen.")
    }

    return { ok: true, created: !!json?.created }
  }

  async function manuallyPublishMatchCard() {
    if (publishingChatCard || !dialogMatch || !selectedTeamId) return

    setPublishingChatCard(true)
    setChatCardResult(null)

    try {
      const result = await publishMatchCardToTeamChat()
      if (!result.ok) return
      setChatCardResult(
        result.created
          ? "Im Team-Chat veröffentlicht."
          : "Karte ist bereits im Team-Chat – Push wurde erneut gesendet.",
      )
      setTimeout(() => setChatCardResult(null), 3500)
    } catch (e: any) {
      console.error("manuallyPublishMatchCard error", e)
      setChatCardResult(e?.message || "Veröffentlichen fehlgeschlagen.")
      setTimeout(() => setChatCardResult(null), 4500)
    } finally {
      setPublishingChatCard(false)
    }
  }

  async function confirmLineup() {
    if (!dialogMatch || !selectedTeamId) return
    if (!isCaptainOrCoForTeam) return
    if (isMatchLocked(dialogMatch)) return
    if (!profile?.id) return

    setLineupError(null)

    const startersNow = effectiveLineup.filter((p) => !p.is_substitute).length
    const selectedTeam = teamMemberships.find((membership) => membership.team_id === selectedTeamId)
    const lineupDartType = normalizeDartType(selectedTeam?.teams?.dart_type || dialogMatch.dart_type)
    const requiredStarters = lineupDartType === "edart" ? 4 : lineupDartType === "steeldart" ? 3 : 1

    if (startersNow < requiredStarters) {
      const label = lineupDartType === "edart" ? "E-Dart" : lineupDartType === "steeldart" ? "Steeldart" : "Diese Liga"
      setLineupError(`${label} benötigt mindestens ${requiredStarters} Starter. Aktuell sind ${startersNow} eingetragen.`)
      return
    }

    setConfirmingLineup(true)
    try {
      if (lineupEditMode && draftDirty) {
        const matchId = dialogMatch.id
        const teamId = selectedTeamId

        await supabase.from("match_lineups").delete().eq("match_id", matchId).eq("team_id", teamId)

        const allowedPlayerIds = new Set(teamPlayers.map((player) => player.id))
        const rowsToInsert = draftLineup
          .filter((p) => allowedPlayerIds.has(p.player_id))
          .map((p) => ({
            match_id: matchId,
            team_id: teamId,
            player_id: p.player_id,
            position: p.is_substitute ? 0 : p.position,
            is_substitute: p.is_substitute,
          }))

        if (rowsToInsert.length > 0) {
          const { error } = await supabase.from("match_lineups").insert(rowsToInsert)
          if (error) throw error
        }

        setDraftDirty(false)
      }

      const { error } = await supabase.rpc("confirm_lineup", {
        p_match_id: dialogMatch.id,
        p_team_id: selectedTeamId,
      })
      if (error) throw error

      await loadMatchData(dialogMatch.id, selectedTeamId, dialogMatch)
      setLineupEditMode(false)
      setLineupError(null)

      // Alles rund um das bestätigte Spiel läuft über die Team-Chat-Route:
      // - Spielkarte sicher im Team-Chat
      // - Bestätigung als Chat-Nachricht posten
      // - genau EINE Push an die Teammitglieder
      // - Klick führt direkt zum Spiel in "Aufstellung" innerhalb des Messengers
      const confirmPush = await fetch("/api/push/team-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "confirmed",
          team_id: selectedTeamId,
          match_id: dialogMatch.id,
          sender_profile_id: profile.id,
        }),
      })

      const confirmJson = await confirmPush.json().catch(() => null)
      if (!confirmPush.ok || !confirmJson?.success) {
        throw new Error(confirmJson?.error || "Aufstellung wurde gespeichert, aber Team-Info konnte nicht gesendet werden.")
      }
    } catch (e: any) {
      console.error("confirmLineup error", e)

      const message = String(e?.message || "")

      if (message.includes("Spielbeginn")) {
        setLineupError("Die Aufstellung kann nicht mehr bestätigt oder geändert werden. Der Spielbeginn wurde bereits erreicht.")
      } else if (message.includes("Captain")) {
        setLineupError("Nur Captain oder Co-Captain dürfen die Aufstellung bestätigen.")
      } else {
        setLineupError("Fehler beim Bestätigen. Bitte nochmals versuchen.")
      }
    } finally {
      setConfirmingLineup(false)
    }
  }

  async function sendAvailabilityReminder(targetPlayerId: string) {
    if (!dialogMatch || !selectedTeamId || !isCaptainOrCoForTeam || !profile?.id || dialogIsLocked) return
    if (targetPlayerId === profile.player_id) return

    setRemindSending((p) => ({ ...p, [targetPlayerId]: true }))
    setRemindOk((p) => ({ ...p, [targetPlayerId]: false }))

    try {
      const res = await fetch("/api/push/team-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "reminder",
          team_id: selectedTeamId,
          match_id: dialogMatch.id,
          target_player_id: targetPlayerId,
          sender_profile_id: profile.id,
        }),
      })

      const json = await res.json().catch(() => null)

      if (json?.cooldown) {
        setCooldownMinutes(json.minutes_left ?? 30)
        setCooldownOpen(true)
        return
      }

      if (!res.ok || !json?.success) throw new Error(json?.error || "push failed")

      setRemindOk((p) => ({ ...p, [targetPlayerId]: true }))
      setTimeout(() => setRemindOk((p) => ({ ...p, [targetPlayerId]: false })), 2000)
    } catch (e) {
      console.error("sendAvailabilityReminder error", e)
    } finally {
      setRemindSending((p) => ({ ...p, [targetPlayerId]: false }))
    }
  }

  async function sendAvailabilityReminderToAll() {
    if (!dialogMatch || !selectedTeamId || !isCaptainOrCoForTeam || !profile?.id || dialogIsLocked) return

    if (noAnswerPlayerIds.length === 0) {
      setRemindAllResult("Niemand offen 🙂")
      setTimeout(() => setRemindAllResult(null), 2000)
      return
    }

    setRemindAllSending(true)
    setRemindAllResult(null)

    let sent = 0
    let failed = 0

    for (const pid of noAnswerPlayerIds) {
      try {
        const res = await fetch("/api/push/team-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            action: "reminder",
            team_id: selectedTeamId,
            match_id: dialogMatch.id,
            target_player_id: pid,
            sender_profile_id: profile.id,
          }),
        })

        const json = await res.json().catch(() => null)
        if (json?.cooldown) continue
        if (!res.ok || !json?.success) throw new Error(json?.error || "push failed")
        if ((json?.sent ?? 0) > 0) sent += 1
        else failed += 1
      } catch (e) {
        failed += 1
        console.error("remind all: failed for", pid, e)
      }
    }

    setRemindAllSending(false)
    setRemindAllResult(`Erinnert: ${sent} • Fehler: ${failed}`)
    setTimeout(() => setRemindAllResult(null), 3500)
  }

  const upcomingMatches = matches.filter((m) => m.status !== "completed")
  const completedMatches = matches.filter((m) => m.status === "completed")

  const starters = useMemo(
    () => effectiveLineup.filter((p) => !p.is_substitute).slice().sort((a, b) => a.position - b.position),
    [effectiveLineup],
  )

  const substitutes = useMemo(
    () => effectiveLineup.filter((p) => p.is_substitute),
    [effectiveLineup],
  )

  const startersCount = useMemo(
    () => effectiveLineup.filter((p) => !p.is_substitute).length,
    [effectiveLineup],
  )

  const lineupIsConfirmed =
    lineupHeader?.status === "confirmed" &&
    lineupHeader.confirmed_version !== null &&
    lineupHeader.confirmed_version === lineupHeader.current_version

  const lineupIsStale =
    lineupHeader?.status === "confirmed" &&
    lineupHeader.confirmed_version !== null &&
    lineupHeader.current_version !== null &&
    lineupHeader.confirmed_version < lineupHeader.current_version

  const selectedLineupDartType = normalizeDartType(
    teamMemberships.find((membership) => membership.team_id === selectedTeamId)?.teams?.dart_type ||
      dialogMatch?.dart_type,
  )

  const requiredStartersForDialog =
    selectedLineupDartType === "edart" ? 4 : selectedLineupDartType === "steeldart" ? 3 : 1

  const lineupHasEnoughStarters = startersCount >= requiredStartersForDialog

  const availabilitySummary = useMemo(() => {
    let yes = 0
    let maybe = 0
    let no = 0
    let none = 0

    for (const player of displayPlayers) {
      const status = availabilityByPlayer.get(player.id)?.status ?? "none"
      if (status === "yes") yes += 1
      else if (status === "maybe") maybe += 1
      else if (status === "no") no += 1
      else none += 1
    }

    return { yes, maybe, no, none }
  }, [displayPlayers, availabilityByPlayer])

  if (authLoading || loading) {
    return <div className="min-h-[1px]" aria-hidden="true" />
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="Zusagen & Aufstellung" subtitle="Ligazentrale" backHref="/member-league-app" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.36]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.92)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_7%_18%,rgba(249,115,22,.20),transparent_28%),radial-gradient(circle_at_90%_28%,rgba(14,165,233,.12),transparent_29%),radial-gradient(circle_at_50%_86%,rgba(99,102,241,.07),transparent_25%)]" />
        <div className="absolute inset-0 opacity-[0.028] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      <main className="relative z-10 w-full pt-14 sm:pt-16">
        <MembershipAccessGate
          required={["edart_league", "steeldart_league"]}
          requireAll={false}
          title="Zusagen & Aufstellung nicht freigeschaltet"
          description="Für diesen Bereich brauchst du ein aktives E-Dart- oder Steeldart-Ligapaket bzw. eine gültige Testfreischaltung."
        >
          <div className="mx-auto w-full max-w-[var(--emd-content-max)] overflow-x-hidden px-3 py-4 pb-24 sm:px-5 sm:py-5 sm:pb-10 lg:px-7 xl:px-8">
            <section className="relative mb-4 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 shadow-[0_32px_110px_-52px_rgba(0,0,0,.98)] backdrop-blur-2xl sm:mb-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,.18),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,.10),transparent_28%)]" />
              <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-orange-300/30 to-transparent" />
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08] text-orange-300 shadow-[0_0_24px_rgba(249,115,22,.09)]">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/50">Planung für deine Ligaspiele</p>
                        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Zusagen & Aufstellung</h1>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="mb-4 sm:mb-5">
              <InfoCallout />
            </div>

            <Card className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/30 text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
              <CardHeader className="border-b border-white/[0.07] px-4 py-5">
                <CardTitle className="flex items-center gap-2 text-xl font-black text-white">
                  <Calendar className="h-5 w-5 text-orange-300" />
                  Spiele
                </CardTitle>
              </CardHeader>

              <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1.5 backdrop-blur-xl">
                    <TabsTrigger value="upcoming" className="h-10 rounded-xl font-black text-white/50 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.14)]">
                      Kommende ({upcomingMatches.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="h-10 rounded-xl font-black text-white/50 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_rgba(249,115,22,.14)]">
                      Abgeschlossen ({completedMatches.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming">
                    <div className="grid gap-3">
                      {upcomingMatches.length === 0 ? (
                        <div className="text-sm text-white/40">Keine kommenden Spiele.</div>
                      ) : (
                        upcomingMatches.map((m) => {
                          const locked = isMatchLocked(m)
                          return (
                            <Card key={m.id} className={`relative overflow-hidden rounded-[22px] border border-orange-300/[0.10] bg-white/[0.035] text-white shadow-[0_0_26px_rgba(249,115,22,.05)] transition active:scale-[0.992] sm:border-white/[0.08] sm:shadow-none ${locked ? "ring-1 ring-red-300/20 bg-red-500/[0.04]" : ""}`}>
                              <CardContent className="p-3.5 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div>
                                    <div className="text-base font-black text-white">
                                      {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                    </div>
                                    <div className="mt-2 text-sm text-white/50">
                                      {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""} • {m.venue || "—"}
                                    </div>
                                    {locked ? (
                                      <div className="mt-3 rounded-xl border border-red-300/15 bg-red-500/[0.07] p-3 text-sm text-red-200">
                                        Ab Spielbeginn sind Zusagen & Aufstellung gesperrt.
                                      </div>
                                    ) : null}
                                  </div>

                                  <Button size="sm" onClick={() => openMatchDialog(m)} className="h-11 rounded-xl border border-orange-300/20 bg-orange-500 font-black text-white shadow-[0_0_24px_rgba(249,115,22,.12)] hover:bg-orange-400 active:scale-[0.985]">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Öffnen
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="completed">
                    <div className="grid gap-3">
                      {completedMatches.length === 0 ? (
                        <div className="text-sm text-white/40">Keine abgeschlossenen Spiele.</div>
                      ) : (
                        completedMatches
                          .slice()
                          .sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date))
                          .map((m) => (
                            <Card key={m.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] text-white transition active:scale-[0.994]">
                              <CardContent className="p-4 sm:p-5">
                                <div className="font-semibold text-white">
                                  {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                </div>
                                <div className="mt-2 text-sm text-white/40">
                                  {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""} • Ergebnis:{" "}
                                  {m.home_score ?? "-"}:{m.away_score ?? "-"}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-[#070a0f] p-0 text-white shadow-none sm:h-[min(720px,calc(100dvh-120px))] sm:w-[min(820px,calc(100vw-64px))] sm:max-w-[820px] sm:rounded-[24px] sm:border sm:border-white/[0.10] sm:shadow-[0_28px_100px_-40px_rgba(0,0,0,.98)]">
                {dialogMatch ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <DialogHeader className="relative shrink-0 border-b border-white/[0.08] bg-[#080b11] px-4 py-3 pr-12 text-left sm:px-5 sm:py-3.5">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(249,115,22,.12),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(14,165,233,.06),transparent_28%)]" />
                      <div className="relative min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border border-orange-300/15 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">Spieltag {dialogMatch.week_number}</Badge>
                          <Badge variant="outline" className="border-white/10 bg-white/[0.035] text-white/60">
                            {selectedLineupDartType === "edart" ? "E-Dart" : selectedLineupDartType === "steeldart" ? "Steeldart" : dialogMatch.dart_type}
                          </Badge>
                          {dialogIsLocked ? (
                            <Badge className="border border-red-300/15 bg-red-500/10 text-red-200 hover:bg-red-500/10">Gesperrt</Badge>
                          ) : lineupIsConfirmed && lineupHasEnoughStarters ? (
                            <Badge className="border border-emerald-300/15 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">Aufstellung bestätigt</Badge>
                          ) : lineupIsStale ? (
                            <Badge className="border border-amber-300/15 bg-amber-500/10 text-amber-200 hover:bg-amber-500/10">Bestätigung veraltet</Badge>
                          ) : (
                            <Badge className="border border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.035]">Aufstellung offen</Badge>
                          )}
                        </div>

                        <DialogTitle className="mt-2 truncate text-lg font-black tracking-tight text-white sm:text-xl">
                          {getTeamDisplayName(dialogMatch, true)} <span className="text-white/25">vs.</span> {getTeamDisplayName(dialogMatch, false)}
                        </DialogTitle>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/45 sm:text-sm">
                          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-orange-300/70" />{formatDate(dialogMatch.match_date)}</span>
                          {dialogMatch.match_time ? <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-orange-300/70" />{formatTime(dialogMatch.match_time)} Uhr</span> : null}
                          <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-orange-300/70" /><span className="max-w-[68vw] truncate sm:max-w-[420px]">{dialogMatch.venue || "Kein Spielort"}</span></span>
                        </div>

                        {myTeamsForMatch(dialogMatch).length > 1 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {myTeamsForMatch(dialogMatch).map((t) => (
                              <Button
                                key={t.team_id}
                                size="sm"
                                variant="outline"
                                className={`h-8 rounded-xl border-white/10 px-3 text-xs ${selectedTeamId === t.team_id ? "border-orange-300/25 bg-orange-500/15 text-orange-100" : "bg-white/[0.03] text-white/55"}`}
                                onClick={async () => {
                                  setSelectedTeamId(t.team_id)
                                  await loadMatchData(dialogMatch.id, t.team_id, dialogMatch)
                                }}
                              >
                                {t.teams?.name ?? "Team"} {leadershipIcon(t.role)}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </DialogHeader>

                    <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as "availability" | "lineup" | "chat")} className="flex min-h-0 flex-1 flex-col">
                      <div className="shrink-0 border-b border-white/[0.07] bg-[#070a0f] px-3 py-2 sm:px-4">
                        <TabsList className="grid h-11 w-full grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1">
                          <TabsTrigger value="availability" className="rounded-xl text-xs font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-sm">Zusage</TabsTrigger>
                          <TabsTrigger value="lineup" className="rounded-xl text-xs font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-sm">
                            Aufstellung <span className="ml-1 opacity-70">{startersCount}/{requiredStartersForDialog}</span>
                          </TabsTrigger>
                          <TabsTrigger value="chat" className="rounded-xl text-xs font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-sm">Chat</TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="p-3 pb-24 sm:p-4 sm:pb-5">
                          {dialogIsLocked ? (
                            <div className="mb-3 flex items-start gap-3 rounded-2xl border border-red-300/15 bg-red-500/[0.07] p-3 text-sm text-red-100">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                              <div><span className="font-black">Spiel bereits gestartet.</span> Zusage und Aufstellung sind gesperrt.</div>
                            </div>
                          ) : null}

                          {lineupError ? (
                            <div className="mb-3 rounded-2xl border border-red-300/15 bg-red-500/[0.07] p-3 text-sm font-semibold text-red-200">{lineupError}</div>
                          ) : null}

                          <TabsContent value="availability" className="m-0 space-y-3">
                            <Card className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.035] text-white shadow-none">
                              <CardHeader className="border-b border-white/[0.07] px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <CardTitle className="text-base font-black text-white">Deine Zusage</CardTitle>
                                  {statusBadge(myStatus as any)}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 p-4">
                                <div className="grid grid-cols-3 gap-2">
                                  <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("yes")} variant="outline" className={`h-12 rounded-xl border px-1 text-xs font-black sm:text-sm ${myStatus === "yes" ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/[0.025] text-white/55"}`}><CheckCircle2 className="mr-1 h-4 w-4" />Ja</Button>
                                  <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("maybe")} variant="outline" className={`h-12 rounded-xl border px-1 text-[11px] font-black sm:text-sm ${myStatus === "maybe" ? "border-amber-300/30 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/[0.025] text-white/55"}`}><HelpCircle className="mr-1 h-4 w-4 shrink-0" />Wenn nötig</Button>
                                  <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("no")} variant="outline" className={`h-12 rounded-xl border px-1 text-xs font-black sm:text-sm ${myStatus === "no" ? "border-red-300/30 bg-red-500/15 text-red-200" : "border-white/10 bg-white/[0.025] text-white/55"}`}><XCircle className="mr-1 h-4 w-4" />Nein</Button>
                                </div>

                                <div className="flex gap-2">
                                  <Textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} placeholder="Notiz, z.B. komme 5 Min. später" disabled={dialogIsLocked} className="min-h-[44px] resize-none rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/25" />
                                  <Button variant="outline" onClick={saveNote} disabled={dialogIsLocked} className="h-auto min-w-[84px] rounded-xl border-white/10 bg-white/[0.035] text-xs font-black text-white/65">Speichern</Button>
                                </div>
                              </CardContent>
                            </Card>

                            <div className="grid grid-cols-4 gap-2">
                              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.05] p-2.5 text-center"><div className="text-lg font-black text-emerald-300">{availabilitySummary.yes}</div><div className="text-[9px] font-black uppercase tracking-wide text-white/30">Ja</div></div>
                              <div className="rounded-2xl border border-amber-300/10 bg-amber-500/[0.05] p-2.5 text-center"><div className="text-lg font-black text-amber-300">{availabilitySummary.maybe}</div><div className="text-[9px] font-black uppercase tracking-wide text-white/30">Wenn nötig</div></div>
                              <div className="rounded-2xl border border-red-300/10 bg-red-500/[0.05] p-2.5 text-center"><div className="text-lg font-black text-red-300">{availabilitySummary.no}</div><div className="text-[9px] font-black uppercase tracking-wide text-white/30">Nein</div></div>
                              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2.5 text-center"><div className="text-lg font-black text-white/75">{availabilitySummary.none}</div><div className="text-[9px] font-black uppercase tracking-wide text-white/30">Offen</div></div>
                            </div>

                            {isCaptainOrCoForTeam && !dialogIsLocked ? (
                              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
                                <div><div className="text-sm font-black text-white">Offene Rückmeldungen</div><div className="text-xs text-white/35">{noAnswerPlayerIds.length} Spieler ohne Antwort</div></div>
                                <Button size="sm" variant="outline" onClick={sendAvailabilityReminderToAll} disabled={remindAllSending || noAnswerPlayerIds.length === 0} className="rounded-xl border-white/10 bg-white/[0.035] text-xs font-black text-white/65">
                                  {remindAllSending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Alle erinnern
                                </Button>
                              </div>
                            ) : null}

                            <Card className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] text-white shadow-none">
                              <CardHeader className="px-4 py-3"><CardTitle className="text-base font-black text-white">Team-Rückmeldungen</CardTitle></CardHeader>
                              <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
                                {displayPlayers.map((p) => {
                                  const a = availabilityByPlayer.get(p.id)
                                  const s = a?.status ?? "none"
                                  return (
                                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                                      <div className="min-w-0"><div className="truncate text-sm font-black text-white">{p.name}</div>{a?.note ? <div className="mt-0.5 truncate text-[11px] text-white/35">{a.note}</div> : null}</div>
                                      <div className="flex shrink-0 items-center gap-2">{statusBadge(s as any)}{isCaptainOrCoForTeam && !dialogIsLocked && s === "none" && p.id !== profile?.player_id ? <Button size="sm" variant="ghost" disabled={!!remindSending[p.id]} onClick={() => sendAvailabilityReminder(p.id)} className="h-8 rounded-lg px-2 text-[11px] font-black text-orange-300 hover:bg-orange-500/10">{remindSending[p.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Erinnern"}</Button> : null}</div>
                                    </div>
                                  )
                                })}
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="lineup" className="m-0 space-y-3">
                            <div className={`rounded-[22px] border p-4 ${lineupHasEnoughStarters ? "border-emerald-300/15 bg-emerald-500/[0.05]" : "border-amber-300/15 bg-amber-500/[0.05]"}`}>
                              <div className="flex items-center justify-between gap-4">
                                <div><div className="text-xs font-black uppercase tracking-[0.14em] text-white/30">Starter</div><div className="mt-1 text-sm font-bold text-white/65">{selectedLineupDartType === "edart" ? "E-Dart benötigt 4" : selectedLineupDartType === "steeldart" ? "Steeldart benötigt 3" : "Aufstellung"}</div></div>
                                <div className={`text-3xl font-black ${lineupHasEnoughStarters ? "text-emerald-300" : "text-amber-300"}`}>{startersCount}<span className="text-lg text-white/25">/{requiredStartersForDialog}</span></div>
                              </div>
                              {!lineupHasEnoughStarters ? <div className="mt-2 text-xs font-semibold text-amber-200/80">Es fehlen noch {Math.max(0, requiredStartersForDialog - startersCount)} Starter.</div> : null}
                            </div>

                            {isCaptainOrCoForTeam ? (
                              <Card className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] text-white shadow-none">
                                <CardHeader className="px-4 py-3"><CardTitle className="text-base font-black text-white">Spieler auswählen</CardTitle></CardHeader>
                                <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
                                  {displayPlayers.map((p) => {
                                    const entry = effectiveLineup.find((x) => x.player_id === p.id)
                                    const inLineup = Boolean(entry)
                                    const disabled = savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)
                                    return (
                                      <div key={p.id} className={`rounded-2xl border p-3 ${inLineup ? "border-orange-300/15 bg-orange-500/[0.05]" : "border-white/[0.07] bg-black/20"}`}>
                                        <div className="mb-2 flex items-center justify-between gap-2"><div className="min-w-0 truncate text-sm font-black text-white">{p.name}</div>{entry ? <Badge className={entry.is_substitute ? "bg-sky-500/10 text-sky-200" : "bg-orange-500/10 text-orange-200"}>{entry.is_substitute ? "Ersatz" : "Starter"}</Badge> : null}</div>
                                        {!inLineup ? (
                                          <div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" disabled={disabled} onClick={() => setLineupPlayer(p.id, "starter")} className="rounded-xl border-white/10 bg-white/[0.03] text-xs font-black text-white/65">Starter</Button><Button size="sm" variant="outline" disabled={disabled} onClick={() => setLineupPlayer(p.id, "substitute")} className="rounded-xl border-white/10 bg-white/[0.03] text-xs font-black text-white/65">Ersatz</Button></div>
                                        ) : (
                                          <div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" disabled={disabled} onClick={() => setLineupPlayer(p.id, "remove")} className="rounded-xl border-white/10 bg-white/[0.03] text-xs font-black text-red-200/80">Raus</Button><Button size="sm" variant="outline" disabled={disabled} onClick={() => setLineupPlayer(p.id, entry?.is_substitute ? "starter" : "substitute")} className="rounded-xl border-white/10 bg-white/[0.03] text-xs font-black text-white/65">{entry?.is_substitute ? "Als Starter" : "Als Ersatz"}</Button></div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </CardContent>
                              </Card>
                            ) : null}

                            <div className="grid gap-3 sm:grid-cols-2">
                              <section className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-3"><div className="mb-2 text-sm font-black text-white">Starter ({starters.length})</div><div className="space-y-2">{starters.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-white/30">Noch keine Starter</div> : starters.map((lp) => { const p = displayPlayers.find((x) => x.id === lp.player_id); return <div key={lp.player_id} className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm font-black text-white">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div> })}</div></section>
                              <section className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-3"><div className="mb-2 text-sm font-black text-white">Ersatz ({substitutes.length})</div><div className="space-y-2">{substitutes.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-white/30">Kein Ersatz</div> : substitutes.map((lp) => { const p = displayPlayers.find((x) => x.id === lp.player_id); return <div key={lp.player_id} className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm font-black text-white">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div> })}</div></section>
                            </div>

                            {isCaptainOrCoForTeam && !dialogIsLocked ? (
                              <div className="space-y-2 rounded-2xl border border-sky-300/10 bg-sky-500/[0.035] p-3">
                                <div>
                                  <div className="text-sm font-black text-white">Team-Chat</div>
                                  <div className="mt-1 text-xs font-medium leading-5 text-white/45">
                                    Veröffentlicht eine interaktive Spielkarte. Spieler können dort direkt zu-, absagen oder „wenn nötig“ wählen.
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={manuallyPublishMatchCard}
                                  disabled={publishingChatCard}
                                  className="h-11 w-full rounded-xl border-sky-300/15 bg-sky-500/[0.07] font-black text-sky-100 hover:bg-sky-500/[0.12]"
                                >
                                  {publishingChatCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                                  Im Team-Chat veröffentlichen
                                </Button>
                                {chatCardResult ? (
                                  <div className="text-center text-xs font-semibold text-white/55">{chatCardResult}</div>
                                ) : null}
                              </div>
                            ) : null}

                            {isCaptainOrCoForTeam && !dialogIsLocked && (lineupIsConfirmed || lineupIsStale) && !lineupEditMode ? <Button variant="outline" onClick={() => { setLineupEditMode(true); setDraftLineup(lineupPlayers); setDraftDirty(false); setLineupError(null) }} className="h-11 w-full rounded-xl border-white/10 bg-white/[0.035] font-black text-white/70">Aufstellung bearbeiten</Button> : null}

                            {isCaptainOrCoForTeam && !dialogIsLocked && lineupEditMode ? (
                              <div className="space-y-2 rounded-2xl border border-orange-300/10 bg-orange-500/[0.035] p-3">
                                <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => { setDraftLineup(lineupPlayers); setDraftDirty(false); setLineupError(null); setLineupEditMode(false) }} className="rounded-xl border-white/10 bg-white/[0.03] text-white/60">Abbrechen</Button><Button variant="outline" onClick={() => { setDraftLineup(lineupPlayers); setDraftDirty(false); setLineupError(null) }} className="rounded-xl border-white/10 bg-white/[0.03] text-white/60">Verwerfen</Button></div>
                                <Button
                                  onClick={confirmLineup}
                                  disabled={confirmingLineup || dialogIsLocked || !lineupHasEnoughStarters}
                                  className={`h-12 w-full rounded-xl border font-black transition-all duration-200 ${
                                    lineupHasEnoughStarters && !dialogIsLocked && !confirmingLineup
                                      ? "border-orange-200/70 bg-orange-500 text-white ring-2 ring-orange-400/35 shadow-[0_0_18px_rgba(249,115,22,.55),0_0_38px_rgba(249,115,22,.32),0_10px_28px_-12px_rgba(249,115,22,.95)] hover:bg-orange-400 hover:ring-orange-300/50 hover:shadow-[0_0_24px_rgba(249,115,22,.70),0_0_48px_rgba(249,115,22,.40),0_12px_30px_-12px_rgba(249,115,22,1)] active:scale-[0.985]"
                                      : "border-white/[0.06] bg-white/[0.045] text-white/25 shadow-none"
                                  }`}
                                >
                                  {confirmingLineup ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className={`mr-2 h-4 w-4 ${lineupHasEnoughStarters ? "drop-shadow-[0_0_7px_rgba(255,255,255,.55)]" : ""}`} />
                                  )}
                                  Änderungen bestätigen
                                </Button>
                              </div>
                            ) : null}

                            {!lineupEditMode && !lineupIsConfirmed && isCaptainOrCoForTeam && !dialogIsLocked ? <Button onClick={confirmLineup} disabled={confirmingLineup || !lineupHasEnoughStarters} className="h-12 w-full rounded-xl border border-orange-300/30 bg-orange-500 font-black text-white shadow-[0_0_24px_rgba(249,115,22,.28),0_8px_24px_-12px_rgba(249,115,22,.9)] transition hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,.38),0_10px_28px_-12px_rgba(249,115,22,1)] active:scale-[0.99] disabled:border-white/5 disabled:bg-white/[0.06] disabled:text-white/25 disabled:shadow-none">{confirmingLineup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Aufstellung bestätigen</Button> : null}
                          </TabsContent>

                          <TabsContent value="chat" className="m-0">
                            <Card className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] text-white shadow-none">
                              <CardHeader className="border-b border-white/[0.07] px-4 py-3"><CardTitle className="flex items-center gap-2 text-base font-black text-white"><MessageCircle className="h-4 w-4 text-orange-300" />Spiel-Chat</CardTitle></CardHeader>
                              <CardContent className="p-3 sm:p-4">
                                {!activeRoomId ? <div className="text-sm text-white/40">Kein Chat verfügbar.</div> : (
                                  <div className="space-y-3">
                                    <div className="max-h-[calc(100dvh-300px)] min-h-[280px] overflow-y-auto rounded-2xl border border-white/[0.07] bg-black/20 p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[46vh]">
                                      {chatLoading ? <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin text-orange-400" />Lade Chat…</div> : chatMessages.length === 0 ? <div className="flex min-h-[260px] items-center justify-center text-center text-sm text-white/30">Noch keine Nachrichten.</div> : <div className="space-y-3">{chatMessages.map((m) => { const isMine = m.user_id === profile?.id; const name = m.sender?.name ?? `User ${m.user_id.slice(0, 8)}`; const photo = m.sender?.photo_url ?? null; return <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}><Avatar className="h-8 w-8 shrink-0 border border-white/10"><AvatarImage src={photo || "/placeholder.svg"} alt={name} /><AvatarFallback className="bg-white/[0.05] text-xs text-white/60">{name.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="max-w-[82%]"><div className={`mb-1 text-[10px] font-bold text-white/30 ${isMine ? "text-right" : "text-left"}`}>{isMine ? "Du" : name}</div><div className={`break-words rounded-2xl px-3 py-2 text-sm ${isMine ? "rounded-tr-md bg-orange-500 text-white" : "rounded-tl-md border border-white/[0.06] bg-white/[0.045] text-white/80"}`}>{m.message}</div></div></div> })}<div ref={chatEndRef} /></div>}
                                    </div>
                                    <div className="flex gap-2"><Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Nachricht ans Team…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChatMessage() } }} disabled={chatSending} className="h-11 rounded-xl border-white/10 bg-black/25 text-white placeholder:text-white/25" /><Button onClick={sendChatMessage} disabled={!chatText.trim() || chatSending} className="h-11 w-11 shrink-0 rounded-xl bg-orange-500 p-0 text-white hover:bg-orange-400">{chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </div>
                      </div>
                    </Tabs>

                    <DialogFooter className="shrink-0 border-t border-white/[0.08] bg-[#080b11] px-3 py-2.5 sm:px-5">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="hidden text-xs font-semibold text-white/30 sm:block">{lineupIsConfirmed && lineupHasEnoughStarters ? "Aufstellung bestätigt." : isCaptainOrCoForTeam ? "Aufstellung vor Spielbeginn bestätigen." : "Zusage bis Spielbeginn änderbar."}</div>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="ml-auto h-9 rounded-xl border-white/10 bg-white/[0.035] px-5 font-black text-white/65">Schließen</Button>
                      </div>
                    </DialogFooter>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>

            <Dialog open={cooldownOpen} onOpenChange={setCooldownOpen}>
              <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base">Erinnerung bereits gesendet</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-white/55">
                  Dieser Spieler wurde bereits erinnert.
                  <br />
                  <span className="font-medium">
                    Bitte in {cooldownMinutes ?? 30} Minuten erneut versuchen.
                  </span>
                </div>
                <DialogFooter className="pt-4">
                  <Button onClick={() => setCooldownOpen(false)} className="bg-orange-600 hover:bg-orange-700">
                    OK
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </MembershipAccessGate>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default function MemberAvailabilityPage() {
  return (
    <Suspense fallback={null}>
      <MemberAvailabilityInner />
    </Suspense>
  )
}

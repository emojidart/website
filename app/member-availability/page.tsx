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
  ArrowLeft,
} from "lucide-react"

type AvailabilityStatus = "yes" | "maybe" | "no"

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
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.45)] sm:rounded-[26px]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
            <MessageCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">So funktioniert’s</div>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">Deine Verfügbarkeit</h2>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Gib pro Spiel kurz an, ob du dabei bist. Captain und Co-Captain sehen sofort, mit wem sie für die Aufstellung planen können.
        </p>
      </div>

      <div className="grid gap-2.5 p-3.5 sm:grid-cols-3 sm:p-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div className="text-sm font-black text-slate-950">Ja</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">Du bist sicher dabei.</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <div className="text-sm font-black text-slate-950">Nur wenn nötig</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">Du kannst einspringen, wenn jemand gebraucht wird.</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div className="text-sm font-black text-slate-950">Nein</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">Du bist für dieses Spiel nicht verfügbar.</div>
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
    const teamDartType = String(myTeam?.teams?.dart_type || "").toLowerCase()
    const matchDartType = String(match?.dart_type || "").toLowerCase()
    const dartType = teamDartType || matchDartType

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

  async function confirmLineup() {
    if (!dialogMatch || !selectedTeamId) return
    if (!isCaptainOrCoForTeam) return
    if (isMatchLocked(dialogMatch)) return
    if (!profile?.id) return

    setLineupError(null)

    const startersNow = effectiveLineup.filter((p) => !p.is_substitute).length
    if (startersNow === 0) {
      setLineupError("Du musst mindestens 1 Stammspieler auswählen, bevor du bestätigen kannst.")
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

      await fetch("/api/push/lineup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          team_id: selectedTeamId,
          match_id: dialogMatch.id,
          action: "confirmed",
          sender_profile_id: profile.id,
        }),
      })
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
      const res = await fetch("/api/push/availability-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
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
        const res = await fetch("/api/push/availability-reminder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
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

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
        <Header variant="app" title="Zusagen & Aufstellung" subtitle="Übersicht" backHref="/member-profile-app" />
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="flex flex-col items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-8 py-9 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)] sm:px-10">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-950">Aufstellung wird geladen</p>
              <p className="text-sm text-slate-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-950 font-sans flex flex-col overflow-x-hidden">
      <Header variant="app" title="Zusagen & Aufstellung" subtitle="Übersicht" backHref="/member-profile-app" />

      <main className="w-full pt-14 sm:pt-16">
        <MembershipAccessGate
          required={["edart_league", "steeldart_league"]}
          requireAll={false}
          title="Zusagen & Aufstellung nicht freigeschaltet"
          description="Für diesen Bereich brauchst du ein aktives E-Dart- oder Steeldart-Ligapaket bzw. eine gültige Testfreischaltung."
        >
          <div className="w-full max-w-none overflow-x-hidden px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
            <section className="relative mb-4 overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:mb-5 sm:rounded-[28px]">
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-orange-400">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/50">Planung für deine Ligaspiele</p>
                        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Zusagen & Aufstellung</h1>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/member-profile-app")}
                    className="h-11 rounded-xl border-white/10 bg-white/10 px-4 font-black text-white hover:bg-white/15 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück zum Profil
                  </Button>
                </div>
              </div>
            </section>

            <div className="mb-4 sm:mb-5">
              <InfoCallout />
            </div>

            <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 px-4 py-5">
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Spiele
                </CardTitle>
              </CardHeader>

              <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
                    <TabsTrigger value="upcoming" className="h-10 rounded-xl font-black">
                      Kommende ({upcomingMatches.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="h-10 rounded-xl font-black">
                      Abgeschlossen ({completedMatches.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming">
                    <div className="grid gap-3">
                      {upcomingMatches.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Keine kommenden Spiele.</div>
                      ) : (
                        upcomingMatches.map((m) => {
                          const locked = isMatchLocked(m)
                          return (
                            <Card key={m.id} className={`rounded-[20px] border border-slate-200 ${locked ? "ring-1 ring-red-200 bg-red-50/20" : ""}`}>
                              <CardContent className="p-3.5 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div>
                                    <div className="text-base font-black">
                                      {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600">
                                      {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""} • {m.venue || "—"}
                                    </div>
                                    {locked ? (
                                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                        Ab Spielbeginn sind Zusagen & Aufstellung gesperrt.
                                      </div>
                                    ) : null}
                                  </div>

                                  <Button size="sm" onClick={() => openMatchDialog(m)} className="h-11 rounded-xl bg-slate-950 font-black text-white">
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
                        <div className="text-sm text-muted-foreground">Keine abgeschlossenen Spiele.</div>
                      ) : (
                        completedMatches
                          .slice()
                          .sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date))
                          .map((m) => (
                            <Card key={m.id} className="rounded-[20px] border border-slate-200">
                              <CardContent className="p-4 sm:p-5">
                                <div className="font-semibold">
                                  {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                </div>
                                <div className="mt-2 text-sm text-slate-500">
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
              <DialogContent className="h-[calc(100dvh-12px)] w-[calc(100vw-12px)] max-w-none overflow-y-auto overflow-x-hidden rounded-[24px] border border-slate-200 bg-[#f6f7f9] p-0 sm:h-auto sm:max-h-[90vh] sm:w-[94vw] sm:max-w-[820px] lg:max-w-[980px]">
                <DialogHeader className="sticky top-0 z-20 border-b border-white/10 bg-slate-950 px-4 py-4 text-white">
                  <DialogTitle className="text-lg font-black text-white">Spiel – Zusage & Aufstellung</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-3 sm:p-5">
                  {dialogMatch ? (
                    <>
                      {dialogIsLocked ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                          <Clock className="inline h-4 w-4 mr-2" />
                          Ab Spielbeginn sind Zusage und Aufstellung gesperrt.
                        </div>
                      ) : null}

                      <Card className="rounded-[22px] border border-slate-200 bg-white">
                        <CardContent className="p-4">
                          <div className="text-lg font-black">
                            {getTeamDisplayName(dialogMatch, true)} vs {getTeamDisplayName(dialogMatch, false)}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {formatDate(dialogMatch.match_date)}{" "}
                            {dialogMatch.match_time ? `• ${formatTime(dialogMatch.match_time)}` : ""} • {dialogMatch.venue || "—"}
                          </div>

                          {myTeamsForMatch(dialogMatch).length > 1 ? (
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {myTeamsForMatch(dialogMatch).map((t) => (
                                <Button
                                  key={t.team_id}
                                  size="sm"
                                  variant={selectedTeamId === t.team_id ? "default" : "outline"}
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
                        </CardContent>
                      </Card>

                      <Card className="rounded-[22px] border border-slate-200 bg-white">
                        <CardHeader>
                          <CardTitle className="text-base">Deine Zusage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {lineupError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                              {lineupError}
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("yes")} variant={myStatus === "yes" ? "default" : "outline"}>
                              Ja
                            </Button>
                            <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("maybe")} variant={myStatus === "maybe" ? "default" : "outline"}>
                              Nur wenn Not am Mann
                            </Button>
                            <Button disabled={dialogIsLocked} onClick={() => setAvailabilityStatus("no")} variant={myStatus === "no" ? "default" : "outline"}>
                              Nein
                            </Button>
                          </div>

                          <Textarea
                            value={myNote}
                            onChange={(e) => setMyNote(e.target.value)}
                            placeholder="z.B. komme 5 min später"
                            disabled={dialogIsLocked}
                          />
                          <Button variant="secondary" onClick={saveNote} disabled={dialogIsLocked}>Notiz speichern</Button>

                          {isCaptainOrCoForTeam && !dialogIsLocked ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                              <div className="text-xs text-slate-600">
                                Offene Rückmeldungen: <span className="font-medium">{noAnswerPlayerIds.length}</span>
                              </div>
                              <Button
                                className="mt-2"
                                size="sm"
                                variant="outline"
                                onClick={sendAvailabilityReminderToAll}
                                disabled={remindAllSending || noAnswerPlayerIds.length === 0}
                              >
                                {remindAllSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Erinnern (alle ohne Antwort)
                              </Button>
                              {remindAllResult ? <span className="ml-2 text-xs">{remindAllResult}</span> : null}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[22px] border border-slate-200 bg-white">
                        <CardHeader><CardTitle className="text-base">Team-Zusagen</CardTitle></CardHeader>
                        <CardContent className="space-y-2.5">
                          {displayPlayers.map((p) => {
                            const a = availabilityByPlayer.get(p.id)
                            const s = a?.status ?? "none"
                            const entry = effectiveLineup.find((x) => x.player_id === p.id)
                            const inLineup = Boolean(entry)

                            return (
                              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="font-black">{p.name}</div>
                                  {a?.note ? <div className="text-xs text-slate-500 mt-1">{a.note}</div> : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {statusBadge(s as any)}

                                  {isCaptainOrCoForTeam && !dialogIsLocked && s === "none" && p.id !== profile?.player_id ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!!remindSending[p.id]}
                                      onClick={() => sendAvailabilityReminder(p.id)}
                                    >
                                      {remindSending[p.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erinnern"}
                                    </Button>
                                  ) : null}

                                  {remindOk[p.id] ? <span className="text-xs text-green-700">gesendet ✅</span> : null}

                                  {isCaptainOrCoForTeam ? (
                                    <div className="flex flex-wrap gap-1">
                                      {!inLineup ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)}
                                            onClick={() => setLineupPlayer(p.id, "starter")}
                                          >
                                            Fix
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)}
                                            onClick={() => setLineupPlayer(p.id, "substitute")}
                                          >
                                            Ersatz
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)}
                                            onClick={() => setLineupPlayer(p.id, "remove")}
                                          >
                                            Raus
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)}
                                            onClick={() => setLineupPlayer(p.id, entry?.is_substitute ? "starter" : "substitute")}
                                          >
                                            {entry?.is_substitute ? "Als Fix" : "Als Ersatz"}
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[22px] border border-slate-200 bg-white">
                        <CardHeader className="bg-slate-950 text-white">
                          <CardTitle className="text-xl font-black text-white">Aufstellung</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <section className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-3">
                              <div className="font-black mb-2">Stammspieler ({starters.length})</div>
                              <div className="grid gap-2">
                                {starters.map((lp) => {
                                  const p = displayPlayers.find((x) => x.id === lp.player_id)
                                  return (
                                    <div key={lp.player_id} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                                      <div className="font-black">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            </section>

                            <section className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-3">
                              <div className="font-black mb-2">Ersatzspieler ({substitutes.length})</div>
                              <div className="grid gap-2">
                                {substitutes.map((lp) => {
                                  const p = displayPlayers.find((x) => x.id === lp.player_id)
                                  return (
                                    <div key={lp.player_id} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                                      <div className="font-black">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            </section>
                          </div>

                          {isCaptainOrCoForTeam && !dialogIsLocked && (lineupIsConfirmed || lineupIsStale) && !lineupEditMode ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setLineupEditMode(true)
                                setDraftLineup(lineupPlayers)
                                setDraftDirty(false)
                                setLineupError(null)
                              }}
                            >
                              Bearbeiten
                            </Button>
                          ) : null}

                          {isCaptainOrCoForTeam && !dialogIsLocked && lineupEditMode ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDraftLineup(lineupPlayers)
                                  setDraftDirty(false)
                                  setLineupError(null)
                                  setLineupEditMode(false)
                                }}
                              >
                                Abbrechen
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDraftLineup(lineupPlayers)
                                  setDraftDirty(false)
                                  setLineupError(null)
                                }}
                              >
                                Verwerfen
                              </Button>

                              <Button
                                onClick={confirmLineup}
                                disabled={confirmingLineup || dialogIsLocked || startersCount === 0}
                                className="col-span-2 bg-orange-500 text-white hover:bg-orange-600"
                              >
                                {confirmingLineup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Änderungen bestätigen
                              </Button>
                            </div>
                          ) : null}

                          {!lineupEditMode && !lineupIsConfirmed && isCaptainOrCoForTeam && !dialogIsLocked ? (
                            <Button
                              onClick={confirmLineup}
                              disabled={confirmingLineup || startersCount === 0}
                              className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                              Aufstellung bestätigen
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[22px] border border-slate-200 bg-white">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-orange-600" />
                            Spiel-Chat
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!activeRoomId ? (
                            <div className="text-sm text-muted-foreground">Kein Chat verfügbar.</div>
                          ) : (
                            <>
                              <ScrollArea className="h-[320px] rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                                {chatLoading ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                                    Lade Chat…
                                  </div>
                                ) : chatMessages.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">Noch keine Nachrichten.</div>
                                ) : (
                                  <div className="space-y-3">
                                    {chatMessages.map((m) => {
                                      const isMine = m.user_id === profile?.id
                                      const name = m.sender?.name ?? `User ${m.user_id.slice(0, 8)}`
                                      const photo = m.sender?.photo_url ?? null

                                      return (
                                        <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage src={photo || "/placeholder.svg"} alt={name} />
                                            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <div className="max-w-[80%]">
                                            <div className="text-xs font-medium mb-1">{isMine ? "Du" : name}</div>
                                            <div className={`rounded-2xl px-3 py-2 text-sm break-words ${isMine ? "bg-orange-600 text-white" : "bg-muted"}`}>
                                              {m.message}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                    <div ref={chatEndRef} />
                                  </div>
                                )}
                              </ScrollArea>

                              <div className="flex gap-2">
                                <Input
                                  value={chatText}
                                  onChange={(e) => setChatText(e.target.value)}
                                  placeholder="Nachricht ans Team…"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault()
                                      void sendChatMessage()
                                    }
                                  }}
                                  disabled={chatSending}
                                />
                                <Button onClick={sendChatMessage} disabled={!chatText.trim() || chatSending}>
                                  {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>

                <DialogFooter className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Schließen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={cooldownOpen} onOpenChange={setCooldownOpen}>
              <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base">Erinnerung bereits gesendet</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-slate-600">
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

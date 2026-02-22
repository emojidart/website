"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
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
  Search,
  Filter,
  Shield,
  Sparkles,
} from "lucide-react"

type AvailabilityStatus = "yes" | "maybe" | "no"

interface Team {
  id: string
  name: string
  logo_url: string | null
}

interface OpponentTeam {
  id: string
  name: string
  venue?: string | null
  venue_name?: string | null
  captain_phone?: string | null
}

interface Season {
  id: string
  name: string
  type: string
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
  season?: Season | null
}

type TeamPlayer = {
  id: string
  name: string
  photo_url: string | null
}

type AvailabilityRow = {
  player_id: string
  status: AvailabilityStatus
  note: string | null
  updated_at: string
  club_players?: { id: string; name: string; photo_url: string | null } | null
}

type LineupRow = {
  id: string
  player_id: string
  position: number
  is_substitute: boolean
  club_players?: { id: string; name: string; photo_url: string | null } | null
}

type LineupHeader = {
  status: "draft" | "confirmed" | string
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
  const cleaned = input.replace(/[^\d+]/g, "")
  return cleaned
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

function getMatchStartDateTime(match: Match) {
  const t = (match.match_time ? match.match_time.slice(0, 5) : "23:59") + ":00"
  const dt = new Date(`${match.match_date}T${t}`)
  return dt
}

function isMatchLocked(match: Match) {
  if (match.status === "completed") return true
  const dt = getMatchStartDateTime(match)
  const ms = dt.getTime()
  if (!Number.isFinite(ms)) return false
  return Date.now() > ms
}

function computeLineupState(h: LineupHeader | null) {
  // Wenn kein Header existiert -> "none" (keine Aufstellung / nicht initialisiert)
  if (!h) return { kind: "none" as const, confirmed: false, stale: false }

  const confirmed =
    h.status === "confirmed" &&
    h.confirmed_version != null &&
    h.current_version != null &&
    h.confirmed_version === h.current_version

  const stale =
    h.status === "confirmed" &&
    h.confirmed_version != null &&
    h.current_version != null &&
    h.confirmed_version < h.current_version

  if (confirmed) return { kind: "confirmed" as const, confirmed: true, stale: false }
  if (stale) return { kind: "stale" as const, confirmed: true, stale: true }
  return { kind: "draft" as const, confirmed: false, stale: false }
}

/**
 * ✅ ADMIN-SEITE (angepasst):
 * - Lädt zusätzlich match_lineup_headers (Status/Versioning)
 * - Zeigt pro Match Badge: Bestätigt / Geändert / Entwurf / Keine Aufstellung
 * - Dialog: zeigt Status + sperrt nach Spielbeginn
 */
export default function AdminAvailabilityPage() {



async function confirmLineupAsAdmin() {
  if (!dialogMatch) return
  if (!selectedTeamId) return
  if (!isAdmin) return
  if (!myProfileId) return

  if (isMatchLocked(dialogMatch)) {
    setConfirmMsg({ type: "err", text: "Gesperrt – nach Spielbeginn nicht mehr änderbar." })
    return
  }

  if (confirmingLineup) return

  setConfirmingLineup(true)
  setConfirmMsg(null)

  try {
   const { data: hdr } = await supabase
  .from("match_lineup_headers")
  .select("current_version")
  .eq("match_id", dialogMatch.id)
  .eq("team_id", selectedTeamId)
  .maybeSingle()

const currentVersion = (hdr as any)?.current_version ?? 0

const { error } = await supabase
  .from("match_lineup_headers")
  .update({
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    confirmed_by: myProfileId,
    confirmed_version: currentVersion,
  })
  .eq("match_id", dialogMatch.id)
  .eq("team_id", selectedTeamId)

    if (error) throw error

    await loadMatchData(dialogMatch.id, selectedTeamId)

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
        sender_profile_id: myProfileId,
      }),
    })

    setConfirmMsg({ type: "ok", text: "Gespeichert ✅" })
    setTimeout(() => setConfirmMsg(null), 2000)
  } catch (e: any) {
    console.error("confirmLineupAsAdmin error:", e)
    setConfirmMsg({ type: "err", text: `Fehler ❌ ${e?.message ?? ""}` })
  } finally {
    setConfirmingLineup(false)
  }
}
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)

  // Admin / Board
  const [isAdmin, setIsAdmin] = useState(false)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)

  // Base data
  const [teams, setTeams] = useState<Team[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  // ✅ NEW: Header-Map für schnelle Anzeige pro Match
  const [lineupHeadersByKey, setLineupHeadersByKey] = useState<Map<string, LineupHeader | null>>(new Map())

  // UI state
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming")
  const [teamQuery, setTeamQuery] = useState("")
  const [matchQuery, setMatchQuery] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMatch, setDialogMatch] = useState<Match | null>(null)

  // Match detail state (selected team + match)
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [lineupPlayers, setLineupPlayers] = useState<LineupRow[]>([])
  const [lineupHeader, setLineupHeader] = useState<LineupHeader | null>(null)
  const [savingLineup, setSavingLineup] = useState(false)
  const [confirmingLineup, setConfirmingLineup] = useState(false)
const [confirmMsg, setConfirmMsg] = useState<null | { type: "ok" | "err"; text: string }>(null)

  // Team roles (Captain/Co)
  const [teamRolesByPlayer, setTeamRolesByPlayer] = useState<Map<string, string | null>>(new Map())

  // Chat (room_id = team_id)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatText, setChatText] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

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
      await bootstrap()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function bootstrap() {
  // 1) profile (inkl. is_admin!)
  const { data: profileData, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id,user_id,player_id,is_admin")
    .eq("user_id", session!.user.id)
    .maybeSingle()

  if (profileErr) {
    console.error("user_profiles error:", profileErr)
  }

  const profId = (profileData as any)?.id ?? null
  const playerId = (profileData as any)?.player_id ?? null
  const isAdminFlag = Boolean((profileData as any)?.is_admin ?? false)

  setMyProfileId(profId)
  setMyPlayerId(playerId)
  setIsAdmin(isAdminFlag)

  // 3) teams + opponent teams
  const [teamsRes, oppRes] = await Promise.all([
    supabase.from("teams").select("id,name,logo_url").order("name", { ascending: true }),
    supabase.from("opponent_teams").select("*"),
  ])

  if (teamsRes.error) console.error("teams error:", teamsRes.error)
  if (oppRes.error) console.error("opponent_teams error:", oppRes.error)

  const teamRows = ((teamsRes.data as any[]) || []) as Team[]
  const oppRows = ((oppRes.data as any[]) || []) as OpponentTeam[]

  setTeams(teamRows)
  setOpponentTeams(oppRows)

  // selectedTeamId initial setzen (nur wenn noch leer)
  if (!selectedTeamId && teamRows.length > 0) {
    setSelectedTeamId(teamRows[0].id)
  }

  // matches
  const matchesRes = await supabase
    .from("matches")
    .select(
      `
        *,
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name),
        season:seasons(id, name, type)
      `
    )
    .order("match_date", { ascending: true })

  if (matchesRes.error) {
    console.error("matches error:", matchesRes.error)
    setMatches([])
    return
  }

  const enriched =
    ((matchesRes.data as any) || []).map((m: any) => {
      const homeOpp = m.home_opponent_team_id ? oppRows.find((x: any) => x.id === m.home_opponent_team_id) : null
      const awayOpp = m.away_opponent_team_id ? oppRows.find((x: any) => x.id === m.away_opponent_team_id) : null
      return { ...m, home_opponent_team: homeOpp, away_opponent_team: awayOpp }
    }) as Match[]

  setMatches(enriched)
}

  const upcomingMatches = useMemo(() => matches.filter((m) => m.status !== "completed"), [matches])
  const completedMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches])

  const filteredTeams = useMemo(() => {
    const q = teamQuery.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => t.name.toLowerCase().includes(q))
  }, [teams, teamQuery])

  const matchesForSelectedTeam = useMemo(() => {
    if (!selectedTeamId) return []
    const base = (activeTab === "upcoming" ? upcomingMatches : completedMatches).filter(
      (m) => m.home_team_id === selectedTeamId || m.away_team_id === selectedTeamId
    )

    const q = matchQuery.trim().toLowerCase()
    if (!q) return base

    return base.filter((m) => {
      const title = `${getTeamDisplayName(m, true)} vs ${getTeamDisplayName(m, false)}`.toLowerCase()
      const date = `${formatDate(m.match_date)} ${formatTime(m.match_time)}`.toLowerCase()
      const venue = String(m.venue || "").toLowerCase()
      return title.includes(q) || date.includes(q) || venue.includes(q)
    })
  }, [selectedTeamId, activeTab, upcomingMatches, completedMatches, matchQuery])

  // ✅ Header-Lookup pro Match+Team
  function headerKey(matchId: string, teamId: string) {
    return `${matchId}__${teamId}`
  }

 
  useEffect(() => {
    if (!selectedTeamId) return
    const ids = matchesForSelectedTeam.map((m) => m.id)
    if (ids.length === 0) {
      setLineupHeadersByKey(new Map())
      return
    }

    ;(async () => {
      const { data } = await supabase
        .from("match_lineup_headers")
        .select("match_id,team_id,status,current_version,confirmed_version,confirmed_at,confirmed_by")
        .eq("team_id", selectedTeamId)
        .in("match_id", ids)

      const map = new Map<string, LineupHeader | null>()

      
      for (const mid of ids) map.set(headerKey(mid, selectedTeamId), null)

      ;((data as any[]) || []).forEach((r) => {
        map.set(headerKey(r.match_id, r.team_id), {
          status: r.status,
          current_version: r.current_version,
          confirmed_version: r.confirmed_version,
          confirmed_at: r.confirmed_at ?? null,
          confirmed_by: r.confirmed_by ?? null,
        })
      })

      setLineupHeadersByKey(map)
    })()
    
  }, [selectedTeamId, matchesForSelectedTeam])

  const starters = useMemo(
    () => lineupPlayers.filter((p) => !p.is_substitute).slice().sort((a, b) => a.position - b.position),
    [lineupPlayers]
  )
  const substitutes = useMemo(() => lineupPlayers.filter((p) => p.is_substitute), [lineupPlayers])

  const availabilityByPlayer = useMemo(() => {
  const m = new Map<string, AvailabilityRow>()
  for (const a of availability) {
    if (!m.has(a.player_id)) {
      m.set(a.player_id, a) // nur erster Eintrag = neuester
    }
  }
  return m
}, [availability])

  const counts = useMemo(() => {
    const all = teamPlayers.length
    let yes = 0,
      maybe = 0,
      no = 0,
      none = 0

    for (const p of teamPlayers) {
      const s = availabilityByPlayer.get(p.id)?.status ?? "none"
      if (s === "yes") yes++
      else if (s === "maybe") maybe++
      else if (s === "no") no++
      else none++
    }

    return { all, yes, maybe, no, none }
  }, [teamPlayers, availabilityByPlayer])

  async function openMatchDialog(match: Match) {
    if (!selectedTeamId) return
    setDialogMatch(match)
    setIsDialogOpen(true)
    await loadMatchData(match.id, selectedTeamId)
    loadTeamChat(selectedTeamId)
  }

  async function loadMatchData(matchId: string, teamId: string) {
    
    const { data: tm, error: tmErr } = await supabase
  .from("team_members")
  .select(`player_id, role, club_players:club_players!team_members_player_id_fkey(id, name, photo_url)`)
  .eq("team_id", teamId)

if (tmErr) console.error("team_members error:", tmErr)

    const players: TeamPlayer[] = ((tm as any) || []).map((r: any) => r.club_players).filter(Boolean)
    setTeamPlayers(players)

    const roleMap = new Map<string, string | null>()
    ;((tm as any[]) || []).forEach((r) => {
      if (r?.player_id) roleMap.set(r.player_id, r.role ?? null)
    })
    setTeamRolesByPlayer(roleMap)

    // Availability
    const { data: av } = await supabase
  .from("match_availability")
  .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
  .eq("match_id", matchId)
  .eq("team_id", teamId)
  .order("updated_at", { ascending: false }) // WICHTIG!

    setAvailability((((av as any) || []) as AvailabilityRow[]) || [])

    // Lineup
    const { data: lu } = await supabase
      .from("match_lineups")
      .select("id,player_id,position,is_substitute, club_players:club_players(id,name,photo_url)")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .order("position", { ascending: true })

    setLineupPlayers(((lu as any) || []) as LineupRow[])

   
    const { data: lh } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version,confirmed_at,confirmed_by")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .maybeSingle()

    setLineupHeader((lh as any) ?? null)
  }

  function subscribeToTeamChat(teamId: string) {
    const channel = supabase
      .channel(`admin_team_chat_${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${teamId}`,
        },
        async (payload) => {
          const incoming = payload.new as any

          const { data: prof } = await supabase.from("user_profiles").select("player_id").eq("id", incoming.user_id).maybeSingle()

          let sender: { name: string; photo_url: string | null } | null = null
          const playerId = (prof as any)?.player_id
          if (playerId) {
            const { data: cp } = await supabase.from("club_players").select("name,photo_url").eq("id", playerId).maybeSingle()
            if (cp) sender = { name: (cp as any).name, photo_url: (cp as any).photo_url ?? null }
          }

          setChatMessages((prev) => [...prev, { ...incoming, sender }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function loadTeamChat(teamId: string) {
    if (!teamId) return
    setChatLoading(true)
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,user_id,room_id,message,created_at")
        .eq("room_id", teamId)
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

      setChatMessages(
        rows.map((r) => {
          const playerId = profileToPlayer.get(r.user_id)
          const sender = playerId ? playerMap.get(playerId) ?? null : null
          return { ...r, sender }
        }) as any
      )
    } catch (e) {
      console.error("loadTeamChat error", e)
      setChatMessages([])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    if (!isDialogOpen) return
    if (!selectedTeamId) return
    const unsub = subscribeToTeamChat(selectedTeamId)
    return () => unsub()
   
  }, [isDialogOpen, selectedTeamId])

  async function sendTeamMessage() {
    if (!selectedTeamId) return
    if (!myProfileId) return
    const text = chatText.trim()
    if (!text || chatSending) return

    setChatSending(true)
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: myProfileId,
        room_id: selectedTeamId,
        message: text,
      })
      if (error) throw error
      setChatText("")
    } catch (e) {
      console.error("sendTeamMessage error", e)
    } finally {
      setChatSending(false)
    }
  }

  async function reorderLineup(matchId: string, teamId: string) {
    const { data } = await supabase
      .from("match_lineups")
      .select("id,player_id,position,is_substitute")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .order("position", { ascending: true })

    const rows = (data as any[]) || []
    const starters = rows.filter((r) => !r.is_substitute)

    for (let i = 0; i < starters.length; i++) {
      const row = starters[i]
      const newPos = i + 1
      if (row.position !== newPos) {
        await supabase.from("match_lineups").update({ position: newPos }).eq("id", row.id)
      }
    }

    const subs = rows.filter((r) => r.is_substitute && r.position !== 0)
    for (const s of subs) {
      await supabase.from("match_lineups").update({ position: 0 }).eq("id", s.id)
    }
  }

  async function setLineupPlayer(playerId: string, mode: "remove" | "starter" | "substitute") {
    if (!dialogMatch || !selectedTeamId) return
    if (!isAdmin) return

    
    

    const matchId = dialogMatch.id
    const teamId = selectedTeamId
    const existing = lineupPlayers.find((p) => p.player_id === playerId)

    setSavingLineup(true)
    try {
      if (mode === "remove") {
        if (existing) {
          await supabase.from("match_lineups").delete().eq("id", existing.id)
          await reorderLineup(matchId, teamId)
        }
      }

      if (mode === "substitute") {
        if (existing) {
          await supabase.from("match_lineups").update({ is_substitute: true, position: 0 }).eq("id", existing.id)
          await reorderLineup(matchId, teamId)
        } else {
          await supabase.from("match_lineups").insert({
            match_id: matchId,
            team_id: teamId,
            player_id: playerId,
            position: 0,
            is_substitute: true,
          })
        }
      }

      if (mode === "starter") {
        if (existing) {
          if (existing.is_substitute) {
            const nextPos = lineupPlayers.filter((p) => !p.is_substitute).length + 1
            await supabase.from("match_lineups").update({ is_substitute: false, position: nextPos }).eq("id", existing.id)
          }
        } else {
          const nextPos = lineupPlayers.filter((p) => !p.is_substitute).length + 1
          await supabase.from("match_lineups").insert({
            match_id: matchId,
            team_id: teamId,
            player_id: playerId,
            position: nextPos,
            is_substitute: false,
          })
        }
        await reorderLineup(matchId, teamId)
      }

      await loadMatchData(matchId, teamId)

      // ✅ HeaderMap für Liste refreshen (best-effort)
      const { data: lh } = await supabase
        .from("match_lineup_headers")
        .select("status,current_version,confirmed_version,confirmed_at,confirmed_by")
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .maybeSingle()

      setLineupHeadersByKey((prev) => {
        const next = new Map(prev)
        next.set(headerKey(matchId, teamId), (lh as any) ?? null)
        return next
      })
    } finally {
      setSavingLineup(false)
    }
  }
  
  

  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) ?? null, [teams, selectedTeamId])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Admin-Übersicht…</span>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/member-profile-app")}
              className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-orange-600" />
                Admin: Zusagen & Aufstellung
              </h1>
              <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                <Badge className={isAdmin ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800"}>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" /> Admin/Board
                    </span>
                  ) : (
                    "Nur Ansicht"
                  )}
                </Badge>
                <span className="hidden sm:inline">•</span>
                <span className="text-xs sm:text-sm">Team wählen → Match öffnen → Zusagen/Lineup inkl. Status sehen.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-orange-600" />
              Übersicht
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Teams */}
          <Card className="lg:col-span-4 border-0 shadow-xl bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Teams
              </CardTitle>

              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} placeholder="Team suchen…" className="pl-9" />
                </div>
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => setTeamQuery("")} title="Filter löschen">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <ScrollArea className="h-[42vh] lg:h-[56vh] pr-2">
                <div className="grid gap-2">
                  {filteredTeams.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Keine Teams gefunden.</div>
                  ) : (
                    filteredTeams.map((t) => {
                      const active = t.id === selectedTeamId
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTeamId(t.id)}
                          className={[
                            "w-full text-left rounded-2xl border p-3 transition",
                            active ? "border-orange-200 bg-orange-50" : "bg-white hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={t.logo_url || "/placeholder.svg"} alt={t.name} />
                              <AvatarFallback className="bg-orange-100 text-orange-700">{t.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">{t.name}</div>
                              {/* Team-ID ausgeblendet */}
                            </div>

                            {active ? <Badge className="bg-orange-600 text-white">aktiv</Badge> : <Badge variant="outline">wählen</Badge>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* RIGHT: Matches */}
          <Card className="lg:col-span-8 border-0 shadow-xl bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Spiele {selectedTeam ? <span className="text-gray-500 font-normal">({selectedTeam.name})</span> : null}
              </CardTitle>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={matchQuery} onChange={(e) => setMatchQuery(e.target.value)} placeholder="Match suchen (Datum, Gegner, Ort)…" className="pl-9" />
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="upcoming">Kommend</TabsTrigger>
                    <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {!selectedTeamId ? (
                <div className="text-sm text-muted-foreground">Bitte links ein Team auswählen.</div>
              ) : (
                <ScrollArea className="h-[42vh] lg:h-[56vh] pr-2">
                  <div className="grid gap-3">
                    {matchesForSelectedTeam.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine Spiele gefunden.</div>
                    ) : (
                      matchesForSelectedTeam
                        .slice()
                        .sort((a, b) => {
                          if (activeTab === "upcoming") return +new Date(a.match_date) - +new Date(b.match_date)
                          return +new Date(b.match_date) - +new Date(a.match_date)
                        })
                        .map((m) => {
                          const opp = getOpponentForMatch(m)
                          const h = selectedTeamId ? lineupHeadersByKey.get(headerKey(m.id, selectedTeamId)) ?? null : null
                          const st = computeLineupState(h)

                          const lineupBadge =
                            st.kind === "confirmed" ? (
                              <Badge className="bg-green-600 text-white">Bestätigt</Badge>
                            ) : st.kind === "stale" ? (
                              <Badge className="bg-yellow-600 text-white">Geändert</Badge>
                            ) : st.kind === "draft" ? (
                              <Badge variant="outline">Entwurf</Badge>
                            ) : (
                              <Badge className="bg-gray-200 text-gray-800">Keine Aufstellung</Badge>
                            )

                          const locked = isMatchLocked(m)

                          return (
                            <Card key={m.id} className="border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="font-semibold text-base md:text-lg truncate">
                                        {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                      </div>
                                      {lineupBadge}
                                      {locked ? (
                                        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                                          Gesperrt
                                        </Badge>
                                      ) : null}
                                    </div>

                                    <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                                      <span className="inline-flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-orange-600" />
                                        {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-orange-600" />
                                        {m.venue || "—"}
                                      </span>
                                      {activeTab === "completed" ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Badge variant="outline">Ergebnis: {m.home_score ?? "-"}:{m.away_score ?? "-"}</Badge>
                                        </span>
                                      ) : null}
                                    </div>

                                    {opp?.venue_name || opp?.venue ? (
                                      <div className="mt-2 text-xs text-gray-500">
                                        Gegner-Lokal: <span className="font-medium text-gray-700">{opp.venue_name || "—"}</span>{" "}
                                        {opp.venue ? <span className="text-gray-500">• {opp.venue}</span> : null}
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-col gap-2 flex-shrink-0">
                                    <Button onClick={() => openMatchDialog(m)} className="bg-orange-600 hover:bg-orange-700 rounded-xl">
                                      <Eye className="h-4 w-4 mr-2" />
                                      Öffnen
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={(v) => setIsDialogOpen(v)}>
                <DialogContent
                  className="
                    w-[96vw]
                    max-w-[96vw]
                    sm:max-w-[820px]
                    max-h-[82vh]
                    overflow-y-auto
                    overflow-x-hidden
                    rounded-2xl
                    p-3
                  "
                >
                  <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-orange-600" />
                      Admin – Matchdetails
                    </DialogTitle>
                  </DialogHeader>

                  {!dialogMatch || !selectedTeamId ? (
                    <div className="text-sm text-muted-foreground">Kein Match ausgewählt.</div>
                  ) : (
                    <div className="space-y-4">
                      {/* Match header */}
                      <Card className="border bg-white shadow-sm rounded-2xl">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-base md:text-lg">
                                {getTeamDisplayName(dialogMatch, true)} vs {getTeamDisplayName(dialogMatch, false)}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formatDate(dialogMatch.match_date)}{" "}
                                {dialogMatch.match_time ? `• ${formatTime(dialogMatch.match_time)}` : ""} • {dialogMatch.venue || "—"}
                              </div>

                              {isMatchLocked(dialogMatch) ? (
                                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium">Gesperrt</div>
                                    <div className="text-xs text-red-700 mt-0.5">
                                      Aufstellung kann nach Spielbeginn nicht mehr geändert werden.
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {(() => {
                                const opp = getOpponentForMatch(dialogMatch)
                                if (!opp) return null
                                const phone = opp.captain_phone
                                const tel = phone ? normalizePhoneForLinks(phone) : null
                                const wa = phone ? whatsappUrlFromPhone(phone) : null
                                const hasAny = !!(opp.venue_name || opp.venue || phone)
                                if (!hasAny) return null

                                return (
                                  <div className="mt-3 rounded-2xl border bg-gray-50/80 p-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>Gegner-Infos</span>
                                    </div>

                                    <div className="grid gap-1 text-sm">
                                      <div className="flex gap-3">
                                        <span className="w-20 shrink-0 text-gray-500">Lokal</span>
                                        <span className="font-medium">{opp.venue_name || "—"}</span>
                                      </div>
                                      <div className="flex gap-3">
                                        <span className="w-20 shrink-0 text-gray-500">Ort</span>
                                        <span>{opp.venue || "—"}</span>
                                      </div>

                                      {phone && tel ? (
                                        <div className="flex gap-3 items-center pt-1">
                                          <span className="w-20 shrink-0 text-gray-500">Kapitän</span>
                                          <a href={`tel:${tel}`} className="font-medium underline underline-offset-4">
                                            {phone}
                                          </a>
                                        </div>
                                      ) : null}
                                    </div>

                                    {phone && wa ? (
                                      <div className="mt-3">
                                        <Button asChild size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 shadow-sm">
                                          <a href={wa} target="_blank" rel="noreferrer">
                                            Kapitän via WhatsApp
                                          </a>
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                )
                              })()}
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              <Badge variant="outline" className="bg-white">
                                Team: <span className="ml-1 font-medium">{selectedTeam?.name ?? "—"}</span>
                              </Badge>

                              <Badge className={isAdmin ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800"}>
                                {isAdmin ? "Bearbeiten möglich" : "Nur Ansicht"}
                              </Badge>

                              {/* ✅ Lineup Status Badge */}
                              {(() => {
                                const st = computeLineupState(lineupHeader)
                                if (st.kind === "confirmed") return <Badge className="bg-green-600 text-white">Bestätigt</Badge>
                                if (st.kind === "stale") return <Badge className="bg-yellow-600 text-white">Geändert (neu bestätigen)</Badge>
                                if (st.kind === "draft") return <Badge variant="outline">Entwurf</Badge>
                                return <Badge className="bg-gray-200 text-gray-800">Keine Aufstellung</Badge>
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stats */}
                      <Card className="border bg-white shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Zusagen-Übersicht
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="rounded-xl border bg-white p-3">
                              <div className="text-xs text-gray-500">Spieler</div>
                              <div className="text-lg font-bold">{counts.all}</div>
                            </div>
                            <div className="rounded-xl border bg-green-50 p-3">
                              <div className="text-xs text-gray-600">Ja</div>
                              <div className="text-lg font-bold text-green-700">{counts.yes}</div>
                            </div>
                            <div className="rounded-xl border bg-yellow-50 p-3">
                              <div className="text-xs text-gray-600">Vielleicht</div>
                              <div className="text-lg font-bold text-yellow-700">{counts.maybe}</div>
                            </div>
                            <div className="rounded-xl border bg-red-50 p-3">
                              <div className="text-xs text-gray-600">Nein</div>
                              <div className="text-lg font-bold text-red-700">{counts.no}</div>
                            </div>
                            <div className="rounded-xl border bg-gray-50 p-3">
                              <div className="text-xs text-gray-600">Keine Antwort</div>
                              <div className="text-lg font-bold text-gray-800">{counts.none}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Players + Availability + Lineup controls */}
                      <Card className="border bg-white shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-orange-600" />
                            Spieler & Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {teamPlayers.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Keine Teamspieler gefunden.</div>
                          ) : (
                            teamPlayers.map((p) => {
                              const a = availabilityByPlayer.get(p.id)
                              const s = a?.status ?? "none"
                              const note = a?.note ?? null

                              const entry = lineupPlayers.find((x) => x.player_id === p.id)
                              const inLineup = Boolean(entry)

                              const role = teamRolesByPlayer.get(p.id) ?? null

                              const locked = dialogMatch ? isMatchLocked(dialogMatch) : false

                              return (
                                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                      <AvatarImage src={p.photo_url || "/placeholder.svg"} alt={p.name} />
                                      <AvatarFallback className="bg-orange-100 text-orange-700">
                                        {p.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0">
                                      <div className="font-medium truncate flex items-center gap-2">
                                        <span className="truncate">{p.name}</span>
                                        {leadershipIcon(role)}
                                      </div>
                                      {note ? <div className="text-xs text-gray-500 truncate">{note}</div> : <div className="text-xs text-gray-400">—</div>}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 justify-end">
                                    {statusBadge(s as any)}

                                    {isAdmin ? (
                                      <div className="flex flex-wrap gap-1">
                                        {!inLineup ? (
                                          <>
                                            <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "starter")}>
                                              Fix
                                            </Button>
                                            <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "substitute")}>
                                              Ersatz
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "remove")}>
                                              Raus
                                            </Button>
                                            {entry?.is_substitute ? (
                                              <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "starter")}>
                                                Als Fix
                                              </Button>
                                            ) : (
                                              <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "substitute")}>
                                                Als Ersatz
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        keine Rechte
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </CardContent>
                      </Card>

                      {/* Lineup view */}
<Card className="border bg-white shadow-sm rounded-2xl">
  <CardHeader className="pb-2">
    <CardTitle className="text-base flex items-center gap-2">
      Aufstellung
      {(() => {
        const st = computeLineupState(lineupHeader)
        if (st.kind === "confirmed") return <Badge className="bg-green-600 text-white">Bestätigt</Badge>
        if (st.kind === "stale") return <Badge className="bg-yellow-600 text-white">Geändert</Badge>
        if (st.kind === "draft") return <Badge variant="outline">Entwurf</Badge>
        return <Badge className="bg-gray-200 text-gray-800">Keine Aufstellung</Badge>
      })()}
    </CardTitle>
  </CardHeader>

  <CardContent className="pt-0 space-y-3">
    {isAdmin && dialogMatch && selectedTeamId ? (
      <div className="space-y-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={confirmingLineup} className="bg-orange-600 hover:bg-orange-700 w-full">
              {confirmingLineup ? "Speichere..." : "Aufstellung bestätigen"}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aufstellung bestätigen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dadurch wird die aktuelle Aufstellung als <b>bestätigt</b> markiert.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLineupAsAdmin}>Bestätigen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {confirmMsg ? (
          <div className={`text-sm ${confirmMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
            {confirmMsg.text}
          </div>
        ) : null}
      </div>
    ) : null}

    {starters.length === 0 ? (
      <div className="text-sm text-muted-foreground">Noch keine Fixspieler ausgewählt.</div>
    ) : (
      <div className="grid gap-2">
        {starters.map((lp) => {
          const p = teamPlayers.find((x) => x.id === lp.player_id)
          return (
            <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-10 justify-center">
                  {lp.position}
                </Badge>
                <div className="font-medium">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
              </div>
            </div>
          )
        })}
      </div>
    )}

    {substitutes.length > 0 ? (
      <>
        <div className="text-xs text-gray-500">Ersatzspieler</div>
        <div className="grid gap-2">
          {substitutes.map((lp) => {
            const p = teamPlayers.find((x) => x.id === lp.player_id)
            return (
              <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3 opacity-90">
                <div className="font-medium">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                <Badge variant="outline">Ersatz</Badge>
              </div>
            )
          })}
        </div>
      </>
    ) : null}

    {!isAdmin ? (
      <div className="text-xs text-gray-500">
        Hinweis: Aufstellung ändern geht hier nur als Admin/Board (oder wenn du die RLS so freigibst).
      </div>
    ) : null}
  </CardContent>
</Card>

                      {/* Team chat */}
                      <Card className="border bg-white shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-orange-600" />
                            Team-Chat
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-xl border overflow-hidden">
                            <ScrollArea className="h-64 sm:h-72 p-3">
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
                                    const isMine = m.user_id === myProfileId
                                    const name = m.sender?.name ?? `User ${m.user_id.slice(0, 8)}`
                                    const photo = m.sender?.photo_url ?? null

                                    return (
                                      <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                          <AvatarImage src={photo || "/placeholder.svg"} alt={name} />
                                          <AvatarFallback className="bg-orange-100 text-orange-700">
                                            {name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>

                                        <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium">{isMine ? "Du" : name}</span>
                                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {new Date(m.created_at).toLocaleTimeString("de-DE", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </span>
                                          </div>

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
                          </div>

                          <div className="flex gap-2">
                            <Input
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              placeholder="Admin-Nachricht ans Team…"
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  sendTeamMessage()
                                }
                              }}
                              disabled={chatSending}
                            />
                            <Button
                              onClick={sendTeamMessage}
                              disabled={!chatText.trim() || chatSending || !myProfileId}
                              className="bg-orange-600 hover:bg-orange-700 px-3"
                              title={!myProfileId ? "Kein user_profiles.id gefunden" : undefined}
                            >
                              {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>

                          {!myProfileId ? (
                            <div className="text-xs text-red-600">
                              Hinweis: user_profiles.id nicht gefunden → Chat-Senden geht nicht. (Prüf: user_profiles für diesen User existiert.)
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <DialogFooter className="pt-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setIsDialogOpen(false)
                        setDialogMatch(null)
                        setChatMessages([])
                        setAvailability([])
                        setLineupPlayers([])
                        setTeamPlayers([])
                        setLineupHeader(null)
                      }}
                    >
                      Schließen
                    </Button>

                    {dialogMatch && selectedTeamId ? (
                      <Button
                        onClick={async () => {
                          await loadMatchData(dialogMatch.id, selectedTeamId)
						  
						  
						 					  
						  
						  
						  
						  
						  
						  
						  
						  
						  // ✅ Push senden (wie Member)
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
    sender_profile_id: myProfileId,
  }),
})
                          await loadTeamChat(selectedTeamId)

                          // Liste-Header aktualisieren
                          const { data: lh } = await supabase
                            .from("match_lineup_headers")
                            .select("status,current_version,confirmed_version,confirmed_at,confirmed_by")
                            .eq("match_id", dialogMatch.id)
                            .eq("team_id", selectedTeamId)
                            .maybeSingle()

                          setLineupHeadersByKey((prev) => {
                            const next = new Map(prev)
                            next.set(headerKey(dialogMatch.id, selectedTeamId), (lh as any) ?? null)
                            return next
                          })
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Aktualisieren
                      </Button>
                    ) : null}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
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
  teams: { id: string; name: string; logo_url: string | null } | null
}

interface OpponentTeam {
  id: string
  name: string
  // venue = Adresse
  venue?: string | null
  // venue_name = Lokalname / Spielstätte
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
  // Keep + and digits only
  const cleaned = input.replace(/[^\d+]/g, "")
  return cleaned
}

function whatsappUrlFromPhone(phone: string) {
  // wa.me expects international number digits only (no +)
  let p = normalizePhoneForLinks(phone).trim()
  if (p.startsWith("+")) p = p.slice(1)
  if (p.startsWith("00")) p = p.slice(2)
  return `https://wa.me/${p}`
}

function getOpponentForMatch(match: Match) {
  // Prefer the opponent side (if any)
  if (match.home_team_type === "opponent") return match.home_opponent_team ?? null
  if (match.away_team_type === "opponent") return match.away_opponent_team ?? null
  return null
}

function getMatchStartDateTime(match: Match) {
  // If no time exists, treat as end of day so it doesn't lock too early
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

function InfoCallout() {
  return (
    <div className="rounded-2xl border bg-gradient-to-r from-orange-50 via-white to-indigo-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-white/70 p-2 ring-1 ring-black/5">
          <MessageCircle className="h-5 w-5 text-orange-600" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">Kurz erklärt</h2>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Bitte gib pro Spiel deine Verfügbarkeit an. So können der Captain und der Co-Captain die Aufstellung zuverlässig planen.
          </p>

          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                <span className="font-medium">Ja</span> – sicher dabei
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-yellow-600" />
              <span>
                <span className="font-medium">Nur wenn Not am Mann</span> – nur im Engpass einplanen
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>
                <span className="font-medium">Nein</span> – nicht verfügbar
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white/70 p-3 ring-1 ring-black/5 text-sm text-gray-700">
            <span className="font-medium">Captain/Co-Captain</span> stellt daraus die <span className="font-medium">Fix- und Ersatzspieler</span>{" "}
            zusammen.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MemberAvailabilityPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([])

  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming")

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMatch, setDialogMatch] = useState<Match | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Match data (selected team)
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])

  const [myStatus, setMyStatus] = useState<AvailabilityStatus>("maybe")
  const [myNote, setMyNote] = useState("")

  // Lineup (public.match_lineups)
  const [lineupPlayers, setLineupPlayers] = useState<LineupRow[]>([])
  const [savingLineup, setSavingLineup] = useState(false)
  
  // ✅ Draft: Änderungen erst lokal, nicht sofort DB
const [draftLineup, setDraftLineup] = useState<LineupRow[]>([])
const [draftDirty, setDraftDirty] = useState(false)



  // ✅ UI: bestätigte Aufstellung ist standardmäßig "gesperrt" (read-only)
const [lineupEditMode, setLineupEditMode] = useState(false)

// ✅ Welche Aufstellung soll UI anzeigen? (Draft im Edit-Mode, sonst DB)
const effectiveLineup = useMemo(() => {
  return lineupEditMode ? draftLineup : lineupPlayers
}, [lineupEditMode, draftLineup, lineupPlayers])



  
  const [lineupHeader, setLineupHeader] = useState<LineupHeader | null>(null)
  const [confirmingLineup, setConfirmingLineup] = useState(false)
  // ✅ UI Fehler anzeigen (idiotensicher)
const [lineupError, setLineupError] = useState<string | null>(null)
  


// ✅ Push "changed" nur 1x senden pro Bearbeiten-Session
const [lineupChangedNotified, setLineupChangedNotified] = useState(false)



   
  type ChatMode = "match" | "team"
  const [chatMode, setChatMode] = useState<ChatMode>("match") // default: Spiel-Chat

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatText, setChatText] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ✅ je nach Modus: Match-Room oder Team-Room
  const activeRoomId = useMemo(() => {
    if (!dialogMatch) return null
    if (chatMode === "match") return dialogMatch.id // Spiel-Chat
    return selectedTeamId // Team-Chat (wie bisher)
  }, [dialogMatch, chatMode, selectedTeamId])


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
    ;(async () => {
      await fetchMatches()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, teamMemberships])

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
        .select(`id, team_id, role, teams (id, name, logo_url)`)
        .eq("player_id", profileData.player_id)
        .is("left_at", null) // ✅ nur aktive Mitgliedschaften

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
        .select(
          `
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `
        )
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .order("match_date", { ascending: true }),
      supabase.from("opponent_teams").select("*"),
    ])

    const opp = (oppRes.data as any) || []
    setOpponentTeams(opp)

    const enriched =
      ((matchesRes.data as any) || []).map((m: any) => {
        const homeOpp = m.home_opponent_team_id ? opp.find((x: any) => x.id === m.home_opponent_team_id) : null
        const awayOpp = m.away_opponent_team_id ? opp.find((x: any) => x.id === m.away_opponent_team_id) : null
        return { ...m, home_opponent_team: homeOpp, away_opponent_team: awayOpp }
      }) as Match[]

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
    if (ids.has(match.home_team_id)) list.push(teamMemberships.find((t) => t.team_id === match.home_team_id)!)
    if (ids.has(match.away_team_id)) list.push(teamMemberships.find((t) => t.team_id === match.away_team_id)!)
    return list.filter(Boolean)
  }

  async function openMatchDialog(match: Match) {
    setDialogMatch(match)
	
	    setChatMode("match") 


    const myTeams = myTeamsForMatch(match)
    const defaultTeamId = myTeams[0]?.team_id ?? null
    setSelectedTeamId(defaultTeamId)

    setIsDialogOpen(true)
	
	setLineupEditMode(false)
setLineupChangedNotified(false)


    if (defaultTeamId) {
      await loadMatchData(match.id, defaultTeamId)
    } else {
      setTeamPlayers([])
      setAvailability([])
      setLineupPlayers([])
	  setLineupHeader(null)

    }
  }

    async function loadChat(roomId: string) {
    if (!roomId) return
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

      // IMPORTANT: chat_messages.user_id is a FK to user_profiles.id in your DB.
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
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const incoming = payload.new as any

          // best effort sender info (incoming.user_id = user_profiles.id)
          const { data: prof } = await supabase
            .from("user_profiles")
            .select("player_id")
            .eq("id", incoming.user_id)
            .maybeSingle()

          let sender: { name: string; photo_url: string | null } | null = null
          const playerId = (prof as any)?.player_id
          if (playerId) {
            const { data: cp } = await supabase.from("club_players").select("name,photo_url").eq("id", playerId).maybeSingle()
            if (cp) sender = { name: (cp as any).name, photo_url: (cp as any).photo_url ?? null }
          }

          setChatMessages((prev) => [
            ...prev,
            {
              ...incoming,
              sender,
            },
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

    async function sendChatMessage() {
    if (!dialogMatch) return
    if (!profile?.id) return
    if (!activeRoomId) return

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
      setChatText("")
    } catch (e) {
      console.error("sendChatMessage error", e)
    } finally {
      setChatSending(false)
    }
  }


    useEffect(() => {
    if (!isDialogOpen) return
    if (!activeRoomId) return

    loadChat(activeRoomId)
    const unsub = subscribeToChat(activeRoomId)

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, activeRoomId])


  async function loadMatchData(matchId: string, teamId: string) {
    if (!profile?.player_id) return

    // Teamspieler
    const { data: tm } = await supabase
      .from("team_members")
      .select(`player_id, club_players:club_players(id, name, photo_url)`)
      .eq("team_id", teamId)
      .is("left_at", null)

    const players: TeamPlayer[] = ((tm as any) || []).map((r: any) => r.club_players).filter(Boolean)
    setTeamPlayers(players)

    // Availability
    const { data: av } = await supabase
      .from("match_availability")
      .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
      .eq("match_id", matchId)
      .eq("team_id", teamId)

    const rows = ((av as any) || []) as AvailabilityRow[]
    setAvailability(rows)

    const mine = rows.find((x) => x.player_id === profile.player_id)
    if (mine) {
      setMyStatus(mine.status)
      setMyNote(mine.note ?? "")
    } else {
      setMyStatus("maybe")
      setMyNote("")
    }

    // Lineup
   const { data: lu } = await supabase
  .from("match_lineups")
  .select("id,player_id,position,is_substitute, club_players:club_players(id,name,photo_url)")
  .eq("match_id", matchId)
  .eq("team_id", teamId)
  .order("position", { ascending: true })

   const loaded = (((lu as any) || []) as LineupRow[])
setLineupPlayers(loaded)

// ✅ Draft initial = aktueller Stand aus DB
setDraftLineup(loaded)
setDraftDirty(false)


// Lineup Header (Status: draft/confirmed + versioning)
const { data: lh } = await supabase
  .from("match_lineup_headers")
  .select("status,current_version,confirmed_version,confirmed_at,confirmed_by")
  .eq("match_id", matchId)
  .eq("team_id", teamId)
  .maybeSingle()

setLineupHeader((lh as any) ?? null)

// ✅ Wenn bestätigt -> standardmäßig sperren (EditMode AUS)
const isConfirmed =
  (lh as any)?.status === "confirmed" &&
  (lh as any)?.confirmed_version != null &&
  (lh as any)?.confirmed_version === (lh as any)?.current_version

setLineupEditMode(!isConfirmed)
setLineupChangedNotified(false)


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

  const dialogIsLocked = useMemo(() => {
    if (!dialogMatch) return false
    return isMatchLocked(dialogMatch)
  }, [dialogMatch])

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
      { onConflict: "match_id,player_id" }
    )

    await loadMatchData(dialogMatch.id, selectedTeamId)
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
      { onConflict: "match_id,player_id" }
    )

    await loadMatchData(dialogMatch.id, selectedTeamId)
  }

  async function reorderLineup(matchId: string, teamId: string) {
    // Re-order ONLY starters (is_substitute=false) to positions 1..n. Substitutes keep position=0.
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

    // ensure subs have position 0
    const subs = rows.filter((r) => r.is_substitute && r.position !== 0)
    for (const s of subs) {
      await supabase.from("match_lineups").update({ position: 0 }).eq("id", s.id)
    }
  }


function setLineupPlayer(playerId: string, mode: "remove" | "starter" | "substitute") {
  if (!dialogMatch || !selectedTeamId) return
  if (!isCaptainOrCoForTeam) return
  if (isMatchLocked(dialogMatch)) return
  if (lineupIsConfirmed && !lineupEditMode) return

  setDraftLineup((prev) => {
    const next = [...prev]
    const idx = next.findIndex((p) => p.player_id === playerId)
    const startersCount = next.filter((p) => !p.is_substitute).length

    if (mode === "remove") {
      if (idx !== -1) next.splice(idx, 1)
    }

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

    // 1) Alles löschen
    await supabase.from("match_lineups").delete().eq("match_id", matchId).eq("team_id", teamId)

    // 2) Draft neu einfügen
    const rowsToInsert = draftLineup.map((p) => ({
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

    // 3) Reload
    await loadMatchData(matchId, teamId)

    setDraftDirty(false)
    setLineupEditMode(true)
  } catch (e) {
    console.error("saveDraftLineup error", e)
  } finally {
    setSavingLineup(false)
  }
}







  
  
  
async function confirmLineup() {
  if (!dialogMatch || !selectedTeamId) return
  if (!isCaptainOrCoForTeam) return
  if (isMatchLocked(dialogMatch)) return
  if (!profile?.id) return

  // ✅ Reset alte Fehlermeldung
  setLineupError(null)

  // ✅ Wenn keine Stammspieler ausgewählt sind → nicht bestätigen
  // (wir nutzen effectiveLineup = Draft wenn Editmode, sonst DB)
  const startersNow = effectiveLineup.filter((p) => !p.is_substitute).length
  if (startersNow === 0) {
    setLineupError("Du musst mindestens 1 Stammspieler auswählen, bevor du bestätigen kannst.")
    return
  }

  setConfirmingLineup(true)
  try {
    // ✅ IDIOTENSICHER: Wenn im Edit-Mode und Draft geändert → AUTOMATISCH vorher speichern
    if (lineupEditMode && draftDirty) {
      const matchId = dialogMatch.id
      const teamId = selectedTeamId

      // 1) Alles löschen
      await supabase.from("match_lineups").delete().eq("match_id", matchId).eq("team_id", teamId)

      // 2) Draft neu einfügen
      const rowsToInsert = draftLineup.map((p) => ({
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

      // 3) Draft ist jetzt gespeichert
      setDraftDirty(false)
    }

    // ✅ Jetzt erst bestätigen (Header-Versionen)
    const { error } = await supabase.rpc("confirm_lineup", {
      p_match_id: dialogMatch.id,
      p_team_id: selectedTeamId,
    })
    if (error) throw error

    // ✅ Reload
    await loadMatchData(dialogMatch.id, selectedTeamId)

    // ✅ Nach Bestätigung wieder sperren
    setLineupEditMode(false)
    setLineupChangedNotified(false)
    setLineupError(null)

    // Push
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
  } catch (e) {
    console.error("confirmLineup error", e)
    setLineupError("Fehler beim Bestätigen. Bitte nochmal versuchen.")
  } finally {
    setConfirmingLineup(false)
  }
}





  const upcomingMatches = matches.filter((m) => m.status !== "completed")
  const completedMatches = matches.filter((m) => m.status === "completed")

  const starters = useMemo(
  () => effectiveLineup.filter((p) => !p.is_substitute).slice().sort((a, b) => a.position - b.position),
  [effectiveLineup]
)

const substitutes = useMemo(
  () => effectiveLineup.filter((p) => p.is_substitute),
  [effectiveLineup]
)


const startersCount = useMemo(() => {
  return effectiveLineup.filter((p) => !p.is_substitute).length
}, [effectiveLineup])


  
  const lineupIsConfirmed =
  lineupHeader?.status === "confirmed" &&
  lineupHeader.confirmed_version !== null &&
  lineupHeader.confirmed_version === lineupHeader.current_version

const lineupIsStale =
  lineupHeader?.status === "confirmed" &&
  lineupHeader.confirmed_version !== null &&
  lineupHeader.confirmed_version < lineupHeader.current_version


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl overflow-x-hidden">
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Zusagen.</span>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl overflow-x-hidden">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => router.push("/member-profile-app")}
            className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-orange-600" />
            Zusagen & Aufstellung
          </h1>
          <div className="mt-4">
            <InfoCallout />
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Calendar className="h-6 w-6 text-orange-600" />
              Spiele
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-auto gap-1 p-1">
                <TabsTrigger value="upcoming" className="py-2">
                  Kommende ({upcomingMatches.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="py-2">
                  Abgeschlossen ({completedMatches.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                <div className="grid gap-3">
                  {upcomingMatches.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Keine kommenden Spiele.</div>
                  ) : (
                    upcomingMatches.map((m) => {
                      const myTeams = myTeamsForMatch(m)
                      const locked = isMatchLocked(m)

                      return (
                        <Card
                          key={m.id}
                          className={`border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden ${
                            locked ? "ring-1 ring-red-200 bg-red-50/20" : ""
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                              <div className="min-w-0 w-full sm:w-auto text-center sm:text-left">
                                <div className="font-semibold text-base md:text-lg truncate">
                                  {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                </div>

                                {locked && (
                                  <div className="mt-2 flex justify-center sm:justify-start">
                                    <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                                      Gesperrt (Spielzeit überschritten)
                                    </Badge>
                                  </div>
                                )}

                                <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-orange-600" />
                                    {m.venue || "—"}
                                  </span>
                                </div>

                                {locked && (
                                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2 text-left">
                                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="font-medium">Panel gesperrt</div>
                                      <div className="text-xs text-red-700 mt-0.5">
                                        Zusagen & Aufstellung sind ab Spielbeginn gesperrt. Du kannst alles weiterhin ansehen.
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {(() => {
                                  const opp = getOpponentForMatch(m)
                                  if (!opp) return null

                                  const phone = opp.captain_phone
                                  const tel = phone ? normalizePhoneForLinks(phone) : null
                                  const wa = phone ? whatsappUrlFromPhone(phone) : null

                                  const hasAny = !!(opp.venue_name || opp.venue || phone)
                                  if (!hasAny) return null

                                  return (
                                    <div className="mt-3 space-y-2">
                                      <div className="rounded-xl border bg-gray-50/80 p-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                          <MapPin className="h-3.5 w-3.5" />
                                          <span>Gegner-Lokal</span>
                                        </div>

                                        <div className="grid gap-1 text-sm">
                                          <div className="flex gap-3">
                                            <span className="w-16 shrink-0 text-gray-500">Lokal</span>
                                            <span className="font-medium">{opp.venue_name || "—"}</span>
                                          </div>
                                          <div className="flex gap-3">
                                            <span className="w-16 shrink-0 text-gray-500">Ort</span>
                                            <span className="min-w-0 break-words">{opp.venue || "—"}</span>
                                          </div>

                                          {phone && (
                                            <div className="flex gap-3 items-center pt-1">
                                              <span className="w-16 shrink-0 text-gray-500">Kapitän</span>
                                              <a href={`tel:${tel}`} className="font-medium underline underline-offset-4">
                                                {phone}
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {phone && wa && (
                                        <div className="flex justify-center sm:justify-start">
                                          <Button
                                            asChild
                                            size="sm"
                                            className="w-full sm:w-auto rounded-xl bg-green-600 hover:bg-green-700 shadow-sm"
                                          >
                                            <a href={wa} target="_blank" rel="noreferrer">
                                              Kapitän kontaktieren (Gegner)
                                            </a>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                                {myTeams.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                                    {myTeams.map((t) => (
                                      <Badge key={t.team_id} variant="outline" className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {t.teams?.name ?? "Mein Team"} {leadershipIcon(t.role)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                                <Button size="sm" onClick={() => openMatchDialog(m)} className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
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
                        <Card key={m.id} className="border shadow-sm opacity-90 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="font-semibold">
                              {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
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

        <Dialog open={isDialogOpen} onOpenChange={(v) => setIsDialogOpen(v)}>
          <DialogContent
            className="
              w-[96vw]
              max-w-[96vw]
              sm:max-w-[520px]
              max-h-[75vh]
              overflow-y-auto
              overflow-x-hidden
              rounded-2xl
              p-3
            "
          >
            <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
              <DialogTitle>Spiel – Zusage & Aufstellung</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 min-w-0">
              {!dialogMatch ? null : (
                <>
                  {dialogIsLocked && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium">Gesperrt (Spielzeit überschritten)</div>
                        <div className="text-xs text-red-700 mt-0.5">
                          Ab Spielbeginn sind <span className="font-medium">Zusage</span> und <span className="font-medium">Aufstellung</span> gesperrt.
                        </div>
                      </div>
                    </div>
                  )}

                  <Card className="border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden">
                    <CardContent className="p-4">
                      <div className="font-semibold text-base">
                        {getTeamDisplayName(dialogMatch, true)} vs {getTeamDisplayName(dialogMatch, false)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(dialogMatch.match_date)}{" "}
                        {dialogMatch.match_time ? `• ${formatTime(dialogMatch.match_time)}` : ""} • {dialogMatch.venue || "—"}
                      </div>

                      {(() => {
                        const opp = getOpponentForMatch(dialogMatch)
                        if (!opp) return null
                        const phone = opp.captain_phone
                        const tel = phone ? normalizePhoneForLinks(phone) : null
                        const hasAny = !!(opp.venue_name || opp.venue || phone)
                        if (!hasAny) return null

                        return (
                          <div className="mt-3 rounded-2xl border bg-gray-50/80 p-4">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Gegner-Lokal</span>
                            </div>

                            <div className="grid gap-1 text-sm">
                              <div className="flex gap-3">
                                <span className="w-16 shrink-0 text-gray-500">Lokal</span>
                                <span className="font-medium">{opp.venue_name || "—"}</span>
                              </div>
                              <div className="flex gap-3">
                                <span className="w-16 shrink-0 text-gray-500">Ort</span>
                                <span className="min-w-0 break-words">{opp.venue || "—"}</span>
                              </div>

                              {phone && tel && (
                                <div className="flex gap-3 items-center pt-1">
                                  <span className="w-16 shrink-0 text-gray-500">Kapitän</span>
                                  <a href={`tel:${tel}`} className="font-medium underline underline-offset-4">
                                    {phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {myTeamsForMatch(dialogMatch).length > 1 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Team auswählen</div>
                          <div className="flex flex-wrap gap-2">
                            {myTeamsForMatch(dialogMatch).map((t) => (
                              <Button
                                key={t.team_id}
                                size="sm"
                                variant={selectedTeamId === t.team_id ? "default" : "outline"}
                                onClick={async () => {
                                  setSelectedTeamId(t.team_id)
                                  await loadMatchData(dialogMatch.id, t.team_id)
                                }}
                              >
                                {t.teams?.name ?? "Team"} {leadershipIcon(t.role)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={`border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden ${dialogIsLocked ? "opacity-80" : ""}`}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between gap-2">
  <span className="inline-flex items-center gap-2">
    <MessageCircle className="h-4 w-4 text-orange-600" />
    Chat
  </span>

  <div className="flex gap-1">
    <Button
      size="sm"
      variant={chatMode === "match" ? "default" : "outline"}
      onClick={() => setChatMode("match")}
    >
      Spiel
    </Button>

    <Button
      size="sm"
      variant={chatMode === "team" ? "default" : "outline"}
      onClick={() => setChatMode("team")}
      disabled={!selectedTeamId}
    >
      Team
    </Button>
  </div>
</CardTitle>

                    </CardHeader>
                    <CardContent className="space-y-3">
					{lineupError ? (
  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    {lineupError}
  </div>
) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={myStatus === "yes" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("yes")}
                          className={myStatus === "yes" ? "bg-green-600 hover:bg-green-700" : ""}
                          disabled={dialogIsLocked}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ja
                        </Button>

                        <Button
                          variant={myStatus === "maybe" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("maybe")}
                          className={myStatus === "maybe" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                          disabled={dialogIsLocked}
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Nur wenn Not am Mann
                        </Button>

                        <Button
                          variant={myStatus === "no" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("no")}
                          className={myStatus === "no" ? "bg-red-600 hover:bg-red-700" : ""}
                          disabled={dialogIsLocked}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Nein
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Notiz (optional)</div>
                        <Textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} placeholder="z.B. komme 5 min später" disabled={dialogIsLocked} />
                        <Button variant="secondary" onClick={saveNote} disabled={dialogIsLocked}>
                          Notiz speichern
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden ${dialogIsLocked ? "opacity-90" : ""}`}>
                    <CardHeader>
                      <CardTitle className="text-base">Team-Zusagen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {displayPlayers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Aktuell keine Rückmeldungen (Zu- oder Absagen).</div>
                      ) : (
                        displayPlayers.map((p) => {
                          const a = availabilityByPlayer.get(p.id)
                          const s = a?.status ?? "none"
                          const entry = effectiveLineup.find((x) => x.player_id === p.id)

                          const inLineup = Boolean(entry)

                          return (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 gap-3 min-w-0 overflow-hidden">
                              <div className="min-w-0 w-full sm:w-auto text-center sm:text-left">
                                <div className="font-medium truncate">{p.name}</div>
                                {a?.note ? <div className="text-xs text-gray-500 truncate">{a.note}</div> : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                {statusBadge(s as any)}

                                {isCaptainOrCoForTeam && (
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {!inLineup ? (
                                      <>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || (lineupIsConfirmed && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "starter")}>
                                          Fix
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || (lineupIsConfirmed && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "substitute")}>
                                          Ersatz
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || (lineupIsConfirmed && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "remove")}>
                                          Raus
                                        </Button>
                                        {entry?.is_substitute ? (
                                          <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || (lineupIsConfirmed && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "starter")}>
                                            Als Fix
                                          </Button>
                                        ) : (
                                          <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || (lineupIsConfirmed && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "substitute")}>
                                            Als Ersatz
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </CardContent>
                  </Card>

                  
				  <Card className={`border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden ${dialogIsLocked ? "opacity-90" : ""}`}>
  <CardHeader>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <CardTitle className="text-base flex items-center gap-2">
          Aufstellung
          {lineupIsConfirmed ? (
            <Badge className="bg-green-600 text-white">Bestätigt</Badge>
          ) : lineupIsStale ? (
            <Badge className="bg-yellow-600 text-white">Geändert (neu bestätigen)</Badge>
          ) : (
            <Badge variant="outline">Entwurf</Badge>
          )}

          {dialogIsLocked && (
            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
              Gesperrt
            </Badge>
          )}
        </CardTitle>

        {}
        {dialogMatch ? (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatDate(dialogMatch.match_date)}
                {dialogMatch.match_time ? ` • ${formatTime(dialogMatch.match_time)} Uhr` : ""}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Spieltag {dialogMatch.week_number}
              </Badge>
            </div>

            <div className="text-sm text-gray-700 font-medium break-words">
              {getTeamDisplayName(dialogMatch, true)} <span className="text-gray-400">vs</span> {getTeamDisplayName(dialogMatch, false)}
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ Rechts oben: Bearbeiten/gesperrt */}
      {isCaptainOrCoForTeam && !dialogIsLocked && lineupIsConfirmed && !lineupEditMode ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
  setLineupEditMode(true)
  setLineupChangedNotified(false)

  
  setDraftLineup(lineupPlayers)
  setDraftDirty(false)
}}

          className="shrink-0"
        >
          Bearbeiten
        </Button>
      ) : null}
    </div>
  </CardHeader>

  <CardContent className="space-y-3">
    {/* ✅ Stammspieler */}
    <div>
      <div className="text-xs text-gray-500 mb-2">Stamm</div>

      {starters.length === 0 ? (
        <div className="text-sm text-muted-foreground">Noch keine Stammspieler ausgewählt.</div>
      ) : (
        <div className="grid gap-2">
          {starters.map((lp) => {
            const p = displayPlayers.find((x) => x.id === lp.player_id)
            return (
              <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3 min-w-0 overflow-hidden">
                <div className="font-medium truncate">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">Stamm</Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* ✅ Ersatzspieler */}
    <div>
      <div className="text-xs text-gray-500 mb-2">Ersatz</div>

      {substitutes.length === 0 ? (
        <div className="text-sm text-muted-foreground">Keine Ersatzspieler.</div>
      ) : (
        <div className="grid gap-2">
          {substitutes.map((lp) => {
            const p = displayPlayers.find((x) => x.id === lp.player_id)
            return (
              <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3 opacity-90 min-w-0 overflow-hidden">
                <div className="font-medium truncate">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                <Badge variant="outline" className="text-xs">Ersatz</Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* ✅ Hinweise */}
    {!isCaptainOrCoForTeam ? (
      <div className="text-xs text-gray-500">Nur Captain/Co-Captain kann die Aufstellung ändern.</div>
    ) : null}

    {isCaptainOrCoForTeam && dialogIsLocked ? (
      <div className="text-xs text-red-700">Aufstellung kann nach Spielbeginn nicht mehr geändert werden.</div>
    ) : null}

    {/* ✅ Bestätigen / Änderungen bestätigen */}
    {isCaptainOrCoForTeam && !dialogIsLocked ? (
      <>
        {/* Wenn bestätigt & nicht im Editmode -> Info */}
        {lineupIsConfirmed && !lineupEditMode ? (
          <div className="text-xs text-gray-600">
            Aufstellung ist bestätigt und gesperrt. Klicke auf <span className="font-medium">Bearbeiten</span>, um Änderungen zu machen.
          </div>
        ) : null}
		
		
		{isCaptainOrCoForTeam && !dialogIsLocked && lineupEditMode && (
  <div className="flex gap-2">
   <Button
  variant="outline"
  onClick={() => {
    // Draft zurück auf DB-Stand
    setDraftLineup(lineupPlayers)
    setDraftDirty(false)

    // ❌ NICHT mehr sperren!
    // setLineupEditMode(false)

    // Fehlermeldung zurücksetzen
    setLineupError(null)
  }}
  className="w-full"
>
  Änderungen verwerfen
</Button>

    <Button
      onClick={saveDraftLineup}
      disabled={savingLineup || !draftDirty}
      className="w-full bg-orange-600 hover:bg-orange-700"
    >
      {savingLineup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Änderungen speichern
    </Button>
  </div>
)}




       {/* Wenn Editmode aktiv -> Confirm Button */}
{(!lineupIsConfirmed || lineupEditMode) ? (
  <Button
    onClick={confirmLineup}
    disabled={
      confirmingLineup ||
      dialogIsLocked ||
      startersCount === 0 ||
      (lineupIsConfirmed === true && !lineupIsStale && !lineupEditMode)
    }
    className="bg-orange-600 hover:bg-orange-700"
  >
    {confirmingLineup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
    {lineupIsStale || lineupEditMode ? "Änderungen bestätigen" : "Aufstellung bestätigen"}
  </Button>
) : null}
      </>
    ) : null}
  </CardContent>
</Card>

				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  

                  <Card className="border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-orange-600" />
                        Team-Chat
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                     {!activeRoomId ? (
  <div className="text-sm text-muted-foreground">
    Kein Chat verfügbar (Team wählen oder Spiel öffnen).
  </div>
) : (
  <>

                          <div className="rounded-xl border overflow-hidden">
                            <ScrollArea className="h-64 sm:h-72 p-3">
                              {chatLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                                  Lade Chat…
                                </div>
                              ) : chatMessages.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Noch keine Nachrichten. Schreib die erste Nachricht ins Team!</div>
                              ) : (
                                <div className="space-y-3">
                                  {chatMessages.map((m) => {
                                    const isMine = m.user_id === profile?.id
                                    const name = m.sender?.name ?? `User ${m.user_id.slice(0, 8)}`
                                    const photo = m.sender?.photo_url ?? null

                                    return (
                                      <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} min-w-0`}>
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                          <AvatarImage src={photo || "/placeholder.svg"} alt={name} />
                                          <AvatarFallback className="bg-orange-100 text-orange-700">{name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col min-w-0`}>
                                          <div className="flex items-center gap-2 mb-1 min-w-0">
                                            <span className="text-xs font-medium truncate">{isMine ? "Du" : name}</span>
                                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 flex-shrink-0">
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

                          <div className="flex gap-2 min-w-0">
                            <Input
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              placeholder="Nachricht ans Team…"
                              className="flex-1 min-w-0"
                              onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
}}

                              disabled={chatSending}
                            />
                            <Button onClick={sendChatMessage} disabled={!chatText.trim() || chatSending} className="bg-orange-600 hover:bg-orange-700 px-3 flex-shrink-0">
                              {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <MobileBottomNav />
    </div>
  )
}

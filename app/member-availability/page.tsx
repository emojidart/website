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

import { Calendar, MapPin, Users, Loader2, Crown, ShieldCheck, CheckCircle2, HelpCircle, XCircle, ClipboardList, Eye, MessageCircle, Send, Clock, ArrowLeft } from "lucide-react"

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
              <span><span className="font-medium">Ja</span> – sicher dabei</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-yellow-600" />
              <span><span className="font-medium">Nur wenn Not am Mann</span> – nur im Engpass einplanen</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span><span className="font-medium">Nein</span> – nicht verfügbar</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white/70 p-3 ring-1 ring-black/5 text-sm text-gray-700">
            <span className="font-medium">Captain/Co-Captain</span> stellt daraus die <span className="font-medium">Stamm- und Ersatzspieler</span> zusammen.
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
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
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

  // Team chat (room_id = team_id)
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
      await Promise.all([fetchUserProfile(), fetchAdminAccess()])
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

  async function fetchAdminAccess() {
    if (!session?.user) return
    // Vereinsbereich Admin / Verwaltung:
    // Zeige Verwaltungs-Boxen nur, wenn der Benutzer in dieser Tabelle existiert
    // UND mindestens ein Feld, das mit "allowed" beginnt, auf true steht.
    // (Wenn alle allowed* Felder false sind -> nichts anzeigen)
    //
    // Falls eure Tabelle anders heißt, hier den Namen anpassen:
    const { data, error } = await supabase
      .from("club_admins")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (error || !data) {
      setHasAdminAccess(false)
      return
    }

    const anyAllowed = Object.entries(data as Record<string, any>).some(([key, value]) => {
      if (!key.toLowerCase().startsWith("allowed")) return false
      return value === true
    })

    setHasAdminAccess(anyAllowed)
  }


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
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name),
          season:seasons(id, name, type)
        `)
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

    const myTeams = myTeamsForMatch(match)
    const defaultTeamId = myTeams[0]?.team_id ?? null
    setSelectedTeamId(defaultTeamId)

    setIsDialogOpen(true)

    if (defaultTeamId) {
      await loadMatchData(match.id, defaultTeamId)
    } else {
      setTeamPlayers([])
      setAvailability([])
      setLineupPlayers([])
    }
  }

  
  async function loadTeamChat(teamId: string) {
    if (!teamId) return
    setChatLoading(true)
    try {
      // last 200 messages for this team
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

      // IMPORTANT: chat_messages.user_id is a FK to user_profiles.id in your DB.
      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)))

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, player_id")
        .in("id", profileIds)

      const profileToPlayer = new Map<string, string>()
      ;(profiles as any[] | null)?.forEach((p) => {
        if (p?.id && p?.player_id) profileToPlayer.set(p.id, p.player_id)
      })

      const playerIds = Array.from(new Set((profiles as any[] | null)?.map((p) => p.player_id).filter(Boolean) ?? []))

      const { data: players } = await supabase
        .from("club_players")
        .select("id,name,photo_url")
        .in("id", playerIds)

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

  function subscribeToTeamChat(teamId: string) {
    const channel = supabase
      .channel(`team_chat_${teamId}`)
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

          // best effort sender info (incoming.user_id = user_profiles.id)
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

  async function sendTeamMessage() {
    if (!dialogMatch || !selectedTeamId) return
    if (!profile?.id) return
    const text = chatText.trim()
    if (!text || chatSending) return

    setChatSending(true)
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: profile.id,
        room_id: selectedTeamId,
        message: text,
      })
      if (error) throw error
      setChatText("")
    } catch (e) {
      console.error("sendTeamMessage error", e)
      // if RLS blocks inserts, you will see 401/403 here; fix via policies on chat_messages
    } finally {
      setChatSending(false)
    }
  }

  useEffect(() => {
    if (!isDialogOpen) return
    if (!selectedTeamId) return
    // load chat + subscribe while dialog open
    loadTeamChat(selectedTeamId)
    const unsub = subscribeToTeamChat(selectedTeamId)
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, selectedTeamId])

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

    setLineupPlayers(((lu as any) || []) as LineupRow[])
  }

  const isCaptainOrCoForTeam = useMemo(() => {
    if (!selectedTeamId) return false
    const m = teamMemberships.find((t) => t.team_id === selectedTeamId)
    return (m?.role === "Captain" || m?.role === "Co-Captain" || hasAdminAccess)

  }, [selectedTeamId, teamMemberships, hasAdminAccess])

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

  async function setAvailabilityStatus(status: AvailabilityStatus) {
    if (!dialogMatch || !selectedTeamId || !profile?.player_id) return
    setMyStatus(status)

    await supabase
      .from("match_availability")
      .upsert(
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

    await supabase
      .from("match_availability")
      .upsert(
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

  async function setLineupPlayer(playerId: string, mode: "remove" | "starter" | "substitute") {
    if (!dialogMatch || !selectedTeamId) return
    if (!isCaptainOrCoForTeam) return

    const matchId = dialogMatch.id
    const teamId = selectedTeamId

    const existing = lineupPlayers.find((p) => p.player_id === playerId)

    setSavingLineup(true)

    try {
      if (mode === "remove") {
        if (existing) {
          await supabase
            .from("match_lineups")
            .delete()
            .eq("id", existing.id)

          await reorderLineup(matchId, teamId)
        }
      }

      if (mode === "substitute") {
        if (existing) {
          // switch to substitute
          await supabase
            .from("match_lineups")
            .update({ is_substitute: true, position: 0 })
            .eq("id", existing.id)
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
            // switch from sub to starter -> append at end
            const nextPos = lineupPlayers.filter((p) => !p.is_substitute).length + 1
            await supabase
              .from("match_lineups")
              .update({ is_substitute: false, position: nextPos })
              .eq("id", existing.id)
          }
          // if already starter, no-op
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
    } finally {
      setSavingLineup(false)
    }
  }

  const upcomingMatches = matches.filter((m) => m.status !== "completed")
  const completedMatches = matches.filter((m) => m.status === "completed")

  const starters = useMemo(
    () => lineupPlayers.filter((p) => !p.is_substitute).slice().sort((a, b) => a.position - b.position),
    [lineupPlayers]
  )
  const substitutes = useMemo(() => lineupPlayers.filter((p) => p.is_substitute), [lineupPlayers])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl">
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl">
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
          <div className="mt-4"><InfoCallout /></div>
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
                      return (
                        <Card key={m.id} className="border shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-base md:text-lg truncate">
                                  {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                </div>

                                <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-orange-600" />
                                    {m.venue || "—"}
                                  </span>
                                </div>

                                {myTeams.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {myTeams.map((t) => (
                                      <Badge key={t.team_id} variant="outline" className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {t.teams?.name ?? "Mein Team"} {leadershipIcon(t.role)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button size="sm" onClick={() => openMatchDialog(m)} className="bg-orange-600 hover:bg-orange-700">
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
                        <Card key={m.id} className="border shadow-sm opacity-90">
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
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="font-semibold text-base">
                        {getTeamDisplayName(dialogMatch, true)} vs {getTeamDisplayName(dialogMatch, false)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(dialogMatch.match_date)}{" "}
                        {dialogMatch.match_time ? `• ${formatTime(dialogMatch.match_time)}` : ""} • {dialogMatch.venue || "—"}
                      </div>

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

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Meine Zusage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={myStatus === "yes" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("yes")}
                          className={myStatus === "yes" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ja
                        </Button>

                        <Button
                          variant={myStatus === "maybe" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("maybe")}
                          className={myStatus === "maybe" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Nur wenn Not am Mann
                        </Button>

                        <Button
                          variant={myStatus === "no" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("no")}
                          className={myStatus === "no" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Nein
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Notiz (optional)</div>
                        <Textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} placeholder="z.B. komme 5 min später" />
                        <Button variant="secondary" onClick={saveNote}>
                          Notiz speichern
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Team-Zusagen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {displayPlayers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Keine Teamspieler gefunden.</div>
                      ) : (
                        displayPlayers.map((p) => {
                          const a = availabilityByPlayer.get(p.id)
                          const s = a?.status ?? "none"
                          const entry = lineupPlayers.find((x) => x.player_id === p.id)
                          const inLineup = Boolean(entry)

                          return (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 gap-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                {a?.note ? <div className="text-xs text-gray-500 truncate">{a.note}</div> : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                {statusBadge(s as any)}

                                {isCaptainOrCoForTeam && (
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {!inLineup ? (
                                      <>
                                        <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "starter")}>
                                          Stamm
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
                                            Als Stamm
                                          </Button>
                                        ) : (
                                          <Button size="sm" variant="outline" disabled={savingLineup} onClick={() => setLineupPlayer(p.id, "substitute")}>
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

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        Aufstellung
                        <Badge variant="outline">Entwurf</Badge>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {starters.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Noch keine Stammspieler ausgewählt.</div>
                      ) : (
                        <div className="grid gap-2">
                          {starters.map((lp) => {
                            const p = displayPlayers.find((x) => x.id === lp.player_id)
                            return (
                              <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3">
                                <div className="font-medium">
                                  {p?.name ?? lp.club_players?.name ?? lp.player_id}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {substitutes.length > 0 && (
                        <>
                          <div className="text-xs text-gray-500 mt-3">Ersatzspieler</div>
                          <div className="grid gap-2">
                            {substitutes.map((lp) => {
                              const p = displayPlayers.find((x) => x.id === lp.player_id)
                              return (
                                <div key={lp.player_id} className="flex items-center justify-between rounded-xl border p-3 opacity-80">
                                  <div className="font-medium">{p?.name ?? lp.club_players?.name ?? lp.player_id}</div>
                                  <Badge variant="outline">Ersatz</Badge>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {!isCaptainOrCoForTeam ? (
                        <div className="text-xs text-gray-500">Nur Captain/Co-Captain oder Vereins-Admin kann die Aufstellung ändern.</div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-orange-600" />
                        Team-Chat
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {!selectedTeamId ? (
                        <div className="text-sm text-muted-foreground">Wähle zuerst ein Team aus.</div>
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
                                <div className="text-sm text-muted-foreground">
                                  Noch keine Nachrichten. Schreib die erste Nachricht ins Team!
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {chatMessages.map((m) => {
                                    const isMine = m.user_id === profile?.id
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
                              placeholder="Nachricht ans Team…"
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
                              disabled={!chatText.trim() || chatSending}
                              className="bg-orange-600 hover:bg-orange-700 px-3"
                            >
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

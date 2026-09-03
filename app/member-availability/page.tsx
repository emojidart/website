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
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.45)] sm:rounded-[26px]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
            <MessageCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
              So funktioniert’s
            </div>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              Deine Verfügbarkeit
            </h2>
          </div>
        </div>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Gib pro Spiel kurz an, ob du dabei bist. Captain und Co-Captain sehen sofort, mit wem sie für die Aufstellung planen können.
        </p>
      </div>

      <div className="grid gap-2.5 p-3.5 sm:grid-cols-3 sm:p-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-sm font-black text-slate-950">Ja</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">
            Du bist sicher dabei.
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
              <HelpCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-sm font-black text-slate-950">Nur wenn nötig</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">
            Du kannst einspringen, wenn jemand gebraucht wird.
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm font-black text-slate-950">Nein</div>
          </div>
          <div className="mt-2 text-xs font-medium leading-5 text-slate-600">
            Du bist für dieses Spiel nicht verfügbar.
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <p className="text-sm font-medium leading-5 text-slate-600">
            Captain und Co-Captain erstellen daraus die Aufstellung mit Stamm- und Ersatzspielern.
          </p>
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
  const [remindSending, setRemindSending] = useState<Record<string, boolean>>({})
const [remindOk, setRemindOk] = useState<Record<string, boolean>>({})
const [remindAllSending, setRemindAllSending] = useState(false)
const [remindAllResult, setRemindAllResult] = useState<string | null>(null)
// 🔒 Cooldown Modal
const [cooldownOpen, setCooldownOpen] = useState(false)
const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ✅ je nach Modus: Match-Room oder Team-Room
  const activeRoomId = useMemo(() => {
  if (!dialogMatch) return null
  return dialogMatch.id
}, [dialogMatch])

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




useEffect(() => {
  if (!session?.user) return
  if (!matches || matches.length === 0) return

  const matchId = searchParams.get("match_id")
  const teamId = searchParams.get("team_id")

  if (!matchId) return

  const m = matches.find((x) => x.id === matchId)
  if (!m) return

  ;(async () => {
    await openMatchDialog(m)

    if (teamId) {
      setSelectedTeamId(teamId)
      await loadMatchData(m.id, teamId)
    }

    setChatMode("match")
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
          home_team:teams!matches_home_team_id_fkey(id, name, dart_type),
          away_team:teams!matches_away_team_id_fkey(id, name, dart_type),
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
    // 1) Nachricht in Supabase speichern
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

    // 3) Input leeren
    setChatText("")
  } catch (e) {
    console.error("sendChatMessage error", e)
  } finally {
    setChatSending(false)
  }
}
  
  
  
  
  
  
  
  async function sendAvailabilityReminder(targetPlayerId: string) {
  if (!dialogMatch || !selectedTeamId) return
  if (!isCaptainOrCoForTeam) return
  if (!profile?.id) return
  if (dialogIsLocked) return
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

if (!res.ok || !json?.success) {
  throw new Error(json?.error || "push failed")
}

    setRemindOk((p) => ({ ...p, [targetPlayerId]: true }))
    setTimeout(() => {
      setRemindOk((p) => ({ ...p, [targetPlayerId]: false }))
    }, 2000)
  } catch (e) {
    console.error("sendAvailabilityReminder error", e)
  } finally {
    setRemindSending((p) => ({ ...p, [targetPlayerId]: false }))
  }
}

async function sendAvailabilityReminderToAll() {
  if (!dialogMatch || !selectedTeamId) return
  if (!isCaptainOrCoForTeam) return
  if (!profile?.id) return
  if (dialogIsLocked) return

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

// 🔒 Cooldown -> einfach überspringen
if (json?.cooldown) {
  continue
}

if (!res.ok || !json?.success) {
  throw new Error(json?.error || "push failed")
}

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
  
  


    useEffect(() => {
    if (!isDialogOpen) return
    if (!activeRoomId) return

    loadChat(activeRoomId)
    const unsub = subscribeToChat(activeRoomId)

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, activeRoomId])


  function getRequiredLeagueModuleForMatch(match: Match | null, teamId: string | null) {
    if (!teamId) return null

    // WICHTIG:
    // Beim Öffnen des Dialogs ist setDialogMatch(match) noch asynchron.
    // Deshalb darf die Ermittlung NICHT davon abhängen, dass dialogMatch
    // bereits im State angekommen ist. Zuerst immer die Dartart des eigenen
    // Teams verwenden; das Match ist nur der Fallback.
    const myTeam = teamMemberships.find((membership) => membership.team_id === teamId)
    const teamDartType = String(myTeam?.teams?.dart_type || "").toLowerCase()
    const matchDartType = String(match?.dart_type || "").toLowerCase()

    const dartType = teamDartType || matchDartType

    if (dartType === "edart") return "edart_league"
    if (dartType === "steeldart") return "steeldart_league"

    return null
  }

  async function loadMatchData(matchId: string, teamId: string) {
    if (!profile?.player_id) return

   // Teamspieler: nur aktive Teammitglieder MIT passendem Liga-Paket
   // Testfreischaltungen zählen ebenfalls, weil die RPC beide Varianten prüft.
const requiredModule = getRequiredLeagueModuleForMatch(dialogMatch, teamId)

if (!requiredModule) {
  console.error("Liga-Modul konnte für Team nicht ermittelt werden:", teamId)
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

   // Availability (NUR aktive Mitglieder)
const { data: av } = await supabase
  .from("match_availability")
  .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
  .eq("match_id", matchId)
  .eq("team_id", teamId)

const rowsAll = ((av as any) || []) as AvailabilityRow[]
const rows = rowsAll.filter((r) => activePlayerIds.has(r.player_id))
setAvailability(rows)

    const mine = rows.find((x) => x.player_id === profile.player_id)
    if (mine) {
      setMyStatus(mine.status)
      setMyNote(mine.note ?? "")
    } else {
      setMyStatus("maybe")
      setMyNote("")
    }

    // Lineup (NUR aktive Mitglieder)
const { data: lu } = await supabase
  .from("match_lineups")
  .select("id,player_id,position,is_substitute, club_players:club_players(id,name,photo_url)")
  .eq("match_id", matchId)
  .eq("team_id", teamId)
  .order("position", { ascending: true })

const loadedAll = (((lu as any) || []) as LineupRow[])
const loaded = loadedAll.filter((r) => activePlayerIds.has(r.player_id))

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
// ✅ Wenn bestätigt -> standardmäßig sperren (EditMode AUS)
const isConfirmed =
  (lh as any)?.status === "confirmed" &&
  (lh as any)?.confirmed_version != null &&
  (lh as any)?.confirmed_version === (lh as any)?.current_version

// ✅ Wenn "confirmed aber geändert" -> auch erstmal sperren (EditMode AUS)
const isStale =
  (lh as any)?.status === "confirmed" &&
  (lh as any)?.confirmed_version != null &&
  (lh as any)?.current_version != null &&
  (lh as any)?.confirmed_version < (lh as any)?.current_version

// ✅ Auto-Edit NUR wenn NICHT confirmed und NICHT stale (also Draft/leer)
setLineupEditMode(!isConfirmed && !isStale)

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
  
  const noAnswerPlayerIds = useMemo(() => {
  const myId = profile?.player_id ?? null
  return displayPlayers
    .map((p) => p.id)
    .filter((pid) => pid !== myId)
    .filter((pid) => (availabilityByPlayer.get(pid)?.status ?? "none") === "none")
}, [displayPlayers, availabilityByPlayer, profile?.player_id])

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
  if ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode) return

  // Zusätzliche UI-Sicherung: nur Spieler aus der bereits paketgefilterten Liste dürfen gesetzt werden.
  if (mode !== "remove" && !teamPlayers.some((player) => player.id === playerId)) {
    setLineupError("Dieser Spieler hat für diese Liga kein aktives Paket bzw. keine gültige Testfreischaltung.")
    return
  }

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
    <main className="min-h-screen flex flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
      <Header
        variant="app"
        title="Zusagen & Aufstellung"
        subtitle="Übersicht"
        backHref="/member-profile-app"
      />

      {/* Dieser Bereich füllt ALLES unter dem Header */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-5 rounded-[28px] border border-slate-200 bg-white px-8 py-9 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)] sm:px-10">
            {/* Spinner */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-2xl animate-pulse" />
              <Loader2 className="relative h-10 w-10 animate-spin text-orange-500" />
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-lg font-bold text-slate-950">Aufstellung wird geladen</p>
              <p className="text-sm text-slate-500 mt-1">Bitte kurz warten…</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-950 font-sans flex flex-col overflow-x-hidden">
      <Header
  variant="app"
  title="Zusagen & Aufstellung"
  subtitle="Übersicht"
  backHref="/member-profile-app"
/>

      <main className="w-full pt-14 sm:pt-16">
        <MembershipAccessGate
          required={["edart_league", "steeldart_league"]}
          requireAll={false}
          title="Zusagen & Aufstellung nicht freigeschaltet"
          description="Für diesen Bereich brauchst du ein aktives E-Dart- oder Steeldart-Ligapaket bzw. eine gültige Testfreischaltung."
        >
  <div className="w-full max-w-none overflow-x-hidden px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">

        <section className="relative mb-4 overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:mb-5 sm:rounded-[28px] xl:rounded-[30px]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Mannschaft
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-orange-400 sm:h-14 sm:w-14">
                    <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/50">Planung für deine Ligaspiele</p>
                    <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                      Zusagen & Aufstellung
                    </h1>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                  Verfügbarkeit melden, Aufstellung ansehen und alles rund um das Spiel gemeinsam abstimmen.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-end">
                <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-sm sm:p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Kommende</div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{upcomingMatches.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-sm sm:p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">Beendet</div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{completedMatches.length}</div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/member-profile-app")}
                  className="h-11 w-full rounded-xl border-white/10 bg-white/10 px-4 font-black text-white shadow-none backdrop-blur-sm hover:bg-white/15 hover:text-white sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zum Profil
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 sm:mb-5">
          <InfoCallout />
        </div>

        <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)] sm:rounded-[30px]">
          <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Spielübersicht</div>
                <CardTitle className="mt-0.5 flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Spiele
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 py-4 sm:px-6 sm:py-6 lg:px-7">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 shadow-none">
                <TabsTrigger value="upcoming" className="h-10 rounded-xl py-2 text-xs font-black text-slate-500 shadow-none data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm">
                  Kommende ({upcomingMatches.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="h-10 rounded-xl py-2 text-xs font-black text-slate-500 shadow-none data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm">
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
  className={`w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_42px_-34px_rgba(15,23,42,0.55)] transition-all hover:border-slate-300 hover:shadow-[0_18px_54px_-34px_rgba(15,23,42,0.5)] sm:rounded-[24px] ${
    locked ? "ring-1 ring-red-200 bg-red-50/20" : ""
  }`}
>
                          <CardContent className="p-3.5 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                              <div className="min-w-0 w-full text-left sm:w-auto">
                                <div className="break-words text-base font-black leading-snug tracking-tight text-slate-950 md:text-lg">
                                  {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                                </div>

                                {locked && (
                                  <div className="mt-2 flex justify-center sm:justify-start">
                                    <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                                      Gesperrt (Spielzeit überschritten)
                                    </Badge>
                                  </div>
                                )}

                                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
                                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    {formatDate(m.match_date)} {m.match_time ? `• ${formatTime(m.match_time)}` : ""}
                                  </span>
                                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
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
                                      <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_34px_-28px_rgba(15,23,42,0.45)]">
                                        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-3.5 py-3 sm:px-4">
                                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
                                            <MapPin className="h-4 w-4 text-orange-600" />
                                          </div>
                                          <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Auswärtsspiel</div>
                                            <div className="text-sm font-black text-slate-950">Gegner – Lokal</div>
                                          </div>
                                        </div>

                                        <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 sm:p-4">
                                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Lokal</div>
                                            <div className="mt-1 break-words text-sm font-black text-slate-950">{opp.venue_name || "—"}</div>
                                          </div>
                                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Adresse</div>
                                            <div className="mt-1 break-words text-sm font-semibold text-slate-700">{opp.venue || "—"}</div>
                                          </div>

                                          {phone && (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 sm:col-span-2">
                                              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Kapitän</div>
                                              <a href={`tel:${tel}`} className="mt-1 block break-all text-sm font-black text-slate-950 hover:text-orange-600">
                                                {phone}
                                              </a>
                                            </div>
                                          )}
                                        </div>

                                        {phone && wa && (
                                          <div className="border-t border-slate-100 px-3.5 py-3 sm:px-4">
                                            <Button
                                              asChild
                                              size="sm"
                                              className="h-10 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600 sm:w-auto"
                                            >
                                              <a href={wa} target="_blank" rel="noreferrer">
                                                Kapitän kontaktieren
                                              </a>
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}

                                {myTeams.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {myTeams.map((t) => (
                                      <Badge key={t.team_id} variant="outline" className="flex items-center gap-1 rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-700">
                                        <Users className="h-3 w-3" />
                                        {t.teams?.name ?? "Mein Team"} {leadershipIcon(t.role)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                                <Button size="sm" onClick={() => openMatchDialog(m)} className="h-11 w-full rounded-xl bg-slate-950 font-black text-white shadow-none hover:bg-slate-800 sm:w-auto">
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
                        <Card key={m.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_38px_-32px_rgba(15,23,42,0.45)] sm:rounded-[24px]">
                          <CardContent className="p-4 sm:p-5">
                            <div className="font-semibold">
                              {getTeamDisplayName(m, true)} vs {getTeamDisplayName(m, false)}
                            </div>
                            <div className="mt-2 text-sm font-medium leading-5 text-slate-500">
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
              h-[calc(100dvh-12px)]
              w-[calc(100vw-12px)]
              max-w-none
              overflow-y-auto
              overflow-x-hidden
              rounded-[24px]
              border
              border-slate-200
              bg-[#f6f7f9]
              p-0
              shadow-[0_32px_100px_-38px_rgba(15,23,42,0.65)]
              sm:h-auto
              sm:max-h-[90vh]
              sm:w-[94vw]
              sm:max-w-[820px]
              sm:rounded-[28px]
              lg:max-w-[980px]
            "
          >
            <DialogHeader className="sticky top-0 z-20 border-b border-white/10 bg-slate-950 px-4 py-4 text-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.9)] sm:px-6 sm:py-5">
              <DialogTitle className="pr-8 text-lg font-black tracking-tight text-white sm:text-xl">Spiel – Zusage & Aufstellung</DialogTitle>
            </DialogHeader>

            <div className="min-w-0 space-y-3.5 p-2.5 pb-4 sm:space-y-4 sm:p-5 lg:p-6">
              {!dialogMatch ? null : (
                <>
                  {dialogIsLocked && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-800 shadow-sm">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium">Gesperrt (Spielzeit überschritten)</div>
                        <div className="text-xs text-red-700 mt-0.5">
                          Ab Spielbeginn sind <span className="font-medium">Zusage</span> und <span className="font-medium">Aufstellung</span> gesperrt.
                        </div>
                      </div>
                    </div>
                  )}

                  <Card className="mx-auto w-full max-w-none overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_48px_-38px_rgba(15,23,42,0.5)] sm:rounded-[26px]">
                    <CardContent className="p-4">
                      <div className="break-words text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                        {getTeamDisplayName(dialogMatch, true)} vs {getTeamDisplayName(dialogMatch, false)}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
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
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-0">
                            <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3.5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Gegner-Lokal</span>
                            </div>

                            <div className="grid gap-2.5 p-3.5 text-sm sm:grid-cols-2">
                              <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Lokal</span>
                                <span className="mt-1 block break-words font-black text-slate-950">{opp.venue_name || "—"}</span>
                              </div>
                              <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Ort</span>
                                <span className="mt-1 block min-w-0 break-words font-semibold text-slate-700">{opp.venue || "—"}</span>
                              </div>

                              {phone && tel && (
                                <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:col-span-2">
                                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Kapitän</span>
                                  <a href={`tel:${tel}`} className="mt-1 block break-all font-black text-slate-950 underline-offset-4 hover:text-orange-600">
                                    {phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {myTeamsForMatch(dialogMatch).length > 1 && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Team auswählen</div>
                          <div className="grid gap-2 sm:grid-cols-2">
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

                  <Card className={`mx-auto w-full max-w-none overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_48px_-38px_rgba(15,23,42,0.5)] sm:rounded-[26px] ${dialogIsLocked ? "opacity-80" : ""}`}>
                    <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                      <CardTitle className="flex items-center justify-between gap-2 text-base font-black tracking-tight text-slate-950 sm:text-lg">
  <span className="inline-flex items-center gap-2">
    <MessageCircle className="h-4 w-4 text-orange-600" />
    Chat
  </span>


</CardTitle>

                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-5">
					{lineupError ? (
  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    {lineupError}
  </div>
) : null}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Button
                          variant={myStatus === "yes" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("yes")}
                          className={myStatus === "yes" ? "h-11 rounded-xl bg-emerald-600 font-black hover:bg-emerald-700" : "h-11 rounded-xl border-slate-200 bg-white font-black hover:bg-slate-50"}
                          disabled={dialogIsLocked}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ja
                        </Button>

                        <Button
                          variant={myStatus === "maybe" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("maybe")}
                          className={myStatus === "maybe" ? "h-11 rounded-xl bg-amber-500 font-black hover:bg-amber-600" : "h-11 rounded-xl border-slate-200 bg-white font-black hover:bg-slate-50"}
                          disabled={dialogIsLocked}
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Nur wenn Not am Mann
                        </Button>

                        <Button
                          variant={myStatus === "no" ? "default" : "outline"}
                          onClick={() => setAvailabilityStatus("no")}
                          className={myStatus === "no" ? "h-11 rounded-xl bg-red-600 font-black hover:bg-red-700" : "h-11 rounded-xl border-slate-200 bg-white font-black hover:bg-slate-50"}
                          disabled={dialogIsLocked}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Nein
                        </Button>
                      </div>
					  
					  {isCaptainOrCoForTeam && !dialogIsLocked ? (
  <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
    <div className="text-xs text-slate-600">
      Offene Rückmeldungen: <span className="font-medium">{noAnswerPlayerIds.length}</span>
    </div>

    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={sendAvailabilityReminderToAll}
        disabled={remindAllSending || noAnswerPlayerIds.length === 0}
      >
        {remindAllSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Sende…
          </>
        ) : (
          "Erinnern (alle ohne Antwort)"
        )}
      </Button>

      {remindAllResult ? <span className="text-xs text-slate-700">{remindAllResult}</span> : null}
    </div>
  </div>
) : null}

                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">Notiz (optional)</div>
                        <Textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} placeholder="z.B. komme 5 min später" disabled={dialogIsLocked} className="min-h-[90px] rounded-xl border-slate-200 bg-slate-50/70 shadow-none focus-visible:bg-white" />
                        <Button variant="secondary" onClick={saveNote} disabled={dialogIsLocked}>
                          Notiz speichern
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`mx-auto w-full max-w-none overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_48px_-38px_rgba(15,23,42,0.5)] sm:rounded-[26px] ${dialogIsLocked ? "opacity-90" : ""}`}>
                    <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                      <CardTitle className="text-base">Team-Zusagen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 p-4 sm:p-5">
                      {displayPlayers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Aktuell keine Rückmeldungen (Zu- oder Absagen).</div>
                      ) : (
                        displayPlayers.map((p) => {
                          const a = availabilityByPlayer.get(p.id)
                          const s = a?.status ?? "none"
                          const entry = effectiveLineup.find((x) => x.player_id === p.id)

                          const inLineup = Boolean(entry)

                          return (
                            <div key={p.id} className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                              <div className="min-w-0 w-full sm:w-auto text-center sm:text-left">
                                <div className="break-words font-black text-slate-950">{p.name}</div>
                                {a?.note ? <div className="mt-1 break-words text-xs font-medium text-slate-500">{a.note}</div> : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                {statusBadge(s as any)}
								
								
								{isCaptainOrCoForTeam && !dialogIsLocked && s === "none" && p.id !== profile?.player_id ? (
  <div className="flex items-center gap-2">
    <Button
      size="sm"
      variant="outline"
      disabled={!!remindSending[p.id]}
      onClick={() => sendAvailabilityReminder(p.id)}
    >
      {remindSending[p.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erinnern"}
    </Button>

    {remindOk[p.id] ? <span className="text-xs text-green-700">gesendet ✅</span> : null}
  </div>
) : null}
								
								

                                {isCaptainOrCoForTeam && (
                                  <div className="flex flex-wrap gap-1 justify-end">
								  
								  
                                    {!inLineup ? (
                                      <>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "starter")}>
                                          Fix
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "substitute")}>
                                          Ersatz
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "remove")}>
                                          Raus
                                        </Button>
                                        {entry?.is_substitute ? (
                                          <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "starter")}>
                                            Als Fix
                                          </Button>
                                        ) : (
                                          <Button size="sm" variant="outline" disabled={savingLineup || dialogIsLocked || ((lineupIsConfirmed || lineupIsStale) && !lineupEditMode)} onClick={() => setLineupPlayer(p.id, "substitute")}>
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

                  
				  <Card className={`mx-auto w-full max-w-none overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_48px_-38px_rgba(15,23,42,0.5)] sm:rounded-[26px] ${dialogIsLocked ? "opacity-90" : ""}`}>
  <CardHeader className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-4 py-5 sm:px-6 sm:py-6">
    <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />

    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
            <ClipboardList className="h-5 w-5 text-orange-400" />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              Mannschaft
            </div>
            <CardTitle className="mt-0.5 flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-white sm:text-2xl">
              Aufstellung
            </CardTitle>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lineupIsConfirmed ? (
            <Badge className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-2.5 text-emerald-200 shadow-none">
              Bestätigt
            </Badge>
          ) : lineupIsStale ? (
            <Badge className="rounded-full border border-amber-400/20 bg-amber-400/15 px-2.5 text-amber-200 shadow-none">
              Geändert · neu bestätigen
            </Badge>
          ) : (
            <Badge className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 text-white/70 shadow-none">
              Entwurf
            </Badge>
          )}

          {dialogIsLocked && (
            <Badge className="rounded-full border border-red-400/20 bg-red-400/15 px-2.5 text-red-200 shadow-none">
              Gesperrt
            </Badge>
          )}
        </div>

        {dialogMatch ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-white/70">
                <Calendar className="h-3.5 w-3.5 text-orange-400" />
                {formatDate(dialogMatch.match_date)}
                {dialogMatch.match_time ? ` · ${formatTime(dialogMatch.match_time)} Uhr` : ""}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-white/70">
                Spieltag {dialogMatch.week_number}
              </div>
            </div>

            <div className="mt-3 break-words text-sm font-black leading-snug text-white sm:text-base">
              {getTeamDisplayName(dialogMatch, true)}
              <span className="mx-2 font-medium text-white/30">vs</span>
              {getTeamDisplayName(dialogMatch, false)}
            </div>
          </div>
        ) : null}
      </div>

      {isCaptainOrCoForTeam && !dialogIsLocked && (lineupIsConfirmed || lineupIsStale) && !lineupEditMode ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setLineupEditMode(true)
            setLineupChangedNotified(false)
            setDraftLineup(lineupPlayers)
            setDraftDirty(false)
            setLineupError(null)
          }}
          className="h-10 w-full rounded-xl border-white/10 bg-white/10 font-black text-white shadow-none hover:bg-white/15 hover:text-white sm:w-auto sm:shrink-0"
        >
          Bearbeiten
        </Button>
      ) : null}
    </div>
  </CardHeader>

  <CardContent className="space-y-4 p-3.5 sm:p-5">
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Stammspieler */}
      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Startaufstellung</div>
            <div className="mt-0.5 text-sm font-black text-slate-950">Stammspieler</div>
          </div>
          <div className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-slate-950 px-2 text-xs font-black text-white">
            {starters.length}
          </div>
        </div>

        <div className="p-3">
          {starters.length === 0 ? (
            <div className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
              <Users className="h-5 w-5 text-slate-300" />
              <div className="mt-2 text-sm font-black text-slate-700">Noch niemand gesetzt</div>
              <div className="mt-1 text-xs font-medium text-slate-400">Wähle unten einen Spieler als Fixspieler aus.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {starters.map((lp) => {
                const p = displayPlayers.find((x) => x.id === lp.player_id)
                return (
                  <div key={lp.player_id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">
                        {p?.name ?? lp.club_players?.name ?? lp.player_id}
                      </div>
                    </div>
                    <Badge className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2.5 text-[10px] font-black text-orange-700 shadow-none">
                      Stamm
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Ersatzspieler */}
      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Reserve</div>
            <div className="mt-0.5 text-sm font-black text-slate-950">Ersatzspieler</div>
          </div>
          <div className="flex h-8 min-w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs font-black text-slate-600">
            {substitutes.length}
          </div>
        </div>

        <div className="p-3">
          {substitutes.length === 0 ? (
            <div className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
              <Users className="h-5 w-5 text-slate-300" />
              <div className="mt-2 text-sm font-black text-slate-700">Keine Ersatzspieler</div>
              <div className="mt-1 text-xs font-medium text-slate-400">Bei Bedarf kannst du Spieler als Ersatz einplanen.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {substitutes.map((lp) => {
                const p = displayPlayers.find((x) => x.id === lp.player_id)
                return (
                  <div key={lp.player_id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">
                        {p?.name ?? lp.club_players?.name ?? lp.player_id}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600">
                      Ersatz
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>

    {!isCaptainOrCoForTeam ? (
      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <div className="text-xs font-medium leading-5 text-slate-600">
          Die Aufstellung kann nur vom Captain oder Co-Captain geändert werden.
        </div>
      </div>
    ) : null}

    {isCaptainOrCoForTeam && dialogIsLocked ? (
      <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <div className="text-xs font-medium leading-5 text-red-700">
          Nach Spielbeginn kann die Aufstellung nicht mehr geändert werden.
        </div>
      </div>
    ) : null}

    {isCaptainOrCoForTeam && !dialogIsLocked ? (
      <>
        {lineupIsConfirmed && !lineupEditMode ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <div className="text-xs font-black text-emerald-800">Aufstellung bestätigt</div>
              <div className="mt-0.5 text-xs font-medium leading-5 text-emerald-700">
                Änderungen sind gesperrt. Über „Bearbeiten“ kannst du die Aufstellung wieder öffnen.
              </div>
            </div>
          </div>
        ) : null}

        {isCaptainOrCoForTeam && !dialogIsLocked && lineupEditMode && (
          <div className="overflow-hidden rounded-[20px] border border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-3 border-b border-orange-200 bg-orange-50 px-3.5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">Bearbeitung aktiv</div>
                <div className="text-sm font-black text-slate-950">Aufstellung bearbeiten</div>
              </div>
            </div>

            <div className="space-y-3 p-3.5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-100 bg-white px-3.5 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Abbrechen</div>
                  <div className="mt-1 text-xs font-medium leading-5 text-slate-600">Beendet die Bearbeitung ohne zu speichern.</div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-white px-3.5 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Bestätigen</div>
                  <div className="mt-1 text-xs font-medium leading-5 text-slate-600">Speichert deine Änderungen und bestätigt die Aufstellung.</div>
                </div>
              </div>

              {draftDirty && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <div className="text-xs font-black text-amber-900">Änderungen noch offen</div>
                    <div className="mt-0.5 text-xs font-medium leading-5 text-amber-800">
                      Bestätige die Aufstellung, damit die Änderungen für alle übernommen werden.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftLineup(lineupPlayers)
                    setDraftDirty(false)
                    setLineupError(null)
                    setLineupEditMode(false)
                  }}
                  className="h-11 w-full rounded-xl border-slate-200 bg-white font-black text-slate-700 shadow-none hover:bg-slate-50"
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
                  className="h-11 w-full rounded-xl border-slate-200 bg-white font-black text-slate-700 shadow-none hover:bg-slate-50"
                >
                  Verwerfen
                </Button>

                <Button
                  onClick={confirmLineup}
                  disabled={confirmingLineup || dialogIsLocked || startersCount === 0}
                  className="col-span-2 h-12 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600"
                >
                  {confirmingLineup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Änderungen bestätigen
                </Button>
              </div>
            </div>
          </div>
        )}

        {!lineupEditMode && !lineupIsConfirmed ? (
          <Button
            onClick={confirmLineup}
            disabled={confirmingLineup || dialogIsLocked || startersCount === 0}
            className="h-12 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600 sm:w-auto"
          >
            {confirmingLineup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Aufstellung bestätigen
          </Button>
        ) : null}
      </>
    ) : null}
  </CardContent>
</Card>

				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  
				  

                  <Card className="mx-auto w-full max-w-none overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_48px_-38px_rgba(15,23,42,0.5)] sm:rounded-[26px]">
                    <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-orange-600" />
                        Spiel-Chat
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 p-4 sm:p-5">
                     {!activeRoomId ? (
  <div className="text-sm text-muted-foreground">
    Kein Chat verfügbar (Team wählen oder Spiel öffnen).
  </div>
) : (
  <>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
                            <ScrollArea className="h-[320px] p-3 sm:h-[380px] sm:p-4">
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
                              className="h-11 min-w-0 flex-1 rounded-xl border-slate-200 bg-slate-50/70 shadow-none focus-visible:bg-white"
                              onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
}}

                              disabled={chatSending}
                            />
                            <Button onClick={sendChatMessage} disabled={!chatText.trim() || chatSending} className="h-11 w-11 flex-shrink-0 rounded-xl bg-orange-500 p-0 text-white shadow-none hover:bg-orange-600">
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

            <DialogFooter className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-5">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 w-full rounded-xl border-slate-200 bg-white font-black text-slate-700 shadow-none hover:bg-slate-50 sm:w-auto">
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
</Dialog>

{/* 🔒 Cooldown Info Modal */}
<Dialog open={cooldownOpen} onOpenChange={setCooldownOpen}>
  <DialogContent className="max-w-sm rounded-2xl">
    <DialogHeader>
      <DialogTitle className="text-base">
        Erinnerung bereits gesendet
      </DialogTitle>
    </DialogHeader>

    <div className="text-sm text-slate-600">
      Dieser Spieler wurde bereits erinnert.
      <br />
      <span className="font-medium">
        Bitte in {cooldownMinutes ?? 30} Minuten erneut versuchen.
      </span>
    </div>

    <DialogFooter className="pt-4">
      <Button
        onClick={() => setCooldownOpen(false)}
        className="bg-orange-600 hover:bg-orange-700"
      >
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
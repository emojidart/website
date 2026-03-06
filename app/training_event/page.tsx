"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

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
  Plus,
  Ban,
  Pencil,
  Save,
  Trophy,
  Globe,
} from "lucide-react"

type AvailabilityStatus = "yes" | "maybe" | "no"
type TrainingType = "training" | "double_training" | "special"
type TrainingStatus = "draft" | "scheduled" | "canceled" | "completed"

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

interface TrainingItem {
  id: string
  team_id: string | null
  created_by: string | null
  type: TrainingType
  title: string
  notes: string | null
  start_at: string
  end_at: string | null
  min_yes: number
  status: TrainingStatus
  created_at: string
  updated_at: string
}

type TrainingCounts = {
  event_id: string
  yes_count: number | null
  maybe_count: number | null
  no_count: number | null
  answered_count: number | null
}

type ChatMessage = {
  id: string
  user_id: string
  room_id: string
  message: string
  created_at: string
  sender?: { name: string; photo_url: string | null } | null
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} • ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function toLocalDateInput(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function toLocalTimeInput(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function buildISOFromLocal(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

function statusBadge(s: AvailabilityStatus | "none") {
  if (s === "yes") return <Badge className="bg-green-600 text-white">Ja</Badge>
  if (s === "maybe") return <Badge className="bg-yellow-600 text-white">Vielleicht</Badge>
  if (s === "no") return <Badge className="bg-red-600 text-white">Nein</Badge>
  return <Badge variant="outline">keine Antwort</Badge>
}

function leadershipIcon(role: string | null) {
  if (role === "Captain") return <Crown className="h-4 w-4 text-yellow-600" />
  if (role === "Co-Captain") return <ShieldCheck className="h-4 w-4 text-blue-600" />
  return null
}

function trainingTypeLabel(t: TrainingType) {
  if (t === "training") return "Training"
  if (t === "double_training") return "Doppeltraining"
  return "Spezial / Turnier"
}

function trainingTypeBadge(t: TrainingType) {
  if (t === "training") {
    return <Badge variant="outline">Training</Badge>
  }
  if (t === "double_training") {
    return (
      <Badge className="bg-blue-600 text-white">
        <Users className="h-3 w-3 mr-1" />
        Doppel
      </Badge>
    )
  }
  return (
    <Badge className="bg-purple-600 text-white">
      <Trophy className="h-3 w-3 mr-1" />
      Spezial
    </Badge>
  )
}
function trainingStatusBadge(s: TrainingStatus) {
  if (s === "canceled") return <Badge className="bg-red-600 text-white">Abgesagt</Badge>
  if (s === "completed") return <Badge variant="outline">Erledigt</Badge>
  if (s === "draft") return <Badge variant="outline">Entwurf</Badge>
  return <Badge className="bg-green-600 text-white">Geplant</Badge>
}

function isTrainingLocked(item: TrainingItem) {
  if (item.status === "completed") return true
  const dt = new Date(item.start_at)
  const ms = dt.getTime()
  if (!Number.isFinite(ms)) return false
  return Date.now() > ms
}

function willHappen(item: TrainingItem, counts: TrainingCounts | null) {
  if (!counts) return null
  if (item.status !== "scheduled") return false
  const yes = counts.yes_count ?? 0
  const min = item.min_yes ?? 0
  if (min <= 0) return true
  return yes >= min
}

function InfoCallout() {
  return (
    <div className="rounded-2xl border bg-gradient-to-r from-orange-50 via-white to-indigo-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-white/70 p-2 ring-1 ring-black/5">
          <ClipboardList className="h-5 w-5 text-orange-600" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">Kurz erklärt</h2>

          <p className="mt-1 text-sm text-gray-600">
            Hier können Teamtrainings, öffentliche Trainings und Trainingsturniere geplant werden.
Öffentliche Trainings und Turniere sind für alle Spieler sichtbar.
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
                <span className="font-medium">Vielleicht</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>
                <span className="font-medium">Nein</span> – nicht verfügbar
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MemberTrainingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const [items, setItems] = useState<TrainingItem[]>([])
  const [countsByEvent, setCountsByEvent] = useState<Map<string, TrainingCounts>>(new Map())

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogItem, setDialogItem] = useState<TrainingItem | null>(null)

  const [players, setPlayers] = useState<TeamPlayer[]>([])
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [myStatus, setMyStatus] = useState<AvailabilityStatus>("maybe")
  const [myNote, setMyNote] = useState("")

  const [editMode, setEditMode] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)

 const [fType, setFType] = useState<TrainingType>("training")
  const [fTitle, setFTitle] = useState<string>("TeamTraining")
  const [fDescription, setFDescription] = useState<string>("")
  const [fMinYes, setFMinYes] = useState<string>("6")
  const [fDate, setFDate] = useState<string>("")
  const [fStart, setFStart] = useState<string>("19:00")
  const [fEnd, setFEnd] = useState<string>("21:00")

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatText, setChatText] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  const activeRoomId = useMemo(() => (dialogItem ? dialogItem.id : null), [dialogItem])

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
    if (!profile?.player_id) return
    if (teamMemberships.length === 0) return
    ;(async () => {
      if (!selectedTeamId) setSelectedTeamId(teamMemberships[0]?.team_id ?? null)
      await fetchTrainings()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, teamMemberships])

  useEffect(() => {
    if (!profile?.player_id) return
    ;(async () => {
      await fetchTrainings()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId])

  useEffect(() => {
    if (!session?.user) return
    if (!items || items.length === 0) return

    const eventId = searchParams.get("event_id")
    if (!eventId) return

    const found = items.find((x) => x.id === eventId)
    if (!found) return

    ;(async () => {
      await openTrainingDialog(found, { forceEdit: false })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, items])

  const selectedMembership = useMemo(() => {
    if (!selectedTeamId) return null
    return teamMemberships.find((t) => t.team_id === selectedTeamId) ?? null
  }, [selectedTeamId, teamMemberships])

  const isCaptainOrCoForSelectedTeam = useMemo(() => {
    const role = selectedMembership?.role ?? null
    return role === "Captain" || role === "Co-Captain"
  }, [selectedMembership])

  const hasLeadershipAnywhere = useMemo(() => {
    return teamMemberships.some((t) => t.role === "Captain" || t.role === "Co-Captain")
  }, [teamMemberships])

  const canCreateCurrentType = useMemo(() => {
    if (fType === "training") return isCaptainOrCoForSelectedTeam
    return hasLeadershipAnywhere
  }, [fType, isCaptainOrCoForSelectedTeam, hasLeadershipAnywhere])

  function canEditItem(item: TrainingItem | null) {
    if (!item) return false
    if (item.type === "training") {
      const membership = teamMemberships.find((t) => t.team_id === item.team_id)
      return membership?.role === "Captain" || membership?.role === "Co-Captain"
    }
    return hasLeadershipAnywhere
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
        .is("left_at", null)

      setTeamMemberships((teamData as any) || [])
    }
  }

  async function fetchTrainings() {
    const { data: rows } = await supabase.from("team_events").select("*").order("start_at", { ascending: true })
    const { data: countsRows } = await supabase.from("team_event_counts").select("*")

    let all = ((rows as any) || []) as TrainingItem[]

    // Anzeige:
    // - TeamTraining nur für ausgewähltes Team
    // - Öffentliches Training + TrainingsTurnier immer anzeigen
    if (selectedTeamId) {
  all = all.filter((x) => x.type !== "training" || x.team_id === selectedTeamId)
}

    setItems(all)

    const map = new Map<string, TrainingCounts>()
    ;(((countsRows as any) || []) as TrainingCounts[]).forEach((c) => {
      map.set(c.event_id, c)
    })
    setCountsByEvent(map)
  }

  function getScopeLabel(item: TrainingItem) {
    if (item.type === "training") {
      const team = teamMemberships.find((t) => t.team_id === item.team_id)
      return team?.teams?.name ?? "Team"
    }
    return "Alle Spieler"
  }

  async function openTrainingDialog(item: TrainingItem, opts?: { forceEdit?: boolean }) {
    setDialogItem(item)
    setIsDialogOpen(true)
    setItemError(null)

    const forceEdit = !!opts?.forceEdit
    setEditMode(forceEdit)

    setFType(item.type)
    setFTitle(item.title ?? trainingTypeLabel(item.type))
    setFDescription(item.notes ?? "")
    setFMinYes(String(item.min_yes ?? 0))
    setFDate(toLocalDateInput(item.start_at))
    setFStart(toLocalTimeInput(item.start_at))
    setFEnd(item.end_at ? toLocalTimeInput(item.end_at) : "")

    await loadTrainingData(item)
  }

  async function loadTrainingData(item: TrainingItem) {
    if (!profile?.player_id) return

   if (item.type === "training" && item.team_id) {
      const { data: tm, error: tmErr } = await supabase
        .from("team_members")
        .select(`player_id, club_players:club_players!team_members_player_id_fkey(id, name, photo_url)`)
        .eq("team_id", item.team_id)
        .is("left_at", null)

      if (tmErr) console.error("team_members error:", tmErr)

      const activePlayerIds = new Set<string>(((tm as any) || []).map((r: any) => r.player_id).filter(Boolean))
      const teamPlayers: TeamPlayer[] = ((tm as any) || []).map((r: any) => r.club_players).filter(Boolean)
      setPlayers(teamPlayers)

      const { data: av } = await supabase
        .from("team_event_availability")
        .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
        .eq("event_id", item.id)

      const rowsAll = (((av as any) || []) as AvailabilityRow[]) ?? []
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
    } else {
      // Öffentliches Training / TrainingsTurnier -> alle Spieler
      const { data: allPlayers } = await supabase
        .from("club_players")
        .select("id,name,photo_url")
        .order("name", { ascending: true })

      const everyone = (((allPlayers as any) || []) as TeamPlayer[]) ?? []
      setPlayers(everyone)

      const { data: av } = await supabase
        .from("team_event_availability")
        .select("player_id,status,note,updated_at, club_players:club_players(id,name,photo_url)")
        .eq("event_id", item.id)

      const rows = (((av as any) || []) as AvailabilityRow[]) ?? []
      setAvailability(rows)

      const mine = rows.find((x) => x.player_id === profile.player_id)
      if (mine) {
        setMyStatus(mine.status)
        setMyNote(mine.note ?? "")
      } else {
        setMyStatus("maybe")
        setMyNote("")
      }
    }

    const { data: c } = await supabase.from("team_event_counts").select("*").eq("event_id", item.id).maybeSingle()
    if (c?.event_id) {
      setCountsByEvent((prev) => {
        const next = new Map(prev)
        next.set(c.event_id, c as any)
        return next
      })
    }
  }

  const availabilityByPlayer = useMemo(() => {
    const m = new Map<string, AvailabilityRow>()
    for (const a of availability) m.set(a.player_id, a)
    return m
  }, [availability])

  async function setAvailabilityStatus(status: AvailabilityStatus) {
    if (!dialogItem || !profile?.player_id) return
    if (isTrainingLocked(dialogItem)) return
    setMyStatus(status)

    await supabase.from("team_event_availability").upsert(
      {
        event_id: dialogItem.id,
        team_id: dialogItem.team_id,
        player_id: profile.player_id,
        status,
        note: myNote,
      },
      { onConflict: "event_id,player_id" }
    )

    await loadTrainingData(dialogItem)
  }

  async function saveNote() {
    if (!dialogItem || !profile?.player_id) return
    if (isTrainingLocked(dialogItem)) return

    await supabase.from("team_event_availability").upsert(
      {
        event_id: dialogItem.id,
        team_id: dialogItem.team_id,
        player_id: profile.player_id,
        status: myStatus,
        note: myNote,
      },
      { onConflict: "event_id,player_id" }
    )

    await loadTrainingData(dialogItem)
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

      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)))
      const { data: profiles } = await supabase.from("user_profiles").select("id, player_id").in("id", profileIds)

      const profileToPlayer = new Map<string, string>()
      ;(profiles as any[] | null)?.forEach((p) => {
        if (p?.id && p?.player_id) profileToPlayer.set(p.id, p.player_id)
      })

      const playerIds = Array.from(new Set((profiles as any[] | null)?.map((p) => p.player_id).filter(Boolean) ?? []))
      const { data: cpRows } = await supabase.from("club_players").select("id,name,photo_url").in("id", playerIds)

      const playerMap = new Map<string, { name: string; photo_url: string | null }>()
      ;(cpRows as any[] | null)?.forEach((p) => {
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
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
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

  async function sendChatMessage() {
    if (!dialogItem || !profile?.id || !activeRoomId) return

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

  function resetCreateForm() {
    const now = new Date()
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
    setFType("training")
setFTitle("Training")
    setFDescription("")
    setFMinYes("6")
    setFDate(today)
    setFStart("19:00")
    setFEnd("21:00")
  }

  async function openCreateDialog() {
    if (!hasLeadershipAnywhere) return
    setDialogItem(null)
    setIsDialogOpen(true)
    setEditMode(true)
    setItemError(null)
    resetCreateForm()
    await loadPlayersForCreate("training")
  }

  async function loadPlayersForCreate(type: TrainingType) {
   if (type === "training") {
      if (!selectedTeamId) return
      const { data: tm } = await supabase
        .from("team_members")
        .select(`player_id, club_players:club_players!team_members_player_id_fkey(id, name, photo_url)`)
        .eq("team_id", selectedTeamId)
        .is("left_at", null)

      const teamPlayers: TeamPlayer[] = ((tm as any) || []).map((r: any) => r.club_players).filter(Boolean)
      setPlayers(teamPlayers)
    } else {
      const { data: allPlayers } = await supabase.from("club_players").select("id,name,photo_url").order("name", { ascending: true })
      setPlayers((((allPlayers as any) || []) as TeamPlayer[]) ?? [])
    }
    setAvailability([])
    setMyStatus("maybe")
    setMyNote("")
  }

  async function saveTrainingCreateOrUpdate() {
    if (!canCreateCurrentType && !canEditItem(dialogItem)) return
    setItemError(null)

    const minYes = Math.max(0, parseInt(fMinYes || "0", 10) || 0)
    const startISO = buildISOFromLocal(fDate, fStart)
    const endISO = fEnd ? buildISOFromLocal(fDate, fEnd) : null

    if (!startISO) {
      setItemError("Bitte Datum & Startzeit angeben.")
      return
    }

   if (fType === "training" && !selectedTeamId && !dialogItem?.team_id) {
      setItemError("Bitte zuerst ein Team auswählen.")
      return
    }

    const resolvedTeamId = fType === "training" ? dialogItem?.team_id ?? selectedTeamId ?? null : null

 const payloadBase = {
  team_id: resolvedTeamId,
  type: fType,
  title: fTitle?.trim() || trainingTypeLabel(fType),
  notes: fDescription?.trim() || null,
  min_yes: minYes,
  start_at: startISO,
  end_at: endISO,
end_at: endISO,
}

    setSavingItem(true)
    try {
      if (dialogItem) {
        const { error } = await supabase.from("team_events").update(payloadBase).eq("id", dialogItem.id)
        if (error) throw error

        await fetchTrainings()

        const { data: fresh } = await supabase.from("team_events").select("*").eq("id", dialogItem.id).maybeSingle()
        if (fresh) {
          setDialogItem(fresh as any)
          await loadTrainingData(fresh as any)
        }
        setEditMode(false)
      } else {
        const { data, error } = await supabase
          .from("team_events")
          .insert({
            created_by: profile?.id ?? null,
            status: "scheduled",
            ...payloadBase,
          })
          .select("*")
          .single()

        if (error) throw error

        await fetchTrainings()

        if (data) {
          setDialogItem(data as any)
          setEditMode(false)
          await loadTrainingData(data as any)
        }
      }
    } catch (e: any) {
  console.error("saveTrainingCreateOrUpdate error", e)
  setItemError(e?.message || e?.details || e?.hint || "Fehler beim Speichern. Bitte nochmal versuchen.")
}
  }

  async function cancelTraining() {
    if (!dialogItem) return
    if (!canEditItem(dialogItem)) return
    setSavingItem(true)
    setItemError(null)
    try {
      const { error } = await supabase.from("team_events").update({ status: "canceled" }).eq("id", dialogItem.id)
      if (error) throw error

      await fetchTrainings()

      const { data: fresh } = await supabase.from("team_events").select("*").eq("id", dialogItem.id).maybeSingle()
      if (fresh) setDialogItem(fresh as any)
    } catch (e) {
      console.error("cancelTraining error", e)
      setItemError("Fehler beim Absagen. Bitte nochmal versuchen.")
    } finally {
      setSavingItem(false)
    }
  }

  const now = Date.now()

  const upcomingItems = useMemo(() => {
    return items
      .filter((e) => {
        const ms = new Date(e.start_at).getTime()
        return Number.isFinite(ms) ? ms >= now && e.status !== "completed" : true
      })
      .slice()
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
  }, [items, now])

  const pastItems = useMemo(() => {
    return items
      .filter((e) => {
        const ms = new Date(e.start_at).getTime()
        return Number.isFinite(ms) ? ms < now || e.status === "completed" : false
      })
      .slice()
      .sort((a, b) => +new Date(b.start_at) - +new Date(a.start_at))
  }, [items, now])

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header variant="app" title="Trainings" subtitle="Übersicht" backHref="/member-profile-app" />
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Trainings werden geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-x-hidden">
      <Header variant="app" title="Trainings" subtitle="Übersicht" backHref="/member-profile-app" />

      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl overflow-x-hidden">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-orange-600" />
              Trainings
            </h1>
            <div className="mt-4">
              <InfoCallout />
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Calendar className="h-6 w-6 text-orange-600" />
                  TeamTraining / Öffentlich / Turnier
                </CardTitle>

                {hasLeadershipAnywhere ? (
                  <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Neu
                  </Button>
                ) : null}
              </div>

              {teamMemberships.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {teamMemberships.map((t) => (
                    <Button
                      key={t.team_id}
                      size="sm"
                      variant={selectedTeamId === t.team_id ? "default" : "outline"}
                      onClick={() => setSelectedTeamId(t.team_id)}
                    >
                      {t.teams?.name ?? "Team"} {leadershipIcon(t.role)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-auto gap-1 p-1">
                  <TabsTrigger value="upcoming" className="py-2">
                    Kommend ({upcomingItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="past" className="py-2">
                    Vergangen ({pastItems.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming">
                  <div className="grid gap-3">
                    {upcomingItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine kommenden Trainings.</div>
                    ) : (
                      upcomingItems.map((item) => {
                        const locked = isTrainingLocked(item)
                        const c = countsByEvent.get(item.id) ?? null
                        const ok = willHappen(item, c)

                        return (
                          <Card
  key={item.id}
  className={`border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl w-full overflow-hidden ${
    locked ? "ring-1 ring-red-200 bg-red-50/20" : ""
  }`}
>
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                                <div className="min-w-0 w-full sm:w-auto text-center sm:text-left">
                                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <div className="font-semibold text-base md:text-lg truncate">{item.title || trainingTypeLabel(item.type)}</div>
                                    {trainingTypeBadge(item.type)}
                                    {trainingStatusBadge(item.status)}
                                    <Badge variant="outline">{getScopeLabel(item)}</Badge>
                                  </div>

                                  {locked ? (
                                    <div className="mt-2 flex justify-center sm:justify-start">
                                      <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                                        Gesperrt (Startzeit überschritten)
                                      </Badge>
                                    </div>
                                  ) : null}

                                  <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start">
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-orange-600" />
                                      {formatDateTime(item.start_at)}
                                      {item.end_at ? `–${formatTime(item.end_at)}` : ""}
                                    </span>
                                  </div>

                                  {item.notes ? <div className="mt-2 text-sm text-gray-700 break-words">{item.notes}</div> : null}

                                  <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    <Badge variant="outline" className="text-xs">
                                      Mindest-Ja: {item.min_yes ?? 0}
                                    </Badge>

                                    {c ? (
                                      <>
                                        <Badge variant="outline" className="text-xs">
                                          Ja: {c.yes_count ?? 0} • Vielleicht: {c.maybe_count ?? 0} • Nein: {c.no_count ?? 0}
                                        </Badge>

                                        {item.status === "canceled" ? (
                                          <Badge className="bg-red-600 text-white">Fällt aus</Badge>
                                        ) : ok === true ? (
                                          <Badge className="bg-green-600 text-white">Findet statt</Badge>
                                        ) : ok === false ? (
                                          <Badge className="bg-yellow-600 text-white">Noch zu wenig Zusagen</Badge>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    onClick={() => openTrainingDialog(item)}
                                    className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                                  >
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

                <TabsContent value="past">
                  <div className="grid gap-3">
                    {pastItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine vergangenen Trainings.</div>
                    ) : (
                      pastItems.map((item) => {
                        const c = countsByEvent.get(item.id) ?? null
                        return (
                          <Card key={item.id} className="border shadow-sm opacity-95 overflow-hidden rounded-2xl">
                            <CardContent className="p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-semibold">{item.title || trainingTypeLabel(item.type)}</div>
                                {trainingTypeBadge(item.type)}
                                {trainingStatusBadge(item.status)}
                                <Badge variant="outline">{getScopeLabel(item)}</Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formatDateTime(item.start_at)}
                                {item.end_at ? `–${formatTime(item.end_at)}` : ""}
                              </div>
                              {item.notes ? <div className="mt-2 text-sm text-gray-700 break-words">{item.notes}</div> : null}
                              {c ? (
                                <div className="mt-2 text-xs text-gray-600">
                                  Ja: {c.yes_count ?? 0} • Vielleicht: {c.maybe_count ?? 0} • Nein: {c.no_count ?? 0}
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(v) => {
              setIsDialogOpen(v)
              if (!v) {
                setDialogItem(null)
                setEditMode(false)
                setItemError(null)
              }
            }}
          >
            <DialogContent
              className="
                w-[96vw]
                max-w-[96vw]
                sm:max-w-[560px]
                max-h-[78vh]
                overflow-y-auto
                overflow-x-hidden
                rounded-2xl
                p-3
              "
            >
              <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
                <DialogTitle>{dialogItem ? "Training – Details" : "Neues Training"}</DialogTitle>
              </DialogHeader>

              {itemError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{itemError}</div>
              ) : null}

              <Card className="border bg-white shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {dialogItem ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-base">{dialogItem.title || trainingTypeLabel(dialogItem.type)}</div>
                        {trainingTypeBadge(dialogItem.type)}
                        {trainingStatusBadge(dialogItem.status)}
                        <Badge variant="outline">{getScopeLabel(dialogItem)}</Badge>
                        {isTrainingLocked(dialogItem) ? (
                          <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
                            Gesperrt
                          </Badge>
                        ) : null}
                      </div>

                      <div className="text-sm text-gray-600 flex flex-col gap-1">
                        <div className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span>
                            {formatDateTime(dialogItem.start_at)}
                            {dialogItem.end_at ? `–${formatTime(dialogItem.end_at)}` : ""}
                          </span>
                        </div>
                      </div>

                      {dialogItem.notes ? (
  <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap break-words">
    {dialogItem.notes}
  </div>
) : null}

                      {(() => {
                        const c = countsByEvent.get(dialogItem.id) ?? null
                        if (!c) return null
                        const ok = willHappen(dialogItem, c)
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Mindest-Ja: {dialogItem.min_yes ?? 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Ja: {c.yes_count ?? 0} • Vielleicht: {c.maybe_count ?? 0} • Nein: {c.no_count ?? 0}
                            </Badge>
                            {dialogItem.status === "canceled" ? (
                              <Badge className="bg-red-600 text-white">Fällt aus</Badge>
                            ) : ok === true ? (
                              <Badge className="bg-green-600 text-white">Findet statt</Badge>
                            ) : ok === false ? (
                              <Badge className="bg-yellow-600 text-white">Noch zu wenig Zusagen</Badge>
                            ) : null}
                          </div>
                        )
                      })()}
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">Erstelle TeamTraining, Öffentliches Training oder TrainingsTurnier.</div>
                  )}

                  {canEditItem(dialogItem) ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {dialogItem && !editMode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const item = dialogItem
                            setEditMode(true)
                            setItemError(null)
                            setFType(item.type)
                            setFTitle(item.title ?? trainingTypeLabel(item.type))
                            setFDescription(item.notes ?? "")
                            setFMinYes(String(item.min_yes ?? 0))
                            setFDate(toLocalDateInput(item.start_at))
                            setFStart(toLocalTimeInput(item.start_at))
                            setFEnd(item.end_at ? toLocalTimeInput(item.end_at) : "")
                            await loadPlayersForCreate(item.type)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </Button>
                      ) : null}

                      {dialogItem ? (
                        <Button size="sm" variant="outline" onClick={cancelTraining} disabled={savingItem || dialogItem.status === "canceled"}>
                          {savingItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                          Absagen
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {editMode ? (
                <Card className="border bg-white shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Save className="h-4 w-4 text-orange-600" />
                      {dialogItem ? "Training bearbeiten" : "Training erstellen"}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="text-xs text-gray-500">Typ</div>
                      <div className="flex flex-wrap gap-2">
                        {(["training", "double_training", "special"] as TrainingType[]).map((t) => (
                          <Button
                            key={t}
                            size="sm"
                            variant={fType === t ? "default" : "outline"}
                            onClick={async () => {
                              setFType(t)
                             if (t === "training") {
  setFTitle("Training")
} else if (t === "double_training") {
  setFTitle("Doppeltraining")
} else {
  setFTitle("Spezial / Turnier")
}
                              await loadPlayersForCreate(t)
                            }}
                          >
                            {trainingTypeLabel(t)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {fType === "team_training" ? (
                      <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                        Gilt nur für Team: <span className="font-medium">{selectedMembership?.teams?.name ?? "Bitte Team wählen"}</span>
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-blue-50 p-3 text-sm text-blue-900">
                        Dieses Training ist für <span className="font-medium">alle Spieler</span> sichtbar.
                      </div>
                    )}

                    <div className="grid gap-2">
                      <div className="text-xs text-gray-500">Titel</div>
                      <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="z.B. TeamTraining" />
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs text-gray-500">Beschreibung (optional)</div>
                      <Textarea
                        value={fDescription}
                        onChange={(e) => setFDescription(e.target.value)}
                        placeholder="zbs. Edart - Steeldart - Modus - Trainigseinheit"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs text-gray-500">Mindestanzahl „Ja“</div>
                      <Input
                        inputMode="numeric"
                        value={fMinYes}
                        onChange={(e) => setFMinYes(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="z.B. 6"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs text-gray-500">Datum & Uhrzeit</div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                        <Input type="time" value={fStart} onChange={(e) => setFStart(e.target.value)} />
                        <Input type="time" value={fEnd} onChange={(e) => setFEnd(e.target.value)} placeholder="Ende (optional)" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false)
                          setItemError(null)
                        }}
                        disabled={savingItem}
                      >
                        Abbrechen
                      </Button>

                      <Button
                        onClick={saveTrainingCreateOrUpdate}
                        disabled={savingItem || (!dialogItem && !canCreateCurrentType)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {savingItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Speichern
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {dialogItem ? (
                <Card className={`border bg-white shadow-sm rounded-2xl overflow-hidden ${isTrainingLocked(dialogItem) ? "opacity-80" : ""}`}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      Zusage
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={myStatus === "yes" ? "default" : "outline"}
                        onClick={() => setAvailabilityStatus("yes")}
                        className={myStatus === "yes" ? "bg-green-600 hover:bg-green-700" : ""}
                        disabled={isTrainingLocked(dialogItem) || dialogItem.status === "canceled"}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Ja
                      </Button>

                      <Button
                        variant={myStatus === "maybe" ? "default" : "outline"}
                        onClick={() => setAvailabilityStatus("maybe")}
                        className={myStatus === "maybe" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                        disabled={isTrainingLocked(dialogItem) || dialogItem.status === "canceled"}
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Vielleicht
                      </Button>

                      <Button
                        variant={myStatus === "no" ? "default" : "outline"}
                        onClick={() => setAvailabilityStatus("no")}
                        className={myStatus === "no" ? "bg-red-600 hover:bg-red-700" : ""}
                        disabled={isTrainingLocked(dialogItem) || dialogItem.status === "canceled"}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Nein
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">Notiz (optional)</div>
                      <Textarea
                        value={myNote}
                        onChange={(e) => setMyNote(e.target.value)}
                        placeholder="z.B. komme 10 min später"
                        disabled={isTrainingLocked(dialogItem) || dialogItem.status === "canceled"}
                      />
                      <Button variant="secondary" onClick={saveNote} disabled={isTrainingLocked(dialogItem) || dialogItem.status === "canceled"}>
                        Notiz speichern
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {dialogItem ? (
                <Card className="border bg-white shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Zusagen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {players.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Keine Spieler gefunden.</div>
                    ) : (
                      players.map((p) => {
                        const a = availabilityByPlayer.get(p.id)
                        const s = a?.status ?? "none"
                        return (
                          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 gap-3 min-w-0 overflow-hidden">
                            <div className="min-w-0 w-full sm:w-auto text-center sm:text-left">
                              <div className="font-medium truncate">{p.name}</div>
                              {a?.note ? <div className="text-xs text-gray-500 truncate">{a.note}</div> : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 justify-center sm:justify-end">
                              {statusBadge(s as any)}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {dialogItem ? (
                <Card className="border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl mx-auto w-full max-w-3xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-orange-600" />
                      Chat
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {!activeRoomId ? (
                      <div className="text-sm text-muted-foreground">Kein Chat verfügbar.</div>
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
                              <div className="text-sm text-muted-foreground">Noch keine Nachrichten.</div>
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
                                            {new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
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
                            placeholder="Nachricht…"
                            className="flex-1 min-w-0"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                sendChatMessage()
                              }
                            }}
                            disabled={chatSending}
                          />
                          <Button
                            onClick={sendChatMessage}
                            disabled={!chatText.trim() || chatSending}
                            className="bg-orange-600 hover:bg-orange-700 px-3 flex-shrink-0"
                          >
                            {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Schließen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default function MemberTrainingsPage() {
  return (
    <Suspense fallback={null}>
      <MemberTrainingsInner />
    </Suspense>
  )
}
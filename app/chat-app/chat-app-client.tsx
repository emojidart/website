"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Clock, Hash, Menu, X, ArrowLeft, Shield, Users, Info, Coffee } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useRouter, useSearchParams } from "next/navigation"

type ChatScope = "team" | "captains" | "club" | "freizeit" | "vorstand"

// GLOBAL room ids (müssen zum SQL passen)
const CLUB_ROOM_ID = "11111111-1111-1111-1111-111111111111"
const FREIZEIT_ROOM_ID = "22222222-2222-2222-2222-222222222222"
const VORSTAND_ROOM_ID = "33333333-3333-3333-3333-333333333333"
const CAPTAINS_ROOM_ID = "44444444-4444-4444-4444-444444444444"

// Rollen-Tabelle (falls du sie anders benannt hast, hier anpassen)
const ROLE_TABLE = "club_roles"
const ROLE_COL = "role"
const ROLE_PROFILE_COL = "user_id"

// Wer darf in den Vorstand-Chat?
const BOARD_ROLES = ["Vorstand", "Kassier", "Schriftführer"]

type ChatMessage = {
  id: string
  user_id: string // FK -> user_profiles.id (NOT auth.uid)
  message: string
  room_id: string // uuid as string
  scope: ChatScope
  created_at: string
  sender_player_id?: string | null
  sender?: { name: string; photo_url: string | null } | null
}

type TeamRoom = {
  id: string // ✅ chat_rooms.id (teams.chat_room_id)
  team_id: string // ✅ teams.id (für Members-Liste)
  name: string
  description: string | null
  created_at?: string
  logo_url?: string | null
  role?: string | null // Player | Captain | Co-Captain
}

type UserProfileLite = {
  id: string
  user_id: string
  player_id: string | null
}

type TeamMember = {
  player_id: string
  name: string
  photo_url: string | null
  role: string | null
}

type VorstandMember = {
  player_id: string
  name: string
  photo_url: string | null
  role: string | null
}

function formatTimeVienna(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return ""
  }
}

function formatDateShortVienna(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return ""
  }
}

function dateKeyVienna(iso: string) {
  try {
    const dt = new Date(iso)
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Vienna",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(dt)
    const y = parts.find((p) => p.type === "year")?.value ?? "1970"
    const m = parts.find((p) => p.type === "month")?.value ?? "01"
    const d = parts.find((p) => p.type === "day")?.value ?? "01"
    return `${y}-${m}-${d}`
  } catch {
    return iso.slice(0, 10)
  }
}

function dateLabelVienna(iso: string) {
  try {
    const now = new Date()
    const todayKey = dateKeyVienna(now.toISOString())
    const msgKey = dateKeyVienna(iso)

    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yKey = dateKeyVienna(yest.toISOString())

    if (msgKey === todayKey) return "Heute"
    if (msgKey === yKey) return "Gestern"
    const d = formatDateShortVienna(iso)
    return d || "—"
  } catch {
    return formatDateShortVienna(iso) || "—"
  }
}

function initials(name: string) {
  const n = (name || "").trim()
  if (!n) return "?"
  const parts = n.split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? "?"
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return (a + b).toUpperCase()
}

export default function TeamChatPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ Query-Params nur 1x beim ersten Render einfrieren
  const initialParamsRef = useRef<{ roomId: string | null; scope: ChatScope | null } | null>(null)
  const initialAppliedRef = useRef(false)

  if (!initialParamsRef.current) {
    const scopeRaw = searchParams.get("scope") as ChatScope | null
    const scope: ChatScope | null =
      scopeRaw && (["team", "captains", "club", "freizeit", "vorstand"] as const).includes(scopeRaw) ? scopeRaw : null

    // ✅ Push/DeepLink nutzt room_id
    initialParamsRef.current = {
      roomId: searchParams.get("room_id"),
      scope,
    }
  }

  const [profile, setProfile] = useState<UserProfileLite | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [chatRooms, setChatRooms] = useState<TeamRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<TeamRoom | null>(null)

  // selectedScope determines which chat is shown
  const [selectedScope, setSelectedScope] = useState<ChatScope>("team")

  const [roomsLoading, setRoomsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Vorstand (club_roles.role = "Vorstand") can see/write in all chats
  const [isVorstand, setIsVorstand] = useState(false)
  const [canSeeVorstandChat, setCanSeeVorstandChat] = useState(false)

  const fetchIsVorstand = async () => {
    if (!profile?.user_id) return
    const { data, error } = await supabase.from("club_roles").select("role").eq("user_id", profile?.user_id)

    if (!error && data) {
      const isV = data.some((r: any) => r.role === "Vorstand")
      setIsVorstand(isV)
      setCanSeeVorstandChat(isV)
    }
  }

  const [vorstandMembers, setVorstandMembers] = useState<VorstandMember[]>([])
  const vorstandPlayerIdSet = useMemo(() => {
    return new Set((vorstandMembers || []).map((m) => m.player_id).filter(Boolean))
  }, [vorstandMembers])

  // unreadCounts key: `${roomId}:${scope}`
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Team members (selected team) for Team-Chat header
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // GLOBAL captains/co-captains across all teams
  const [globalCaptains, setGlobalCaptains] = useState<TeamMember[]>([])
  const [globalCaptainsLoading, setGlobalCaptainsLoading] = useState(false)

  const applyInitialSelection = (rooms: TeamRoom[]) => {
    if (initialAppliedRef.current) return
    const init = initialParamsRef.current
    if (!init) return

    const scopeToUse: ChatScope = init.scope ?? "team"

    // Scope setzen (mit Access-Checks)
    if (scopeToUse === "vorstand" && !canSeeVorstandChat && !isVorstand) {
      // kein Zugriff -> ignorieren
    } else if (scopeToUse === "captains") {
      // Zugriff-Check passiert später via canSeeCaptainChat effect
      setSelectedScope("captains")
    } else if (scopeToUse !== "team") {
      setSelectedScope(scopeToUse)
    } else {
      setSelectedScope("team")
    }

    // Teamraum auswählen falls team + room_id (chat_room_id)
    if (scopeToUse === "team" && init.roomId) {
      const found = rooms.find((r) => r.id === init.roomId) ?? null
      if (found) setSelectedRoom(found)
    }

    initialAppliedRef.current = true
  }

  useEffect(() => {
    if (!profile?.id) return

    // Vorstand sieht ALLE Team-Chats (auch ohne Spieler-Zuordnung)
    if (isVorstand) {
      fetchAllTeamRooms()
      return
    }

    // Alle anderen: nur eigene Team-Chats (über team_members)
    if (profile.player_id) {
      fetchMyTeamRooms(profile.player_id)
    } else {
      setChatRooms([])
      setSelectedRoom(null)
      setRoomsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.player_id, isVorstand])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!session?.user?.id) return
    loadMyProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (profile && profile.player_id) {
      fetchMyTeamRooms(profile.player_id)
    } else if (profile && !profile.player_id) {
      setChatRooms([])
      setSelectedRoom(null)
      setRoomsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.player_id])

  // Load global captains once profile exists
  useEffect(() => {
    if (!profile?.id) return
    fetchAllCaptains()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Load board access + board members once profile exists
  useEffect(() => {
    if (!profile?.id) return
    fetchVorstandAccess()
    fetchIsVorstand()
    fetchVorstandMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Load messages whenever target changes
  useEffect(() => {
    fetchMessages()
    markCurrentAsVisited()

    // ✅ Team members brauchen TEAM-ID, nicht room-id
    if (selectedScope === "team" && selectedRoom?.team_id) fetchTeamMembers(selectedRoom.team_id)
    if (selectedScope !== "team") setTeamMembers([])

    const unsubscribe = subscribeToMessages()
    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, selectedRoom?.team_id, selectedScope, canSeeVorstandChat])

  const canSeeCaptainChat = useMemo(() => {
    // Zugriff auf globalen Captain-Chat, wenn du in irgendeinem Team Captain/Co-Captain bist
    return chatRooms.some((r) => r.role === "Captain" || r.role === "Co-Captain")
  }, [chatRooms])

  useEffect(() => {
    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) setSelectedScope("team")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScope, canSeeCaptainChat, isVorstand])

  const currentRoomId = useMemo(() => {
    if (selectedScope === "club") return CLUB_ROOM_ID
    if (selectedScope === "freizeit") return FREIZEIT_ROOM_ID
    if (selectedScope === "vorstand") return VORSTAND_ROOM_ID
    if (selectedScope === "captains") return CAPTAINS_ROOM_ID
    return selectedRoom?.id ?? null // ✅ chat_rooms.id
  }, [selectedScope, selectedRoom?.id])

  const selectedRoomName = useMemo(() => {
    if (selectedScope === "club") return "Vereinsinfo"
    if (selectedScope === "freizeit") return "Freizeit"
    if (selectedScope === "vorstand") return "Vorstand"
    if (selectedScope === "captains") return "Captain-Chat"
    if (!selectedRoom) return "Team-Chat"
    return selectedRoom.name
  }, [selectedRoom, selectedScope])

  const unreadKey = (roomId: string, scope: ChatScope) => `${roomId}:${scope}`

  const loadMyProfile = async () => {
    try {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session!.user.id)
        .maybeSingle()

      if (error) throw error
      setProfile((data as any) ?? null)
    } catch (e) {
      console.error("loadMyProfile error", e)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const fetchAllTeamRooms = async () => {
    try {
      setRoomsLoading(true)

      const { data: teams, error } = await supabase
        .from("teams")
        .select("id, name, description, created_at, logo_url, chat_room_id")
        .order("name", { ascending: true })

      if (error) throw error

      const rooms: TeamRoom[] =
        (teams || [])
          .map((t: any) => {
            if (!t?.id || !t?.chat_room_id) return null
            return {
              id: t.chat_room_id, // ✅ chat_rooms.id
              team_id: t.id, // ✅ teams.id
              name: t.name,
              description: t.description ?? null,
              created_at: t.created_at,
              logo_url: t.logo_url ?? null,
              role: "Vorstand",
            } as TeamRoom
          })
          .filter(Boolean) || []

      rooms.sort((a, b) => (a.name || "").localeCompare(b.name || ""))

      setChatRooms(rooms)

      // ✅ URL-Auswahl anwenden (nur 1x)
      applyInitialSelection(rooms)

      if (!["club", "freizeit", "vorstand", "captains"].includes(selectedScope)) {
        let nextSelected = selectedRoom
        if (!nextSelected && rooms.length > 0) nextSelected = rooms[0]
        if (nextSelected && !rooms.find((r) => r.id === nextSelected!.id)) nextSelected = rooms[0] ?? null
        setSelectedRoom(nextSelected ?? null)
      }

      setTimeout(() => fetchUnreadCounts(rooms), 150)
    } catch (error) {
      console.error("Error fetching all team rooms:", error)
      toast({
        title: "Fehler",
        description: "Die Team-Chats konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setRoomsLoading(false)
    }
  }

  const fetchMyTeamRooms = async (playerId: string) => {
    try {
      setRoomsLoading(true)

      const { data: memberships, error: membershipsError } = await supabase
        .from("team_members")
        .select("role, teams:teams(id, name, description, created_at, logo_url, chat_room_id)")
        .eq("player_id", playerId)
        .is("left_at", null)

      if (membershipsError) throw membershipsError

      const rooms: TeamRoom[] =
        (memberships || [])
          .map((m: any) => {
            const t = m.teams
            if (!t?.id || !t?.chat_room_id) return null
            return {
              id: t.chat_room_id, // ✅ chat_rooms.id
              team_id: t.id, // ✅ teams.id
              name: t.name,
              description: t.description ?? null,
              created_at: t.created_at,
              logo_url: t.logo_url ?? null,
              role: m.role ?? null,
            } as TeamRoom
          })
          .filter(Boolean) || []

      rooms.sort((a, b) => (a.name || "").localeCompare(b.name || ""))

      setChatRooms(rooms)

      // ✅ URL-Auswahl anwenden (nur 1x)
      applyInitialSelection(rooms)

      if (!["club", "freizeit", "vorstand", "captains"].includes(selectedScope)) {
        let nextSelected = selectedRoom
        if (!nextSelected && rooms.length > 0) nextSelected = rooms[0]
        if (nextSelected && !rooms.find((r) => r.id === nextSelected!.id)) nextSelected = rooms[0] ?? null
        setSelectedRoom(nextSelected ?? null)
      }

      setTimeout(() => fetchUnreadCounts(rooms), 150)
    } catch (error) {
      console.error("Error fetching my team rooms:", error)
      toast({
        title: "Fehler",
        description: "Deine Team-Chats konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setRoomsLoading(false)
    }
  }

  const fetchTeamMembers = async (teamId: string) => {
    try {
      setMembersLoading(true)

      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id, role")
        .eq("team_id", teamId)
        .is("left_at", null)

      if (memErr) throw memErr

      const rows = (mems as any[] | null) ?? []
      const playerIds = Array.from(new Set(rows.map((r) => r.player_id).filter(Boolean)))

      if (playerIds.length === 0) {
        setTeamMembers([])
        return
      }

      const { data: players, error: pErr } = await supabase.from("club_players").select("id, name, photo_url").in("id", playerIds)

      if (pErr) throw pErr

      const pMap = new Map<string, { name: string; photo_url: string | null }>()
      ;(players as any[] | null)?.forEach((p) => {
        if (p?.id) pMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null })
      })

      const full: TeamMember[] = rows
        .map((r) => {
          const p = pMap.get(r.player_id)
          if (!p) return null
          return {
            player_id: r.player_id,
            name: p.name,
            photo_url: p.photo_url ?? null,
            role: r.role ?? null,
          } as TeamMember
        })
        .filter(Boolean) as any

      const roleRank = (role: string | null) => {
        if (role === "Captain") return 0
        if (role === "Co-Captain") return 1
        return 2
      }

      full.sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role)
        if (rr !== 0) return rr
        return (a.name || "").localeCompare(b.name || "")
      })

      setTeamMembers(full)
    } catch (e) {
      console.error("fetchTeamMembers error", e)
      setTeamMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchAllCaptains = async () => {
    try {
      setGlobalCaptainsLoading(true)

      const { data: mems, error: memErr } = await supabase
        .from("team_members")
        .select("player_id, role")
        .in("role", ["Captain", "Co-Captain"])
        .is("left_at", null)

      if (memErr) throw memErr

      const rows = (mems as any[] | null) ?? []
      const playerIds = Array.from(new Set(rows.map((r) => r.player_id).filter(Boolean)))

      if (playerIds.length === 0) {
        setGlobalCaptains([])
        return
      }

      const { data: players, error: pErr } = await supabase.from("club_players").select("id, name, photo_url").in("id", playerIds)

      if (pErr) throw pErr

      const pMap = new Map<string, { name: string; photo_url: string | null }>()
      ;(players as any[] | null)?.forEach((p) => {
        if (p?.id) pMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null })
      })

      const unique: TeamMember[] = playerIds
        .map((pid) => {
          const p = pMap.get(pid)
          if (!p) return null
          const roles = rows.filter((r) => r.player_id === pid).map((r) => r.role)
          const role = roles.includes("Captain") ? "Captain" : "Co-Captain"
          return { player_id: pid, name: p.name, photo_url: p.photo_url, role }
        })
        .filter(Boolean) as any

      unique.sort((a, b) => {
        const rank = (r: string | null) => (r === "Captain" ? 0 : 1)
        const rr = rank(a.role) - rank(b.role)
        if (rr !== 0) return rr
        return (a.name || "").localeCompare(b.name || "")
      })

      setGlobalCaptains(unique)
    } catch (e) {
      console.error("fetchAllCaptains error", e)
      setGlobalCaptains([])
    } finally {
      setGlobalCaptainsLoading(false)
    }
  }

  const fetchVorstandAccess = async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_COL}`)
        .eq(ROLE_PROFILE_COL, session!.user.id)
        .in(ROLE_COL, BOARD_ROLES)

      if (error) throw error
      setCanSeeVorstandChat(((data as any[]) ?? []).length > 0)
    } catch (e) {
      console.error("fetchVorstandAccess error", e)
      setCanSeeVorstandChat(false)
    }
  }

  const fetchVorstandMembers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from(ROLE_TABLE)
        .select(`${ROLE_PROFILE_COL}, role`)
        .in("role", BOARD_ROLES)

      if (rolesError) throw rolesError

      const authUserIds = Array.from(new Set(((roles as any[]) || []).map((r) => r?.[ROLE_PROFILE_COL]).filter(Boolean)))

      if (authUserIds.length === 0) {
        setVorstandMembers([])
        return
      }

      const roleByAuthUserId = new Map<string, string>()
      ;((roles as any[]) || []).forEach((r) => {
        const uid = r?.[ROLE_PROFILE_COL]
        if (uid) roleByAuthUserId.set(uid, r.role)
      })

      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, user_id, player_id")
        .in("user_id", authUserIds)

      if (profilesError) throw profilesError

      const playerIds = Array.from(new Set(((profiles as any[]) || []).map((p) => p.player_id).filter(Boolean)))

      if (playerIds.length === 0) {
        setVorstandMembers([])
        return
      }

      const { data: players, error: playersError } = await supabase.from("club_players").select("id, name, photo_url").in("id", playerIds)

      if (playersError) throw playersError

      const playerMap = new Map<string, { name: string; photo_url: string | null }>()
      ;((players as any[]) || []).forEach((p) => {
        if (p?.id) playerMap.set(p.id, { name: p.name, photo_url: p.photo_url ?? null })
      })

      const members: TeamMember[] = ((profiles as any[]) || [])
        .map((p) => {
          const info = playerMap.get(p.player_id)
          if (!info) return null
          const role = roleByAuthUserId.get(p.user_id) ?? "Vorstand"
          return { player_id: p.player_id, name: info.name, photo_url: info.photo_url, role }
        })
        .filter(Boolean) as any

      members.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      setVorstandMembers(members)
    } catch (e) {
      console.error("fetchVorstandMembers error", e)
      setVorstandMembers([])
    }
  }

  const fetchMessages = async () => {
    if (selectedScope === "team") {
      if (!selectedRoom) {
        setMessages([])
        return
      }
    }

    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) {
      setMessages([])
      return
    }

    if (selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand) {
      setMessages([])
      return
    }

    const roomId = currentRoomId
    if (!roomId) {
      setMessages([])
      return
    }

    try {
      setLoading(true)

      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id,user_id,message,room_id,scope,created_at")
        .eq("room_id", roomId)
        .eq("scope", selectedScope)
        .order("created_at", { ascending: true })
        .limit(200)

      if (messagesError) throw messagesError

      const rows = (messagesData as any[]) || []
      if (rows.length === 0) {
        setMessages([])
        return
      }

      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)))

      const { data: profiles } = await supabase.from("user_profiles").select("id,player_id").in("id", profileIds)

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

      const withSender = rows.map((r) => {
        const playerId = profileToPlayer.get(r.user_id)
        const sender = playerId ? playerMap.get(playerId) ?? null : null
        return { ...r, sender_player_id: playerId ?? null, sender }
      })

      setMessages(withSender as any)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const roomId = currentRoomId
    if (!roomId) return () => {}

    const channel = supabase
      .channel(`chat_messages_${roomId}_${selectedScope}`)
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
          if ((incoming.scope as ChatScope) !== selectedScope) return

          const { data: prof } = await supabase.from("user_profiles").select("player_id").eq("id", incoming.user_id).maybeSingle()

          let sender: { name: string; photo_url: string | null } | null = null
          const playerId = (prof as any)?.player_id
          if (playerId) {
            const { data: cp } = await supabase.from("club_players").select("name,photo_url").eq("id", playerId).maybeSingle()
            if (cp) sender = { name: (cp as any).name, photo_url: (cp as any).photo_url ?? null }
          }

          setMessages((prev) => [...prev, { ...incoming, sender_player_id: playerId ?? null, sender }])

          if (incoming.user_id !== profile?.id) {
            fetchUnreadCounts(chatRooms)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) {
      toast({ title: "Kein Zugriff", description: "Du bist nicht Captain/Co-Captain.", variant: "destructive" })
      return
    }

    if (selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand) {
      toast({ title: "Kein Zugriff", description: "Du bist nicht im Vorstand.", variant: "destructive" })
      return
    }

    if (selectedScope === "team" && !selectedRoom) return

    if (!profile?.id) {
      toast({
        title: "Profil fehlt",
        description: "Dein Benutzerprofil ist nicht eingerichtet. Bitte melde dich beim Admin.",
        variant: "destructive",
      })
      return
    }

    const roomId = currentRoomId
    if (!roomId) return

    try {
      setSending(true)

      const msg = newMessage.trim()

      const { error } = await supabase.from("chat_messages").insert({
        user_id: profile.id,
        message: msg,
        room_id: roomId,
        scope: selectedScope,
      })

      if (error) throw error

      setNewMessage("")
      markCurrentAsVisited()

      // ✅ Push (best-effort, nie blockieren)
      const token = session?.access_token

      if (token) {
        fetch("/api/push/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            room_id: roomId,
            scope: selectedScope,
            message: msg,
            sender_profile_id: profile.id,
          }),
        }).catch(() => {})
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const fetchUnreadCounts = async (roomsOverride?: TeamRoom[]) => {
    const rooms = roomsOverride ?? chatRooms
    if (!profile?.id) return

    try {
      const counts: Record<string, number> = {}

      const computeGlobalUnread = async (roomId: string, scope: ChatScope) => {
        const { data: visitData } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", roomId)
          .eq("scope", scope)
          .maybeSingle()

        const lastVisit = (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("scope", scope)
          .gt("created_at", lastVisit)
          .neq("user_id", profile.id)

        counts[unreadKey(roomId, scope)] = count || 0
      }

      await computeGlobalUnread(CLUB_ROOM_ID, "club")
      await computeGlobalUnread(FREIZEIT_ROOM_ID, "freizeit")

      if (canSeeVorstandChat) {
        await computeGlobalUnread(VORSTAND_ROOM_ID, "vorstand")
      } else {
        counts[unreadKey(VORSTAND_ROOM_ID, "vorstand")] = 0
      }

      // Globaler Captain-Chat (einmal für alle Teams)
      if (canSeeCaptainChat) {
        await computeGlobalUnread(CAPTAINS_ROOM_ID, "captains")
      } else {
        counts[unreadKey(CAPTAINS_ROOM_ID, "captains")] = 0
      }

      for (const room of rooms) {
        const scope: ChatScope = "team"

        const { data: visitData } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", room.id)
          .eq("scope", scope)
          .maybeSingle()

        const lastVisit = (visitData as any)?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("scope", scope)
          .gt("created_at", lastVisit)
          .neq("user_id", profile.id)

        counts[unreadKey(room.id, scope)] = count || 0
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const markRoomAsVisited = async (roomId: string, scope: ChatScope) => {
    if (!profile?.id) return

    try {
      await supabase.from("user_room_visits").upsert(
        {
          user_id: profile.id,
          room_id: roomId,
          scope,
          last_visit_at: new Date().toISOString(),
        },
        { onConflict: "user_id,room_id,scope" },
      )

      setUnreadCounts((prev) => ({ ...prev, [unreadKey(roomId, scope)]: 0 }))
    } catch (error) {
      console.error("Error marking room as visited:", error)
    }
  }

  const markCurrentAsVisited = async () => {
    const roomId = currentRoomId
    if (!roomId) return
    await markRoomAsVisited(roomId, selectedScope)
  }

  // WhatsApp-Style (Orange Theme) – nur Styling, keine Logikänderung
  const WA = {
    appBg: "bg-[#efeae2] text-foreground",
    card: "border-0 shadow-lg rounded-2xl",
    header: "bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-black/5 rounded-t-2xl",
    sidebarItemBase:
      "w-full justify-start h-auto p-3 text-left rounded-xl hover:bg-orange-50/70 active:bg-orange-50",
    sidebarItemSelected: "bg-orange-600 hover:bg-orange-600/90 text-white shadow-sm",
    sidebarItemUnselected: "text-slate-900",
    iconBadge: "bg-orange-100 text-orange-700",
    iconInSelected: "text-white",
    iconInUnselected: "text-orange-600",
    unreadBadge:
      "ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg",
    chatBg: "bg-[#efeae2]",
    bubbleOwn: "bg-orange-600 text-white rounded-2xl rounded-br-md shadow-sm",
    bubbleOther: "bg-white text-slate-900 border border-slate-200 rounded-2xl rounded-bl-md shadow-sm",
    composer: "bg-white/90 backdrop-blur border-t border-black/5",
    input: "bg-white border-slate-200 focus-visible:ring-orange-500/40",
    sendBtn: "bg-orange-600 hover:bg-orange-600/90 text-white",
  }

  const clubUnread = unreadCounts[unreadKey(CLUB_ROOM_ID, "club")] || 0
  const freizeitUnread = unreadCounts[unreadKey(FREIZEIT_ROOM_ID, "freizeit")] || 0
  const vorstandUnread = unreadCounts[unreadKey(VORSTAND_ROOM_ID, "vorstand")] || 0
  const captainsUnread = unreadCounts[unreadKey(CAPTAINS_ROOM_ID, "captains")] || 0

  const headerPeople = useMemo(() => {
    if (selectedScope === "team") return teamMembers
    if (selectedScope === "captains") return globalCaptains
    if (selectedScope === "vorstand") return vorstandMembers as any
    return []
  }, [selectedScope, teamMembers, globalCaptains, vorstandMembers])

  const headerPeopleLoading = useMemo(() => {
    if (selectedScope === "team") return membersLoading
    if (selectedScope === "captains") return globalCaptainsLoading
    return false
  }, [selectedScope, membersLoading, globalCaptainsLoading])

  const renderedStream = useMemo(() => {
    const out: Array<{ type: "date"; key: string; label: string } | { type: "msg"; msg: ChatMessage }> = []
    let lastKey: string | null = null

    for (const m of messages) {
      const k = dateKeyVienna(m.created_at)
      if (k !== lastKey) {
        out.push({ type: "date", key: k, label: dateLabelVienna(m.created_at) })
        lastKey = k
      }
      out.push({ type: "msg", msg: m })
    }
    return out
  }, [messages])

  const showNoProfile = !profileLoading && !profile

  if (!session) {
    return (
      <div className={`min-h-[100dvh] flex flex-col ${WA.appBg}`}>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className={`w-full max-w-md ${WA.card}`}>
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground mb-4">Bitte melden Sie sich an, um den Chat zu verwenden.</p>
              <Button onClick={() => router.push("/member-login")} className={WA.sendBtn}>
                Zur Anmeldung
              </Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden ${WA.appBg}`}>
      {/* ✅ Wichtig: Seite selbst darf nicht scrollen -> nur die Chat-ScrollArea */}
      <main className="flex-1 min-h-0 overflow-hidden pt-3 pb-[env(safe-area-inset-bottom)]">
        <div className="container mx-auto px-4 max-w-6xl h-full">
          <div className="flex flex-col h-full min-h-0">
            <div className="mb-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/member-profile-app")}
                className="bg-white hover:bg-orange-50 text-slate-900 border border-slate-200 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zum Profil
              </Button>
            </div>

            {showNoProfile ? (
              <Card className={`${WA.card} shrink-0`}>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Profil fehlt</h2>
                  <p className="text-muted-foreground mb-4">
                    Für diesen Account gibt es keinen Eintrag in <code>user_profiles</code>. Bitte melde dich beim Admin.
                  </p>
                  <Button onClick={() => router.push("/member-profile-app")} className={WA.sendBtn}>
                    Zurück
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

                {/* Sidebar */}
                <div
                  className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-72 xl:w-80 transform ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                  } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
                >
                  <Card className={`h-full ${WA.card} flex flex-col min-h-0 overflow-hidden`}>
                    <CardHeader className={`pb-3 ${WA.header} shrink-0`}>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Hash className="h-5 w-5 text-orange-600" />
                          Chats
                        </CardTitle>

                        <div className="flex items-center gap-2">
                          {isVorstand && (
                            <Badge variant="secondary" className={`gap-1 ${WA.iconBadge}`}>
                              <Shield className="h-3.5 w-3.5" />
                              Vorstand
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-2 border-b border-black/5">
                          <Button
                            variant="ghost"
                            className={`${WA.sidebarItemBase} ${selectedScope === "club" ? WA.sidebarItemSelected : WA.sidebarItemUnselected}`}
                            onClick={() => {
                              setSelectedScope("club")
                              setSidebarOpen(false)
                              setTimeout(() => markRoomAsVisited(CLUB_ROOM_ID, "club"), 50)
                            }}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  selectedScope === "club" ? "bg-white/20" : "bg-orange-100"
                                }`}
                              >
                                <Info className={`h-4 w-4 ${selectedScope === "club" ? WA.iconInSelected : WA.iconInUnselected}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">Vereinsinfo</div>
                                <p className={`text-xs mt-1 truncate ${selectedScope === "club" ? "text-white/80" : "text-muted-foreground"}`}>
                                  Für alle Mitglieder
                                </p>
                              </div>

                              {clubUnread > 0 && (
                                <Badge variant="destructive" className={WA.unreadBadge}>
                                  {clubUnread > 99 ? "99+" : clubUnread}
                                </Badge>
                              )}
                            </div>
                          </Button>

                          <Button
                            variant="ghost"
                            className={`${WA.sidebarItemBase} mt-1 ${selectedScope === "freizeit" ? WA.sidebarItemSelected : WA.sidebarItemUnselected}`}
                            onClick={() => {
                              setSelectedScope("freizeit")
                              setSidebarOpen(false)
                              setTimeout(() => markRoomAsVisited(FREIZEIT_ROOM_ID, "freizeit"), 50)
                            }}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  selectedScope === "freizeit" ? "bg-white/20" : "bg-orange-100"
                                }`}
                              >
                                <Coffee className={`h-4 w-4 ${selectedScope === "freizeit" ? WA.iconInSelected : WA.iconInUnselected}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">Freizeit</div>
                                <p className={`text-xs mt-1 truncate ${selectedScope === "freizeit" ? "text-white/80" : "text-muted-foreground"}`}>
                                  Für alle Mitglieder
                                </p>
                              </div>

                              {freizeitUnread > 0 && (
                                <Badge variant="destructive" className={WA.unreadBadge}>
                                  {freizeitUnread > 99 ? "99+" : freizeitUnread}
                                </Badge>
                              )}
                            </div>
                          </Button>

                          {(canSeeCaptainChat || isVorstand) && (
                            <Button
                              variant="ghost"
                              className={`${WA.sidebarItemBase} mt-1 ${
                                selectedScope === "captains" ? WA.sidebarItemSelected : WA.sidebarItemUnselected
                              }`}
                              onClick={() => {
                                setSelectedScope("captains")
                                setSidebarOpen(false)
                                setTimeout(() => markRoomAsVisited(CAPTAINS_ROOM_ID, "captains"), 50)
                              }}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    selectedScope === "captains" ? "bg-white/20" : "bg-orange-100"
                                  }`}
                                >
                                  <Users className={`h-4 w-4 ${selectedScope === "captains" ? WA.iconInSelected : WA.iconInUnselected}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate text-sm">Captain-Chat</div>
                                  <p
                                    className={`text-xs mt-1 truncate ${
                                      selectedScope === "captains" ? "text-white/80" : "text-muted-foreground"
                                    }`}
                                  >
                                    Alle Captain &amp; Co-Captain
                                  </p>
                                </div>

                                {captainsUnread > 0 && (
                                  <Badge variant="destructive" className={WA.unreadBadge}>
                                    {captainsUnread > 99 ? "99+" : captainsUnread}
                                  </Badge>
                                )}
                              </div>
                            </Button>
                          )}

                          {canSeeVorstandChat && (
                            <Button
                              variant="ghost"
                              className={`${WA.sidebarItemBase} mt-1 ${
                                selectedScope === "vorstand" ? WA.sidebarItemSelected : WA.sidebarItemUnselected
                              }`}
                              onClick={() => {
                                setSelectedScope("vorstand")
                                setSidebarOpen(false)
                                setTimeout(() => markRoomAsVisited(VORSTAND_ROOM_ID, "vorstand"), 50)
                              }}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    selectedScope === "vorstand" ? "bg-white/20" : "bg-orange-100"
                                  }`}
                                >
                                  <Shield className={`h-4 w-4 ${selectedScope === "vorstand" ? WA.iconInSelected : WA.iconInUnselected}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate text-sm">Vorstand</div>
                                  <p
                                    className={`text-xs mt-1 truncate ${
                                      selectedScope === "vorstand" ? "text-white/80" : "text-muted-foreground"
                                    }`}
                                  >
                                    Nur Vorstand-Rollen
                                  </p>
                                </div>

                                {vorstandUnread > 0 && (
                                  <Badge variant="destructive" className={WA.unreadBadge}>
                                    {vorstandUnread > 99 ? "99+" : vorstandUnread}
                                  </Badge>
                                )}
                              </div>
                            </Button>
                          )}
                        </div>

                        {roomsLoading ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">Lade Teams...</p>
                          </div>
                        ) : !profile?.player_id ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm">Du bist noch keinem Spieler zugeordnet.</p>
                          </div>
                        ) : chatRooms.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm">Du bist in keinem Team.</p>
                          </div>
                        ) : (
                          <div className="p-2">
                            {chatRooms.map((room) => {
                              const teamUnread = unreadCounts[unreadKey(room.id, "team")] || 0
                              const isSelected = selectedScope === "team" && selectedRoom?.id === room.id

                              return (
                                <div key={room.id} className="mb-2">
                                  <Button
                                    variant="ghost"
                                    className={`${WA.sidebarItemBase} ${isSelected ? WA.sidebarItemSelected : WA.sidebarItemUnselected}`}
                                    onClick={() => {
                                      setSelectedRoom(room)
                                      setSelectedScope("team")
                                      setSidebarOpen(false)
                                      setTimeout(() => markRoomAsVisited(room.id, "team"), 50)
                                    }}
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      {room.logo_url ? (
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                          <AvatarImage src={room.logo_url || "/placeholder.svg"} alt={room.name} />
                                          <AvatarFallback className={isSelected ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}>
                                            {room.name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <div
                                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            isSelected ? "bg-white/20" : "bg-orange-100"
                                          }`}
                                        >
                                          <Hash className={`h-4 w-4 ${isSelected ? WA.iconInSelected : WA.iconInUnselected}`} />
                                        </div>
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-sm">{room.name}</div>
                                        {room.role ? (
                                          <p className={`text-xs mt-1 truncate ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                            Rolle: {room.role}
                                          </p>
                                        ) : room.description ? (
                                          <p className={`text-xs mt-1 truncate ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                            {room.description}
                                          </p>
                                        ) : null}
                                      </div>

                                      {teamUnread > 0 && (
                                        <Badge variant="destructive" className={WA.unreadBadge}>
                                          {teamUnread > 99 ? "99+" : teamUnread}
                                        </Badge>
                                      )}
                                    </div>
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <Card className={`h-full ${WA.card} overflow-hidden flex flex-col min-h-0`}>
                    <CardHeader className={`pb-3 ${WA.header} shrink-0`}>
                      <div className="flex items-center justify-between gap-3">
                        <Button variant="ghost" size="sm" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(true)}>
                          <Menu className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center justify-center">
                          {selectedScope === "team" && selectedRoom?.logo_url ? (
                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                              <AvatarImage src={selectedRoom.logo_url || "/placeholder.svg"} alt={selectedRoomName} />
                              <AvatarFallback className="bg-orange-100 text-orange-700">
                                {(selectedRoomName || "#").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-100 flex items-center justify-center">
                              {selectedScope === "club" ? (
                                <Info className="h-4 w-4 text-orange-600" />
                              ) : selectedScope === "freizeit" ? (
                                <Coffee className="h-4 w-4 text-orange-600" />
                              ) : selectedScope === "vorstand" ? (
                                <Shield className="h-4 w-4 text-orange-600" />
                              ) : selectedScope === "captains" ? (
                                <Users className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Hash className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base truncate">{selectedRoomName}</CardTitle>
                          </div>

                          {/* ✅ Mitglieder-Anzeige komplett weg (wie gewünscht) */}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
                      {selectedScope === "team" && !selectedRoom ? (
                        <div className={`flex-1 flex items-center justify-center text-muted-foreground ${WA.chatBg}`}>
                          <div className="text-center">
                            <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-sm">Wähle ein Team aus der Seitenleiste</p>
                            <Button
                              variant="outline"
                              className="mt-4 lg:hidden bg-white hover:bg-orange-50 border-slate-200 rounded-xl"
                              size="sm"
                              onClick={() => setSidebarOpen(true)}
                            >
                              <Menu className="h-4 w-4 mr-2" />
                              Chats anzeigen
                            </Button>
                          </div>
                        </div>
                      ) : selectedScope === "captains" && !canSeeCaptainChat ? (
                        <div className={`flex-1 flex items-center justify-center text-muted-foreground ${WA.chatBg}`}>
                          <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-sm">Kein Zugriff auf den Captain-Chat.</p>
                          </div>
                        </div>
                      ) : selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand ? (
                        <div className={`flex-1 flex items-center justify-center text-muted-foreground ${WA.chatBg}`}>
                          <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-sm">Kein Zugriff auf den Vorstand-Chat.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ScrollArea className={`flex-1 min-h-0 p-3 sm:p-4 ${WA.chatBg}`}>
                            {loading ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
                                <p className="mt-2 text-muted-foreground text-sm">Lade Chat...</p>
                              </div>
                            ) : messages.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-sm">Noch keine Nachrichten.</p>
                                <p className="text-xs mt-2">Sei der Erste, der eine Nachricht schreibt!</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {renderedStream.map((item) => {
                                  if (item.type === "date") {
                                    return (
                                      <div key={`date-${item.key}`} className="py-2 flex items-center justify-center">
                                        <div className="px-3 py-1 rounded-full bg-white/75 border border-black/5 text-[11px] text-slate-600 shadow-sm">
                                          {item.label}
                                        </div>
                                      </div>
                                    )
                                  }

                                  const message = item.msg
                                  const isOwnMessage = message.user_id === profile?.id
                                  const name = message.sender?.name ?? "Unbekannt"
                                  const photoUrl = message.sender?.photo_url
                                  const isSenderVorstand = !!(message.sender_player_id && vorstandPlayerIdSet.has(message.sender_player_id))
                                  const time = formatTimeVienna(message.created_at)

                                  return (
                                    <div key={message.id} className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-0.5">
                                        <AvatarImage src={photoUrl || "/placeholder.svg"} alt={name} />
                                        <AvatarFallback className="bg-orange-100 text-orange-700 text-[10px]">{initials(name)}</AvatarFallback>
                                      </Avatar>

                                      <div className={`flex flex-col max-w-[92%] sm:max-w-xs lg:max-w-md ${isOwnMessage ? "items-end" : "items-start"}`}>
                                        {!isOwnMessage && (
                                          <div className="w-full mb-1">
                                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                              <div className="min-w-0 flex items-center gap-2">
                                                <span className="text-[13px] font-semibold text-slate-700 truncate">{name}</span>
                                                {isSenderVorstand && (
                                                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800 shrink-0">
                                                    🛡️ Vorstand
                                                  </span>
                                                )}
                                              </div>

                                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                                <Clock className="h-3 w-3" />
                                                {time}
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        <div className={`px-3 py-2 ${isOwnMessage ? WA.bubbleOwn : WA.bubbleOther}`}>
                                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>

                                          <div className="mt-1 flex justify-end">
                                            <span className={`text-[10px] flex items-center gap-1 ${isOwnMessage ? "text-white/80" : "text-slate-500"}`}>
                                              {isOwnMessage && <Clock className="h-3 w-3" />}
                                              {time}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </ScrollArea>

                          {/* ✅ Composer "fixiert": sticky bottom im Card-Container */}
                          <div
                            className={`px-3 py-2 ${WA.composer} shrink-0 sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]`}
                          >
                            <div className="flex gap-2 items-end">
                              <Input
                                placeholder="Nachricht eingeben..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage()
                                  }
                                }}
                                disabled={sending || !profile?.id}
                                className={`flex-1 text-sm rounded-2xl ${WA.input}`}
                              />
                              <Button
                                onClick={sendMessage}
                                disabled={!newMessage.trim() || sending || !profile?.id}
                                size="sm"
                                className={`px-3 rounded-2xl ${WA.sendBtn}`}
                              >
                                {sending ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

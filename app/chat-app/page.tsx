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
import { useRouter } from "next/navigation"

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
  id: string
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

export default function TeamChatPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

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
    const { data, error } = await supabase
      .from("club_roles")
      .select("role")
      .eq("user_id", profile?.user_id)

    if (!error && data) {
      const isV = data.some((r: any) => r.role === "Vorstand")
      setIsVorstand(isV)
      setCanSeeVorstandChat(isV)
    }
  }
  const [vorstandMembers, setVorstandMembers] = useState<VorstandMember[]>([])
  const [vorstandMembersLoading, setVorstandMembersLoading] = useState(false)

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

  // Wenn man im Captain-Chat ist, aber in keinem Team Captain/Co-Captain ist, zurück zum Team-Chat
    // Load messages whenever target changes
  useEffect(() => {
    fetchMessages()
    markCurrentAsVisited()

    if (selectedScope === "team" && selectedRoom?.id) fetchTeamMembers(selectedRoom.id)
    if (selectedScope !== "team") setTeamMembers([])

    const unsubscribe = subscribeToMessages()
    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, selectedScope, canSeeVorstandChat])

  const canSeeCaptainChat = useMemo(() => {
    // Zugriff auf globalen Captain-Chat, wenn du in irgendeinem Team Captain/Co-Captain bist
    return chatRooms.some((r) => r.role === "Captain" || r.role === "Co-Captain")
  }, [chatRooms])
useEffect(() => {
    if (selectedScope === "captains" && !canSeeCaptainChat && !isVorstand) setSelectedScope("team")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScope, canSeeCaptainChat])


  const currentRoomId = useMemo(() => {
    if (selectedScope === "club") return CLUB_ROOM_ID
    if (selectedScope === "freizeit") return FREIZEIT_ROOM_ID
    if (selectedScope === "vorstand") return VORSTAND_ROOM_ID
    if (selectedScope === "captains") return CAPTAINS_ROOM_ID
    return selectedRoom?.id ?? null
  }, [selectedScope, selectedRoom?.id])

  const selectedRoomName = useMemo(() => {
    if (selectedScope === "club") return "Vereinsinfo"
    if (selectedScope === "freizeit") return "Freizeit"
    if (selectedScope === "vorstand") return "Vorstand"
    if (!selectedRoom) return "Team-Chat"
    return selectedScope === "captains" ? "Captain-Chat" : selectedRoom.name
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
        .select("id, name, description, created_at, logo_url")
        .order("name", { ascending: true })

      if (error) throw error

      const rooms: TeamRoom[] =
        (teams || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? null,
          created_at: t.created_at,
          logo_url: t.logo_url ?? null,
          role: "Vorstand",
        })) || []

      setChatRooms(rooms)

      if (!["club", "freizeit", "vorstand"].includes(selectedScope)) {
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
        .select("role, teams:teams(id, name, description, created_at, logo_url)")
        .eq("player_id", playerId)
        .is("left_at", null)

      if (membershipsError) throw membershipsError

      const rooms: TeamRoom[] =
        (memberships || [])
          .map((m: any) => {
            const t = m.teams
            if (!t?.id) return null
            return {
              id: t.id,
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

      // Keep selection only if not in global chats
      if (!["club", "freizeit", "vorstand"].includes(selectedScope)) {
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

      const { data: players, error: pErr } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds)

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

      const { data: players, error: pErr } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds)

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
      setVorstandMembersLoading(true)

      // club_roles: user_id = auth.uid, role = text (Vorstand, Kassier, Schriftführer, ...)
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

      const { data: players, error: playersError } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .in("id", playerIds)

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

      const roleRank = (role: string | null) => {
        if (role === "Vorstand") return 0
        if (role === "Kassier") return 1
        if (role === "Schriftführer") return 2
        return 9
      }

      members.sort((a, b) => {
        const rr = roleRank(a.role) - roleRank(b.role)
        if (rr !== 0) return rr
        return (a.name || "").localeCompare(b.name || "")
      })

      setVorstandMembers(members)
    } catch (e) {
      console.error("fetchVorstandMembers error", e)
      setVorstandMembers([])
    } finally {
      setVorstandMembersLoading(false)
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

      const playerIds = Array.from(
        new Set((profiles as any[] | null)?.map((p) => p.player_id).filter(Boolean) ?? []),
      )

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
    const token = (session as any)?.access_token
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

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground mb-4">Bitte melden Sie sich an, um den Chat zu verwenden.</p>
              <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const showNoProfile = !profileLoading && !profile

  const clubUnread = unreadCounts[unreadKey(CLUB_ROOM_ID, "club")] || 0
  const freizeitUnread = unreadCounts[unreadKey(FREIZEIT_ROOM_ID, "freizeit")] || 0
  const vorstandUnread = unreadCounts[unreadKey(VORSTAND_ROOM_ID, "vorstand")] || 0
  const captainsUnread = unreadCounts[unreadKey(CAPTAINS_ROOM_ID, "captains")] || 0

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <main className="flex-grow pt-4">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/member-profile-app")}
              className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Profil
            </Button>
          </div>

          {showNoProfile ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Profil fehlt</h2>
                <p className="text-muted-foreground mb-4">
                  Für diesen Account gibt es keinen Eintrag in <code>user_profiles</code>. Bitte melde dich beim Admin.
                </p>
                <Button onClick={() => router.push("/member-profile-app")}>Zurück</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-[calc(100vh-200px)] gap-4">
              {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
              )}

              {/* Sidebar */}
              <div
                className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-72 xl:w-80 transform ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
              >
                <Card className="h-full border-0 shadow-lg">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Hash className="h-5 w-5 text-primary" />
                        Chats
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="shrink-0 pt-1">
                        {isVorstand && (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            Vorstand
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      {/* Vereinsinfo + Freizeit + Vorstand */}
                      <div className="p-2 border-b border-border">
                        <Button
                          variant={selectedScope === "club" ? "default" : "ghost"}
                          className="w-full justify-start h-auto p-3 text-left"
                          onClick={() => {
                            setSelectedScope("club")
                            setSidebarOpen(false)
                            setTimeout(() => markRoomAsVisited(CLUB_ROOM_ID, "club"), 50)
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Info className="h-4 w-4 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">Vereinsinfo</div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">Für alle Mitglieder</p>
                            </div>

                            {clubUnread > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                              >
                                {clubUnread > 99 ? "99+" : clubUnread}
                              </Badge>
                            )}
                          </div>
                        </Button>

                        <Button
                          variant={selectedScope === "freizeit" ? "default" : "ghost"}
                          className="w-full justify-start h-auto p-3 text-left mt-1"
                          onClick={() => {
                            setSelectedScope("freizeit")
                            setSidebarOpen(false)
                            setTimeout(() => markRoomAsVisited(FREIZEIT_ROOM_ID, "freizeit"), 50)
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Coffee className="h-4 w-4 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">Freizeit</div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">Für alle Mitglieder</p>
                            </div>

                            {freizeitUnread > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                              >
                                {freizeitUnread > 99 ? "99+" : freizeitUnread}
                              </Badge>
                            )}
                          </div>
                        </Button>

                        {(canSeeCaptainChat || isVorstand) && (
                          <Button
                            variant={selectedScope === "captains" ? "default" : "ghost"}
                            className="w-full justify-start h-auto p-3 text-left mt-1"
                            onClick={() => {
                              setSelectedScope("captains")
                              setSidebarOpen(false)
                              setTimeout(() => markRoomAsVisited(CAPTAINS_ROOM_ID, "captains"), 50)
                            }}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-primary" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">Captain-Chat</div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">Alle Captain &amp; Co-Captain</p>
                              </div>

                              {captainsUnread > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                                >
                                  {captainsUnread > 99 ? "99+" : captainsUnread}
                                </Badge>
                              )}
                            </div>
                          </Button>
                        )}

                        {canSeeVorstandChat && (
                          <Button
                            variant={selectedScope === "vorstand" ? "default" : "ghost"}
                            className="w-full justify-start h-auto p-3 text-left mt-1"
                            onClick={() => {
                              setSelectedScope("vorstand")
                              setSidebarOpen(false)
                              setTimeout(() => markRoomAsVisited(VORSTAND_ROOM_ID, "vorstand"), 50)
                            }}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Shield className="h-4 w-4 text-primary" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">Vorstand</div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">Nur Vorstand-Rollen</p>
                              </div>

                              {vorstandUnread > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                                >
                                  {vorstandUnread > 99 ? "99+" : vorstandUnread}
                                </Badge>
                              )}
                            </div>
                          </Button>
                        )}
                      </div>

                      {roomsLoading ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
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

                            return (
                              <div key={room.id} className="mb-2">
                                <Button
                                  variant={selectedScope === "team" && selectedRoom?.id === room.id ? "default" : "ghost"}
                                  className="w-full justify-start h-auto p-3 text-left"
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
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                          {room.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Hash className="h-4 w-4 text-primary" />
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate text-sm">{room.name}</div>
                                      {room.role ? (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">Rolle: {room.role}</p>
                                      ) : room.description ? (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{room.description}</p>
                                      ) : null}
                                    </div>

                                    {teamUnread > 0 && (
                                      <Badge
                                        variant="destructive"
                                        className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                                      >
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
              <div className="flex-1 min-w-0">
                <Card className="h-full border-0 shadow-lg">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-3">
                      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-4 w-4" />
                      </Button>

                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        {selectedScope === "club" ? (
                          <Info className="h-3 w-3 text-primary" />
                        ) : selectedScope === "freizeit" ? (
                          <Coffee className="h-3 w-3 text-primary" />
                        ) : selectedScope === "vorstand" ? (
                          <Shield className="h-3 w-3 text-primary" />
                        ) : selectedScope === "captains" ? (
                          <Shield className="h-3 w-3 text-primary" />
                        ) : (
                          <Hash className="h-3 w-3 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{selectedRoomName}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedScope === "club"
                            ? "Vereinsweite Infos – alle haben Zugriff."
                            : selectedScope === "freizeit"
                              ? "Freizeit & Community – alle haben Zugriff."
                              : selectedScope === "vorstand"
                                ? "Nur Vorstand-Rollen sehen diesen Chat."
                                : selectedScope === "captains"
                                  ? "Nur Captain & Co-Captain sehen diesen Chat."
                                  : "Nur Mitglieder dieses Teams sehen diesen Chat."}
                        </p>

                        {selectedScope === "team" && selectedRoom?.id && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="truncate">
                              Team:{" "}
                              {membersLoading
                                ? "Lade..."
                                : teamMembers.length === 0
                                  ? "—"
                                  : teamMembers.map((m) => m.name).join(", ")}
                            </span>
                          </div>
                        )}

                        {selectedScope === "captains" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="truncate">
                              Captain/Co-Captain (alle Teams):{" "}
                              {globalCaptainsLoading
                                ? "Lade..."
                                : globalCaptains.length === 0
                                  ? "—"
                                  : globalCaptains.map((m) => m.name).join(", ")}
                            </span>
                          </div>
                        )}

                        {selectedScope === "vorstand" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="truncate">
                              Vorstand:{" "}
                              {vorstandMembersLoading
                                ? "Lade..."
                                : vorstandMembers.length === 0
                                  ? "—"
                                  : vorstandMembers.map((m) => m.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedScope !== "club" &&
                        selectedScope !== "freizeit" &&
                        selectedScope !== "vorstand" &&
                        selectedRoom && (
                          <div className="hidden sm:flex gap-2">
                            <Button size="sm" variant={selectedScope === "team" ? "default" : "outline"} onClick={() => setSelectedScope("team")}>
                              Team
                            </Button>
                            <Button
                              size="sm"
                              variant={selectedScope === "captains" ? "default" : "outline"}
                              onClick={() => setSelectedScope("captains")}
                              disabled={!canSeeCaptainChat}
                              title={!canSeeCaptainChat ? "Nur Captain/Co-Captain" : undefined}
                            >
                              Captain
                            </Button>
                          </div>
                        )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 flex flex-col h-[calc(100%-70px)]">
                    {selectedScope === "team" && !selectedRoom ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-sm">Wähle ein Team aus der Seitenleiste</p>
                          <Button
                            variant="outline"
                            className="mt-4 lg:hidden bg-transparent"
                            size="sm"
                            onClick={() => setSidebarOpen(true)}
                          >
                            <Menu className="h-4 w-4 mr-2" />
                            Chats anzeigen
                          </Button>
                        </div>
                      </div>
                    ) : selectedScope === "captains" && !canSeeCaptainChat ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-sm">Kein Zugriff auf den Captain-Chat.</p>
                        </div>
                      </div>
                    ) : selectedScope === "vorstand" && !canSeeVorstandChat && !isVorstand ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-sm">Kein Zugriff auf den Vorstand-Chat.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ScrollArea className="flex-1 p-4">
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                              <p className="mt-2 text-muted-foreground text-sm">Lade Chat...</p>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                              <p className="text-sm">Noch keine Nachrichten.</p>
                              <p className="text-xs mt-2">Sei der Erste, der eine Nachricht schreibt!</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {messages.map((message) => {
                                const isOwnMessage = message.user_id === profile?.id
                                const name = message.sender?.name ?? "Unbekannt"
                                const photoUrl = message.sender?.photo_url
                                const isSenderVorstand = !!(message.sender_player_id && vorstandPlayerIdSet.has(message.sender_player_id))

                                return (
                                  <div
                                    key={message.id}
                                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                                  >
                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                      <AvatarImage src={photoUrl || "/placeholder.svg"} alt={name} />
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        {name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>

                                    <div
                                      className={`flex flex-col max-w-[78%] sm:max-w-xs lg:max-w-md ${
                                        isOwnMessage ? "items-end" : "items-start"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">{isOwnMessage ? "Du" : name}</span>
                                        {isSenderVorstand && (
                                          <span className="ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            🛡️ Vorstand
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
  <Clock className="h-3 w-3" />
  {new Date(message.created_at).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}
</span>

                                      </div>

                                      <div
                                        className={`p-3 rounded-lg ${
                                          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                        }`}
                                      >
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              <div ref={messagesEndRef} />
                            </div>
                          )}
                        </ScrollArea>

                        <div className="p-4 border-t border-border bg-card">

                          {isVorstand && (
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                  <Shield className="h-3.5 w-3.5" />
                                  Vorstand-Modus
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Deine Nachrichten sind als Vorstand erkennbar.
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nachricht eingeben..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  sendMessage()
                                }
                              }}
                              disabled={sending || !profile?.id}
                              className="flex-1 bg-background text-sm"
                            />
                            <Button
                              onClick={sendMessage}
                              disabled={!newMessage.trim() || sending || !profile?.id}
                              size="sm"
                              className="px-3"
                            >
                              {sending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
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
      </main>

      <MobileBottomNav />
    </div>
  )
}
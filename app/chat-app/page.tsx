"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Clock, Hash, Menu, X, ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useRouter } from "next/navigation"

type ChatMessage = {
  id: string
  user_id: string // FK -> user_profiles.id (NOT auth.uid)
  message: string
  room_id: string
  created_at: string
  sender?: { name: string; photo_url: string | null } | null
}

type TeamRoom = {
  id: string
  name: string
  description: string | null
  created_at?: string
  logo_url?: string | null
  role?: string | null
}

type UserProfileLite = {
  id: string
  user_id: string
  player_id: string | null
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
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

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

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages()
      markRoomAsVisited(selectedRoom.id)
      const unsubscribe = subscribeToMessages()
      return () => unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id])

  const selectedRoomName = useMemo(() => selectedRoom?.name ?? "Team-Chat", [selectedRoom])

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

  /**
   * Nur Teams, wo der eingeloggte User Mitglied ist.
   * Mitgliedschaft läuft bei dir über team_members.player_id.
   */
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

      if (!selectedRoom && rooms.length > 0) {
        setSelectedRoom(rooms[0])
        setTimeout(() => fetchUnreadCounts(rooms), 150)
      } else if (selectedRoom && !rooms.find((r) => r.id === selectedRoom.id)) {
        setSelectedRoom(rooms[0] ?? null)
        setTimeout(() => fetchUnreadCounts(rooms), 150)
      } else {
        setTimeout(() => fetchUnreadCounts(rooms), 150)
      }
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

  const fetchMessages = async () => {
    if (!selectedRoom) return

    try {
      setLoading(true)

      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id,user_id,message,room_id,created_at")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true })
        .limit(200)

      if (messagesError) throw messagesError

      const rows = (messagesData as any[]) || []
      if (rows.length === 0) {
        setMessages([])
        return
      }

      // IMPORTANT: chat_messages.user_id -> user_profiles.id
      const profileIds = Array.from(new Set(rows.map((r) => r.user_id)))

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id,player_id")
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

      const withSender = rows.map((r) => {
        const playerId = profileToPlayer.get(r.user_id)
        const sender = playerId ? playerMap.get(playerId) ?? null : null
        return { ...r, sender }
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
    if (!selectedRoom) return () => {}

    const channel = supabase
      .channel(`chat_messages_${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          const incoming = payload.new as any

          // Best effort sender info (incoming.user_id = user_profiles.id)
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

          setMessages((prev) => [...prev, { ...incoming, sender }])

          // unread count for other users (compare against my profile.id)
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
    if (!newMessage.trim() || sending || !selectedRoom) return

    // IMPORTANT: must write user_profiles.id into chat_messages.user_id
    if (!profile?.id) {
      toast({
        title: "Profil fehlt",
        description: "Dein Benutzerprofil ist nicht eingerichtet. Bitte melde dich beim Admin.",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)

      const { error } = await supabase.from("chat_messages").insert({
        user_id: profile.id,
        message: newMessage.trim(),
        room_id: selectedRoom.id,
      })

      if (error) throw error

      setNewMessage("")
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const fetchUnreadCounts = async (roomsOverride?: TeamRoom[]) => {
    const rooms = roomsOverride ?? chatRooms
    if (!profile?.id || rooms.length === 0) return

    try {
      const counts: Record<string, number> = {}

      for (const room of rooms) {
        const { data: visitData, error: visitError } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", profile.id)
          .eq("room_id", room.id)
          .maybeSingle()

        if (visitError && (visitError as any).code === "42P01") {
          counts[room.id] = 0
          continue
        }

        const lastVisit = visitData?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count, error: countError } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", lastVisit)
          .neq("user_id", profile.id)

        if (countError) counts[room.id] = 0
        else counts[room.id] = count || 0
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const markRoomAsVisited = async (roomId: string) => {
    if (!profile?.id) return

    try {
      const { error } = await supabase.from("user_room_visits").upsert(
        {
          user_id: profile.id,
          room_id: roomId,
          last_visit_at: new Date().toISOString(),
        },
        { onConflict: "user_id,room_id" },
      )

      if (error && (error as any).code !== "42P01") {
        console.error("Error marking room as visited:", error)
      }

      setUnreadCounts((prev) => ({ ...prev, [roomId]: 0 }))
    } catch (error) {
      console.error("Error marking room as visited:", error)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground mb-4">Bitte melden Sie sich an, um den Team-Chat zu verwenden.</p>
              <Button onClick={() => router.push("/member-login")}>Zur Anmeldung</Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const showNoProfile = !profileLoading && !profile

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
                        Meine Teams
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      {roomsLoading ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
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
                          {chatRooms.map((room) => (
                            <Button
                              key={room.id}
                              variant={selectedRoom?.id === room.id ? "default" : "ghost"}
                              className="w-full justify-start mb-1 h-auto p-3 text-left"
                              onClick={() => {
                                setSelectedRoom(room)
                                setSidebarOpen(false)
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

                                {unreadCounts[room.id] > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                                  >
                                    {unreadCounts[room.id] > 99 ? "99+" : unreadCounts[room.id]}
                                  </Badge>
                                )}
                              </div>
                            </Button>
                          ))}
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
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-4 w-4" />
                      </Button>

                      {selectedRoom?.logo_url ? (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={selectedRoom.logo_url || "/placeholder.svg"} alt={selectedRoom.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {selectedRoom.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Hash className="h-3 w-3 text-primary" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{selectedRoomName}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">Nur Mitglieder dieses Teams sehen diesen Chat.</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 flex flex-col h-[calc(100%-70px)]">
                    {!selectedRoom ? (
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
                            Teams anzeigen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ScrollArea className="flex-1 p-4">
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="mt-2 text-muted-foreground text-sm">Lade Chat...</p>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                              <p className="text-sm">Noch keine Nachrichten in diesem Team-Chat.</p>
                              <p className="text-xs mt-2">Sei der Erste, der eine Nachricht schreibt!</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {messages.map((message) => {
                                const isOwnMessage = message.user_id === profile?.id
                                const name = message.sender?.name ?? "Unbekannt"
                                const photoUrl = message.sender?.photo_url

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
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {new Date(message.created_at).toLocaleTimeString("de-DE", {
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
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nachricht eingeben..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
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
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
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

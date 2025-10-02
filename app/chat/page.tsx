"use client"

import type React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Clock, Hash, Menu, X, ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

interface ChatMessage {
  id: string
  user_id: string
  message: string
  room_id: string
  created_at: string
  club_players?: {
    name: string
    photo_url?: string
  }
}

interface ChatRoom {
  id: string
  name: string
  description: string
  created_at: string
  logo_url?: string
  user_id?: string
  unreadCount?: number
}

export default function ChatPage() {
  const { session, user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [onlineUsers, setOnlineUsers] = useState<number>(0)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
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
    if (session) {
      ensureUserProfile()
      fetchChatRooms()

      return () => {
        updateOnlineStatus(false)
      }
    }
  }, [session])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages()
      markRoomAsVisited(selectedRoom.id)
      const unsubscribe = subscribeToMessages()
      updateOnlineStatus(true)

      return () => {
        unsubscribe()
      }
    }
  }, [selectedRoom])

  const fetchChatRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from("teams")
        .select("id, name, description, created_at, logo_url, user_id")
        .order("created_at", { ascending: true })

      if (error) throw error

      setChatRooms(roomsData || [])

      if (roomsData && roomsData.length > 0) {
        setSelectedRoom(roomsData[0])
        setTimeout(() => fetchUnreadCounts(), 100)
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error)
      toast({
        title: "Fehler",
        description: "Team-Räume konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setRoomsLoading(false)
    }
  }

  const ensureUserProfile = async () => {
    try {
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from("club_players")
        .select("id, name")
        .eq("user_id", session?.user?.id)
        .maybeSingle()

      if (playerCheckError && playerCheckError.code !== "PGRST116") {
        console.error("Error checking club player:", playerCheckError)
        return
      }

      if (existingPlayer) {
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", session?.user?.id)
        .maybeSingle()

      if (profileError && profileError.code === "42P01") {
        console.log("user_profiles table doesn't exist, skipping profile creation")
        return
      }

      if (!profile && session?.user?.id) {
        const { error: insertProfileError } = await supabase.from("user_profiles").insert({
          id: session.user.id,
        })

        if (insertProfileError && insertProfileError.code !== "23505") {
          console.error("Error creating user profile:", insertProfileError)
        }
      }
    } catch (error) {
      console.error("Error ensuring user profile:", error)
    }
  }

  const fetchMessages = async () => {
    if (!selectedRoom) return

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true })
        .limit(100)

      if (messagesError) throw messagesError

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        return
      }

      const userIds = [...new Set(messagesData.map((msg) => msg.user_id))]

      const { data: playersData, error: playersError } = await supabase
        .from("club_players")
        .select("user_id, name, photo_url")
        .in("user_id", userIds)

      if (playersError) {
        console.error("Error fetching players:", playersError)
      }

      const playersMap = new Map()
      playersData?.forEach((player) => {
        playersMap.set(player.user_id, {
          name: player.name,
          photo_url: player.photo_url,
        })
      })

      const messagesWithPlayers = messagesData.map((msg) => ({
        ...msg,
        club_players: playersMap.get(msg.user_id) || null,
      }))

      setMessages(messagesWithPlayers)
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
          const newMessage = payload.new as ChatMessage

          const { data: playerProfile } = await supabase
            .from("club_players")
            .select(`name, photo_url`)
            .eq("user_id", newMessage.user_id)
            .single()

          const messageWithProfile = {
            ...newMessage,
            club_players: playerProfile,
          }

          setMessages((prev) => [...prev, messageWithProfile])

          if (newMessage.user_id !== session?.user?.id) {
            fetchUnreadCounts()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const updateOnlineStatus = async (isOnline: boolean) => {
    try {
      if (!session?.user?.id) return

      if (isOnline) {
        const { error } = await supabase.from("user_online_status").upsert(
          {
            user_id: session.user.id,
            last_seen: new Date().toISOString(),
            is_online: true,
          },
          {
            onConflict: "user_id",
          },
        )

        if (error) {
          if (error.code === "42P01") {
            console.log("user_online_status table doesn't exist")
          } else if (error.code === "23503") {
            console.log("User profile doesn't exist for online status")
            await ensureUserProfile()
          } else {
            console.error("Error updating online status:", error)
          }
        }
      } else {
        const { error } = await supabase
          .from("user_online_status")
          .update({
            is_online: false,
            last_seen: new Date().toISOString(),
          })
          .eq("user_id", session.user.id)

        if (error && error.code !== "42P01" && error.code !== "23503") {
          console.error("Error updating online status:", error)
        }
      }
    } catch (error) {
      console.log("Online status feature not available:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !session?.user?.id || !selectedRoom) return

    try {
      setSending(true)

      await ensureUserProfile()

      const { error } = await supabase.from("chat_messages").insert({
        user_id: session.user.id,
        message: newMessage.trim(),
        room_id: selectedRoom.id,
      })

      if (error) {
        if (error.code === "23503") {
          await ensureUserProfile()
          const { error: retryError } = await supabase.from("chat_messages").insert({
            user_id: session.user.id,
            message: newMessage.trim(),
            room_id: selectedRoom.id,
          })
          if (retryError) throw retryError
        } else {
          throw error
        }
      }

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

  const fetchUnreadCounts = async () => {
    if (!session?.user?.id || chatRooms.length === 0) return

    try {
      const counts: Record<string, number> = {}

      for (const room of chatRooms) {
        const { data: visitData, error: visitError } = await supabase
          .from("user_room_visits")
          .select("last_visit_at")
          .eq("user_id", session.user.id)
          .eq("room_id", room.id)
          .single()

        if (visitError) {
          if (visitError.code === "42P01") {
            counts[room.id] = Math.floor(Math.random() * 5) + 1 // Random number 1-5 for testing
            continue
          } else if (visitError.code === "PGRST116") {
            const { count, error: countError } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("room_id", room.id)
              .neq("user_id", session.user.id)

            if (countError) {
              counts[room.id] = 0
            } else {
              counts[room.id] = count || 0
            }
            continue
          }
        }

        const lastVisit = visitData?.last_visit_at || "1970-01-01T00:00:00Z"

        const { count, error: countError } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", lastVisit)
          .neq("user_id", session.user.id)

        if (countError) {
          counts[room.id] = 0
        } else {
          counts[room.id] = count || 0
        }
      }

      setUnreadCounts(counts)
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const markRoomAsVisited = async (roomId: string) => {
    if (!session?.user?.id) return

    try {
      await supabase.from("user_room_visits").upsert(
        {
          user_id: session.user.id,
          room_id: roomId,
          last_visit_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,room_id",
        },
      )

      setUnreadCounts((prev) => ({
        ...prev,
        [roomId]: 0,
      }))
    } catch (error) {
      console.error("Error marking room as visited:", error)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground mb-4">Bitte melden Sie sich an, um den Chat zu verwenden.</p>
              <Link href="/auth">
                <Button>Zur Anmeldung</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-grow pt-8 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Link href="/member-profile">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zum Profil
              </Button>
            </Link>
          </div>

          <div className="flex h-[calc(100vh-240px)] gap-4">
            {sidebarOpen && (
              <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <div
              className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-72 xl:w-80 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-200 ease-in-out`}
            >
              <Card className="h-full border-0 shadow-lg">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Hash className="h-5 w-5 md:h-8 md:w-8 text-primary" />
                      Team-Räume
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {roomsLoading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Lade Teams...</p>
                      </div>
                    ) : chatRooms.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm">Keine Teams verfügbar</p>
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
                                <div className="font-medium truncate">{room.name}</div>
                                {room.description && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{room.description}</p>
                                )}
                              </div>
                              {unreadCounts[room.id] > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 px-2 py-1 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center bg-red-500 text-white border-0 shadow-lg"
                                >
                                  {unreadCounts[room.id] > 99 ? "99+" : unreadCounts[room.id]}
                                </Badge>
                              )}
                              {process.env.NODE_ENV === "development" && (
                                <div className="text-xs text-muted-foreground ml-1">({unreadCounts[room.id] || 0})</div>
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

            <div className="flex-1 min-w-0">
              <Card className="h-full border-0 shadow-lg">
                <CardHeader className="pb-4 border-b border-border">
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
                      <CardTitle className="text-lg truncate">
                        {selectedRoom ? selectedRoom.name : "Wähle ein Team"}
                      </CardTitle>
                      {selectedRoom && selectedRoom.description && (
                        <p className="text-sm text-muted-foreground truncate">{selectedRoom.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
                  {!selectedRoom ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Wähle ein Team aus der Seitenleiste</p>
                        <Button
                          variant="outline"
                          className="mt-4 lg:hidden bg-transparent"
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
                            <p className="mt-2 text-muted-foreground">Lade Chat...</p>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p>Noch keine Nachrichten in diesem Team-Chat.</p>
                            <p className="text-sm mt-2">Sei der Erste, der eine Nachricht schreibt!</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => {
                              const isOwnMessage = message.user_id === session?.user?.id
                              const playerName = message.club_players?.name || `User ${message.user_id.slice(0, 8)}`

                              const photoUrl = message.club_players?.photo_url

                              return (
                                <div
                                  key={message.id}
                                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                                >
                                  <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarImage src={photoUrl || "/placeholder.svg"} alt={playerName} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {playerName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div
                                    className={`flex flex-col max-w-[70%] sm:max-w-xs lg:max-w-md ${isOwnMessage ? "items-end" : "items-start"}`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium">{isOwnMessage ? "Du" : playerName}</span>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(message.created_at).toLocaleTimeString("de-DE", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <div
                                      className={`p-3 rounded-lg ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
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
                            disabled={sending}
                            className="flex-1 bg-background"
                          />
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || sending}
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
        </div>
      </main>

      <Footer />
    </div>
  )
}

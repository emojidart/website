"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Smile, Paperclip, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface Message {
  id: string
  content: string
  user_id: string
  team_id?: string
  room_type: string
  room_id: string
  created_at: string
  user_profiles?: {
    user_id: string
    email: string
    player_id?: string
  }
  club_players?: {
    name: string
    photo_url: string | null
  }
}

interface ChatRoomProps {
  roomId: string
  roomName: string
}

export function ChatRoom({ roomId, roomName }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    const loadMessagesFromDatabase = async () => {
      try {
        const { data: messagesData, error } = await supabase
          .from("messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })

        if (error) {
          console.error("Error loading messages:", error)
          return
        }

        const messagesWithUserData = await Promise.all(
          (messagesData || []).map(async (message) => {
            // Try to get user profile data
            const { data: profileData } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", message.user_id)
              .single()

            let playerData = null
            if (profileData?.player_id) {
              const { data } = await supabase
                .from("club_players")
                .select("name, photo_url")
                .eq("id", profileData.player_id)
                .single()
              playerData = data
            }

            return {
              ...message,
              user_profiles: profileData,
              club_players: playerData,
            }
          }),
        )

        console.log("[v0] Loaded messages:", messagesWithUserData)
        setMessages(messagesWithUserData)
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadMessagesFromDatabase()
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log("[v0] New message received:", payload)

          const { data: messageData } = await supabase.from("messages").select("*").eq("id", payload.new.id).single()

          if (messageData) {
            // Get user data separately
            const { data: profileData } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", messageData.user_id)
              .single()

            let playerData = null
            if (profileData?.player_id) {
              const { data } = await supabase
                .from("club_players")
                .select("name, photo_url")
                .eq("id", profileData.player_id)
                .single()
              playerData = data
            }

            const messageWithUserData = {
              ...messageData,
              user_profiles: profileData,
              club_players: playerData,
            }

            setMessages((prev) => [...prev, messageWithUserData])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, authLoading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const getRoomType = (roomId: string) => {
      if (roomId === "general") return "general"
      if (roomId.startsWith("team-")) return "team"
      if (roomId.startsWith("tournament-")) return "tournament"
      if (roomId.startsWith("game-")) return "game"
      if (roomId.startsWith("league-")) return "league"
      if (roomId === "admin") return "admin"
      return "general"
    }

    const message = {
      content: newMessage.trim(),
      user_id: user.id,
      room_type: getRoomType(roomId),
      room_id: roomId,
    }

    try {
      const { error } = await supabase.from("messages").insert([message])

      if (error) {
        console.error("Error sending message:", error)
        return
      }

      setNewMessage("")
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Heute"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Gestern"
    } else {
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    }
  }

  const getUserDisplayName = (message: Message) => {
    if (message.club_players?.name) {
      return message.club_players.name
    }
    if (message.user_profiles?.email) {
      return message.user_profiles.email.split("@")[0]
    }
    return "Unbekannter Benutzer"
  }

  const getUserAvatar = (message: Message) => {
    return message.club_players?.photo_url || null
  }

  const getUserInitials = (message: Message) => {
    const name = getUserDisplayName(message)
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const clearChat = async () => {
    try {
      const { error } = await supabase.from("messages").delete().eq("room_id", roomId)

      if (error) {
        console.error("Error clearing chat:", error)
        return
      }

      setMessages([])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Lade Chat...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Sie müssen angemeldet sein, um zu chatten.</p>
          <Button onClick={() => (window.location.href = "/login")}>Anmelden</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{roomName}</h3>
            <p className="text-sm text-muted-foreground">Echte Chat-Nachrichten • {messages.length} Nachrichten</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
              Chat leeren
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Noch keine Nachrichten in diesem Chat.</p>
            <p className="text-sm">Schreiben Sie die erste echte Nachricht!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDate =
              index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(message.created_at)
            const isOwnMessage = message.user_id === user?.id

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      {formatDate(message.created_at)}
                    </Badge>
                  </div>
                )}

                <div className={cn("flex gap-3", isOwnMessage && "flex-row-reverse")}>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={getUserAvatar(message) || undefined} />
                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                      {getUserInitials(message)}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn("flex-1 max-w-[70%]", isOwnMessage && "text-right")}>
                    <div className={cn("flex items-center gap-2 mb-1", isOwnMessage && "flex-row-reverse")}>
                      <span className="font-medium text-sm">{getUserDisplayName(message)}</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-500 text-white">
                        Mitglied
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                    </div>

                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        isOwnMessage ? "bg-orange-500 text-white ml-auto" : "bg-muted",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Echte Nachricht eingeben..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export { ChatRoom as ChatRoomComponent }

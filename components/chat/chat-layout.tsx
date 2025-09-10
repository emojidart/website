"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Users, Hash } from "lucide-react"
import { ChatRoomComponent } from "./chat-room"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface ChatRoom {
  id: string
  name: string
  type: "team" | "general"
  team_id?: string
  unread_count?: number
  last_message?: {
    content: string
    created_at: string
    user_name: string
  }
}

interface User {
  id: string
  name: string
  team_id?: string
  role: string
}

const getCurrentUser = (): User => {
  if (typeof window === "undefined") return { id: "1", name: "User", role: "member" }

  const user = localStorage.getItem("current_user")
  if (!user) {
    const newUser = {
      id: crypto.randomUUID(),
      name: `User_${Math.floor(Math.random() * 1000)}`,
      role: "member",
    }
    localStorage.setItem("current_user", JSON.stringify(newUser))
    return newUser
  }
  return JSON.parse(user)
}

export function ChatLayout() {
  const [selectedRoom, setSelectedRoom] = useState<string>("general")
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [user] = useState<User>(getCurrentUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChatRooms()
  }, [])

  const loadChatRooms = async () => {
    try {
      const { data, error } = await supabase.from("chat_rooms").select("*").order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading chat rooms:", error)
        return
      }

      setChatRooms(data || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter chat rooms based on user permissions
  const availableRooms = chatRooms.filter((room) => {
    if (room.type === "general") return true
    if (room.type === "team" && room.team_id === user.team_id) return true
    return false
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-muted-foreground">Lade Chat-Räume...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] bg-background border rounded-lg overflow-hidden">
      {/* Sidebar with chat rooms */}
      <div className="w-80 border-r bg-muted/30">
        <div className="p-4 border-b bg-background">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Team Chat
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user.name} • {user.role === "captain" ? "Kapitän" : user.role === "co_captain" ? "Co-Kapitän" : "Mitglied"}
          </p>
        </div>

        <div className="p-2">
          {availableRooms.map((room) => (
            <Button
              key={room.id}
              variant={selectedRoom === room.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start p-3 h-auto mb-1",
                selectedRoom === room.id && "bg-orange-50 border-orange-200 text-orange-900",
              )}
              onClick={() => setSelectedRoom(room.id)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">
                  {room.type === "general" ? (
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Users className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{room.name}</span>
                    {room.unread_count && room.unread_count > 0 && (
                      <Badge variant="secondary" className="bg-orange-500 text-white text-xs px-1.5 py-0.5">
                        {room.unread_count}
                      </Badge>
                    )}
                  </div>
                  {room.last_message && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{room.last_message.user_name}:</span>{" "}
                      <span className="truncate block max-w-[200px]">{room.last_message.content}</span>
                      <span className="text-xs opacity-70">{formatTime(room.last_message.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1">
        <ChatRoomComponent
          roomId={selectedRoom}
          user={user}
          roomName={availableRooms.find((r) => r.id === selectedRoom)?.name || ""}
        />
      </div>
    </div>
  )
}

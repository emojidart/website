"use client"

import type React from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { AlertCircle, CheckCircle, Clock, Plus, Ticket, MessageCircle, Send, ArrowLeft } from "lucide-react"

interface SupportTicket {
  id: string
  title: string
  description: string
  priority: "niedrig" | "mittel" | "hoch" | "kritisch"
  status: "offen" | "in_bearbeitung" | "geschlossen"
  category: string
  created_at: string
  updated_at: string
  admin_response?: string
}

const priorityColors = {
  niedrig: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  hoch: "bg-orange-100 text-orange-800",
  kritisch: "bg-red-100 text-red-800",
}

const statusColors = {
  offen: "bg-blue-100 text-blue-800",
  in_bearbeitung: "bg-yellow-100 text-yellow-800",
  geschlossen: "bg-green-100 text-green-800",
}

const statusIcons = {
  offen: AlertCircle,
  in_bearbeitung: Clock,
  geschlossen: CheckCircle,
}

export default function SupportPage() {
  const [user, setUser] = useState<any>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "mittel" as const,
    category: "",
  })

  const router = useRouter()

  const categories = [
    "Technisches Problem",
    "Statistiken",
    "Liga-Verwaltung",
    "Mitgliedschaft",
    "Spiele & Matches",
    "Sonstiges",
  ]

  useEffect(() => {
    checkUser()
    if (user) {
      fetchTickets()
    }
  }, [user])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/member-login")
        return
      }
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/member-login")
    } finally {
      setLoading(false)
    }
  }

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error("Error fetching tickets:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from("support_tickets").insert([
        {
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          status: "offen",
        },
      ])

      if (error) throw error

      setFormData({
        title: "",
        description: "",
        priority: "mittel",
        category: "",
      })
      setShowForm(false)

      await fetchTickets()
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchMessages = async (ticketId: string) => {
    setMessages([])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return

    setSendingMessage(true)
    try {
      const currentMessages = selectedTicket.admin_response || ""
      const timestamp = new Date().toLocaleString("de-DE")
      const newMessageText = `[${timestamp} - Benutzer]: ${newMessage.trim()}`
      const updatedMessages = currentMessages ? `${currentMessages}\n\n${newMessageText}` : newMessageText

      const { error } = await supabase
        .from("support_tickets")
        .update({ admin_response: updatedMessages })
        .eq("id", selectedTicket.id)

      if (error) throw error

      setSelectedTicket({
        ...selectedTicket,
        admin_response: updatedMessages,
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    fetchMessages(ticket.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Lade...</div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  const openTickets = tickets.filter((t) => t.status === "offen")
  const inProgressTickets = tickets.filter((t) => t.status === "in_bearbeitung")
  const closedTickets = tickets.filter((t) => t.status === "geschlossen")

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-4 py-4">
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)} className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Übersicht
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Ticket className="w-4 h-4" />
                    {selectedTicket.title}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                    <Badge className={statusColors[selectedTicket.status]}>
                      {selectedTicket.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  Kategorie: {selectedTicket.category} • Erstellt:{" "}
                  {new Date(selectedTicket.created_at).toLocaleDateString("de-DE")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-sm">Ursprüngliche Beschreibung:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded text-sm">{selectedTicket.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4" />
                    Nachrichten
                  </h4>

                  <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-3 bg-white">
                    {!selectedTicket.admin_response ? (
                      <p className="text-gray-500 text-center py-4 text-sm">Noch keine Nachrichten vorhanden.</p>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                        {selectedTicket.admin_response}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ihre Nachricht..."
                      rows={3}
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/member-profile-app")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Profil
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Benötigen Sie Hilfe? Erstellen Sie ein Support-Ticket und wir helfen Ihnen gerne weiter.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Neues Ticket
          </Button>
        </div>

        {showForm && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Ticket className="w-4 h-4 mr-2" />
                Neues Support-Ticket erstellen
              </CardTitle>
              <CardDescription className="text-sm">
                Beschreiben Sie Ihr Problem so detailliert wie möglich, damit wir Ihnen schnell helfen können.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Kurze Beschreibung des Problems"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category} className="text-sm">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig" className="text-sm">
                        Niedrig
                      </SelectItem>
                      <SelectItem value="mittel" className="text-sm">
                        Mittel
                      </SelectItem>
                      <SelectItem value="hoch" className="text-sm">
                        Hoch
                      </SelectItem>
                      <SelectItem value="kritisch" className="text-sm">
                        Kritisch
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beschreiben Sie Ihr Problem detailliert..."
                    rows={5}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    {submitting ? "Wird erstellt..." : "Ticket erstellen"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="alle" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="alle" className="text-[10px] sm:text-xs px-1 py-2">
              <span className="hidden sm:inline">Alle</span>
              <span className="sm:hidden">Alle</span>
              <span className="ml-1">({tickets.length})</span>
            </TabsTrigger>
            <TabsTrigger value="offen" className="text-[10px] sm:text-xs px-1 py-2">
              <span className="hidden sm:inline">Offen</span>
              <span className="sm:hidden">Offen</span>
              <span className="ml-1">({openTickets.length})</span>
            </TabsTrigger>
            <TabsTrigger value="in_bearbeitung" className="text-[10px] sm:text-xs px-1 py-2">
              <span className="hidden sm:inline">In Bearbeitung</span>
              <span className="sm:hidden">Bearb.</span>
              <span className="ml-1">({inProgressTickets.length})</span>
            </TabsTrigger>
            <TabsTrigger value="geschlossen" className="text-[10px] sm:text-xs px-1 py-2">
              <span className="hidden sm:inline">Geschlossen</span>
              <span className="sm:hidden">Geschl.</span>
              <span className="ml-1">({closedTickets.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alle">
            <TicketList tickets={tickets} onTicketSelect={handleTicketSelect} />
          </TabsContent>

          <TabsContent value="offen">
            <TicketList tickets={openTickets} onTicketSelect={handleTicketSelect} />
          </TabsContent>

          <TabsContent value="in_bearbeitung">
            <TicketList tickets={inProgressTickets} onTicketSelect={handleTicketSelect} />
          </TabsContent>

          <TabsContent value="geschlossen">
            <TicketList tickets={closedTickets} onTicketSelect={handleTicketSelect} />
          </TabsContent>
        </Tabs>
      </div>
      <MobileBottomNav />
    </div>
  )
}

function TicketList({
  tickets,
  onTicketSelect,
}: { tickets: SupportTicket[]; onTicketSelect: (ticket: SupportTicket) => void }) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-gray-500">
            <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Keine Tickets gefunden.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status]
        return (
          <Card
            key={ticket.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onTicketSelect(ticket)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-base">{ticket.title}</h3>
                    <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                    <Badge className={statusColors[ticket.status]}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-gray-600 mb-2 line-clamp-2 text-sm">{ticket.description}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Kategorie: {ticket.category}</span>
                    <span>•</span>
                    <span>Erstellt: {new Date(ticket.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
                <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

"use client"

import type React from "react"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/header"
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

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "mittel",
        category: "",
      })
      setShowForm(false)

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchMessages = async (ticketId: string) => {
    // Since ticket_messages table doesn't exist, show empty messages
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

      // Update local state
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Lade...</div>
          </div>
        </div>
      </div>
    )
  }

  const openTickets = tickets.filter((t) => t.status === "offen")
  const inProgressTickets = tickets.filter((t) => t.status === "in_bearbeitung")
  const closedTickets = tickets.filter((t) => t.status === "geschlossen")

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setSelectedTicket(null)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Übersicht
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Ticket className="w-5 h-5" />
                    {selectedTicket.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                    <Badge className={statusColors[selectedTicket.status]}>
                      {selectedTicket.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Kategorie: {selectedTicket.category} • Erstellt:{" "}
                  {new Date(selectedTicket.created_at).toLocaleDateString("de-DE")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Ursprüngliche Beschreibung:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedTicket.description}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Nachrichten
                  </h4>

                  <div className="max-h-96 overflow-y-auto space-y-3 border rounded p-4 bg-white">
                    {!selectedTicket.admin_response ? (
                      <p className="text-gray-500 text-center py-4">Noch keine Nachrichten vorhanden.</p>
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
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push("/member-profile")} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-600 mt-2">
              Benötigen Sie Hilfe? Erstellen Sie ein Support-Ticket und wir helfen Ihnen gerne weiter.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Neues Ticket
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ticket className="w-5 h-5 mr-2" />
                Neues Support-Ticket erstellen
              </CardTitle>
              <CardDescription>
                Beschreiben Sie Ihr Problem so detailliert wie möglich, damit wir Ihnen schnell helfen können.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Kurze Beschreibung des Problems"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie *</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorität</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">Niedrig</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="kritisch">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beschreiben Sie Ihr Problem detailliert..."
                    rows={5}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                    {submitting ? "Wird erstellt..." : "Ticket erstellen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="alle" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alle">Alle Tickets ({tickets.length})</TabsTrigger>
            <TabsTrigger value="offen">Offen ({openTickets.length})</TabsTrigger>
            <TabsTrigger value="in_bearbeitung">In Bearbeitung ({inProgressTickets.length})</TabsTrigger>
            <TabsTrigger value="geschlossen">Geschlossen ({closedTickets.length})</TabsTrigger>
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
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine Tickets gefunden.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status]
        return (
          <Card
            key={ticket.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onTicketSelect(ticket)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{ticket.title}</h3>
                    <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                    <Badge className={statusColors[ticket.status]}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Kategorie: {ticket.category}</span>
                    <span>•</span>
                    <span>Erstellt: {new Date(ticket.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
                <MessageCircle className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

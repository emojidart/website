"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { HelpCircle, Clock, CheckCircle, XCircle, MessageSquare, User, Calendar, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface SupportTicket {
  id: string
  title: string
  description: string
  category: string
  priority: "niedrig" | "mittel" | "hoch" | "kritisch"
  status: "offen" | "in_bearbeitung" | "geschlossen"
  created_at: string
  updated_at: string
  user_id: string
  admin_response?: string
  user_email?: string
  resolved_at?: string
}

export default function AdminSupportTicketsPage() {
  const { session, isAdmin, adminLoading } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [adminResponse, setAdminResponse] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("alle")
  const [priorityFilter, setPriorityFilter] = useState<string>("alle")
  const [isSaving, setIsSaving] = useState(false)

  const fetchTickets = async () => {
    try {
      let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false })

      if (statusFilter !== "alle") {
        query = query.eq("status", statusFilter)
      }
      if (priorityFilter !== "alle") {
        query = query.eq("priority", priorityFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && isAdmin) {
      fetchTickets()
    }
  }, [session, isAdmin, statusFilter, priorityFilter])

  const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      setIsSaving(true)

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        last_response_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("support_tickets").update(updateData).eq("id", ticketId)

      if (error) throw error

      if (selectedTicket && selectedTicket.id === ticketId) {
        const updatedTicket = {
          ...selectedTicket,
          ...updateData,
        }
        setSelectedTicket(updatedTicket)

        setTickets((prevTickets) => prevTickets.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket)))
      }

      setAdminResponse("")

      await fetchTickets()
    } catch (error) {
      console.error("Error updating ticket:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveAdminResponse = async () => {
    if (!selectedTicket || !adminResponse.trim()) return

    await updateTicket(selectedTicket.id, {
      admin_response: adminResponse,
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "kritisch":
        return "bg-red-500"
      case "hoch":
        return "bg-orange-500"
      case "mittel":
        return "bg-yellow-500"
      case "niedrig":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "offen":
        return "bg-red-500"
      case "in_bearbeitung":
        return "bg-yellow-500"
      case "geschlossen":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "offen":
        return <Clock className="h-4 w-4" />
      case "in_bearbeitung":
        return <AlertTriangle className="h-4 w-4" />
      case "geschlossen":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Berechtigungen werden geprüft...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Zugriff verweigert</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Sie haben keine Admin-Berechtigung für diesen Bereich.</p>
                <Link href="/admin">
                  <Button className="w-full">Zurück zum Admin-Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                ← Zurück zum Admin-Dashboard
              </Button>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-600">Support-Anfragen von Vereinsmitgliedern verwalten</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="geschlossen">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Priorität:</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="kritisch">Kritisch</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="niedrig">Niedrig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Tickets werden geladen...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tickets List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Support Tickets ({tickets.length})</h2>

              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Keine Support Tickets gefunden.</p>
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedTicket?.id === ticket.id ? "ring-2 ring-red-500" : ""
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{ticket.title}</CardTitle>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={`${getStatusColor(ticket.status)} text-white`}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(ticket.status)}
                                <span>{ticket.status.replace("_", " ")}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{ticket.category}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(ticket.created_at).toLocaleDateString("de-DE")}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{ticket.user_email || "Unbekannt"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 line-clamp-2">{ticket.description}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Ticket Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Ticket Details</h2>

              {selectedTicket ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{selectedTicket.title}</CardTitle>
                        <div className="flex items-center space-x-2 mb-4">
                          <Badge className={`${getPriorityColor(selectedTicket.priority)} text-white`}>
                            {selectedTicket.priority}
                          </Badge>
                          <Badge className={`${getStatusColor(selectedTicket.status)} text-white`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(selectedTicket.status)}
                              <span>{selectedTicket.status.replace("_", " ")}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Kategorie</h4>
                      <p className="text-gray-700">{selectedTicket.category}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Beschreibung</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Erstellt am</h4>
                      <p className="text-gray-700">{new Date(selectedTicket.created_at).toLocaleString("de-DE")}</p>
                    </div>

                    {selectedTicket.admin_response && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Admin Antwort</h4>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedTicket.admin_response}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Antwort</label>
                        <Textarea
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          placeholder="Antwort an den Benutzer..."
                          rows={4}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={saveAdminResponse}
                          disabled={!adminResponse.trim() || isSaving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSaving ? "Speichern..." : "Antwort Senden"}
                        </Button>

                        <Button
                          onClick={() =>
                            updateTicket(selectedTicket.id, {
                              status: "in_bearbeitung",
                            })
                          }
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={isSaving}
                        >
                          {isSaving ? "Speichern..." : "In Bearbeitung"}
                        </Button>
                        <Button
                          onClick={() =>
                            updateTicket(selectedTicket.id, {
                              status: "geschlossen",
                              resolved_at: new Date().toISOString(),
                            })
                          }
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isSaving}
                        >
                          {isSaving ? "Speichern..." : "Schließen"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Wählen Sie ein Ticket aus, um Details anzuzeigen.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

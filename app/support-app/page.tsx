"use client"

import type React from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Clock, Plus, Ticket, MessageCircle, Send, ArrowLeft, Loader2 } from "lucide-react"

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

const priorityColors: Record<SupportTicket["priority"], string> = {
  niedrig: "bg-green-50 text-green-900 border-green-200",
  mittel: "bg-amber-50 text-amber-900 border-amber-200",
  hoch: "bg-orange-50 text-orange-900 border-orange-200",
  kritisch: "bg-red-50 text-red-900 border-red-200",
}

const statusColors: Record<SupportTicket["status"], string> = {
  offen: "bg-blue-50 text-blue-900 border-blue-200",
  in_bearbeitung: "bg-amber-50 text-amber-900 border-amber-200",
  geschlossen: "bg-emerald-50 text-emerald-900 border-emerald-200",
}

const statusIcons: Record<SupportTicket["status"], any> = {
  offen: AlertCircle,
  in_bearbeitung: Clock,
  geschlossen: CheckCircle,
}

function PageMain({ children }: { children: React.ReactNode }) {
  // ✅ 1:1 Container wie deine andere Seite (Campus)
  return (
    <main className="w-full max-w-none flex-1 px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
      {children}
    </main>
  )
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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "mittel" as const,
    category: "",
  })

  const router = useRouter()

  const categories = useMemo(
    () => ["Technisches Problem", "Statistiken", "Liga-Verwaltung", "Mitgliedschaft", "Spiele & Matches", "Sonstiges"],
    [],
  )

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
      const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })
      if (error) throw error
      setTickets((data || []) as SupportTicket[])
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return

    setSendingMessage(true)
    try {
      const currentMessages = selectedTicket.admin_response || ""
      const timestamp = new Date().toLocaleString("de-DE")
      const newMessageText = `[${timestamp} - Benutzer]: ${newMessage.trim()}`
      const updatedMessages = currentMessages ? `${currentMessages}\n\n${newMessageText}` : newMessageText

      const { error } = await supabase.from("support_tickets").update({ admin_response: updatedMessages }).eq("id", selectedTicket.id)
      if (error) throw error

      setSelectedTicket({ ...selectedTicket, admin_response: updatedMessages })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const openTickets = useMemo(() => tickets.filter((t) => t.status === "offen"), [tickets])
  const inProgressTickets = useMemo(() => tickets.filter((t) => t.status === "in_bearbeitung"), [tickets])
  const closedTickets = useMemo(() => tickets.filter((t) => t.status === "geschlossen"), [tickets])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] pb-24 flex flex-col">
        <Header variant="app" title="Support" subtitle="Tickets & Nachrichten" backHref="/member-profile-app" />
        <div className="h-12 sm:h-14" aria-hidden="true" />

        <PageMain>
          <div className="w-full flex items-center justify-center py-10">
            <div className="rounded-[24px] border border-orange-200 bg-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.55)] px-10 py-10 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-950">Support wird geladen</p>
                <p className="text-sm text-slate-500 mt-1 font-semibold">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </PageMain>

        <MobileBottomNav />
      </div>
    )
  }

  // ✅ Ticket Detail View
  if (selectedTicket) {
    const StatusIcon = statusIcons[selectedTicket.status]
    return (
      <div className="min-h-screen bg-[#f5f6f8] pb-24 flex flex-col">
        <Header variant="app" title="Support" subtitle="Ticket-Details" backHref="/member-profile-app" />
        <div className="h-12 sm:h-14" aria-hidden="true" />

        <PageMain>
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTicket(null)}
              className="mb-4 flex items-center gap-2 bg-white hover:bg-orange-50 text-slate-950 border border-slate-200 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]">
              <CardHeader className="bg-slate-950 text-white">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-black">
                    <Ticket className="w-5 h-5" />
                    {selectedTicket.title}
                  </CardTitle>

                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`border ${priorityColors[selectedTicket.priority]} bg-white/90`}>
                      {selectedTicket.priority}
                    </Badge>
                    <Badge className={`border ${statusColors[selectedTicket.status]} bg-white/90`}>
                      <StatusIcon className="w-3 h-3 mr-1 inline-block" />
                      {selectedTicket.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <CardDescription className="text-white/90 text-sm font-semibold">
                  Kategorie: {selectedTicket.category} • Erstellt:{" "}
                  {new Date(selectedTicket.created_at).toLocaleDateString("de-DE")}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 bg-[#f5f6f8]">
                <div className="grid lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white shadow-none p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Beschreibung</p>
                      <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="rounded-[24px] border border-slate-200 bg-white shadow-none overflow-hidden">
                      <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-950 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-orange-600" />
                            Nachrichten
                          </p>
                          <span className="text-xs font-semibold text-slate-500">
                            Zuletzt aktualisiert: {new Date(selectedTicket.updated_at).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-[#f5f6f8]">
                        <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                          {!selectedTicket.admin_response ? (
                            <p className="text-slate-500 text-center py-6 text-sm font-semibold">Noch keine Nachrichten vorhanden.</p>
                          ) : (
                            <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                              {selectedTicket.admin_response}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2 items-end">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Ihre Nachricht…"
                            rows={3}
                            className="flex-1 text-sm rounded-2xl bg-white border-slate-200"
                          />
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            size="sm"
                            className="h-10 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600"
                          >
                            {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </Button>
                        </div>

                        <p className="mt-2 text-[11px] text-slate-500 font-semibold">
                          Tipp: Bitte kurz & konkret schreiben – Screenshots/Beschreibung helfen am meisten.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageMain>

        <MobileBottomNav />
      </div>
    )
  }

  // ✅ Overview
  return (
    <div className="min-h-screen bg-[#f5f6f8] pb-24 flex flex-col">
      <Header variant="app" title="Support" subtitle="Tickets & Nachrichten" backHref="/member-profile-app" />
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <PageMain>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_-46px_rgba(15,23,42,0.55)]">
          <div className="relative overflow-hidden bg-slate-950 p-5 text-white sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-orange-100">Support</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black leading-tight">Tickets & Hilfe</h1>
                <p className="mt-2 text-sm text-orange-100 font-semibold">
                  Erstelle ein Ticket und wir helfen dir schnell weiter.
                </p>
              </div>

              <Button
                onClick={() => setShowForm((v) => !v)}
                className="h-11 px-5 rounded-2xl bg-white text-orange-700 font-black hover:bg-orange-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Ticket
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-[#f5f6f8]">
            {showForm && (
              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none overflow-hidden mb-4 sm:mb-6">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center text-lg font-black">
                    <Ticket className="w-4 h-4 mr-2 text-orange-600" />
                    Neues Support-Ticket
                  </CardTitle>
                  <CardDescription className="text-sm font-semibold">
                    Bitte so detailliert wie möglich beschreiben, damit wir schneller helfen können.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-1">Titel *</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Kurze Beschreibung"
                          required
                          className="text-sm rounded-2xl bg-white border-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-1">Kategorie *</label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          required
                        >
                          <SelectTrigger className="text-sm rounded-2xl bg-white border-slate-200">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-1">Priorität</label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                        >
                          <SelectTrigger className="text-sm rounded-2xl bg-white border-slate-200">
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

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-black text-gray-800 mb-1">Status</label>
                          <div className="h-10 rounded-2xl border border-slate-200 bg-[#f5f6f8] px-3 flex items-center text-sm text-slate-600 font-semibold">
                            Wird automatisch auf “offen” gesetzt
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-gray-800 mb-1">Beschreibung *</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Beschreibe dein Problem…"
                        rows={5}
                        required
                        className="text-sm rounded-2xl bg-white border-slate-200"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button type="submit" disabled={submitting} className="h-10 px-5 rounded-2xl bg-orange-500 hover:bg-orange-600">
                        {submitting ? (
                          <span className="inline-flex items-center gap-2 font-black">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Wird erstellt…
                          </span>
                        ) : (
                          <span className="font-black">Ticket erstellen</span>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="h-10 px-5 rounded-2xl bg-white border-slate-200"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-black">Deine Tickets</CardTitle>
                <CardDescription className="text-sm font-semibold">
                  Tippe auf ein Ticket, um Details & Nachrichten zu sehen.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <Tabs defaultValue="alle" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4 h-11 rounded-2xl bg-[#f5f6f8] border border-slate-200 p-1">
                    <TabsTrigger value="alle" className="rounded-xl text-[11px] sm:text-xs font-black">
                      Alle <span className="ml-1 opacity-70">({tickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="offen" className="rounded-xl text-[11px] sm:text-xs font-black">
                      Offen <span className="ml-1 opacity-70">({openTickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="in_bearbeitung" className="rounded-xl text-[11px] sm:text-xs font-black">
                      Bearb. <span className="ml-1 opacity-70">({inProgressTickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="geschlossen" className="rounded-xl text-[11px] sm:text-xs font-black">
                      Geschl. <span className="ml-1 opacity-70">({closedTickets.length})</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="alle">
                    <TicketList tickets={tickets} onTicketSelect={setSelectedTicket} />
                  </TabsContent>
                  <TabsContent value="offen">
                    <TicketList tickets={openTickets} onTicketSelect={setSelectedTicket} />
                  </TabsContent>
                  <TabsContent value="in_bearbeitung">
                    <TicketList tickets={inProgressTickets} onTicketSelect={setSelectedTicket} />
                  </TabsContent>
                  <TabsContent value="geschlossen">
                    <TicketList tickets={closedTickets} onTicketSelect={setSelectedTicket} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageMain>

      <MobileBottomNav />
    </div>
  )
}

function TicketList({
  tickets,
  onTicketSelect,
}: {
  tickets: SupportTicket[]
  onTicketSelect: (ticket: SupportTicket) => void
}) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-[#f5f6f8] p-6 text-center">
        <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50 text-gray-400" />
        <p className="text-sm text-slate-600 font-semibold">Keine Tickets gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status]
        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onTicketSelect(ticket)}
            className="w-full text-left"
          >
            <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-black text-base text-slate-950 truncate">{ticket.title}</h3>

                      <Badge className={`border ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>

                      <Badge className={`border ${statusColors[ticket.status]}`}>
                        <StatusIcon className="w-3 h-3 mr-1 inline-block" />
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-slate-600 mb-2 line-clamp-2 text-sm font-semibold">{ticket.description}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold">
                      <span>Kategorie: {ticket.category}</span>
                      <span className="opacity-40">•</span>
                      <span>Erstellt: {new Date(ticket.created_at).toLocaleDateString("de-DE")}</span>
                      <span className="opacity-40">•</span>
                      <span>Update: {new Date(ticket.updated_at).toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
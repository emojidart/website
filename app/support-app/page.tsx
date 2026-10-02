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
  niedrig: "bg-emerald-500/[0.09] text-emerald-100 border-emerald-300/[0.16]",
  mittel: "bg-amber-500/[0.09] text-amber-100 border-amber-300/[0.16]",
  hoch: "bg-orange-500/[0.09] text-orange-100 border-orange-300/[0.16]",
  kritisch: "bg-red-500/[0.09] text-red-100 border-red-300/[0.16]",
}

const statusColors: Record<SupportTicket["status"], string> = {
  offen: "bg-sky-500/[0.09] text-sky-100 border-sky-300/[0.16]",
  in_bearbeitung: "bg-amber-500/[0.09] text-amber-100 border-amber-300/[0.16]",
  geschlossen: "bg-emerald-500/[0.09] text-emerald-100 border-emerald-300/[0.16]",
}

const statusIcons: Record<SupportTicket["status"], any> = {
  offen: AlertCircle,
  in_bearbeitung: Clock,
  geschlossen: CheckCircle,
}

function PageMain({ children }: { children: React.ReactNode }) {
  // ✅ 1:1 Container wie deine andere Seite (Campus)
  return (
    <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] flex-1 px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
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
      <div className="support-premium relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white flex flex-col">
        <Header variant="app" title="Support" subtitle="Tickets & Nachrichten" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_46%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_25%),radial-gradient(circle_at_90%_25%,rgba(249,115,22,.12),transparent_27%)]" />
        </div>

        

        <PageMain>
          <div className="w-full flex items-center justify-center py-10">
            <div className="rounded-[28px] border border-white/[0.08] bg-black/35 px-10 py-10 shadow-[0_28px_80px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-200" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white">Support wird geladen</p>
                <p className="text-sm text-white/35 mt-1 font-semibold">Bitte kurz warten…</p>
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
      <div className="support-premium relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white flex flex-col">
        <Header variant="app" title="Support" subtitle="Ticket-Details" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_46%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_25%),radial-gradient(circle_at_90%_25%,rgba(249,115,22,.12),transparent_27%)]" />
        </div>

        

        <PageMain>
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTicket(null)}
              className="mb-4 flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] text-white/70 shadow-none hover:border-orange-300/[0.16] hover:bg-orange-500/[0.08] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Übersicht
            </Button>

            <Card className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
              <CardHeader className="border-b border-white/[0.07] bg-black/20 text-white">
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

              <CardContent className="p-4 sm:p-6 bg-white/[0.03]">
                <div className="grid lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="rounded-[24px] border border-white/[0.08] bg-black/25 shadow-none p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Beschreibung</p>
                      <p className="mt-2 text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="rounded-[24px] border border-white/[0.08] bg-black/25 shadow-none overflow-hidden">
                      <div className="p-4 border-b border-white/[0.07]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-white flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-orange-200" />
                            Nachrichten
                          </p>
                          <span className="text-xs font-semibold text-white/35">
                            Zuletzt aktualisiert: {new Date(selectedTicket.updated_at).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/[0.03]">
                        <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/25 p-3">
                          {!selectedTicket.admin_response ? (
                            <p className="text-white/35 text-center py-6 text-sm font-semibold">Noch keine Nachrichten vorhanden.</p>
                          ) : (
                            <div className="whitespace-pre-wrap text-sm text-white/60 leading-relaxed">
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
                            className="flex-1 rounded-2xl border-white/[0.09] bg-[#080c12]/95 text-sm text-white placeholder:text-white/25 shadow-none"
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

                        <p className="mt-2 text-[11px] text-white/35 font-semibold">
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
    <div className="support-premium relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white flex flex-col">
      <Header variant="app" title="Support" subtitle="Tickets & Nachrichten" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_46%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.13),transparent_25%),radial-gradient(circle_at_90%_25%,rgba(249,115,22,.12),transparent_27%)]" />
        </div>

      

      <PageMain>
        <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-white/[0.07] bg-black/20 p-5 text-white sm:p-8">
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
                className="h-11 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-[0_18px_46px_-26px_rgba(249,115,22,.5)] transition hover:bg-orange-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Ticket
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-white/[0.03]">
            {showForm && (
              <Card className="rounded-[24px] border border-white/[0.08] bg-black/25 shadow-none overflow-hidden mb-4 sm:mb-6">
                <CardHeader className="border-b border-white/[0.07]">
                  <CardTitle className="flex items-center text-lg font-black">
                    <Ticket className="w-4 h-4 mr-2 text-orange-200" />
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
                        <label className="block text-sm font-black text-white/70 mb-1">Titel *</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Kurze Beschreibung"
                          required
                          className="h-11 rounded-2xl border-white/[0.09] bg-[#080c12]/95 text-sm text-white placeholder:text-white/25 shadow-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-white/70 mb-1">Kategorie *</label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          required
                        >
                          <SelectTrigger className="h-11 rounded-2xl border-white/[0.09] bg-[#080c12]/95 text-sm text-white placeholder:text-white/25 shadow-none">
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
                        <label className="block text-sm font-black text-white/70 mb-1">Priorität</label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                        >
                          <SelectTrigger className="h-11 rounded-2xl border-white/[0.09] bg-[#080c12]/95 text-sm text-white placeholder:text-white/25 shadow-none">
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
                          <label className="block text-sm font-black text-white/70 mb-1">Status</label>
                          <div className="h-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 flex items-center text-sm text-white/50 font-semibold">
                            Wird automatisch auf “offen” gesetzt
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-white/70 mb-1">Beschreibung *</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Beschreibe dein Problem…"
                        rows={5}
                        required
                        className="h-11 rounded-2xl border-white/[0.09] bg-[#080c12]/95 text-sm text-white placeholder:text-white/25 shadow-none"
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
                        className="h-10 px-5 rounded-2xl bg-black/25 border-white/[0.08]"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-[24px] border border-white/[0.08] bg-black/25 shadow-none overflow-hidden">
              <CardHeader className="border-b border-white/[0.07]">
                <CardTitle className="text-lg font-black">Deine Tickets</CardTitle>
                <CardDescription className="text-sm font-semibold">
                  Tippe auf ein Ticket, um Details & Nachrichten zu sehen.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <Tabs defaultValue="alle" className="space-y-4">
                  <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1">
                    <TabsTrigger value="alle" className="rounded-xl text-[11px] font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-xs">
                      Alle <span className="ml-1 opacity-70">({tickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="offen" className="rounded-xl text-[11px] font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-xs">
                      Offen <span className="ml-1 opacity-70">({openTickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="in_bearbeitung" className="rounded-xl text-[11px] font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-xs">
                      Bearb. <span className="ml-1 opacity-70">({inProgressTickets.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="geschlossen" className="rounded-xl text-[11px] font-black text-white/45 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:text-xs">
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


      <style jsx global>{`
        .support-premium input,
        .support-premium textarea {
          border-color: rgba(255,255,255,.09) !important;
          background: rgba(8,12,18,.96) !important;
          color: white !important;
          box-shadow: none !important;
        }
        .support-premium input::placeholder,
        .support-premium textarea::placeholder {
          color: rgba(255,255,255,.25) !important;
        }
      `}</style>

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
      <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6 text-center">
        <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50 text-white/25" />
        <p className="text-sm text-white/50 font-semibold">Keine Tickets gefunden.</p>
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
            <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 shadow-none transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/[0.16] hover:bg-white/[0.04]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-black text-base text-white truncate">{ticket.title}</h3>

                      <Badge className={`border ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>

                      <Badge className={`border ${statusColors[ticket.status]}`}>
                        <StatusIcon className="w-3 h-3 mr-1 inline-block" />
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-white/50 mb-2 line-clamp-2 text-sm font-semibold">{ticket.description}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/35 font-semibold">
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
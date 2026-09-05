"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, Check, Clipboard, ExternalLink, Loader2, MessageCircle, Play, Square, Video } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const TABLE = "club_meetings"

type MeetingStatus = "prepared" | "live" | "ended"

type ClubMeeting = {
  id: string
  title: string
  status: MeetingStatus
  room_name: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

function randomRoomName() {
  const random = crypto.randomUUID().replaceAll("-", "")
  return `EMD-${random}`
}

export function AdminClubMeeting() {
  const [meeting, setMeeting] = useState<ClubMeeting | null>(null)
  const [title, setTitle] = useState("Vereinssitzung")
  const [scheduledAt, setScheduledAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)

  const publicLink = useMemo(() => {
    if (!meeting?.id || typeof window === "undefined") return ""
    return `${window.location.origin}/vereinssitzung?id=${meeting.id}`
  }, [meeting?.id])

  async function loadCurrentMeeting() {
    setLoading(true)
    setMessage("")

    const { data, error } = await supabase
      .from(TABLE)
      .select("id,title,status,room_name,scheduled_at,started_at,ended_at,created_at")
      .in("status", ["prepared", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      setMessage(`Sitzung konnte nicht geladen werden: ${error.message}`)
    } else {
      const current = (data || null) as ClubMeeting | null
      setMeeting(current)
      if (current) {
        setTitle(current.title)
        setScheduledAt(current.scheduled_at ? new Date(current.scheduled_at).toISOString().slice(0, 16) : "")
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadCurrentMeeting()
  }, [])

  async function savePrepared() {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setMessage("Bitte einen Namen für die Sitzung eingeben.")
      return
    }

    setSaving(true)
    setMessage("")

    if (meeting) {
      const { error } = await supabase
        .from(TABLE)
        .update({
          title: cleanTitle,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        })
        .eq("id", meeting.id)

      if (error) setMessage(error.message)
      else {
        setMessage("Sitzung wurde gespeichert.")
        await loadCurrentMeeting()
      }
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          title: cleanTitle,
          status: "prepared",
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        })
        .select("id,title,status,room_name,scheduled_at,started_at,ended_at,created_at")
        .single()

      if (error) setMessage(error.message)
      else {
        setMeeting(data as ClubMeeting)
        setMessage("Sitzung wurde vorbereitet.")
      }
    }

    setSaving(false)
  }

  function openMeetingPage(meetingId: string) {
    const url = `${window.location.origin}/vereinssitzung?id=${meetingId}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function startMeeting() {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setMessage("Bitte einen Namen für die Sitzung eingeben.")
      return
    }

    setSaving(true)
    setMessage("")
    const roomName = meeting?.room_name || randomRoomName()

    if (meeting) {
      const { data, error } = await supabase
        .from(TABLE)
        .update({
          title: cleanTitle,
          status: "live",
          room_name: roomName,
          started_at: new Date().toISOString(),
          ended_at: null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : meeting.scheduled_at,
        })
        .eq("id", meeting.id)
        .select("id,title,status,room_name,scheduled_at,started_at,ended_at,created_at")
        .single()

      if (error) {
        setMessage(error.message)
      } else {
        const liveMeeting = data as ClubMeeting
        setMeeting(liveMeeting)
        setMessage("Sitzung läuft. Der Videoraum wurde geöffnet.")
        openMeetingPage(liveMeeting.id)
      }
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          title: cleanTitle,
          status: "live",
          room_name: roomName,
          started_at: new Date().toISOString(),
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        })
        .select("id,title,status,room_name,scheduled_at,started_at,ended_at,created_at")
        .single()

      if (error) {
        setMessage(error.message)
      } else {
        const liveMeeting = data as ClubMeeting
        setMeeting(liveMeeting)
        setMessage("Sitzung läuft. Der Videoraum wurde geöffnet.")
        openMeetingPage(liveMeeting.id)
      }
    }

    setSaving(false)
  }

  async function endMeeting() {
    if (!meeting) return

    setSaving(true)
    setMessage("")
    const { error } = await supabase
      .from(TABLE)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meeting.id)

    if (error) setMessage(error.message)
    else {
      setEndDialogOpen(false)
      setMeeting(null)
      setTitle("Vereinssitzung")
      setScheduledAt("")
      setMessage("Sitzung wurde beendet.")
    }
    setSaving(false)
  }

  async function copyLink() {
    if (!publicLink) return
    await navigator.clipboard.writeText(publicLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function shareWhatsApp() {
    if (!meeting || !publicLink) return
    const text = `${meeting.title}\nHier kannst du an der Vereinssitzung teilnehmen:\n${publicLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-red-600" />
        </CardContent>
      </Card>
    )
  }

  const isLive = meeting?.status === "live"

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="h-1.5 bg-red-600" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Video className="h-7 w-7 text-red-300" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-red-300">EMD Verein</div>
                <h1 className="mt-1 text-3xl font-black">Vereinssitzung</h1>
                <p className="mt-2 text-sm text-slate-300">Vorbereiten, starten und den Teilnehmer-Link teilen.</p>
              </div>
            </div>
            {isLive ? <Badge className="w-fit animate-pulse bg-red-600 px-4 py-2 text-sm text-white">● LIVE</Badge> : null}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
          {message}
        </div>
      ) : null}

      <Card className="rounded-3xl border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>{isLive ? meeting?.title : meeting ? "Vorbereitete Sitzung" : "Neue Sitzung"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Name der Sitzung</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Generalversammlung 2026"
              disabled={isLive}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-date">Datum / Uhrzeit (optional)</Label>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="meeting-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                disabled={isLive}
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>

          {!isLive ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="h-12 rounded-xl" disabled={saving} onClick={() => void savePrepared()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Vorbereiten / speichern
              </Button>
              <Button className="h-12 rounded-xl bg-red-600 hover:bg-red-700" disabled={saving} onClick={() => void startMeeting()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {meeting ? `${meeting.title} starten` : "Sitzung jetzt starten"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="font-black text-red-900">Die Sitzung läuft gerade.</div>
                <div className="mt-1 text-sm font-semibold text-red-800">Der Videoraum läuft direkt in der Emoji’s Dartverein App. Berechtigte Organisatoren werden automatisch Moderator.</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button className="h-12 rounded-xl bg-red-600 hover:bg-red-700" onClick={() => openMeetingPage(meeting.id)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Meeting öffnen
                </Button>
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => void copyLink()}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                  {copied ? "Kopiert" : "Link kopieren"}
                </Button>
                <Button variant="outline" className="h-12 rounded-xl" onClick={shareWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
                <Button variant="outline" className="h-12 rounded-xl border-red-200 text-red-700 hover:bg-red-50" disabled={saving} onClick={() => setEndDialogOpen(true)}>
                  <Square className="mr-2 h-4 w-4" /> Sitzung beenden
                </Button>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">↗</div>
                  <div className="min-w-0">
                    <div className="font-black text-blue-950">Bildschirm für alle Teilnehmer teilen</div>
                    <p className="mt-1 text-sm font-semibold text-blue-900">
                      So kannst du während der Sitzung z. B. Unterlagen, eine Präsentation oder ein Programm für alle sichtbar zeigen.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-600">1. Freigabe starten</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">
                      Im Meeting unten auf das Bildschirm-/Pfeil-Symbol klicken und <strong>„Start screen sharing“</strong> bzw. <strong>„Bildschirm freigeben“</strong> wählen.
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-600">2. Ansicht auswählen</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">
                      Danach <strong>ein einzelnes Fenster</strong>, einen <strong>Browser-Tab</strong> oder den <strong>gesamten Bildschirm</strong> auswählen.
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-600">3. Teilen</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">
                      Mit <strong>„Teilen“</strong> bestätigen. Der ausgewählte Inhalt ist anschließend für alle Teilnehmer der Vereinssitzung sichtbar.
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold text-blue-800">
                  Zum Beenden der Freigabe einfach erneut das Bildschirm-Symbol anklicken oder im Browser auf „Freigabe beenden“ drücken.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={endDialogOpen} onOpenChange={(open) => { if (!saving) setEndDialogOpen(open) }}>
        <AlertDialogContent className="max-w-md rounded-3xl border-0 p-0 shadow-2xl">
          <div className="overflow-hidden rounded-3xl bg-white">
            <div className="h-1.5 bg-red-600" />
            <div className="p-6 sm:p-7">
              <AlertDialogHeader className="text-left">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <AlertDialogTitle className="text-2xl font-black text-gray-950">
                  Vereinssitzung beenden?
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-1 text-sm font-medium leading-relaxed text-gray-600">
                  Die laufende Sitzung <strong className="text-gray-900">{meeting?.title || "Vereinssitzung"}</strong> wird beendet.
                  Der LIVE-Hinweis verschwindet danach und der Teilnehmer-Link führt nicht mehr in die laufende Sitzung.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-800">
                Beende die Sitzung erst, wenn wirklich alle Teilnehmer fertig sind.
              </div>

              <AlertDialogFooter className="mt-6 gap-2 sm:gap-2">
                <AlertDialogCancel disabled={saving} className="h-11 rounded-xl border-gray-200 font-bold">
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving}
                  onClick={(event) => {
                    event.preventDefault()
                    void endMeeting()
                  }}
                  className="h-11 rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Sitzung beenden
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

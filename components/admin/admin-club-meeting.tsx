"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, Check, Clipboard, ExternalLink, Loader2, MessageCircle, Play, Square, Video } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    if (!window.confirm("Vereinssitzung wirklich beenden? Der LIVE-Hinweis wird danach entfernt.")) return

    setSaving(true)
    setMessage("")
    const { error } = await supabase
      .from(TABLE)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meeting.id)

    if (error) setMessage(error.message)
    else {
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
                <Button variant="outline" className="h-12 rounded-xl border-red-200 text-red-700 hover:bg-red-50" disabled={saving} onClick={() => void endMeeting()}>
                  <Square className="mr-2 h-4 w-4" /> Sitzung beenden
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

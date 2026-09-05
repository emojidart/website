"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarClock, Loader2, Radio, Video } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type ClubMeeting = {
  id: string
  title: string
  status: "prepared" | "live" | "ended"
  room_name: string | null
  scheduled_at: string | null
  started_at: string | null
}

type JaaSTokenResponse = {
  appId: string
  token: string | null
  moderator: boolean
  displayName?: string
  error?: string
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      dispose: () => void
      addListener?: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

function loadJitsiScript(appId: string) {
  return new Promise<void>((resolve, reject) => {
    const id = "emd-jaas-external-api"
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      if (window.JitsiMeetExternalAPI) resolve()
      else existing.addEventListener("load", () => resolve(), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = id
    script.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("JaaS konnte nicht geladen werden."))
    document.head.appendChild(script)
  })
}

export default function ClubMeetingPage() {
  const params = useSearchParams()
  const meetingId = params.get("id")
  const [meeting, setMeeting] = useState<ClubMeeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [meetingError, setMeetingError] = useState("")
  const [joining, setJoining] = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const meetingHostRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let query = supabase
        .from("club_meetings")
        .select("id,title,status,room_name,scheduled_at,started_at")

      query = meetingId
        ? query.eq("id", meetingId)
        : query.in("status", ["prepared", "live"]).order("created_at", { ascending: false }).limit(1)

      const { data } = await query.maybeSingle()
      if (!cancelled) {
        setMeeting((data || null) as ClubMeeting | null)
        setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel(`club-meeting-public-${meetingId || "current"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "club_meetings" }, () => void load())
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [meetingId])

  useEffect(() => {
    if (meeting?.status !== "live" || !meeting.room_name || !meetingHostRef.current) return

    let cancelled = false

    async function joinMeeting() {
      setJoining(true)
      setMeetingError("")

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token

        const response = await fetch("/api/club-meeting/jaas-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ roomName: meeting.room_name }),
        })

        const rawResponse = await response.text()
        let result: JaaSTokenResponse

        if (!rawResponse.trim()) {
          throw new Error(`Meeting-Server antwortet leer (HTTP ${response.status}). Bitte Netlify-Deploy/Function prüfen.`)
        }

        try {
          result = JSON.parse(rawResponse) as JaaSTokenResponse
        } catch {
          console.error("Unexpected JaaS response:", rawResponse)
          throw new Error(`Ungültige Antwort vom Meeting-Server (HTTP ${response.status}).`)
        }

        if (!response.ok || result.error) throw new Error(result.error || "Meeting konnte nicht geöffnet werden.")

        await loadJitsiScript(result.appId)
        if (cancelled || !meetingHostRef.current || !window.JitsiMeetExternalAPI) return

        apiRef.current?.dispose()
        meetingHostRef.current.innerHTML = ""

        const options: Record<string, unknown> = {
          roomName: `${result.appId}/${meeting.room_name}`,
          parentNode: meetingHostRef.current,
          width: "100%",
          height: "100%",
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: !result.moderator,
            startWithVideoMuted: !result.moderator,
            disableDeepLinking: true,
            brandingRoomAlias: meeting.room_name,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
          },
        }

        if (result.token) options.jwt = result.token
        if (result.displayName) {
          options.userInfo = { displayName: result.displayName }
        }

        apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", options)
        setIsModerator(Boolean(result.moderator))
      } catch (error) {
        const text = error instanceof Error ? error.message : "Meeting konnte nicht geöffnet werden."
        setMeetingError(text)
      } finally {
        if (!cancelled) setJoining(false)
      }
    }

    void joinMeeting()

    return () => {
      cancelled = true
      apiRef.current?.dispose()
      apiRef.current = null
    }
  }, [meeting?.id, meeting?.status, meeting?.room_name])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-9 w-9 animate-spin text-red-600" /></div>
        ) : !meeting ? (
          <Card className="mx-auto max-w-3xl rounded-3xl"><CardContent className="p-10 text-center"><Video className="mx-auto h-12 w-12 text-gray-300" /><h1 className="mt-4 text-2xl font-black">Keine Vereinssitzung vorhanden</h1><p className="mt-2 text-gray-600">Aktuell ist keine Sitzung vorbereitet oder live.</p></CardContent></Card>
        ) : meeting.status === "ended" ? (
          <Card className="mx-auto max-w-3xl rounded-3xl shadow-md">
            <CardContent className="p-7 text-center sm:p-10">
              <Video className="mx-auto h-11 w-11 text-gray-300" />
              <h1 className="mt-4 text-3xl font-black">{meeting.title}</h1>
              <p className="mt-3 text-gray-600">Diese Vereinssitzung wurde bereits beendet.</p>
            </CardContent>
          </Card>
        ) : meeting.status === "live" && meeting.room_name ? (
          <div className="space-y-4">
            <Card className="overflow-hidden rounded-3xl border-red-200 shadow-xl">
              <div className="h-2 bg-red-600" />
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="animate-pulse bg-red-600 px-3 py-1.5 text-white"><Radio className="mr-2 h-4 w-4" /> LIVE</Badge>
                      {isModerator ? <Badge variant="outline">Moderator</Badge> : null}
                    </div>
                    <h1 className="mt-3 text-2xl font-black sm:text-3xl">{meeting.title}</h1>
                    <p className="mt-1 text-sm text-gray-600">Die Sitzung läuft direkt in der Emoji’s Dartverein App.</p>
                  </div>
                  {joining ? <div className="flex items-center gap-2 text-sm font-bold text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Videoraum wird verbunden …</div> : null}
                </div>
              </CardContent>
            </Card>

            {meetingError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{meetingError}</div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-black shadow-xl">
              <div ref={meetingHostRef} className="h-[72vh] min-h-[520px] w-full" />
            </div>
          </div>
        ) : (
          <Card className="mx-auto max-w-3xl rounded-3xl shadow-md">
            <CardContent className="p-7 text-center sm:p-10">
              <CalendarClock className="mx-auto h-11 w-11 text-orange-500" />
              <h1 className="mt-4 text-3xl font-black">{meeting.title}</h1>
              <p className="mt-3 text-gray-600">Die Sitzung wurde vorbereitet, ist aber noch nicht gestartet.</p>
              {meeting.scheduled_at ? <div className="mt-5 rounded-2xl bg-orange-50 p-4 font-black text-orange-900">Geplant: {new Date(meeting.scheduled_at).toLocaleString("de-AT", { dateStyle: "medium", timeStyle: "short" })}</div> : null}
              <p className="mt-5 text-sm text-gray-500">Diese Seite aktualisiert sich automatisch, sobald die Sitzung gestartet wird.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

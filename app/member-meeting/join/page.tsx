"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { JitsiMeeting } from "@jitsi/react-sdk"

import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  Loader2,
  Video,
  Copy,
  ArrowLeft,
  Mic,
  Camera,
  ShieldCheck,
} from "lucide-react"

function slugifyRoomName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function randomRoomName() {
  const part = Math.random().toString(36).slice(2, 8)
  return `verein-${part}`
}

export default function MemberMeetingJoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const [pageLoading, setPageLoading] = useState(true)
  const [meetingTitle, setMeetingTitle] = useState("")
  const [roomInput, setRoomInput] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
      return
    }

    if (!authLoading) {
      const roomFromUrl = searchParams.get("room")
      const titleFromUrl = searchParams.get("title")

      setRoomInput(slugifyRoomName(roomFromUrl || randomRoomName()))
      setMeetingTitle(titleFromUrl ? decodeURIComponent(titleFromUrl) : "")
      setPageLoading(false)
    }
  }, [authLoading, session, router, searchParams])

  const displayName = useMemo(() => {
    const user = session?.user
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Mitglied"
    )
  }, [session])

  const safeRoomName = useMemo(() => {
    return slugifyRoomName(roomInput) || randomRoomName()
  }, [roomInput])

  async function copyRoomLink() {
    try {
      const params = new URLSearchParams()
      params.set("room", safeRoomName)
      if (meetingTitle.trim()) {
        params.set("title", meetingTitle.trim())
      }

      await navigator.clipboard.writeText(
        `${window.location.origin}/member-meeting/join?${params.toString()}`
      )

      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error("Link konnte nicht kopiert werden:", error)
    }
  }

  function applyRoomChange() {
    const params = new URLSearchParams()
    params.set("room", safeRoomName)
    if (meetingTitle.trim()) {
      params.set("title", meetingTitle.trim())
    }
    router.replace(`/member-meeting/join?${params.toString()}`)
  }

  if (authLoading || pageLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header
          variant="app"
          title="Meeting"
          subtitle="Beitreten"
          backHref="/member-meeting"
        />

        <div className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white shadow-xl px-8 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Meeting wird geladen</p>
              <p className="text-sm text-gray-500">Einen Moment bitte…</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col overflow-x-hidden">
      <Header
        variant="app"
        title="Meeting"
        subtitle="Beitreten"
        backHref="/member-meeting"
      />

      <main className="pt-12 sm:pt-14 pb-24">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-orange-600" />
              Meeting beitreten
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Du trittst dem Raum direkt in deiner Vereins-App bei.
            </p>
          </div>

          <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                Raumdaten
                <Badge variant="outline">privater Vereinsbereich</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Meeting-Name
                  </label>
                  <Input
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="z. B. Vorstandssitzung"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Raumname
                  </label>
                  <Input
                    value={roomInput}
                    onChange={(e) => setRoomInput(slugifyRoomName(e.target.value))}
                    placeholder="z. B. vorstandssitzung"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={applyRoomChange}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Raum aktualisieren
                </Button>

                <Button variant="outline" onClick={copyRoomLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Link kopiert" : "Link kopieren"}
                </Button>

                <Button variant="outline" onClick={() => router.push("/member-meeting")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Camera className="h-4 w-4 text-orange-600" />
                    Kamera
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Der Browser fragt automatisch nach Erlaubnis.
                  </p>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Mic className="h-4 w-4 text-orange-600" />
                    Mikrofon
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Audio und Video laufen direkt im Browser.
                  </p>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <ShieldCheck className="h-4 w-4 text-orange-600" />
                    Hinweis
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Beim ersten Start eines neuen Raums kann der Host auf
                    `meet.jit.si` zur Anmeldung aufgefordert werden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">
                {meetingTitle.trim() ? meetingTitle : "Meeting-Fenster"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-2xl border bg-black">
                <JitsiMeeting
                  key={safeRoomName}
                  domain="meet.jit.si"
                  roomName={safeRoomName}
                  configOverwrite={{
                    prejoinPageEnabled: true,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    enableWelcomePage: false,
                    disableModeratorIndicator: true,
                    enableEmailInStats: false,
                    requireDisplayName: false,
                  }}
                  interfaceConfigOverwrite={{
                    MOBILE_APP_PROMO: false,
                    HIDE_INVITE_MORE_HEADER: true,
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    SHOW_BRAND_WATERMARK: false,
                    DEFAULT_BACKGROUND: "#111827",
                  }}
                  userInfo={{
                    displayName,
                  }}
                  getIFrameRef={(node) => {
                    node.style.height = "72vh"
                    node.style.minHeight = "600px"
                    node.style.width = "100%"
                    node.style.border = "0"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
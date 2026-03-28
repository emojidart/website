"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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
  Users,
  Copy,
  PlusCircle,
  ArrowRight,
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

export default function MemberMeetingHomePage() {
  const router = useRouter()
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
      setPageLoading(false)
    }
  }, [authLoading, session, router])

  const safeRoomName = useMemo(() => {
    return slugifyRoomName(roomInput || meetingTitle) || randomRoomName()
  }, [roomInput, meetingTitle])

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    const params = new URLSearchParams()
    params.set("room", safeRoomName)
    if (meetingTitle.trim()) {
      params.set("title", meetingTitle.trim())
    }
    return `${window.location.origin}/member-meeting/join?${params.toString()}`
  }, [safeRoomName, meetingTitle])

  function createMeeting() {
    const params = new URLSearchParams()
    params.set("room", safeRoomName)
    if (meetingTitle.trim()) {
      params.set("title", meetingTitle.trim())
    }
    router.push(`/member-meeting/join?${params.toString()}`)
  }

  function createRandomMeeting() {
    const nextRoom = randomRoomName()
    const params = new URLSearchParams()
    params.set("room", nextRoom)
    if (meetingTitle.trim()) {
      params.set("title", meetingTitle.trim())
    }
    router.push(`/member-meeting/join?${params.toString()}`)
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error("Link konnte nicht kopiert werden:", error)
    }
  }

  if (authLoading || pageLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header
          variant="app"
          title="Meeting"
          subtitle="Video"
          backHref="/member-profile-app"
        />

        <div className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white shadow-xl px-8 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Seite wird geladen</p>
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
        subtitle="Video-Raum"
        backHref="/member-profile-app"
      />

      <main className="pt-12 sm:pt-14 pb-24">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-orange-600" />
              Vereins-Meeting erstellen
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Erstelle einen Meetingraum und teile den Beitrittslink mit Mitgliedern.
            </p>
          </div>

          <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Users className="h-6 w-6 text-orange-600" />
                Neues Meeting
                <Badge variant="outline">deine Vereins-App</Badge>
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
                    onChange={(e) => {
                      const value = e.target.value
                      setMeetingTitle(value)
                      if (!roomInput.trim()) {
                        setRoomInput(slugifyRoomName(value))
                      }
                    }}
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

              <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-semibold">Raum:</span> {safeRoomName}
                </p>
                {meetingTitle.trim() && (
                  <p>
                    <span className="font-semibold">Titel:</span> {meetingTitle}
                  </p>
                )}
                <p className="break-all">
                  <span className="font-semibold">Beitrittslink:</span>{" "}
                  {joinUrl || "Wird erzeugt..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={createMeeting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Meeting erstellen
                </Button>

                <Button variant="outline" onClick={createRandomMeeting}>
                  Zufälligen Raum erzeugen
                </Button>

                <Button variant="outline" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Link kopiert" : "Einladungslink kopieren"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/member-meeting/join")}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Zur Beitreten-Seite
                </Button>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                  Hinweis
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Die Seite wirkt wie deine eigene Meeting-Funktion. Das Video läuft
                  technisch im Hintergrund über Jitsi.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Bell, BellOff, Loader2, ArrowLeft, Trophy, Clock, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: { id: string; name: string; photo_url: string | null } | null
}

type PushPrefRow = {
  user_id: string
  tournament_push_enabled: boolean
  updated_at: string | null
}

type DkoMatchStateRow = {
  id: number
  tournament_type: string | null
  tournament_id: string | null
  match_id: number
  player1: string | null
  player2: string | null
  machine_number: number | null
  push_started_sent_at: string | null
  updated_at: string | null
}

function formatDateTime(input?: string | null) {
  if (!input) return "—"
  const d = new Date(input)
  if (!Number.isFinite(d.getTime())) return "—"
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function TournamentPushInner() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [pushEnabled, setPushEnabled] = useState(true)
  const [pushPrefUpdatedAt, setPushPrefUpdatedAt] = useState<string | null>(null)
  const [savingPref, setSavingPref] = useState(false)

  const [pushRows, setPushRows] = useState<DkoMatchStateRow[]>([])
  const [loadingPushRows, setLoadingPushRows] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  useEffect(() => {
    if (!session?.user) return
    ;(async () => {
      setLoading(true)
      await fetchProfileAndPrefs()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (!profile?.club_players?.name) return
    ;(async () => {
      await fetchLastTournamentPushes(profile.club_players!.name)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.club_players?.name])

  async function fetchProfileAndPrefs() {
    try {
      // ✅ Profile OHNE push_enabled (weil Spalte existiert nicht)
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url)`)
        .eq("user_id", session!.user.id)
        .single()

      if (profileError) {
        console.error("fetch profile error", profileError)
        setProfile(null)
        return
      }

      setProfile(profileData as any)

      // ✅ Push Prefs aus push_preferences
      const { data: pref, error: prefError } = await supabase
        .from("push_preferences")
        .select("user_id, tournament_push_enabled, updated_at")
        .eq("user_id", session!.user.id)
        .maybeSingle()

      if (prefError) {
        console.error("fetch push_preferences error", prefError)
        // fallback: enabled
        setPushEnabled(true)
        setPushPrefUpdatedAt(null)
        return
      }

      if (!pref) {
        // Wenn noch kein Row existiert -> default true
        setPushEnabled(true)
        setPushPrefUpdatedAt(null)
      } else {
        setPushEnabled(Boolean((pref as any).tournament_push_enabled))
        setPushPrefUpdatedAt((pref as any).updated_at ?? null)
      }
    } catch (e) {
      console.error("fetchProfileAndPrefs error", e)
      setProfile(null)
    }
  }

  async function fetchLastTournamentPushes(playerName: string) {
    setLoadingPushRows(true)
    try {
      // Wir nehmen den Namen (player1/player2 sind Text in dko_match_states)
      // und holen nur Matches, wo ein Start-Push rausging.
      const { data, error } = await supabase
        .from("dko_match_states")
        .select(
          "id, tournament_type, tournament_id, match_id, player1, player2, machine_number, push_started_sent_at, updated_at"
        )
        .not("push_started_sent_at", "is", null)
        .or(`player1.eq.${playerName},player2.eq.${playerName}`)
        .order("push_started_sent_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setPushRows(((data as any) || []) as DkoMatchStateRow[])
    } catch (e) {
      console.error("fetchLastTournamentPushes error", e)
      setPushRows([])
    } finally {
      setLoadingPushRows(false)
    }
  }

  const displayName = profile?.club_players?.name ?? "—"

  const list = useMemo(() => {
    return pushRows.map((r) => {
      const p1 = r.player1 ?? ""
      const p2 = r.player2 ?? ""
      const meIsP1 = p1 === displayName
      const opponent = meIsP1 ? p2 : p1
      return { row: r, opponent: opponent || "—" }
    })
  }, [pushRows, displayName])

  async function toggleTournamentPush() {
    if (!session?.user?.id) return
    if (savingPref) return

    const next = !pushEnabled
    setSavingPref(true)
    try {
      const payload: PushPrefRow = {
        user_id: session.user.id,
        tournament_push_enabled: next,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("push_preferences").upsert(payload, {
        onConflict: "user_id",
      })

      if (error) throw error

      setPushEnabled(next)
      setPushPrefUpdatedAt(payload.updated_at)
    } catch (e) {
      console.error("toggleTournamentPush error", e)
      alert("Konnte Push-Einstellung nicht speichern.")
    } finally {
      setSavingPref(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade Push-Verlauf…</span>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-6xl overflow-x-hidden">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => router.push("/member-profile-app")}
            className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Profil
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-orange-600" />
            Turnier Push-Verlauf
          </h1>

          <div className="mt-4 rounded-2xl border bg-gradient-to-r from-orange-50 via-white to-indigo-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                    Spieler: <span className="text-orange-700">{displayName}</span>
                  </div>
                  <Badge variant="outline" className="bg-white/70">
                    Turnier-Push: {pushEnabled ? "aktiv" : "deaktiviert"}
                  </Badge>
                  {pushPrefUpdatedAt ? (
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      zuletzt geändert: {formatDateTime(pushPrefUpdatedAt)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  Hier siehst du die letzten 20 Pushes, die beim <span className="font-medium">Match-Start</span> rausgingen
                  (Gegner + Automat).
                </p>
              </div>

              <Button
                onClick={toggleTournamentPush}
                disabled={savingPref}
                className={cn(
                  "shrink-0 rounded-xl shadow-sm",
                  pushEnabled ? "bg-gray-900 hover:bg-gray-800" : "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {savingPref ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {pushEnabled ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Deaktivieren
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Aktivieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Bell className="h-6 w-6 text-orange-600" />
              Letzte 20 Match-Start Pushes
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loadingPushRows ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                Lade Pushes…
              </div>
            ) : list.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Keine Turnier-Pushes gefunden (noch kein Match gestartet oder noch kein push_started_sent_at gesetzt).
              </div>
            ) : (
              <div className="grid gap-3">
                {list.map(({ row, opponent }) => (
                  <Card
                    key={`${row.tournament_id ?? "t"}-${row.match_id}-${row.id}`}
                    className="border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden"
                  >
                    <CardContent className="p-4">
  <div className="flex flex-col gap-3 min-w-0">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold text-base md:text-lg truncate">
          vs <span className="text-gray-900">{opponent}</span>
        </div>

        {row.machine_number !== null && row.machine_number !== undefined && (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <Cpu className="h-3.5 w-3.5 mr-1" />
            Automat {row.machine_number}
          </Badge>
        )}

        {row.tournament_type ? (
          <Badge variant="outline">{row.tournament_type}</Badge>
        ) : null}

        <Badge variant="outline">Match {row.match_id}</Badge>
      </div>

      <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4 text-orange-600" />
          Push: {formatDateTime(row.push_started_sent_at)}
        </span>
      </div>
    </div>
  </div>
</CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default function MemberTournamentPushPage() {
  return (
    <Suspense fallback={null}>
      <TournamentPushInner />
    </Suspense>
  )
}
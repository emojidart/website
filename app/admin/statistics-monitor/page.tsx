"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  AlertTriangle,
  XCircle,
  Calendar,
  Trophy,
  TrendingUp,
  Filter,
  Crown,
  MessageSquare,
  Send,
  Bell,
  BellOff,
  CheckCircle2,
  Users,
} from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface NotificationInfo {
  total: number
  unread: number
  lastSent: string | null
  recipients?: Array<{
    name: string
    isRead: boolean
  }>
}

interface StatisticsEntry {
  id: string
  match_id: string
  player_id: string
  player_name: string
  player_legs_won: number
  opponent_legs_won: number
  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_shanghai: number
  throws_95_plus: number
  throws_under_26: number
  throws_under_30: number
  semperit_outs: number
  throws_15: number
  throws_16: number
  throws_17: number
  throws_18: number
  throws_19: number
  throws_20: number
  throws_bull: number
  notes: string
  created_at: string
  dart_type?: string
  is_substitute?: boolean
  created_by?: string
  team_captains?: string
  team_name?: string
  team_id?: string
  notificationInfo?: NotificationInfo
}

export default function AdminStatisticsMonitorPage() {
  const { session, isAdmin, adminLoading } = useAuth()
  const [entries, setEntries] = useState<StatisticsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDays, setFilterDays] = useState<string>("7")
  const [notificationFilter, setNotificationFilter] = useState<"all" | "with-unread" | "no-notifications">("all")
  const [selectedEntry, setSelectedEntry] = useState<StatisticsEntry | null>(null)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [sendingNotification, setSendingNotification] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  )

  const fetchStatistics = async () => {
    try {
      setLoading(true)

      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - Number.parseInt(filterDays))

      const { data, error } = await supabase
        .from("leg_statistics")
        .select(`
          *,
          player:club_players!leg_statistics_player_id_fkey (
            id,
            name
          )
        `)
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error

      const enrichedEntries = await Promise.all(
        data.map(async (entry: any) => {
          let teamCaptains = "Kein Team zugeordnet"
          let teamName = "Kein Team"
          let teamId = null

          if (entry.match_id && entry.player?.id) {
            const { data: matchData, error: matchError } = await supabase
              .from("matches")
              .select(`
                *,
                home_team:teams!matches_home_team_id_fkey(id, name),
                away_team:teams!matches_away_team_id_fkey(id, name),
                home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(id, name),
                away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(id, name)
              `)
              .eq("id", entry.match_id)
              .maybeSingle()

            if (matchData && !matchError) {
              // Collect own team IDs from the match (not opponent teams)
              const ownTeamIds: string[] = []

              if (matchData.home_team_type === "own" && matchData.home_team_id) {
                ownTeamIds.push(matchData.home_team_id)
              }

              if (matchData.away_team_type === "own" && matchData.away_team_id) {
                ownTeamIds.push(matchData.away_team_id)
              }

              // Check which of the own teams the player belongs to
              if (ownTeamIds.length > 0) {
                for (const teamIdToCheck of ownTeamIds) {
                  const { data: teamMember } = await supabase
                    .from("team_members")
                    .select("team_id")
                    .eq("player_id", entry.player.id)
                    .eq("team_id", teamIdToCheck)
                    .maybeSingle()

                  if (teamMember) {
                    teamId = teamIdToCheck
                    console.log(`[v0] ✓ Found team from match: ${entry.player.name}`)
                    break
                  }
                }
              }

              if (!teamId) {
                console.log(`[v0] ⚠ Player not in match teams, using fallback: ${entry.player.name}`)
              }
            }
          }

          // Fallback: Use team_members table if no team found from match
          if (!teamId && entry.player?.id) {
            const { data: teamMemberData } = await supabase
              .from("team_members")
              .select(`
                team_id,
                teams (
                  id,
                  name
                )
              `)
              .eq("player_id", entry.player.id)
              .limit(1)
              .single()

            if (teamMemberData?.team_id) {
              teamId = teamMemberData.team_id
              console.log("[v0] ℹ Using fallback team for:", entry.player.name)
            }
          }

          // Get team name and captain
          if (teamId) {
            const { data: teamData } = await supabase.from("teams").select("name").eq("id", teamId).single()

            teamName = teamData?.name || "Unbekanntes Team"

            const { data: captainsData } = await supabase
              .from("team_members")
              .select(`
                role,
                club_players (
                  name
                )
              `)
              .eq("team_id", teamId)
              .eq("role", "Captain")

            if (captainsData && captainsData.length > 0) {
              const captainNames = captainsData
                .map((c: any) => c.club_players?.name)
                .filter(Boolean)
                .join(", ")
              teamCaptains = captainNames
            } else {
              teamCaptains = "Kein Kapitän gefunden"
            }
          }

          const { data: notifsByStatEntry } = await supabase
            .from("notifications")
            .select("id, is_read, created_at, recipient_player_id, statistics_entry_id, leg_statistics_id")
            .eq("statistics_entry_id", entry.id)
            .order("created_at", { ascending: false })

          const { data: notifsByLegStat } = await supabase
            .from("notifications")
            .select("id, is_read, created_at, recipient_player_id, statistics_entry_id, leg_statistics_id")
            .eq("leg_statistics_id", entry.id)
            .order("created_at", { ascending: false })

          const allNotifs = [...(notifsByStatEntry || []), ...(notifsByLegStat || [])]
          const uniqueNotifs = Array.from(new Map(allNotifs.map((n) => [n.id, n])).values())
          const notificationsData = uniqueNotifs.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )

          const recipients = await Promise.all(
            (notificationsData || []).map(async (n: any) => {
              const { data: playerData } = await supabase
                .from("club_players")
                .select("name")
                .eq("id", n.recipient_player_id)
                .maybeSingle()

              return {
                name: playerData?.name || "Unbekannt",
                isRead: n.is_read,
              }
            }),
          )

          const notificationInfo: NotificationInfo = {
            total: notificationsData?.length || 0,
            unread: notificationsData?.filter((n) => !n.is_read).length || 0,
            lastSent: notificationsData?.[0]?.created_at || null,
            recipients,
          }

          return {
            id: entry.id,
            match_id: entry.match_id,
            player_id: entry.player_id,
            player_name: entry.player?.name || "Unbekannt",
            player_legs_won: entry.player_legs_won || 0,
            opponent_legs_won: entry.opponent_legs_won || 0,
            throws_180: entry.throws_180 || 0,
            throws_171: entry.throws_171 || 0,
            throws_high_tonne: entry.throws_high_tonne || 0,
            throws_tonne: entry.throws_tonne || 0,
            throws_shanghai: entry.throws_shanghai || 0,
            throws_95_plus: entry.throws_95_plus || 0,
            throws_under_26: entry.throws_under_26 || 0,
            throws_under_30: entry.throws_under_30 || 0,
            semperit_outs: entry.semperit_outs || 0,
            throws_15: entry.throws_15 || 0,
            throws_16: entry.throws_16 || 0,
            throws_17: entry.throws_17 || 0,
            throws_18: entry.throws_18 || 0,
            throws_19: entry.throws_19 || 0,
            throws_20: entry.throws_20 || 0,
            throws_bull: entry.throws_bull || 0,
            notes: entry.notes || "",
            created_at: entry.created_at,
            dart_type: entry.dart_type,
            is_substitute: entry.is_substitute,
            created_by: entry.created_by,
            team_captains: teamCaptains,
            team_name: teamName,
            team_id: teamId,
            notificationInfo,
          }
        }),
      )

      setEntries(enrichedEntries)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && isAdmin) {
      fetchStatistics()
    }
  }, [session, isAdmin, filterDays])

  const getTotalLegs = (entry: StatisticsEntry) => {
    return entry.player_legs_won + entry.opponent_legs_won
  }

  const isValidEntry = (entry: StatisticsEntry) => {
    const totalLegs = getTotalLegs(entry)
    if (entry.is_substitute) {
      return totalLegs >= 1
    }
    return totalLegs >= 6
  }

  const getValidationBadge = (entry: StatisticsEntry) => {
    const isValid = isValidEntry(entry)
    const totalLegs = getTotalLegs(entry)

    if (isValid) {
      return <Badge className="bg-green-500 text-white">✓ Gültig ({totalLegs} Legs)</Badge>
    } else {
      return <Badge className="bg-red-500 text-white animate-pulse">⚠ Ungültig ({totalLegs} Legs)</Badge>
    }
  }

  const getNotificationBadge = (entry: StatisticsEntry) => {
    const info = entry.notificationInfo
    if (!info || info.total === 0) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
          <BellOff className="h-3 w-3 mr-1" />
          Keine Benachrichtigungen
        </Badge>
      )
    }

    if (info.unread > 0) {
      return (
        <Badge className="bg-orange-500 text-white">
          <Bell className="h-3 w-3 mr-1" />
          {info.unread} ungelesen ({info.total} gesamt)
        </Badge>
      )
    }

    return (
      <Badge className="bg-blue-500 text-white">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {info.total}x gesendet (alle gelesen)
      </Badge>
    )
  }

  const sendNotificationToCaptains = async () => {
    if (!selectedEntry || !notificationMessage.trim()) return

    setSendingNotification(true)
    setNotificationStatus(null)

    try {
      if (!selectedEntry.team_id) {
        throw new Error("Kein Team für diesen Spieler gefunden")
      }

      const { data: captainsData } = await supabase
        .from("team_members")
        .select("player_id")
        .eq("team_id", selectedEntry.team_id)
        .eq("role", "Captain")

      if (!captainsData || captainsData.length === 0) {
        throw new Error("Kein Kapitän für dieses Team gefunden")
      }

      const notifications = captainsData.map((captain) => ({
        recipient_player_id: captain.player_id,
        statistics_entry_id: selectedEntry.id,
        message: notificationMessage.trim(),
        admin_note: `Fehlerhafte Statistik für ${selectedEntry.player_name} (${selectedEntry.team_name}) - ${getTotalLegs(selectedEntry)} Legs`,
      }))

      const { error: insertError } = await supabase.from("notifications").insert(notifications)

      if (insertError) throw insertError

      setNotificationStatus({
        type: "success",
        message: `Benachrichtigung erfolgreich an ${captainsData.length} Kapitän${captainsData.length > 1 ? "e" : ""} gesendet!`,
      })

      await fetchStatistics()

      setTimeout(() => {
        setIsNotificationDialogOpen(false)
        setNotificationMessage("")
        setNotificationStatus(null)
      }, 2000)
    } catch (error: any) {
      console.error("Error sending notification:", error)
      setNotificationStatus({
        type: "error",
        message: `Fehler beim Senden: ${error.message}`,
      })
    } finally {
      setSendingNotification(false)
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

  const invalidEntries = entries.filter((entry) => !isValidEntry(entry))
  const validEntries = entries.filter((entry) => isValidEntry(entry))

  const filteredEntries = entries.filter((entry) => {
    if (notificationFilter === "with-unread") {
      return entry.notificationInfo && entry.notificationInfo.unread > 0
    }
    if (notificationFilter === "no-notifications") {
      return !entry.notificationInfo || entry.notificationInfo.total === 0
    }
    return true
  })

  const entriesWithUnread = entries.filter((e) => e.notificationInfo && e.notificationInfo.unread > 0).length
  const entriesWithoutNotifications = entries.filter(
    (e) => !e.notificationInfo || e.notificationInfo.total === 0,
  ).length

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
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Statistik-Überwachung</h1>
              <p className="text-gray-600">
                Überwache eingetragene Spielstatistiken und identifiziere fehlerhafte Einträge
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesamt Einträge</p>
                  <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
                </div>
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gültige Einträge</p>
                  <p className="text-3xl font-bold text-green-600">{validEntries.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ungültige Einträge</p>
                  <p className="text-3xl font-bold text-red-600">{invalidEntries.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ungelesen</p>
                  <p className="text-3xl font-bold text-orange-600">{entriesWithUnread}</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ohne Info</p>
                  <p className="text-3xl font-bold text-gray-600">{entriesWithoutNotifications}</p>
                </div>
                <BellOff className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Zeitraum:</label>
          <Select value={filterDays} onValueChange={setFilterDays}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Letzte 24 Stunden</SelectItem>
              <SelectItem value="7">Letzte 7 Tage</SelectItem>
              <SelectItem value="14">Letzte 14 Tage</SelectItem>
              <SelectItem value="30">Letzte 30 Tage</SelectItem>
              <SelectItem value="90">Letzte 90 Tage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={notificationFilter} onValueChange={(v) => setNotificationFilter(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Alle Einträge ({entries.length})</TabsTrigger>
            <TabsTrigger value="with-unread" className="text-orange-600">
              <Bell className="h-4 w-4 mr-2" />
              Mit ungelesenen ({entriesWithUnread})
            </TabsTrigger>
            <TabsTrigger value="no-notifications">
              <BellOff className="h-4 w-4 mr-2" />
              Ohne Benachrichtigungen ({entriesWithoutNotifications})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Statistiken werden geladen...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entries List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Einträge ({filteredEntries.length})</h2>

              {filteredEntries.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Keine Einträge im gewählten Zeitraum gefunden.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <Card
                      key={entry.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedEntry?.id === entry.id ? "ring-2 ring-red-500" : ""
                      } ${!isValidEntry(entry) ? "border-2 border-red-300 bg-red-50" : ""}`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{entry.player_name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {getValidationBadge(entry)}
                              {entry.is_substitute && <Badge className="bg-purple-500 text-white">Eingewechselt</Badge>}
                              {getNotificationBadge(entry)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Users className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">Team:</div>
                              <div className="text-gray-700">{entry.team_name}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-gray-600">
                            <Crown className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-600" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">Kapitän:</div>
                              <div className="text-gray-700">{entry.team_captains}</div>
                            </div>
                          </div>

                          {entry.notificationInfo && entry.notificationInfo.lastSent && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <MessageSquare className="h-4 w-4" />
                              <span>
                                Letzte Benachrichtigung:{" "}
                                {new Date(entry.notificationInfo.lastSent).toLocaleString("de-DE")}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(entry.created_at).toLocaleString("de-DE")}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Entry Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Details</h2>

              {selectedEntry ? (
                <Card>
                  <CardHeader className={!isValidEntry(selectedEntry) ? "bg-red-50 border-b-2 border-red-300" : ""}>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{selectedEntry.player_name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getValidationBadge(selectedEntry)}
                          {selectedEntry.is_substitute && (
                            <Badge className="bg-purple-500 text-white">Eingewechselt</Badge>
                          )}
                          {getNotificationBadge(selectedEntry)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {!isValidEntry(selectedEntry) && (
                      <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-red-900 mb-1">Ungültiger Eintrag!</h4>
                            <p className="text-sm text-red-800">
                              Dieser Eintrag hat nur {getTotalLegs(selectedEntry)} Legs, aber mindestens{" "}
                              {selectedEntry.is_substitute ? "1" : "6"} sind erforderlich.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEntry.notificationInfo && selectedEntry.notificationInfo.total > 0 && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-blue-900 mb-1">Benachrichtigungs-Status</h4>
                            <div className="text-sm text-blue-800 space-y-1">
                              <p>
                                <span className="font-medium">Gesamt gesendet:</span>{" "}
                                {selectedEntry.notificationInfo.total}x
                              </p>
                              <p>
                                <span className="font-medium">Ungelesen:</span> {selectedEntry.notificationInfo.unread}
                              </p>
                              {selectedEntry.notificationInfo.lastSent && (
                                <p>
                                  <span className="font-medium">Zuletzt gesendet:</span>{" "}
                                  {new Date(selectedEntry.notificationInfo.lastSent).toLocaleString("de-DE")}
                                </p>
                              )}
                              {selectedEntry.notificationInfo.recipients &&
                                selectedEntry.notificationInfo.recipients.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="font-medium mb-2">Empfänger-Status:</p>
                                    <div className="space-y-1">
                                      {selectedEntry.notificationInfo.recipients.map((recipient, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between bg-white/50 rounded px-2 py-1"
                                        >
                                          <span>{recipient.name}</span>
                                          {recipient.isRead ? (
                                            <Badge className="bg-green-500 text-white text-xs">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              Gelesen
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-orange-500 text-white text-xs">
                                              <Bell className="h-3 w-3 mr-1" />
                                              Ungelesen
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Team</h4>
                      <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="font-medium text-blue-900">{selectedEntry.team_name}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Kapitän</h4>
                      <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="font-medium text-yellow-900">{selectedEntry.team_captains}</div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Der Kapitän ist für diese Statistik verantwortlich</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Zeitstempel</h4>
                      <p className="text-gray-700">{new Date(selectedEntry.created_at).toLocaleString("de-DE")}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Leg Ergebnis</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-sm text-green-700 mb-1">Spieler Legs</div>
                          <div className="text-2xl font-bold text-green-600">{selectedEntry.player_legs_won}</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-sm text-red-700 mb-1">Gegner Legs</div>
                          <div className="text-2xl font-bold text-red-600">{selectedEntry.opponent_legs_won}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🎯 High Scores</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>180er:</span>
                          <span className="font-bold">{selectedEntry.throws_180}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span>171er:</span>
                          <span className="font-bold">{selectedEntry.throws_171}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-orange-50 rounded">
                          <span>High Tonne:</span>
                          <span className="font-bold">{selectedEntry.throws_high_tonne}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-teal-50 rounded">
                          <span>Tonne:</span>
                          <span className="font-bold">{selectedEntry.throws_tonne}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-pink-50 rounded">
                          <span>Shanghai:</span>
                          <span className="font-bold">{selectedEntry.throws_shanghai}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-amber-50 rounded">
                          <span>95+:</span>
                          <span className="font-bold">{selectedEntry.throws_95_plus}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">⚠️ Under-Scores</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>{"<26"}:</span>
                          <span className="font-bold text-red-600">{selectedEntry.throws_under_26}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>{"<30"}:</span>
                          <span className="font-bold text-red-600">{selectedEntry.throws_under_30}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-red-50 rounded">
                          <span>Semperit:</span>
                          <span className="font-bold text-red-600">{selectedEntry.semperit_outs}</span>
                        </div>
                      </div>
                    </div>

                    {selectedEntry.notes && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Notizen</h4>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedEntry.notes}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => setIsNotificationDialogOpen(true)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {selectedEntry.notificationInfo && selectedEntry.notificationInfo.total > 0
                          ? "Erneut Benachrichtigung senden"
                          : "Benachrichtigung an Kapitän senden"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Sende eine Nachricht an den Kapitän über diesen Eintrag
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Wähle einen Eintrag aus, um Details anzuzeigen.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Benachrichtigung senden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedEntry && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Team:</div>
                    <div className="text-gray-700">{selectedEntry.team_name}</div>
                  </div>
                </div>
              </div>
            )}
            {selectedEntry && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Empfänger (Kapitän):</div>
                    <div className="text-gray-700">{selectedEntry.team_captains}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Betreffend: <span className="font-medium">{selectedEntry.player_name}</span> - Eintrag vom{" "}
                  {new Date(selectedEntry.created_at).toLocaleDateString("de-DE")}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Nachricht</label>
              <Textarea
                placeholder="Beschreibe das Problem mit diesem Eintrag..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Diese Nachricht wird an den Kapitän gesendet</p>
            </div>

            {notificationStatus && (
              <div
                className={`p-3 rounded-lg ${
                  notificationStatus.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {notificationStatus.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNotificationDialogOpen(false)
                setNotificationMessage("")
                setNotificationStatus(null)
              }}
              disabled={sendingNotification}
            >
              Abbrechen
            </Button>
            <Button
              onClick={sendNotificationToCaptains}
              disabled={!notificationMessage.trim() || sendingNotification}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {sendingNotification ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

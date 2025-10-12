"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Search, UserPlus, X, Play, Trophy, ArrowLeft, Euro, AlertCircle, ArrowRight, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Player {
  id: number
  name: string
}

interface PlayerWithFrequency extends Player {
  playCount: number
  lastPlayed: string | null
}

interface RegisteredPlayer {
  id: number
  player_id: number
  player_name: string
  registered_at: string
  paid: boolean
}

export default function DKOTournamentRegistration() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [frequentPlayers, setFrequentPlayers] = useState<PlayerWithFrequency[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [tournamentName, setTournamentName] = useState("")
  const [showPaymentWarning, setShowPaymentWarning] = useState(false)
  const [showNameWarning, setShowNameWarning] = useState(false)
  const [playerViewMode, setPlayerViewMode] = useState<"frequent" | "all">("frequent")
  const [activeTournament, setActiveTournament] = useState<{
    tournamentId: string
    tournamentName: string
    tournamentType: string
    incompleteMatches: number
  } | null>(null)
  const [showCancelActiveTournamentDialog, setShowCancelActiveTournamentDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchPlayers()
    fetchRegisteredPlayers()
    checkForActiveTournament()
    fetchFrequentPlayers()
  }, [])

  const fetchFrequentPlayers = async () => {
    try {
      const { data: frequentPlayersData, error } = await supabase
        .from("tournament_series_aggregated")
        .select("player_name, tournaments_played")
        .order("tournaments_played", { ascending: false })
        .limit(100) // Erhöhe Limit auf 100, um alle Spieler anzuzeigen

      if (error) throw error

      if (!frequentPlayersData || frequentPlayersData.length === 0) {
        setFrequentPlayers([])
        return
      }

      const { data: allPlayers, error: playersError } = await supabase.from("spieldatenbank").select("id, name")

      if (playersError) throw playersError

      const frequentPlayersArray: PlayerWithFrequency[] = frequentPlayersData
        .map((fp) => {
          const player = allPlayers?.find((p) => p.name === fp.player_name)
          if (!player) return null
          return {
            id: player.id,
            name: fp.player_name,
            playCount: fp.tournaments_played,
            lastPlayed: null,
          }
        })
        .filter((p): p is PlayerWithFrequency => p !== null)

      setFrequentPlayers(frequentPlayersArray)
    } catch (error) {
      console.error("Fehler beim Laden der häufig gespielten Spieler:", error)
      setFrequentPlayers([])
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase.from("spieldatenbank").select("id, name").order("name")

      if (error) throw error
      setAvailablePlayers(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("dko_tournament_registration")
        .select("*")
        .order("registered_at", { ascending: false })

      if (error) throw error
      setRegisteredPlayers(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der registrierten Spieler:", error)
    }
  }

  const handlePlayerSelect = (playerId: number) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
      setSearchTerm("")
    }
    setSelectedPlayers(newSelected)
  }

  const handleRegisterPlayers = async () => {
    if (selectedPlayers.size === 0) return

    try {
      const playersToRegister = availablePlayers
        .filter((p) => selectedPlayers.has(p.id))
        .map((p) => ({
          player_id: p.id,
          player_name: p.name,
          paid: false,
        }))

      const { error } = await supabase.from("dko_tournament_registration").insert(playersToRegister)

      if (error) throw error

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers() // Refresh frequent players
      setSelectedPlayers(new Set())
    } catch (error) {
      console.error("Fehler beim Registrieren der Spieler:", error)
      alert("Fehler beim Registrieren. Möglicherweise ist der Spieler bereits registriert.")
    }
  }

  const handleUnregisterPlayer = async (registrationId: number) => {
    try {
      const { error } = await supabase.from("dko_tournament_registration").delete().eq("id", registrationId)

      if (error) throw error
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Entfernen der Registrierung:", error)
    }
  }

  const togglePaymentStatus = async (registrationId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("dko_tournament_registration")
        .update({ paid: !currentStatus })
        .eq("id", registrationId)

      if (error) throw error

      setRegisteredPlayers((prevPlayers) =>
        prevPlayers.map((player) => (player.id === registrationId ? { ...player, paid: !currentStatus } : player)),
      )
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Bezahlstatus:", error)
    }
  }

  const checkForActiveTournament = async () => {
    try {
      const { data: activeTournament, error } = await supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_type, tournament_name")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!activeTournament) {
        setActiveTournament(null)
        return
      }

      setActiveTournament({
        tournamentId: activeTournament.tournament_id,
        tournamentName: activeTournament.tournament_name,
        tournamentType: activeTournament.tournament_type,
        incompleteMatches: 0,
      })
    } catch (error) {
      console.error("Fehler beim Prüfen auf aktives Turnier:", error)
      setActiveTournament(null)
    }
  }

  const handleCancelActiveTournament = async () => {
    if (!activeTournament) return

    try {
      const { error: statusError } = await supabase
        .from("tournaments_status")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("tournament_id", activeTournament.tournamentId)

      if (statusError) throw statusError

      const { error: registrationError } = await supabase.from("dko_tournament_registration").delete().neq("id", 0)

      if (registrationError) throw registrationError

      console.log("[v0] Active tournament cancelled successfully")
      setActiveTournament(null)
      setShowCancelActiveTournamentDialog(false)
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Abbrechen des aktiven Turniers:", error)
      alert("Fehler beim Abbrechen des Turniers. Bitte versuche es erneut.")
    }
  }

  const handleContinueTournament = () => {
    if (!activeTournament) return

    const { tournamentType, tournamentId, tournamentName } = activeTournament
    const encodedName = encodeURIComponent(tournamentName)

    const routeMap: Record<string, string> = {
      "8er_dko": "/8erdko",
      "16er_dko": "/16erdko",
      "32er_dko": "/32erdko",
      "64er_dko": "/64erdko",
    }

    const route = routeMap[tournamentType] || "/16erdko"
    router.push(`${route}?tournamentId=${tournamentId}&tournamentName=${encodedName}`)
  }

  const allPlayersPaid = registeredPlayers.every((player) => player.paid)
  const paidCount = registeredPlayers.filter((player) => player.paid).length
  const unpaidPlayers = registeredPlayers.filter((player) => !player.paid)

  const getTournamentSize = (playerCount: number): number => {
    if (playerCount <= 8) return 8
    if (playerCount <= 16) return 16
    if (playerCount <= 32) return 32
    return 64
  }

  const tournamentSize = getTournamentSize(registeredPlayers.length)

  const handleStartTournament = () => {
    if (registeredPlayers.length === 0) {
      alert("Bitte registriere mindestens einen Spieler!")
      return
    }

    if (!tournamentName.trim()) {
      setShowNameWarning(true)
      return
    }

    if (!allPlayersPaid) {
      setShowPaymentWarning(true)
      return
    }

    const encodedName = encodeURIComponent(tournamentName.trim())

    if (tournamentSize === 16) {
      router.push(`/16erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 8) {
      router.push(`/8erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 32) {
      router.push(`/32erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 64) {
      router.push(`/64erdko?shuffle=true&tournamentName=${encodedName}`)
    }
  }

  const filteredPlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !registeredPlayers.some((rp) => rp.player_id === player.id),
  )

  const availableFrequentPlayers = frequentPlayers.filter(
    (player) => !registeredPlayers.some((rp) => rp.player_id === player.id),
  )

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardContent className="text-center">
              <p className="text-gray-700">Lade...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">
                Sie benötigen Admin-Rechte, um auf die DKO Turnier Registrierung zuzugreifen.
              </p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">DKO TURNIER REGISTRIERUNG</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto"></p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            className="flex items-center gap-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Admin-Seite
          </Button>
        </div>

        {activeTournament && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aktives Turnier gefunden!</h3>
                <p className="text-gray-700 mb-1">Es gibt ein laufendes Turnier.</p>
                <p className="text-sm text-gray-600">Möchtest du zum Turnier zurückkehren oder es abbrechen?</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleContinueTournament}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <ArrowRight className="w-4 h-4" />
                Zum Turnier zurückkehren
              </Button>
              <Button
                onClick={() => setShowCancelActiveTournamentDialog(true)}
                variant="outline"
                className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold"
              >
                <X className="w-4 h-4 mr-2" />
                Turnier abbrechen
              </Button>
            </div>
          </div>
        )}

        {showNameWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Turniername fehlt</h3>
              </div>
              <p className="text-gray-600 mb-6">Bitte gib einen Turniernamen ein, bevor du das Turnier startest.</p>
              <Button onClick={() => setShowNameWarning(false)} className="w-full bg-orange-500 hover:bg-orange-600">
                Verstanden
              </Button>
            </div>
          </div>
        )}

        {showPaymentWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Nicht alle Spieler haben bezahlt</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Das Turnier kann erst gestartet werden, wenn alle Spieler ihre Teilnahmegebühr bezahlt haben.
              </p>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-gray-900 mb-2">Noch nicht bezahlt:</p>
                <ul className="space-y-1">
                  {unpaidPlayers.map((player) => (
                    <li key={player.id} className="text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      {player.player_name}
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={() => setShowPaymentWarning(false)} className="w-full bg-orange-500 hover:bg-orange-600">
                Verstanden
              </Button>
            </div>
          </div>
        )}

        {showCancelActiveTournamentDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Turnier wirklich abbrechen?</h3>
              </div>
              <p className="text-gray-600 mb-4">Alle Daten des aktiven Turniers werden gelöscht:</p>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
                <li>Match-Stati und Ergebnisse</li>
                <li>Freilose</li>
                <li>Ranglisten-Einträge</li>
                <li>Spieler-Registrierungen</li>
              </ul>
              <p className="text-sm text-red-600 font-semibold mb-6">
                Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setShowCancelActiveTournamentDialog(false)} variant="outline" className="flex-1">
                  Nein, zurück
                </Button>
                <Button
                  onClick={handleCancelActiveTournament}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Ja, abbrechen
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Turniername</h3>
          </div>
          <input
            type="text"
            placeholder="z.B. Herbst Turnier 2025, Lion Cup, ..."
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-white rounded-lg focus:border-orange-500 focus:outline-none text-lg font-medium bg-white shadow-md"
            maxLength={100}
          />
          <p className="text-sm text-gray-600 mt-2">Bitte Turniername eingeben. Pflichtfeld!</p>
        </div>

        {registeredPlayers.length > 0 && (
          <div className="mb-8 bg-orange-50 border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Turnier bereit zum Starten</h3>
                <p className="text-gray-600">
                  {registeredPlayers.length} Spieler registriert → {tournamentSize}er DKO Turnier
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Euro className="w-5 h-5 text-orange-600" />
                  <span className={`font-semibold ${allPlayersPaid ? "text-green-600" : "text-orange-600"}`}>
                    {paidCount} von {registeredPlayers.length} bezahlt
                  </span>
                </div>
              </div>
              <button
                onClick={handleStartTournament}
                disabled={!allPlayersPaid}
                className={`flex items-center gap-2 font-bold py-3 px-6 rounded-lg transition-colors ${
                  allPlayersPaid
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Play className="w-5 h-5" />
                Turnier starten
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Verfügbare Spieler</h2>
              <span className="text-sm text-gray-500">
                {playerViewMode === "frequent" ? availableFrequentPlayers.length : filteredPlayers.length} Spieler
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPlayerViewMode("frequent")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  playerViewMode === "frequent"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-4 h-4" />
                  Häufig verwendet
                </div>
              </button>
              <button
                onClick={() => setPlayerViewMode("all")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  playerViewMode === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Alle Spieler
              </button>
            </div>

            {playerViewMode === "all" && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-white rounded-lg focus:border-orange-500 focus:outline-none bg-white shadow-md"
                />
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {loading ? (
                <p className="text-center text-gray-500 py-8">Lade Spieler...</p>
              ) : playerViewMode === "frequent" ? (
                availableFrequentPlayers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Keine häufig verwendeten Spieler gefunden</p>
                ) : (
                  availableFrequentPlayers.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg hover:border-orange-400 cursor-pointer transition-colors shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => handlePlayerSelect(player.id)}
                        className="w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 shadow-sm"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">{player.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-orange-600 font-medium">{player.playCount}x gespielt</span>
                        </div>
                      </div>
                      <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </label>
                  ))
                )
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Spieler gefunden</p>
              ) : (
                filteredPlayers.map((player) => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-white border-2 border-white rounded-lg hover:border-orange-500 cursor-pointer transition-colors shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => handlePlayerSelect(player.id)}
                      className="w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 shadow-sm"
                    />
                    <span className="font-medium text-gray-900">{player.name}</span>
                  </label>
                ))
              )}
            </div>

            <button
              onClick={handleRegisterPlayers}
              disabled={selectedPlayers.size === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {selectedPlayers.size > 0 ? `${selectedPlayers.size} Spieler registrieren` : "Spieler auswählen"}
            </button>
          </div>

          <div className="bg-white border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Registrierte Spieler</h2>
              <span className="text-sm font-bold text-orange-500">
                {registeredPlayers.length} / {tournamentSize}
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {registeredPlayers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Noch keine Spieler registriert</p>
              ) : (
                registeredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 border-2 rounded-lg shadow-sm transition-colors ${
                      player.paid ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white font-bold rounded-full text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{player.player_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={player.paid}
                          onChange={() => togglePaymentStatus(player.id, player.paid)}
                          className="w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500"
                        />
                        <span className="text-sm text-gray-600">Bezahlt</span>
                      </label>
                      <button
                        onClick={() => handleUnregisterPlayer(player.id)}
                        className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                        title="Registrierung entfernen"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

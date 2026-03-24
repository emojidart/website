"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  List,
  PlusCircle,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  UserPlus,
  BadgeCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SpieldatenbankEntry } from "@/types/tournament"

interface RegistrationTabProps {
  currentUser: any
  registeredPlayers: SpieldatenbankEntry[]
  selectedPlayersForRegistration: SpieldatenbankEntry[]
  setSelectedPlayersForRegistration: React.Dispatch<React.SetStateAction<SpieldatenbankEntry[]>>
  handleRegisterPlayers: () => Promise<void>
  handleClearRegisteredPlayers: () => Promise<void>
  handleUpdatePlayerPaidStatus: (playerId: string, paid: boolean) => Promise<void>
  isRegisteringPlayers: boolean
  loading: boolean
}

export function RegistrationTab({
  currentUser,
  registeredPlayers,
  selectedPlayersForRegistration,
  setSelectedPlayersForRegistration,
  handleRegisterPlayers,
  handleClearRegisteredPlayers,
  handleUpdatePlayerPaidStatus,
  isRegisteringPlayers,
  loading,
}: RegistrationTabProps) {
  const { toast } = useToast()

  const [availablePlayers, setAvailablePlayers] = useState<SpieldatenbankEntry[]>([])
  const [filterText, setFilterText] = useState("")
  const [fetchingAvailablePlayers, setFetchingAvailablePlayers] = useState(true)

  const fetchAvailablePlayers = useCallback(async () => {
    setFetchingAvailablePlayers(true)

    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("id, name, ligastatus, geschlecht, verein")
        .order("name", { ascending: true })

      if (error) throw error
      setAvailablePlayers(data || [])
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: `Fehler beim Laden der Spieler: ${err.message}`,
      })
    } finally {
      setFetchingAvailablePlayers(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAvailablePlayers()
  }, [fetchAvailablePlayers])

  const filteredAvailablePlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(filterText.toLowerCase()) &&
      !registeredPlayers.some((regPlayer) => regPlayer.id === player.id),
  )

  const handleSelectPlayer = (player: SpieldatenbankEntry) => {
    setSelectedPlayersForRegistration((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player],
    )
  }

  const isPlayerSelected = (player: SpieldatenbankEntry) =>
    selectedPlayersForRegistration.some((p) => p.id === player.id)

  const paidPlayersCount = registeredPlayers.filter((player) => player.paid).length
  const unpaidPlayersCount = registeredPlayers.length - paidPlayersCount

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/40 to-orange-100/60 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.14),transparent_30%)]" />
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                Kratzer Registrierung
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Spieler registrieren
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[460px]">
              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Verfügbar</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{filteredAvailablePlayers.length}</div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Ausgewählt</div>
                <div className="mt-2 text-2xl font-bold text-orange-600">
                  {selectedPlayersForRegistration.length}
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registriert</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{registeredPlayers.length}</div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bezahlt</div>
                <div className="mt-2 text-2xl font-bold text-green-600">{paidPlayersCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />

          <CardHeader className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-orange-50/40 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Users className="h-5 w-5" />
                  </div>
                  Verfügbare Spieler
                </CardTitle>

                <CardDescription className="mt-2 text-sm text-gray-600">
                  Hier siehst du alle Spieler aus der Datenbank, die noch nicht für dieses Turnier registriert sind.
                </CardDescription>
              </div>

              <div className="hidden rounded-2xl border border-orange-100 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <div className="text-xs uppercase tracking-wide text-gray-500">Treffer</div>
                <div className="text-xl font-bold text-gray-900">{filteredAvailablePlayers.length}</div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
              <Input
                placeholder="Spieler suchen..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-12 rounded-2xl border-orange-200 bg-white pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500"
              />
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/30 to-white p-3">
              <div className="h-[500px] overflow-y-auto pr-1">
                {fetchingAvailablePlayers ? (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      <span className="text-sm font-medium">Spieler werden geladen...</span>
                    </div>
                  </div>
                ) : filteredAvailablePlayers.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm">
                      <UserPlus className="mx-auto h-10 w-10 text-orange-300" />
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Keine passenden Spieler</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {filterText
                          ? "Für deine Suche wurde kein passender Spieler gefunden."
                          : "Alle verfügbaren Spieler sind bereits registriert."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAvailablePlayers.map((player) => {
                      const selected = isPlayerSelected(player)

                      return (
                        <div
                          key={player.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectPlayer(player)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleSelectPlayer(player)
                            }
                          }}
                          className={`group relative w-full cursor-pointer rounded-3xl border p-4 text-left transition-all duration-200 ${
                            selected
                              ? "border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 shadow-[0_8px_24px_rgba(249,115,22,0.14)]"
                              : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-base font-semibold text-gray-900">{player.name}</div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.ligastatus || "Ohne Ligastatus"}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.verein || "Ohne Verein"}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {player.geschlecht || "Keine Angabe"}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                                selected
                                  ? "border-orange-300 bg-white shadow-sm"
                                  : "border-gray-200 bg-gray-50 group-hover:border-orange-200 group-hover:bg-white"
                              }`}
                            >
                              <Checkbox checked={selected} className="pointer-events-none shrink-0" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold text-orange-700">
                  {selectedPlayersForRegistration.length} Spieler ausgewählt
                </span>
                <span className="text-gray-500"> — bereit zur Registrierung</span>
              </div>

              <Button
                onClick={handleRegisterPlayers}
                disabled={selectedPlayersForRegistration.length === 0 || isRegisteringPlayers || loading}
                className="h-12 rounded-2xl bg-orange-600 px-6 font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
              >
                {isRegisteringPlayers ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registriere...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Spieler registrieren ({selectedPlayersForRegistration.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />

          <CardHeader className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-orange-50/40 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <List className="h-5 w-5" />
                  </div>
                  Registrierte Spieler
                </CardTitle>

                <CardDescription className="mt-2 text-sm text-gray-600">
                  Übersicht aller registrierten Spieler inklusive Bezahlstatus.
                </CardDescription>
              </div>

              <div className="hidden rounded-2xl border border-orange-100 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <div className="text-xs uppercase tracking-wide text-gray-500">Gesamt</div>
                <div className="text-xl font-bold text-gray-900">{registeredPlayers.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-green-700">Bezahlt</div>
                <div className="mt-1 text-xl font-bold text-green-700">{paidPlayersCount}</div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-amber-700">Offen</div>
                <div className="mt-1 text-xl font-bold text-amber-700">{unpaidPlayersCount}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/30 to-white p-3">
              <div className="h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      <span className="text-sm font-medium">Registrierungen werden geladen...</span>
                    </div>
                  </div>
                ) : registeredPlayers.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm">
                      <List className="mx-auto h-10 w-10 text-orange-300" />
                      <h3 className="mt-4 text-base font-semibold text-gray-900">Noch keine Registrierungen</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Sobald Spieler hinzugefügt wurden, erscheinen sie hier.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-orange-50 to-amber-50 hover:bg-orange-50">
                          <TableHead className="h-12 font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Ligastatus</TableHead>
                          <TableHead className="text-center font-semibold text-gray-700">Bezahlt</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {registeredPlayers.map((player) => (
                          <TableRow key={player.id} className="hover:bg-orange-50/40">
                            <TableCell className="py-4">
                              <div className="font-semibold text-gray-900">{player.name}</div>
                            </TableCell>

                            <TableCell className="py-4">
                              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                {player.ligastatus || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="py-4 text-center">
                              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                <Checkbox
                                  checked={player.paid || false}
                                  onCheckedChange={(checked) =>
                                    handleUpdatePlayerPaidStatus(player.id, checked as boolean)
                                  }
                                />
                                {player.paid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleClearRegisteredPlayers}
              variant="destructive"
              className="mt-4 h-12 w-full rounded-2xl font-semibold shadow-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Alle Registrierungen löschen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, Trophy, Calendar, Users, Info } from "lucide-react"
import { getPastTournaments, type PublicTournamentData } from "@/actions/public-tournaments"

export default function KratzerResultsSection() {
  const [tournaments, setTournaments] = useState<PublicTournamentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getPastTournaments()
        if (response.success && response.data) {
          setTournaments(response.data)
        } else {
          setError(response.message || "Fehler beim Laden der Turniere.")
        }
      } catch (err: any) {
        console.error("Failed to fetch tournaments:", err)
        setError(`Ein unerwarteter Fehler ist aufgetreten: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <div>
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-16 w-16 animate-spin text-orange-500" />
          <p className="mt-4 text-gray-700 text-lg font-semibold">Kratzer Turniere werden geladen...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-8" role="alert">
          <strong className="font-bold">Fehler!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!loading && !error && tournaments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Info className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600 text-lg">Es wurden noch keine Kratzer Turniere abgeschlossen.</p>
          <p className="text-gray-500 text-sm mt-2">Schauen Sie später wieder vorbei!</p>
        </div>
      )}

      {!loading && !error && tournaments.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="shadow-xl border-gray-200">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Trophy className="h-7 w-7 text-yellow-600" />
                  {tournament.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold">Gewinner:</span> {tournament.winner_name || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Abgeschlossen am:</span> {formatDate(tournament.finished_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Runden:</span> {tournament.total_rounds || "N/A"}
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold text-orange-600 hover:text-orange-700">
                      Detaillierte Spielergebnisse
                    </AccordionTrigger>
                    <AccordionContent>
                      {tournament.results_data && tournament.results_data.length > 0 ? (
                        <div className="overflow-x-auto mt-4 border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">Rang</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Ligastatus</TableHead>
                                <TableHead>Leben</TableHead>
                                <TableHead>Ausgeschieden</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tournament.results_data.map((playerResult, index) => (
                                <TableRow key={index} className={playerResult.isEliminated ? "opacity-70" : ""}>
                                  <TableCell className="font-medium">{playerResult.rank}</TableCell>
                                  <TableCell>{playerResult.name}</TableCell>
                                  <TableCell>{playerResult.ligastatus}</TableCell>
                                  <TableCell>{playerResult.lives}</TableCell>
                                  <TableCell>
                                    {playerResult.isEliminated
                                      ? `Runde ${playerResult.eliminationRound || "N/A"}`
                                      : "Nein"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-gray-500 mt-4">Keine detaillierten Spielergebnisse verfügbar.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

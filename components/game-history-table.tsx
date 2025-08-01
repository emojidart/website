"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Target,
  Users,
  Search,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  Edit,
  Save,
  X,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useDartData } from "@/hooks/use-dart-data"

interface GameEntry {
  id: string
  player_name: string
  game_type: "edart" | "steeldart"
  points: number
  legs: number
  game_date: string
  user_id: string
  created_at: string
}

interface GroupedEntries {
  [gameType: string]: {
    [date: string]: GameEntry[]
  }
}

export function GameHistoryTable() {
  const { recalculatePlayerStats } = useDartData()
  const [gameEntries, setGameEntries] = useState<GameEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<GameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({})

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<GameEntry | null>(null)
  const [editFormData, setEditFormData] = useState({
    points: "",
    legs: "",
    game_date: "",
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState("")

  useEffect(() => {
    fetchGameEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [gameEntries, searchTerm])

  const fetchGameEntries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("game_entries").select("*").order("game_date", { ascending: false })

      if (error) {
        throw error
      }

      setGameEntries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = [...gameEntries]

    if (searchTerm) {
      filtered = filtered.filter((entry) => entry.player_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    setFilteredEntries(filtered)
  }

  const groupEntriesByTypeAndDate = (entries: GameEntry[]): GroupedEntries => {
    const grouped: GroupedEntries = {}

    entries.forEach((entry) => {
      const gameType = entry.game_type
      const date = entry.game_date

      if (!grouped[gameType]) {
        grouped[gameType] = {}
      }

      if (!grouped[gameType][date]) {
        grouped[gameType][date] = []
      }

      grouped[gameType][date].push(entry)
    })

    // Sort dates within each game type
    Object.keys(grouped).forEach((gameType) => {
      const sortedDates = Object.keys(grouped[gameType]).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      const sortedGroup: { [date: string]: GameEntry[] } = {}
      sortedDates.forEach((date) => {
        // Sort entries within each date by combined score (points + legs) in descending order
        sortedGroup[date] = grouped[gameType][date].sort((a, b) => b.points + b.legs - (a.points + a.legs))
      })
      grouped[gameType] = sortedGroup
    })

    return grouped
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const calculateTotalPoints = (entries: GameEntry[]) => {
    return entries.reduce((sum, entry) => sum + entry.points, 0)
  }

  const calculateTotalLegs = (entries: GameEntry[]) => {
    return entries.reduce((sum, entry) => sum + entry.legs, 0)
  }

  // Neue Funktion zur Berechnung der kombinierten Punktzahl
  const calculateCombinedScore = (entries: GameEntry[]) => {
    return entries.reduce((sum, entry) => sum + entry.points + entry.legs, 0)
  }

  const handleDeleteEntry = async (entryToDelete: GameEntry) => {
    if (
      !confirm(
        `Möchtest du den Spieleintrag von ${entryToDelete.player_name} vom ${formatDate(entryToDelete.game_date)} wirklich löschen?`,
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from("game_entries").delete().eq("id", entryToDelete.id)

      if (error) {
        throw error
      }

      await recalculatePlayerStats(entryToDelete.player_name, entryToDelete.game_type)
      await fetchGameEntries()
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (entry: GameEntry) => {
    setEditingEntry(entry)
    setEditFormData({
      points: entry.points.toString(),
      legs: entry.legs.toString(),
      game_date: entry.game_date,
    })
    setIsEditModalOpen(true)
    setEditMessage("")
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return

    setEditLoading(true)
    setEditMessage("Speichern...")

    const numericPoints = Number(editFormData.points)
    const numericLegs = Number(editFormData.legs)

    if (isNaN(numericPoints) || isNaN(numericLegs) || numericPoints < 0 || numericLegs < 0) {
      setEditMessage("Punkte und Legs müssen gültige Zahlen sein.")
      setEditLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from("game_entries")
        .update({
          points: numericPoints,
          legs: numericLegs,
          game_date: editFormData.game_date,
        })
        .eq("id", editingEntry.id)

      if (error) {
        throw error
      }

      await recalculatePlayerStats(editingEntry.player_name, editingEntry.game_type)

      setEditMessage("Erfolgreich gespeichert!")
      setTimeout(() => {
        setIsEditModalOpen(false)
        setEditingEntry(null)
        fetchGameEntries()
      }, 1000)
    } catch (err: any) {
      setEditMessage(`Fehler: ${err.message}`)
    } finally {
      setEditLoading(false)
    }
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingEntry(null)
    setEditMessage("")
  }

  const exportToCSV = () => {
    const headers = ["Spielername", "Spieltyp", "Punkte", "Legs", "Kombinierte Punktzahl", "Spieldatum"] // Header aktualisiert
    const csvData = filteredEntries.map((entry) => [
      entry.player_name,
      entry.game_type === "edart" ? "E-Dart" : "Steeldart",
      entry.points,
      entry.legs,
      entry.points + entry.legs, // Kombinierte Punktzahl für CSV
      formatDate(entry.game_date),
    ])

    const csvContent = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `spieleintraege_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lade Spieleinträge...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 text-lg font-semibold mb-2">Fehler beim Laden</div>
          <p className="text-red-700">{error}</p>
          <Button onClick={fetchGameEntries} className="mt-4 bg-transparent" variant="outline">
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  const groupedEntries = groupEntriesByTypeAndDate(filteredEntries)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header & Search */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Spieleinträge Historie</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Übersicht nach Turnierart und Datum organisiert</p>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="border-gray-200 hover:bg-gray-50 bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              CSV Export
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Nach Spielername suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Game Type Sections */}
      {Object.keys(groupedEntries).length === 0 ? (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Spieleinträge gefunden</h3>
            <p className="text-gray-600">
              {searchTerm ? "Versuche andere Suchkriterien." : "Es sind noch keine Spieleinträge vorhanden."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* E-Dart Section */}
          {groupedEntries.edart && (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-blue-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-blue-900">E-Dart Turniere</CardTitle>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Zap className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateTotalPoints(Object.values(groupedEntries.edart).flat())} Punkte
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Target className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateTotalLegs(Object.values(groupedEntries.edart).flat())} Legs
                      </span>
                    </div>
                    {/* Kombinierte Punktzahl für E-Dart Gesamt */}
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateCombinedScore(Object.values(groupedEntries.edart).flat())} Gesamt
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {Object.entries(groupedEntries.edart).map(([date, entries]) => {
                  const sectionKey = `edart-${date}`
                  const isExpanded = expandedSections[sectionKey] !== false
                  const dateTotalPoints = calculateTotalPoints(entries)
                  const dateTotalLegs = calculateTotalLegs(entries)
                  const dateCombinedScore = calculateCombinedScore(entries) // Kombinierte Punktzahl pro Datum

                  return (
                    <div key={date} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleSection(sectionKey)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{formatDate(date)}</span>
                          <Badge className="bg-blue-100 text-blue-800 border-0">
                            {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Zap className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateTotalPoints}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Target className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateTotalLegs}</span>
                          </div>
                          {/* Kombinierte Punktzahl pro Datum */}
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Star className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateCombinedScore}</span>
                          </div>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-4">
                          <div className="bg-blue-50 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-blue-100">
                                {/* Entfernen von Leerzeichen zwischen <tr> und <th> */}
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Spieler</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-blue-900">Punkte</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-blue-900">Legs</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-blue-900">Gesamt</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-blue-900">
                                    Aktionen
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((entry, index) => (
                                  <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-blue-25"}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{entry.player_name}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-blue-700">
                                      {entry.points}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-blue-700">{entry.legs}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-blue-700">
                                      {entry.points + entry.legs}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex justify-center space-x-2">
                                        <Button
                                          onClick={() => handleEditClick(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent h-8 w-8 p-0"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteEntry(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent h-8 w-8 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Steel Dart Section */}
          {groupedEntries.steeldart && (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-green-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-green-900">Steel Dart Turniere</CardTitle>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-green-600">
                      <Zap className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateTotalPoints(Object.values(groupedEntries.steeldart).flat())} Punkte
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateTotalLegs(Object.values(groupedEntries.steeldart).flat())} Legs
                      </span>
                    </div>
                    {/* Kombinierte Punktzahl für Steel Dart Gesamt */}
                    <div className="flex items-center space-x-1 text-green-600">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">
                        {calculateCombinedScore(Object.values(groupedEntries.steeldart).flat())} Gesamt
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {Object.entries(groupedEntries.steeldart).map(([date, entries]) => {
                  const sectionKey = `steeldart-${date}`
                  const isExpanded = expandedSections[sectionKey] !== false
                  const dateTotalPoints = calculateTotalPoints(entries)
                  const dateTotalLegs = calculateTotalLegs(entries)
                  const dateCombinedScore = calculateCombinedScore(entries) // Kombinierte Punktzahl pro Datum

                  return (
                    <div key={date} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleSection(sectionKey)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-gray-900">{formatDate(date)}</span>
                          <Badge className="bg-green-100 text-green-800 border-0">
                            {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-green-600">
                            <Zap className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateTotalPoints}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-green-600">
                            <Users className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateTotalLegs}</span>
                          </div>
                          {/* Kombinierte Punktzahl pro Datum */}
                          <div className="flex items-center space-x-1 text-green-600">
                            <Star className="h-3 w-3" />
                            <span className="text-sm font-semibold">{dateCombinedScore}</span>
                          </div>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-4">
                          <div className="bg-green-50 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-green-100">
                                {/* Entfernen von Leerzeichen zwischen <tr> und <th> */}
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-green-900">Spieler</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-green-900">Punkte</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-green-900">Legs</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-green-900">Gesamt</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-green-900">
                                    Aktionen
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((entry, index) => (
                                  <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-green-25"}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{entry.player_name}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-700">
                                      {entry.points}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-700">{entry.legs}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-700">
                                      {entry.points + entry.legs}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex justify-center space-x-2">
                                        <Button
                                          onClick={() => handleEditClick(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-green-200 text-green-600 hover:bg-green-50 bg-transparent h-8 w-8 p-0"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteEntry(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent h-8 w-8 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-md mx-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">Eintrag bearbeiten</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {editingEntry?.player_name} - {editingEntry?.game_type === "edart" ? "E-Dart" : "Steeldart"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="editPoints" className="text-sm font-medium text-gray-700">
                Punkte
              </label>
              <Input
                id="editPoints"
                type="number"
                min="0"
                value={editFormData.points}
                onChange={(e) => setEditFormData({ ...editFormData, points: e.target.value })}
                className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editLegs" className="text-sm font-medium text-gray-700">
                Legs
              </label>
              <Input
                id="editLegs"
                type="number"
                min="0"
                value={editFormData.legs}
                onChange={(e) => setEditFormData({ ...editFormData, legs: e.target.value })}
                className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGameDate" className="text-sm font-medium text-gray-700">
                Spieldatum
              </label>
              <Input
                id="editGameDate"
                type="date"
                value={editFormData.game_date}
                onChange={(e) => setEditFormData({ ...editFormData, game_date: e.target.value })}
                className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50"
                required
              />
            </div>

            {editMessage && (
              <div
                className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  editMessage.includes("Erfolgreich")
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-red-50 text-red-700 border border-red-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {editMessage.includes("Erfolgreich") ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{editMessage}</span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseEditModal} disabled={editLoading}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Speichern...</span>
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

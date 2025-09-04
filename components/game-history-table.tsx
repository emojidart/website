"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Zap,
  Star,
  Trophy,
  Medal,
  Award,
  TrendingUp,
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-6"
            />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Lade Spieleinträge...</h3>
              <p className="text-gray-600">Einen Moment bitte</p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 px-4"
      >
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-red-50 via-white to-red-50 max-w-md mx-auto overflow-hidden">
          <CardContent className="p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            </motion.div>
            <div className="text-red-600 text-xl font-bold mb-2">Fehler beim Laden</div>
            <p className="text-red-700 mb-4">{error}</p>
            <Button
              onClick={fetchGameEntries}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const groupedEntries = groupEntriesByTypeAndDate(filteredEntries)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-3 bg-white/20 rounded-xl shadow-lg backdrop-blur-sm"
              >
                <Eye className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </motion.div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-1">Spieleinträge Historie</CardTitle>
                <p className="text-red-100 text-sm sm:text-base">Übersicht nach Turnierart und Datum organisiert</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={exportToCSV}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm shadow-lg"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">CSV Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </motion.div>
          </motion.div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Nach Spielername suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 rounded-xl text-base shadow-inner"
            />
          </motion.div>
        </CardContent>
      </Card>

      {Object.keys(groupedEntries).length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                <Eye className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Keine Spieleinträge gefunden</h3>
              <p className="text-gray-600 text-lg">
                {searchTerm ? "Versuche andere Suchkriterien." : "Es sind noch keine Spieleinträge vorhanden."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {groupedEntries.edart && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="p-3 bg-white/20 rounded-xl shadow-lg backdrop-blur-sm"
                      >
                        <Target className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-white">E-Dart Turniere</CardTitle>
                        <p className="text-blue-100 text-sm">Elektronische Dart Wertungen</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateTotalPoints(Object.values(groupedEntries.edart).flat())}
                        </span>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Target className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateTotalLegs(Object.values(groupedEntries.edart).flat())}
                        </span>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Star className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateCombinedScore(Object.values(groupedEntries.edart).flat())}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {Object.entries(groupedEntries.edart).map(([date, entries], index) => {
                    const sectionKey = `edart-${date}`
                    const isExpanded = expandedSections[sectionKey] !== false
                    const dateTotalPoints = calculateTotalPoints(entries)
                    const dateTotalLegs = calculateTotalLegs(entries)
                    const dateCombinedScore = calculateCombinedScore(entries)

                    return (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="border-b border-blue-100 last:border-b-0"
                      >
                        <motion.button
                          whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                          whileTap={{ scale: 0.995 }}
                          onClick={() => toggleSection(sectionKey)}
                          className="w-full px-6 py-5 flex items-center justify-between transition-all duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            <motion.div whileHover={{ scale: 1.1 }} className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </motion.div>
                            <div className="text-left">
                              <span className="font-bold text-gray-900 text-lg">{formatDate(date)}</span>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className="bg-blue-100 text-blue-800 border-0 font-semibold">
                                  {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 rounded-lg px-3 py-1">
                              <Zap className="h-4 w-4" />
                              <span className="font-bold">{dateTotalPoints}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 rounded-lg px-3 py-1">
                              <Target className="h-4 w-4" />
                              <span className="font-bold">{dateTotalLegs}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 rounded-lg px-3 py-1">
                              <Star className="h-4 w-4" />
                              <span className="font-bold">{dateCombinedScore}</span>
                            </div>
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </motion.div>
                          </div>
                        </motion.button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="px-6 pb-6"
                            >
                              <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-xl overflow-hidden shadow-inner border border-blue-100">
                                <table className="w-full">
                                  <thead className="bg-gradient-to-r from-blue-100 to-blue-200">
                                    <tr>
                                      <th className="px-4 py-4 text-left text-sm font-bold text-blue-900">Spieler</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Punkte</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Legs</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Gesamt</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">
                                        Aktionen
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entries.map((entry, entryIndex) => (
                                      <motion.tr
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * entryIndex }}
                                        className={`${
                                          entryIndex % 2 === 0 ? "bg-white" : "bg-blue-25"
                                        } hover:bg-blue-50 transition-colors duration-150`}
                                      >
                                        <td className="px-4 py-4">
                                          <div className="flex items-center space-x-3">
                                            {entryIndex < 3 && (
                                              <div className="flex-shrink-0">
                                                {entryIndex === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                {entryIndex === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                                                {entryIndex === 2 && <Award className="h-4 w-4 text-amber-600" />}
                                              </div>
                                            )}
                                            <span className="font-semibold text-gray-900">{entry.player_name}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                            {entry.points}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                            {entry.legs}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm">
                                            {entry.points + entry.legs}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <div className="flex justify-center space-x-2">
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                              <Button
                                                onClick={() => handleEditClick(entry)}
                                                variant="outline"
                                                size="sm"
                                                className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                            </motion.div>
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                              <Button
                                                onClick={() => handleDeleteEntry(entry)}
                                                variant="outline"
                                                size="sm"
                                                className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </motion.div>
                                          </div>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {groupedEntries.steeldart && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-green-50/30 to-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="p-3 bg-white/20 rounded-xl shadow-lg backdrop-blur-sm"
                      >
                        <Users className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-white">Steel Dart Turniere</CardTitle>
                        <p className="text-green-100 text-sm">Klassische Dart Wertungen</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateTotalPoints(Object.values(groupedEntries.steeldart).flat())}
                        </span>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Users className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateTotalLegs(Object.values(groupedEntries.steeldart).flat())}
                        </span>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <Star className="h-4 w-4" />
                        <span className="font-bold">
                          {calculateCombinedScore(Object.values(groupedEntries.steeldart).flat())}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </CardHeader>
                {/* ... existing steeldart content with similar enhancements ... */}
                <CardContent className="p-0">
                  {Object.entries(groupedEntries.steeldart).map(([date, entries], index) => {
                    const sectionKey = `steeldart-${date}`
                    const isExpanded = expandedSections[sectionKey] !== false
                    const dateTotalPoints = calculateTotalPoints(entries)
                    const dateTotalLegs = calculateTotalLegs(entries)
                    const dateCombinedScore = calculateCombinedScore(entries)

                    return (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="border-b border-green-100 last:border-b-0"
                      >
                        <motion.button
                          whileHover={{ backgroundColor: "rgba(34, 197, 94, 0.05)" }}
                          whileTap={{ scale: 0.995 }}
                          onClick={() => toggleSection(sectionKey)}
                          className="w-full px-6 py-5 flex items-center justify-between transition-all duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            <motion.div whileHover={{ scale: 1.1 }} className="p-2 bg-green-100 rounded-lg">
                              <Calendar className="h-5 w-5 text-green-600" />
                            </motion.div>
                            <div className="text-left">
                              <span className="font-bold text-gray-900 text-lg">{formatDate(date)}</span>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className="bg-green-100 text-green-800 border-0 font-semibold">
                                  {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-green-600 bg-green-50 rounded-lg px-3 py-1">
                              <Zap className="h-4 w-4" />
                              <span className="font-bold">{dateTotalPoints}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 bg-green-50 rounded-lg px-3 py-1">
                              <Users className="h-4 w-4" />
                              <span className="font-bold">{dateTotalLegs}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 bg-green-50 rounded-lg px-3 py-1">
                              <Star className="h-4 w-4" />
                              <span className="font-bold">{dateCombinedScore}</span>
                            </div>
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </motion.div>
                          </div>
                        </motion.button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="px-6 pb-6"
                            >
                              <div className="bg-gradient-to-br from-green-50 via-white to-green-50 rounded-xl overflow-hidden shadow-inner border border-green-100">
                                <table className="w-full">
                                  <thead className="bg-gradient-to-r from-green-100 to-green-200">
                                    <tr>
                                      <th className="px-4 py-4 text-left text-sm font-bold text-green-900">Spieler</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-green-900">Punkte</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-green-900">Legs</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-green-900">Gesamt</th>
                                      <th className="px-4 py-4 text-center text-sm font-bold text-green-900">
                                        Aktionen
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entries.map((entry, entryIndex) => (
                                      <motion.tr
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * entryIndex }}
                                        className={`${
                                          entryIndex % 2 === 0 ? "bg-white" : "bg-green-25"
                                        } hover:bg-green-50 transition-colors duration-150`}
                                      >
                                        <td className="px-4 py-4">
                                          <div className="flex items-center space-x-3">
                                            {entryIndex < 3 && (
                                              <div className="flex-shrink-0">
                                                {entryIndex === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                {entryIndex === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                                                {entryIndex === 2 && <Award className="h-4 w-4 text-amber-600" />}
                                              </div>
                                            )}
                                            <span className="font-semibold text-gray-900">{entry.player_name}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                            {entry.points}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                            {entry.legs}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-sm">
                                            {entry.points + entry.legs}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <div className="flex justify-center space-x-2">
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                              <Button
                                                onClick={() => handleEditClick(entry)}
                                                variant="outline"
                                                size="sm"
                                                className="border-green-200 text-green-600 hover:bg-green-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                            </motion.div>
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                              <Button
                                                onClick={() => handleDeleteEntry(entry)}
                                                variant="outline"
                                                size="sm"
                                                className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </motion.div>
                                          </div>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-white via-gray-50 to-white border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg"
              >
                <Edit className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Eintrag bearbeiten</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {editingEntry?.player_name} - {editingEntry?.game_type === "edart" ? "E-Dart" : "Steeldart"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="py-6 space-y-6">
            <div className="space-y-3">
              <label htmlFor="editPoints" className="text-sm font-semibold text-gray-700 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-blue-600" />
                Punkte
              </label>
              <Input
                id="editPoints"
                type="number"
                min="0"
                value={editFormData.points}
                onChange={(e) => setEditFormData({ ...editFormData, points: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editLegs" className="text-sm font-semibold text-gray-700 flex items-center">
                <Target className="h-4 w-4 mr-2 text-green-600" />
                Legs
              </label>
              <Input
                id="editLegs"
                type="number"
                min="0"
                value={editFormData.legs}
                onChange={(e) => setEditFormData({ ...editFormData, legs: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editGameDate" className="text-sm font-semibold text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                Spieldatum
              </label>
              <Input
                id="editGameDate"
                type="date"
                value={editFormData.game_date}
                onChange={(e) => setEditFormData({ ...editFormData, game_date: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>

            {editMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  editMessage.includes("Erfolgreich")
                    ? "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-2 border-green-200"
                    : "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {editMessage.includes("Erfolgreich") ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span>{editMessage}</span>
                </div>
              </motion.div>
            )}

            <DialogFooter className="pt-6 space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={editLoading}
                className="border-2 border-gray-200 hover:bg-gray-50 rounded-xl px-6 py-3 bg-transparent"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl rounded-xl px-6 py-3"
              >
                {editLoading ? (
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
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

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Trophy,
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
  Medal,
  Award,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface TournamentEntry {
  id: string
  tournament_id: string
  tournament_name: string
  player_name: string
  placement: number
  legs_won: number
  legs_lost: number
  placement_points: number
  bonus_points: number
  tournament_date: string
  tournament_type: string
  matches_played: number
  matches_won: number
  matches_lost: number
  form?: string
}

interface GroupedEntries {
  [tournamentKey: string]: TournamentEntry[]
}

export function GameHistoryTable() {
  const [tournamentEntries, setTournamentEntries] = useState<TournamentEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<TournamentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({})

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TournamentEntry | null>(null)
  const [editFormData, setEditFormData] = useState({
    placement_points: "",
    bonus_points: "",
    legs_won: "",
    legs_lost: "",
    tournament_date: "",
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState("")

  useEffect(() => {
    fetchTournamentEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [tournamentEntries, searchTerm])

  const fetchTournamentEntries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("tournament_series_standings")
        .select("*")
        .order("tournament_date", { ascending: false })

      if (error) {
        throw error
      }

      setTournamentEntries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = [...tournamentEntries]

    if (searchTerm) {
      filtered = filtered.filter((entry) => entry.player_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    setFilteredEntries(filtered)
  }

  const groupEntriesByTournament = (entries: TournamentEntry[]): GroupedEntries => {
    const grouped: GroupedEntries = {}

    entries.forEach((entry) => {
      const tournamentKey = `${entry.tournament_id}-${entry.tournament_name}`

      if (!grouped[tournamentKey]) {
        grouped[tournamentKey] = []
      }

      grouped[tournamentKey].push(entry)
    })

    Object.keys(grouped).forEach((tournamentKey) => {
      grouped[tournamentKey].sort((a, b) => {
        if (a.placement !== b.placement) {
          return a.placement - b.placement
        }
        const totalA = a.placement_points + a.bonus_points + a.legs_won
        const totalB = b.placement_points + b.bonus_points + b.legs_won
        return totalB - totalA
      })
    })

    return grouped
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const handleDeleteEntry = async (entryToDelete: TournamentEntry) => {
    if (
      !confirm(
        `Möchtest du den Turniereintrag von ${entryToDelete.player_name} aus ${entryToDelete.tournament_name} wirklich löschen?`,
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from("tournament_series_standings").delete().eq("id", entryToDelete.id)

      if (error) {
        throw error
      }

      await fetchTournamentEntries()
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (entry: TournamentEntry) => {
    setEditingEntry(entry)
    setEditFormData({
      placement_points: entry.placement_points.toString(),
      bonus_points: entry.bonus_points.toString(),
      legs_won: entry.legs_won.toString(),
      legs_lost: entry.legs_lost.toString(),
      tournament_date: entry.tournament_date,
    })
    setIsEditModalOpen(true)
    setEditMessage("")
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return

    setEditLoading(true)
    setEditMessage("Speichern...")

    const numericPlacementPoints = Number(editFormData.placement_points)
    const numericBonusPoints = Number(editFormData.bonus_points)
    const numericLegsWon = Number(editFormData.legs_won)
    const numericLegsLost = Number(editFormData.legs_lost)

    if (
      isNaN(numericPlacementPoints) ||
      isNaN(numericBonusPoints) ||
      isNaN(numericLegsWon) ||
      isNaN(numericLegsLost) ||
      numericPlacementPoints < 0 ||
      numericBonusPoints < 0 ||
      numericLegsWon < 0 ||
      numericLegsLost < 0
    ) {
      setEditMessage("Alle Felder müssen gültige Zahlen sein.")
      setEditLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from("tournament_series_standings")
        .update({
          placement_points: numericPlacementPoints,
          bonus_points: numericBonusPoints,
          legs_won: numericLegsWon,
          legs_lost: numericLegsLost,
          tournament_date: editFormData.tournament_date,
        })
        .eq("id", editingEntry.id)

      if (error) {
        throw error
      }

      setEditMessage("Erfolgreich gespeichert!")
      setTimeout(() => {
        setIsEditModalOpen(false)
        setEditingEntry(null)
        fetchTournamentEntries()
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
    const headers = [
      "Turnier",
      "Spielername",
      "Platzierung",
      "Platzierungspunkte",
      "Bonuspunkte",
      "Legs Gewonnen",
      "Legs Verloren",
      "Gesamt",
      "Datum",
    ]
    const csvData = filteredEntries.map((entry) => [
      entry.tournament_name,
      entry.player_name,
      entry.placement,
      entry.placement_points,
      entry.bonus_points,
      entry.legs_won,
      entry.legs_lost,
      entry.placement_points + entry.bonus_points + entry.legs_won,
      formatDate(entry.tournament_date),
    ])

    const csvContent = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `turnierserie_${new Date().toISOString().split("T")[0]}.csv`)
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

  const getPlacementColor = (placement: number) => {
    if (placement === 1) return "bg-yellow-400 text-white"
    if (placement === 2) return "bg-gray-300 text-white"
    if (placement === 3) return "bg-amber-400 text-white"
    return "bg-gray-100 text-gray-700"
  }

  const getPlacementIcon = (placement: number) => {
    if (placement === 1) return "🥇"
    if (placement === 2) return "🥈"
    if (placement === 3) return "🥉"
    return null
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Lade Turniere...</h3>
            <p className="text-gray-600">Einen Moment bitte</p>
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
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <div className="text-red-600 text-xl font-bold mb-2">Fehler beim Laden</div>
            <p className="text-red-700 mb-4">{error}</p>
            <Button
              onClick={fetchTournamentEntries}
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

  const groupedEntries = groupEntriesByTournament(filteredEntries)

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
                <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-1">Turnierserie Historie</CardTitle>
                <p className="text-red-100 text-sm sm:text-base">Alle Turniere mit Ergebnissen</p>
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
              <Eye className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Keine Turniere gefunden</h3>
              <p className="text-gray-600 text-lg">
                {searchTerm ? "Versuche andere Suchkriterien." : "Es sind noch keine Turniere vorhanden."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEntries).map(([tournamentKey, entries], index) => {
            const firstEntry = entries[0]
            const sectionKey = tournamentKey
            const isExpanded = expandedSections[sectionKey] !== false

            return (
              <motion.div
                key={tournamentKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-white overflow-hidden">
                  <motion.button
                    whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full px-6 py-5 flex items-center justify-between transition-all duration-200 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-white text-lg">{firstEntry.tournament_name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className="bg-white/20 text-white border-0 font-semibold">
                            {entries.length} {entries.length === 1 ? "Teilnehmer" : "Teilnehmer"}
                          </Badge>
                          <span className="text-blue-100 text-sm">{formatDate(firstEntry.tournament_date)}</span>
                        </div>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-5 w-5 text-white" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="p-6"
                      >
                        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-xl overflow-hidden shadow-inner border border-blue-100">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gradient-to-r from-blue-100 to-blue-200">
                                <tr>
                                  <th className="px-4 py-4 text-left text-sm font-bold text-blue-900">Platz</th>
                                  <th className="px-4 py-4 text-left text-sm font-bold text-blue-900">Spieler</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Punkte</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Bonus</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Legs W</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Legs L</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Gesamt</th>
                                  <th className="px-4 py-4 text-center text-sm font-bold text-blue-900">Aktionen</th>
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
                                      <div className="flex justify-center">
                                        <div
                                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementColor(entry.placement)}`}
                                        >
                                          {getPlacementIcon(entry.placement) || entry.placement}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center space-x-3">
                                        {entry.placement <= 3 && (
                                          <div className="flex-shrink-0">
                                            {entry.placement === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                            {entry.placement === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                                            {entry.placement === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                          </div>
                                        )}
                                        <span className="font-semibold text-gray-900">{entry.player_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                        {entry.placement_points}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {entry.bonus_points > 0 ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                                          +{entry.bonus_points}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                        {entry.legs_won}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                                        {entry.legs_lost}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm">
                                        {entry.placement_points + entry.bonus_points + entry.legs_won}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <div className="flex justify-center space-x-2">
                                        <Button
                                          onClick={() => handleEditClick(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteEntry(entry)}
                                          variant="outline"
                                          size="sm"
                                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent h-8 w-8 p-0 rounded-lg shadow-sm"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-white via-gray-50 to-white border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Eintrag bearbeiten</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {editingEntry?.player_name} - {editingEntry?.tournament_name}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="py-6 space-y-6">
            <div className="space-y-3">
              <label htmlFor="editPlacementPoints" className="text-sm font-semibold text-gray-700">
                Platzierungspunkte
              </label>
              <Input
                id="editPlacementPoints"
                type="number"
                min="0"
                value={editFormData.placement_points}
                onChange={(e) => setEditFormData({ ...editFormData, placement_points: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editBonusPoints" className="text-sm font-semibold text-gray-700">
                Bonuspunkte
              </label>
              <Input
                id="editBonusPoints"
                type="number"
                min="0"
                value={editFormData.bonus_points}
                onChange={(e) => setEditFormData({ ...editFormData, bonus_points: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editLegsWon" className="text-sm font-semibold text-gray-700">
                Legs Gewonnen
              </label>
              <Input
                id="editLegsWon"
                type="number"
                min="0"
                value={editFormData.legs_won}
                onChange={(e) => setEditFormData({ ...editFormData, legs_won: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editLegsLost" className="text-sm font-semibold text-gray-700">
                Legs Verloren
              </label>
              <Input
                id="editLegsLost"
                type="number"
                min="0"
                value={editFormData.legs_lost}
                onChange={(e) => setEditFormData({ ...editFormData, legs_lost: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="editTournamentDate" className="text-sm font-semibold text-gray-700">
                Turnierdatum
              </label>
              <Input
                id="editTournamentDate"
                type="date"
                value={editFormData.tournament_date}
                onChange={(e) => setEditFormData({ ...editFormData, tournament_date: e.target.value })}
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 rounded-xl text-base"
                required
              />
            </div>

            {editMessage && (
              <div
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
              </div>
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

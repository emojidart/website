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
  Filter,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  Edit,
  Save,
  X,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useDartData } from "@/hooks/use-dart-data" // Import useDartData

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

export function GameHistoryTable() {
  const { recalculatePlayerStats } = useDartData() // Use the hook
  const [gameEntries, setGameEntries] = useState<GameEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<GameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "edart" | "steeldart">("all")
  const [sortBy, setSortBy] = useState<"date" | "player_name" | "created_at">("created_at")

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
    filterAndSortEntries()
  }, [gameEntries, searchTerm, filterType, sortBy])

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

  const filterAndSortEntries = () => {
    let filtered = [...gameEntries]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((entry) => entry.player_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((entry) => entry.game_type === filterType)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "player_name":
          return a.player_name.localeCompare(b.player_name)
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "date":
        default:
          return new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      }
    })

    setFilteredEntries(filtered)
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

      // Neuberechnung der Spielerstatistiken nach dem Löschen
      await recalculatePlayerStats(entryToDelete.player_name, entryToDelete.game_type)

      await fetchGameEntries() // Refresh the list
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

      // Neuberechnung der Spielerstatistiken nach dem Bearbeiten
      await recalculatePlayerStats(editingEntry.player_name, editingEntry.game_type)

      setEditMessage("Erfolgreich gespeichert!")
      setTimeout(() => {
        setIsEditModalOpen(false)
        setEditingEntry(null)
        fetchGameEntries() // Refresh the list
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
    const headers = ["ID", "Spielername", "Spieltyp", "Punkte", "Legs", "Spieldatum", "Eingabezeit"]
    const csvData = filteredEntries.map((entry) => [
      entry.id,
      entry.player_name,
      entry.game_type === "edart" ? "E-Dart" : "Steeldart",
      entry.points,
      entry.legs,
      formatDate(entry.game_date),
      formatDateTime(entry.created_at),
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTypeColor = (type: string) => {
    return type === "edart" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
  }

  const getTypeIcon = (type: string) => {
    return type === "edart" ? <Users className="h-4 w-4" /> : <Target className="h-4 w-4" />
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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header & Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Spieleinträge Historie</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Übersicht und Verwaltung aller Spielergebnisse</p>
                </div>
              </div>
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
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
              </div>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-full md:w-48 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Spieltypen</SelectItem>
                  <SelectItem value="edart">Nur E-Dart</SelectItem>
                  <SelectItem value="steeldart">Nur Steeldart</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-48 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Nach Eingabezeit</SelectItem>
                  <SelectItem value="date">Nach Spieldatum</SelectItem>
                  <SelectItem value="player_name">Nach Spielername</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Game Entries List */}
      <motion.div variants={itemVariants}>
        {filteredEntries.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Spieleinträge gefunden</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== "all"
                  ? "Versuche andere Suchkriterien oder Filter."
                  : "Es sind noch keine Spieleinträge vorhanden."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {entry.player_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-bold text-gray-900">{entry.player_name}</h3>
                              <Badge className={`${getTypeColor(entry.game_type)} border-0`}>
                                <div className="flex items-center space-x-1">
                                  {getTypeIcon(entry.game_type)}
                                  <span>{entry.game_type === "edart" ? "E-Dart" : "Steeldart"}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">Eingabe am {formatDateTime(entry.created_at)}</p>
                          </div>
                        </div>

                        {/* Game Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">Datum: {formatDate(entry.game_date)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Target className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">Punkte: {entry.points}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">Legs: {entry.legs}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 ml-4 flex flex-col gap-2">
                        <Button
                          onClick={() => handleEditClick(entry)}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteEntry(entry)}
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

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

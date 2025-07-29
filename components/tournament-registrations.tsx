"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Target,
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Registration {
  id: string
  spieler_name: string
  turnier_typ: "edart" | "steeldart"
  turnier_datum: string
  turnier_zeit: string
  email?: string
  telefon?: string
  notizen?: string
  anmelde_zeit: string
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

export function TournamentRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "edart" | "steeldart">("all")
  const [sortBy, setSortBy] = useState<"date" | "name" | "registration_time">("date")

  useEffect(() => {
    fetchRegistrations()
  }, [])

  useEffect(() => {
    filterAndSortRegistrations()
  }, [registrations, searchTerm, filterType, sortBy])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("anmeldungen").select("*").order("turnier_datum", { ascending: true })

      if (error) {
        throw error
      }

      setRegistrations(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortRegistrations = () => {
    let filtered = [...registrations]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (reg) =>
          reg.spieler_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.telefon?.includes(searchTerm),
      )
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((reg) => reg.turnier_typ === filterType)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.spieler_name.localeCompare(b.spieler_name)
        case "registration_time":
          return new Date(b.anmelde_zeit).getTime() - new Date(a.anmelde_zeit).getTime()
        case "date":
        default:
          return new Date(a.turnier_datum).getTime() - new Date(b.turnier_datum).getTime()
      }
    })

    setFilteredRegistrations(filtered)
  }

  const deleteRegistration = async (id: string) => {
    if (!confirm("Anmeldung wirklich löschen?")) return

    try {
      const { error } = await supabase.from("anmeldungen").delete().eq("id", id)

      if (error) {
        throw error
      }

      await fetchRegistrations()
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`)
    }
  }

  const exportToCSV = () => {
    const headers = ["Name", "Turnier-Typ", "Datum", "Zeit", "Email", "Telefon", "Anmeldung", "Notizen"]
    const csvData = filteredRegistrations.map((reg) => [
      reg.spieler_name,
      reg.turnier_typ === "edart" ? "E-Dart" : "Steeldart",
      new Date(reg.turnier_datum).toLocaleDateString("de-DE"),
      reg.turnier_zeit,
      reg.email || "",
      reg.telefon || "",
      new Date(reg.anmelde_zeit).toLocaleString("de-DE"),
      reg.notizen || "",
    ])

    const csvContent = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `anmeldungen_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
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

  // Statistics
  const stats = {
    total: filteredRegistrations.length,
    edart: filteredRegistrations.filter((r) => r.turnier_typ === "edart").length,
    steeldart: filteredRegistrations.filter((r) => r.turnier_typ === "steeldart").length,
    withEmail: filteredRegistrations.filter((r) => r.email).length,
    withPhone: filteredRegistrations.filter((r) => r.telefon).length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lade Anmeldungen...</p>
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
          <Button onClick={fetchRegistrations} className="mt-4 bg-transparent" variant="outline">
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header & Stats */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Turnier-Anmeldungen</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Übersicht aller registrierten Teilnehmer</p>
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
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Gesamt</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.edart}</div>
                <div className="text-sm text-blue-600">E-Dart</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.steeldart}</div>
                <div className="text-sm text-red-600">Steeldart</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.withEmail}</div>
                <div className="text-sm text-green-600">Mit E-Mail</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.withPhone}</div>
                <div className="text-sm text-yellow-600">Mit Telefon</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nach Name, E-Mail oder Telefon suchen..."
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
                  <SelectItem value="all">Alle Turniere</SelectItem>
                  <SelectItem value="edart">Nur E-Dart</SelectItem>
                  <SelectItem value="steeldart">Nur Steeldart</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-48 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Nach Turnier-Datum</SelectItem>
                  <SelectItem value="name">Nach Name</SelectItem>
                  <SelectItem value="registration_time">Nach Anmeldung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Registrations List */}
      <motion.div variants={itemVariants}>
        {filteredRegistrations.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Anmeldungen gefunden</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== "all"
                  ? "Versuche andere Suchkriterien oder Filter."
                  : "Es sind noch keine Anmeldungen vorhanden."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRegistrations.map((registration, index) => (
              <motion.div
                key={registration.id}
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
                                {registration.spieler_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-bold text-gray-900">{registration.spieler_name}</h3>
                              <Badge className={`${getTypeColor(registration.turnier_typ)} border-0`}>
                                <div className="flex items-center space-x-1">
                                  {getTypeIcon(registration.turnier_typ)}
                                  <span>{registration.turnier_typ === "edart" ? "E-Dart" : "Steeldart"}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              Angemeldet am {formatDateTime(registration.anmelde_zeit)}
                            </p>
                          </div>
                        </div>

                        {/* Tournament Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">{formatDate(registration.turnier_datum)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">{registration.turnier_zeit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        {(registration.email || registration.telefon) && (
                          <div className="space-y-2">
                            {registration.email && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{registration.email}</span>
                              </div>
                            )}
                            {registration.telefon && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{registration.telefon}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {registration.notizen && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-blue-800 mb-1">Notizen:</div>
                                <p className="text-sm text-blue-700">{registration.notizen}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 ml-4">
                        <Button
                          onClick={() => deleteRegistration(registration.id)}
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
    </motion.div>
  )
}

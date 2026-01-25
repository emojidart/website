"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Users, Calendar, Mail, Phone, MapPin, XCircle, AlertCircle, Clock, Filter, UserPlus } from "lucide-react"
import Link from "next/link"

interface CampusRegistration {
  id: string
  is_read: boolean | null
  child_first_name: string
  child_last_name: string
  birth_date: string
  age_group: string
  parent_first_name: string
  parent_last_name: string
  email: string
  phone: string
  address: string
  city: string
  postal_code: string
  medical_notes: string | null
  experience_level: string
  start_month: string
  message: string | null
  status: string
  created_at: string
}

export default function AdminCampusRegistrationsPage() {
  const { session, isAdmin, adminLoading } = useAuth()
  const [registrations, setRegistrations] = useState<CampusRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<CampusRegistration | null>(null)
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const fetchRegistrations = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("campus_registrations")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setRegistrations((data as CampusRegistration[]) || [])
    } catch (error) {
      console.error("Error fetching registrations:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("campus_registrations").update({ is_read: true }).eq("id", id)
      if (error) throw error

      // Lokal updaten (ohne neu zu laden)
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)))

      if (selectedRegistration?.id === id) {
        setSelectedRegistration({ ...selectedRegistration, is_read: true })
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const updateRegistrationStatus = async (id: string, newStatus: "pending" | "approved" | "rejected") => {
    try {
      const { error } = await supabase.from("campus_registrations").update({ status: newStatus }).eq("id", id)
      if (error) throw error

      // Wenn Status auf "approved" gesetzt wird, E-Mail versenden
      if (newStatus === "approved" && selectedRegistration?.email) {
        try {
          const response = await fetch("/api/send-campus-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: selectedRegistration.email,
              child_first_name: selectedRegistration.child_first_name,
              child_last_name: selectedRegistration.child_last_name,
              parent_first_name: selectedRegistration.parent_first_name,
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            console.error("E-Mail-Versand Fehler:", result?.error)
            alert(`Registrierung bestätigt, aber E-Mail konnte nicht gesendet werden: ${result?.error || "Unbekannter Fehler"}`)
          } else {
            alert(`Registrierung bestätigt! Eine Bestätigungs-E-Mail wurde an ${selectedRegistration.email} gesendet.`)
          }
        } catch (emailError) {
          console.error("E-Mail-Versand fehlgeschlagen:", emailError)
          alert("Registrierung bestätigt, aber E-Mail-Versand ist fehlgeschlagen.")
        }
      }

      // Liste aktualisieren
      await fetchRegistrations()

      // Wenn die aktuell ausgewählte Registrierung aktualisiert wurde, Status lokal updaten
      if (selectedRegistration?.id === id) {
        setSelectedRegistration({ ...selectedRegistration, status: newStatus })
      }
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Fehler beim Aktualisieren des Status")
    }
  }

  useEffect(() => {
    if (session && isAdmin) {
      fetchRegistrations()
    }
  }, [session, isAdmin])

  const getAgeGroupLabel = (ageGroup: string) => {
    switch (ageGroup) {
      case "kids":
        return "Kids (6-10 Jahre)"
      case "junior":
        return "Junior (11-14 Jahre)"
      case "teens":
        return "Teens (15-18 Jahre)"
      default:
        return ageGroup
    }
  }

  const getExperienceLevelLabel = (level: string) => {
    switch (level) {
      case "beginner":
        return "Anfänger"
      case "intermediate":
        return "Fortgeschritten"
      case "advanced":
        return "Sehr Fortgeschritten"
      default:
        return level
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Ausstehend", color: "bg-yellow-500" }
      case "approved":
        return { label: "Bestätigt", color: "bg-green-500" }
      case "rejected":
        return { label: "Abgelehnt", color: "bg-red-500" }
      default:
        return { label: status, color: "bg-gray-500" }
    }
  }

  const filteredRegistrations = registrations.filter((reg) => {
    const ageGroupMatch = filterAgeGroup === "all" || reg.age_group === filterAgeGroup
    const statusMatch = filterStatus === "all" || reg.status === filterStatus
    return ageGroupMatch && statusMatch
  })

  const unreadCount = registrations.filter((r) => !r.is_read).length

  const stats = {
    total: registrations.length,
    kids: registrations.filter((r) => r.age_group === "kids").length,
    junior: registrations.filter((r) => r.age_group === "junior").length,
    teens: registrations.filter((r) => r.age_group === "teens").length,
    pending: registrations.filter((r) => r.status === "pending").length,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="mb-3 md:mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 text-xs md:text-sm px-2">
                ← Zurück
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
              <UserPlus className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">Campus-Registrierungen</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">{unreadCount}</Badge>
                )}
              </div>
              <p className="text-xs md:text-base text-gray-600">Alle Anmeldungen im Überblick</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-4">
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-orange-500 mb-1 md:mb-2" />
                <p className="text-xs md:text-sm text-gray-600 mb-1">Gesamt</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-4">
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-500 mb-1 md:mb-2" />
                <p className="text-xs md:text-sm text-gray-600 mb-1">Kids</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.kids}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-4">
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-green-500 mb-1 md:mb-2" />
                <p className="text-xs md:text-sm text-gray-600 mb-1">Junior</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.junior}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-4">
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-500 mb-1 md:mb-2" />
                <p className="text-xs md:text-sm text-gray-600 mb-1">Teens</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.teens}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-4">
              <div className="flex flex-col items-center">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 mb-1 md:mb-2" />
                <p className="text-xs md:text-sm text-gray-600 mb-1">Offen</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-xs md:text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <select
            value={filterAgeGroup}
            onChange={(e) => setFilterAgeGroup(e.target.value)}
            className="px-3 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">Alle Altersgruppen</option>
            <option value="kids">Kids (6-10)</option>
            <option value="junior">Junior (11-14)</option>
            <option value="teens">Teens (15-18)</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Bestätigt</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm md:text-base text-gray-600">Daten werden geladen...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Anmeldungen ({filteredRegistrations.length})
              </h2>

              {filteredRegistrations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm md:text-base text-gray-600">Keine Anmeldungen gefunden.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredRegistrations.map((registration) => {
                  const statusBadge = getStatusBadge(registration.status)
                  return (
                    <Card
                      key={registration.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedRegistration?.id === registration.id ? "ring-2 ring-orange-500" : ""
                      }`}
                      onClick={() => {
                        setSelectedRegistration(registration)
                        if (!registration.is_read) {
                          markAsRead(registration.id)
                        }
                      }}
                    >
                      <CardHeader className="pb-3 px-4 md:px-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={`${statusBadge.color} text-white text-xs`}>{statusBadge.label}</Badge>
                              {!registration.is_read && (
                                <Badge className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">Neu</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {getAgeGroupLabel(registration.age_group)}
                              </Badge>
                            </div>
                            <CardTitle className="text-base md:text-lg mb-1 truncate">
                              {registration.child_first_name} {registration.child_last_name}
                            </CardTitle>

                            <div className="space-y-1 text-xs md:text-sm text-gray-600 mt-2">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {registration.parent_first_name} {registration.parent_last_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                                <span>
                                  {new Date(registration.birth_date).toLocaleDateString("de-DE")} -{" "}
                                  {getExperienceLevelLabel(registration.experience_level)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })
              )}
            </div>

            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Details</h2>

              {selectedRegistration ? (
                <Card>
                  <CardHeader className="px-4 md:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base md:text-xl mb-2">
                          {selectedRegistration.child_first_name} {selectedRegistration.child_last_name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusBadge(selectedRegistration.status).color} text-white`}>
                            {getStatusBadge(selectedRegistration.status).label}
                          </Badge>
                          {!selectedRegistration.is_read && (
                            <Badge className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">Neu</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 md:px-6">
                    <div className="bg-orange-50 p-3 md:p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm md:text-base text-gray-900 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Kind
                      </h4>
                      <div className="space-y-2 text-xs md:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Geburtsdatum:</span>
                          <span className="font-medium">
                            {new Date(selectedRegistration.birth_date).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Altersgruppe:</span>
                          <span className="font-medium">{getAgeGroupLabel(selectedRegistration.age_group)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Erfahrung:</span>
                          <span className="font-medium">
                            {getExperienceLevelLabel(selectedRegistration.experience_level)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Start:</span>
                          <span className="font-medium capitalize">{selectedRegistration.start_month}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 md:p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm md:text-base text-gray-900 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Erziehungsberechtigte/r
                      </h4>
                      <div className="space-y-2 text-xs md:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">
                            {selectedRegistration.parent_first_name} {selectedRegistration.parent_last_name}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <Mail className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <a
                            href={`mailto:${selectedRegistration.email}`}
                            className="font-medium text-blue-600 hover:underline break-all text-right"
                          >
                            {selectedRegistration.email}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          <a
                            href={`tel:${selectedRegistration.phone}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {selectedRegistration.phone}
                          </a>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <span className="font-medium text-right">
                            {selectedRegistration.address}
                            <br />
                            {selectedRegistration.postal_code} {selectedRegistration.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedRegistration.medical_notes && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 md:p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-1">
                              Medizinische Hinweise
                            </h4>
                            <p className="text-xs md:text-sm text-gray-700">{selectedRegistration.medical_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedRegistration.message && (
                      <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                        <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2">Nachricht</h4>
                        <p className="text-xs md:text-sm text-gray-700">{selectedRegistration.message}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Angemeldet am: {new Date(selectedRegistration.created_at).toLocaleDateString("de-DE")} {" "}
                      {new Date(selectedRegistration.created_at).toLocaleTimeString("de-DE")}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      <Button
                        onClick={() => updateRegistrationStatus(selectedRegistration.id, "approved")}
                        disabled={selectedRegistration.status === "approved"}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        Bestätigen
                      </Button>
                      <Button
                        onClick={() => updateRegistrationStatus(selectedRegistration.id, "pending")}
                        disabled={selectedRegistration.status === "pending"}
                        variant="outline"
                        className="flex-1 text-sm"
                      >
                        Auf Ausstehend setzen
                      </Button>
                      <Button
                        onClick={() => updateRegistrationStatus(selectedRegistration.id, "rejected")}
                        disabled={selectedRegistration.status === "rejected"}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Ablehnen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm md:text-base text-gray-600">Wähle eine Anmeldung aus, um Details zu sehen.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

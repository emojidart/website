"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail, User, Calendar, Loader2, List, Info } from 'lucide-react'

interface TournamentRegistration {
  id: string
  tournament_id: string
  player_name: string
  email: string
  phone: string | null
  registered_at: string
  tournaments: {
    name: string
    date: string
    time: string
    location: string
  } | null
}

export function TournamentRegistrationsList() {
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [tournaments, setTournaments] = useState<{ id: string; name: string }[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | "all">("all")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "info" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchTournamentsForFilter()
    fetchRegistrations()
  }, [selectedTournamentId])

  const fetchTournamentsForFilter = async () => {
    const { data, error } = await supabase.from("tournaments").select("id, name").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching tournaments for filter:", error)
    } else {
      setTournaments(data || [])
    }
  }

  const fetchRegistrations = async () => {
    setLoading(true)
    setMessage(null)

    let query = supabase
      .from("tournament_registrations")
      .select(
        `
        id,
        player_name,
        email,
        phone,
        registered_at,
        tournaments (
          name,
          date,
          time,
          location
        )
      `
      )
      .order("registered_at", { ascending: false })

    if (selectedTournamentId !== "all") {
      query = query.eq("tournament_id", selectedTournamentId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching registrations:", error)
      setMessage({ type: "error", text: "Fehler beim Laden der Anmeldungen." })
    } else {
      setRegistrations(data || [])
      if (data && data.length === 0) {
        setMessage({ type: "info", text: "Keine Anmeldungen gefunden." })
      }
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
              <List className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Turnier Anmeldungen</CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Übersicht aller Spieleranmeldungen für Turniere.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 space-y-2">
            <label htmlFor="tournament-filter" className="text-sm font-medium text-gray-700">
              Nach Turnier filtern
            </label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger id="tournament-filter" className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50/50">
                <SelectValue placeholder="Alle Turniere" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Turniere</SelectItem>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-3 text-gray-600">Anmeldungen werden geladen...</span>
            </div>
          ) : message ? (
            <div className={`p-4 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                message.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"
              }`}>
              <Info className="h-4 w-4" />
              <span>{message.text}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turnier</TableHead>
                    <TableHead>Spielername</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Angemeldet am</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        {reg.tournaments?.name || "Unbekanntes Turnier"}
                        <br />
                        <span className="text-xs text-gray-500">
                          {reg.tournaments?.date ? new Date(reg.tournaments.date).toLocaleDateString("de-DE") : ""}
                          {reg.tournaments?.time ? ` um ${reg.tournaments.time}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>{reg.player_name}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>{reg.phone || "-"}</TableCell>
                      <TableCell>{new Date(reg.registered_at).toLocaleString("de-DE")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

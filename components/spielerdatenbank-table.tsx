"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Loader2, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import type { SpielerdatenbankEntry } from "./spielerdatenbank-form"

interface SpielerdatenbankTableProps {
  onEditPlayer: (player: SpielerdatenbankEntry) => void;
  onDataChanged: () => void;
}

export function SpielerdatenbankTable({ onEditPlayer, onDataChanged }: SpielerdatenbankTableProps) {
  const [players, setPlayers] = useState<SpielerdatenbankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("spieldatenbank")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        throw error
      }
      setPlayers(data || [])
    } catch (err: any) {
      setError(`Fehler beim Laden der Spieler: ${err.message}`)
      console.error("Error fetching players:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Sind Sie sicher, dass Sie diesen Spieler löschen möchten?")) {
      return;
    }
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from("spieldatenbank")
        .delete()
        .eq("id", id)

      if (error) {
        throw error
      }
      onDataChanged()
    } catch (err: any) {
      setError(`Fehler beim Löschen des Spielers: ${err.message}`)
      console.error("Error deleting player:", err)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-700">Lade Spielerdaten...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-destructive text-lg font-semibold mb-2">Fehler beim Laden</div>
          <p className="text-destructive/90 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Verwaltung der Spielerdatenbank</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Übersicht und Bearbeitung aller Spieler</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Keine Spieler in der Datenbank gefunden.</p>
              <p className="mt-2">Fügen Sie neue Spieler über den Tab "Spieler hinzufügen" hinzu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Name</TableHead>
                    <TableHead>Verein</TableHead>
                    <TableHead>Ligastatus</TableHead>
                    <TableHead>Geschlecht</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.verein || "-"}</TableCell>
                      <TableCell>{player.ligastatus || "-"}</TableCell>
                      <TableCell>{player.geschlecht || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditPlayer(player)}
                            className="text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlayer(player.id!)}
                            disabled={deletingId === player.id}
                            className="text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                          >
                            {deletingId === player.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Löschen</span>
                          </Button>
                        </div>
                      </TableCell>
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

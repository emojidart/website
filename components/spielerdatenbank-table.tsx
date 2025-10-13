"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, Loader2, Users, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { SpielerdatenbankEntry } from "./spielerdatenbank-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SpielerdatenbankTableProps {
  onEditPlayer: (player: SpielerdatenbankEntry) => void
  onDataChanged: () => void
}

export function SpielerdatenbankTable({ onEditPlayer, onDataChanged }: SpielerdatenbankTableProps) {
  const [players, setPlayers] = useState<SpielerdatenbankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [ligastatusFilter, setLigastatusFilter] = useState<string | null>(null)
  const [vereinFilter, setVereinFilter] = useState<string | null>(null)
  const [uniqueVereine, setUniqueVereine] = useState<string[]>([])
  const [uniqueLigastatus, setUniqueLigastatus] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  useEffect(() => {
    const fetchUniqueVereine = async () => {
      try {
        const { data, error } = await supabase
          .from("spieldatenbank")
          .select("verein")
          .not("verein", "is", null)
          .order("verein", { ascending: true })

        if (error) {
          throw error
        }
        const vereine = Array.from(new Set(data.map((item) => item.verein as string))).sort()
        setUniqueVereine(vereine)
      } catch (err: any) {
        console.error("Error fetching unique vereine:", err)
      }
    }
    fetchUniqueVereine()
  }, [])

  useEffect(() => {
    const fetchUniqueLigastatus = async () => {
      try {
        const { data, error } = await supabase
          .from("spieldatenbank")
          .select("ligastatus")
          .not("ligastatus", "is", null)
          .order("ligastatus", { ascending: true })

        if (error) {
          throw error
        }
        const ligastatus = Array.from(new Set(data.map((item) => item.ligastatus as string))).sort()
        setUniqueLigastatus(ligastatus)
      } catch (err: any) {
        console.error("Error fetching unique ligastatus:", err)
      }
    }
    fetchUniqueLigastatus()
  }, [])

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from("spieldatenbank").select("*", { count: "exact" })

      if (debouncedSearchTerm) {
        query = query.ilike("name", `%${debouncedSearchTerm}%`)
      }
      if (ligastatusFilter) {
        query = query.eq("ligastatus", ligastatusFilter)
      }
      if (vereinFilter) {
        query = query.eq("verein", vereinFilter)
      }

      const { data, error, count } = await query
        .order("name", { ascending: true })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      if (error) {
        throw error
      }
      setPlayers(data || [])
      setTotalPlayers(count || 0)
    } catch (err: any) {
      setError(`Fehler beim Laden der Spieler: ${err.message}`)
      console.error("Error fetching players:", err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, ligastatusFilter, vereinFilter])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers, onDataChanged])

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Sind Sie sicher, dass Sie diesen Spieler löschen möchten?")) {
      return
    }
    setDeletingId(id)
    try {
      const { error } = await supabase.from("spieldatenbank").delete().eq("id", id)

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

  const totalPages = Math.ceil(totalPlayers / itemsPerPage)

  const getPaginationItems = () => {
    const pages = []
    const maxPagesToShow = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (startPage > 1) {
      pages.push(1)
      if (startPage > 2) pages.push("...")
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-16 w-16 animate-spin text-red-600" />
        <p className="mt-4 text-gray-700 text-lg font-semibold">Lade Spielerdaten...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative max-w-md mx-auto"
          role="alert"
        >
          <strong className="font-bold">Fehler!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Verwaltung der Spielerdatenbank</CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Übersicht, Suche und Bearbeitung aller Spieler.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Spieler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 w-full"
              />
            </div>
            <Select
              onValueChange={(value) => {
                setLigastatusFilter(value === "all" ? null : value)
                setCurrentPage(1)
              }}
              value={ligastatusFilter || "all"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ligastatus filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Ligastatus</SelectItem>
                {uniqueLigastatus.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}-Liga
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setVereinFilter(value === "all" ? null : value)
                setCurrentPage(1)
              }}
              value={vereinFilter || "all"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Verein filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Vereine</SelectItem>
                {uniqueVereine.map((verein) => (
                  <SelectItem key={verein} value={verein}>
                    {verein}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600 font-medium mb-4 text-right">
            Insgesamt: <span className="font-bold text-red-600">{totalPlayers}</span> Spieler
          </div>

          {players.length === 0 && (debouncedSearchTerm || ligastatusFilter || vereinFilter) ? (
            <div className="text-center py-8 text-gray-600">
              <p>Keine Spieler gefunden, die den aktuellen Filtern entsprechen.</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Keine Spieler in der Datenbank gefunden.</p>
              <p className="mt-2">Fügen Sie neue Spieler über den Tab "Spieler hinzufügen" hinzu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[80px] text-gray-700">Foto</TableHead>
                    <TableHead className="w-[150px] text-gray-700">Name</TableHead>
                    <TableHead className="text-gray-700">Verein</TableHead>
                    <TableHead className="text-gray-700">Ligastatus</TableHead>
                    <TableHead className="text-gray-700">Geschlecht</TableHead>
                    <TableHead className="text-right text-gray-700">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.profile_picture_url || undefined} alt={player.name} />
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">{player.name}</TableCell>
                      <TableCell className="text-gray-700">{player.verein || "-"}</TableCell>
                      <TableCell className="text-gray-700">{player.ligastatus || "-"}</TableCell>
                      <TableCell className="text-gray-700">{player.geschlecht || "-"}</TableCell>
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
                            className="text-red-600 hover:bg-red-50 hover:border-red-300"
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

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    isActive={currentPage > 1}
                  />
                </PaginationItem>
                {getPaginationItems().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === "..." ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={() => setCurrentPage(page as number)}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    isActive={currentPage < totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

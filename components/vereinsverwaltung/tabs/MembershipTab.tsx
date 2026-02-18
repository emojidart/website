"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  CalendarPlus,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

export type MembershipTabProps = {
  clubPlayers: ClubPlayer[]
  loading: boolean
  message: string
  messageType: MessageType
  onSave: (playerId: string, joinedAt: string | null, leftAt: string | null) => void
}

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"

  // Accept: "YYYY-MM-DD" (from DATE), or ISO strings like "YYYY-MM-DDTHH:mm:ss..."
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s

  // If it's not ISO-date, just return as-is
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s

  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}` // ✅ dd.mm.yyyy
}

type StatusTone = "member" | "open" | "ended"

function statusOf(p: ClubPlayer): { label: string; tone: StatusTone } {
  // ✅ Regel:
  // - Eintritt gesetzt + Austritt leer => Vereinsmitglied (grün)
  // - Eintritt leer + Austritt leer => Offen
  // - Austritt gesetzt => Beendet
  if (p.club_left_at) return { label: "Beendet", tone: "ended" }
  if (p.club_joined_at) return { label: "Vereinsmitglied", tone: "member" }
  return { label: "Offen", tone: "open" }
}

export function MembershipTab({ clubPlayers, loading, message, messageType, onSave }: MembershipTabProps) {
  const topRef = useRef<HTMLDivElement | null>(null)

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const selectedPlayer = useMemo(
    () => clubPlayers.find((p) => p.id === selectedPlayerId) ?? null,
    [clubPlayers, selectedPlayerId],
  )

  const [joinedAt, setJoinedAt] = useState<string>("")
  const [leftAt, setLeftAt] = useState<string>("")

  useEffect(() => {
    if (!selectedPlayer) {
      setJoinedAt("")
      setLeftAt("")
      return
    }

    // Inputs type="date" want "YYYY-MM-DD"
    const norm = (v: string | null | undefined) => {
      if (!v) return ""
      const s = String(v)
      return s.includes("T") ? s.split("T")[0] : s
    }

    setJoinedAt(norm(selectedPlayer.club_joined_at))
    setLeftAt(norm(selectedPlayer.club_left_at))
  }, [selectedPlayer])

  const leftBeforeJoined = joinedAt && leftAt ? new Date(leftAt).getTime() < new Date(joinedAt).getTime() : false
  const selectedStatus = selectedPlayer ? statusOf(selectedPlayer) : null

  const sortedRows = useMemo(() => {
    // Sort: Mitglieder (grün) zuerst, dann Offen, dann Beendet, dann Name
    const rank = (p: ClubPlayer) => {
      if (p.club_left_at) return 2
      if (p.club_joined_at) return 0
      return 1
    }
    const copy = [...clubPlayers]
    copy.sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      return (a.name ?? "").localeCompare(b.name ?? "")
    })
    return copy
  }, [clubPlayers])

  const scrollToTop = () => {
    // Scroll in das obere Auswahlfeld
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleSelectFromTable = (playerId: string) => {
    setSelectedPlayerId(playerId)
    // next tick damit state sicher gesetzt ist
    setTimeout(() => scrollToTop(), 0)
  }

  const badgeClass = (tone: StatusTone) => {
    switch (tone) {
      case "member":
        return "bg-green-50 text-green-700 border border-green-100"
      case "ended":
        return "bg-gray-50 text-gray-700 border border-gray-200"
      case "open":
      default:
        return "bg-orange-50 text-orange-700 border border-orange-100"
    }
  }

  const badgeIcon = (tone: StatusTone) => {
    switch (tone) {
      case "member":
        return <CircleCheck className="h-3.5 w-3.5" />
      case "ended":
        return <Circle className="h-3.5 w-3.5" />
      case "open":
      default:
        return <CircleDashed className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Mitgliedschaft</h3>
        <p className="text-sm text-gray-500">Eintrittsdatum & Austrittsdatum pro Spieler pflegen.</p>
      </div>

      {/* ⬆️ TOP Bereich (hierhin scrollen wir) */}
      <div ref={topRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 scroll-mt-24">
        <div className="lg:col-span-2 space-y-2">
          <Label>Spieler auswählen</Label>
          <Select
            value={selectedPlayerId}
            onValueChange={(v) => {
              setSelectedPlayerId(v)
              setTimeout(() => scrollToTop(), 0)
            }}
          >
            <SelectTrigger className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50">
              <SelectValue placeholder="Spieler auswählen" />
            </SelectTrigger>
            <SelectContent>
              {clubPlayers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            „Vereinsmitglied“ = Eintritt gesetzt und kein Austritt • „Offen“ = Eintritt & Austritt leer.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <CalendarClock className="h-4 w-4" />
            Status
          </div>

          {!selectedPlayer ? (
            <p className="mt-2 text-sm text-gray-500">Bitte zuerst einen Spieler auswählen.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Eintritt</span>
                <span className="font-medium text-gray-800">{fmtDateISO(selectedPlayer.club_joined_at)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Austritt</span>
                <span className="font-medium text-gray-800">{fmtDateISO(selectedPlayer.club_left_at)}</span>
              </div>

              <div className="pt-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    badgeClass(selectedStatus!.tone),
                  )}
                >
                  {badgeIcon(selectedStatus!.tone)}
                  {selectedStatus!.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Eingabe */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="joinedAt">Eintrittsdatum</Label>
            <input
              id="joinedAt"
              type="date"
              value={joinedAt}
              onChange={(e) => setJoinedAt(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={!selectedPlayerId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leftAt">Austrittsdatum</Label>
            <input
              id="leftAt"
              type="date"
              value={leftAt}
              onChange={(e) => setLeftAt(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={!selectedPlayerId}
            />
          </div>
        </div>

        {leftBeforeJoined && (
          <div className="p-3 rounded-lg text-sm font-medium flex items-center space-x-2 bg-red-50 text-red-700 border border-red-100">
            <AlertCircle className="h-4 w-4" />
            <span>Austrittsdatum darf nicht vor Eintrittsdatum liegen.</span>
          </div>
        )}

        <Button
          type="button"
          disabled={!selectedPlayerId || loading || leftBeforeJoined}
          className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
          onClick={() => onSave(selectedPlayerId, joinedAt || null, leftAt || null)}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Wird gespeichert...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CalendarPlus className="h-4 w-4" />
              <span>Mitgliedschaft speichern</span>
            </div>
          )}
        </Button>

        {message && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
              messageType === "error"
                ? "bg-red-50 text-red-700 border border-red-100"
                : messageType === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-gray-50 text-gray-700 border border-gray-100",
            )}
          >
            {messageType === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : messageType === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Tabelle */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h4 className="text-md font-semibold text-gray-800">Übersicht</h4>
          <p className="text-xs text-gray-500">„Offen“ nur wenn Eintritt & Austritt leer sind.</p>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Spieler</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Eintritt</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Austritt</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700">Status</th>
                <th className="px-3 py-2 lg:px-4 lg:py-3 font-semibold text-gray-700 text-right">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={5}>
                    Noch keine Spieler vorhanden.
                  </td>
                </tr>
              ) : (
                sortedRows.map((p, idx) => {
                  const st = statusOf(p)
                  return (
                    <tr
                      key={p.id}
                      className={cn("border-t border-gray-200 hover:bg-gray-50/60", idx % 2 === 1 && "bg-gray-50/30")}
                    >
                      <td className="px-3 py-2 lg:px-4 lg:py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{fmtDateISO(p.club_joined_at)}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 text-gray-700">{fmtDateISO(p.club_left_at)}</td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", badgeClass(st.tone))}>
                          {badgeIcon(st.tone)}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => handleSelectFromTable(p.id)}
                          >
                            Auswählen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

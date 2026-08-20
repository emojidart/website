"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type JoinStatus = "pending" | "approved" | "rejected" | "cancelled"

type JoinRequest = {
  id: string
  user_id: string
  full_name: string
  email: string | null
  birthdate: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  phone: string | null
  jersey_size: string | null
  linked_spieldatenbank_id: string | null
  status: JoinStatus
  note: string | null
  admin_note: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
}

type SpielerOption = {
  id: string
  name: string
  verein: string | null
}

type Props = {
  user: User | null
  onPendingCountChange?: (count: number) => void
  onDataChanged?: () => void | Promise<void>
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—"
  const iso = String(value).split("T")[0]
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}.${m}.${y}` : String(value)
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("de-AT")
}

function statusLabel(status: JoinStatus) {
  if (status === "pending") return "Offen"
  if (status === "approved") return "Aufgenommen"
  if (status === "rejected") return "Abgelehnt"
  return "Storniert"
}

function statusClass(status: JoinStatus) {
  if (status === "pending") return "border-orange-200 bg-orange-50 text-orange-800"
  if (status === "approved") return "border-green-200 bg-green-50 text-green-800"
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-800"
  return "border-gray-200 bg-gray-50 text-gray-700"
}

async function sendClubJoinApprovedMail(row: JoinRequest) {
  if (!row.email) {
    throw new Error("Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.")
  }

  const response = await fetch("/api/club-join-approved-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: row.email,
      fullName: row.full_name,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || "Willkommensmail konnte nicht gesendet werden.")
  }

  return data
}

export function JoinRequestsTab({ user, onPendingCountChange, onDataChanged }: Props) {
  const [rows, setRows] = useState<JoinRequest[]>([])
  const [players, setPlayers] = useState<SpielerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [search, setSearch] = useState("")
  const [selectedSpieldatenbank, setSelectedSpieldatenbank] = useState<Record<string, string>>({})
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [requestRes, playerRes] = await Promise.all([
        supabase.from("club_join_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("spieldatenbank").select("id,name,verein").order("name", { ascending: true }),
      ])

      if (requestRes.error) throw requestRes.error
      if (playerRes.error) throw playerRes.error

      const nextRows = (requestRes.data || []) as JoinRequest[]
      setRows(nextRows)
      setPlayers((playerRes.data || []) as SpielerOption[])

      const defaults: Record<string, string> = {}
      const notes: Record<string, string> = {}
      for (const row of nextRows) {
        if (row.linked_spieldatenbank_id) defaults[row.id] = row.linked_spieldatenbank_id
        if (row.admin_note) notes[row.id] = row.admin_note
      }
      setSelectedSpieldatenbank(defaults)
      setAdminNotes(notes)
      onPendingCountChange?.(nextRows.filter((row) => row.status === "pending").length)
    } catch (error: any) {
      console.error("club join requests load error:", error)
      setMessage({ type: "error", text: error?.message || "Beitrittsanfragen konnten nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }, [onPendingCountChange])

  useEffect(() => {
    void load()

    const channel = supabase
      .channel("club_join_requests_admin_tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "club_join_requests" }, () => void load())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const counts = useMemo(() => ({
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  }), [rows])

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false
      if (!q) return true
      return [row.full_name, row.email, row.phone, row.city, row.postal_code, row.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [rows, filter, search])

  async function findExistingClubPlayer(row: JoinRequest, spieldatenbankId: string | null) {
    if (spieldatenbankId) {
      const { data, error } = await supabase
        .from("club_players")
        .select("id,name,spieldatenbank_id")
        .eq("spieldatenbank_id", spieldatenbankId)
        .maybeSingle()
      if (error) throw error
      if (data?.id) return data
    }

    if (row.email) {
      const { data, error } = await supabase
        .from("club_players")
        .select("id,name,spieldatenbank_id")
        .ilike("email", row.email)
        .limit(1)
      if (error) throw error
      if (data?.[0]?.id) return data[0]
    }

    return null
  }

  async function approve(row: JoinRequest) {
    if (!user?.id) return

    const selectedId = selectedSpieldatenbank[row.id] || row.linked_spieldatenbank_id || null

    try {
      setSavingId(row.id)
      setMessage(null)

      const existing = await findExistingClubPlayer(row, selectedId)
      let clubPlayerId = existing?.id as string | undefined

      if (!clubPlayerId) {
        const { data: created, error: createError } = await supabase
          .from("club_players")
          .insert({
            name: row.full_name,
            birthdate: row.birthdate,
            street: row.street,
            house_number: row.house_number,
            postal_code: row.postal_code,
            city: row.city,
            email: row.email,
            phone: row.phone,
            jersey_size: row.jersey_size,
            spieldatenbank_id: selectedId,
            club_joined_at: new Date().toISOString().split("T")[0],
            club_left_at: null,
            is_active: true,
          })
          .select("id")
          .single()

        if (createError) throw createError
        clubPlayerId = created.id
      } else {
        const { error: updatePlayerError } = await supabase
          .from("club_players")
          .update({
            club_joined_at: new Date().toISOString().split("T")[0],
            club_left_at: null,
            is_active: true,
            spieldatenbank_id: selectedId || existing?.spieldatenbank_id || null,
          })
          .eq("id", clubPlayerId)
        if (updatePlayerError) throw updatePlayerError
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          player_id: clubPlayerId,
          // Der Beitritt ist angenommen, aber bis zur aktivierten Grundmitgliedschaft
          // bleibt der Account im eingeschränkten Gastmodus. Stripe/Admin schaltet ihn danach frei.
          is_guest: true,
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        })
        .eq("user_id", row.user_id)
      if (profileError) throw profileError

      const { error: requestError } = await supabase
        .from("club_join_requests")
        .update({
          status: "approved",
          linked_spieldatenbank_id: selectedId,
          admin_note: adminNotes[row.id]?.trim() || null,
          approved_at: new Date().toISOString(),
          rejected_at: null,
          decided_by: user.id,
        })
        .eq("id", row.id)
        .eq("status", "pending")
      if (requestError) throw requestError

      let mailSent = true
      let mailErrorText = ""

      try {
        await sendClubJoinApprovedMail(row)
      } catch (mailError: any) {
        console.error("club join welcome mail error:", mailError)
        mailSent = false
        mailErrorText = mailError?.message || "Willkommensmail konnte nicht gesendet werden."
      }

      setMessage({
        type: mailSent ? "success" : "error",
        text: mailSent
          ? `${row.full_name} wurde aufgenommen. Bis zur aktiven Grundmitgliedschaft bleibt der Zugang eingeschränkt. Die Infomail wurde gesendet.`
          : `${row.full_name} wurde aufgenommen. Bis zur aktiven Grundmitgliedschaft bleibt der Zugang eingeschränkt. Achtung: ${mailErrorText}`,
      })

      await load()
      await Promise.resolve(onDataChanged?.())
    } catch (error: any) {
      console.error("club join approve error:", error)
      setMessage({ type: "error", text: error?.message || "Der Beitritt konnte nicht bestätigt werden." })
    } finally {
      setSavingId(null)
    }
  }

  async function reject(row: JoinRequest) {
    if (!user?.id) return

    try {
      setSavingId(row.id)
      setMessage(null)

      const { error } = await supabase
        .from("club_join_requests")
        .update({
          status: "rejected",
          admin_note: adminNotes[row.id]?.trim() || null,
          rejected_at: new Date().toISOString(),
          approved_at: null,
          decided_by: user.id,
        })
        .eq("id", row.id)
        .eq("status", "pending")
      if (error) throw error

      setMessage({ type: "success", text: `Die Beitrittsanfrage von ${row.full_name} wurde abgelehnt.` })
      await load()
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Die Anfrage konnte nicht abgelehnt werden." })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-hidden">
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
          <div>
            <div className="font-black text-orange-900">Beitrittsanfragen</div>
            <p className="mt-1 text-sm font-semibold text-orange-800">
              Gäste bleiben Gäste, bis du den Beitritt bestätigst. Bei „Mitglied aufnehmen“
              wird der bestehende Account mit dem Vereinsmitglied verbunden – kein neuer QR-Code nötig.
            </p>
          </div>
        </div>
      </div>

      {message ? (
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-bold",
          message.type === "success"
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800",
        )}>
          {message.text}
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <div className="text-xs font-bold text-orange-700">Offen</div>
          <div className="text-2xl font-black text-orange-900">{counts.pending}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="text-xs font-bold text-green-700">Aufgenommen</div>
          <div className="text-2xl font-black text-green-900">{counts.approved}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-bold text-red-700">Abgelehnt</div>
          <div className="text-2xl font-black text-red-900">{counts.rejected}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, E-Mail, Ort suchen..." className="pl-9" />
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-full lg:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Offen ({counts.pending})</SelectItem>
            <SelectItem value="approved">Aufgenommen ({counts.approved})</SelectItem>
            <SelectItem value="rejected">Abgelehnt ({counts.rejected})</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Neu laden
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm font-semibold text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Beitrittsanfragen werden geladen...
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
          Keine passenden Beitrittsanfragen vorhanden.
        </div>
      ) : (
        <div className="min-w-0 max-w-full space-y-3">
          {visibleRows.map((row) => {
            const saving = savingId === row.id
            const selectedId = selectedSpieldatenbank[row.id] || row.linked_spieldatenbank_id || ""

            return (
              <div key={row.id} className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="min-w-0 flex flex-col gap-4">
                  <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 break-words text-lg font-black text-gray-900">{row.full_name}</div>
                        <Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-500">
                        Anfrage vom {fmtDateTime(row.created_at)}
                      </div>
                    </div>

                    {row.status === "pending" ? (
                      <Badge className="w-fit bg-orange-600 text-white">
                        <Clock3 className="mr-1 h-3 w-3" /> Entscheidung offen
                      </Badge>
                    ) : row.status === "approved" ? (
                      <Badge className="w-fit bg-green-600 text-white">
                        <UserCheck className="mr-1 h-3 w-3" /> Aufgenommen · Grundmitgliedschaft prüfen
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <div className="min-w-0 break-all"><span className="font-bold text-gray-500">E-Mail:</span> {row.email || "—"}</div>
                    <div className="min-w-0 break-words"><span className="font-bold text-gray-500">Telefon:</span> {row.phone || "—"}</div>
                    <div><span className="font-bold text-gray-500">Geburt:</span> {fmtDate(row.birthdate)}</div>
                    <div className="min-w-0 break-words sm:col-span-2">
                      <span className="font-bold text-gray-500">Adresse:</span>{" "}
                      {[row.street, row.house_number, row.postal_code, row.city].filter(Boolean).join(" ") || "—"}
                    </div>
                    <div><span className="font-bold text-gray-500">Trikot:</span> {row.jersey_size || "—"}</div>
                  </div>

                  {row.note ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <span className="font-bold">Hinweis vom Gast:</span> {row.note}
                    </div>
                  ) : null}

                  {row.status === "pending" ? (
                    <>
                      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Spielerdatenbank-Verknüpfung</Label>
                          <Select
                            value={selectedId || "none"}
                            onValueChange={(value) =>
                              setSelectedSpieldatenbank((prev) => ({
                                ...prev,
                                [row.id]: value === "none" ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Optional auswählen" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Noch nicht verknüpfen</SelectItem>
                              {players.map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.name}{player.verein ? ` · ${player.verein}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Admin-Notiz (optional)</Label>
                          <Input
                            value={adminNotes[row.id] || ""}
                            onChange={(e) => setAdminNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder="z. B. im Verein besprochen"
                          />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving}
                          onClick={() => void reject(row)}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Ablehnen
                        </Button>

                        <Button
                          type="button"
                          disabled={saving}
                          onClick={() => void approve(row)}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Mitglied aufnehmen
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs font-semibold text-gray-500">
                      {row.status === "approved" && row.approved_at
                        ? `Aufgenommen am ${fmtDateTime(row.approved_at)}`
                        : row.status === "rejected" && row.rejected_at
                          ? `Abgelehnt am ${fmtDateTime(row.rejected_at)}`
                          : null}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        Nach der Aufnahme wählt das neue Mitglied Grundmitgliedschaft und Zusatzmodule separat aus.
      </div>
    </div>
  )
}

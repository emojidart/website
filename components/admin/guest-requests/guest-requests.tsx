"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Loader2,
  RefreshCw,
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  LinkIcon,
  ShieldAlert,
  Lock,
} from "lucide-react"

type GuestRequest = {
  id: string
  full_name: string
  player_name: string | null
  email: string
  phone: string | null
  status: string
  created_at: string
  auth_user_id: string | null
  linked_spieldatenbank_id: string | null
}

type SpieldatenbankPlayer = {
  id: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
}

type ClubPlayerLink = {
  id: string
  name: string
  spieldatenbank_id: string | null
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Ausstehend"
  if (status === "approved") return "Freigeschaltet"
  if (status === "rejected") return "Abgelehnt"
  return status
}

function getStatusClass(status: string) {
  if (status === "approved") return "bg-green-600 text-white"
  if (status === "rejected") return "bg-red-600 text-white"
  return "bg-orange-500 text-white"
}

async function sendGuestApprovedMail(request: GuestRequest) {
  const res = await fetch("/api/guest-approved-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: request.email,
      fullName: request.full_name,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || "Bestätigungsmail konnte nicht gesendet werden.")
  }

  return data
}

export function GuestRequestsManagement() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [requests, setRequests] = useState<GuestRequest[]>([])
  const [players, setPlayers] = useState<SpieldatenbankPlayer[]>([])
  const [clubLinks, setClubLinks] = useState<ClubPlayerLink[]>([])

  const [searchByRequestId, setSearchByRequestId] = useState<Record<string, string>>({})
  const [selectedPlayerByRequestId, setSelectedPlayerByRequestId] = useState<Record<string, string>>({})

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadRequests = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const { data, error } = await supabase
        .from("guest_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setRequests((data || []) as GuestRequest[])
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: "error",
        text: err?.message || "Gastanträge konnten nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from("spieldatenbank")
      .select("id,name,verein,ligastatus,geschlecht")
      .order("name", { ascending: true })

    if (error) {
      console.error(error)
      setMessage({
        type: "error",
        text: error.message || "Spieldatenbank konnte nicht geladen werden.",
      })
      return
    }

    setPlayers((data || []) as SpieldatenbankPlayer[])
  }

  const loadClubLinks = async () => {
    const { data, error } = await supabase
      .from("club_players")
      .select("id,name,spieldatenbank_id")
      .not("spieldatenbank_id", "is", null)

    if (error) {
      console.error(error)
      setMessage({
        type: "error",
        text: error.message || "Vereinsmitglieder-Verknüpfungen konnten nicht geladen werden.",
      })
      return
    }

    setClubLinks((data || []) as ClubPlayerLink[])
  }

  const loadAll = async () => {
    await Promise.all([loadRequests(), loadPlayers(), loadClubLinks()])
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guestLinkByPlayerId = useMemo(() => {
    const map = new Map<string, GuestRequest>()

    requests.forEach((request) => {
      if (request.linked_spieldatenbank_id) {
        map.set(request.linked_spieldatenbank_id, request)
      }
    })

    return map
  }, [requests])

  const clubLinkByPlayerId = useMemo(() => {
    const map = new Map<string, ClubPlayerLink>()

    clubLinks.forEach((clubPlayer) => {
      if (clubPlayer.spieldatenbank_id) {
        map.set(clubPlayer.spieldatenbank_id, clubPlayer)
      }
    })

    return map
  }, [clubLinks])

  const getLinkedPlayer = (id: string | null) => {
    if (!id) return null
    return players.find((p) => p.id === id) || null
  }

  const getFilteredPlayers = (request: GuestRequest) => {
    const q =
      searchByRequestId[request.id]?.trim().toLowerCase() ||
      request.player_name?.trim().toLowerCase() ||
      request.full_name?.trim().toLowerCase() ||
      ""

    if (!q) return players.slice(0, 30)

    return players
      .filter((player) => {
        return (
          player.name.toLowerCase().includes(q) ||
          (player.verein || "").toLowerCase().includes(q) ||
          (player.ligastatus || "").toLowerCase().includes(q)
        )
      })
      .slice(0, 30)
  }

  const getPlayerLockInfo = (playerId: string, currentRequestId: string) => {
    const guestLink = guestLinkByPlayerId.get(playerId)
    if (guestLink && guestLink.id !== currentRequestId) {
      return {
        locked: true,
        reason: `Bereits mit Gast "${guestLink.full_name}" verknüpft`,
      }
    }

    const clubLink = clubLinkByPlayerId.get(playerId)
    if (clubLink) {
      return {
        locked: true,
        reason: `Bereits Vereinsmitglied: ${clubLink.name}`,
      }
    }

    return {
      locked: false,
      reason: "",
    }
  }

  const handleApprove = async (request: GuestRequest) => {
    if (!request.auth_user_id) {
      setMessage({
        type: "error",
        text: "Dieser Antrag hat keinen verknüpften Auth-User.",
      })
      return
    }

    const selectedPlayerId = selectedPlayerByRequestId[request.id]

    if (!selectedPlayerId) {
      setMessage({
        type: "error",
        text: "Bitte zuerst einen Spieler aus der Spieldatenbank auswählen.",
      })
      return
    }

    try {
      setSavingId(request.id)
      setMessage(null)

      const { data: existingGuestLink, error: existingGuestError } = await supabase
        .from("guest_requests")
        .select("id, full_name, email, status")
        .eq("linked_spieldatenbank_id", selectedPlayerId)
        .neq("id", request.id)
        .maybeSingle()

      if (existingGuestError) throw existingGuestError

      if (existingGuestLink) {
        setMessage({
          type: "error",
          text: `Dieser Spieler ist bereits mit dem Gast "${existingGuestLink.full_name}" verknüpft.`,
        })
        return
      }

      const { data: existingClubLink, error: existingClubError } = await supabase
        .from("club_players")
        .select("id, name")
        .eq("spieldatenbank_id", selectedPlayerId)
        .maybeSingle()

      if (existingClubError) throw existingClubError

      if (existingClubLink) {
        setMessage({
          type: "error",
          text: `Dieser Spieler ist bereits mit dem Vereinsmitglied "${existingClubLink.name}" verknüpft.`,
        })
        return
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        })
        .eq("user_id", request.auth_user_id)
        .eq("is_guest", true)

      if (profileError) throw profileError

      const { error: requestError } = await supabase
        .from("guest_requests")
        .update({
          status: "approved",
          linked_spieldatenbank_id: selectedPlayerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (requestError) throw requestError

      const linkedPlayer = players.find((p) => p.id === selectedPlayerId)

      let mailWasSent = true

      try {
        await sendGuestApprovedMail(request)
      } catch (mailError: any) {
        console.error("[GuestRequestsManagement] Mail konnte nicht gesendet werden:", mailError)
        mailWasSent = false
      }

      setMessage({
        type: mailWasSent ? "success" : "error",
        text: mailWasSent
          ? `${request.full_name} wurde mit ${linkedPlayer?.name || "Spieler"} verknüpft, freigeschaltet und per Mail informiert.`
          : `${request.full_name} wurde mit ${linkedPlayer?.name || "Spieler"} verknüpft und freigeschaltet. Achtung: Die Bestätigungsmail konnte nicht gesendet werden.`,
      })

      await loadAll()
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: "error",
        text: err?.message || "Gastzugang konnte nicht freigeschaltet werden.",
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleReject = async (request: GuestRequest) => {
    try {
      setSavingId(request.id)
      setMessage(null)

      const { error: requestError } = await supabase
        .from("guest_requests")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (requestError) throw requestError

      if (request.auth_user_id) {
        await supabase
          .from("user_profiles")
          .update({
            is_blocked: true,
            blocked_reason: "Gastzugang wurde abgelehnt.",
          })
          .eq("user_id", request.auth_user_id)
          .eq("is_guest", true)
      }

      setMessage({
        type: "success",
        text: `${request.full_name} wurde abgelehnt.`,
      })

      await loadAll()
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: "error",
        text: err?.message || "Gastzugang konnte nicht abgelehnt werden.",
      })
    } finally {
      setSavingId(null)
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length
  const linkedCount = requests.filter((r) => !!r.linked_spieldatenbank_id).length

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={
            message.type === "success"
              ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
          }
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Offene Anträge</div>
            <div className="text-3xl font-black mt-2">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Freigeschaltet</div>
            <div className="text-3xl font-black mt-2 text-green-600">
              {approvedCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Verknüpft</div>
            <div className="text-3xl font-black mt-2 text-blue-600">
              {linkedCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Abgelehnt</div>
            <div className="text-3xl font-black mt-2 text-red-600">
              {rejectedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black">Gastanträge</h2>
              <p className="text-sm text-gray-600 mt-1">
                Gäste müssen vor der Freischaltung eindeutig mit einem Spieler
                aus der Spieldatenbank verknüpft werden.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => void loadAll()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Neu laden
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gastanträge werden geladen...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-gray-600">Keine Gastanträge vorhanden.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const isSaving = savingId === request.id
                const isPending = request.status === "pending"
                const linkedPlayer = getLinkedPlayer(request.linked_spieldatenbank_id)
                const filteredPlayers = getFilteredPlayers(request)
                const selectedPlayerId = selectedPlayerByRequestId[request.id]
                const selectedPlayer =
                  players.find((p) => p.id === selectedPlayerId) || null
                const selectedLockInfo = selectedPlayerId
                  ? getPlayerLockInfo(selectedPlayerId, request.id)
                  : { locked: false, reason: "" }

                return (
                  <div key={request.id} className="border rounded-2xl p-4 bg-white">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="font-black text-lg">
                              {request.full_name}
                            </div>

                            <Badge className={getStatusClass(request.status)}>
                              {getStatusLabel(request.status)}
                            </Badge>

                            {linkedPlayer ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                <LinkIcon className="w-3 h-3 mr-1" />
                                Verknüpft
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Nicht verknüpft
                              </Badge>
                            )}
                          </div>

                          {request.player_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="w-4 h-4" />
                              Spielername: {request.player_name}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {request.email}
                          </div>

                          {request.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {request.phone}
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Antrag vom{" "}
                            {new Date(request.created_at).toLocaleString("de-AT")}
                          </div>
                        </div>

                        {!isPending && linkedPlayer && (
                          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 min-w-[260px]">
                            <div className="text-xs font-bold text-green-700 uppercase">
                              Verknüpfter Spieler
                            </div>
                            <div className="font-black text-gray-900 mt-1">
                              {linkedPlayer.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {linkedPlayer.verein || "Kein Verein"} ·{" "}
                              {linkedPlayer.ligastatus || "Kein Ligastatus"}
                            </div>
                          </div>
                        )}
                      </div>

                      {isPending && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3">
                            <div className="text-sm font-black text-gray-900">
                              Spieler aus Spieldatenbank verknüpfen
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Wähle hier den richtigen Spieler aus. Bereits
                              verknüpfte Spieler sind gesperrt.
                            </div>
                          </div>

                          <div className="relative mb-3">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                            <Input
                              value={searchByRequestId[request.id] || ""}
                              onChange={(e) =>
                                setSearchByRequestId((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              placeholder="Spieler suchen..."
                              className="pl-9 bg-white"
                            />
                          </div>

                          <div className="max-h-72 overflow-y-auto rounded-xl border bg-white">
                            {filteredPlayers.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500">
                                Kein Spieler gefunden.
                              </div>
                            ) : (
                              <div className="p-2 space-y-2">
                                {filteredPlayers.map((player) => {
                                  const active = selectedPlayerId === player.id
                                  const lockInfo = getPlayerLockInfo(
                                    player.id,
                                    request.id,
                                  )

                                  return (
                                    <button
                                      key={player.id}
                                      type="button"
                                      disabled={lockInfo.locked}
                                      onClick={() => {
                                        if (lockInfo.locked) return

                                        setSelectedPlayerByRequestId((prev) => ({
                                          ...prev,
                                          [request.id]: player.id,
                                        }))
                                      }}
                                      className={
                                        lockInfo.locked
                                          ? "w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left cursor-not-allowed opacity-90"
                                          : active
                                            ? "w-full rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-left"
                                            : "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-orange-200"
                                      }
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div
                                            className={
                                              lockInfo.locked
                                                ? "font-black text-red-800 truncate"
                                                : "font-black text-gray-900 truncate"
                                            }
                                          >
                                            {player.name}
                                          </div>

                                          <div className="text-xs text-gray-500 mt-1 truncate">
                                            {player.verein || "Kein Verein"} ·{" "}
                                            {player.ligastatus ||
                                              "Kein Ligastatus"}{" "}
                                            · ID: {player.id}
                                          </div>

                                          {lockInfo.locked && (
                                            <div className="mt-2 inline-flex items-center rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700">
                                              <Lock className="w-3 h-3 mr-1" />
                                              {lockInfo.reason}
                                            </div>
                                          )}
                                        </div>

                                        {active && !lockInfo.locked && (
                                          <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {selectedPlayer && (
                            <div
                              className={
                                selectedLockInfo.locked
                                  ? "mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                                  : "mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                              }
                            >
                              <div
                                className={
                                  selectedLockInfo.locked
                                    ? "text-xs font-bold text-red-700 uppercase"
                                    : "text-xs font-bold text-green-700 uppercase"
                                }
                              >
                                {selectedLockInfo.locked
                                  ? "Nicht erlaubt"
                                  : "Ausgewählt"}
                              </div>
                              <div className="font-black text-gray-900">
                                {selectedPlayer.name}
                              </div>
                              {selectedLockInfo.locked && (
                                <div className="text-sm font-semibold text-red-700 mt-1">
                                  {selectedLockInfo.reason}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2 mt-4">
                            <Button
                              type="button"
                              onClick={() => void handleApprove(request)}
                              disabled={
                                isSaving ||
                                !selectedPlayerId ||
                                selectedLockInfo.locked
                              }
                              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Verknüpfen & freischalten
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => void handleReject(request)}
                              disabled={isSaving}
                              className="rounded-xl font-bold"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-2" />
                              )}
                              Ablehnen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
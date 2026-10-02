"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { vv } from "./vereinsverwaltung-styles"

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
  UserRoundCheck,
  UserRoundX,
  Link2Off,
  Clock3,
  Database,
  ChevronDown,
  ChevronUp,
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

type GuestMemberStatus = {
  guest_request_id: string
  club_player_id: string
  club_player_name: string
  spieldatenbank_id: string
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Altbestand"
  if (status === "approved") return "Gastkonto aktiv"
  if (status === "rejected") return "Abgelehnt"
  return status
}

function getStatusClass(status: string) {
  if (status === "approved") return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
  if (status === "rejected") return "border-rose-300/20 bg-rose-500/10 text-rose-200"
  return "border-orange-300/20 bg-orange-500/10 text-orange-200"
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
  const [guestMemberStatuses, setGuestMemberStatuses] = useState<GuestMemberStatus[]>([])

  const [searchByRequestId, setSearchByRequestId] = useState<Record<string, string>>({})
  const [selectedPlayerByRequestId, setSelectedPlayerByRequestId] = useState<Record<string, string>>({})
  const [editingLinkByRequestId, setEditingLinkByRequestId] = useState<Record<string, boolean>>({})

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(() => new Set())

  const toggleRequestExpanded = (requestId: string) => {
    setExpandedRequestIds((current) => {
      const next = new Set(current)
      if (next.has(requestId)) next.delete(requestId)
      else next.add(requestId)
      return next
    })
  }

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
        text: err?.message || "Gastkonten konnten nicht geladen werden.",
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

  const loadGuestMemberStatuses = async () => {
    const { data, error } = await supabase.rpc("get_guest_member_status_for_admin")

    if (error) {
      console.error(error)
      setMessage({
        type: "error",
        text: error.message || "Gast-/Mitgliedszuordnungen konnten nicht geladen werden.",
      })
      setGuestMemberStatuses([])
      return
    }

    setGuestMemberStatuses((data || []) as GuestMemberStatus[])
  }

  const loadAll = async () => {
    await Promise.all([
      loadRequests(),
      loadPlayers(),
      loadClubLinks(),
      loadGuestMemberStatuses(),
    ])
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

  const guestMemberStatusByRequestId = useMemo(() => {
    const map = new Map<string, GuestMemberStatus>()

    guestMemberStatuses.forEach((status) => {
      map.set(status.guest_request_id, status)
    })

    return map
  }, [guestMemberStatuses])

  const getMemberStatus = (request: GuestRequest) => {
    return guestMemberStatusByRequestId.get(request.id) || null
  }

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

  const ensurePlayerCanBeLinked = async (
    request: GuestRequest,
    selectedPlayerId: string,
  ) => {
    const { data: existingGuestLink, error: existingGuestError } = await supabase
      .from("guest_requests")
      .select("id, full_name, email, status")
      .eq("linked_spieldatenbank_id", selectedPlayerId)
      .neq("id", request.id)
      .maybeSingle()

    if (existingGuestError) throw existingGuestError

    if (existingGuestLink) {
      throw new Error(
        `Dieser Spieler ist bereits mit dem Gast "${existingGuestLink.full_name}" verknüpft.`,
      )
    }

    const { data: existingClubLink, error: existingClubError } = await supabase
      .from("club_players")
      .select("id, name")
      .eq("spieldatenbank_id", selectedPlayerId)
      .maybeSingle()

    if (existingClubError) throw existingClubError

    if (existingClubLink) {
      throw new Error(
        `Dieser Spieler ist bereits mit dem Vereinsmitglied "${existingClubLink.name}" verknüpft.`,
      )
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

    const selectedPlayerId = selectedPlayerByRequestId[request.id] || null

    try {
      setSavingId(request.id)
      setMessage(null)

      if (selectedPlayerId) {
        await ensurePlayerCanBeLinked(request, selectedPlayerId)
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

      const linkedPlayer = selectedPlayerId
        ? players.find((p) => p.id === selectedPlayerId)
        : null

      let mailWasSent = true

      try {
        await sendGuestApprovedMail(request)
      } catch (mailError: any) {
        console.error(
          "[GuestRequestsManagement] Mail konnte nicht gesendet werden:",
          mailError,
        )
        mailWasSent = false
      }

      const approvalText = linkedPlayer
        ? `${request.full_name} wurde mit ${linkedPlayer.name} verknüpft und freigeschaltet.`
        : `${request.full_name} wurde ohne Spieler-Verknüpfung freigeschaltet. Die Verknüpfung kann später nachgeholt werden.`

      setMessage({
        type: mailWasSent ? "success" : "error",
        text: mailWasSent
          ? `${approvalText} Bestätigungsmail wurde gesendet.`
          : `${approvalText} Achtung: Die Bestätigungsmail konnte nicht gesendet werden.`,
      })

      setSelectedPlayerByRequestId((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
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

  const handleLinkLater = async (request: GuestRequest) => {
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

      await ensurePlayerCanBeLinked(request, selectedPlayerId)

      const { error } = await supabase
        .from("guest_requests")
        .update({
          linked_spieldatenbank_id: selectedPlayerId,
        })
        .eq("id", request.id)
        .eq("status", "approved")

      if (error) throw error

      const linkedPlayer = players.find((p) => p.id === selectedPlayerId)

      setMessage({
        type: "success",
        text: `${request.full_name} wurde nachträglich mit ${linkedPlayer?.name || "dem ausgewählten Spieler"} verknüpft.`,
      })

      setSelectedPlayerByRequestId((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })

      setEditingLinkByRequestId((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })

      await loadAll()
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: "error",
        text: err?.message || "Spieler konnte nicht verknüpft werden.",
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleUnlink = async (request: GuestRequest) => {
    try {
      setSavingId(request.id)
      setMessage(null)

      const { error } = await supabase
        .from("guest_requests")
        .update({
          linked_spieldatenbank_id: null,
        })
        .eq("id", request.id)
        .eq("status", "approved")

      if (error) throw error

      setSelectedPlayerByRequestId((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })

      setEditingLinkByRequestId((prev) => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })

      setMessage({
        type: "success",
        text: `Die Spieler-Verknüpfung von ${request.full_name} wurde aufgehoben.`,
      })

      await loadAll()
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: "error",
        text: err?.message || "Verknüpfung konnte nicht aufgehoben werden.",
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

  const activeGuestCount = requests.filter((r) => r.status === "approved").length
  const memberGuestIds = new Set(guestMemberStatuses.map((row) => row.guest_request_id))
  const memberCount = requests.filter((r) => memberGuestIds.has(r.id)).length
  const directGuestLinkedCount = requests.filter(
    (r) => r.status === "approved" && !!r.linked_spieldatenbank_id && !memberGuestIds.has(r.id),
  ).length
  const assignmentOpenCount = requests.filter(
    (r) =>
      r.status === "approved" &&
      !r.linked_spieldatenbank_id &&
      !memberGuestIds.has(r.id),
  ).length

  return (
    <div className="space-y-5 text-white">
      <section className={cn(vv.surfaceLg, "overflow-hidden")}>
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-500/10">
              <Users className="h-5 w-5 text-sky-200" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/50">Externe Zugänge</div>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Gäste & Spieler-Zuordnung</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
                Gastkonten sind nach bestätigter E-Mail automatisch aktiv. Hier verwaltest du nur noch die Zuordnung zur Spielerdatenbank.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={cn(vv.card, "min-w-[90px] px-3.5 py-2.5")}>
              <div className={vv.label}>Gastkonten</div>
              <div className="mt-0.5 text-lg font-black text-emerald-200">{activeGuestCount}</div>
            </div>
            <div className={cn(vv.card, "min-w-[90px] px-3.5 py-2.5")}>
              <div className={vv.label}>Zuordnung offen</div>
              <div className="mt-0.5 text-lg font-black text-orange-200">{assignmentOpenCount}</div>
            </div>
            <div className={cn(vv.card, "min-w-[90px] px-3.5 py-2.5")}>
              <div className={vv.label}>Gast verknüpft</div>
              <div className="mt-0.5 text-lg font-black text-sky-200">{directGuestLinkedCount}</div>
            </div>
            <div className={cn(vv.card, "min-w-[90px] px-3.5 py-2.5")}>
              <div className={vv.label}>Vereinsmitglied</div>
              <div className="mt-0.5 text-lg font-black text-violet-200">{memberCount}</div>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={cn(
            "rounded-[18px] border px-4 py-3 text-sm font-bold",
            message.type === "success"
              ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
              : "border-rose-300/20 bg-rose-500/10 text-rose-100",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-white">Gastkonten</div>
            <p className="mt-1 text-xs leading-5 text-white/36">
              Keine Freischaltung nötig. Neue Gäste erscheinen hier nur, damit du sie bei Bedarf mit dem richtigen Spieler zuordnen kannst.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadAll()}
            disabled={loading}
            className={cn(vv.buttonSecondary, "w-full sm:w-auto")}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Neu laden
          </Button>
        </div>
      </section>

      {loading ? (
        <div className={cn(vv.surface, "flex items-center justify-center px-4 py-10 text-sm font-semibold text-white/40")}>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Gastkonten werden geladen…
        </div>
      ) : requests.length === 0 ? (
        <div className={cn(vv.surface, "px-4 py-10 text-center")}>
          <Users className="mx-auto h-6 w-6 text-white/18" />
          <p className="mt-2 text-sm font-semibold text-white/35">Keine Gastkonten vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.filter((request) => request.status === "approved").map((request) => {
            const isSaving = savingId === request.id
            const isPending = false
            const linkedPlayer = getLinkedPlayer(request.linked_spieldatenbank_id)
            const memberStatus = getMemberStatus(request)
            const isNowClubMember = Boolean(memberStatus)
            const isEditingLink = Boolean(editingLinkByRequestId[request.id])
            const canLinkPlayer =
              !isNowClubMember &&
              request.status === "approved" &&
              (!linkedPlayer || isEditingLink)
            const filteredPlayers = getFilteredPlayers(request)
            const selectedPlayerId = selectedPlayerByRequestId[request.id]
            const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null
            const selectedLockInfo = selectedPlayerId
              ? getPlayerLockInfo(selectedPlayerId, request.id)
              : { locked: false, reason: "" }
            const expanded = expandedRequestIds.has(request.id)

            return (
              <article key={request.id} className={cn(vv.card, "overflow-hidden")}>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 break-words text-lg font-black text-white sm:text-xl">{request.full_name}</h4>
                        <Badge variant="outline" className={getStatusClass(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        {isNowClubMember ? (
                          <>
                            <Badge variant="outline" className="border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
                              <UserRoundCheck className="mr-1 h-3 w-3" />
                              Vereinsmitglied
                            </Badge>
                            <Badge variant="outline" className="border-sky-300/20 bg-sky-500/10 text-sky-200">
                              <LinkIcon className="mr-1 h-3 w-3" />
                              Über Mitgliedskonto verknüpft
                            </Badge>
                          </>
                        ) : linkedPlayer ? (
                          <Badge variant="outline" className="border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
                            <LinkIcon className="mr-1 h-3 w-3" />
                            Gast verknüpft
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300/20 bg-amber-500/10 text-amber-200">
                            <ShieldAlert className="mr-1 h-3 w-3" />
                            Nicht verknüpft
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-white/30">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          Antrag vom {new Date(request.created_at).toLocaleString("de-AT")}
                        </span>
                        {request.player_name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Wunschname: {request.player_name}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className={cn(vv.inset, "min-w-0 p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25">
                            <Mail className="h-3 w-3" />
                            E-Mail
                          </div>
                          <div className="mt-1 break-all text-xs font-bold text-white/60">{request.email}</div>
                        </div>

                        <div className={cn(vv.inset, "min-w-0 p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25">
                            <Phone className="h-3 w-3" />
                            Telefon
                          </div>
                          <div className="mt-1 break-words text-xs font-bold text-white/60">{request.phone || "—"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      {isNowClubMember && memberStatus ? (
                        <div className={cn(vv.inset, "min-w-[250px] border-emerald-300/10 bg-emerald-500/[0.045] px-3.5 py-3")}>
                          <div className={vv.label}>Jetzt Vereinsmitglied</div>
                          <div className="mt-1 truncate text-sm font-black text-emerald-100">{memberStatus.club_player_name}</div>
                          <div className="mt-1 text-[11px] font-semibold text-emerald-100/45">
                            Spieler-Zuordnung erfolgt über das Mitgliedskonto.
                          </div>
                        </div>
                      ) : linkedPlayer ? (
                        <div className={cn(vv.inset, "min-w-[220px] px-3.5 py-3")}>
                          <div className={vv.label}>Verknüpfter Spieler</div>
                          <div className="mt-1 truncate text-sm font-black text-white">{linkedPlayer.name}</div>
                          <div className="mt-1 truncate text-[11px] font-semibold text-white/32">
                            {linkedPlayer.verein || "Kein Verein"} · {linkedPlayer.ligastatus || "Kein Ligastatus"}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleRequestExpanded(request.id)}
                        className={cn(vv.buttonSecondary, "h-9 px-3 text-xs")}
                      >
                        {expanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
                        {expanded ? "Weniger" : "Details"}
                      </button>
                    </div>
                  </div>

                  {isNowClubMember && memberStatus ? (
                    <div className="mt-4 flex items-start gap-3 border-t border-[#202731] pt-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-500/10">
                        <UserRoundCheck className="h-4 w-4 text-emerald-200" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-emerald-100">
                          Gastprofil wurde zum Vereinsmitglied
                        </div>
                        <div className="mt-1 text-xs font-semibold leading-5 text-white/38">
                          Keine zusätzliche Gast-Verknüpfung nötig. Die Spieler-Zuordnung läuft bereits korrekt über das Mitgliedskonto von {memberStatus.club_player_name}.
                        </div>
                      </div>
                    </div>
                  ) : linkedPlayer && !isPending ? (
                    <div className="mt-4 flex flex-col gap-2 border-t border-[#202731] pt-4 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingLinkByRequestId((prev) => ({
                            ...prev,
                            [request.id]: true,
                          }))
                          setSelectedPlayerByRequestId((prev) => ({
                            ...prev,
                            [request.id]: linkedPlayer.id,
                          }))
                          setExpandedRequestIds((prev) => new Set(prev).add(request.id))
                        }}
                        className={cn(vv.buttonSecondary, "w-full sm:w-auto")}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Zuordnung ändern
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => void handleUnlink(request)}
                        className={cn(vv.buttonDanger, "w-full sm:w-auto")}
                      >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                        Verknüpfung aufheben
                      </Button>
                    </div>
                  ) : null}

                  {expanded && canLinkPlayer ? (
                    <div className="mt-4 border-t border-[#202731] pt-4">
                      <section className={cn(vv.inset, "p-4")}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-sky-300/15 bg-sky-500/10">
                            <Database className="h-4 w-4 text-sky-200" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">
                              {isPending
                                ? "Spieler optional verknüpfen"
                                : linkedPlayer
                                  ? "Spieler-Zuordnung ändern"
                                  : "Spieler zuordnen"}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-white/36">
                              {isPending
                                ? "Wähle den passenden Spieler aus der Spielerdatenbank."
                                : linkedPlayer
                                  ? "Wähle einen anderen freien Spieler aus und speichere die neue Verknüpfung."
                                  : "Wähle den passenden Spieler aus. Bereits verwendete Spieler sind gesperrt."}
                            </div>
                          </div>
                        </div>

                        <div className="relative mt-4">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                          <Input
                            value={searchByRequestId[request.id] || ""}
                            onChange={(e) =>
                              setSearchByRequestId((prev) => ({
                                ...prev,
                                [request.id]: e.target.value,
                              }))
                            }
                            placeholder="Spieler suchen…"
                            className={cn(vv.input, "pl-10")}
                          />
                        </div>

                        <div className="mt-3 max-h-64 overflow-y-auto rounded-[18px] border border-[#252c36] bg-[#0a0d12] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {filteredPlayers.length === 0 ? (
                            <div className="p-3 text-sm font-semibold text-white/30">Kein Spieler gefunden.</div>
                          ) : (
                            <div className="space-y-2">
                              {filteredPlayers.map((player) => {
                                const active = selectedPlayerId === player.id
                                const lockInfo = getPlayerLockInfo(player.id, request.id)

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
                                    className={cn(
                                      "w-full rounded-[16px] border px-3.5 py-3 text-left transition",
                                      lockInfo.locked
                                        ? "cursor-not-allowed border-rose-300/15 bg-rose-500/[0.055] opacity-65"
                                        : active
                                          ? "border-orange-300/25 bg-orange-500/10"
                                          : "border-[#252c36] bg-[#10141b] hover:border-[#35404c] hover:bg-[#131922]",
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className={cn("truncate text-sm font-black", lockInfo.locked ? "text-rose-100/70" : "text-white")}>
                                          {player.name}
                                        </div>
                                        <div className="mt-1 truncate text-[11px] font-semibold text-white/30">
                                          {player.verein || "Kein Verein"} · {player.ligastatus || "Kein Ligastatus"}
                                        </div>
                                        {lockInfo.locked ? (
                                          <div className="mt-2 inline-flex items-center rounded-lg border border-rose-300/15 bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-200">
                                            <Lock className="mr-1 h-3 w-3" />
                                            {lockInfo.reason}
                                          </div>
                                        ) : null}
                                      </div>

                                      {active && !lockInfo.locked ? <CheckCircle className="h-5 w-5 flex-none text-orange-300" /> : null}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {selectedPlayer ? (
                          <div
                            className={cn(
                              "mt-3 rounded-[16px] border px-3.5 py-3",
                              selectedLockInfo.locked
                                ? "border-rose-300/20 bg-rose-500/10"
                                : "border-emerald-300/20 bg-emerald-500/10",
                            )}
                          >
                            <div className={cn(vv.label, selectedLockInfo.locked ? "text-rose-200/70" : "text-emerald-200/70")}>
                              {selectedLockInfo.locked ? "Nicht erlaubt" : "Ausgewählt"}
                            </div>
                            <div className="mt-1 text-sm font-black text-white">{selectedPlayer.name}</div>
                            {selectedLockInfo.locked ? (
                              <div className="mt-1 text-xs font-semibold text-rose-200/75">{selectedLockInfo.reason}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#202731] pt-4 sm:flex-row sm:justify-end">
                    {isPending ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleReject(request)}
                          disabled={isSaving}
                          className={cn(vv.buttonDanger, "w-full sm:w-auto")}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundX className="mr-2 h-4 w-4" />}
                          Ablehnen
                        </Button>

                        <Button
                          type="button"
                          onClick={() => void handleApprove(request)}
                          disabled={isSaving || Boolean(selectedPlayerId && selectedLockInfo.locked)}
                          className={cn(vv.buttonPrimary, "w-full sm:w-auto")}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}
                          {selectedPlayerId ? "Verknüpfen & freischalten" : "Ohne Spieler freischalten"}
                        </Button>
                      </>
                    ) : canLinkPlayer ? (
                      <>
                        {linkedPlayer ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => {
                              setEditingLinkByRequestId((prev) => {
                                const next = { ...prev }
                                delete next[request.id]
                                return next
                              })
                              setSelectedPlayerByRequestId((prev) => {
                                const next = { ...prev }
                                delete next[request.id]
                                return next
                              })
                            }}
                            className={cn(vv.buttonSecondary, "w-full sm:w-auto")}
                          >
                            Abbrechen
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          onClick={() => void handleLinkLater(request)}
                          disabled={isSaving || !selectedPlayerId || selectedLockInfo.locked}
                          className={cn(vv.buttonPrimary, "w-full sm:w-auto")}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                          {linkedPlayer ? "Neue Zuordnung speichern" : "Spieler zuordnen"}
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/28">
                        {request.status === "approved" ? <CheckCircle className="h-4 w-4 text-emerald-300/60" /> : <XCircle className="h-4 w-4 text-rose-300/60" />}
                        {request.status === "approved" ? "Gastkonto ist aktiv." : "Gastzugang wurde abgelehnt."}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Eye,
  Link2,
  Link2Off as LinkOff,
  Loader2,
  Settings,
  Trash2,
  Users,
  XCircle,
  Search,
  MapPin,
  Hash,
  CreditCard,
  UserCheck,
  UserX,
  ChevronRight,
  Archive,
  FileText,
  Download,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"
import type { ClubPlayer, Team, TeamMember } from "@/components/vereinsverwaltung/types"

type Props = {
  visiblePlayers: ClubPlayer[]
  clubPlayersCount: number
  playerLoading: boolean
  teams: Team[]
  teamMembers: TeamMember[]

  playerSearch: string
  setPlayerSearch: (v: string) => void
  playerSortKey: "name" | "number" | "birthdate" | "city"
  setPlayerSortKey: (v: "name" | "number" | "birthdate" | "city") => void
  playerSortDir: "asc" | "desc"
  setPlayerSortDir: (v: "asc" | "desc") => void

  onEditPlayer: (player: ClubPlayer) => void
  onDeactivatePlayer: (playerId: string) => void
  onReactivatePlayer: (playerId: string) => void

  onDataChanged?: () => void | Promise<void>
}

type SpielerOption = {
  id: string
  name: string
  verein: string | null
  player_code: string | null
}

type MemberDocAcceptanceSnapshot = {
  document_id: string
  title: string
  category: string
  version: string
  storage_path: string
  opened_at: string
  accepted_at: string
}

type MemberDocAcceptanceRow = {
  id: string
  document_acceptances: MemberDocAcceptanceSnapshot[]
  signed_at: string
  guardian_full_name: string | null
  guardian_signed_at: string | null
  archive_file_name: string | null
  archive_sha256: string | null
  created_at: string
}

type JoinArchiveRow = {
  id: string
  request_id: string
  stage: "submitted" | "approved"
  file_name: string
  sha256: string
  generated_at: string
}

type ClubRole = "Vorstand" | "Kassier" | "Schriftführer"

const CLUB_ROLE_OPTIONS: Array<{ value: ClubRole; label: string }> = [
  { value: "Vorstand", label: "Vorstand" },
  { value: "Kassier", label: "Kassier" },
  { value: "Schriftführer", label: "Schriftführer" },
]

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s
  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}`
}

function fmtText(v: unknown) {
  const s = v == null ? "" : String(v)
  return s.trim().length > 0 ? s : "—"
}

function getPlayerAccountState(player: ClubPlayer) {
  const isInactive = (player as any)?.is_active === false || !!player.club_left_at
  const hasAccount = !!(player as any)?.user_profiles?.user_id
  if (isInactive) {
    return {
      label: "Deaktiviert",
      className: "border-rose-300/15 bg-rose-500/[0.08] text-rose-200",
    }
  }

  if (hasAccount) {
    return {
      label: "Konto aktiv",
      className: "border-emerald-300/15 bg-emerald-500/[0.08] text-emerald-200",
    }
  }

  return {
    label: "Kein Konto",
    className: "border-white/[0.08] bg-white/[0.035] text-white/45",
  }
}

const getPlayerStatusBadge = (player: ClubPlayer) => {
  const status = getPlayerAccountState(player)

  return <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
}

export function ManagePlayersTab(props: Props) {
  const {
    visiblePlayers,
    clubPlayersCount,
    playerLoading,
    teams,
    teamMembers,
    playerSearch,
    setPlayerSearch,
    playerSortKey,
    setPlayerSortKey,
    playerSortDir,
    setPlayerSortDir,
    onEditPlayer,
    onDeactivatePlayer,
    onReactivatePlayer,
    onDataChanged,
  } = props

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)
  const [deletePlayerName, setDeletePlayerName] = useState<string>("")
  const [confirmText, setConfirmText] = useState("")

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsPlayer, setDetailsPlayer] = useState<ClubPlayer | null>(null)

  const [memberFileLoading, setMemberFileLoading] = useState(false)
  const [memberFileError, setMemberFileError] = useState("")
  const [memberDocAcceptances, setMemberDocAcceptances] = useState<MemberDocAcceptanceRow[]>([])
  const [joinArchives, setJoinArchives] = useState<JoinArchiveRow[]>([])
  const [memberFileDownloadId, setMemberFileDownloadId] = useState("")

  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [linkingStatus, setLinkingStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [spielerOptions, setSpielerOptions] = useState<SpielerOption[]>([])
  const [linkingForm, setLinkingForm] = useState<{
    playerId: string
    playerName: string
    selectedSpielerId: string
  }>({
    playerId: "",
    playerName: "",
    selectedSpielerId: "",
  })

  const [clubRoles, setClubRoles] = useState<ClubRole[]>([])
  const [clubRolesLoading, setClubRolesLoading] = useState(false)
  const [clubRolesSaving, setClubRolesSaving] = useState(false)
  const [clubRolesStatus, setClubRolesStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({
    type: null,
    message: "",
  })

  const mustType = "DEAKTIVIEREN"
  const canDelete = confirmText.trim().toUpperCase() === mustType

  const detailsPlayerTeams = useMemo(() => {
    if (!detailsPlayer) return []

    return teamMembers
      .filter((member) => member.player_id === detailsPlayer.id)
      .map((member) => {
        const team = teams.find((entry) => entry.id === member.team_id)
        return {
          id: member.id,
          teamId: member.team_id,
          teamName: team?.name?.trim() || "Unbekannte Mannschaft",
          role: member.role?.trim() || "Player",
        }
      })
      .sort((a, b) => a.teamName.localeCompare(b.teamName, "de", { sensitivity: "base" }))
  }, [detailsPlayer, teamMembers, teams])

  function openDelete(player: ClubPlayer) {
    setDeletePlayerId(player.id)
    setDeletePlayerName(player.name)
    setConfirmText("")
    setDeleteOpen(true)
  }

  function closeDelete() {
    setDeleteOpen(false)
    setDeletePlayerId(null)
    setDeletePlayerName("")
    setConfirmText("")
  }

  function confirmDelete() {
    if (!deletePlayerId) return
    onDeactivatePlayer(deletePlayerId)
    closeDelete()
  }

  function openDetails(player: ClubPlayer) {
    setDetailsPlayer(player)
    setDetailsOpen(true)
  }

  function closeDetails() {
    setDetailsOpen(false)
    setDetailsPlayer(null)
    setClubRoles([])
    setClubRolesStatus({ type: null, message: "" })
    setMemberFileError("")
    setMemberDocAcceptances([])
    setJoinArchives([])
    setMemberFileDownloadId("")
  }

  const loadSpielerdatenbank = async () => {
    try {
      const { data, error } = await supabase.from("spieldatenbank").select("id, name, verein, player_code").order("name", { ascending: true })

      if (error) throw error
      setSpielerOptions((data || []) as SpielerOption[])
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Laden der Spielerdatenbank: ${err.message}`,
      })
    }
  }

  const openLinkingDialog = async (player: ClubPlayer) => {
    setLinkingForm({
      playerId: player.id,
      playerName: player.name,
      selectedSpielerId: "",
    })
    setLinkingStatus({ type: null, message: "" })
    await loadSpielerdatenbank()
    setLinkingDialogOpen(true)
  }

  const refreshAfterChange = async () => {
    await Promise.resolve(onDataChanged?.())
  }

  const linkToSpieldatenbank = async () => {
    if (!linkingForm.selectedSpielerId) {
      setLinkingStatus({
        type: "error",
        message: "Bitte wählen Sie einen Spieler aus der Spielerdatenbank aus.",
      })
      return
    }

    setIsLinking(true)
    setLinkingStatus({ type: null, message: "" })

    try {
      const { error } = await supabase.from("club_players").update({ spieldatenbank_id: linkingForm.selectedSpielerId }).eq("id", linkingForm.playerId)

      if (error) throw error

      setLinkingStatus({
        type: "success",
        message: "Spieler erfolgreich mit Spielerdatenbank verknüpft!",
      })
      await refreshAfterChange()

      setTimeout(() => setLinkingDialogOpen(false), 700)
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Verknüpfen: ${err.message}`,
      })
    } finally {
      setIsLinking(false)
    }
  }

  const unlinkSpieldatenbank = async (player: ClubPlayer) => {
    setIsLinking(true)
    try {
      const { error } = await supabase.from("club_players").update({ spieldatenbank_id: null }).eq("id", player.id)

      if (error) throw error
      await refreshAfterChange()
    } catch (err: any) {
      setLinkingStatus({
        type: "error",
        message: `Fehler beim Entfernen der Verknüpfung: ${err.message}`,
      })
    } finally {
      setIsLinking(false)
    }
  }

  const getMemberCardBadge = (player: ClubPlayer) => {
    if ((player as any)?.spieldatenbank_id) {
      return (
        <Badge className="border-emerald-300/15 bg-emerald-500/[0.08] text-xs text-emerald-200">
          <Link2 className="h-3 w-3 mr-1" />
          Card aktiv
        </Badge>
      )
    }

    return (
      <Badge className="border-orange-300/15 bg-orange-500/[0.08] text-xs text-orange-200">
        <LinkOff className="h-3 w-3 mr-1" />
        Card fehlt
      </Badge>
    )
  }

  const getClubRoleBadges = (roles: ClubRole[]) => {
    if (!roles.length) {
      return <div className="text-sm text-white/35">Keine Vereinsrollen vergeben.</div>
    }

    return (
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Badge key={role} className="border-violet-300/15 bg-violet-500/[0.08] text-xs text-violet-200">
            <Users className="h-3 w-3 mr-1" />
            {role}
          </Badge>
        ))}
      </div>
    )
  }

  const toggleRoleInForm = (role: ClubRole) => {
    setClubRoles((prev) => {
      const has = prev.includes(role)
      return has ? prev.filter((r) => r !== role) : [...prev, role]
    })
  }


  useEffect(() => {
    const loadMemberFile = async () => {
      if (!detailsOpen || !detailsPlayer) {
        setMemberDocAcceptances([])
        setJoinArchives([])
        setMemberFileError("")
        return
      }

      const authUserId = (detailsPlayer as any)?.user_profiles?.user_id as string | undefined

      if (!authUserId) {
        setMemberDocAcceptances([])
        setJoinArchives([])
        setMemberFileError("")
        return
      }

      try {
        setMemberFileLoading(true)
        setMemberFileError("")

        const [acceptanceRes, joinArchiveRes] = await Promise.all([
          supabase
            .from("member_document_acceptances")
            .select("id,document_acceptances,signed_at,guardian_full_name,guardian_signed_at,archive_file_name,archive_sha256,created_at")
            .eq("user_id", authUserId)
            .order("created_at", { ascending: false }),
          supabase
            .from("club_join_archives")
            .select("id,request_id,stage,file_name,sha256,generated_at")
            .eq("user_id", authUserId)
            .order("generated_at", { ascending: false }),
        ])

        if (acceptanceRes.error) throw acceptanceRes.error
        if (joinArchiveRes.error) throw joinArchiveRes.error

        setMemberDocAcceptances((acceptanceRes.data || []) as MemberDocAcceptanceRow[])
        setJoinArchives((joinArchiveRes.data || []) as JoinArchiveRow[])
      } catch (err: any) {
        console.error("member file load error:", err)
        setMemberDocAcceptances([])
        setJoinArchives([])
        setMemberFileError(err?.message || "Mitgliederakte konnte nicht geladen werden.")
      } finally {
        setMemberFileLoading(false)
      }
    }

    void loadMemberFile()
  }, [detailsOpen, detailsPlayer])

  const getAdminAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const token = data.session?.access_token
    if (!token) throw new Error("Sitzung abgelaufen. Bitte neu anmelden.")
    return token
  }

  const downloadMemberAcceptance = async (row: MemberDocAcceptanceRow) => {
    try {
      setMemberFileDownloadId(`member:${row.id}`)
      setMemberFileError("")
      const token = await getAdminAccessToken()
      const response = await fetch(`/api/member-documents?id=${encodeURIComponent(row.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "PDF konnte nicht geöffnet werden.")
      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (err: any) {
      setMemberFileError(err?.message || "PDF konnte nicht geöffnet werden.")
    } finally {
      setMemberFileDownloadId("")
    }
  }

  const downloadJoinArchive = async (row: JoinArchiveRow) => {
    try {
      setMemberFileDownloadId(`join:${row.id}`)
      setMemberFileError("")
      const token = await getAdminAccessToken()
      const response = await fetch("/api/club-join-archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: row.request_id,
          stage: row.stage,
          action: "download",
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "PDF konnte nicht geöffnet werden.")
      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (err: any) {
      setMemberFileError(err?.message || "PDF konnte nicht geöffnet werden.")
    } finally {
      setMemberFileDownloadId("")
    }
  }

  const memberFileCount = memberDocAcceptances.length + joinArchives.length

  useEffect(() => {
    const loadClubRoles = async () => {
      if (!detailsOpen || !detailsPlayer) {
        setClubRoles([])
        setClubRolesStatus({ type: null, message: "" })
        return
      }

      const authUserId = (detailsPlayer as any)?.user_profiles?.user_id as string | undefined

      if (!authUserId) {
        setClubRoles([])
        setClubRolesStatus({
          type: "error",
          message: "Keine Vereinsrollen möglich, weil der Spieler noch keinen Account hat.",
        })
        return
      }

      setClubRolesLoading(true)
      setClubRolesStatus({ type: null, message: "" })

      try {
        const { data, error } = await supabase.from("club_roles").select("role").eq("user_id", authUserId)

        if (error) throw error

        const roles = ((data || []).map((r: any) => r.role).filter((r: any) =>
          CLUB_ROLE_OPTIONS.some((opt) => opt.value === r),
        ) || []) as ClubRole[]

        setClubRoles(Array.from(new Set(roles)))
      } catch (err: any) {
        setClubRoles([])
        setClubRolesStatus({
          type: "error",
          message: `Fehler beim Laden der Vereinsrollen: ${err.message}`,
        })
      } finally {
        setClubRolesLoading(false)
      }
    }

    loadClubRoles()
  }, [detailsOpen, detailsPlayer])

  const saveClubRoles = async () => {
    if (!detailsPlayer) return

    const authUserId = (detailsPlayer as any)?.user_profiles?.user_id as string | undefined

    if (!authUserId) {
      setClubRolesStatus({
        type: "error",
        message: "Der Spieler hat keinen Account. Vereinsrollen können erst nach Account-Erstellung gespeichert werden.",
      })
      return
    }

    setClubRolesSaving(true)
    setClubRolesStatus({ type: null, message: "" })

    try {
      const { error: delErr } = await supabase.from("club_roles").delete().eq("user_id", authUserId)
      if (delErr) throw delErr

      if (clubRoles.length > 0) {
        const payload = clubRoles.map((role) => ({
          user_id: authUserId,
          role,
        }))

        const { error: insErr } = await supabase.from("club_roles").insert(payload)
        if (insErr) throw insErr
      }

      setClubRolesStatus({
        type: "success",
        message: "Vereinsrollen gespeichert.",
      })

      await refreshAfterChange()
    } catch (err: any) {
      setClubRolesStatus({
        type: "error",
        message: `Fehler beim Speichern der Vereinsrollen: ${err.message}`,
      })
    } finally {
      setClubRolesSaving(false)
    }
  }

  return (
    <div className="space-y-5 text-white">
      <section className={vv.surfaceLg}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/[0.055] blur-3xl" />
          <div className="absolute -right-28 top-8 h-72 w-72 rounded-full bg-orange-500/[0.055] blur-3xl" />
        </div>

        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-500/[0.08]">
                <Users className="h-5 w-5 text-sky-200" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/50">Mitgliederverwaltung</div>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Spieler</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
                  Mitgliederdaten, Accountstatus, Member Card und Mannschaftszugehörigkeit übersichtlich verwalten.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] px-3.5 py-2.5 text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Gesamt</div>
                <div className="mt-0.5 text-base font-black text-white">{clubPlayersCount}</div>
              </div>
              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] px-3.5 py-2.5 text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Gefunden</div>
                <div className="mt-0.5 text-base font-black text-white">{visiblePlayers.length}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_170px]">
          <div>
            <Label htmlFor="playerSearch" className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/35">Spieler suchen</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <Input
                id="playerSearch"
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Name, Nummer, Player-Code, Ort …"
                className={cn(vv.input, "h-12")}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/35">Sortierung</Label>
            <Select value={playerSortKey} onValueChange={(v) => setPlayerSortKey(v as any)}>
              <SelectTrigger className={cn(vv.input, "h-12")}>
                <SelectValue placeholder="Sortieren nach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="number">Nummer</SelectItem>
                <SelectItem value="birthdate">Geburtsdatum</SelectItem>
                <SelectItem value="city">Ort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/35">Richtung</Label>
            <Select value={playerSortDir} onValueChange={(v) => setPlayerSortDir(v as any)}>
              <SelectTrigger className={cn(vv.input, "h-12")}>
                <SelectValue placeholder="Richtung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Aufsteigend</SelectItem>
                <SelectItem value="desc">Absteigend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {clubPlayersCount === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/[0.09] bg-white/[0.018] px-4 py-10 text-center">
          <Users className="mx-auto h-6 w-6 text-white/20" />
          <p className="mt-2 text-sm font-semibold text-white/35">Noch keine Spieler vorhanden.</p>
        </div>
      ) : visiblePlayers.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/[0.09] bg-white/[0.018] px-4 py-10 text-center">
          <Search className="mx-auto h-6 w-6 text-white/20" />
          <p className="mt-2 text-sm font-semibold text-white/35">Keine Spieler für diese Suche gefunden.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visiblePlayers.map((player) => {
            const isInactive = (player as any)?.is_active === false || !!player.club_left_at
            const playerTeams = teamMembers
              .filter((member) => member.player_id === player.id)
              .map((member) => teams.find((team) => team.id === member.team_id))
              .filter(Boolean) as Team[]

            return (
              <article
                key={player.id}
                className={cn(vv.cardHover, "p-4")}
              >
                <div className="flex items-start gap-3.5">
                  <Avatar className="h-12 w-12 flex-none border border-white/[0.10] bg-black/25">
                    <AvatarImage src={player.photo_url || "/placeholder.svg?height=48&width=48&query=player-avatar"} />
                    <AvatarFallback className="bg-white/[0.04] font-black text-white/55">{player.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-black text-white">{player.name}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {getPlayerStatusBadge(player)}
                          {getMemberCardBadge(player)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDetails(player)}
                        disabled={playerLoading}
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/35 transition hover:border-sky-300/20 hover:bg-sky-500/[0.08] hover:text-sky-200"
                        title="Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[18px] border border-[#202731] bg-[#0d1117] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/24"><Hash className="h-3 w-3" /> Nummer</div>
                    <div className="mt-1 text-xs font-bold text-white/60">{player.player_number ?? "—"}</div>
                  </div>
                  <div className="rounded-[18px] border border-[#202731] bg-[#0d1117] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/24"><CreditCard className="h-3 w-3" /> Player-Code</div>
                    <div className="mt-1 truncate font-mono text-xs font-bold text-white/60">{(player as any)?.player_code ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-[18px] border border-[#202731] bg-[#0d1117] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/24">Mannschaften</div>
                    <div className="text-[10px] font-black text-white/28">{playerTeams.length} aktiv</div>
                  </div>
                  {playerTeams.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {playerTeams.slice(0, 4).map((team) => (
                        <span key={team.id} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-white/45">
                          {team.name}
                        </span>
                      ))}
                      {playerTeams.length > 4 ? (
                        <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-black text-white/30">+{playerTeams.length - 4}</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs font-semibold text-white/28">Keiner Mannschaft zugeordnet.</div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditPlayer(player)}
                    disabled={playerLoading}
                    className={cn(vv.buttonSecondary, "h-9 flex-1")}
                  >
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Bearbeiten
                  </Button>

                  {isInactive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReactivatePlayer(player.id)}
                      disabled={playerLoading}
                      className={cn(vv.buttonSecondary, "h-9 flex-1 text-emerald-200")}
                    >
                      <UserCheck className="mr-2 h-3.5 w-3.5" />
                      Aktivieren
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDelete(player)}
                      disabled={playerLoading}
                      className={cn(vv.buttonDanger, "h-9 flex-1")}
                    >
                      <UserX className="mr-2 h-3.5 w-3.5" />
                      Deaktivieren
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={(open) => (open ? null : closeDetails())}>
        <DialogContent className={cn(vv.modal, "flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[88dvh]")}>
          <DialogHeader className={vv.modalHeader}>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={detailsPlayer?.photo_url || "/placeholder.svg?height=40&width=40&query=player-avatar"} />
                  <AvatarFallback>{detailsPlayer?.name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="truncate">{detailsPlayer?.name ?? "Spieler"}</div>
                  <div className="truncate text-xs text-white/35">
                    Player-Code: <span className="font-mono">{(detailsPlayer as any)?.player_code ?? "—"}</span>
                  </div>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsPlayer && (
            <div className={cn(vv.modalBody, "space-y-5")}>
              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {getPlayerStatusBadge(detailsPlayer)}
                  {getMemberCardBadge(detailsPlayer)}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="mb-3 font-black text-white">Member Card</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!((detailsPlayer as any)?.spieldatenbank_id) ? (
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-xl border-sky-300/15 bg-sky-500/[0.055] text-sky-200/80 hover:bg-sky-500/[0.09] sm:w-auto"
                      onClick={() => openLinkingDialog(detailsPlayer)}
                      disabled={isLinking}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Jetzt verknüpfen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-xl border-white/[0.08] bg-white/[0.025] text-white/55 hover:bg-white/[0.06] hover:text-white sm:w-auto"
                      onClick={() => unlinkSpieldatenbank(detailsPlayer)}
                      disabled={isLinking}
                    >
                      <LinkOff className="h-4 w-4 mr-2" />
                      Verknüpfung entfernen
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-violet-300" />
                  <div className="font-black text-white">Vereinsrollen</div>
                </div>

                <div className="mb-4">{getClubRoleBadges(clubRoles)}</div>

                {clubRolesLoading ? (
                  <div className="text-sm text-white/35">Vereinsrollen werden geladen...</div>
                ) : (
                  <div className="space-y-2">
                    {CLUB_ROLE_OPTIONS.map((opt) => {
                      const checked = clubRoles.includes(opt.value)
                      return (
                        <div key={opt.value} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-violet-300" />
                            <span className="text-sm font-bold text-white/65">{opt.label}</span>
                          </div>
                          <Switch checked={checked} onCheckedChange={() => toggleRoleInForm(opt.value)} />
                        </div>
                      )
                    })}
                  </div>
                )}

                {clubRolesStatus.type && (
                  <div
                    className={cn(
                      "mt-4 p-3 rounded-lg flex items-center space-x-2 border",
                      clubRolesStatus.type === "success"
                        ? "border-emerald-300/15 bg-emerald-500/[0.08] text-emerald-100"
                        : "border-rose-300/15 bg-rose-500/[0.08] text-rose-100",
                    )}
                  >
                    {clubRolesStatus.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span className="text-sm">{clubRolesStatus.message}</span>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={saveClubRoles}
                    disabled={clubRolesSaving || clubRolesLoading || !((detailsPlayer as any)?.user_profiles?.user_id)}
                    className="rounded-xl border border-violet-300/15 bg-violet-500/[0.12] text-violet-100 hover:bg-violet-500/[0.18]"
                  >
                    {clubRolesSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Speichern...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Vereinsrollen speichern</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-3">
                  <div className="text-xs text-white/30">Nr.</div>
                  <div className="font-black text-white">{detailsPlayer.player_number ?? "—"}</div>
                </div>

                <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-3">
                  <div className="text-xs text-white/30">Geburtsdatum</div>
                  <div className="font-black text-white">{fmtDateISO(detailsPlayer.birthdate)}</div>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="mb-3 font-black text-white">Kontakt</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-white/30">E-Mail</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.email)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">Telefon</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.phone)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="mb-3 font-black text-white">Adresse</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-white/30">Straße</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.street)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">Hausnr.</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.house_number)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">PLZ</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.postal_code)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">Ort</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.city)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="mb-3 font-black text-white">Mannschaften</div>

                {detailsPlayerTeams.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detailsPlayerTeams.map((entry) => (
                      <Badge
                        key={entry.id}
                        variant="outline"
                        className="rounded-full border-sky-300/15 bg-sky-500/[0.055] px-3 py-1 text-sky-200/75"
                      >
                        {entry.teamName}
                        <span className="mx-1 text-blue-300">•</span>
                        <span className="font-normal">{entry.role}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/35">Aktuell keiner Mannschaft zugewiesen.</div>
                )}
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08]">
                      <Archive className="h-4 w-4 text-orange-200" />
                    </div>
                    <div>
                      <div className="font-black text-white">Mitgliederakte</div>
                      <div className="mt-0.5 text-xs leading-5 text-white/35">
                        Archivierte Beitrittsunterlagen und bestätigte Vereinsdokumente.
                      </div>
                    </div>
                  </div>

                  {!((detailsPlayer as any)?.user_profiles?.user_id) ? (
                    <Badge className="w-fit rounded-full border border-white/[0.08] bg-white/[0.035] text-white/45">
                      Kein Account
                    </Badge>
                  ) : memberFileLoading ? (
                    <Badge className="w-fit rounded-full border border-sky-300/15 bg-sky-500/[0.08] text-sky-200">
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      Wird geladen
                    </Badge>
                  ) : memberFileCount > 0 ? (
                    <Badge className="w-fit rounded-full border border-emerald-300/15 bg-emerald-500/[0.08] text-emerald-200">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      {memberFileCount} {memberFileCount === 1 ? "Eintrag" : "Einträge"}
                    </Badge>
                  ) : (
                    <Badge className="w-fit rounded-full border border-white/[0.08] bg-white/[0.035] text-white/45">
                      Keine Unterlagen
                    </Badge>
                  )}
                </div>

                {memberFileError ? (
                  <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-500/[0.08] px-3 py-2 text-sm font-semibold text-rose-100">
                    {memberFileError}
                  </div>
                ) : null}

                {!((detailsPlayer as any)?.user_profiles?.user_id) ? (
                  <div className="mt-4 rounded-[16px] border border-[#202731] bg-[#0d1117] p-4 text-sm text-white/38">
                    Für diesen Spieler ist noch kein Benutzerkonto verknüpft. Deshalb kann keine digitale Mitgliederakte zugeordnet werden.
                  </div>
                ) : memberFileLoading ? (
                  <div className="mt-4 flex items-center gap-2 rounded-[16px] border border-[#202731] bg-[#0d1117] p-4 text-sm text-white/38">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
                    Mitgliederakte wird geladen…
                  </div>
                ) : memberFileCount === 0 ? (
                  <div className="mt-4 rounded-[16px] border border-[#202731] bg-[#0d1117] p-4">
                    <div className="text-sm font-bold text-white/55">Keine archivierten Unterlagen vorhanden.</div>
                    <div className="mt-1 text-xs leading-5 text-white/30">
                      Neue Beitrittsarchive und spätere Dokumentbestätigungen erscheinen hier automatisch.
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {joinArchives.length > 0 ? (
                      <div>
                        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                          Beitrittsarchive
                        </div>
                        <div className="space-y-2">
                          {joinArchives.map((row) => (
                            <div
                              key={row.id}
                              className="flex flex-col gap-3 rounded-[16px] border border-[#202731] bg-[#0d1117] p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileText className="h-4 w-4 flex-none text-orange-200" />
                                  <div className="truncate text-sm font-black text-white">
                                    {row.stage === "approved" ? "Aufnahmebestätigung" : "Beitrittsantrag"}
                                  </div>
                                  <Badge className="rounded-full border border-orange-300/15 bg-orange-500/[0.08] text-[10px] text-orange-200">
                                    PDF
                                  </Badge>
                                </div>
                                <div className="mt-1 truncate text-xs text-white/30">{row.file_name}</div>
                                <div className="mt-1 text-xs font-semibold text-white/38">
                                  Archiviert am {fmtDateISO(row.generated_at)}
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                disabled={memberFileDownloadId === `join:${row.id}`}
                                onClick={() => void downloadJoinArchive(row)}
                                className={cn(vv.buttonSecondary, "h-9 w-full flex-none text-xs sm:w-auto")}
                              >
                                {memberFileDownloadId === `join:${row.id}` ? (
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-3.5 w-3.5" />
                                )}
                                PDF öffnen
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {memberDocAcceptances.length > 0 ? (
                      <div>
                        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
                          Dokumentbestätigungen
                        </div>
                        <div className="space-y-2">
                          {memberDocAcceptances.map((row) => {
                            const documents = row.document_acceptances || []
                            return (
                              <div
                                key={row.id}
                                className="rounded-[16px] border border-[#202731] bg-[#0d1117] p-3"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <FileText className="h-4 w-4 flex-none text-sky-200" />
                                      <div className="text-sm font-black text-white">Bestätigte Vereinsunterlagen</div>
                                      <Badge className="rounded-full border border-sky-300/15 bg-sky-500/[0.08] text-[10px] text-sky-200">
                                        {documents.length} {documents.length === 1 ? "Dokument" : "Dokumente"}
                                      </Badge>
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-white/38">
                                      Unterzeichnet am {fmtDateISO(row.signed_at || row.created_at)}
                                    </div>
                                    {row.guardian_full_name ? (
                                      <div className="mt-1 text-xs text-white/30">
                                        Gesetzliche Vertretung: {row.guardian_full_name}
                                      </div>
                                    ) : null}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={memberFileDownloadId === `member:${row.id}`}
                                    onClick={() => void downloadMemberAcceptance(row)}
                                    className={cn(vv.buttonSecondary, "h-9 w-full flex-none text-xs sm:w-auto")}
                                  >
                                    {memberFileDownloadId === `member:${row.id}` ? (
                                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Download className="mr-2 h-3.5 w-3.5" />
                                    )}
                                    PDF öffnen
                                  </Button>
                                </div>

                                {documents.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {documents.map((doc) => (
                                      <Badge
                                        key={`${row.id}:${doc.document_id}:${doc.version}`}
                                        variant="outline"
                                        className="rounded-full border-[#303946] bg-[#151a22] text-[10px] text-white/48"
                                      >
                                        {doc.title} · v{doc.version}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="mb-3 font-black text-white">Weitere Daten</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-white/30">Trikotgröße</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.jersey_size)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">IBAN</div>
                    <div className="font-bold text-white/65">{fmtText(detailsPlayer.iban)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">Mitglied seit</div>
                    <div className="font-bold text-white/65">{fmtDateISO(detailsPlayer.club_joined_at)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-white/30">Ausgetreten</div>
                    <div className="font-bold text-white/65">{fmtDateISO(detailsPlayer.club_left_at)}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[#202731] pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={closeDetails} className="border-white/[0.08] bg-white/[0.025] text-white/55 hover:bg-white/[0.06] hover:text-white">
                  Schließen
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    closeDetails()
                    onEditPlayer(detailsPlayer)
                  }}
                  disabled={playerLoading}
                  className="border-sky-300/15 bg-sky-500/[0.055] text-sky-200/80 hover:bg-sky-500/[0.09]"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={linkingDialogOpen} onOpenChange={setLinkingDialogOpen}>
        <DialogContent className={cn(vv.modalSmall, "max-h-[calc(100dvh-1rem)] sm:max-h-[82dvh]")}>
          <DialogHeader className={vv.modalHeader}>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Link2 className="h-5 w-5 text-sky-300" />
              <span>Mit Member Card verknüpfen</span>
            </DialogTitle>
          </DialogHeader>

          <div className={cn(vv.modalBody, "space-y-4")}>
            <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] bg-sky-500/[0.055] p-3">
              <p className="text-sm text-sky-100/65">
                Wählen Sie einen Spieler aus der Spielerdatenbank aus, um diesem Vereinsspieler eine Member Card zu aktivieren.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#252c36] bg-[#10141b] p-3">
              <p className="text-sm text-white/35">Spieler:</p>
              <p className="font-black text-white">{linkingForm.playerName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spieler-select" className="text-xs font-black uppercase tracking-[0.08em] text-white/45">Spieler aus Spielerdatenbank</Label>
              <Select
                value={linkingForm.selectedSpielerId}
                onValueChange={(value) => setLinkingForm((prev) => ({ ...prev, selectedSpielerId: value }))}
              >
                <SelectTrigger className={vv.select}>
                  <SelectValue placeholder="Spieler auswählen..." />
                </SelectTrigger>

                <SelectContent>
                  {spielerOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{s.name}</span>

                        {s.verein ? (
                          <Badge variant="outline" className="text-xs ml-2">
                            {s.verein}
                          </Badge>
                        ) : null}

                        {s.player_code ? (
                          <Badge variant="outline" className="text-xs ml-2 font-mono">
                            {s.player_code}
                          </Badge>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkingStatus.type && (
              <div
                className={cn(
                  "p-3 rounded-lg flex items-center space-x-2 border",
                  linkingStatus.type === "success" ? "border-emerald-300/15 bg-emerald-500/[0.08] text-emerald-100" : "border-rose-300/15 bg-rose-500/[0.08] text-rose-100",
                )}
              >
                {linkingStatus.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="text-sm">{linkingStatus.message}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={() => setLinkingDialogOpen(false)} variant="outline" className={cn(vv.buttonSecondary, "flex-1")} disabled={isLinking}>
                Abbrechen
              </Button>

              <Button
                onClick={linkToSpieldatenbank}
                disabled={isLinking || !linkingForm.selectedSpielerId}
                className={cn(vv.buttonPrimary, "flex-1")}
              >
                {isLinking ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Wird verknüpft...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="h-4 w-4" />
                    <span>Verknüpfen</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {deleteOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" onClick={() => !playerLoading && closeDelete()} />

          <div className="absolute inset-x-2 bottom-2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(480px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[26px] border border-[#2a323d] bg-[#090c11] text-white shadow-[0_32px_110px_-38px_rgba(0,0,0,.98)] sm:rounded-[28px]">
              <div className={vv.modalHeader}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-base font-black text-white">Spieler deaktivieren</h5>
                    <p className="mt-1 text-sm text-white/38">Der Spieler wird deaktiviert, aus Teams entfernt und der Zugang gesperrt.</p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => !playerLoading && closeDelete()}
                  >
                    <XCircle className="h-5 w-5 text-white/35" />
                    <span className="sr-only">Schließen</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/[0.07] p-3.5 text-sm text-rose-100">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black">Du deaktivierst:</div>
                    <div className="mt-1">
                      <span className="font-black">{deletePlayerName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmDeletePlayer">
                    Tippe <span className="font-semibold">DEAKTIVIEREN</span> zum Bestätigen
                  </Label>
                  <Input
                    id="confirmDeletePlayer"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DEAKTIVIEREN"
                    className="h-11 rounded-xl border-white/[0.10] bg-black/25 text-white placeholder:text-white/20 focus:border-rose-400/40 focus:ring-rose-400/15"
                    autoFocus
                  />
                </div>
              </div>

              <div className={vv.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(vv.buttonSecondary, "w-full flex-1")}
                  onClick={() => !playerLoading && closeDelete()}
                  disabled={playerLoading}
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(vv.buttonDanger, "w-full flex-1")}
                  onClick={confirmDelete}
                  disabled={playerLoading || !canDelete}
                >
                  {playerLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird deaktiviert...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Deaktivieren & sperren</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
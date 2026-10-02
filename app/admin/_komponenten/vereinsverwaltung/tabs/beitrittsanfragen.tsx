"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  PenLine,
  Sparkles,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  XCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Shirt,
  CalendarDays,
  Settings2,
  FileText,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"

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
  trial_requested: boolean
  signature_data_url: string | null
  signed_at: string | null
  document_acceptances: Array<{
    document_id: string
    title: string
    category: string
    version: string
    storage_path: string
    opened_at: string
    accepted_at: string
  }> | null
  documents_accepted_at: string | null
  guardian_full_name: string | null
  guardian_signature_data_url: string | null
  guardian_signed_at: string | null
  trial_granted_at: string | null
  trial_ends_on: string | null
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
  if (status === "pending") return "border-orange-300/20 bg-orange-500/10 text-orange-200"
  if (status === "approved") return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
  if (status === "rejected") return "border-rose-300/20 bg-rose-500/10 text-rose-200"
  return "border-[#303946] bg-[#151a22] text-white/45"
}

function isMinorBirthdate(value: string | null | undefined) {
  if (!value) return false
  const birth = new Date(`${String(value).split("T")[0]}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return false
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--
  return age < 18
}

function addDaysISO(days: number) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + Math.max(0, days))
  return d.toISOString().slice(0, 10)
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
  const [archiveLoading, setArchiveLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [search, setSearch] = useState("")
  const [selectedSpieldatenbank, setSelectedSpieldatenbank] = useState<Record<string, string>>({})
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [trialDurationDays, setTrialDurationDays] = useState(90)
  const [trialPreset, setTrialPreset] = useState<"edart" | "steeldart" | "both" | "full">("full")
  const [documentsEnabled, setDocumentsEnabled] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())

  const toggleExpanded = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [requestRes, playerRes, settingsRes] = await Promise.all([
        supabase.from("club_join_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("spieldatenbank").select("id,name,verein").order("name", { ascending: true }),
        supabase.from("club_join_settings").select("trial_duration_days,trial_preset,documents_enabled").eq("id", "default").maybeSingle(),
      ])

      if (requestRes.error) throw requestRes.error
      if (playerRes.error) throw playerRes.error
      if (settingsRes.error) throw settingsRes.error

      const nextRows = (requestRes.data || []) as JoinRequest[]
      setRows(nextRows)
      setPlayers((playerRes.data || []) as SpielerOption[])
      if (settingsRes.data) {
        setTrialDurationDays(Number(settingsRes.data.trial_duration_days || 90))
        setTrialPreset((settingsRes.data.trial_preset || "full") as "edart" | "steeldart" | "both" | "full")
        setDocumentsEnabled(!!settingsRes.data.documents_enabled)
      }

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

  async function saveTrialSettings() {
    if (!user?.id) return
    try {
      setSavingSettings(true)
      setMessage(null)
      const duration = Math.min(730, Math.max(1, Number(trialDurationDays || 90)))
      const { error } = await supabase
        .from("club_join_settings")
        .update({
          trial_duration_days: duration,
          trial_preset: trialPreset,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", "default")
      if (error) throw error
      setTrialDurationDays(duration)
      setMessage({ type: "success", text: `Standard-Testphase gespeichert: ${duration} Tage.` })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Testphasen-Einstellung konnte nicht gespeichert werden." })
    } finally {
      setSavingSettings(false)
    }
  }

  async function grantRequestedTrial(playerId: string, row: JoinRequest) {
    if (!row.trial_requested || !user?.id) return { grantedAt: null as string | null, endsOn: null as string | null }

    const { data: settings, error: settingsError } = await supabase
      .from("club_join_settings")
      .select("trial_enabled,trial_duration_days,trial_preset")
      .eq("id", "default")
      .single()
    if (settingsError) throw settingsError
    if (!settings?.trial_enabled) return { grantedAt: null, endsOn: null }

    const { data: moduleRows, error: moduleError } = await supabase
      .from("membership_modules")
      .select("code,is_required_base,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
    if (moduleError) throw moduleError

    const modules = moduleRows || []
    const baseCodes = modules.filter((m: any) => m.is_required_base).map((m: any) => m.code)
    let codes: string[] = []
    const preset = String(settings.trial_preset || "full")
    if (preset === "edart") codes = [...baseCodes, "premium_app", "edart_league"]
    else if (preset === "steeldart") codes = [...baseCodes, "premium_app", "steeldart_league"]
    else if (preset === "both") codes = [...baseCodes, "premium_app", "edart_league", "steeldart_league"]
    else codes = modules.map((m: any) => m.code)
    codes = Array.from(new Set(codes.filter((code) => modules.some((m: any) => m.code === code))))

    const startsOn = new Date().toISOString().slice(0, 10)
    const duration = Math.max(1, Number(settings.trial_duration_days || 90))
    const endsOn = addDaysISO(duration - 1)

    const { data: currentTrials, error: currentTrialsError } = await supabase
      .from("membership_trials")
      .select("module_code")
      .eq("player_id", playerId)
      .eq("status", "active")
    if (currentTrialsError) throw currentTrialsError

    const existingCodes = new Set((currentTrials || []).map((t: any) => t.module_code))
    const rowsToInsert = codes
      .filter((code) => !existingCodes.has(code))
      .map((code) => ({
        player_id: playerId,
        module_code: code,
        starts_on: startsOn,
        ends_on: endsOn,
        status: "active",
        note: `Automatische Testphase aus Beitrittsanfrage ${row.id}`,
        created_by: user.id,
      }))

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("membership_trials").insert(rowsToInsert)
      if (insertError) throw insertError
    }

    return { grantedAt: new Date().toISOString(), endsOn }
  }

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

  async function callArchiveApi(requestId: string, stage: "submitted" | "approved", action: "generate" | "download") {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich neu an.")

    const response = await fetch("/api/club-join-archive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ requestId, stage, action }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload?.error || "Die Beitrittsakte konnte nicht verarbeitet werden.")
    return payload as { url?: string; fileName?: string; sha256?: string }
  }

  async function downloadArchive(row: JoinRequest, stage: "submitted" | "approved") {
    const key = `${row.id}:${stage}`
    try {
      setArchiveLoading(key)
      setMessage(null)
      const payload = await callArchiveApi(row.id, stage, "download")
      if (!payload.url) throw new Error("Für diese Beitrittsakte konnte kein Download erstellt werden.")
      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Die Beitrittsakte konnte nicht geöffnet werden." })
    } finally {
      setArchiveLoading(null)
    }
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
          // Nach bestätigtem Vereinsbeitritt ist der Account ein Vereinsmitglied.
          // Mitgliedschaft/Testphase regeln danach nur noch die freigeschalteten Module,
          // nicht mehr, ob das Profil als Gast oder Mitglied geführt wird.
          is_guest: false,
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        })
        .eq("user_id", row.user_id)
      if (profileError) throw profileError

      const trialResult = await grantRequestedTrial(clubPlayerId, row)

      const { error: requestError } = await supabase
        .from("club_join_requests")
        .update({
          status: "approved",
          linked_spieldatenbank_id: selectedId,
          admin_note: adminNotes[row.id]?.trim() || null,
          approved_at: new Date().toISOString(),
          rejected_at: null,
          decided_by: user.id,
          trial_granted_at: trialResult.grantedAt,
          trial_ends_on: trialResult.endsOn,
        })
        .eq("id", row.id)
        .eq("status", "pending")
      if (requestError) throw requestError

      if (documentsEnabled || row.documents_accepted_at) {
        try {
          await callArchiveApi(row.id, "approved", "generate")
        } catch (archiveError) {
          console.error("club join approved archive error:", archiveError)
        }
      }

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
          ? `${row.full_name} wurde aufgenommen.${row.trial_requested && trialResult.endsOn ? ` Testphase bis ${fmtDate(trialResult.endsOn)} aktiviert.` : ""} Die Infomail wurde gesendet.`
          : `${row.full_name} wurde aufgenommen.${row.trial_requested && trialResult.endsOn ? ` Testphase bis ${fmtDate(trialResult.endsOn)} aktiviert.` : ""} Achtung: ${mailErrorText}`,
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
    <div className="space-y-5 text-white">
      <section className={cn(vv.surfaceLg, "overflow-hidden")}>
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/10">
              <UserPlus className="h-5 w-5 text-orange-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/50">Mitgliederaufnahme</div>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Beitrittsanfragen</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
                Neue Mitglieder prüfen, mit der Spielerdatenbank verknüpfen und anschließend direkt in den Verein aufnehmen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className={cn(vv.card, "min-w-[88px] px-3.5 py-2.5")}>
              <div className={vv.label}>Offen</div>
              <div className="mt-0.5 text-lg font-black text-orange-200">{counts.pending}</div>
            </div>
            <div className={cn(vv.card, "min-w-[88px] px-3.5 py-2.5")}>
              <div className={vv.label}>Aufgenommen</div>
              <div className="mt-0.5 text-lg font-black text-emerald-200">{counts.approved}</div>
            </div>
            <div className={cn(vv.card, "min-w-[88px] px-3.5 py-2.5")}>
              <div className={vv.label}>Abgelehnt</div>
              <div className="mt-0.5 text-lg font-black text-rose-200">{counts.rejected}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-500/10">
              <Settings2 className="h-4 w-4 text-violet-200" />
            </div>
            <div>
              <div className="text-sm font-black text-white">Standard-Testphase</div>
              <p className="mt-1 text-xs leading-5 text-white/36">
                Wird nur aktiviert, wenn der Antragsteller eine Testphase angefordert hat und der Beitritt genehmigt wird.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[140px_minmax(190px,230px)_auto]">
            <div>
              <Label className={cn(vv.label, "mb-1.5 block")}>Dauer</Label>
              <Input
                type="number"
                min={1}
                max={730}
                value={trialDurationDays}
                onChange={(e) => setTrialDurationDays(Number(e.target.value || 90))}
                className={vv.input}
              />
            </div>
            <div>
              <Label className={cn(vv.label, "mb-1.5 block")}>Testpaket</Label>
              <Select value={trialPreset} onValueChange={(v) => setTrialPreset(v as typeof trialPreset)}>
                <SelectTrigger className={vv.select}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Komplettpaket</SelectItem>
                  <SelectItem value="both">E-Dart + Steeldart</SelectItem>
                  <SelectItem value="edart">E-Dart</SelectItem>
                  <SelectItem value="steeldart">Steeldart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void saveTrialSettings()}
              disabled={savingSettings}
              className={cn(vv.buttonPrimary, "self-end")}
            >
              {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      </section>

      {message ? (
        <div className={cn(
          "rounded-[18px] border px-4 py-3 text-sm font-bold",
          message.type === "success"
            ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
            : "border-rose-300/20 bg-rose-500/10 text-rose-100",
        )}>
          {message.text}
        </div>
      ) : null}

      <section className={cn(vv.surface, "p-4 sm:p-5")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_auto]">
          <div>
            <Label className={cn(vv.label, "mb-1.5 block")}>Suchen</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, E-Mail, Ort …"
                className={cn(vv.input, "pl-10")}
              />
            </div>
          </div>

          <div>
            <Label className={cn(vv.label, "mb-1.5 block")}>Status</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className={vv.select}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Offen ({counts.pending})</SelectItem>
                <SelectItem value="approved">Aufgenommen ({counts.approved})</SelectItem>
                <SelectItem value="rejected">Abgelehnt ({counts.rejected})</SelectItem>
                <SelectItem value="all">Alle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" onClick={() => void load()} disabled={loading} className={cn(vv.buttonSecondary, "self-end")}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Neu laden
          </Button>
        </div>
      </section>

      {loading ? (
        <div className={cn(vv.surface, "flex items-center justify-center px-4 py-10 text-sm font-semibold text-white/40")}>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Beitrittsanfragen werden geladen…
        </div>
      ) : visibleRows.length === 0 ? (
        <div className={cn(vv.surface, "px-4 py-10 text-center")}>
          <UserPlus className="mx-auto h-6 w-6 text-white/18" />
          <p className="mt-2 text-sm font-semibold text-white/35">Keine passenden Beitrittsanfragen vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((row) => {
            const saving = savingId === row.id
            const selectedId = selectedSpieldatenbank[row.id] || row.linked_spieldatenbank_id || ""
            const expanded = expandedRows.has(row.id)
            const docs = Array.isArray(row.document_acceptances) ? row.document_acceptances : []
            const minor = isMinorBirthdate(row.birthdate)
            const applicantSigned = !!row.signature_data_url && !!row.signed_at
            const guardianSigned = !minor || (!!row.guardian_full_name && !!row.guardian_signature_data_url && !!row.guardian_signed_at)
            const docsComplete = !!row.documents_accepted_at
            const documentsComplete = !documentsEnabled || (applicantSigned && guardianSigned && docsComplete)

            return (
              <article key={row.id} className={cn(vv.card, "overflow-hidden")}>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 break-words text-lg font-black text-white sm:text-xl">{row.full_name}</h4>
                        <Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                        {row.trial_requested ? (
                          <Badge variant="outline" className="border-violet-300/20 bg-violet-500/10 text-violet-200">Testphase gewünscht</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white/30">Anfrage vom {fmtDateTime(row.created_at)}</div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className={cn(vv.inset, "min-w-0 p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><Mail className="h-3 w-3" /> E-Mail</div>
                          <div className="mt-1 break-all text-xs font-bold text-white/60">{row.email || "—"}</div>
                        </div>
                        <div className={cn(vv.inset, "min-w-0 p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><Phone className="h-3 w-3" /> Telefon</div>
                          <div className="mt-1 break-words text-xs font-bold text-white/60">{row.phone || "—"}</div>
                        </div>
                        <div className={cn(vv.inset, "p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><CalendarDays className="h-3 w-3" /> Geburt</div>
                          <div className="mt-1 text-xs font-bold text-white/60">{fmtDate(row.birthdate)}</div>
                        </div>
                        <div className={cn(vv.inset, "p-3")}>
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/25"><Shirt className="h-3 w-3" /> Trikot</div>
                          <div className="mt-1 text-xs font-bold text-white/60">{row.jersey_size || "—"}</div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-start gap-2 text-xs font-semibold text-white/38">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" />
                        <span>{[row.street, row.house_number, row.postal_code, row.city].filter(Boolean).join(" ") || "Keine Adresse angegeben"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black",
                        documentsComplete
                          ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-300/20 bg-rose-500/10 text-rose-200",
                      )}>
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {!documentsEnabled ? "Dokumente aus" : documentsComplete ? "Unterlagen vollständig" : "Unterlagen offen"}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        className={cn(vv.buttonSecondary, "h-9 px-3 text-xs")}
                      >
                        {expanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
                        {expanded ? "Weniger" : "Details"}
                      </button>
                    </div>
                  </div>

                  {row.note ? (
                    <div className={cn(vv.inset, "mt-4 px-3.5 py-3 text-sm text-white/55")}>
                      <span className="font-black text-white/70">Hinweis:</span> {row.note}
                    </div>
                  ) : null}

                  {expanded ? (
                    <div className="mt-4 space-y-4 border-t border-[#202731] pt-4">
                      <section className={cn(vv.inset, "p-4")}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-black text-white"><FileText className="h-4 w-4 text-sky-300" /> Digitale Unterlagen</div>
                          <Badge className={!documentsEnabled ? "bg-[#202731] text-white/55" : documentsComplete ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}>
                            {!documentsEnabled ? "Nicht freigeschaltet" : documentsComplete ? "Vollständig" : "Unvollständig"}
                          </Badge>
                        </div>

                        {!documentsEnabled ? (
                          <div className="mt-3 text-sm leading-6 text-white/40">
                            Der digitale Dokumentenprozess ist derzeit deaktiviert. Die Anfrage kann trotzdem bearbeitet werden.
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className={cn(vv.card, "p-3 text-xs font-bold", docsComplete ? "text-emerald-200" : "text-rose-200")}>Dokumente: {docsComplete ? `✓ ${docs.length} bestätigt` : "✗ fehlt"}</div>
                            <div className={cn(vv.card, "p-3 text-xs font-bold", applicantSigned ? "text-emerald-200" : "text-rose-200")}>Unterschrift: {applicantSigned ? "✓ vorhanden" : "✗ fehlt"}</div>
                            <div className={cn(vv.card, "p-3 text-xs font-bold", guardianSigned ? "text-emerald-200" : "text-rose-200")}>Vertretung: {minor ? (guardianSigned ? "✓ vorhanden" : "✗ fehlt") : "nicht erforderlich"}</div>
                            <div className={cn(vv.card, "p-3 text-xs font-bold text-white/55")}>Testphase: {row.trial_requested ? "JA" : "NEIN"}</div>
                          </div>
                        )}

                        {docs.length > 0 ? (
                          <div className="mt-3 space-y-1.5">
                            {docs.map((doc, idx) => (
                              <div key={`${doc.document_id}-${idx}`} className="rounded-xl border border-[#202731] bg-[#0a0d12] px-3 py-2 text-xs font-semibold text-white/45">
                                ✓ {doc.title} · Version {doc.version} · bestätigt {fmtDateTime(doc.accepted_at)}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {(row.signature_data_url || row.guardian_signature_data_url) ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {row.signature_data_url ? (
                              <div className="rounded-[18px] border border-[#252c36] bg-white p-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-600"><PenLine className="h-4 w-4" /> Antragsteller · {fmtDateTime(row.signed_at)}</div>
                                <img src={row.signature_data_url} alt={`Unterschrift ${row.full_name}`} className="h-24 w-full object-contain" />
                              </div>
                            ) : null}
                            {row.guardian_signature_data_url ? (
                              <div className="rounded-[18px] border border-[#252c36] bg-white p-3">
                                <div className="mb-2 text-xs font-black text-slate-600">Gesetzliche Vertretung: {row.guardian_full_name || "—"} · {fmtDateTime(row.guardian_signed_at)}</div>
                                <img src={row.guardian_signature_data_url} alt="Unterschrift gesetzliche Vertretung" className="h-24 w-full object-contain" />
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {row.trial_granted_at ? (
                          <div className="mt-3 text-xs font-black text-violet-200/75">
                            Testphase aktiviert am {fmtDateTime(row.trial_granted_at)}{row.trial_ends_on ? ` · gültig bis ${fmtDate(row.trial_ends_on)}` : ""}
                          </div>
                        ) : null}

                        {(documentsEnabled || row.documents_accepted_at) ? (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={archiveLoading === `${row.id}:submitted`}
                              onClick={() => void downloadArchive(row, "submitted")}
                              className={cn(vv.buttonSecondary, "h-9 text-xs")}
                            >
                              {archiveLoading === `${row.id}:submitted` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                              Eingereichten Antrag (PDF)
                            </Button>
                            {row.status === "approved" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={archiveLoading === `${row.id}:approved`}
                                onClick={() => void downloadArchive(row, "approved")}
                                className={cn(vv.buttonSecondary, "h-9 text-xs text-emerald-200")}
                              >
                                {archiveLoading === `${row.id}:approved` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Aufnahmebestätigung (PDF)
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    </div>
                  ) : null}

                  {row.status === "pending" ? (
                    <div className="mt-4 border-t border-[#202731] pt-4">
                      <div className="grid gap-3 xl:grid-cols-2">
                        <div>
                          <Label className={cn(vv.label, "mb-1.5 block")}>Spielerdatenbank-Verknüpfung</Label>
                          <Select
                            value={selectedId || "none"}
                            onValueChange={(value) =>
                              setSelectedSpieldatenbank((prev) => ({
                                ...prev,
                                [row.id]: value === "none" ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger className={vv.select}><SelectValue placeholder="Optional auswählen" /></SelectTrigger>
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

                        <div>
                          <Label className={cn(vv.label, "mb-1.5 block")}>Admin-Notiz</Label>
                          <Input
                            value={adminNotes[row.id] || ""}
                            onChange={(e) => setAdminNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder="z. B. im Verein besprochen"
                            className={vv.input}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving}
                          onClick={() => void reject(row)}
                          className={cn(vv.buttonDanger, "w-full sm:w-auto")}
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Ablehnen
                        </Button>

                        <Button
                          type="button"
                          disabled={saving || (documentsEnabled && (!row.signature_data_url || !row.signed_at || !row.documents_accepted_at || (isMinorBirthdate(row.birthdate) && (!row.guardian_full_name || !row.guardian_signature_data_url || !row.guardian_signed_at))))}
                          onClick={() => void approve(row)}
                          className={cn(vv.buttonPrimary, "w-full sm:w-auto")}
                          title={documentsEnabled && (!row.signature_data_url || !row.documents_accepted_at) ? "Digitale Unterlagen sind noch nicht vollständig." : undefined}
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Mitglied aufnehmen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-[#202731] pt-3 text-xs font-semibold text-white/30">
                      {row.status === "approved" && row.approved_at
                        ? `Aufgenommen am ${fmtDateTime(row.approved_at)}`
                        : row.status === "rejected" && row.rejected_at
                          ? `Abgelehnt am ${fmtDateTime(row.rejected_at)}`
                          : null}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
</div>
  )
}

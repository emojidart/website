"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  CheckCircle2,
  Euro,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
  Gift,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MembershipAccountingPanel } from "./abrechnung"
import { vv } from "../vereinsverwaltung-styles"

type BillingCycle = "monthly" | "semiannual" | "annual"
type PaymentMethod = "stripe" | "transfer" | "cash"
type MembershipStatus = "pending" | "active" | "paused" | "cancelled" | "expired"
type AdminMembershipView = "overview" | "paid" | "trials" | "manage"

type ClubPlayer = {
  id: string
  name: string
  email?: string | null
  is_active?: boolean | null
  club_left_at?: string | null
}

type MembershipModule = {
  id: string
  code: string
  name: string
  description: string | null
  monthly_price: number
  semiannual_price: number
  annual_price: number
  currency: string
  is_required_base: boolean
  is_active: boolean
  sort_order: number
}

type ModuleDependency = {
  module_id: string
  required_module_id: string
}

type MemberMembership = {
  id: string
  player_id: string
  billing_cycle: BillingCycle
  payment_method: PaymentMethod
  status: MembershipStatus
  starts_on: string
  ends_on: string | null
  note: string | null
  created_at: string
}

type MembershipModuleRow = {
  membership_id: string
  module_id: string
  monthly_price_snapshot: number
  semiannual_price_snapshot: number
  annual_price_snapshot: number
}


type MembershipChangeRequest = {
  id: string
  player_id: string
  current_membership_id: string | null
  billing_cycle: BillingCycle
  payment_method: PaymentMethod
  requested_status: "pending" | "approved" | "rejected" | "cancelled"
  request_type: "change" | "cancel"
  requested_end_on: string | null
  payment_status: "pending" | "paid"
  paid_at: string | null
  monthly_total: number
  semiannual_total: number
  annual_total: number
  starts_on: string | null
  note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

type MembershipChangeRequestModule = {
  request_id: string
  module_id: string
  monthly_price_snapshot: number
  semiannual_price_snapshot: number
  annual_price_snapshot: number
}

type MembershipTrial = {
  id: string
  player_id: string
  module_code: string
  starts_on: string
  ends_on: string
  status: "active" | "cancelled" | "expired"
  note: string | null
  created_by: string | null
  created_at: string
}

interface AdminMembershipManagementProps {
  user: User | null
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatEUR(value: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0))
}

function paymentLabel(method: PaymentMethod) {
  if (method === "stripe") return "Stripe"
  if (method === "transfer") return "Überweisung / Erlagschein"
  return "Bar im Verein"
}

function statusLabel(status: MembershipStatus) {
  switch (status) {
    case "active":
      return "Aktiv"
    case "pending":
      return "Ausständig"
    case "paused":
      return "Pausiert"
    case "cancelled":
      return "Gekündigt"
    case "expired":
      return "Abgelaufen"
  }
}

export function AdminMembershipManagement({ user }: AdminMembershipManagementProps) {
  const [activeView, setActiveView] = useState<AdminMembershipView>("overview")
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [modules, setModules] = useState<MembershipModule[]>([])
  const [dependencies, setDependencies] = useState<ModuleDependency[]>([])
  const [memberships, setMemberships] = useState<MemberMembership[]>([])
  const [membershipModuleRows, setMembershipModuleRows] = useState<MembershipModuleRow[]>([])
  const [changeRequests, setChangeRequests] = useState<MembershipChangeRequest[]>([])
  const [changeRequestModules, setChangeRequestModules] = useState<MembershipChangeRequestModule[]>([])
  const [trials, setTrials] = useState<MembershipTrial[]>([])
  const [reviewingRequestId, setReviewingRequestId] = useState<string>("")

  const [trialPreset, setTrialPreset] = useState<"edart" | "steeldart" | "both" | "full">("edart")
  const [trialStartsOn, setTrialStartsOn] = useState(todayISO())
  const [trialEndsOn, setTrialEndsOn] = useState("")
  const [trialNote, setTrialNote] = useState("")
  const [savingTrial, setSavingTrial] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [status, setStatus] = useState<MembershipStatus>("active")
  const [startsOn, setStartsOn] = useState(todayISO())
  const [endsOn, setEndsOn] = useState("")
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  useEffect(() => {
    if (user) void loadData()
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      // Alte Mitgliedschaftsdaten sofort aus dem UI entfernen.
      // So kann nach einem externen DB-Reset/Löschen kein alter "Aktiv"-Status
      // aus dem vorherigen React-State sichtbar bleiben.
      setMemberships([])
      setMembershipModuleRows([])
      setChangeRequests([])
      setChangeRequestModules([])
      setTrials([])

      const [
        { data: playerData, error: playerError },
        { data: moduleData, error: moduleError },
        { data: dependencyData, error: dependencyError },
        { data: membershipData, error: membershipError },
        { data: membershipModulesData, error: membershipModulesError },
        { data: changeRequestData, error: changeRequestError },
        { data: changeRequestModuleData, error: changeRequestModuleError },
        { data: trialData, error: trialError },
      ] = await Promise.all([
        supabase
          .from("club_players")
          .select("id,name,email,is_active,club_left_at")
          .order("name", { ascending: true }),

        supabase
          .from("membership_modules")
          .select("id,code,name,description,monthly_price,semiannual_price,annual_price,currency,is_required_base,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("membership_module_dependencies")
          .select("module_id,required_module_id"),

        supabase
          .from("member_memberships")
          .select("id,player_id,billing_cycle,payment_method,status,starts_on,ends_on,note,created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("member_membership_modules")
          .select("membership_id,module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot"),

        supabase
          .from("membership_change_requests")
          .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,request_type,requested_end_on,payment_status,paid_at,monthly_total,semiannual_total,annual_total,starts_on,note,reviewed_by,reviewed_at,created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("membership_change_request_modules")
          .select("request_id,module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot"),

        supabase
          .from("membership_trials")
          .select("id,player_id,module_code,starts_on,ends_on,status,note,created_by,created_at")
          .order("ends_on", { ascending: true }),
      ])

      if (playerError) throw playerError
      if (moduleError) throw moduleError
      if (dependencyError) throw dependencyError
      if (membershipError) throw membershipError
      if (membershipModulesError) throw membershipModulesError
      if (changeRequestError) throw changeRequestError
      if (changeRequestModuleError) throw changeRequestModuleError
      if (trialError) throw trialError

      const nextPlayers = ((playerData || []) as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email ?? null,
        is_active: p.is_active ?? true,
        club_left_at: p.club_left_at ?? null,
      })) as ClubPlayer[]

      const nextModules = ((moduleData || []) as any[]).map((m) => ({
        ...m,
        monthly_price: Number(m.monthly_price || 0),
        semiannual_price: Number(m.semiannual_price || 0),
        annual_price: Number(m.annual_price || 0),
        is_required_base: !!m.is_required_base,
        is_active: !!m.is_active,
        sort_order: Number(m.sort_order || 0),
      })) as MembershipModule[]

      const nextMemberships = (membershipData || []) as MemberMembership[]
      const nextMembershipModuleRows = ((membershipModulesData || []) as any[]).map((row) => ({
        ...row,
        monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
        semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
        annual_price_snapshot: Number(row.annual_price_snapshot || 0),
      })) as MembershipModuleRow[]

      setPlayers(nextPlayers)
      setModules(nextModules)
      setDependencies((dependencyData || []) as ModuleDependency[])
      setMemberships(nextMemberships)
      setMembershipModuleRows(nextMembershipModuleRows)

      setChangeRequests(
        ((changeRequestData || []) as any[]).map((row) => ({
          ...row,
          monthly_total: Number(row.monthly_total || 0),
          semiannual_total: Number(row.semiannual_total || 0),
          annual_total: Number(row.annual_total || 0),
        })) as MembershipChangeRequest[],
      )
      setChangeRequestModules(
        ((changeRequestModuleData || []) as any[]).map((row) => ({
          ...row,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })) as MembershipChangeRequestModule[],
      )

      setTrials((trialData || []) as MembershipTrial[])

      if (!selectedPlayerId && nextPlayers.length > 0) {
        const active = nextPlayers.find((p) => p.is_active !== false && !p.club_left_at)
        setSelectedPlayerId(active?.id || nextPlayers[0].id)
      } else if (selectedPlayerId) {
        // Wichtig bei extern gelöschten/resetten Mitgliedschaften:
        // Den Editor sofort aus den FRISCH geladenen DB-Daten synchronisieren.
        const freshMembership =
          nextMemberships.find(
            (m) =>
              m.player_id === selectedPlayerId &&
              (m.status === "active" || m.status === "pending" || m.status === "paused"),
          ) ||
          nextMemberships.find((m) => m.player_id === selectedPlayerId) ||
          null

        const baseIds = nextModules.filter((m) => m.is_required_base).map((m) => m.id)

        if (!freshMembership) {
          setBillingCycle("annual")
          setPaymentMethod("cash")
          setStatus("active")
          setStartsOn(todayISO())
          setEndsOn("")
          setSelectedModuleIds(new Set(baseIds))
        } else {
          setBillingCycle(freshMembership.billing_cycle)
          setPaymentMethod(freshMembership.payment_method)
          setStatus(freshMembership.status)
          setStartsOn(freshMembership.starts_on || todayISO())
          setEndsOn(freshMembership.ends_on || "")

          const freshModuleIds = nextMembershipModuleRows
            .filter((row) => row.membership_id === freshMembership.id)
            .map((row) => row.module_id)

          setSelectedModuleIds(new Set([...freshModuleIds, ...baseIds]))
        }
      }
    } catch (error: any) {
      console.error("membership management load error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Mitgliedschaften konnten nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players

    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(q) ||
        String(player.email || "").toLowerCase().includes(q),
    )
  }, [players, search])

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) || null,
    [players, selectedPlayerId],
  )

  const selectedMembership = useMemo(() => {
    if (!selectedPlayerId) return null

    // Neuester nicht gekündigter Datensatz hat Vorrang.
    return (
      memberships.find(
        (m) =>
          m.player_id === selectedPlayerId &&
          (m.status === "active" || m.status === "pending" || m.status === "paused"),
      ) ||
      memberships.find((m) => m.player_id === selectedPlayerId) ||
      null
    )
  }, [memberships, selectedPlayerId])

  useEffect(() => {
    if (!selectedPlayerId || modules.length === 0) return

    const baseIds = modules.filter((m) => m.is_required_base).map((m) => m.id)

    if (!selectedMembership) {
      setBillingCycle("annual")
      setPaymentMethod("cash")
      setStatus("active")
      setStartsOn(todayISO())
      setEndsOn("")
      setSelectedModuleIds(new Set(baseIds))
      return
    }

    setBillingCycle(selectedMembership.billing_cycle)
    setPaymentMethod(selectedMembership.payment_method)
    setStatus(selectedMembership.status)
    setStartsOn(selectedMembership.starts_on || todayISO())
    setEndsOn(selectedMembership.ends_on || "")

    const ids = membershipModuleRows
      .filter((row) => row.membership_id === selectedMembership.id)
      .map((row) => row.module_id)

    setSelectedModuleIds(new Set([...ids, ...baseIds]))
  }, [selectedPlayerId, selectedMembership?.id, modules, membershipModuleRows])

  const ensureDependencies = (ids: Set<string>) => {
    const next = new Set(ids)
    let changed = true

    while (changed) {
      changed = false

      for (const dep of dependencies) {
        if (next.has(dep.module_id) && !next.has(dep.required_module_id)) {
          next.add(dep.required_module_id)
          changed = true
        }
      }
    }

    for (const base of modules.filter((m) => m.is_required_base)) {
      next.add(base.id)
    }

    return next
  }

  const toggleModule = (module: MembershipModule, checked: boolean) => {
    setMessage(null)

    if (module.is_required_base && !checked) {
      setMessage({
        type: "info",
        text: "Die Grundmitgliedschaft ist verpflichtend und kann nicht abgewählt werden.",
      })
      return
    }

    const next = new Set(selectedModuleIds)

    if (checked) {
      next.add(module.id)
      setSelectedModuleIds(ensureDependencies(next))
      return
    }

    const dependentActiveModule = dependencies.find(
      (dep) => dep.required_module_id === module.id && next.has(dep.module_id),
    )

    if (dependentActiveModule) {
      const dependent = modules.find((m) => m.id === dependentActiveModule.module_id)
      setMessage({
        type: "info",
        text: `${module.name} kann nicht entfernt werden, solange „${dependent?.name || "ein abhängiges Modul"}“ aktiv ist.`,
      })
      return
    }

    next.delete(module.id)
    setSelectedModuleIds(ensureDependencies(next))
  }

  const selectedModules = useMemo(
    () => modules.filter((m) => selectedModuleIds.has(m.id)),
    [modules, selectedModuleIds],
  )

  const monthlyTotal = useMemo(
    () => selectedModules.reduce((sum, m) => sum + Number(m.monthly_price || 0), 0),
    [selectedModules],
  )

  const annualTotal = useMemo(
    () => selectedModules.reduce((sum, m) => sum + Number(m.annual_price || 0), 0),
    [selectedModules],
  )


  const hasChanges = useMemo(() => {
    if (!selectedPlayerId) return false
    if (!selectedMembership) return true

    if (selectedMembership.billing_cycle !== billingCycle) return true
    if (selectedMembership.payment_method !== paymentMethod) return true
    if (selectedMembership.status !== status) return true
    if ((selectedMembership.starts_on || "") !== (startsOn || "")) return true
    if ((selectedMembership.ends_on || "") !== (endsOn || "")) return true

    const savedModuleIds = membershipModuleRows
      .filter((row) => row.membership_id === selectedMembership.id)
      .map((row) => row.module_id)
      .sort()

    const formModuleIds = Array.from(selectedModuleIds).sort()

    if (savedModuleIds.length !== formModuleIds.length) return true

    for (let i = 0; i < savedModuleIds.length; i += 1) {
      if (savedModuleIds[i] !== formModuleIds[i]) return true
    }

    return false
  }, [
    selectedPlayerId,
    selectedMembership,
    billingCycle,
    paymentMethod,
    status,
    startsOn,
    endsOn,
    selectedModuleIds,
    membershipModuleRows,
  ])

  const handleBillingCycleChange = (value: BillingCycle) => {
    setBillingCycle(value)

    // EMD-Regel: Monatlich nur über Stripe.
    if (value === "monthly" && paymentMethod !== "stripe") {
      setPaymentMethod("stripe")
      setMessage({
        type: "info",
        text: "Bei monatlicher Zahlung wird automatisch Stripe als Zahlungsart verwendet.",
      })
    }
  }

  const handlePaymentMethodChange = (value: PaymentMethod) => {
    if (billingCycle === "monthly" && value !== "stripe") {
      setMessage({
        type: "info",
        text: "Überweisung und Barzahlung sind nur bei jährlicher Zahlung möglich.",
      })
      return
    }

    setPaymentMethod(value)
    setMessage(null)
  }

  const endActiveTrialsForPlayer = async (playerId: string) => {
    const { error } = await supabase
      .from("membership_trials")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", playerId)
      .eq("status", "active")

    if (error) throw error
  }

  const saveMembership = async () => {
    if (!user) {
      setMessage({ type: "error", text: "Nicht eingeloggt." })
      return
    }

    if (!selectedPlayerId) {
      setMessage({ type: "error", text: "Bitte ein Mitglied auswählen." })
      return
    }

    if (billingCycle === "monthly" && paymentMethod !== "stripe") {
      setMessage({
        type: "error",
        text: "Monatliche Zahlung ist nur über Stripe möglich.",
      })
      return
    }

    if (selectedModules.length === 0) {
      setMessage({ type: "error", text: "Es ist kein Modul ausgewählt." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const membershipPayload = {
        player_id: selectedPlayerId,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        status,
        starts_on: startsOn || todayISO(),
        ends_on: endsOn || null,
        updated_at: new Date().toISOString(),
      }

      let membershipId = selectedMembership?.id || ""

      if (selectedMembership) {
        const { error } = await supabase
          .from("member_memberships")
          .update(membershipPayload)
          .eq("id", selectedMembership.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("member_memberships")
          .insert({
            ...membershipPayload,
            note: "Über Admin-Mitgliedschaftsverwaltung angelegt",
          })
          .select("id")
          .single()

        if (error) throw error
        membershipId = data.id
      }

      // Module bewusst komplett neu schreiben:
      // So entspricht die DB exakt der aktuellen Auswahl.
      const { error: deleteError } = await supabase
        .from("member_membership_modules")
        .delete()
        .eq("membership_id", membershipId)

      if (deleteError) throw deleteError

      const rows = selectedModules.map((module) => ({
        membership_id: membershipId,
        module_id: module.id,
        monthly_price_snapshot: Number(module.monthly_price),
        semiannual_price_snapshot: Number(module.semiannual_price),
        annual_price_snapshot: Number(module.annual_price),
      }))

      const { error: insertError } = await supabase
        .from("member_membership_modules")
        .insert(rows)

      if (insertError) throw insertError

      if (status === "active") {
        await endActiveTrialsForPlayer(selectedPlayerId)
      }

      setMessage({
        type: "success",
        text: `Mitgliedschaft für ${selectedPlayer?.name || "das Mitglied"} wurde gespeichert.`,
      })

      await loadData()
    } catch (error: any) {
      console.error("membership save error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Mitgliedschaft konnte nicht gespeichert werden.",
      })
    } finally {
      setSaving(false)
    }
  }


  const pendingChangeRequests = useMemo(
    () => changeRequests.filter((request) => request.requested_status === "pending"),
    [changeRequests],
  )


  const getCurrentMembershipForRequest = (request: MembershipChangeRequest) => {
    if (!request.current_membership_id) return null
    return memberships.find((membership) => membership.id === request.current_membership_id) || null
  }

  const getRequestChangeSummary = (request: MembershipChangeRequest) => {
    const currentMembership = getCurrentMembershipForRequest(request)

    const currentModuleIds = new Set(
      membershipModuleRows
        .filter((row) => row.membership_id === request.current_membership_id)
        .map((row) => row.module_id),
    )

    const requestedModuleIds = new Set(
      changeRequestModules
        .filter((row) => row.request_id === request.id)
        .map((row) => row.module_id),
    )

    const addedModules = modules.filter(
      (module) => requestedModuleIds.has(module.id) && !currentModuleIds.has(module.id),
    )

    const removedModules = modules.filter(
      (module) => currentModuleIds.has(module.id) && !requestedModuleIds.has(module.id),
    )

    const billingChanged =
      !!currentMembership &&
      currentMembership.billing_cycle !== request.billing_cycle

    const paymentChanged =
      !!currentMembership &&
      currentMembership.payment_method !== request.payment_method

    return {
      currentMembership,
      addedModules,
      removedModules,
      billingChanged,
      paymentChanged,
    }
  }

  const approveChangeRequest = async (request: MembershipChangeRequest) => {
    if (!user) return

    if (request.request_type === "cancel") return

    if (request.payment_method === "stripe") {
      setMessage({
        type: "info",
        text: request.payment_status === "paid"
          ? "Diese Stripe-Zahlung wurde bereits von Stripe verarbeitet. Bitte die Ansicht neu laden."
          : "Stripe-Zahlungen werden automatisch verarbeitet und dürfen nicht manuell bestätigt werden.",
      })
      return
    }

    try {
      setReviewingRequestId(request.id)
      setMessage(null)

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich neu an.")

      const response = await fetch("/api/stripe/approve-manual-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ requestId: request.id }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "Die Zahlung konnte nicht bestätigt werden.")
      }

      await loadData()

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text: `Zahlung von ${player?.name || "dem Mitglied"} wurde bestätigt, verbucht und als Buchhaltungsbeleg erfasst.`,
      })
    } catch (error: any) {
      console.error("approve membership request error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Mitgliedschaftsanfrage konnte nicht bestätigt werden.",
      })
    } finally {
      setReviewingRequestId("")
    }
  }

  const approveCancellationRequest = async (request: MembershipChangeRequest) => {
    if (!user) return

    try {
      setReviewingRequestId(request.id)
      setMessage(null)

      if (!request.current_membership_id) {
        throw new Error("Zu dieser Kündigungsanfrage wurde keine aktive Mitgliedschaft gefunden.")
      }

      if (!request.requested_end_on) {
        throw new Error("Bei dieser Kündigungsanfrage fehlt das Kündigungsdatum.")
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich neu an.")
      }

      const response = await fetch("/api/stripe/cancel-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ requestId: request.id }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "Die Kündigung konnte nicht verarbeitet werden.")
      }

      await loadData()

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text: `Kündigung von ${player?.name || "dem Mitglied"} zum ${new Date(
          `${request.requested_end_on}T00:00:00`,
        ).toLocaleDateString("de-AT")} wurde bestätigt.`,
      })
    } catch (error: any) {
      console.error("approve membership cancellation error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Kündigungsanfrage konnte nicht bestätigt werden.",
      })
    } finally {
      setReviewingRequestId("")
    }
  }

  const rejectChangeRequest = async (request: MembershipChangeRequest) => {
    if (!user) return

    try {
      setReviewingRequestId(request.id)
      setMessage(null)

      const { error } = await supabase
        .from("membership_change_requests")
        .update({
          requested_status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (error) throw error

      await loadData()

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text: `Mitgliedschaftsanfrage von ${player?.name || "dem Mitglied"} wurde abgelehnt.`,
      })
    } catch (error: any) {
      console.error("reject membership request error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Mitgliedschaftsanfrage konnte nicht abgelehnt werden.",
      })
    } finally {
      setReviewingRequestId("")
    }
  }

  const activeTrialsForPlayer = (playerId: string) => {
    const today = todayISO()

    return trials.filter(
      (trial) =>
        trial.player_id === playerId &&
        trial.status === "active" &&
        trial.starts_on <= today &&
        trial.ends_on >= today,
    )
  }

  const trialPresetCodes = (preset: "edart" | "steeldart" | "both" | "full") => {
    const baseCodes = modules
      .filter((module) => module.is_active && module.is_required_base)
      .map((module) => module.code)

    if (preset === "edart") return [...baseCodes, "premium_app", "edart_league"]
    if (preset === "steeldart") return [...baseCodes, "premium_app", "steeldart_league"]
    if (preset === "both") {
      return [...baseCodes, "premium_app", "edart_league", "steeldart_league"]
    }

    return modules
      .filter((module) => module.is_active)
      .map((module) => module.code)
  }

  const createTrialPackage = async () => {
    if (!selectedPlayerId) {
      setMessage({ type: "error", text: "Bitte zuerst ein Mitglied auswählen." })
      return
    }

    if (!trialEndsOn) {
      setMessage({ type: "error", text: "Bitte ein Enddatum für die Testphase wählen." })
      return
    }

    if (trialEndsOn < trialStartsOn) {
      setMessage({ type: "error", text: "Das Enddatum darf nicht vor dem Startdatum liegen." })
      return
    }

    try {
      setSavingTrial(true)
      setMessage(null)

      const today = todayISO()
      const hasActivePaidMembership = memberships.some(
        (membership) =>
          membership.player_id === selectedPlayerId &&
          membership.status === "active" &&
          membership.starts_on <= today &&
          (!membership.ends_on || membership.ends_on >= today),
      )

      if (hasActivePaidMembership) {
        setMessage({
          type: "info",
          text: "Für dieses Mitglied ist bereits eine reguläre Mitgliedschaft aktiv. Eine zusätzliche Testphase wird nicht angelegt.",
        })
        return
      }

      const codes = Array.from(new Set(trialPresetCodes(trialPreset)))

      // Vorhandene aktive Tests zuerst beenden. Dadurch gibt es je Mitglied
      // nur ein aktuelles Testpaket und keine doppelten Freischaltungen.
      const { error: cancelExistingError } = await supabase
        .from("membership_trials")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("player_id", selectedPlayerId)
        .eq("status", "active")

      if (cancelExistingError) throw cancelExistingError

      const rows = codes.map((code) => ({
        player_id: selectedPlayerId,
        module_code: code,
        starts_on: trialStartsOn,
        ends_on: trialEndsOn,
        status: "active",
        note: trialNote.trim() || null,
        created_by: user?.id || null,
      }))

      const { error } = await supabase.from("membership_trials").insert(rows)
      if (error) throw error

      await loadData()

      setMessage({
        type: "success",
        text: `Testpaket für ${selectedPlayer?.name || "das Mitglied"} wurde bis ${new Date(`${trialEndsOn}T00:00:00`).toLocaleDateString("de-AT")} freigeschaltet.`,
      })
      setTrialNote("")
    } catch (error: any) {
      console.error("create trial package error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Das Testpaket konnte nicht angelegt werden.",
      })
    } finally {
      setSavingTrial(false)
    }
  }

  const cancelTrial = async (trialId: string) => {
    try {
      setSavingTrial(true)
      setMessage(null)

      const { error } = await supabase
        .from("membership_trials")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", trialId)

      if (error) throw error

      await loadData()
      setMessage({ type: "success", text: "Die Testfreischaltung wurde beendet." })
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Die Testfreischaltung konnte nicht beendet werden.",
      })
    } finally {
      setSavingTrial(false)
    }
  }

  // ECHTE Zahlungseingänge:
  // Nur Vorgänge zählen, die tatsächlich als bezahlt markiert wurden und ein paid_at haben.
  // Aktive Mitgliedschaften allein sind KEIN Zahlungsnachweis.
  const paidPaymentTransactions = useMemo(
    () =>
      changeRequests
        .filter(
          (request) =>
            request.request_type !== "cancel" &&
            request.payment_status === "paid" &&
            !!request.paid_at,
        )
        .map((request) => {
          const player = players.find((item) => item.id === request.player_id) || null
          const rows = changeRequestModules.filter((row) => row.request_id === request.id)
          const transactionModules = rows
            .map((row) => {
              const module = modules.find((item) => item.id === row.module_id) || null
              const paidAmount =
                request.billing_cycle === "monthly"
                  ? Number(row.monthly_price_snapshot || 0)
                  : Number(row.annual_price_snapshot || 0)

              return { row, module, paidAmount }
            })
            .filter((entry) => !!entry.module)

          const paidAmount =
            request.billing_cycle === "monthly"
              ? Number(request.monthly_total || 0)
              : Number(request.annual_total || 0)

          return {
            request,
            player,
            rows,
            modules: transactionModules,
            paidAmount,
          }
        })
        .sort(
          (a, b) =>
            new Date(b.request.paid_at || b.request.created_at).getTime() -
            new Date(a.request.paid_at || a.request.created_at).getTime(),
        ),
    [changeRequests, changeRequestModules, players, modules],
  )

  const paidPlayerCount = useMemo(
    () => new Set(paidPaymentTransactions.map((item) => item.request.player_id)).size,
    [paidPaymentTransactions],
  )

  const actuallyPaidMonthlyTotal = useMemo(
    () =>
      paidPaymentTransactions
        .filter((item) => item.request.billing_cycle === "monthly")
        .reduce((sum, item) => sum + item.paidAmount, 0),
    [paidPaymentTransactions],
  )

  const actuallyPaidAnnualTotal = useMemo(
    () =>
      paidPaymentTransactions
        .filter((item) => item.request.billing_cycle === "annual")
        .reduce((sum, item) => sum + item.paidAmount, 0),
    [paidPaymentTransactions],
  )

  const actuallyPaidTotal = actuallyPaidMonthlyTotal + actuallyPaidAnnualTotal

  const paidModulePaymentSummary = useMemo(
    () =>
      modules
        .map((module) => {
          let paymentCount = 0
          let paidTotal = 0

          for (const transaction of paidPaymentTransactions) {
            const entry = transaction.modules.find((item) => item.module?.id === module.id)
            if (!entry) continue

            paymentCount += 1
            paidTotal += entry.paidAmount
          }

          return { module, paymentCount, paidTotal }
        })
        .filter((item) => item.paymentCount > 0),
    [modules, paidPaymentTransactions],
  )

  const activePaidMemberships = useMemo(() => {
    const today = todayISO()

    return memberships.filter(
      (membership) =>
        membership.status === "active" &&
        membership.starts_on <= today &&
        (!membership.ends_on || membership.ends_on >= today),
    )
  }, [memberships])

  const paidMembershipSummaries = useMemo(
    () =>
      activePaidMemberships
        .map((membership) => {
          const player = players.find((item) => item.id === membership.player_id) || null
          const rows = membershipModuleRows.filter(
            (row) => row.membership_id === membership.id,
          )
          const membershipModules = rows
            .map((row) => modules.find((module) => module.id === row.module_id))
            .filter((module): module is MembershipModule => !!module)
          const monthlyAmount = rows.reduce(
            (sum, row) => sum + Number(row.monthly_price_snapshot || 0),
            0,
          )
          const annualAmount = rows.reduce(
            (sum, row) => sum + Number(row.annual_price_snapshot || 0),
            0,
          )

          return {
            membership,
            player,
            rows,
            modules: membershipModules,
            monthlyAmount,
            annualAmount,
            billedAmount:
              membership.billing_cycle === "monthly" ? monthlyAmount : annualAmount,
          }
        })
        .filter((summary) => summary.rows.length > 0)
        .sort((a, b) => (a.player?.name || "").localeCompare(b.player?.name || "", "de")),
    [activePaidMemberships, players, membershipModuleRows, modules],
  )

  const activeTrialGroups = useMemo(() => {
    const today = todayISO()
    const grouped = new Map<string, MembershipTrial[]>()

    for (const trial of trials) {
      if (
        trial.status !== "active" ||
        trial.starts_on > today ||
        trial.ends_on < today
      ) {
        continue
      }

      const current = grouped.get(trial.player_id) || []
      current.push(trial)
      grouped.set(trial.player_id, current)
    }

    return Array.from(grouped.entries())
      .map(([playerId, playerTrials]) => ({
        playerId,
        player: players.find((item) => item.id === playerId) || null,
        trials: playerTrials.sort((a, b) => a.module_code.localeCompare(b.module_code)),
        startsOn: playerTrials.reduce(
          (earliest, trial) => (!earliest || trial.starts_on < earliest ? trial.starts_on : earliest),
          "",
        ),
        endsOn: playerTrials.reduce(
          (latest, trial) => (!latest || trial.ends_on > latest ? trial.ends_on : latest),
          "",
        ),
      }))
      .sort((a, b) => (a.player?.name || "").localeCompare(b.player?.name || "", "de"))
  }, [trials, players])

  const paidModuleCodesByPlayer = useMemo(() => {
    const result = new Map<string, Set<string>>()

    for (const summary of paidMembershipSummaries) {
      const paidCodes = result.get(summary.membership.player_id) || new Set<string>()
      for (const module of summary.modules) paidCodes.add(module.code)
      result.set(summary.membership.player_id, paidCodes)
    }

    return result
  }, [paidMembershipSummaries])

  const paidAccessSummaries = useMemo(
    () =>
      paidMembershipSummaries.map((summary) => {
        const paidModuleCodes =
          paidModuleCodesByPlayer.get(summary.membership.player_id) || new Set<string>()
        const trialGroup = activeTrialGroups.find(
          (group) => group.playerId === summary.membership.player_id,
        )
        const trialOnlyModules = (trialGroup?.trials || [])
          .map((trial) => ({
            trial,
            module: modules.find((module) => module.code === trial.module_code) || null,
          }))
          .filter(({ trial }) => !paidModuleCodes.has(trial.module_code))

        return {
          ...summary,
          trialOnlyModules,
        }
      }),
    [paidMembershipSummaries, activeTrialGroups, modules, paidModuleCodesByPlayer],
  )

  const activeTrialOnlyGroups = useMemo(
    () =>
      activeTrialGroups
        .map((group) => {
          const paidModuleCodes = paidModuleCodesByPlayer.get(group.playerId) || new Set<string>()
          const trialOnlyEntries = group.trials.filter(
            (trial) => !paidModuleCodes.has(trial.module_code),
          )

          return {
            ...group,
            trials: trialOnlyEntries,
            startsOn: trialOnlyEntries.reduce(
              (earliest, trial) =>
                !earliest || trial.starts_on < earliest ? trial.starts_on : earliest,
              "",
            ),
            endsOn: trialOnlyEntries.reduce(
              (latest, trial) => !latest || trial.ends_on > latest ? trial.ends_on : latest,
              "",
            ),
          }
        })
        .filter((group) => group.trials.length > 0),
    [activeTrialGroups, paidModuleCodesByPlayer],
  )

  const moduleBillingSummary = useMemo(
    () =>
      modules
        .map((module) => {
          let totalCount = 0
          let monthlyCount = 0
          let annualCount = 0
          let monthlyRevenue = 0
          let annualRevenue = 0

          for (const summary of paidMembershipSummaries) {
            const row = summary.rows.find((item) => item.module_id === module.id)
            if (!row) continue

            totalCount += 1
            if (summary.membership.billing_cycle === "monthly") {
              monthlyCount += 1
              monthlyRevenue += Number(row.monthly_price_snapshot || 0)
            } else {
              annualCount += 1
              annualRevenue += Number(row.annual_price_snapshot || 0)
            }
          }

          return {
            module,
            totalCount,
            monthlyCount,
            annualCount,
            monthlyRevenue,
            annualRevenue,
          }
        })
        .filter((item) => item.totalCount > 0),
    [modules, paidMembershipSummaries],
  )

  const monthlyBillingTotal = paidMembershipSummaries
    .filter((item) => item.membership.billing_cycle === "monthly")
    .reduce((sum, item) => sum + item.monthlyAmount, 0)

  const annualBillingTotal = paidMembershipSummaries
    .filter((item) => item.membership.billing_cycle === "annual")
    .reduce((sum, item) => sum + item.annualAmount, 0)

  const projectedAnnualTotal = annualBillingTotal + monthlyBillingTotal * 12
  const activeMembershipsWithoutPaidModules = activePaidMemberships.filter(
    (membership) =>
      !membershipModuleRows.some((row) => row.membership_id === membership.id),
  )
  return (
    <div className="w-full space-y-5 text-white">
      <section className={cn(vv.surfaceLg, "overflow-hidden")}>
                <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/100/10">
              <WalletCards className="h-5 w-5 text-orange-300" />
            </div>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/50">Vereinszugänge</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Mitgliedschaften</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
                Pakete, Zahlungsrhythmus und Zugangs-Module der Vereinsmitglieder verwalten.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData()}
            disabled={loading}
            className={vv.buttonSecondary}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Neu laden
          </Button>
        </div>
      </section>

      {message ? (
        <div
          className={cn(
            "rounded-[18px] border px-4 py-3 text-sm font-bold",
            message.type === "success" && "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
            message.type === "error" && "border-rose-300/20 bg-rose-500/10 text-rose-100",
            message.type === "info" && "border-sky-300/20 bg-sky-500/10 text-sky-100",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-[#232932] bg-[#080b0f] p-1.5 lg:grid-cols-4">
        {([
          ["overview", "Übersicht"],
          ["paid", "Zahlungen"],
          ["trials", `Test (${activeTrialOnlyGroups.length})`],
          ["manage", "Vorgänge"],
        ] as Array<[AdminMembershipView, string]>).map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-black transition",
              activeView === view
                ? "border-orange-300/20 bg-orange-500/100/10 text-orange-100"
                : "border-[#242b35] bg-[#0e1218] text-white/48 hover:border-[#343d49] hover:bg-[#121820] hover:text-white/78",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeView === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-[22px] border border-[#252c36] bg-[#10141b]">
              <CardContent className="p-5">
                <div className="text-sm font-bold text-emerald-200/70">Mitglieder mit echter Zahlung</div>
                <div className="mt-1 text-3xl font-black text-emerald-200">{paidPlayerCount}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border border-[#252c36] bg-[#10141b]">
              <CardContent className="p-5">
                <div className="text-sm font-bold text-violet-200/70">Testmitglieder</div>
                <div className="mt-1 text-3xl font-black text-violet-200">
                  {activeTrialOnlyGroups.length}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border border-[#252c36] bg-[#10141b]">
              <CardContent className="p-5">
                <div className="text-sm font-bold text-sky-200/70">Monatlich tatsächlich bezahlt</div>
                <div className="mt-1 text-2xl font-black text-sky-200">
                  {formatEUR(actuallyPaidMonthlyTotal)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border border-[#252c36] bg-[#10141b]">
              <CardContent className="p-5">
                <div className="text-sm font-bold text-orange-200/70">Jährlich tatsächlich bezahlt</div>
                <div className="mt-1 text-2xl font-black text-orange-200">
                  {formatEUR(actuallyPaidAnnualTotal)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border border-[#252c36] bg-[#10141b]">
              <CardContent className="p-5">
                <div className="text-sm font-bold text-gray-300">Tatsächlich eingegangen</div>
                <div className="mt-1 text-2xl font-black">{formatEUR(actuallyPaidTotal)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-[22px] border border-[#252c36] bg-[#10141b]">
            <CardHeader className="border-b border-[#202731]">
              <CardTitle className="text-white">Tatsächlich bezahlte Module</CardTitle>
              <CardDescription className="text-white/42">
                Ausschließlich bestätigte Zahlungseingänge mit Zahlungsdatum. Keine Hochrechnung und keine bloß aktiven Mitgliedschaften.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {paidModulePaymentSummary.length === 0 ? (
                <div className="p-6 text-sm font-semibold text-white/32">
                  Noch keine bestätigten Zahlungseingänge vorhanden.
                </div>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-[#0d1117] text-xs uppercase tracking-wide text-white/32">
                      <tr>
                        <th className="px-5 py-3">Modul</th>
                        <th className="px-4 py-3 text-center">Bezahlvorgänge</th>
                        <th className="px-5 py-3 text-right">Tatsächlich bezahlt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202731]">
                      {paidModulePaymentSummary.map((item) => (
                        <tr key={item.module.id}>
                          <td className="px-5 py-4 font-black text-white">{item.module.name}</td>
                          <td className="px-4 py-4 text-center">
                            <Badge variant="outline" className="rounded-full font-black">
                              {item.paymentCount}×
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right font-black text-white">
                            {formatEUR(item.paidTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setActiveView("paid")}
              className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-5 text-left transition hover:border-emerald-300/20 hover:bg-[#121821]"
            >
              <div className="text-sm font-black text-emerald-200">Bezahlte Module öffnen</div>
              <div className="mt-1 text-sm font-semibold text-emerald-200/70">
                Exakt verrechnete Module, Preise und Zahlungsarten.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("trials")}
              className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-5 text-left transition hover:border-violet-300/20 hover:bg-[#121821]"
            >
              <div className="text-sm font-black text-violet-200">Testzugänge öffnen</div>
              <div className="mt-1 text-sm font-semibold text-violet-200/70">
                Alle kostenlosen Freischaltungen und Laufzeiten.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("manage")}
              className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-5 text-left transition hover:border-orange-300/20 hover:bg-[#121821]"
            >
              <div className="text-sm font-black text-orange-200">Vorgänge öffnen</div>
              <div className="mt-1 text-sm font-semibold text-orange-200/70">
                Änderungen, Kündigungen und Zahlungsfreigaben prüfen.
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {activeView === "paid" ? (
        <MembershipAccountingPanel user={user} />
      ) : null}

      {activeView === "trials" ? (
        <Card className="overflow-hidden rounded-2xl border border-violet-300/15 bg-[#10141b] shadow-sm">
          <CardHeader className="border-b border-[#202731] bg-[#0d1117]">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-violet-300" />
              Aktive Testfreischaltungen
            </CardTitle>
            <CardDescription className="text-white/42">
              Diese Zugänge sind kostenlos und werden in keiner Abrechnung berücksichtigt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {activeTrialOnlyGroups.length === 0 ? (
              <div className="rounded-xl border border-[#252c36] bg-[#0d1117] p-5 text-sm font-semibold text-white/32">
                Keine aktiven Testfreischaltungen vorhanden.
              </div>
            ) : (
              activeTrialOnlyGroups.map((group) => (
                <div key={group.playerId} className="rounded-2xl border border-violet-300/10 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black text-white">
                          {group.player?.name || "Unbekanntes Mitglied"}
                        </div>
                        <Badge className="rounded-full bg-violet-500/10 text-violet-200 hover:bg-violet-500/10">
                          TEST · KOSTENLOS
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.trials.map((trial) => {
                          const module = modules.find((item) => item.code === trial.module_code)
                          return (
                            <Badge key={trial.id} variant="outline" className="rounded-full border-violet-300/15 bg-violet-500/10 text-violet-200">
                              {module?.name || trial.module_code}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                    <div className="shrink-0 space-y-2 lg:text-right">
                      <div className="text-sm font-bold text-violet-200">
                        <div>{new Date(`${group.startsOn}T00:00:00`).toLocaleDateString("de-AT")}</div>
                        <div>bis {new Date(`${group.endsOn}T00:00:00`).toLocaleDateString("de-AT")}</div>
                        <div className="mt-1 text-xs font-semibold text-violet-300">{group.trials.length} Module</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={async () => {
                          try {
                            setSaving(true)
                            setMessage(null)
                            await endActiveTrialsForPlayer(group.playerId)
                            await loadData()
                            setMessage({
                              type: "success",
                              text: `Testphase für ${group.player?.name || "das Mitglied"} wurde beendet.`,
                            })
                          } catch (error: any) {
                            setMessage({
                              type: "error",
                              text: error?.message || "Testphase konnte nicht beendet werden.",
                            })
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className={cn(vv.buttonDanger, "h-9 w-full text-xs lg:w-auto")}
                      >
                        Testphase beenden
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeView === "manage" ? (
        <>
      {pendingChangeRequests.length > 0 ? (
        <Card className="overflow-hidden rounded-2xl border border-orange-300/15 bg-[#10141b] shadow-sm">
          <CardHeader className="border-b border-[#202731] bg-[#0d1117]">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-300" />
              Offene Mitgliedschaftsanfragen
            </CardTitle>
            <CardDescription className="text-white/42">
              Manuelle Zahlungen erst nach tatsächlichem Zahlungseingang bestätigen. Stripe-Vorgänge werden ausschließlich automatisch verarbeitet.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 p-4 sm:p-5">
            {pendingChangeRequests.map((request) => {
              const player = players.find((p) => p.id === request.player_id)
              const requestRows = changeRequestModules.filter(
                (row) => row.request_id === request.id,
              )
              const isReviewing = reviewingRequestId === request.id

              return (
                <div
                  key={request.id}
                  className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-white">
                          {player?.name || "Unbekanntes Mitglied"}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            request.request_type === "cancel"
                              ? "rounded-full border-rose-300/15 bg-rose-500/10 text-rose-200"
                              : "rounded-full border-orange-300/15 bg-orange-500/10 text-orange-200/70"
                          }
                        >
                          {request.request_type === "cancel" ? "KÜNDIGUNG" : "In Prüfung"}
                        </Badge>
                      </div>

                      {request.request_type === "cancel" ? (
                        <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-500/10 p-4">
                          <div className="text-xs font-black uppercase tracking-wide text-rose-200">
                            Komplette Mitgliedschaft kündigen
                          </div>
                          <div className="mt-2 text-lg font-black text-rose-100">
                            Kündigung zum{" "}
                            {request.requested_end_on
                              ? new Date(`${request.requested_end_on}T00:00:00`).toLocaleDateString("de-AT")
                              : "—"}
                          </div>
                          {request.note ? (
                            <div className="mt-2 text-sm font-semibold text-rose-100">
                              Grund / Notiz: {request.note}
                            </div>
                          ) : null}
                          <div className="mt-2 text-xs font-semibold text-rose-200">
                            Bei Stripe wird das bestehende Abo auf dieses Kündigungsdatum beendet.
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full">
                              {request.billing_cycle === "monthly" ? "Monatlich" : "Jährlich"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {paymentLabel(request.payment_method)}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {requestRows.length} Module
                            </Badge>
                            <Badge variant="outline" className="rounded-full font-black">
                              {request.billing_cycle === "monthly"
                                ? `${formatEUR(request.monthly_total)} / Monat`
                                : `${formatEUR(request.annual_total)} / Jahr`}
                            </Badge>
                          </div>

                          {(() => {
                            const changes = getRequestChangeSummary(request)

                            return (
                              <div className="mt-4 space-y-3">
                                <div className="text-xs font-black uppercase tracking-wide text-white/32">
                                  Gewünschte Änderung
                                </div>

                                {changes.addedModules.length === 0 &&
                                changes.removedModules.length === 0 &&
                                !changes.billingChanged &&
                                !changes.paymentChanged ? (
                                  <div className="rounded-xl border border-[#252c36] bg-[#0d1117] px-3 py-2 text-sm font-bold text-white/45">
                                    Keine erkennbare Änderung zum aktuellen Paket
                                  </div>
                                ) : null}

                                {changes.addedModules.map((module) => (
                                  <div
                                    key={`add-${module.id}`}
                                    className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-200"
                                  >
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    AKTIVIEREN: {module.name}
                                  </div>
                                ))}

                                {changes.removedModules.map((module) => (
                                  <div
                                    key={`remove-${module.id}`}
                                    className="flex items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-sm font-black text-rose-100"
                                  >
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    DEAKTIVIEREN: {module.name}
                                  </div>
                                ))}

                                {changes.billingChanged && changes.currentMembership ? (
                                  <div className="rounded-xl border border-sky-300/15 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200">
                                    Abrechnung:{" "}
                                    <span className="line-through opacity-70">
                                      {changes.currentMembership.billing_cycle === "monthly"
                                        ? "Monatlich"
                                        : "Jährlich"}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-black">
                                      {request.billing_cycle === "monthly"
                                        ? "Monatlich"
                                        : "Jährlich"}
                                    </span>
                                  </div>
                                ) : null}

                                {changes.paymentChanged && changes.currentMembership ? (
                                  <div className="rounded-xl border border-sky-300/15 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200">
                                    Zahlungsart:{" "}
                                    <span className="line-through opacity-70">
                                      {paymentLabel(changes.currentMembership.payment_method)}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-black">
                                      {paymentLabel(request.payment_method)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })()}
                        </>
                      )}

                      <div className="mt-3 text-xs font-semibold text-white/25">
                        Anfrage vom{" "}
                        {new Date(request.created_at).toLocaleDateString("de-AT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2">
                      {request.request_type !== "cancel" && request.payment_method === "stripe" ? (
                        <div
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-black",
                            request.payment_status === "paid"
                              ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                              : "border-sky-300/20 bg-sky-500/10 text-sky-100",
                          )}
                        >
                          {request.payment_status === "paid"
                            ? "Stripe bezahlt · automatische Verarbeitung abgeschlossen/gestartet"
                            : "Stripe · automatische Verarbeitung · Zahlung noch offen"}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void rejectChangeRequest(request)}
                          disabled={
                            !!reviewingRequestId ||
                            (request.request_type !== "cancel" &&
                              request.payment_method === "stripe" &&
                              request.payment_status !== "paid")
                          }
                          className="rounded-xl border-rose-300/15 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                        >
                          {isReviewing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Ablehnen
                        </Button>

                        <Button
                          type="button"
                          onClick={() =>
                            request.request_type === "cancel"
                              ? void approveCancellationRequest(request)
                              : void approveChangeRequest(request)
                          }
                          disabled={
                            !!reviewingRequestId ||
                            (request.request_type !== "cancel" &&
                              request.payment_method === "stripe" &&
                              request.payment_status !== "paid")
                          }
                          className={vv.buttonPrimary}
                        >
                          {isReviewing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {request.request_type === "cancel"
                            ? "Kündigung bestätigen"
                            : request.payment_method === "stripe" &&
                                request.payment_status !== "paid"
                              ? "Wartet auf Stripe"
                              : "Bestätigen"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : (
        <section className={cn(vv.surface, "p-5")}>
          <div className="flex items-center gap-3 text-sm font-semibold text-white/42">
            <CheckCircle2 className="h-5 w-5 flex-none text-emerald-300" />
            Aktuell sind keine offenen Mitgliedschaftsänderungen oder Kündigungen zu bearbeiten.
          </div>
        </section>
      )}

      <section className={cn(vv.surface, "mt-4 p-4 sm:p-5")}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-500/10">
            <ShieldCheck className="h-4 w-4 text-sky-200" />
          </div>
          <div>
            <div className="text-sm font-black text-white">Automatische Mitgliedschaftssteuerung aktiv</div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
              Mitgliedschaften, Pakete, Module, Stripe-Zahlungsart und Testfreischaltungen werden nicht manuell durch Admins vergeben.
              Sie entstehen ausschließlich über den vorgesehenen Buchungs-, Zahlungs- oder Beitrittsprozess.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cn(vv.inset, "px-3.5 py-3")}>
            <div className={vv.label}>Stripe</div>
            <div className="mt-1 text-xs font-bold text-white/60">Nur automatisch über Checkout / Verarbeitung</div>
          </div>
          <div className={cn(vv.inset, "px-3.5 py-3")}>
            <div className={vv.label}>Module</div>
            <div className="mt-1 text-xs font-bold text-white/60">Nur aus gebuchtem Paket / genehmigter Änderung</div>
          </div>
          <div className={cn(vv.inset, "px-3.5 py-3")}>
            <div className={vv.label}>Testphase</div>
            <div className="mt-1 text-xs font-bold text-white/60">Automatisch aus dem Beitrittsprozess</div>
          </div>
          <div className={cn(vv.inset, "px-3.5 py-3")}>
            <div className={vv.label}>Admin-Aktion</div>
            <div className="mt-1 text-xs font-bold text-white/60">Nur prüfen, bestätigen, ablehnen oder kündigen</div>
          </div>
        </div>
      </section>
        </>
      ) : null}
    </div>
  )
}

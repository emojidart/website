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
  CreditCard,
  Euro,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
  Gift,
  CalendarDays,
  ListChecks,
} from "lucide-react"
import { cn } from "@/lib/utils"

type BillingCycle = "monthly" | "annual"
type PaymentMethod = "stripe" | "transfer" | "cash"
type MembershipStatus = "pending" | "active" | "paused" | "cancelled" | "expired"

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
  monthly_total: number
  annual_total: number
  starts_on: string | null
  note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  payment_status: "pending" | "paid"
  paid_at: string | null
  paid_by: string | null
  created_at: string
}

type MembershipChangeRequestModule = {
  request_id: string
  module_id: string
  monthly_price_snapshot: number
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [activeSection, setActiveSection] = useState<"overview" | "manage" | "requests" | "trials">("overview")

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

  const loadData = async (options?: { silent?: boolean; keepMessage?: boolean; skipInitialRetry?: boolean }) => {
    const silent = options?.silent ?? hasLoadedOnce

    try {
      if (!silent) setLoading(true)
      if (!options?.keepMessage) setMessage(null)

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
          .select("id,code,name,description,monthly_price,annual_price,currency,is_required_base,is_active,sort_order")
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
          .select("membership_id,module_id,monthly_price_snapshot,annual_price_snapshot"),

        supabase
          .from("membership_change_requests")
          .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,request_type,requested_end_on,monthly_total,annual_total,starts_on,note,reviewed_by,reviewed_at,payment_status,paid_at,paid_by,created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("membership_change_request_modules")
          .select("request_id,module_id,monthly_price_snapshot,annual_price_snapshot"),

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
        annual_price: Number(m.annual_price || 0),
        is_required_base: !!m.is_required_base,
        is_active: !!m.is_active,
        sort_order: Number(m.sort_order || 0),
      })) as MembershipModule[]

      setPlayers(nextPlayers)
      setModules(nextModules)
      setDependencies((dependencyData || []) as ModuleDependency[])
      setMemberships((membershipData || []) as MemberMembership[])
      setMembershipModuleRows(
        ((membershipModulesData || []) as any[]).map((row) => ({
          ...row,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })),
      )

      setChangeRequests(
        ((changeRequestData || []) as any[]).map((row) => ({
          ...row,
          monthly_total: Number(row.monthly_total || 0),
          annual_total: Number(row.annual_total || 0),
          payment_status: row.payment_status === "paid" ? "paid" : "pending",
          paid_at: row.paid_at ?? null,
          paid_by: row.paid_by ?? null,
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

      // Beim ersten Öffnen kam es gelegentlich vor, dass die Membership-Abfragen
      // direkt nach dem Mount noch leer zurückkamen. Ein EINMALIGER stiller Retry
      // ersetzt das bisher nötige manuelle zweite Laden.
      if (
        !hasLoadedOnce &&
        !options?.skipInitialRetry &&
        nextPlayers.length > 0 &&
        ((membershipData || []).length === 0 || (membershipModulesData || []).length === 0)
      ) {
        window.setTimeout(() => {
          void loadData({ silent: true, keepMessage: true, skipInitialRetry: true })
        }, 300)
      }

      if (!selectedPlayerId && nextPlayers.length > 0) {
        const active = nextPlayers.find((p) => p.is_active !== false && !p.club_left_at)
        setSelectedPlayerId(active?.id || nextPlayers[0].id)
      }
    } catch (error: any) {
      console.error("membership management load error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Mitgliedschaften konnten nicht geladen werden.",
      })
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
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
    const premiumModule = modules.find((m) => m.code === "premium_app")
    const eDartModule = modules.find((m) => m.code === "edart_league")
    const steelDartModule = modules.find((m) => m.code === "steeldart_league")

    const leagueIds = [eDartModule?.id, steelDartModule?.id].filter(Boolean) as string[]

    if (checked) {
      next.add(module.id)

      // Feste EMD-Regel: jedes Liga-Paket braucht die Premium App.
      // Das gilt auch dann, wenn die Dependency-Tabelle einmal nicht geladen wurde.
      if ((module.code === "edart_league" || module.code === "steeldart_league") && premiumModule) {
        next.add(premiumModule.id)
      }

      setSelectedModuleIds(ensureDependencies(next))
      return
    }

    // Premium App darf nicht entfernt werden, solange E-Dart oder Steeldart aktiv ist.
    if (module.code === "premium_app") {
      const activeLeague = leagueIds.some((id) => next.has(id))
      if (activeLeague) {
        setMessage({
          type: "info",
          text: "Die Premium App ist für E-Dart und Steeldart verpflichtend. Entferne zuerst die Liga-Pakete.",
        })
        return
      }
    }

    next.delete(module.id)

    // Wird das LETZTE Liga-Paket entfernt, fällt auch die automatisch benötigte Premium App weg.
    // Bleibt E-Dart ODER Steeldart aktiv, bleibt Premium selbstverständlich aktiv.
    if (module.code === "edart_league" || module.code === "steeldart_league") {
      const anotherLeagueStillActive = leagueIds.some((id) => next.has(id))

      if (!anotherLeagueStillActive && premiumModule) {
        next.delete(premiumModule.id)
      }
    }

    // Sonstige Abhängigkeiten weiter respektieren.
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
        annual_price_snapshot: Number(module.annual_price),
      }))

      const { error: insertError } = await supabase
        .from("member_membership_modules")
        .insert(rows)

      if (insertError) throw insertError

      await loadData({ silent: true, keepMessage: true })

      setMessage({
        type: "success",
        text: `Mitgliedschaft für ${selectedPlayer?.name || "das Mitglied"} wurde gespeichert.`,
      })
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

  const markRequestPaid = async (request: MembershipChangeRequest) => {
    if (!user) return
    if (request.request_type === "cancel") return

    try {
      setReviewingRequestId(request.id)
      setMessage(null)

      const { error } = await supabase
        .from("membership_change_requests")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("requested_status", "pending")

      if (error) throw error

      await loadData({ silent: true })

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text: `Zahlung von ${player?.name || "dem Mitglied"} wurde als erhalten markiert. Das Paket kann jetzt freigeschaltet werden.`,
      })
    } catch (error: any) {
      console.error("mark membership request paid error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Zahlung konnte nicht bestätigt werden.",
      })
    } finally {
      setReviewingRequestId("")
    }
  }


  const getRequestPaymentDue = (request: MembershipChangeRequest) => {
    const currentMembership = getCurrentMembershipForRequest(request)

    if (!currentMembership) {
      return request.billing_cycle === "monthly"
        ? Number(request.monthly_total || 0)
        : Number(request.annual_total || 0)
    }

    const currentRows = membershipModuleRows.filter(
      (row) => row.membership_id === currentMembership.id,
    )

    const currentTotal =
      request.billing_cycle === "monthly"
        ? currentRows.reduce(
            (sum, row) => sum + Number(row.monthly_price_snapshot || 0),
            0,
          )
        : currentRows.reduce(
            (sum, row) => sum + Number(row.annual_price_snapshot || 0),
            0,
          )

    const requestedTotal =
      request.billing_cycle === "monthly"
        ? Number(request.monthly_total || 0)
        : Number(request.annual_total || 0)

    return Math.max(0, requestedTotal - currentTotal)
  }


  const approveChangeRequest = async (request: MembershipChangeRequest) => {
    if (!user) return

    const paymentDue = getRequestPaymentDue(request)

    if (paymentDue > 0 && request.payment_status !== "paid") {
      setMessage({
        type: "error",
        text: "Bitte zuerst den Zahlungseingang bestätigen. Erst danach darf das Paket freigeschaltet werden.",
      })
      return
    }

    try {
      setReviewingRequestId(request.id)
      setMessage(null)

      const requestRows = changeRequestModules.filter(
        (row) => row.request_id === request.id,
      )

      if (requestRows.length === 0) {
        throw new Error("Für diese Anfrage wurden keine Module gefunden.")
      }

      let membershipId = request.current_membership_id || ""

      if (membershipId) {
        const currentMembership = memberships.find((membership) => membership.id === membershipId)

        const { error: membershipError } = await supabase
          .from("member_memberships")
          .update({
            billing_cycle: request.billing_cycle,
            payment_method: request.payment_method,
            status: "active",
            starts_on: currentMembership?.starts_on || request.starts_on || todayISO(),
            ends_on: currentMembership?.ends_on || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", membershipId)

        if (membershipError) throw membershipError
      } else {
        const { data: newMembership, error: membershipError } = await supabase
          .from("member_memberships")
          .insert({
            player_id: request.player_id,
            billing_cycle: request.billing_cycle,
            payment_method: request.payment_method,
            status: "active",
            starts_on: request.starts_on || todayISO(),
            ends_on: null,
            note: "Über Mitgliedschaftsanfrage freigegeben",
          })
          .select("id")
          .single()

        if (membershipError) throw membershipError
        membershipId = newMembership.id
      }

      const { error: deleteError } = await supabase
        .from("member_membership_modules")
        .delete()
        .eq("membership_id", membershipId)

      if (deleteError) throw deleteError

      const moduleRows = requestRows.map((row) => ({
        membership_id: membershipId,
        module_id: row.module_id,
        monthly_price_snapshot: row.monthly_price_snapshot,
        annual_price_snapshot: row.annual_price_snapshot,
      }))

      const { error: insertError } = await supabase
        .from("member_membership_modules")
        .insert(moduleRows)

      if (insertError) throw insertError

      const { error: requestError } = await supabase
        .from("membership_change_requests")
        .update({
          requested_status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (requestError) throw requestError

      await loadData({ silent: true })

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text: `Mitgliedschaftsanfrage von ${player?.name || "dem Mitglied"} wurde bestätigt. Die gewünschten Änderungen wurden übernommen.`,
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

      const { error: membershipError } = await supabase
        .from("member_memberships")
        .update({
          ends_on: request.requested_end_on,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.current_membership_id)

      if (membershipError) throw membershipError

      const { error: requestError } = await supabase
        .from("membership_change_requests")
        .update({
          requested_status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)

      if (requestError) throw requestError

      await loadData({ silent: true })

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

      await loadData({ silent: true })

      const player = players.find((p) => p.id === request.player_id)
      setMessage({
        type: "success",
        text:
          request.request_type === "cancel"
            ? `Kündigungsanfrage von ${player?.name || "dem Mitglied"} wurde abgelehnt.`
            : `Mitgliedschaftsanfrage von ${player?.name || "dem Mitglied"} wurde abgelehnt.`,
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


  const moduleById = useMemo(
    () => new Map(modules.map((module) => [module.id, module])),
    [modules],
  )

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
    if (preset === "edart") return ["premium_app", "edart_league"]
    if (preset === "steeldart") return ["premium_app", "steeldart_league"]
    if (preset === "both") return ["premium_app", "edart_league", "steeldart_league"]

    return modules
      .filter((module) => module.is_active && !module.is_required_base)
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

      const codes = Array.from(new Set(trialPresetCodes(trialPreset)))

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

      await loadData({ silent: true })

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
      await loadData({ silent: true })
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Die Testfreischaltung konnte nicht beendet werden.",
      })
    } finally {
      setSavingTrial(false)
    }
  }

  const getPaidBreakdownForPlayer = (playerId: string) => {
    const today = todayISO()
    const membership =
      memberships.find(
        (m) =>
          m.player_id === playerId &&
          m.status === "active" &&
          m.starts_on <= today &&
          (!m.ends_on || m.ends_on >= today),
      ) || null

    if (!membership) {
      return {
        membership: null as MemberMembership | null,
        moduleCodes: [] as string[],
        emdApp: 0,
        rest: 0,
        total: 0,
      }
    }

    const rows = membershipModuleRows.filter((row) => row.membership_id === membership.id)

    let emdApp = 0
    let rest = 0
    const moduleCodes: string[] = []

    for (const row of rows) {
      const module = moduleById.get(row.module_id)
      if (!module) continue

      moduleCodes.push(module.code)

      const amount =
        membership.billing_cycle === "monthly"
          ? Number(row.monthly_price_snapshot || 0)
          : Number(row.annual_price_snapshot || 0)

      if (module.code === "premium_app") emdApp += amount
      else rest += amount
    }

    return {
      membership,
      moduleCodes,
      emdApp,
      rest,
      total: emdApp + rest,
    }
  }

  const overviewRows = useMemo(() => {
    return players
      .filter((player) => player.is_active !== false && !player.club_left_at)
      .map((player) => {
        const paid = getPaidBreakdownForPlayer(player.id)
        const playerTrials = activeTrialsForPlayer(player.id)

        return {
          player,
          ...paid,
          trials: playerTrials,
        }
      })
      .sort((a, b) => a.player.name.localeCompare(b.player.name, "de"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, memberships, membershipModuleRows, modules, trials])

  const activeMembershipCount = memberships.filter((m) => m.status === "active").length
  const stripeMembershipCount = memberships.filter((m) => m.payment_method === "stripe").length

  return (
    <div className="w-full space-y-5">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
              <WalletCards className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-gray-950 sm:text-xl">
                Mitgliedschaften
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-gray-500">
                Pakete, Zahlungen, Tests und Anfragen zentral verwalten.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData({ silent: true })}
            disabled={loading}
            className="w-full rounded-xl sm:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Aktualisieren
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-bold",
            message.type === "success" && "border-green-200 bg-green-50 text-green-800",
            message.type === "error" && "border-red-200 bg-red-50 text-red-800",
            message.type === "info" && "border-blue-200 bg-blue-50 text-blue-800",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveSection("overview")}
          className={cn(
            "rounded-2xl border p-3 text-left transition sm:p-4",
            activeSection === "overview"
              ? "border-orange-300 bg-orange-50 shadow-sm"
              : "border-gray-200 bg-white hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-2">
            <ListChecks className={cn("h-4 w-4", activeSection === "overview" ? "text-orange-600" : "text-gray-400")} />
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Übersicht</span>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-950">{memberships.length}</div>
          <div className="text-xs font-semibold text-gray-500">Mitgliedschaften</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("manage")}
          className={cn(
            "rounded-2xl border p-3 text-left transition sm:p-4",
            activeSection === "manage"
              ? "border-blue-300 bg-blue-50 shadow-sm"
              : "border-gray-200 bg-white hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-2">
            <UserRound className={cn("h-4 w-4", activeSection === "manage" ? "text-blue-600" : "text-gray-400")} />
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Verwalten</span>
          </div>
          <div className="mt-2 text-2xl font-black text-green-600">{activeMembershipCount}</div>
          <div className="text-xs font-semibold text-gray-500">Aktiv</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("requests")}
          className={cn(
            "rounded-2xl border p-3 text-left transition sm:p-4",
            activeSection === "requests"
              ? "border-amber-300 bg-amber-50 shadow-sm"
              : "border-gray-200 bg-white hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", activeSection === "requests" ? "text-amber-600" : "text-gray-400")} />
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Anfragen</span>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-600">{pendingChangeRequests.length}</div>
          <div className="text-xs font-semibold text-gray-500">Offen</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("trials")}
          className={cn(
            "rounded-2xl border p-3 text-left transition sm:p-4",
            activeSection === "trials"
              ? "border-purple-300 bg-purple-50 shadow-sm"
              : "border-gray-200 bg-white hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-2">
            <Gift className={cn("h-4 w-4", activeSection === "trials" ? "text-purple-600" : "text-gray-400")} />
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Tests</span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">
            {trials.filter((trial) => trial.status === "active" && trial.starts_on <= todayISO() && trial.ends_on >= todayISO()).length}
          </div>
          <div className="text-xs font-semibold text-gray-500">Aktiv</div>
        </button>
      </div>

      <div className="sticky top-14 z-20 -mx-1 overflow-x-auto px-1 pb-1 sm:static">
        <div className="flex min-w-max gap-1 rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur sm:min-w-0">
          {[
            { key: "overview", label: "Übersicht", icon: ListChecks },
            { key: "manage", label: "Mitglied verwalten", icon: UserRound },
            { key: "requests", label: `Anfragen${pendingChangeRequests.length ? ` (${pendingChangeRequests.length})` : ""}`, icon: AlertTriangle },
            { key: "trials", label: "Testpakete", icon: Gift },
          ].map((item) => {
            const Icon = item.icon
            const active = activeSection === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key as typeof activeSection)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition",
                  active
                    ? "bg-gray-950 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeSection === "overview" ? (
        <div className="space-y-5">
      <Card className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/70">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-orange-600" />
            Gesamtübersicht – wer hat was?
          </CardTitle>
          <CardDescription>
            EMD App wird finanziell separat ausgewiesen. Alle anderen bezahlten Module werden gemeinsam unter „Rest“ gerechnet. Testpakete sind kostenlos und werden extra markiert.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="space-y-3 p-3 md:hidden">
            {overviewRows.map((row) => (
              <div key={row.player.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-950">{row.player.name}</div>
                    <div className="mt-1 text-xs font-semibold text-gray-500">
                      {row.membership
                        ? `${row.membership.billing_cycle === "monthly" ? "Monatlich" : "Jährlich"} · ${paymentLabel(row.membership.payment_method)}`
                        : "Kein bezahltes Paket"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-orange-600">{formatEUR(row.total)}</div>
                    <div className="text-[11px] font-bold text-gray-400">Gesamt</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-purple-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-wide text-purple-600">EMD App</div>
                    <div className="mt-0.5 font-black text-purple-800">{formatEUR(row.emdApp)}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-wide text-gray-500">Rest</div>
                    <div className="mt-0.5 font-black text-gray-900">{formatEUR(row.rest)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.moduleCodes.length > 0 ? row.moduleCodes.map((code) => {
                    const module = modules.find((item) => item.code === code)
                    return (
                      <Badge key={code} variant="outline" className="rounded-full text-[11px]">
                        {module?.name || code}
                      </Badge>
                    )
                  }) : (
                    <span className="text-xs font-semibold text-gray-400">Keine bezahlten Module</span>
                  )}
                </div>

                {row.trials.length > 0 ? (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-purple-600">Test</div>
                    <div className="flex flex-wrap gap-1.5">
                      {row.trials.map((trial) => {
                        const module = modules.find((item) => item.code === trial.module_code)
                        return (
                          <Badge key={trial.id} variant="outline" className="rounded-full border-purple-200 bg-purple-50 text-[11px] text-purple-700">
                            {module?.name || trial.module_code} bis {new Date(`${trial.ends_on}T00:00:00`).toLocaleDateString("de-AT")}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Mitglied</th>
                  <th className="px-4 py-3">Bezahlte Module</th>
                  <th className="px-4 py-3">Testfreischaltung</th>
                  <th className="px-4 py-3">EMD App</th>
                  <th className="px-4 py-3">Rest gemeinsam</th>
                  <th className="px-4 py-3">Gesamt</th>
                  <th className="px-4 py-3">Abrechnung</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {overviewRows.map((row) => (
                  <tr key={row.player.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-4 py-4">
                      <div className="font-black text-gray-900">{row.player.name}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex max-w-[360px] flex-wrap gap-1.5">
                        {row.moduleCodes.length > 0 ? (
                          row.moduleCodes.map((code) => {
                            const module = modules.find((item) => item.code === code)
                            return (
                              <Badge key={code} variant="outline" className="rounded-full">
                                {module?.name || code}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="font-semibold text-gray-400">Keine</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex max-w-[330px] flex-wrap gap-1.5">
                        {row.trials.length > 0 ? (
                          row.trials.map((trial) => {
                            const module = modules.find((item) => item.code === trial.module_code)
                            return (
                              <Badge
                                key={trial.id}
                                variant="outline"
                                className="rounded-full border-purple-200 bg-purple-50 text-purple-700"
                              >
                                TEST · {module?.name || trial.module_code} bis{" "}
                                {new Date(`${trial.ends_on}T00:00:00`).toLocaleDateString("de-AT")}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="font-semibold text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-black text-purple-700">{formatEUR(row.emdApp)}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-black text-gray-900">{formatEUR(row.rest)}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-black text-orange-600">{formatEUR(row.total)}</div>
                    </td>

                    <td className="px-4 py-4">
                      {row.membership ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="rounded-full">
                            {row.membership.billing_cycle === "monthly" ? "Monatlich" : "Jährlich"}
                          </Badge>
                          <div className="text-xs font-semibold text-gray-500">
                            {paymentLabel(row.membership.payment_method)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-gray-500">
                          Kein bezahltes Paket
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

        </div>
      ) : null}

      {activeSection === "requests" ? (
        <div className="space-y-5">
      {pendingChangeRequests.length > 0 ? (
        <Card className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-orange-50/70">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Offene Mitgliedschaftsanfragen
            </CardTitle>
            <CardDescription>
              Zahlung zuerst als erhalten markieren. Erst danach kann das gewünschte Paket freigeschaltet werden. Stripe kann später automatisch verarbeitet werden.
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
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-gray-900">
                          {player?.name || "Unbekanntes Mitglied"}
                        </div>
                        <Badge
                          variant="outline"
                          className="rounded-full border-orange-200 bg-orange-50 text-orange-700"
                        >
                          {request.request_type === "cancel" ? "KÜNDIGUNG" : "In Prüfung"}
                        </Badge>
                      </div>

                      {request.request_type === "cancel" ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                          <div className="text-xs font-black uppercase tracking-wide text-red-700">
                            Komplette Mitgliedschaft kündigen
                          </div>
                          <div className="mt-2 text-lg font-black text-red-900">
                            Kündigung zum{" "}
                            {request.requested_end_on
                              ? new Date(`${request.requested_end_on}T00:00:00`).toLocaleDateString("de-AT")
                              : "—"}
                          </div>
                          {request.note ? (
                            <div className="mt-2 text-sm font-semibold text-red-800">
                              Grund / Notiz: {request.note}
                            </div>
                          ) : null}
                          <div className="mt-2 text-xs font-semibold text-red-700">
                            Bis zu diesem Datum bleibt die Mitgliedschaft aktiv.
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

                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full font-black",
                                getRequestPaymentDue(request) === 0
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : request.payment_status === "paid"
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : "border-red-200 bg-red-50 text-red-700",
                              )}
                            >
                              {getRequestPaymentDue(request) === 0
                                ? "Keine Zahlung erforderlich"
                                : request.payment_status === "paid"
                                  ? "Bezahlt ✓"
                                  : "Zahlung ausständig"}
                            </Badge>
                          </div>

                          <div
                            className={cn(
                              "mt-3 rounded-xl border px-3 py-2 text-sm font-bold",
                              getRequestPaymentDue(request) === 0
                                ? "border-green-200 bg-green-50 text-green-800"
                                : request.payment_status === "paid"
                                  ? "border-green-200 bg-green-50 text-green-800"
                                  : "border-amber-200 bg-amber-50 text-amber-800",
                            )}
                          >
                            <div>
                              Zahlungsart: <span className="font-black">{paymentLabel(request.payment_method)}</span>
                            </div>
                            <div>
                              Noch zu zahlen:{" "}
                              <span className="font-black">
                                {request.billing_cycle === "monthly"
                                  ? `${formatEUR(getRequestPaymentDue(request))} / Monat`
                                  : `${formatEUR(getRequestPaymentDue(request))} / Jahr`}
                              </span>
                              {request.current_membership_id ? (
                                <span className="ml-2 text-xs font-semibold opacity-80">
                                  (nur Differenz zum bereits bezahlten Paket)
                                </span>
                              ) : null}
                            </div>
                            {getRequestPaymentDue(request) === 0 ? (
                              <div className="mt-1 text-xs">
                                Für diese Änderung ist keine Zahlung nötig. Du kannst die Änderung direkt bestätigen.
                              </div>
                            ) : request.payment_status === "paid" && request.paid_at ? (
                              <div className="mt-1 text-xs">
                                Zahlung bestätigt am{" "}
                                {new Date(request.paid_at).toLocaleString("de-AT", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs">
                                Paket darf erst nach bestätigtem Zahlungseingang freigeschaltet werden.
                              </div>
                            )}
                          </div>

                          {(() => {
                            const changes = getRequestChangeSummary(request)

                            return (
                              <div className="mt-4 space-y-3">
                            <div className="text-xs font-black uppercase tracking-wide text-gray-500">
                              Gewünschte Änderung
                            </div>

                            {changes.addedModules.length === 0 &&
                            changes.removedModules.length === 0 &&
                            !changes.billingChanged &&
                            !changes.paymentChanged ? (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-600">
                                Keine erkennbare Änderung zum aktuellen Paket
                              </div>
                            ) : null}

                            {changes.addedModules.map((module) => (
                              <div
                                key={`add-${module.id}`}
                                className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-black text-green-800"
                              >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                AKTIVIEREN: {module.name}
                              </div>
                            ))}

                            {changes.removedModules.map((module) => (
                              <div
                                key={`remove-${module.id}`}
                                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-800"
                              >
                                <XCircle className="h-4 w-4 shrink-0" />
                                DEAKTIVIEREN: {module.name}
                              </div>
                            ))}

                            {changes.billingChanged && changes.currentMembership ? (
                              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
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
                              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
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

                      <div className="mt-3 text-xs font-semibold text-gray-400">
                        Anfrage vom{" "}
                        {new Date(request.created_at).toLocaleDateString("de-AT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void rejectChangeRequest(request)}
                        disabled={!!reviewingRequestId}
                        className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        {isReviewing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Ablehnen
                      </Button>

                      {request.request_type !== "cancel" &&
                      getRequestPaymentDue(request) > 0 &&
                      request.payment_status !== "paid" ? (
                        <Button
                          type="button"
                          onClick={() => void markRequestPaid(request)}
                          disabled={!!reviewingRequestId}
                          className="rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"
                        >
                          {isReviewing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Euro className="mr-2 h-4 w-4" />
                          )}
                          Zahlung erhalten
                        </Button>
                      ) : null}

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
                            getRequestPaymentDue(request) > 0 &&
                            request.payment_status !== "paid")
                        }
                        className={cn(
                          "rounded-xl font-black text-white",
                          request.request_type !== "cancel" && request.payment_status !== "paid"
                            ? "bg-gray-400"
                            : "bg-green-600 hover:bg-green-700",
                        )}
                      >
                        {isReviewing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {request.request_type === "cancel"
                          ? "Kündigung bestätigen"
                          : getRequestPaymentDue(request) === 0
                            ? "Änderung bestätigen"
                            : request.payment_status === "paid"
                              ? "Paket freischalten"
                              : "Zahlung zuerst bestätigen"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}


      {pendingChangeRequests.length === 0 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-4 font-black text-gray-900">Keine offenen Anfragen</div>
            <div className="mt-1 max-w-sm text-sm font-semibold text-gray-500">
              Aktuell gibt es keine Paketänderungen oder Kündigungen zu bearbeiten.
            </div>
          </CardContent>
        </Card>
      ) : null}

        </div>
      ) : null}

      {activeSection === "trials" ? (
        <div className="space-y-5">
      <Card className="rounded-2xl border border-purple-200 bg-purple-50/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label className="mb-2 block text-xs font-black uppercase tracking-wide text-purple-700">
                Testpaket für Mitglied
              </Label>
              <Select
                value={selectedPlayerId}
                onValueChange={(value) => {
                  setSelectedPlayerId(value)
                  setMessage(null)
                }}
              >
                <SelectTrigger className="h-12 rounded-xl bg-white">
                  <SelectValue placeholder="Mitglied auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="h-9 w-fit rounded-full border-purple-200 bg-white px-3 text-purple-700">
              Kostenlos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {selectedPlayer ? (
        <Card className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
          <CardHeader className="border-b border-purple-100 bg-purple-50/70">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Test-Saison / Testpaket
            </CardTitle>
            <CardDescription>
              Kostenloser Zugang für eine definierte Zeit. Testmodule werden nicht in die bezahlten Beträge eingerechnet.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-gray-500">
                Ausgewähltes Mitglied
              </div>
              <div className="mt-1 text-lg font-black text-gray-900">{selectedPlayer.name}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Testpaket</Label>
                <Select
                  value={trialPreset}
                  onValueChange={(value) =>
                    setTrialPreset(value as "edart" | "steeldart" | "both" | "full")
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edart">E-Dart Liga testen</SelectItem>
                    <SelectItem value="steeldart">Steeldart Liga testen</SelectItem>
                    <SelectItem value="both">E-Dart + Steeldart testen</SelectItem>
                    <SelectItem value="full">Komplettpaket testen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="date"
                  value={trialStartsOn}
                  onChange={(event) => setTrialStartsOn(event.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Ende</Label>
                <Input
                  type="date"
                  value={trialEndsOn}
                  onChange={(event) => setTrialEndsOn(event.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Input
                value={trialNote}
                onChange={(event) => setTrialNote(event.target.value)}
                placeholder="z. B. Testsaison 2026/27"
                className="rounded-xl"
              />
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-purple-700">
                Wird kostenlos freigeschaltet
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {trialPresetCodes(trialPreset).map((code) => {
                  const module = modules.find((item) => item.code === code)
                  return (
                    <Badge
                      key={code}
                      variant="outline"
                      className="rounded-full border-purple-200 bg-white text-purple-700"
                    >
                      {module?.name || code}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void createTrialPackage()}
              disabled={savingTrial || !trialEndsOn}
              className="rounded-xl bg-purple-600 font-black text-white hover:bg-purple-700"
            >
              {savingTrial ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Gift className="mr-2 h-4 w-4" />
              )}
              Testpaket freischalten
            </Button>

            {activeTrialsForPlayer(selectedPlayer.id).length > 0 ? (
              <div className="border-t border-gray-100 pt-4">
                <div className="mb-3 flex items-center gap-2 font-black text-gray-900">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  Aktive Testfreischaltungen
                </div>

                <div className="space-y-2">
                  {activeTrialsForPlayer(selectedPlayer.id).map((trial) => {
                    const module = modules.find((item) => item.code === trial.module_code)

                    return (
                      <div
                        key={trial.id}
                        className="flex flex-col gap-2 rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-black text-purple-900">
                            {module?.name || trial.module_code}
                          </div>
                          <div className="text-xs font-semibold text-purple-700">
                            {new Date(`${trial.starts_on}T00:00:00`).toLocaleDateString("de-AT")} –{" "}
                            {new Date(`${trial.ends_on}T00:00:00`).toLocaleDateString("de-AT")}
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingTrial}
                          onClick={() => void cancelTrial(trial.id)}
                          className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Beenden
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

        </div>
      ) : null}

      {activeSection === "manage" ? (
        <div className="space-y-5">
      <div className="space-y-4">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:hidden">
          <CardContent className="p-4">
            <Label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
              Mitglied
            </Label>
            <Select
              value={selectedPlayerId}
              onValueChange={(value) => {
                setSelectedPlayerId(value)
                setMessage(null)
              }}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Mitglied auswählen" />
              </SelectTrigger>
              <SelectContent>
                {filteredPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:block">
          <CardHeader>
            <CardTitle>Mitglied auswählen</CardTitle>
            <CardDescription>
              Suche nach Name oder E-Mail-Adresse.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mitglied suchen..."
                className="pl-9"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <ScrollArea className="h-[560px]">
                <div className="space-y-2 p-3">
                  {loading ? (
                    <div className="flex items-center gap-2 p-3 text-sm font-semibold text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mitglieder werden geladen...
                    </div>
                  ) : filteredPlayers.length === 0 ? (
                    <div className="p-6 text-center text-sm font-semibold text-gray-500">
                      Keine Mitglieder gefunden.
                    </div>
                  ) : (
                    filteredPlayers.map((player) => {
                      const membership = memberships.find(
                        (m) =>
                          m.player_id === player.id &&
                          (m.status === "active" || m.status === "pending" || m.status === "paused"),
                      )

                      const isSelected = selectedPlayerId === player.id

                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlayerId(player.id)
                            setMessage(null)
                          }}
                          className={cn(
                            "w-full rounded-2xl border p-3 text-left transition",
                            isSelected
                              ? "border-orange-300 bg-orange-50 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-black text-gray-900">{player.name}</div>
                              {player.email ? (
                                <div className="mt-1 truncate text-xs font-semibold text-gray-500">
                                  {player.email}
                                </div>
                              ) : null}
                            </div>

                            {membership ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 rounded-full",
                                  membership.status === "active" &&
                                    "border-green-200 bg-green-50 text-green-700",
                                  membership.status === "pending" &&
                                    "border-orange-200 bg-orange-50 text-orange-700",
                                )}
                              >
                                {statusLabel(membership.status)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 rounded-full">
                                Kein Paket
                              </Badge>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>
                    {selectedPlayer ? selectedPlayer.name : "Kein Mitglied ausgewählt"}
                  </CardTitle>
                  <CardDescription>
                    Zahlungsweise und Mitgliedschaftsstatus festlegen.
                  </CardDescription>
                </div>

                {selectedMembership ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit rounded-full px-3 py-1",
                      selectedMembership.status === "active" &&
                        "border-green-200 bg-green-50 text-green-700",
                      selectedMembership.status === "pending" &&
                        "border-orange-200 bg-orange-50 text-orange-700",
                    )}
                  >
                    {statusLabel(selectedMembership.status)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Abrechnung</Label>
                  <Select
                    value={billingCycle}
                    onValueChange={(value) => handleBillingCycleChange(value as BillingCycle)}
                    disabled={!selectedPlayer}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="annual">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zahlungsart</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => handlePaymentMethodChange(value as PaymentMethod)}
                    disabled={!selectedPlayer}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="transfer" disabled={billingCycle === "monthly"}>
                        Überweisung / Erlagschein
                      </SelectItem>
                      <SelectItem value="cash" disabled={billingCycle === "monthly"}>
                        Bar im Verein
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as MembershipStatus)}
                    disabled={!selectedPlayer}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Ausständig</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="paused">Pausiert</SelectItem>
                      <SelectItem value="cancelled">Gekündigt</SelectItem>
                      <SelectItem value="expired">Abgelaufen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Beginn</Label>
                  <Input
                    type="date"
                    value={startsOn}
                    onChange={(event) => setStartsOn(event.target.value)}
                    disabled={!selectedPlayer}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ende (optional)</Label>
                  <Input
                    type="date"
                    value={endsOn}
                    onChange={(event) => setEndsOn(event.target.value)}
                    disabled={!selectedPlayer}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {billingCycle === "monthly" ? (
                <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  Monatliche Zahlung ist nur über Stripe vorgesehen. Überweisung und Barzahlung sind bei jährlicher Zahlung verfügbar.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Module</CardTitle>
              <CardDescription>
                Grundmitgliedschaft ist verpflichtend. E-Dart und Steeldart aktivieren automatisch die Premium App.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {modules.map((module) => {
                const checked = selectedModuleIds.has(module.id)
                const isBase = module.is_required_base

                return (
                  <div
                    key={module.id}
                    className={cn(
                      "rounded-2xl border p-4 transition",
                      checked ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-gray-900">{module.name}</div>

                          {isBase ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-orange-200 bg-orange-50 text-orange-700"
                            >
                              Pflicht
                            </Badge>
                          ) : null}

                          {module.code === "premium_app" ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-purple-200 bg-purple-50 text-purple-700"
                            >
                              Premium
                            </Badge>
                          ) : null}
                        </div>

                        {module.description ? (
                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            {module.description}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {formatEUR(module.monthly_price)} / Monat
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {formatEUR(module.annual_price)} / Jahr
                          </Badge>
                        </div>
                      </div>

                      <Switch
                        checked={isBase ? true : checked}
                        disabled={!selectedPlayer || isBase}
                        onCheckedChange={(value) => toggleModule(module, value)}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-orange-600" />
                    <div className="text-sm font-black uppercase tracking-wide text-gray-500">
                      Gesamtpaket
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                    <div>
                      <div className="text-3xl font-black text-gray-900">
                        {formatEUR(monthlyTotal)}
                      </div>
                      <div className="text-sm font-semibold text-gray-500">pro Monat</div>
                    </div>

                    <div>
                      <div className="text-3xl font-black text-orange-600">
                        {formatEUR(annualTotal)}
                      </div>
                      <div className="text-sm font-semibold text-gray-500">pro Jahr</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {selectedModules.length} Module
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {billingCycle === "monthly" ? "Monatliche Abrechnung" : "Jährliche Abrechnung"}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {paymentLabel(paymentMethod)}
                    </Badge>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={saveMembership}
                  disabled={saving || loading || !selectedPlayer || !hasChanges}
                  className={cn(
                    "h-12 rounded-xl px-6 font-black text-white",
                    !hasChanges && selectedMembership
                      ? "bg-green-600 disabled:opacity-100"
                      : "bg-orange-600 hover:bg-orange-700",
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : !hasChanges && selectedMembership ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Gespeichert ✓
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Mitgliedschaft speichern
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedMembership?.billing_cycle === "monthly" &&
          selectedMembership?.payment_method !== "stripe" ? (
            <div className="flex gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              Dieses vorhandene Testpaket verwendet monatliche Abrechnung mit {paymentLabel(selectedMembership.payment_method)}.
              Beim nächsten Speichern wird für monatliche Zahlung Stripe verlangt.
            </div>
          ) : null}
        </div>
      </div>
      </div>
        </div>
      ) : null}
    </div>
  )
}

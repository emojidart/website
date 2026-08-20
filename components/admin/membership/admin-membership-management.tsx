"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Euro,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
  CalendarX,
  Copy,
  Landmark,
  Banknote,
  Gift,
  Home,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"

type BillingCycle = "monthly" | "annual"
type PaymentMethod = "stripe" | "transfer" | "cash"
type MembershipStatus = "pending" | "active" | "paused" | "cancelled" | "expired"

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

type Membership = {
  id: string
  player_id: string
  billing_cycle: BillingCycle
  payment_method: PaymentMethod
  status: MembershipStatus
  starts_on: string
  ends_on: string | null
  created_at: string
}

type MembershipModuleRow = {
  membership_id: string
  module_id: string
  monthly_price_snapshot: number
  annual_price_snapshot: number
}

type ChangeRequest = {
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
  payment_status: "pending" | "paid"
  paid_at: string | null
  created_at: string
}

type MembershipTrial = {
  id: string
  player_id: string
  module_code: string
  starts_on: string
  ends_on: string
  status: "active" | "cancelled" | "expired"
  note: string | null
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

function requestStatusLabel(status: ChangeRequest["requested_status"]) {
  if (status === "pending") return "In Prüfung"
  if (status === "approved") return "Bestätigt"
  if (status === "rejected") return "Abgelehnt"
  return "Storniert"
}


const CLUB_ACCOUNT_HOLDER = "Emoj!`s Dart Verein"
const CLUB_IBAN = "AT27 1500 0001 3110 5504"
const CLUB_BIC = "OBKLAT2L"

function buildMembershipPaymentReference(playerName: string) {
  const year = new Date().getFullYear()
  return `Mitgliedschaft ${playerName || "Mitglied"} ${year}`
}

export function MemberMembership() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [playerId, setPlayerId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [modules, setModules] = useState<MembershipModule[]>([])
  const [dependencies, setDependencies] = useState<ModuleDependency[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [membershipRows, setMembershipRows] = useState<MembershipModuleRow[]>([])
  const [pendingRequest, setPendingRequest] = useState<ChangeRequest | null>(null)
  const [pendingRequestModuleIds, setPendingRequestModuleIds] = useState<string[]>([])
  const [activeTrials, setActiveTrials] = useState<MembershipTrial[]>([])

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())

  const [cancelEndOn, setCancelEndOn] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [showPackageEditor, setShowPackageEditor] = useState(false)

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error("Du bist nicht eingeloggt.")

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", user.id)
        .single()

      if (profileError) throw profileError
      if (!profile?.player_id) {
        throw new Error("Dein Benutzerkonto ist noch keinem Vereinsmitglied zugeordnet.")
      }

      const currentPlayerId = profile.player_id as string
      setPlayerId(currentPlayerId)

      const [
        { data: playerData, error: playerError },
        { data: moduleData, error: moduleError },
        { data: dependencyData, error: dependencyError },
        { data: membershipData, error: membershipError },
        { data: requestData, error: requestError },
        { data: trialData, error: trialError },
      ] = await Promise.all([
        supabase
          .from("club_players")
          .select("name")
          .eq("id", currentPlayerId)
          .single(),

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
          .select("id,player_id,billing_cycle,payment_method,status,starts_on,ends_on,created_at")
          .eq("player_id", currentPlayerId)
          .order("created_at", { ascending: false }),

        supabase
          .from("membership_change_requests")
          .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,request_type,requested_end_on,monthly_total,annual_total,starts_on,note,payment_status,paid_at,created_at")
          .eq("player_id", currentPlayerId)
          .eq("requested_status", "pending")
          .order("created_at", { ascending: false })
          .limit(1),

        supabase
          .from("membership_trials")
          .select("id,player_id,module_code,starts_on,ends_on,status,note")
          .eq("player_id", currentPlayerId)
          .eq("status", "active")
          .lte("starts_on", new Date().toISOString().split("T")[0])
          .gte("ends_on", new Date().toISOString().split("T")[0])
          .order("ends_on", { ascending: true }),
      ])

      if (playerError) throw playerError
      if (moduleError) throw moduleError
      if (dependencyError) throw dependencyError
      if (membershipError) throw membershipError
      if (requestError) throw requestError
      if (trialError) throw trialError

      const nextModules = ((moduleData || []) as any[]).map((m) => ({
        ...m,
        monthly_price: Number(m.monthly_price || 0),
        annual_price: Number(m.annual_price || 0),
        is_required_base: !!m.is_required_base,
        is_active: !!m.is_active,
        sort_order: Number(m.sort_order || 0),
      })) as MembershipModule[]

      setPlayerName(playerData?.name || "")
      setModules(nextModules)
      setDependencies((dependencyData || []) as ModuleDependency[])

      const memberships = (membershipData || []) as Membership[]
      const activeMembership =
        memberships.find((m) => m.status === "active") ||
        memberships.find((m) => m.status === "pending" || m.status === "paused") ||
        memberships[0] ||
        null

      setMembership(activeMembership)
      setShowPackageEditor(!activeMembership)

      let currentRows: MembershipModuleRow[] = []

      if (activeMembership) {
        const { data: rowData, error: rowError } = await supabase
          .from("member_membership_modules")
          .select("membership_id,module_id,monthly_price_snapshot,annual_price_snapshot")
          .eq("membership_id", activeMembership.id)

        if (rowError) throw rowError

        currentRows = ((rowData || []) as any[]).map((row) => ({
          ...row,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        }))

        setMembershipRows(currentRows)
      } else {
        setMembershipRows([])
      }

      const currentPending = ((requestData || [])[0] || null) as ChangeRequest | null
      setPendingRequest(currentPending)
      setActiveTrials((trialData || []) as MembershipTrial[])
      if (currentPending) {
        setShowPackageEditor(true)
        setWizardStep(3)
      }

      let requestModuleIds: string[] = []

      if (currentPending) {
        const { data: requestModules, error: requestModulesError } = await supabase
          .from("membership_change_request_modules")
          .select("module_id")
          .eq("request_id", currentPending.id)

        if (requestModulesError) throw requestModulesError
        requestModuleIds = (requestModules || []).map((row: any) => row.module_id)
      }

      setPendingRequestModuleIds(requestModuleIds)

      const baseIds = nextModules.filter((m) => m.is_required_base).map((m) => m.id)

      if (currentPending) {
        setBillingCycle(currentPending.billing_cycle)
        setPaymentMethod(currentPending.payment_method)
        setSelectedModuleIds(new Set([...requestModuleIds, ...baseIds]))
      } else if (activeMembership) {
        setBillingCycle(activeMembership.billing_cycle)
        setPaymentMethod(activeMembership.payment_method)
        setSelectedModuleIds(
          new Set([...currentRows.map((row) => row.module_id), ...baseIds]),
        )
      } else {
        setBillingCycle("annual")
        setPaymentMethod("cash")
        setSelectedModuleIds(new Set(baseIds))
      }
    } catch (error: any) {
      console.error("member membership load error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Mitgliedschaft konnte nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

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

    if (pendingRequest) return

    if (module.is_required_base && !checked) {
      setMessage({
        type: "info",
        text: "Die Grundmitgliedschaft ist verpflichtend.",
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
        text: `${module.name} wird von „${dependent?.name || "einem anderen Modul"}“ benötigt.`,
      })
      return
    }

    next.delete(module.id)

    if (module.code === "edart_league" || module.code === "steeldart_league") {
      const leagueCodes = new Set(["edart_league", "steeldart_league"])
      const stillHasLeague = modules.some(
        (item) => leagueCodes.has(item.code) && next.has(item.id),
      )

      if (!stillHasLeague) {
        const premiumModule = modules.find((item) => item.code === "premium_app")
        if (premiumModule) next.delete(premiumModule.id)
      }
    }

    setSelectedModuleIds(ensureDependencies(next))
  }

  const selectedModules = useMemo(
    () => modules.filter((module) => selectedModuleIds.has(module.id)),
    [modules, selectedModuleIds],
  )

  const paymentTargetModules = useMemo(
    () =>
      pendingRequest
        ? modules.filter((module) => pendingRequestModuleIds.includes(module.id))
        : selectedModules,
    [modules, pendingRequest, pendingRequestModuleIds, selectedModules],
  )

  const monthlyTotal = useMemo(
    () => selectedModules.reduce((sum, module) => sum + Number(module.monthly_price || 0), 0),
    [selectedModules],
  )

  const annualTotal = useMemo(
    () => selectedModules.reduce((sum, module) => sum + Number(module.annual_price || 0), 0),
    [selectedModules],
  )

  const currentMonthlyTotal = useMemo(
    () => membershipRows.reduce((sum, row) => sum + Number(row.monthly_price_snapshot || 0), 0),
    [membershipRows],
  )

  const currentAnnualTotal = useMemo(
    () => membershipRows.reduce((sum, row) => sum + Number(row.annual_price_snapshot || 0), 0),
    [membershipRows],
  )

  const membershipEndsOn = membership?.ends_on || null

  const hasScheduledCancellation = useMemo(() => {
    if (!membershipEndsOn || membership?.status !== "active") return false

    const endOfDay = new Date(`${membershipEndsOn}T23:59:59`)
    return endOfDay.getTime() >= Date.now()
  }, [membershipEndsOn, membership?.status])

  const membershipEndLabel = useMemo(() => {
    if (!membershipEndsOn) return ""
    return new Date(`${membershipEndsOn}T00:00:00`).toLocaleDateString("de-AT")
  }, [membershipEndsOn])

  const paymentMonthlyDue = useMemo(() => {
    const requestedTotal = pendingRequest ? Number(pendingRequest.monthly_total || 0) : monthlyTotal
    if (!membership) return requestedTotal
    return Math.max(0, requestedTotal - currentMonthlyTotal)
  }, [pendingRequest, membership, monthlyTotal, currentMonthlyTotal])

  const paymentAnnualDue = useMemo(() => {
    const requestedTotal = pendingRequest ? Number(pendingRequest.annual_total || 0) : annualTotal
    if (!membership) return requestedTotal
    return Math.max(0, requestedTotal - currentAnnualTotal)
  }, [pendingRequest, membership, annualTotal, currentAnnualTotal])

  const paymentDue = billingCycle === "monthly" ? paymentMonthlyDue : paymentAnnualDue

  const savedModuleIds = useMemo(
    () => membershipRows.map((row) => row.module_id).sort(),
    [membershipRows],
  )

  const selectedIdsSorted = useMemo(
    () => Array.from(selectedModuleIds).sort(),
    [selectedModuleIds],
  )

  const hasChanges = useMemo(() => {
    if (!membership) return true
    if (membership.billing_cycle !== billingCycle) return true
    if (membership.payment_method !== paymentMethod) return true
    if (savedModuleIds.length !== selectedIdsSorted.length) return true

    for (let i = 0; i < savedModuleIds.length; i += 1) {
      if (savedModuleIds[i] !== selectedIdsSorted[i]) return true
    }

    return false
  }, [membership, billingCycle, paymentMethod, savedModuleIds, selectedIdsSorted])

  const showPaymentSection =
    !membership ||
    paymentDue > 0 ||
    (!!pendingRequest && pendingRequest.payment_status === "paid")

  const isPendingCancellation = pendingRequest?.request_type === "cancel"

  const handleBillingCycleChange = (value: BillingCycle) => {
    if (pendingRequest) return
    setBillingCycle(value)

    if (value === "monthly") {
      setPaymentMethod("stripe")
      setMessage({ type: "info", text: "Monatliche Zahlung ist nur über Stripe möglich." })
    } else {
      setMessage(null)
    }
  }

  const handlePaymentMethodChange = (value: PaymentMethod) => {
    if (pendingRequest) return

    if (billingCycle === "monthly" && value !== "stripe") {
      setMessage({
        type: "info",
        text: "Überweisung und Barzahlung sind nur bei jährlicher Abrechnung möglich.",
      })
      return
    }

    setPaymentMethod(value)
    setMessage(null)
  }

  const startStripeCheckout = async (requestId: string) => {
    try {
      setCheckoutLoading(true)
      setMessage(null)

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich neu an.")

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ requestId }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "Stripe Checkout konnte nicht gestartet werden.")
      }

      if (payload?.updated) {
        window.location.href = payload?.redirectUrl || "/member-membership?stripe=updated"
        return
      }

      if (!payload?.url) {
        throw new Error("Stripe hat keine Checkout-Adresse zurückgegeben.")
      }

      window.location.href = payload.url
    } catch (error: any) {
      console.error("stripe checkout error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Stripe Checkout konnte nicht gestartet werden.",
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const submitRequest = async () => {
    if (!playerId) return

    if (pendingRequest) {
      setMessage({ type: "info", text: "Du hast bereits eine offene Änderungsanfrage." })
      return
    }

    if (!hasChanges) {
      setMessage({ type: "info", text: "Deine Auswahl entspricht bereits deinem aktuellen Paket." })
      return
    }

    if (billingCycle === "monthly" && paymentMethod !== "stripe") {
      setMessage({ type: "error", text: "Monatliche Zahlung ist nur über Stripe möglich." })
      return
    }

    try {
      setSubmitting(true)
      setMessage(null)

      const { data: request, error: requestError } = await supabase
        .from("membership_change_requests")
        .insert({
          player_id: playerId,
          current_membership_id: membership?.id || null,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          requested_status: "pending",
          request_type: "change",
          requested_end_on: null,
          monthly_total: monthlyTotal,
          annual_total: annualTotal,
          starts_on: null,
          note:
            paymentMethod === "stripe"
              ? "Änderungsanfrage über Mitgliederbereich – Stripe Checkout"
              : "Änderungsanfrage über Mitgliederbereich",
          payment_status: "pending",
        })
        .select("id")
        .single()

      if (requestError) throw requestError

      const requestRows = selectedModules.map((module) => ({
        request_id: request.id,
        module_id: module.id,
        monthly_price_snapshot: Number(module.monthly_price),
        annual_price_snapshot: Number(module.annual_price),
      }))

      const { error: moduleError } = await supabase
        .from("membership_change_request_modules")
        .insert(requestRows)

      if (moduleError) {
        await supabase.from("membership_change_requests").delete().eq("id", request.id)
        throw moduleError
      }

      if (paymentMethod === "stripe") {
        await startStripeCheckout(request.id)
        return
      }

      await loadData()

      setMessage({
        type: "success",
        text: "Deine Änderungsanfrage wurde gesendet und wartet auf Bestätigung durch den Verein.",
      })
    } catch (error: any) {
      console.error("membership request error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Änderungsanfrage konnte nicht gespeichert werden.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitCancellation = async () => {
    if (!playerId || !membership) return

    if (pendingRequest) {
      setMessage({ type: "info", text: "Du hast bereits eine offene Mitgliedschaftsanfrage." })
      return
    }

    if (!cancelEndOn) {
      setMessage({ type: "error", text: "Bitte wähle das gewünschte Kündigungsdatum." })
      return
    }

    try {
      setSubmitting(true)
      setMessage(null)

      const { error } = await supabase
        .from("membership_change_requests")
        .insert({
          player_id: playerId,
          current_membership_id: membership.id,
          billing_cycle: membership.billing_cycle,
          payment_method: membership.payment_method,
          requested_status: "pending",
          request_type: "cancel",
          requested_end_on: cancelEndOn,
          monthly_total: 0,
          annual_total: 0,
          starts_on: null,
          payment_status: "pending",
          note: cancelNote.trim() || null,
        })

      if (error) throw error

      setShowCancelForm(false)
      setCancelEndOn("")
      setCancelNote("")

      await loadData()

      setMessage({
        type: "success",
        text: `Deine Kündigungsanfrage zum ${new Date(`${cancelEndOn}T00:00:00`).toLocaleDateString("de-AT")} wurde gesendet.`,
      })
    } catch (error: any) {
      console.error("membership cancellation request error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Kündigungsanfrage konnte nicht gespeichert werden.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const cancelPendingRequest = async () => {
    if (!pendingRequest) return

    try {
      setCancelling(true)
      setMessage(null)

      const { error } = await supabase
        .from("membership_change_requests")
        .delete()
        .eq("id", pendingRequest.id)
        .eq("requested_status", "pending")

      if (error) throw error

      await loadData()

      setMessage({ type: "success", text: "Deine offene Änderungsanfrage wurde storniert." })
    } catch (error: any) {
      console.error("cancel membership request error:", error)
      setMessage({
        type: "error",
        text: error?.message || "Die Anfrage konnte nicht storniert werden.",
      })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 font-semibold text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Mitgliedschaft wird geladen...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
              <WalletCards className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Meine Mitgliedschaft</h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                {playerName
                  ? `${playerName} · Paket, Module und Zahlungsweise verwalten`
                  : "Paket, Module und Zahlungsweise verwalten"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/member-dashboard-app">
                <Home className="mr-2 h-4 w-4" />
                Startseite
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/member-profile-app">
                <UserRound className="mr-2 h-4 w-4" />
                Mein Profil
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Neu laden
            </Button>
          </div>
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

      {!showPackageEditor && membership && !showCancelForm ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Aktuelles Paket</CardTitle>
            <CardDescription>
              Hier siehst du deine aktiven Leistungen. Zusatzmodule kannst du jederzeit über „Paket ändern“ hinzufügen oder entfernen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {hasScheduledCancellation ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-black text-red-900">
                      <CalendarX className="h-5 w-5" />
                      Mitgliedschaft gekündigt
                    </div>
                    <p className="mt-1 text-sm font-semibold text-red-800">
                      Deine Mitgliedschaft ist noch bis {membershipEndLabel} aktiv. Danach wird sie automatisch beendet.
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit rounded-full border-red-300 bg-white text-red-700"
                  >
                    Gekündigt zum {membershipEndLabel}
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {modules
                .filter((module) => membershipRows.some((row) => row.module_id === module.id))
                .map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                  >
                    <div>
                      <div className="font-black text-green-900">{module.name}</div>
                      {module.description ? (
                        <div className="mt-1 text-sm font-semibold text-green-700">
                          {module.description}
                        </div>
                      ) : null}
                    </div>
                    <Badge className="shrink-0 rounded-full bg-green-600 text-white">
                      {hasScheduledCancellation ? `Aktiv bis ${membershipEndLabel}` : "Aktiv"}
                    </Badge>
                  </div>
                ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-gray-500">
                Aktueller Beitrag
              </div>
              <div className="mt-1 text-2xl font-black text-gray-900">
                {membership.billing_cycle === "monthly"
                  ? `${formatEUR(currentMonthlyTotal)} / Monat`
                  : `${formatEUR(currentAnnualTotal)} / Jahr`}
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-600">
                {paymentLabel(membership.payment_method)}
              </div>
            </div>

            {hasScheduledCancellation ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                Deine Kündigung ist bereits bestätigt. Paketänderungen und eine weitere Kündigungsanfrage sind nicht mehr notwendig.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setWizardStep(1)
                      setShowPackageEditor(true)
                      setMessage(null)
                    }}
                    className="h-12 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    Paket ändern
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCancelForm(true)
                      setMessage(null)
                    }}
                    className="h-12 rounded-xl border-red-200 font-black text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <CalendarX className="mr-2 h-4 w-4" />
                    Komplette Mitgliedschaft kündigen
                  </Button>
                </div>

                <p className="text-sm font-semibold text-gray-500">
                  „Paket ändern“ ist auch der richtige Weg, wenn du nur ein Zusatzmodul wie E-Dart, Steeldart oder Premium abwählen möchtest.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { step: 1 as const, label: "Zahlung" },
              { step: 2 as const, label: "Paket" },
              { step: 3 as const, label: "Prüfen & abschließen" },
            ].map((item) => {
              const active = wizardStep === item.step
              const done = wizardStep > item.step

              return (
                <div key={item.step} className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black",
                      active && "border-orange-600 bg-orange-600 text-white",
                      done && "border-green-600 bg-green-600 text-white",
                      !active && !done && "border-gray-200 bg-gray-50 text-gray-500",
                    )}
                  >
                    {done ? "✓" : item.step}
                  </div>
                  <div
                    className={cn(
                      "hidden text-xs font-black sm:block",
                      active ? "text-orange-700" : done ? "text-green-700" : "text-gray-500",
                    )}
                  >
                    {item.label}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 text-sm font-semibold text-gray-600 sm:hidden">
            Schritt {wizardStep} von 3 ·{" "}
            {wizardStep === 1
              ? "Zahlung"
              : wizardStep === 2
                ? "Paket"
                : "Prüfen & abschließen"}
          </div>
        </div>
      ) : null}

      {pendingRequest && (isPendingCancellation || (showPackageEditor && wizardStep === 3)) ? (
        <Card className="rounded-2xl border border-orange-200 bg-orange-50 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertCircle className="h-5 w-5" />
                  {pendingRequest.request_type === "cancel"
                    ? "Offene Kündigungsanfrage"
                    : pendingRequest.payment_method === "stripe"
                      ? "Paketänderung bereit"
                      : "Offene Änderungsanfrage"}
                </CardTitle>
                <CardDescription className="mt-1 font-semibold text-orange-800">
                  {pendingRequest.request_type === "cancel"
                    ? `Deine Mitgliedschaft soll zum ${
                        pendingRequest.requested_end_on
                          ? new Date(`${pendingRequest.requested_end_on}T00:00:00`).toLocaleDateString("de-AT")
                          : "gewünschten Termin"
                      } beendet werden. Bis dahin bleibt dein Paket aktiv.`
                    : pendingRequest.payment_method === "stripe"
                      ? "Deine Auswahl ist gespeichert. Prüfe unten die Zusammenfassung und schließe anschließend die Stripe-Zahlung ab."
                      : "Das aktuelle Paket bleibt bis zur Bestätigung aktiv. Unten siehst du bereits, was aktiviert bzw. deaktiviert werden soll."}
                </CardDescription>
              </div>

              <Badge className="w-fit bg-orange-600">
                {pendingRequest.request_type === "cancel"
                  ? requestStatusLabel(pendingRequest.requested_status)
                  : pendingRequest.payment_method === "stripe" &&
                      pendingRequest.payment_status !== "paid"
                    ? "Zahlung ausständig"
                    : requestStatusLabel(pendingRequest.requested_status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {pendingRequest.request_type === "cancel" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="text-sm font-black text-red-800">
                  Komplette Mitgliedschaft kündigen
                </div>
                <div className="mt-1 text-sm font-semibold text-red-700">
                  Gewünschtes Ende:{" "}
                  {pendingRequest.requested_end_on
                    ? new Date(`${pendingRequest.requested_end_on}T00:00:00`).toLocaleDateString("de-AT")
                    : "—"}
                </div>
                {pendingRequest.note ? (
                  <div className="mt-2 text-sm text-red-700">
                    Grund / Notiz: {pendingRequest.note}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-orange-300 bg-white">
                    {pendingRequest.billing_cycle === "monthly" ? "Monatlich" : "Jährlich"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-orange-300 bg-white">
                    {paymentLabel(pendingRequest.payment_method)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-orange-300 bg-white">
                    {pendingRequestModuleIds.length} Module
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-orange-300 bg-white">
                    {pendingRequest.billing_cycle === "monthly"
                      ? `${formatEUR(pendingRequest.monthly_total)} / Monat`
                      : `${formatEUR(pendingRequest.annual_total)} / Jahr`}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {modules
                    .filter((module) => {
                      const activeNow = membershipRows.some((row) => row.module_id === module.id)
                      const requested = pendingRequestModuleIds.includes(module.id)
                      return activeNow !== requested
                    })
                    .map((module) => {
                      const activeNow = membershipRows.some((row) => row.module_id === module.id)
                      const requested = pendingRequestModuleIds.includes(module.id)

                      return (
                        <div
                          key={module.id}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm font-bold",
                            requested && !activeNow &&
                              "border-green-200 bg-green-50 text-green-800",
                            activeNow && !requested &&
                              "border-red-200 bg-red-50 text-red-800",
                          )}
                        >
                          {requested && !activeNow ? "Wird aktiviert: " : "Wird deaktiviert: "}
                          {module.name}
                        </div>
                      )
                    })}

                  {modules.every((module) => {
                    const activeNow = membershipRows.some((row) => row.module_id === module.id)
                    const requested = pendingRequestModuleIds.includes(module.id)
                    return activeNow === requested
                  }) ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 sm:col-span-2">
                      Keine Moduländerung – es wurde nur Abrechnung oder Zahlungsart geändert.
                    </div>
                  ) : null}
                </div>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={cancelPendingRequest}
              disabled={cancelling}
              className="rounded-xl border-orange-300 bg-white"
            >
              {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pendingRequest.request_type === "cancel"
                ? "Kündigungsanfrage stornieren"
                : pendingRequest.payment_method === "stripe"
                  ? "Paketänderung abbrechen"
                  : "Anfrage stornieren"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTrials.length > 0 ? (
        <Card className="rounded-2xl border border-purple-200 bg-purple-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Gift className="h-5 w-5 text-purple-600" />
              Aktive Testfreischaltung
            </CardTitle>
            <CardDescription className="font-semibold text-purple-800">
              Diese Bereiche sind für dich vorübergehend kostenlos freigeschaltet und werden nicht verrechnet.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {activeTrials.map((trial) => {
              const module = modules.find((item) => item.code === trial.module_code)

              return (
                <div
                  key={trial.id}
                  className="flex flex-col gap-1 rounded-xl border border-purple-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="font-black text-purple-900">
                    {module?.name || trial.module_code}
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit rounded-full border-purple-200 bg-purple-50 text-purple-700"
                  >
                    TEST bis{" "}
                    {new Date(`${trial.ends_on}T00:00:00`).toLocaleDateString("de-AT")}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 1 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>1. Abrechnung & Zahlungsart</CardTitle>
            <CardDescription>
              Monatliche Zahlung ist ausschließlich über Stripe möglich.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Abrechnung</Label>
                <Select
                  value={billingCycle}
                  onValueChange={(value) => handleBillingCycleChange(value as BillingCycle)}
                  disabled={!!pendingRequest}
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
                  disabled={!!pendingRequest}
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
            </div>

            {billingCycle === "monthly" ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                Monatliche Abrechnung läuft automatisch über Stripe. Nach erfolgreicher Zahlung wird dein Paket freigeschaltet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 2 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>2. Dein Paket</CardTitle>
            <CardDescription>
              {pendingRequest
                ? "Die Schalter zeigen den beantragten Zielstand. Dein bisheriges Paket bleibt bis zur Bestätigung gültig."
                : "Die Grundmitgliedschaft ist verpflichtend. E-Dart und Steeldart aktivieren automatisch die Premium App."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {modules.map((module) => {
              const checked = selectedModuleIds.has(module.id)
              const isBase = module.is_required_base
              const isCurrentlyActive = membershipRows.some((row) => row.module_id === module.id)

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

                        {pendingRequest ? (
                          isCurrentlyActive && checked ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-green-200 bg-green-50 text-green-700"
                            >
                              Bleibt aktiv
                            </Badge>
                          ) : isCurrentlyActive && !checked ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-red-200 bg-red-50 text-red-700"
                            >
                              Wird deaktiviert
                            </Badge>
                          ) : !isCurrentlyActive && checked ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-blue-200 bg-blue-50 text-blue-700"
                            >
                              Wird aktiviert
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-full border-gray-200 bg-gray-50 text-gray-500"
                            >
                              Nicht aktiv
                            </Badge>
                          )
                        ) : isCurrentlyActive && checked ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-green-200 bg-green-50 text-green-700"
                          >
                            Aktuell aktiv
                          </Badge>
                        ) : isCurrentlyActive && !checked ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-red-200 bg-red-50 text-red-700"
                          >
                            Wird deaktiviert
                          </Badge>
                        ) : !isCurrentlyActive && checked ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-blue-200 bg-blue-50 text-blue-700"
                          >
                            Wird aktiviert
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-full border-gray-200 bg-gray-50 text-gray-500"
                          >
                            Nicht aktiv
                          </Badge>
                        )}
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
                      disabled={!!pendingRequest || isBase}
                      onCheckedChange={(value) => toggleModule(module, value)}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 3 && membership && hasChanges && paymentDue === 0 && !pendingRequest ? (
        <Card className="rounded-2xl border border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="font-black text-green-900">Keine zusätzliche Zahlung erforderlich</div>
            <p className="mt-1 text-sm font-semibold text-green-800">
              {paymentMethod === "stripe"
                ? "Du entfernst nur Leistungen oder wechselst auf ein gleich teures/günstigeres Paket. Es ist keine zusätzliche Zahlung erforderlich. Dein bestehendes Stripe-Abo wird beim Abschluss direkt angepasst."
                : "Du entfernst nur Leistungen oder wechselst auf ein gleich teures/günstigeres Paket. Es ist keine zusätzliche Zahlung erforderlich. Die Änderung kann vom Verein bestätigt werden."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 3 && showPaymentSection ? (
        <Card className="rounded-2xl border border-orange-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {paymentMethod === "transfer" ? (
                <Landmark className="h-5 w-5 text-orange-600" />
              ) : paymentMethod === "cash" ? (
                <Banknote className="h-5 w-5 text-orange-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-orange-600" />
              )}
              So zahlst du
            </CardTitle>
            <CardDescription>
              {pendingRequest?.payment_status === "paid"
                ? "Deine Zahlung wurde bestätigt. Das Paket wartet noch auf Freigabe."
                : membership
                  ? "Du bezahlst bei einer Erweiterung nur den Unterschied zu deinem bereits bezahlten Paket."
                  : "Dein Paket wird nach bestätigtem Zahlungseingang freigeschaltet."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-orange-700">
                {membership ? "Zusätzlich zu zahlen" : "Zu zahlen"}
              </div>
              <div className="mt-1 text-2xl font-black text-gray-900">
                {billingCycle === "monthly"
                  ? `${formatEUR(paymentMonthlyDue)} / Monat`
                  : `${formatEUR(paymentAnnualDue)} / Jahr`}
              </div>

              {membership ? (
                <div className="mt-2 text-xs font-semibold text-gray-600">
                  Bereits bezahltes Paket:{" "}
                  <span className="font-black">
                    {billingCycle === "monthly"
                      ? `${formatEUR(currentMonthlyTotal)} / Monat`
                      : `${formatEUR(currentAnnualTotal)} / Jahr`}
                  </span>
                  {" "}· Neues Paket:{" "}
                  <span className="font-black">
                    {billingCycle === "monthly"
                      ? `${formatEUR(pendingRequest ? pendingRequest.monthly_total : monthlyTotal)} / Monat`
                      : `${formatEUR(pendingRequest ? pendingRequest.annual_total : annualTotal)} / Jahr`}
                  </span>
                </div>
              ) : null}
            </div>

            {paymentMethod === "cash" ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-black text-gray-900">Bar im Vereinslokal bezahlen</div>
                <p className="mt-2 text-sm font-semibold text-gray-600">
                  {pendingRequest?.payment_status === "paid"
                    ? "Deine Barzahlung wurde bereits bestätigt. Es ist keine weitere Zahlung nötig – die Freigabe des Pakets ist noch ausständig."
                    : paymentDue > 0
                      ? `Bitte bezahle den zusätzlich offenen Betrag von ${formatEUR(paymentDue)} direkt im Vereinslokal. Sobald die Barzahlung vom Verein bestätigt wurde, wird deine Mitgliedschaft bzw. Paketänderung freigeschaltet.`
                      : "Für diese Änderung ist keine zusätzliche Zahlung erforderlich."}
                </p>

                <Badge
                  variant="outline"
                  className={
                    pendingRequest?.payment_status === "paid"
                      ? "mt-3 rounded-full border-green-300 bg-green-50 text-green-800"
                      : "mt-3 rounded-full border-amber-300 bg-amber-50 text-amber-800"
                  }
                >
                  {pendingRequest?.payment_status === "paid"
                    ? "Zahlung erhalten ✓ – Freigabe ausständig"
                    : membership?.status === "active" && !pendingRequest
                      ? "Paket freigeschaltet ✓"
                      : "Zahlung / Freigabe ausständig"}
                </Badge>
              </div>
            ) : paymentMethod === "transfer" ? (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-black text-gray-900">Per Überweisung bezahlen</div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Empfänger
                    </div>
                    <div className="mt-1 font-black text-gray-900">{CLUB_ACCOUNT_HOLDER}</div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      IBAN
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono font-black text-gray-900">{CLUB_IBAN}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg px-2"
                        onClick={() => navigator.clipboard?.writeText(CLUB_IBAN)}
                        title="IBAN kopieren"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      BIC
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono font-black text-gray-900">{CLUB_BIC}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg px-2"
                        onClick={() => navigator.clipboard?.writeText(CLUB_BIC)}
                        title="BIC kopieren"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Verwendungszweck
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {buildMembershipPaymentReference(playerName)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2"
                      onClick={() =>
                        navigator.clipboard?.writeText(buildMembershipPaymentReference(playerName))
                      }
                      title="Verwendungszweck kopieren"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Gebuchtes Zielpaket
                  </div>

                  <div className="mt-2 space-y-2">
                    {paymentTargetModules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="font-bold text-gray-800">{module.name}</span>
                        <span className="shrink-0 font-black text-gray-900">
                          {billingCycle === "monthly"
                            ? `${formatEUR(module.monthly_price)} / Monat`
                            : `${formatEUR(module.annual_price)} / Jahr`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 border-t border-gray-200 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-gray-900">Paket gesamt</span>
                      <span className="font-black text-gray-900">
                        {billingCycle === "monthly"
                          ? `${formatEUR(pendingRequest ? pendingRequest.monthly_total : monthlyTotal)} / Monat`
                          : `${formatEUR(pendingRequest ? pendingRequest.annual_total : annualTotal)} / Jahr`}
                      </span>
                    </div>

                    {membership ? (
                      <div className="mt-1 flex items-center justify-between gap-3 text-orange-700">
                        <span className="font-bold">Jetzt zusätzlich offen</span>
                        <span className="font-black">{formatEUR(paymentDue)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!pendingRequest ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                    Bitte zuerst unten auf „Paket verbindlich anfragen“ klicken. Dadurch wird die genaue Modulauswahl
                    für die Vereinsleitung gespeichert. Danach kannst du die Überweisung durchführen.
                  </div>
                ) : null}

                <p className="text-sm font-semibold text-gray-600">
                  {pendingRequest?.payment_status === "paid"
                    ? "Deine Überweisung wurde bereits bestätigt. Es ist keine weitere Zahlung nötig – die Freigabe des Pakets ist noch ausständig."
                    : paymentDue > 0
                      ? `Bitte überweise nur den zusätzlich offenen Betrag von ${formatEUR(paymentDue)}. Sobald der Zahlungseingang beim Verein bestätigt wurde, wird deine Mitgliedschaft bzw. Paketänderung freigeschaltet.`
                      : "Für diese Änderung ist keine zusätzliche Zahlung erforderlich."}
                </p>

                <Badge
                  variant="outline"
                  className={
                    pendingRequest?.payment_status === "paid"
                      ? "rounded-full border-green-300 bg-green-50 text-green-800"
                      : "rounded-full border-amber-300 bg-amber-50 text-amber-800"
                  }
                >
                  {pendingRequest?.payment_status === "paid"
                    ? "Überweisung erhalten ✓ – Freigabe ausständig"
                    : membership?.status === "active" && !pendingRequest
                      ? "Paket freigeschaltet ✓"
                      : "Überweisung / Freigabe ausständig"}
                </Badge>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="font-black text-gray-900">
                  {membership ? "Stripe-Paketänderung" : "Stripe-Zahlung"}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-600">
                  {membership
                    ? "Dein bestehendes Stripe-Abo wird direkt angepasst. Es wird kein zweites Abo erstellt."
                    : "Beim Abschluss wird Stripe automatisch geöffnet. Nach erfolgreicher Zahlung wird deine Mitgliedschaft freigeschaltet."}
                </p>

                {pendingRequest?.payment_status === "paid" ? (
                  <Badge
                    variant="outline"
                    className="mt-3 rounded-full border-green-300 bg-green-50 text-green-800"
                  >
                    Zahlung erfolgreich ✓
                  </Badge>
                ) : pendingRequest ? (
                  <Button
                    type="button"
                    onClick={() => void startStripeCheckout(pendingRequest.id)}
                    disabled={checkoutLoading}
                    className="mt-4 h-11 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {checkoutLoading
                      ? membership
                        ? "Stripe-Abo wird angepasst..."
                        : "Stripe wird geöffnet..."
                      : membership
                        ? "Paketänderung mit Stripe abschließen"
                        : "Mitgliedschaft mit Stripe abschließen"}
                  </Button>
                ) : (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-800">
                    {membership
                      ? "Klicke unten auf „Paketänderung mit Stripe bestätigen“. Die Änderung wird gespeichert und anschließend direkt über dein bestehendes Stripe-Abo verrechnet."
                      : "Klicke unten auf „Mitgliedschaft mit Stripe abschließen“. Danach öffnet sich Stripe automatisch."}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {membership && showCancelForm && !hasScheduledCancellation ? (
        <Card className="rounded-2xl border border-red-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <CalendarX className="h-5 w-5" />
              Mitgliedschaft kündigen
            </CardTitle>
            <CardDescription>
              Damit wird die komplette Grundmitgliedschaft inklusive aller Zusatzmodule beendet. Einzelne Module änderst du über „Paket ändern“.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="space-y-2">
                <Label>Gewünschtes Kündigungsdatum</Label>
                <input
                  type="date"
                  value={cancelEndOn}
                  onChange={(event) => setCancelEndOn(event.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Grund / Notiz (optional)</Label>
                <Textarea
                  value={cancelNote}
                  onChange={(event) => setCancelNote(event.target.value)}
                  placeholder="Optionaler Hinweis an die Vereinsleitung..."
                  className="min-h-24 rounded-xl"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCancelForm(false)
                    setCancelEndOn("")
                    setCancelNote("")
                  }}
                  className="rounded-xl"
                >
                  Abbrechen
                </Button>

                <Button
                  type="button"
                  onClick={submitCancellation}
                  disabled={submitting || !cancelEndOn}
                  className="rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarX className="mr-2 h-4 w-4" />
                  )}
                  Kündigung anfragen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 1 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-black text-gray-900">Zahlungsweise</div>
              <div className="mt-1 text-sm font-semibold text-gray-600">
                {billingCycle === "monthly" ? "Monatlich" : "Jährlich"} · {paymentLabel(paymentMethod)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {membership ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageEditor(false)
                    setMessage(null)
                  }}
                  className="h-11 rounded-xl"
                >
                  Zur Übersicht
                </Button>
              ) : null}

              <Button
                type="button"
                onClick={() => setWizardStep(2)}
                className="h-11 rounded-xl bg-orange-600 px-6 font-black text-white hover:bg-orange-700"
              >
                Weiter zum Paket
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 2 ? (
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-gray-500">
                  Dein neues Paket
                </div>
                <div className="mt-2 text-3xl font-black text-gray-900">
                  {billingCycle === "monthly"
                    ? `${formatEUR(monthlyTotal)} / Monat`
                    : `${formatEUR(annualTotal)} / Jahr`}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedModules.map((module) => (
                    <Badge key={module.id} variant="outline" className="rounded-full">
                      {module.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep(1)}
                  className="h-11 rounded-xl"
                >
                  Zurück
                </Button>
                <Button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="h-11 rounded-xl bg-orange-600 px-6 font-black text-white hover:bg-orange-700"
                >
                  Weiter zur Zusammenfassung
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showPackageEditor && !isPendingCancellation && wizardStep === 3 ? (
        <Card className="rounded-2xl border border-orange-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-orange-700">
                  Zusammenfassung
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs font-black uppercase text-gray-500">Aktuell</div>
                    <div className="mt-1 text-xl font-black text-gray-900">
                      {membership
                        ? billingCycle === "monthly"
                          ? `${formatEUR(currentMonthlyTotal)} / Monat`
                          : `${formatEUR(currentAnnualTotal)} / Jahr`
                        : "Keine aktive Mitgliedschaft"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                    <div className="text-xs font-black uppercase text-orange-700">Neu</div>
                    <div className="mt-1 text-xl font-black text-gray-900">
                      {billingCycle === "monthly"
                        ? `${formatEUR(monthlyTotal)} / Monat`
                        : `${formatEUR(annualTotal)} / Jahr`}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-black uppercase text-blue-700">
                      {membership ? "Zusätzlich" : "Zu zahlen"}
                    </div>
                    <div className="mt-1 text-xl font-black text-gray-900">
                      {membership
                        ? billingCycle === "monthly"
                          ? `${formatEUR(paymentMonthlyDue)} / Monat`
                          : `${formatEUR(paymentAnnualDue)} / Jahr`
                        : billingCycle === "monthly"
                          ? `${formatEUR(monthlyTotal)} / Monat`
                          : `${formatEUR(annualTotal)} / Jahr`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedModules.map((module) => (
                    <Badge key={module.id} className="rounded-full bg-green-600 text-white">
                      ✓ {module.name}
                    </Badge>
                  ))}
                </div>

                {paymentMethod === "stripe" && membership ? (
                  <p className="mt-4 text-sm font-semibold text-gray-600">
                    Dein bestehendes Stripe-Abo wird angepasst. Es wird kein zweites Abo erstellt.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {!pendingRequest ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWizardStep(2)}
                    className="h-12 rounded-xl"
                  >
                    Zurück
                  </Button>
                ) : null}

                {!pendingRequest ? (
                  <Button
                    type="button"
                    onClick={submitRequest}
                    disabled={submitting || !hasChanges}
                    className="h-12 rounded-xl bg-orange-600 px-6 font-black text-white hover:bg-orange-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird verarbeitet...
                      </>
                    ) : paymentMethod === "stripe" ? (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {membership
                          ? "Paketänderung mit Stripe bestätigen"
                          : "Mitgliedschaft mit Stripe abschließen"}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Paket verbindlich anfragen
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                    {paymentMethod === "stripe"
                      ? "Die Änderung ist bereits vorbereitet. Schließe die Stripe-Zahlung oben ab."
                      : "Die Anfrage wurde bereits gesendet."}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

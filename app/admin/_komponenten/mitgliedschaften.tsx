"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle,
  Banknote,
  CalendarX,
  CheckCircle2,
  Clock3,
  CreditCard,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react"
import { cn } from "@/lib/utils"

type BillingCycle = "monthly" | "semiannual" | "annual"
type PaymentMethod = "stripe" | "transfer" | "cash"
type MembershipStatus = "pending" | "active" | "paused" | "cancelled" | "expired"
type AdminTab = "payments" | "members" | "trials" | "cancellations"

type ClubPlayer = {
  id: string
  name: string
  email: string | null
  is_active: boolean | null
  club_left_at: string | null
}

type MembershipModule = {
  id: string
  code: string
  name: string
  is_required_base: boolean
}

type Membership = {
  id: string
  player_id: string
  billing_cycle: BillingCycle
  payment_method: PaymentMethod
  status: MembershipStatus
  starts_on: string
  ends_on: string | null
  stripe_status: string | null
  stripe_subscription_id: string | null
  created_at: string
}

type MembershipModuleRow = {
  membership_id: string
  module_id: string
  monthly_price_snapshot: number
  semiannual_price_snapshot: number
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
  payment_status: "pending" | "paid"
  paid_at: string | null
  monthly_total: number
  semiannual_total: number
  annual_total: number
  starts_on: string | null
  note: string | null
  created_at: string
}

type ChangeRequestModule = {
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
}

interface AdminMembershipManagementProps {
  user: User | null
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatEUR(value: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(Number(value || 0))
}

function cycleLabel(cycle: BillingCycle) {
  if (cycle === "monthly") return "Monatlich"
  if (cycle === "semiannual") return "Halbjährlich"
  return "Jährlich"
}

function paymentLabel(method: PaymentMethod) {
  if (method === "stripe") return "Stripe"
  if (method === "transfer") return "Überweisung"
  return "Bar"
}

function requestAmount(request: ChangeRequest) {
  if (request.billing_cycle === "monthly") return request.monthly_total
  if (request.billing_cycle === "semiannual") return request.semiannual_total
  return request.annual_total
}

function statusBadge(status: MembershipStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "pending") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

export function AdminMembershipManagement({ user }: AdminMembershipManagementProps) {
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState("")
  const [tab, setTab] = useState<AdminTab>("payments")
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [modules, setModules] = useState<MembershipModule[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [membershipRows, setMembershipRows] = useState<MembershipModuleRow[]>([])
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [requestRows, setRequestRows] = useState<ChangeRequestModule[]>([])
  const [trials, setTrials] = useState<MembershipTrial[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [
        { data: playerData, error: playerError },
        { data: moduleData, error: moduleError },
        { data: membershipData, error: membershipError },
        { data: membershipRowData, error: membershipRowError },
        { data: requestData, error: requestError },
        { data: requestRowData, error: requestRowError },
        { data: trialData, error: trialError },
      ] = await Promise.all([
        supabase.from("club_players").select("id,name,email,is_active,club_left_at").order("name"),
        supabase.from("membership_modules").select("id,code,name,is_required_base").eq("is_active", true).order("sort_order"),
        supabase
          .from("member_memberships")
          .select("id,player_id,billing_cycle,payment_method,status,starts_on,ends_on,stripe_status,stripe_subscription_id,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("member_membership_modules")
          .select("membership_id,module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot"),
        supabase
          .from("membership_change_requests")
          .select("id,player_id,current_membership_id,billing_cycle,payment_method,requested_status,request_type,requested_end_on,payment_status,paid_at,monthly_total,semiannual_total,annual_total,starts_on,note,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("membership_change_request_modules")
          .select("request_id,module_id,monthly_price_snapshot,semiannual_price_snapshot,annual_price_snapshot"),
        supabase
          .from("membership_trials")
          .select("id,player_id,module_code,starts_on,ends_on,status,note")
          .order("ends_on", { ascending: true }),
      ])

      if (playerError) throw playerError
      if (moduleError) throw moduleError
      if (membershipError) throw membershipError
      if (membershipRowError) throw membershipRowError
      if (requestError) throw requestError
      if (requestRowError) throw requestRowError
      if (trialError) throw trialError

      setPlayers((playerData || []) as ClubPlayer[])
      setModules((moduleData || []) as MembershipModule[])
      setMemberships((membershipData || []) as Membership[])
      setMembershipRows(
        ((membershipRowData || []) as any[]).map((row) => ({
          ...row,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })),
      )
      setRequests(
        ((requestData || []) as any[]).map((row) => ({
          ...row,
          monthly_total: Number(row.monthly_total || 0),
          semiannual_total: Number(row.semiannual_total || 0),
          annual_total: Number(row.annual_total || 0),
        })),
      )
      setRequestRows(
        ((requestRowData || []) as any[]).map((row) => ({
          ...row,
          monthly_price_snapshot: Number(row.monthly_price_snapshot || 0),
          semiannual_price_snapshot: Number(row.semiannual_price_snapshot || 0),
          annual_price_snapshot: Number(row.annual_price_snapshot || 0),
        })),
      )
      setTrials((trialData || []) as MembershipTrial[])
    } catch (error: any) {
      console.error("admin membership load error:", error)
      setMessage({ type: "error", text: error?.message || "Mitgliedschaften konnten nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void loadData()
  }, [user?.id])

  const playerById = (id: string) => players.find((player) => player.id === id) || null

  const openPayments = useMemo(
    () => requests.filter((request) => request.requested_status === "pending" && request.request_type === "change"),
    [requests],
  )

  const openCancellations = useMemo(
    () => requests.filter((request) => request.requested_status === "pending" && request.request_type === "cancel"),
    [requests],
  )

  const activeTrials = useMemo(
    () => trials.filter((trial) => trial.status === "active" && trial.ends_on >= todayISO()),
    [trials],
  )

  const currentMemberships = useMemo(() => {
    const byPlayer = new Map<string, Membership>()
    for (const membership of memberships) {
      if (!byPlayer.has(membership.player_id) && ["active", "paused", "pending"].includes(membership.status)) {
        byPlayer.set(membership.player_id, membership)
      }
    }
    return Array.from(byPlayer.values())
  }, [memberships])

  const filteredMemberships = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return currentMemberships
    return currentMemberships.filter((membership) => {
      const player = playerById(membership.player_id)
      return `${player?.name || ""} ${player?.email || ""}`.toLowerCase().includes(q)
    })
  }, [currentMemberships, search, players])

  const moduleNamesForMembership = (membershipId: string) => {
    const ids = membershipRows.filter((row) => row.membership_id === membershipId).map((row) => row.module_id)
    return modules.filter((module) => ids.includes(module.id)).map((module) => module.name)
  }

  const moduleNamesForRequest = (requestId: string) => {
    const ids = requestRows.filter((row) => row.request_id === requestId).map((row) => row.module_id)
    return modules.filter((module) => ids.includes(module.id)).map((module) => module.name)
  }

  const manualAmountDue = (request: ChangeRequest) => {
    const requested = requestAmount(request)
    if (!request.current_membership_id) return requested

    const currentMembership = memberships.find((membership) => membership.id === request.current_membership_id)
    if (!currentMembership || currentMembership.billing_cycle !== request.billing_cycle) return requested

    const rows = membershipRows.filter((row) => row.membership_id === request.current_membership_id)
    const current = rows.reduce((sum, row) => {
      if (request.billing_cycle === "monthly") return sum + Number(row.monthly_price_snapshot || 0)
      if (request.billing_cycle === "semiannual") return sum + Number(row.semiannual_price_snapshot || 0)
      return sum + Number(row.annual_price_snapshot || 0)
    }, 0)

    return Math.max(0, requested - current)
  }

  const approveManualPayment = async (request: ChangeRequest) => {
    if (!user) return
    if (request.payment_method === "stripe") {
      setMessage({ type: "info", text: "Stripe-Zahlungen werden ausschließlich automatisch verarbeitet." })
      return
    }

    try {
      setWorkingId(request.id)
      setMessage(null)

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Sitzung abgelaufen. Bitte neu anmelden.")

      const response = await fetch("/api/membership/approve-manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: request.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Zahlung konnte nicht bestätigt werden.")

      await loadData()
      const player = playerById(request.player_id)
      setMessage({ type: "success", text: `Zahlung von ${player?.name || "dem Mitglied"} wurde bestätigt und die Mitgliedschaft freigeschaltet.` })
    } catch (error: any) {
      console.error("manual membership approval error:", error)
      setMessage({ type: "error", text: error?.message || "Zahlung konnte nicht bestätigt werden." })
    } finally {
      setWorkingId("")
    }
  }

  const rejectRequest = async (request: ChangeRequest) => {
    if (!user || request.payment_method === "stripe") return
    try {
      setWorkingId(request.id)
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("membership_change_requests")
        .update({ requested_status: "rejected", reviewed_by: user.id, reviewed_at: now, updated_at: now })
        .eq("id", request.id)
        .eq("requested_status", "pending")
      if (error) throw error
      await loadData()
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Anfrage konnte nicht abgelehnt werden." })
    } finally {
      setWorkingId("")
    }
  }

  const approveCancellation = async (request: ChangeRequest) => {
    if (!user) return
    try {
      setWorkingId(request.id)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Sitzung abgelaufen. Bitte neu anmelden.")

      const response = await fetch("/api/stripe/cancel-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: request.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Kündigung konnte nicht verarbeitet werden.")
      await loadData()
      setMessage({ type: "success", text: "Kündigung wurde bestätigt." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Kündigung konnte nicht bestätigt werden." })
    } finally {
      setWorkingId("")
    }
  }

  const endTrialsForPlayer = async (playerId: string) => {
    try {
      setWorkingId(`trial-${playerId}`)
      const { error } = await supabase
        .from("membership_trials")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("player_id", playerId)
        .eq("status", "active")
      if (error) throw error
      await loadData()
      setMessage({ type: "success", text: "Testphase wurde beendet. Der Spieler kann jetzt selbst eine Mitgliedschaft buchen." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Testphase konnte nicht beendet werden." })
    } finally {
      setWorkingId("")
    }
  }

  const trialPlayers = useMemo(() => {
    const grouped = new Map<string, MembershipTrial[]>()
    for (const trial of activeTrials) grouped.set(trial.player_id, [...(grouped.get(trial.player_id) || []), trial])
    return Array.from(grouped.entries())
  }, [activeTrials])

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-orange-600" />
        <span className="font-semibold text-slate-600">Mitgliedschaften werden geladen…</span>
      </div>
    )
  }

  const tabs: Array<{ id: AdminTab; label: string; count: number }> = [
    { id: "payments", label: "Offene Zahlungen", count: openPayments.length },
    { id: "members", label: "Mitglieder", count: currentMemberships.length },
    { id: "trials", label: "Testphasen", count: trialPlayers.length },
    { id: "cancellations", label: "Kündigungen", count: openCancellations.length },
  ]

  return (
    <div className="w-full space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.75)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">Vereinsverwaltung</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Mitgliedschaften</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              Spieler buchen selbst. Hier bestätigst du nur Bar- und Überweisungszahlungen, verwaltest Testphasen und bearbeitest Kündigungen.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadData()} className="h-11 rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white">
            <RefreshCw className="mr-2 h-4 w-4" /> Neu laden
          </Button>
        </div>
      </section>

      {message ? (
        <div className={cn(
          "rounded-2xl border px-4 py-3 text-sm font-bold",
          message.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
          message.type === "error" && "border-red-200 bg-red-50 text-red-800",
          message.type === "info" && "border-blue-200 bg-blue-50 text-blue-800",
        )}>{message.text}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Offene Zahlungen" value={openPayments.filter((r) => r.payment_method !== "stripe").length} tone="orange" />
        <Metric icon={Users} label="Aktive / laufende" value={currentMemberships.length} tone="slate" />
        <Metric icon={Gift} label="Aktive Testphasen" value={trialPlayers.length} tone="purple" />
        <Metric icon={CalendarX} label="Offene Kündigungen" value={openCancellations.length} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition",
              tab === item.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {item.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", tab === item.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600")}>{item.count}</span>
          </button>
        ))}
      </div>

      {tab === "payments" ? (
        <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-orange-600" /> Offene Zahlungen</CardTitle>
            <CardDescription>Stripe ist rein automatisch. Nur Bar und Überweisung werden hier manuell bestätigt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {openPayments.length === 0 ? <Empty text="Keine offenen Mitgliedschaftszahlungen." /> : openPayments.map((request) => {
              const player = playerById(request.player_id)
              const isStripe = request.payment_method === "stripe"
              const working = workingId === request.id
              return (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-slate-950">{player?.name || "Unbekanntes Mitglied"}</div>
                        <Badge variant="outline" className="rounded-full">{cycleLabel(request.billing_cycle)}</Badge>
                        <Badge variant="outline" className={cn("rounded-full", isStripe ? "border-blue-200 bg-blue-50 text-blue-700" : "border-orange-200 bg-orange-50 text-orange-700")}>
                          {isStripe ? <CreditCard className="mr-1 h-3 w-3" /> : <Banknote className="mr-1 h-3 w-3" />}
                          {paymentLabel(request.payment_method)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{formatEUR(manualAmountDue(request))}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {moduleNamesForRequest(request.id).map((name) => <Badge key={name} variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">{name}</Badge>)}
                      </div>
                    </div>
                    {isStripe ? (
                      <div className="max-w-md rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                        <ShieldCheck className="mr-2 inline h-4 w-4" /> Automatisch durch Stripe – keine Admin-Aktion möglich.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" disabled={working} onClick={() => void rejectRequest(request)} className="rounded-xl">Ablehnen</Button>
                        <Button disabled={working} onClick={() => void approveManualPayment(request)} className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700">
                          {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Zahlung erhalten & freischalten
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {tab === "members" ? (
        <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><CardTitle>Mitgliederübersicht</CardTitle><CardDescription>Nur Übersicht – Mitgliedschaften werden vom Spieler gebucht.</CardDescription></div>
              <div className="relative w-full md:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder E-Mail…" className="rounded-xl pl-9" /></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {filteredMemberships.length === 0 ? <Empty text="Keine passenden Mitgliedschaften gefunden." /> : filteredMemberships.map((membership) => {
              const player = playerById(membership.player_id)
              const names = moduleNamesForMembership(membership.id)
              return (
                <div key={membership.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><div className="font-black text-slate-950">{player?.name || "Unbekannt"}</div><Badge variant="outline" className={cn("rounded-full", statusBadge(membership.status))}>{membership.status === "active" ? "Aktiv" : membership.status}</Badge></div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">{player?.email || "Keine E-Mail"}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">{names.map((name) => <Badge key={name} variant="outline" className="rounded-full">{name}</Badge>)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge variant="outline" className="rounded-full">{cycleLabel(membership.billing_cycle)}</Badge>
                      <Badge variant="outline" className={cn("rounded-full", membership.payment_method === "stripe" && "border-blue-200 bg-blue-50 text-blue-700")}>{paymentLabel(membership.payment_method)}</Badge>
                      {membership.payment_method === "stripe" ? <Badge className="rounded-full bg-blue-600 text-white">automatisch verwaltet</Badge> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {tab === "trials" ? (
        <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-purple-600" /> Testphasen</CardTitle><CardDescription>Testzugänge bleiben vollständig getrennt von bezahlten Mitgliedschaften.</CardDescription></CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {trialPlayers.length === 0 ? <Empty text="Keine aktiven Testphasen." /> : trialPlayers.map(([playerId, playerTrials]) => {
              const player = playerById(playerId)
              const working = workingId === `trial-${playerId}`
              return (
                <div key={playerId} className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div><div className="font-black text-slate-950">{player?.name || "Unbekannt"}</div><div className="mt-1 text-sm font-semibold text-slate-500">bis {new Date(`${playerTrials[0].ends_on}T00:00:00`).toLocaleDateString("de-AT")}</div><div className="mt-2 flex flex-wrap gap-1.5">{playerTrials.map((trial) => <Badge key={trial.id} variant="outline" className="rounded-full border-purple-200 bg-white text-purple-700">{modules.find((m) => m.code === trial.module_code)?.name || trial.module_code}</Badge>)}</div></div>
                    <Button variant="outline" disabled={working} onClick={() => void endTrialsForPlayer(playerId)} className="rounded-xl border-purple-200 bg-white">{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Testphase beenden</Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {tab === "cancellations" ? (
        <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-2"><CalendarX className="h-5 w-5 text-red-600" /> Kündigungen</CardTitle><CardDescription>Stripe-Abos werden beim Bestätigen automatisch mitbeendet bzw. terminiert.</CardDescription></CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {openCancellations.length === 0 ? <Empty text="Keine offenen Kündigungen." /> : openCancellations.map((request) => {
              const player = playerById(request.player_id)
              const working = workingId === request.id
              return (
                <div key={request.id} className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div><div className="font-black text-slate-950">{player?.name || "Unbekannt"}</div><div className="mt-1 text-sm font-semibold text-red-700">Gewünschtes Ende: {request.requested_end_on ? new Date(`${request.requested_end_on}T00:00:00`).toLocaleDateString("de-AT") : "—"}</div>{request.note ? <div className="mt-1 text-sm text-slate-600">{request.note}</div> : null}</div>
                    <Button disabled={working} onClick={() => void approveCancellation(request)} className="rounded-xl bg-red-600 font-black text-white hover:bg-red-700">{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarX className="mr-2 h-4 w-4" />}Kündigung bestätigen</Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">{text}</div>
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "orange" | "slate" | "purple" | "red" }) {
  const toneClass = {
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
  }[tone]
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm font-bold text-slate-500">{label}</div><div className="mt-1 text-3xl font-black text-slate-950">{value}</div></div><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", toneClass)}><Icon className="h-5 w-5" /></div></CardContent></Card>
  )
}

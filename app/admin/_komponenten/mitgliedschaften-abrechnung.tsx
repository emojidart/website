"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Coins,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ReceiptText,
  WalletCards,
  CheckCircle2,
  CircleAlert,
  Undo2,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type MembershipAccountingPayment = {
  id: string
  player_id: string
  player_name: string
  player_email: string | null
  membership_id: string | null
  change_request_id: string | null
  paid_at: string
  amount_cents: number
  currency: string
  interval: string | null
  period_start: string | null
  period_end: string | null
  notes: string | null
  payment_method: "stripe" | "cash" | "transfer" | "manual"
  source: "stripe_invoice" | "manual_confirmation" | "legacy"
  status: "paid" | "refunded" | "void" | "failed"
  billing_cycle: "monthly" | "semiannual" | "annual" | null
  fee_cents: number
  net_amount_cents: number | null
  receipt_no: string | null
  stripe_invoice_id: string | null
  stripe_invoice_number: string | null
  stripe_invoice_pdf_url: string | null
  stripe_hosted_invoice_url: string | null
  stripe_payment_intent_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  line_items: Array<{
    module_id?: string | null
    code?: string | null
    name?: string | null
    description?: string | null
    amount_cents?: number | null
    quantity?: number | null
  }>
}

export type WalletTopupAccountingRow = {
  id: string
  player_id: string
  player_name: string
  player_email: string | null
  credit_amount: number | string
  fee_charged: number | string
  gross_amount: number | string
  actual_stripe_fee: number | string | null
  actual_stripe_net: number | string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_event_id: string | null
  status: string
  created_at: string
  paid_at: string | null
  updated_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
}

function formatMoney(cents: number | null | undefined, currency = "EUR") {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(Number(cents || 0) / 100)
}

function paymentMethodLabel(method: MembershipAccountingPayment["payment_method"]) {
  if (method === "stripe") return "Stripe"
  if (method === "transfer") return "Überweisung"
  if (method === "cash") return "Bar"
  return "Manuell"
}

function cycleLabel(cycle: MembershipAccountingPayment["billing_cycle"] | string | null) {
  if (cycle === "monthly") return "Monatlich"
  if (cycle === "semiannual") return "Halbjährlich"
  if (cycle === "annual") return "Jährlich"
  return "–"
}

function dateLabel(value?: string | null) {
  if (!value) return "–"
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "–"
  return date.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "–"
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "–"
  return date.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function printPaymentReceipt(payment: MembershipAccountingPayment) {
  const popup = window.open("", "_blank", "width=920,height=1100")
  if (!popup) return

  const itemRows = (payment.line_items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name || item.description || "Mitgliedschaft")}</td>
          <td class="right">${escapeHtml(formatMoney(item.amount_cents || 0, payment.currency))}</td>
        </tr>`,
    )
    .join("")

  const officialStripe = payment.stripe_invoice_number
    ? `<div><strong>Stripe-Rechnung:</strong> ${escapeHtml(payment.stripe_invoice_number)}</div>`
    : ""

  popup.document.write(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(payment.receipt_no || "Zahlungsbeleg")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; background: #fff; }
  .sheet { width: 100%; max-width: 820px; margin: 0 auto; padding: 42px; }
  .head { display:flex; justify-content:space-between; gap:28px; border-bottom:3px solid #ea580c; padding-bottom:22px; }
  .brand { font-size:26px; font-weight:800; }
  .muted { color:#6b7280; font-size:12px; line-height:1.55; }
  h1 { font-size:28px; margin:30px 0 8px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 28px; margin:24px 0; }
  .box { border:1px solid #e5e7eb; border-radius:10px; padding:14px; }
  .label { font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:.08em; }
  .value { margin-top:5px; font-size:15px; font-weight:700; }
  table { width:100%; border-collapse:collapse; margin-top:24px; }
  th, td { padding:11px 8px; border-bottom:1px solid #e5e7eb; text-align:left; font-size:13px; }
  th { color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
  .right { text-align:right; }
  .total { display:flex; justify-content:flex-end; margin-top:22px; }
  .totalbox { min-width:300px; background:#111827; color:#fff; border-radius:12px; padding:18px; }
  .totalrow { display:flex; justify-content:space-between; margin:6px 0; }
  .grand { font-size:20px; font-weight:800; border-top:1px solid #4b5563; padding-top:10px; margin-top:10px; }
  .footer { margin-top:42px; padding-top:18px; border-top:1px solid #e5e7eb; }
  @media print { .sheet { padding: 12mm; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <div class="brand">Emoj!\`s Dart Verein</div>
      <div class="muted">Buchhaltungsbeleg Mitgliedschaft</div>
    </div>
    <div class="muted" style="text-align:right">
      <div><strong>Belegnummer:</strong> ${escapeHtml(payment.receipt_no || payment.id)}</div>
      ${officialStripe}
      <div><strong>Zahlungsdatum:</strong> ${escapeHtml(dateTimeLabel(payment.paid_at))}</div>
    </div>
  </div>

  <h1>${payment.payment_method === "stripe" ? "Zahlungsübersicht" : "Zahlungsbeleg"}</h1>
  <div class="muted">Dieser interne Beleg dokumentiert den Zahlungseingang in der Vereinsverwaltung. Bei Stripe-Zahlungen ist die offizielle Stripe-Rechnung maßgeblich.</div>

  <div class="grid">
    <div class="box"><div class="label">Mitglied</div><div class="value">${escapeHtml(payment.player_name)}</div><div class="muted">${escapeHtml(payment.player_email || "")}</div></div>
    <div class="box"><div class="label">Zahlungsart</div><div class="value">${escapeHtml(paymentMethodLabel(payment.payment_method))}</div></div>
    <div class="box"><div class="label">Abrechnung</div><div class="value">${escapeHtml(cycleLabel(payment.billing_cycle || payment.interval))}</div></div>
    <div class="box"><div class="label">Leistungszeitraum</div><div class="value">${escapeHtml(dateLabel(payment.period_start))} – ${escapeHtml(dateLabel(payment.period_end))}</div></div>
  </div>

  <table>
    <thead><tr><th>Position</th><th class="right">Betrag</th></tr></thead>
    <tbody>${itemRows || `<tr><td>Mitgliedschaft</td><td class="right">${escapeHtml(formatMoney(payment.amount_cents, payment.currency))}</td></tr>`}</tbody>
  </table>

  <div class="total">
    <div class="totalbox">
      <div class="totalrow"><span>Brutto / Zahlung</span><strong>${escapeHtml(formatMoney(payment.amount_cents, payment.currency))}</strong></div>
      ${payment.payment_method === "stripe" ? `<div class="totalrow"><span>Stripe-Gebühr</span><span>${escapeHtml(formatMoney(payment.fee_cents, payment.currency))}</span></div><div class="totalrow grand"><span>Netto-Auszahlung</span><span>${escapeHtml(formatMoney(payment.net_amount_cents ?? payment.amount_cents - payment.fee_cents, payment.currency))}</span></div>` : `<div class="totalrow grand"><span>Zahlungseingang</span><span>${escapeHtml(formatMoney(payment.amount_cents, payment.currency))}</span></div>`}
    </div>
  </div>

  <div class="footer muted">
    <div><strong>Interne ID:</strong> ${escapeHtml(payment.id)}</div>
    ${payment.notes ? `<div><strong>Notiz:</strong> ${escapeHtml(payment.notes)}</div>` : ""}
    <div style="margin-top:14px">Kontoinhaber: Emoj!\`s Dart Verein · IBAN AT27 1500 0001 3110 5504 · BIC OBKLAT2L</div>
  </div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body></html>`)
  popup.document.close()
}


function formatEuroValue(value: number | string | null | undefined) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(Number(value || 0))
}

function printTopupReceipt(topup: WalletTopupAccountingRow) {
  const popup = window.open("", "_blank", "width=920,height=1050")
  if (!popup) return

  popup.document.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8" /><title>Guthaben-Aufladung</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#fff}.sheet{max-width:820px;margin:0 auto;padding:42px}.head{display:flex;justify-content:space-between;gap:28px;border-bottom:3px solid #ea580c;padding-bottom:22px}.brand{font-size:26px;font-weight:800}.muted{color:#6b7280;font-size:12px;line-height:1.55}h1{font-size:28px;margin:30px 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 28px;margin:24px 0}.box{border:1px solid #e5e7eb;border-radius:10px;padding:14px}.label{font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.08em}.value{margin-top:5px;font-size:15px;font-weight:700}.totalbox{margin-top:24px;margin-left:auto;max-width:340px;background:#111827;color:#fff;border-radius:12px;padding:18px}.row{display:flex;justify-content:space-between;margin:7px 0}.grand{font-size:20px;font-weight:800;border-top:1px solid #4b5563;padding-top:10px;margin-top:10px}.footer{margin-top:42px;padding-top:18px;border-top:1px solid #e5e7eb}@media print{.sheet{padding:12mm}}
</style></head><body><div class="sheet">
<div class="head"><div><div class="brand">Emoj!\`s Dart Verein</div><div class="muted">Buchhaltungsbeleg · Guthaben-Aufladung</div></div><div class="muted" style="text-align:right"><div><strong>Interne ID:</strong> ${escapeHtml(topup.id)}</div><div><strong>Bezahlt:</strong> ${escapeHtml(dateTimeLabel(topup.paid_at || topup.created_at))}</div></div></div>
<h1>Guthaben-Aufladung</h1><div class="muted">Diese Zahlung ist eine Aufladung des Vereins-/Turnierguthabens und ausdrücklich kein Mitgliedsbeitrag.</div>
<div class="grid"><div class="box"><div class="label">Mitglied</div><div class="value">${escapeHtml(topup.player_name)}</div><div class="muted">${escapeHtml(topup.player_email || "")}</div></div><div class="box"><div class="label">Status</div><div class="value">${escapeHtml(topup.status === "paid" ? "Bezahlt" : topup.status)}</div></div></div>
<div class="totalbox"><div class="row"><span>Guthaben</span><strong>${escapeHtml(formatEuroValue(topup.credit_amount))}</strong></div><div class="row"><span>Aufladegebühr</span><span>${escapeHtml(formatEuroValue(topup.fee_charged))}</span></div><div class="row grand"><span>Belastet</span><span>${escapeHtml(formatEuroValue(topup.gross_amount))}</span></div>${topup.actual_stripe_fee != null ? `<div class="row"><span>Stripe-Gebühr</span><span>${escapeHtml(formatEuroValue(topup.actual_stripe_fee))}</span></div>` : ""}${topup.actual_stripe_net != null ? `<div class="row"><span>Stripe-Netto</span><span>${escapeHtml(formatEuroValue(topup.actual_stripe_net))}</span></div>` : ""}</div>
<div class="footer muted">${topup.stripe_payment_intent_id ? `<div><strong>Stripe Payment Intent:</strong> ${escapeHtml(topup.stripe_payment_intent_id)}</div>` : ""}<div style="margin-top:14px">Getrennte Buchungskategorie: Guthaben-Aufladung / Turnierguthaben.</div></div>
</div><script>window.onload=()=>window.print()</script></body></html>`)
  popup.document.close()
}

export function MembershipAccountingPanel({ user }: { user: User | null }) {
  const [payments, setPayments] = useState<MembershipAccountingPayment[]>([])
  const [topups, setTopups] = useState<WalletTopupAccountingRow[]>([])
  const [section, setSection] = useState<"memberships" | "topups">("memberships")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))
  const [reviewFilter, setReviewFilter] = useState<"all" | "open" | "reviewed">("open")
  const [reviewingId, setReviewingId] = useState<string>("")

  const authorizedFetch = async (url: string, options?: RequestInit) => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const token = data.session?.access_token
    if (!token) throw new Error("Sitzung abgelaufen. Bitte neu anmelden.")

    return fetch(url, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  }

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authorizedFetch("/api/admin/membership-payments")
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Zahlungen konnten nicht geladen werden.")
      setPayments((payload?.payments || []) as MembershipAccountingPayment[])
      setTopups((payload?.topups || []) as WalletTopupAccountingRow[])
    } catch (err: any) {
      setError(err?.message || "Zahlungen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const syncStripe = async () => {
    try {
      setSyncing(true)
      setError(null)
      const response = await authorizedFetch("/api/admin/membership-payments", {
        method: "POST",
        body: JSON.stringify({ action: "sync_stripe" }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Stripe-Zahlungen konnten nicht synchronisiert werden.")
      await loadPayments()
    } catch (err: any) {
      setError(err?.message || "Stripe-Zahlungen konnten nicht synchronisiert werden.")
    } finally {
      setSyncing(false)
    }
  }

  const setReviewed = async (target: "payment" | "topup", id: string, reviewed: boolean) => {
    try {
      setReviewingId(`${target}:${id}`)
      setError(null)
      const response = await authorizedFetch("/api/admin/membership-payments", {
        method: "POST",
        body: JSON.stringify({ action: "set_reviewed", target, id, reviewed }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Prüfstatus konnte nicht gespeichert werden.")
      setPayments((payload?.payments || []) as MembershipAccountingPayment[])
      setTopups((payload?.topups || []) as WalletTopupAccountingRow[])
    } catch (err: any) {
      setError(err?.message || "Prüfstatus konnte nicht gespeichert werden.")
    } finally {
      setReviewingId("")
    }
  }

  useEffect(() => {
    if (user?.id) void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const years = useMemo(() => {
    const values = new Set<string>()
    for (const payment of payments) values.add(String(new Date(payment.paid_at).getFullYear()))
    for (const topup of topups) values.add(String(new Date(topup.paid_at || topup.created_at).getFullYear()))
    values.add(String(new Date().getFullYear()))
    return Array.from(values).filter((value) => value !== "NaN").sort((a, b) => Number(b) - Number(a))
  }, [payments, topups])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paid = new Date(payment.paid_at)
      if (!Number.isFinite(paid.getTime())) return false
      if (year !== "all" && String(paid.getFullYear()) !== year) return false
      if (month !== "all" && String(paid.getMonth() + 1).padStart(2, "0") !== month) return false
      if (reviewFilter === "open" && payment.reviewed_at) return false
      if (reviewFilter === "reviewed" && !payment.reviewed_at) return false
      return true
    })
  }, [payments, month, year, reviewFilter])

  const filteredTopups = useMemo(() => {
    return topups.filter((topup) => {
      const paid = new Date(topup.paid_at || topup.created_at)
      if (!Number.isFinite(paid.getTime())) return false
      if (year !== "all" && String(paid.getFullYear()) !== year) return false
      if (month !== "all" && String(paid.getMonth() + 1).padStart(2, "0") !== month) return false
      if (reviewFilter === "open" && topup.reviewed_at) return false
      if (reviewFilter === "reviewed" && !topup.reviewed_at) return false
      return true
    })
  }, [topups, month, year, reviewFilter])

  const gross = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount_cents || 0), 0)
  const fees = filteredPayments.reduce((sum, payment) => sum + Number(payment.fee_cents || 0), 0)
  const net = filteredPayments.reduce(
    (sum, payment) => sum + Number(payment.net_amount_cents ?? payment.amount_cents - payment.fee_cents),
    0,
  )

  const paidTopups = filteredTopups.filter((topup) => topup.status === "paid")
  const topupGross = paidTopups.reduce((sum, topup) => sum + Number(topup.gross_amount || 0), 0)
  const topupCredit = paidTopups.reduce((sum, topup) => sum + Number(topup.credit_amount || 0), 0)
  const topupFees = paidTopups.reduce((sum, topup) => sum + Number(topup.actual_stripe_fee ?? 0), 0)
  const topupNet = paidTopups.reduce((sum, topup) => sum + Number(topup.actual_stripe_net ?? topup.gross_amount ?? 0), 0)
  const openPaymentReviews = payments.filter((payment) => !payment.reviewed_at).length
  const openTopupReviews = topups.filter((topup) => topup.status === "paid" && !topup.reviewed_at).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
        <Button type="button" variant={section === "memberships" ? "default" : "ghost"} onClick={() => setSection("memberships")} className={section === "memberships" ? "rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800" : "rounded-xl font-black"}>
          <ReceiptText className="mr-2 h-4 w-4" /> Mitgliedsbeiträge · {payments.length}{openPaymentReviews > 0 ? ` · ${openPaymentReviews} offen` : ""}
        </Button>
        <Button type="button" variant={section === "topups" ? "default" : "ghost"} onClick={() => setSection("topups")} className={section === "topups" ? "rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700" : "rounded-xl font-black"}>
          <Coins className="mr-2 h-4 w-4" /> Guthaben-Aufladungen · {topups.length}{openTopupReviews > 0 ? ` · ${openTopupReviews} offen` : ""}
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-orange-600" />
                {section === "memberships" ? "Buchhaltung · Mitgliedsbeiträge" : "Buchhaltung · Guthaben-Aufladungen"}
              </CardTitle>
              <CardDescription className="mt-1">
                {section === "memberships"
                  ? "Mitgliedsbeiträge und Abo-Zahlungen – getrennt von Vereins- und Turnierguthaben."
                  : "Aufladungen des Vereins-/Turnierguthabens – ausdrücklich getrennt von Mitgliedsbeiträgen."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadPayments()} disabled={loading || syncing} className="rounded-xl">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Neu laden
              </Button>
              {section === "memberships" ? (
                <Button type="button" onClick={() => void syncStripe()} disabled={loading || syncing} className="rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Stripe synchronisieren
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}

          <div className="grid gap-3 lg:grid-cols-[180px_180px_220px_1fr]">
            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">Jahr</div>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Jahre</SelectItem>
                  {years.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">Monat</div>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Monate</SelectItem>
                  {[
                    ["01", "Jänner"], ["02", "Februar"], ["03", "März"], ["04", "April"],
                    ["05", "Mai"], ["06", "Juni"], ["07", "Juli"], ["08", "August"],
                    ["09", "September"], ["10", "Oktober"], ["11", "November"], ["12", "Dezember"],
                  ].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">Prüfstatus</div>
              <Select value={reviewFilter} onValueChange={(value) => setReviewFilter(value as "all" | "open" | "reviewed")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Noch zu prüfen</SelectItem>
                  <SelectItem value="reviewed">Geprüft</SelectItem>
                  <SelectItem value="all">Alle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end text-sm font-semibold text-slate-500">
              <CalendarDays className="mr-2 h-4 w-4" />
              {section === "memberships"
                ? `${filteredPayments.length} Mitgliedszahlung${filteredPayments.length === 1 ? "" : "en"} im gewählten Zeitraum`
                : `${filteredTopups.length} Aufladung${filteredTopups.length === 1 ? "" : "en"} im gewählten Zeitraum`}
            </div>
          </div>

          {(section === "memberships" ? openPaymentReviews : openTopupReviews) > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-black">{section === "memberships" ? openPaymentReviews : openTopupReviews} neue Zahlungseingänge noch nicht geprüft</div>
                <div className="mt-0.5 text-sm font-semibold text-amber-800">Nach Kontrolle des tatsächlichen Zahlungseingangs einfach auf „Als geprüft markieren“ klicken.</div>
              </div>
            </div>
          ) : null}

          {section === "memberships" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-emerald-700">Mitgliedsbeiträge</div><div className="mt-1 text-2xl font-black text-emerald-950">{formatMoney(gross)}</div></div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-orange-700">Stripe-Gebühren</div><div className="mt-1 text-2xl font-black text-orange-950">{formatMoney(fees)}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white"><div className="text-xs font-black uppercase tracking-wide text-slate-300">Netto</div><div className="mt-1 text-2xl font-black">{formatMoney(net)}</div></div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-blue-700">Guthaben gutgeschrieben</div><div className="mt-1 text-2xl font-black text-blue-950">{formatEuroValue(topupCredit)}</div></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-emerald-700">Kundenbelastung</div><div className="mt-1 text-2xl font-black text-emerald-950">{formatEuroValue(topupGross)}</div></div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-orange-700">Stripe-Gebühren</div><div className="mt-1 text-2xl font-black text-orange-950">{formatEuroValue(topupFees)}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white"><div className="text-xs font-black uppercase tracking-wide text-slate-300">Stripe-Netto</div><div className="mt-1 text-2xl font-black">{formatEuroValue(topupNet)}</div></div>
            </div>
          )}
        </CardContent>
      </Card>

      {section === "memberships" ? (
        <>
          {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          Für diesen Zeitraum wurden noch keine Zahlungseingänge gefunden.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black text-slate-950">{payment.player_name}</div>
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">BEZAHLT</Badge>
                      {payment.reviewed_at ? (
                        <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />GEPRÜFT</Badge>
                      ) : (
                        <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100"><CircleAlert className="mr-1 h-3.5 w-3.5" />NOCH ZU PRÜFEN</Badge>
                      )}
                      <Badge variant="outline" className="rounded-full">{paymentMethodLabel(payment.payment_method)}</Badge>
                      <Badge variant="outline" className="rounded-full">{cycleLabel(payment.billing_cycle || payment.interval)}</Badge>
                    </div>
                    {payment.player_email ? <div className="mt-1 text-xs font-semibold text-slate-500">{payment.player_email}</div> : null}

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Bezahlt</div><div className="font-bold text-slate-800">{dateTimeLabel(payment.paid_at)}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Belegnummer</div><div className="font-bold text-slate-800">{payment.receipt_no || "–"}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Zeitraum</div><div className="font-bold text-slate-800">{dateLabel(payment.period_start)} – {dateLabel(payment.period_end)}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Stripe-Rechnung</div><div className="font-bold text-slate-800">{payment.stripe_invoice_number || "–"}</div></div>
                      <div className={payment.reviewed_at ? "rounded-xl bg-blue-50 px-3 py-2" : "rounded-xl bg-amber-50 px-3 py-2"}><div className={payment.reviewed_at ? "text-[10px] font-black uppercase text-blue-500" : "text-[10px] font-black uppercase text-amber-500"}>Kontrolle</div><div className={payment.reviewed_at ? "font-bold text-blue-900" : "font-bold text-amber-900"}>{payment.reviewed_at ? dateTimeLabel(payment.reviewed_at) : "Noch offen"}</div></div>
                    </div>

                    {payment.line_items?.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {payment.line_items.map((item, index) => (
                          <div key={`${payment.id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                            <span className="font-bold text-slate-800">{item.name || item.description || "Mitgliedschaft"}</span>
                            <span className="shrink-0 font-black text-slate-900">{formatMoney(item.amount_cents || 0, payment.currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full shrink-0 space-y-3 xl:w-[290px]">
                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-300"><span>Zahlung</span><WalletCards className="h-4 w-4" /></div>
                      <div className="mt-1 text-2xl font-black">{formatMoney(payment.amount_cents, payment.currency)}</div>
                      {payment.payment_method === "stripe" ? (
                        <div className="mt-3 space-y-1 border-t border-slate-700 pt-3 text-xs">
                          <div className="flex justify-between"><span className="text-slate-400">Gebühr</span><span>{formatMoney(payment.fee_cents, payment.currency)}</span></div>
                          <div className="flex justify-between font-black"><span>Netto</span><span>{formatMoney(payment.net_amount_cents ?? payment.amount_cents - payment.fee_cents, payment.currency)}</span></div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Button
                        type="button"
                        onClick={() => void setReviewed("payment", payment.id, !payment.reviewed_at)}
                        disabled={reviewingId === `payment:${payment.id}`}
                        className={payment.reviewed_at ? "rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50" : "rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"}
                        variant={payment.reviewed_at ? "outline" : "default"}
                      >
                        {reviewingId === `payment:${payment.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : payment.reviewed_at ? <Undo2 className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {payment.reviewed_at ? "Prüfung zurücksetzen" : "Als geprüft markieren"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => printPaymentReceipt(payment)} className="rounded-xl">
                        <Printer className="mr-2 h-4 w-4" />Beleg drucken
                      </Button>

                      {payment.stripe_invoice_pdf_url ? (
                        <Button asChild type="button" className="rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700">
                          <a href={payment.stripe_invoice_pdf_url} target="_blank" rel="noreferrer">
                            <FileText className="mr-2 h-4 w-4" />Stripe PDF
                          </a>
                        </Button>
                      ) : payment.stripe_hosted_invoice_url ? (
                        <Button asChild type="button" className="rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700">
                          <a href={payment.stripe_hosted_invoice_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />Stripe-Rechnung
                          </a>
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                          {payment.payment_method === "stripe" ? <CreditCard className="mr-2 h-4 w-4" /> : <Banknote className="mr-2 h-4 w-4" />}
                          {payment.payment_method === "stripe" ? "PDF nach Sync verfügbar" : "Vereinsbeleg"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          )}
        </>
      ) : loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-orange-600" /></div>
      ) : filteredTopups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">Für diesen Zeitraum wurden keine Guthaben-Aufladungen gefunden.</div>
      ) : (
        <div className="space-y-3">
          {filteredTopups.map((topup) => {
            const paid = topup.status === "paid"
            return (
              <Card key={topup.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-slate-950">{topup.player_name}</div>
                        <Badge className={paid ? "rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100"}>{paid ? "BEZAHLT" : "OFFEN"}</Badge>
                        {paid ? (topup.reviewed_at ? <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />GEPRÜFT</Badge> : <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100"><CircleAlert className="mr-1 h-3.5 w-3.5" />NOCH ZU PRÜFEN</Badge>) : null}
                        <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 text-orange-800">GUTHABEN-AUFLADUNG</Badge>
                        <Badge variant="outline" className="rounded-full">Stripe</Badge>
                      </div>
                      {topup.player_email ? <div className="mt-1 text-xs font-semibold text-slate-500">{topup.player_email}</div> : null}
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">{paid ? "Bezahlt" : "Erstellt"}</div><div className="font-bold text-slate-800">{dateTimeLabel(topup.paid_at || topup.created_at)}</div></div>
                        <div className="rounded-xl bg-blue-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-blue-500">Guthaben</div><div className="font-black text-blue-950">{formatEuroValue(topup.credit_amount)}</div></div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Aufladegebühr</div><div className="font-bold text-slate-800">{formatEuroValue(topup.fee_charged)}</div></div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Belastet</div><div className="font-black text-slate-950">{formatEuroValue(topup.gross_amount)}</div></div>
                        <div className={topup.reviewed_at ? "rounded-xl bg-blue-50 px-3 py-2" : "rounded-xl bg-amber-50 px-3 py-2"}><div className={topup.reviewed_at ? "text-[10px] font-black uppercase text-blue-500" : "text-[10px] font-black uppercase text-amber-500"}>Kontrolle</div><div className={topup.reviewed_at ? "font-bold text-blue-900" : "font-bold text-amber-900"}>{topup.reviewed_at ? dateTimeLabel(topup.reviewed_at) : paid ? "Noch offen" : "Nach Zahlung"}</div></div>
                      </div>
                      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900">Diese Zahlung zählt als Vereins-/Turnierguthaben und nicht als Mitgliedsbeitrag.</div>
                    </div>
                    <div className="w-full shrink-0 space-y-3 xl:w-[290px]">
                      <div className="rounded-2xl bg-slate-950 p-4 text-white">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-300"><span>Aufladung</span><Coins className="h-4 w-4" /></div>
                        <div className="mt-1 text-2xl font-black">{formatEuroValue(topup.gross_amount)}</div>
                        <div className="mt-3 space-y-1 border-t border-slate-700 pt-3 text-xs">
                          <div className="flex justify-between"><span className="text-slate-400">Guthaben</span><span>{formatEuroValue(topup.credit_amount)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Aufladegebühr</span><span>{formatEuroValue(topup.fee_charged)}</span></div>
                          {topup.actual_stripe_fee != null ? <div className="flex justify-between"><span className="text-slate-400">Stripe-Gebühr</span><span>{formatEuroValue(topup.actual_stripe_fee)}</span></div> : null}
                          {topup.actual_stripe_net != null ? <div className="flex justify-between font-black"><span>Stripe-Netto</span><span>{formatEuroValue(topup.actual_stripe_net)}</span></div> : null}
                        </div>
                      </div>
                      {paid ? (
                        <Button
                          type="button"
                          onClick={() => void setReviewed("topup", topup.id, !topup.reviewed_at)}
                          disabled={reviewingId === `topup:${topup.id}`}
                          className={topup.reviewed_at ? "w-full rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50" : "w-full rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"}
                          variant={topup.reviewed_at ? "outline" : "default"}
                        >
                          {reviewingId === `topup:${topup.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : topup.reviewed_at ? <Undo2 className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          {topup.reviewed_at ? "Prüfung zurücksetzen" : "Als geprüft markieren"}
                        </Button>
                      ) : null}
                      <Button type="button" variant="outline" onClick={() => printTopupReceipt(topup)} className="w-full rounded-xl" disabled={!paid}><Printer className="mr-2 h-4 w-4" />Aufladebeleg drucken</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

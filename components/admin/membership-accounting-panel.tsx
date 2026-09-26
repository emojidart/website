"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  Banknote,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ReceiptText,
  WalletCards,
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
  line_items: Array<{
    module_id?: string | null
    code?: string | null
    name?: string | null
    description?: string | null
    amount_cents?: number | null
    quantity?: number | null
  }>
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

export function MembershipAccountingPanel({ user }: { user: User | null }) {
  const [payments, setPayments] = useState<MembershipAccountingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))

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

  useEffect(() => {
    if (user?.id) void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const years = useMemo(() => {
    const values = new Set(payments.map((payment) => String(new Date(payment.paid_at).getFullYear())))
    values.add(String(new Date().getFullYear()))
    return Array.from(values).sort((a, b) => Number(b) - Number(a))
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paid = new Date(payment.paid_at)
      if (!Number.isFinite(paid.getTime())) return false
      if (year !== "all" && String(paid.getFullYear()) !== year) return false
      if (month !== "all" && String(paid.getMonth() + 1).padStart(2, "0") !== month) return false
      return true
    })
  }, [payments, month, year])

  const gross = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount_cents || 0), 0)
  const fees = filteredPayments.reduce((sum, payment) => sum + Number(payment.fee_cents || 0), 0)
  const net = filteredPayments.reduce(
    (sum, payment) => sum + Number(payment.net_amount_cents ?? payment.amount_cents - payment.fee_cents),
    0,
  )

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-orange-600" />
                Buchhaltung · Mitgliedszahlungen
              </CardTitle>
              <CardDescription className="mt-1">
                Tatsächliche Zahlungseingänge inklusive wiederkehrender Stripe-Rechnungen, Gebühren, Netto-Auszahlung und Belegnummer.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadPayments()} disabled={loading || syncing} className="rounded-xl">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Neu laden
              </Button>
              <Button type="button" onClick={() => void syncStripe()} disabled={loading || syncing} className="rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800">
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Stripe synchronisieren
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}

          <div className="grid gap-3 lg:grid-cols-[220px_220px_1fr]">
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
            <div className="flex items-end text-sm font-semibold text-slate-500">
              <CalendarDays className="mr-2 h-4 w-4" />
              {filteredPayments.length} Zahlung{filteredPayments.length === 1 ? "" : "en"} im gewählten Zeitraum
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Zahlungseingang</div>
              <div className="mt-1 text-2xl font-black text-emerald-950">{formatMoney(gross)}</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-orange-700">Stripe-Gebühren</div>
              <div className="mt-1 text-2xl font-black text-orange-950">{formatMoney(fees)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white">
              <div className="text-xs font-black uppercase tracking-wide text-slate-300">Netto</div>
              <div className="mt-1 text-2xl font-black">{formatMoney(net)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      <Badge variant="outline" className="rounded-full">{paymentMethodLabel(payment.payment_method)}</Badge>
                      <Badge variant="outline" className="rounded-full">{cycleLabel(payment.billing_cycle || payment.interval)}</Badge>
                    </div>
                    {payment.player_email ? <div className="mt-1 text-xs font-semibold text-slate-500">{payment.player_email}</div> : null}

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Bezahlt</div><div className="font-bold text-slate-800">{dateTimeLabel(payment.paid_at)}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Belegnummer</div><div className="font-bold text-slate-800">{payment.receipt_no || "–"}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Zeitraum</div><div className="font-bold text-slate-800">{dateLabel(payment.period_start)} – {dateLabel(payment.period_end)}</div></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-[10px] font-black uppercase text-slate-400">Stripe-Rechnung</div><div className="font-bold text-slate-800">{payment.stripe_invoice_number || "–"}</div></div>
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
    </div>
  )
}

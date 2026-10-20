"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, CreditCard, CalendarClock } from "lucide-react"

type Status = { hasIssue: boolean; expired: boolean; deadline: string | null; amountCents: number; unpaidCount: number; invoices: { id: string; amountCents: number; url: string | null }[] }
export function MembershipPaymentNotice() {
  const [status, setStatus] = useState<Status | null>(null)
  useEffect(() => {
    let active = true
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      try {
        const result = await fetch("/api/member/payment-status", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" })
        if (!result.ok) return
        const json = await result.json()
        if (active) setStatus(json)
      } catch { /* Fehler nicht als vermeintlichen Zahlungsrückstand anzeigen */ }
    }
    void load()
    return () => { active = false }
  }, [])
  if (!status?.hasIssue) return null
  const eur = (cents: number) => (cents / 100).toLocaleString("de-AT", { style: "currency", currency: "EUR" })
  const deadline = status.deadline ? new Date(status.deadline).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–"
  return (
    <section aria-label="Offene Mitgliedschaftszahlung" className={`my-4 rounded-2xl border p-4 sm:p-5 ${status.expired ? "border-red-500/40 bg-red-950/30" : "border-amber-400/30 bg-amber-950/20"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-400"><AlertTriangle className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-white">{status.expired ? "Zugang wegen offener Zahlung pausiert" : "Zahlung fehlgeschlagen – 14 Tage Zeit zum Nachzahlen"}</h2>
          <p className="mt-1 text-sm text-white/75">{status.expired ? "Die Zahlungsfrist ist abgelaufen. Bitte alle offenen Rechnungen begleichen, um den Zugang wieder freizuschalten." : "Deine Mitgliedschaft bleibt bis zum Ende der Frist freigeschaltet. Bitte begleiche die offene Rechnung rechtzeitig."}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/90">
            <span className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Offen: {eur(status.amountCents)} ({status.unpaidCount} Rechnung{status.unpaidCount === 1 ? "" : "en"})</span>
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Zahlungsfrist: {deadline}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/60">Der reguläre Abrechnungsrhythmus läuft unverändert weiter. Offene Monatsbeträge werden nicht erlassen; eine neue Rechnung kann auch während der Zahlungsfrist entstehen.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {status.invoices.filter(invoice => !!invoice.url).map((invoice) => (
              <a key={invoice.id} href={invoice.url!} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white hover:bg-orange-600">{eur(invoice.amountCents)} nachzahlen</a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

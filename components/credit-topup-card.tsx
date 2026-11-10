"use client"

import { ButtonLoader } from "@/components/loading/loading"

import { useEffect, useState } from "react"
import { CreditCard, ShieldCheck, Wallet, XCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

type Quote = { credit: number; fee: number; gross: number }

export function CreditTopupCard({ onTopupComplete }: { onTopupComplete?: () => void }) {
  const [busy, setBusy] = useState<number | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState("")
  const [returnState, setReturnState] = useState<"success" | "cancelled" | null>(null)
  const [customAmount, setCustomAmount] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get("topup")
    if (state === "success" || state === "cancelled") {
      setReturnState(state)
      if (state === "success") {
        window.setTimeout(() => onTopupComplete?.(), 1200)
        window.setTimeout(() => onTopupComplete?.(), 3000)
      }
      const clean = `${window.location.pathname}${window.location.hash || ""}`
      window.history.replaceState({}, "", clean)
    }
  }, [onTopupComplete])

  async function api(amount: number, quoteOnly: boolean) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Bitte erneut einloggen.")

    const res = await fetch("/api/credits/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, quoteOnly }),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || "Fehler bei der Aufladung.")
    return json
  }

  async function choose(amount: number) {
    try {
      setError("")
      setReturnState(null)
      setBusy(amount)
      setQuote(await api(amount, true))
    } catch (e: any) {
      setError(e?.message || "Fehler bei der Aufladung.")
    } finally {
      setBusy(null)
    }
  }

  async function chooseCustom() {
    const normalized = customAmount.replace(",", ".").trim()
    const amount = Number(normalized)

    if (!Number.isFinite(amount) || amount < 1) {
      setError("Der Mindestbetrag beträgt 1,00 €.")
      return
    }

    if (amount > 500) {
      setError("Der maximale Aufladebetrag beträgt 500,00 €.")
      return
    }

    await choose(Math.round(amount * 100) / 100)
  }

  async function pay() {
    if (!quote) return
    try {
      setError("")
      setBusy(quote.credit)
      const result = await api(quote.credit, false)
      if (!result.url) throw new Error("Stripe Checkout URL fehlt.")
      window.location.href = result.url
    } catch (e: any) {
      setError(e?.message || "Fehler bei der Aufladung.")
      setBusy(null)
    }
  }

  return (
    <section className="mt-4 overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_14px_38px_-28px_rgba(15,23,42,0.28)] sm:rounded-[28px]">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background">
            <Wallet className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">EMD Wallet</div>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Guthaben aufladen</h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          Sicher über Stripe
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {returnState === "success" ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Zahlung erfolgreich</div>
              <div className="mt-0.5 font-medium text-emerald-800/80">Dein Guthaben wird gerade aktualisiert.</div>
            </div>
          </div>
        ) : null}

        {returnState === "cancelled" ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Zahlung abgebrochen</div>
              <div className="mt-0.5">Es wurde kein Guthaben gebucht.</div>
            </div>
          </div>
        ) : null}

        <p className="text-sm font-medium leading-6 text-muted-foreground">
          Wähle den gewünschten Guthabenbetrag. Die anfallende Zahlungsgebühr wird zusätzlich berechnet und vor dem Bezahlen angezeigt.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[10, 20, 30, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={busy !== null}
              onClick={() => void choose(amount)}
              className={`h-14 rounded-2xl border text-base font-semibold transition active:scale-[0.98] ${
                quote?.credit === amount
                  ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                  : "border-border bg-muted text-foreground hover:border-orange-200 hover:bg-primary/10"
              } disabled:cursor-not-allowed disabled:opacity-60`}
             aria-busy={busy === amount || undefined}><ButtonLoader loading={Boolean(busy === amount)}>{`${amount} €`}</ButtonLoader></button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-muted p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Beliebiger Betrag
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value.replace(/[^0-9.,]/g, ""))
                  setError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void chooseCustom()
                }}
                placeholder="z. B. 15,00"
                className="h-12 w-full rounded-xl border border-border bg-card px-4 pr-12 text-base font-semibold text-foreground outline-none transition focus:border-orange-400"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">€</span>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void chooseCustom()}
              className="h-12 rounded-xl border-border bg-card px-5 font-semibold text-foreground hover:bg-primary/10"
            >
              Betrag wählen
            </Button>
          </div>
          <div className="mt-2 text-xs font-medium text-muted-foreground">
            Mindestbetrag 1,00 € · maximal 500,00 €
          </div>
        </div>

        {quote ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted">
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-muted-foreground">Guthaben</span>
                <span className="font-semibold text-foreground">{quote.credit.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-muted-foreground">Zahlungsgebühr</span>
                <span className="font-semibold text-foreground">{quote.fee.toFixed(2)} €</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-3">
                <span className="font-semibold text-foreground">Zu zahlen</span>
                <span className="text-xl font-semibold text-orange-600">{quote.gross.toFixed(2)} €</span>
              </div>
            </div>

            <div className="border-t border-border bg-card p-3">
              <Button
                onClick={() => void pay()}
                disabled={busy !== null}
                className="h-12 w-full rounded-xl bg-background font-semibold text-white hover:bg-background"
               loading={Boolean(busy !== null)}><CreditCard className="mr-2 h-4 w-4" />Mit Stripe bezahlen
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  )
}

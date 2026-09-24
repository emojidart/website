"use client"

import { useState } from "react"
import { Wallet, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export function CreditTopupCard() {
  const [busy, setBusy] = useState<number | null>(null)
  const [quote, setQuote] = useState<{ credit:number; fee:number; gross:number } | null>(null)
  const [error, setError] = useState("")

  async function api(amount:number, quoteOnly:boolean) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Bitte erneut einloggen.")
    const res = await fetch("/api/credits/create-checkout-session", {
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({amount, quoteOnly}),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || "Fehler bei der Aufladung.")
    return json
  }

  async function choose(amount:number) {
    try { setError(""); setBusy(amount); setQuote(await api(amount,true)) }
    catch(e:any){ setError(e?.message || "Fehler") }
    finally { setBusy(null) }
  }

  async function pay() {
    if (!quote) return
    try {
      setError(""); setBusy(quote.credit)
      const r=await api(quote.credit,false)
      if (!r.url) throw new Error("Stripe Checkout URL fehlt.")
      window.location.href=r.url
    } catch(e:any){ setError(e?.message || "Fehler") }
    finally { setBusy(null) }
  }

  return <div className="mt-4 rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
    <div className="p-4 sm:p-6 border-b border-orange-100 flex items-center justify-between">
      <div><p className="text-xs font-black uppercase tracking-wider text-orange-700/70">EMD Wallet</p><p className="text-lg font-black text-gray-900">Guthaben aufladen</p></div>
      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center"><Wallet className="w-5 h-5 text-orange-700"/></div>
    </div>
    <div className="p-4 sm:p-6 bg-gray-50">
      <p className="text-sm text-gray-700 mb-3">Wähle dein Guthaben. Die Zahlungsgebühr wird zusätzlich berechnet und vor Stripe nochmals angezeigt.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[10,20,30,50].map(a=><Button key={a} variant="outline" className="h-12 rounded-2xl font-black" disabled={busy!==null} onClick={()=>choose(a)}>{busy===a?<Loader2 className="w-4 h-4 animate-spin"/>:`${a} €`}</Button>)}
      </div>
      {quote && <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex justify-between text-sm"><span>Guthaben</span><b>{quote.credit.toFixed(2)} €</b></div>
        <div className="flex justify-between text-sm mt-1"><span>Zahlungsgebühr</span><b>{quote.fee.toFixed(2)} €</b></div>
        <div className="flex justify-between text-base mt-2 pt-2 border-t border-orange-200"><span className="font-black">Zu zahlen</span><b>{quote.gross.toFixed(2)} €</b></div>
        <Button onClick={pay} disabled={busy!==null} className="mt-3 w-full rounded-2xl bg-orange-600 hover:bg-orange-700 font-black"><CreditCard className="w-4 h-4 mr-2"/>Mit Stripe bezahlen</Button>
      </div>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  </div>
}

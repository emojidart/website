"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Check, DoorOpen, ExternalLink, Loader2, Search, ShieldCheck, UserPlus, X } from "lucide-react"

type Player = {
  id: string
  name: string
  email: string | null
  is_active: boolean | null
}

type Permission = {
  player_id: string
  allowed: boolean
}

export function AdminClubhouseManagement() {
  const [players, setPlayers] = useState<Player[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const [playersRes, permissionsRes] = await Promise.all([
      supabase
        .from("club_players")
        .select("id,name,email,is_active")
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true }),
      supabase
        .from("user_page_permissions")
        .select("player_id,allowed")
        .eq("page_key", "clubhouse"),
    ])
    if (!playersRes.error) setPlayers((playersRes.data || []) as Player[])
    if (!permissionsRes.error) setPermissions((permissionsRes.data || []) as Permission[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const enabledPlayerIds = useMemo(() => new Set(permissions.filter((p) => p.allowed).map((p) => p.player_id)), [permissions])
  const filtered = players.filter((player) => {
    const text = `${player.name} ${player.email || ""}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  })

  async function toggle(player: Player) {
    setSavingId(player.id)
    setMessage("")
    const enabled = enabledPlayerIds.has(player.id)

    const { error } = await supabase
      .from("user_page_permissions")
      .upsert(
        {
          player_id: player.id,
          page_key: "clubhouse",
          allowed: !enabled,
        },
        { onConflict: "player_id,page_key" },
      )

    if (error) {
      setMessage(`Fehler: ${error.message}`)
    } else {
      setMessage(
        enabled
          ? `${player.name} darf den Pfeil-OK-Status nicht mehr ändern.`
          : `${player.name} darf den Pfeil-OK-Status jetzt eintragen.`,
      )
    }

    await load()
    setSavingId("")
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-slate-950 text-white">
          <CardTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5 text-orange-400" /> Vereinsheim & Öffnungszeiten</CardTitle>
          <p className="text-sm font-semibold text-white/55">Lege fest, wer spontane oder geplante Öffnungszeiten eintragen darf.</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/vereinsheim"><Button className="h-11 w-full rounded-xl bg-orange-600 font-black hover:bg-orange-700"><ExternalLink className="mr-2 h-4 w-4" /> Öffentliche Seite öffnen</Button></Link>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" /> {enabledPlayerIds.size} Person{enabledPlayerIds.size === 1 ? "" : "en"} freigeschaltet</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-orange-600" /> Berechtigte Personen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler suchen…" className="h-11 pl-9" /></div>
          {message ? <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{message}</div> : null}

          {loading ? <div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Wird geladen…</div> : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {filtered.map((player) => {
                const enabled = enabledPlayerIds.has(player.id)
                return (
                  <div key={player.id} className="flex items-center gap-3 bg-white p-3.5 sm:p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-emerald-100" : "bg-slate-100"}`}>
                      {enabled ? <Check className="h-5 w-5 text-emerald-700" /> : <X className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1"><div className="truncate font-black text-slate-950">{player.name}</div><div className="truncate text-xs font-semibold text-slate-500">{player.email || "Keine E-Mail hinterlegt"}</div></div>
                    <Button type="button" disabled={savingId === player.id} onClick={() => void toggle(player)} variant={enabled ? "outline" : "default"} className={enabled ? "border-red-200 font-black text-red-700 hover:bg-red-50" : "bg-slate-950 font-black hover:bg-slate-800"}>
                      {savingId === player.id ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? "Entfernen" : "Freigeben"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

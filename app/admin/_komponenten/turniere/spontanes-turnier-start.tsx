"use client"

import { useState } from "react"
import { Dices, Flame, Loader2, Sparkles, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"

export type SpontaneousTournamentMode = "dko" | "round_robin" | "kratzer" | "survival" | "survival_single"

export type SpontaneousTournamentDraft = {
  id: string
  name: string
  mode: SpontaneousTournamentMode
}

type Props = {
  onCreated: (draft: SpontaneousTournamentDraft) => void
}

const modes = [
  {
    id: "dko" as const,
    title: "DKO",
    description: "Doppel-KO Turnier",
    icon: Trophy,
  },
  {
    id: "round_robin" as const,
    title: "Round Robin",
    description: "Gruppenphase / Jeder gegen Jeden",
    icon: Dices,
  },
  {
    id: "kratzer" as const,
    title: "Kratzer",
    description: "Kratzer-Turnier",
    icon: Sparkles,
  },
  {
    id: "survival" as const,
    title: "Survival Roulette",
    description: "Einzel oder gelostes Doppel",
    icon: Flame,
  },
]

export function SpontanesTurnierStart({ onCreated }: Props) {
  const [name, setName] = useState("")
  const [mode, setMode] = useState<SpontaneousTournamentMode>("dko")
  const [survivalType, setSurvivalType] = useState<"survival" | "survival_single">("survival")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const createTournament = async () => {
    const cleanName = name.trim()
    if (!cleanName || saving) return

    try {
      setSaving(true)
      setError("")

      const today = new Date().toISOString().slice(0, 10)
      const { data, error: insertError } = await supabase
        .from("central_tournament_events")
        .insert({
          source_event_id: null,
          is_spontaneous: true,
          title: cleanName,
          event_date: today,
          start_time: null,
          location: null,
          registration_deadline: null,
          max_participants: null,
          entry_fee: 0,
          access_type: "public",
          status: "open",
          selected_mode: mode === "survival" ? survivalType : mode,
        })
        .select("id")
        .single()

      if (insertError) throw insertError
      if (!data?.id) throw new Error("Turnier konnte nicht angelegt werden.")

      onCreated({
        id: String(data.id),
        name: cleanName,
        mode: mode === "survival" ? survivalType : mode,
      })
    } catch (err: any) {
      setError(err?.message || "Turnier konnte nicht angelegt werden.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="emd-admin-hero">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/60">
          Sofort starten
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Spontanes Turnier</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/40">
          Turniername eingeben, Spielmodus wählen und danach direkt Spieler registrieren.
        </p>
      </section>

      <section className="emd-admin-surface p-5 sm:p-6">
        <div className="max-w-2xl">
          <label className="mb-2 block text-sm font-black text-white/70">Turniername</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Freitag Abend Turnier"
            maxLength={100}
            className="emd-admin-input"
          />
        </div>

        <div className="mt-6">
          <div className="mb-3 text-sm font-black text-white/70">Spielmodus</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modes.map((item) => {
              const Icon = item.icon
              const active = mode === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-orange-300/30 bg-orange-500/[0.10]"
                      : "border-white/[0.08] bg-white/[0.025] hover:border-orange-300/15 hover:bg-white/[0.045]"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-500/[0.08]">
                    <Icon className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="mt-4 font-black text-white">{item.title}</div>
                  <div className="mt-1 text-xs font-semibold leading-5 text-white/35">{item.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {mode === "survival" ? (
          <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-500/[0.05] p-4">
            <div className="mb-3 text-sm font-black text-white">Survival-Variante wählen</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([ ["survival_single", "Einzel Roulette", "Neue Gegner in jeder Runde"], ["survival", "Doppel Roulette", "Neue Doppelpartner in jeder Runde"] ] as const).map(([value,title,description]) => (
                <button type="button" key={value} onClick={() => setSurvivalType(value)}
                  className={`rounded-xl border p-3 text-left ${survivalType === value ? "border-orange-400/45 bg-orange-500/15" : "border-white/10 bg-white/[0.025]"}`}>
                  <div className="font-black text-white">{survivalType === value ? "✓ " : ""}{title}</div>
                  <div className="mt-1 text-xs text-white/55">{description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-500/[0.08] px-4 py-3 text-sm font-bold text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void createTournament()}
          disabled={!name.trim() || saving}
          className={`mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-black transition ${
            name.trim() && !saving
              ? "bg-orange-500 text-white hover:bg-orange-400"
              : "cursor-not-allowed border border-white/[0.06] bg-white/[0.04] text-white/25"
          }`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {saving ? "Turnier wird angelegt…" : "Turnier anlegen & Spieler registrieren"}
        </button>
      </section>
    </div>
  )
}

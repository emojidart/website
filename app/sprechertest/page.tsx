"use client"

import { useState } from "react"
import { Volume2, Square, Mic2 } from "lucide-react"
import { useSpeechAnnouncer, SpeechAnnouncerSettings } from "@/components/speech-announcer"

export default function SprecherTestPage() {
  const [enabled, setEnabled] = useState(true)
  const [player1, setPlayer1] = useState("Christoph Steiner")
  const [player2, setPlayer2] = useState("Orhan Akbiyik")
  const [machine, setMachine] = useState(4)
  const { announce, isSupported } = useSpeechAnnouncer({ enabled })

  const play = (call: number) => {
    if (!player1.trim() || !player2.trim()) return
    announce(player1.trim(), player2.trim(), machine, call)
  }

  const stop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
  }

  return (
    <main className="min-h-screen bg-[#080b11] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <Mic2 className="mx-auto h-12 w-12 text-orange-400" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">EMD · Turniersprecher</p>
          <h1 className="text-3xl font-black sm:text-4xl">Stimmen & Ansagen testen</h1>
          <p className="text-sm text-white/60">Ohne Turnierstart – genau dieselbe Ansagefunktion wie im 8er-DKO.</p>
        </header>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-[#121925] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Spieler 1
              <input value={player1} onChange={e => setPlayer1(e.target.value)} className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400" />
            </label>
            <label className="space-y-2 text-sm font-semibold">Spieler 2
              <input value={player2} onChange={e => setPlayer2(e.target.value)} className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400" />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-semibold">Automat
            <input type="number" min={1} max={99} value={machine} onChange={e => setMachine(Math.max(1, Number(e.target.value) || 1))} className="w-32 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map(call => <button key={call} type="button" disabled={!enabled || !isSupported || !player1.trim() || !player2.trim()} onClick={() => play(call)} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-3 text-sm font-bold transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><Volume2 className="h-5 w-5" />{call === 1 ? "Erster Aufruf" : call === 2 ? "Zweiter Aufruf" : "Letzter Aufruf"}</button>)}
          </div>
          <button type="button" onClick={stop} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-semibold text-white/75 hover:bg-white/5"><Square className="h-4 w-4" /> Ansage stoppen</button>
          {!isSupported && <p className="text-sm text-amber-300">Dieser Browser unterstützt die Sprachausgabe nicht.</p>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white p-5 text-gray-900 sm:p-7">
          <h2 className="mb-4 text-xl font-black">Stimme & Aussprache</h2>
          <SpeechAnnouncerSettings enabled={enabled} onToggle={setEnabled} />
        </section>

        <p className="text-center text-xs text-white/40">Die verfügbaren Stimmen und Aussprachekorrekturen hängen vom Browser ab. Diese Seite verändert keine Turnierdaten.</p>
      </div>
    </main>
  )
}

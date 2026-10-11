"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Kind = "registration" | "start" | "final" | "ceremony" | "custom"
type DisplayMode = "repeat" | "once" | "permanent"
type Announcement = { auto_speak?: boolean; id: string; kind: Kind; scope: string; message: string | null; ends_at: string; display_mode: DisplayMode; display_seconds: number; repeat_seconds: number }
const KINDS: { value: Kind; label: string }[] = [
  { value: "registration", label: "Anmeldeschluss" }, { value: "start", label: "Turnierbeginn" },
  { value: "final", label: "Finale" }, { value: "ceremony", label: "Siegerehrung" }, { value: "custom", label: "Durchsage" },
]
const DURATIONS = [5, 10, 15, 30, 45, 60, 90, 120, 180, 240]
const formatDuration = (value: number) => value >= 60 ? `${value / 60} Std.`.replace("1.5 Std.", "1 Std. 30 Min.") : `${value} Min.`
const martinText = (a: Announcement, title: string) => {
  const part = a.scope === "herren" ? "für das Herren Doppel K.O." : a.scope === "damen" ? "für das Damen Doppel K.O." : ""
  const minutes = Math.max(1, Math.ceil((Date.parse(a.ends_at) - Date.now()) / 60000))
  if (a.kind === "custom") return a.message || ""
  const suffix = minutes === 1 ? "einer Minute" : `${minutes} Minuten`
  if (a.kind === "registration") return `Achtung, liebe Dartspieler! Der Anmeldeschluss ${part} für ${title} ist in ${suffix}. Bitte meldet euch rechtzeitig an!`
  if (a.kind === "start") return `Achtung, liebe Dartfreunde! Das Turnier ${part} beginnt in ${suffix}. Bitte macht euch bereit!`
  if (a.kind === "final") return `Liebe Dartfans! Das Finale ${part} beginnt in ${suffix}.`
  return `Liebe Dartspieler! Die Siegerehrung beginnt in ${suffix}. Bitte haltet euch bereit!`
}

// Nur das Martin-Steuerfenster am Vereins-PC spielt Ton ab.
// Diese Warteschlange serialisiert die neuen Regie-Ansagen innerhalb eines Tabs.
let martinQueue: Promise<void> = Promise.resolve()
const enqueueMartin = (text: string): Promise<void> => {
  const play = async () => {
    const response = await fetch("http://127.0.0.1:8765/speak", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "announcement", text, speed: 1.0 }),
    })
    if (!response.ok) throw new Error(`Martin antwortet mit HTTP ${response.status}. Ist der aktualisierte Martin-Server gestartet?`)
    const objectUrl = URL.createObjectURL(await response.blob())
    try {
      const audio = new Audio(objectUrl)
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error("Audio konnte nicht abgespielt werden"))
        audio.play().catch(reject)
      })
    } finally { URL.revokeObjectURL(objectUrl) }
  }
  const next = martinQueue.catch(() => undefined).then(play)
  martinQueue = next.catch(() => undefined)
  return next
}

const kindName = (kind: Kind) => KINDS.find(item => item.value === kind)?.label || kind

export default function EmdLiveRegieControl({ eventId, title }: { eventId: string; title: string }) {
  const [kind, setKind] = useState<Kind>("registration")
  const [minutes, setMinutes] = useState(10)
  const [scope, setScope] = useState("all")
  const [message, setMessage] = useState("")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("repeat")
  const [displaySeconds, setDisplaySeconds] = useState(12)
  const [repeatSeconds, setRepeatSeconds] = useState(60)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [martinBusy, setMartinBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [current, setCurrent] = useState<Announcement[]>([])
  const [now, setNow] = useState(Date.now())

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from("emd_live_announcements")
      .select("id,kind,scope,message,ends_at,display_mode,display_seconds,repeat_seconds,auto_speak")
      .eq("event_id", eventId).is("cancelled_at", null).gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true }).limit(100)
    if (error) { setFeedback(`Fehler beim Laden: ${error.message}`); return }
    setCurrent((data || []) as Announcement[])
  }, [eventId])

  useEffect(() => {
    void reload()
    const poll = window.setInterval(() => void reload(), 15000)
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(poll); window.clearInterval(clock) }
  }, [reload])

  const publish = async () => {
    if (busy || (kind === "custom" && !message.trim())) return
    setBusy(true); setFeedback("")
    try {
      // Mehrere Ankündigungen dürfen parallel aktiv sein; keine vorherige löschen.
      const { data, error } = await supabase.from("emd_live_announcements").insert({
        event_id: eventId, kind, scope, message: kind === "custom" ? message.trim().slice(0, 180) : null,
        ends_at: new Date(Date.now() + (kind === "custom" ? Math.max(1, Math.ceil(displaySeconds / 60)) : minutes) * 60000).toISOString(),
        display_mode: displayMode, display_seconds: displaySeconds, repeat_seconds: repeatSeconds, auto_speak: autoSpeak,
      }).select("id,kind,scope,message,ends_at,display_mode,display_seconds,repeat_seconds,auto_speak").single()
      if (error) throw error
      if (data?.auto_speak) {
        setMartinBusy(true)
        // Das Browserfenster am Martin-PC muss zur automatischen Audioausgabe berechtigt sein.
        void enqueueMartin(martinText(data as Announcement, title))
          .catch((e: Error) => setFeedback(`Ankündigung gespeichert, aber Martin: ${e.message}`))
          .finally(() => setMartinBusy(false))
      }
      if (!data?.auto_speak) setFeedback("Ankündigung hinzugefügt – Beamer und EMD TV zeigen die aktiven Meldungen abwechselnd.")
      await reload()
    } catch (e: any) { setFeedback(`Fehler: ${e?.message || "Speichern fehlgeschlagen"}`) }
    finally { setBusy(false) }
  }
  const stop = async (id: string) => {
    if (busy) return
    setBusy(true); setFeedback("")
    try {
      const { error } = await supabase.from("emd_live_announcements")
        .update({ cancelled_at: new Date().toISOString() }).eq("id", id).eq("event_id", eventId)
      if (error) throw error
      setFeedback("Ankündigung beendet.")
      await reload()
    } catch (e: any) { setFeedback(`Fehler: ${e?.message || "Beenden fehlgeschlagen"}`) }
    finally { setBusy(false) }
  }
  const speak = async (a: Announcement) => {
    setMartinBusy(true); setFeedback("")
    try { await enqueueMartin(martinText(a, title)); setFeedback("Martin hat die Durchsage abgespielt.") }
    catch (e: any) { setFeedback(`Martin: ${e?.message || "Ansage nicht möglich"}`) }
    finally { setMartinBusy(false) }
  }
  const active = current.filter(a => Date.parse(a.ends_at) > now)
  return <section className="rounded-2xl border border-orange-400/20 bg-[#10151d] p-4 text-white sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">EMD LIVE-REGIE</h3><p className="text-xs text-white/50">{title} · immer Beamer und EMD TV</p></div><span className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-200">BEAMER + EMD TV</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-semibold text-white/70">Ankündigung
        <select value={kind} onChange={e => setKind(e.target.value as Kind)} className="mt-1 w-full rounded-xl border border-white/15 bg-[#1c2532] px-3 py-3 text-white">{KINDS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
      </label>
      <label className="text-xs font-semibold text-white/70">{kind === "custom" ? "Anzeigedauer: 1 Minute" : "Countdown ab jetzt"}
        <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} disabled={kind === "custom"} className="mt-1 w-full rounded-xl border border-white/15 bg-[#1c2532] px-3 py-3 text-white disabled:opacity-40">{DURATIONS.map(x => <option value={x} key={x}>{formatDuration(x)}</option>)}</select>
      </label>
      <label className="text-xs font-semibold text-white/70">Gültig für
        <select value={scope} onChange={e => setScope(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-[#1c2532] px-3 py-3 text-white"><option value="all">Ganze Veranstaltung</option><option value="herren">Herren</option><option value="damen">Damen</option></select>
      </label>
    </div>
    {kind === "custom" && <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 180))} maxLength={180} placeholder="Deine Durchsage ..." className="mt-3 min-h-20 w-full rounded-xl border border-white/15 bg-[#1c2532] p-3 text-white" />}
    <div className="mt-4 rounded-xl border border-white/10 bg-[#1a222d] p-3">
      <label className="block text-xs font-semibold text-white/70">Anzeigeverhalten
        <select value={displayMode} onChange={e => setDisplayMode(e.target.value as DisplayMode)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111924] px-3 py-3 text-white">
          <option value="repeat">Regelmäßig kurz einblenden</option>
          <option value="once">Einmal einblenden</option>
          <option value="permanent">Dauerhaft anzeigen</option>
        </select>
      </label>
      {displayMode !== "permanent" && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-white/70">Einblenddauer
          <select value={displaySeconds} onChange={e => setDisplaySeconds(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111924] px-3 py-3 text-white">
            {[5,10,12,20,30].map(n => <option key={n} value={n}>{n} Sekunden</option>)}
          </select>
        </label>
        {displayMode === "repeat" && <label className="text-xs font-semibold text-white/70">Wiederholung
          <select value={repeatSeconds} onChange={e => setRepeatSeconds(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111924] px-3 py-3 text-white">
            {[[30,"Alle 30 Sekunden"],[60,"Jede Minute"],[120,"Alle 2 Minuten"],[300,"Alle 5 Minuten"]].map(([n,label]) => <option key={n} value={n}>{label}</option>)}
          </select>
        </label>}
      </div>}
      <p className="mt-2 text-xs text-white/50">{displayMode === "permanent" ? "Bleibt bis zum Ende sichtbar. Andere dauerhafte Meldungen wechseln sich ab." : displayMode === "once" ? `Erscheint einmal für ${displaySeconds} Sekunden.` : `Erscheint alle ${repeatSeconds} Sekunden für ${displaySeconds} Sekunden.`} Beide Anzeigen verwenden dieselbe Einstellung.</p>
    </div>
    <label className="mt-3 flex items-center gap-2 rounded-lg border border-orange-400/20 bg-orange-400/5 p-3 text-sm text-white/85">
      <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="h-4 w-4 accent-orange-500" />
      Martin beim Hinzufügen automatisch einmal sprechen lassen (am Vereins-PC)
    </label>
    <p className="mt-2 text-xs text-amber-200/70">Martin spricht nur über den Browser am Vereins-PC mit laufendem Martin-Dienst. Automatisches Audio kann durch die Browser-Autoplay-Sperre blockiert werden; den Button „Martin sprechen“ kannst du jederzeit verwenden.</p>
    <p className="mt-3 text-xs text-white/45">Mehrere Meldungen sind gleichzeitig möglich und wechseln auf beiden Bildschirmen automatisch. Countdowns schließen keine Anmeldung und starten kein Turnier.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void publish()} disabled={busy || (kind === "custom" && !message.trim())} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-500 disabled:opacity-40">{busy ? "Bitte warten ..." : "Ankündigung hinzufügen"}</button></div>
    <div className="mt-5 border-t border-white/10 pt-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold">Aktive Ankündigungen</h4><span className="text-xs text-white/50">{active.length} aktiv</span></div>
      {active.length === 0 ? <p className="text-sm text-white/45">Noch keine aktive Ankündigung.</p> : <div className="space-y-2">{active.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1c2532] px-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold">{kindName(a.kind)}{a.scope !== "all" ? ` · ${a.scope === "herren" ? "Herren" : "Damen"}` : ""}</p>{<p className="mt-1 text-xs text-orange-300/80">{a.display_mode === "permanent" ? "Dauerhaft" : a.display_mode === "once" ? `Einmalig · ${a.display_seconds} Sek.` : `Alle ${a.repeat_seconds} Sek. · ${a.display_seconds} Sek.`}</p>}{a.message && <p className="mt-1 max-w-md break-words text-xs text-white/60">{a.message}</p>}<p className="mt-1 text-xs text-emerald-300">Bis {new Date(a.ends_at).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="flex items-center gap-2"><button type="button" disabled={martinBusy} onClick={() => void speak(a)} className="rounded-lg border border-orange-400/40 px-3 py-2 text-xs font-bold text-orange-200 hover:bg-orange-400/10 disabled:opacity-40">🎙 Martin sprechen</button><button type="button" disabled={busy} onClick={() => void stop(a.id)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-400/10 disabled:opacity-40">Beenden</button></div></div>)}</div>}
    </div>
    {feedback && <p role="status" className="mt-3 text-xs text-white/75">{feedback}</p>}
  </section>
}

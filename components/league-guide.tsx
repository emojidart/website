"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
import { BookOpen, Check, ChevronLeft, ChevronRight, HelpCircle, Info, Target, X } from "lucide-react"

const GUIDE_KEY = "member-league-spielplan"
// Bei inhaltlich wichtigen Änderungen erhöhen. Dann muss jeder erneut bestätigen.
const GUIDE_VERSION = 4

type GuideRole = "captain" | "co-captain"
type Chapter = { id: string; title: string; eyebrow: string; detail: string[]; note?: string }

const chapters: Chapter[] = [
  {
    id: "orientierung", title: "Spielplan und Spielstatus verstehen", eyebrow: "01 · Spielplan",
    detail: [
      "Unter „Anstehend“ findest du bevorstehende Begegnungen deiner Teams. Datum, Uhrzeit, Gegner und Spielort gehören zum jeweiligen Spiel.",
      "Unter „Abgeschlossen“ erscheinen beendete Begegnungen. Die offiziellen Ergebnisse und Legs stammen bei Sportdarts-Spielen aus dem Sportdarts-Abgleich.",
      "Unter „Verschoben“ kannst du verlegte Begegnungen erkennen. Maßgeblich ist der aktualisierte Termin; der ursprüngliche Termin kann als Hinweis erhalten bleiben.",
      "Bei einem Auswärtsspiel werden – soweit hinterlegt – Lokalname, Anschrift und Kontakt des gegnerischen Kapitäns angezeigt. Über „Route“ öffnest du die Navigation.",
    ],

  },
  {
    id: "spieldetails", title: "Spiel finden und Details prüfen", eyebrow: "02 · Begegnung öffnen",
    detail: [
      "Wähle im Spielplan „Anstehend“, „Abgeschlossen“ oder „Verschoben“, um die passende Begegnung zu finden.",
      "Öffne das gewünschte Spiel und kontrolliere Gegner, Datum, Uhrzeit und Spielort.",
      "Bei Auswärtsspielen findest du gegebenenfalls die Adresse des Lokals. Mit „Route“ kannst du die Navigation öffnen.",
      "Bei einem bereits abgeschlossenen Spiel findest du hier den offiziellen Spielstand und – soweit vorhanden – die Möglichkeiten zur Zusatzstatistik.",
    ],
  },
  {
    id: "sportdarts", title: "Offizielle Ergebnisse von Sportdarts übernehmen", eyebrow: "03 · Ergebnisübernahme",
    detail: [
      "Öffne die betreffende Begegnung und wähle „Sportdarts prüfen“. Der erste Schritt ist eine Vorschau: Noch wird nichts übernommen.",
      "Falls für das manuell angelegte EMD-Spiel keine eindeutige Sportdarts-ID hinterlegt ist, wähle die richtige Sportdarts-Begegnung anhand von Gegner, Datum, Spieltag und Ergebnis aus.",
      "Prüfe in der Vorschau den offiziellen Endstand und die tatsächlich eingesetzten Spieler. Die Zuordnung zu EMD-Spielern sowie die Liga-Berechtigung müssen passen.",
      "Wenn die Sportdarts-Daten noch unvollständig sind, warte auf die offizielle Veröffentlichung. Die Übernahme darf nicht durch geschätzte Legs oder frei erfundene Ergebnisse ersetzt werden.",
      "Sind alle Prüfungen erfolgreich, kannst du die offiziellen Sportdarts-Daten übernehmen. Der Spielstand und die gewonnenen/verlorenen Legs stammen aus Sportdarts.",
    ],
    note: "„Sportdarts prüfen“ ist zunächst eine sichere Vorschau. Erst die ausdrückliche Übernahme speichert den offiziellen Stand.",
  },
  {
    id: "extra", title: "Freiwillige EMD-Zusatzstatistiken erfassen", eyebrow: "04 · Zusatzstatistik",
    detail: [
      "Zusätzliche Statistiken sind freiwillige EMD-Werte – beispielsweise 180er, 171er, High Tonne, Tonne, Shanghai, 95+, Bull, 15–20er, Unter 26/30 oder Semperit-Outs.",
      "Du kannst diese Werte während der Sportdarts-Prüfung über „Zusätzliche EMD-Statistiken erfassen“ ergänzen, sofern du sie bereits kennst.",
      "Ist das Spiel abgeschlossen, erscheint „Statistik anlegen“, wenn für dieses Spiel noch keine Zusatzwerte gespeichert sind. Bei vorhandenen Werten erscheint „Statistik bearbeiten“.",
      "Wähle den tatsächlich eingesetzten Spieler, trage nur die wirklich erzielten Werte ein und speichere. Bei vergessenen Einträgen kannst du später nachtragen; bestehende Zusatzwerte lassen sich korrigieren.",
      "Nicht zutreffende Werte bleiben 0. Bitte keine Schätzungen eintragen. Die zusätzlichen Eingaben ersetzen weder das offizielle Sportdarts-Ergebnis noch die offiziellen Legs.",
    ],
    note: "Nachträgliche Zusatzstatistiken sind von den offiziellen Sportdarts-Legs getrennt. Die Auswertung in übergreifenden Statistiken kann je nach Bereich noch abweichen.",
  },
  {
    id: "probleme", title: "Was tun, wenn etwas nicht stimmt?", eyebrow: "05 · Probleme lösen",
    detail: [
      "Spiel verschoben, aber das alte Datum wird angezeigt? Kontrolliere den aktuellen Termin und melde eine falsche Zuordnung an die Vereinsadministration.",
      "Spieler fehlt in der Sportdarts-Vorschau? Prüfe die Zuordnung und die aktuelle Liga-Berechtigung. Die Übernahme nicht erzwingen.",
      "Aufstellung lässt sich nicht bestätigen? Kontrolliere Anzahl der Starter sowie die Berechtigung der ausgewählten Spieler.",
      "Zusatzwert vergessen? Nutze nach Spielabschluss „Statistik anlegen“ oder „Statistik bearbeiten“ – kein Ergebnis manuell überschreiben.",
      "Besteht der Fehler weiter, notiere Gegner, Spieltag, betroffenen Spieler und die genaue Fehlermeldung und gib diese Angaben an die Vereinsadministration weiter.",
    ],
  },
]

export function LeagueGuide({ role }: { role: GuideRole }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let active = true
    async function init() {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (!active) return
      if (authError || !auth.user) { setMessage("Bitte erneut anmelden."); setLoading(false); return }
      setUserId(auth.user.id)
      const { data, error } = await supabase.from("member_guide_acknowledgements")
        .select("acknowledged_at")
        .eq("user_id", auth.user.id)
        .eq("guide_key", GUIDE_KEY)
        .eq("guide_version", GUIDE_VERSION)
        .maybeSingle()
      if (!active) return
      if (error) { setMessage("Hilfe konnte nicht geladen werden. Bitte erneut versuchen."); setOpen(true) }
      else { setAcknowledged(Boolean(data)); setOpen(!data) }
      setLoading(false)
    }
    void init()
    return () => { active = false }
  }, [])

  const acknowledge = async () => {
    if (!userId || saving) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from("member_guide_acknowledgements").upsert({
      user_id: userId, guide_key: GUIDE_KEY, guide_version: GUIDE_VERSION,
      acknowledged_at: new Date().toISOString(),
    }, { onConflict: "user_id,guide_key,guide_version" })
    setSaving(false)
    if (error) { setMessage("Bestätigung konnte nicht gespeichert werden. Bitte erneut versuchen."); return }
    setAcknowledged(true)
    setOpen(false)
  }

  const goTo = (next: number) => setStep(Math.max(0, Math.min(chapters.length - 1, next)))

  const chapter = chapters[step]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-400/20 bg-orange-500/[0.07] p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <BookOpen className="h-5 w-5 shrink-0 text-orange-300" />
          <div className="min-w-0"><div className="text-sm font-bold text-white">Spielplan-Hilfe für Kapitäne</div><div className="text-xs text-white/60">Spielplan</div></div>
        </div>
        <button type="button" onClick={() => { setStep(0); setOpen(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-400/25 bg-orange-500/15 px-4 py-2 text-sm font-bold text-orange-100 hover:bg-orange-500/25">
          <HelpCircle className="h-4 w-4" /> Hilfe öffnen
        </button>
      </div>
      {mounted && open && createPortal(<div className="fixed inset-0 z-[2147483647] flex min-h-0 min-w-0 items-stretch justify-center overflow-hidden bg-black/90 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="emd-guide-title" className="flex h-full min-h-0 max-h-full w-full min-w-0 max-w-2xl flex-col overflow-hidden rounded-none border border-white/15 bg-[#10141d] text-white shadow-2xl sm:h-auto sm:max-h-[min(760px,92dvh)] sm:rounded-3xl">
          <header className="relative shrink-0 border-b border-white/10 bg-gradient-to-r from-orange-500/15 to-transparent px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
            <div className="pr-10 text-[10px] font-extrabold uppercase tracking-[.14em] text-orange-300">EMD · SPIELPLAN</div>
            <h2 id="emd-guide-title" className="mt-1 pr-8 text-lg font-extrabold leading-tight sm:text-xl">Hilfe für Kapitäne & Co-Kapitäne</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/80 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </header>
          <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3 text-xs text-white/65"><span>Kapitel {step + 1} von {chapters.length}</span><span className="truncate text-orange-300">{chapter.eyebrow}</span></div>
            <div className="mt-2 flex gap-1.5">{chapters.map((c, i) => <button key={c.id} type="button" onClick={() => goTo(i)} aria-label={`Kapitel ${i + 1}: ${c.title}`} aria-current={i === step ? "step" : undefined} className={`h-2 min-w-0 flex-1 rounded-full transition-colors ${i <= step ? "bg-orange-500" : "bg-white/15"}`} />)}</div>
          </div>
          <main key={chapter.id} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="text-lg font-extrabold leading-snug text-white sm:text-xl">{chapter.title}</h3>
            <ol className="mt-4 list-none space-y-3">{chapter.detail.map((item, i) => <li key={i} className="flex min-w-0 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-xs font-bold text-orange-300">{i + 1}</span><span className="min-w-0 break-words text-sm leading-6 text-white/85">{item}</span></li>)}</ol>
            {chapter.note && <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-400/20 bg-orange-500/[0.06] p-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" /><p className="min-w-0 break-words text-xs leading-5 text-white/75">{chapter.note}</p></div>}
          </main>
          <footer className="shrink-0 border-t border-white/10 bg-[#151923] px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {message && <p role="alert" className="mb-2 text-xs text-amber-300">{message}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 text-sm font-bold text-white disabled:opacity-35"><ChevronLeft className="h-4 w-4" /> Zurück</button>
              <button type="button" onClick={() => goTo(step + 1)} disabled={step === chapters.length - 1} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white/10 px-2 text-sm font-bold text-white disabled:opacity-35">Weiter <ChevronRight className="h-4 w-4" /></button>
            </div>
            {!acknowledged && <button type="button" disabled={loading || saving || !userId} onClick={acknowledge} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50"><Check className="h-4 w-4" />{saving ? "Wird gespeichert…" : "Gelesen & verstanden"}</button>}
          </footer>
        </div>
      </div>, document.body)}
    </>
  )
}

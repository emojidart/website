"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowRight, ShieldAlert, Wifi, Wrench, Info } from "lucide-react"

/**
 * Globale Systeminformation: pro neuem Laden/App-Start anzeigen.
 * Kein persistierter Dismiss-Status. Bei clientseitiger Navigation bleibt
 * die Komponente im Root-Layout gemountet und öffnet nicht erneut.
 */
export default function EmdSystemNotice() {
  const [open, setOpen] = useState(false)
  const actionRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("emd:system-notice-dismissed:v1") === "1") return
    } catch {
      // Browser-Speicher eventuell blockiert; Hinweis trotzdem anzeigen.
    }
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    actionRef.current?.focus()

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key !== "Tab") return
      const root = dialogRef.current
      if (!root) return
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", keepFocusInside)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", keepFocusInside)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-[#07101d]/80 px-3 py-4 backdrop-blur-[7px] sm:px-6 sm:py-8">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="emd-system-title"
        aria-describedby="emd-system-description"
        className="relative my-auto w-full max-w-[550px] overflow-hidden rounded-[26px] border border-white/15 bg-[#f8fafc] text-[#152236] shadow-[0_30px_110px_rgba(0,0,0,.48)] sm:rounded-[30px]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#b93a31] via-[#ed673b] to-[#f2ac54]" aria-hidden="true" />
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:max-h-[calc(100dvh-4rem)] sm:px-8 sm:pb-8 sm:pt-7">
          <div className="flex items-start gap-3.5">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-[#f3cbc7] bg-[#fff0ee] text-[#bb3d34]">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#65748a]">EMD · Wichtige Systeminformation</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#f2d8b3] bg-[#fff6e8] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-[#9b5714]">
                <span className="h-2 w-2 rounded-full bg-[#ed8a2f]" aria-hidden="true" />
                Betrieb eingeschränkt
              </div>
            </div>
          </div>

          <h2 id="emd-system-title" className="mt-6 text-[25px] font-bold leading-[1.14] tracking-[-.035em] text-[#101c2b] sm:text-[31px]">
            Plattform derzeit nur eingeschränkt verfügbar
          </h2>

          <div id="emd-system-description" className="mt-4 space-y-3.5 text-[14px] leading-[1.65] text-[#48576a] sm:text-[15px]">
            <p>
              Unsere Vereinsplattform ist derzeit nur teilweise wieder erreichbar. <strong className="font-bold text-[#1c2a3b]">Eine durchgehende Erreichbarkeit und ein störungsfreier Betrieb sind aktuell nicht gewährleistet.</strong>
            </p>
            <p>
              Einzelne Funktionen können ausfallen oder fehlerhaft reagieren. Auch bei der <strong className="font-bold text-[#1c2a3b]">Darstellung, dem Design und der Benutzeroberfläche</strong> kann es zu erheblichen Abweichungen kommen.
            </p>
            <p>Die aktuellen Einschränkungen werden schrittweise behoben, um einen uneingeschränkten Betrieb der Plattform zu ermöglichen.</p>
            <p>Vielen Dank für euer Verständnis!</p>
          </div>

          <div className="mt-5 rounded-[18px] border border-[#e6eaf0] bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,.035)]">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#edf0f4] pb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#718094]">Aktueller Plattformstatus</span>
              <span className="text-[11px] font-semibold text-[#9b5714]">Eingeschränkter Betrieb</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 font-medium text-[#536176]"><Wifi className="h-4 w-4" aria-hidden="true" /> Erreichbarkeit</span>
                <span className="font-semibold text-[#b36d20]">Nicht durchgehend</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 font-medium text-[#536176]"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Funktionen & Darstellung</span>
                <span className="font-semibold text-[#b36d20]">Beeinträchtigt</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 font-medium text-[#536176]"><Wrench className="h-4 w-4" aria-hidden="true" /> Wiederherstellung</span>
                <span className="font-semibold text-[#41546c]">In Bearbeitung</span>
              </div>
            </div>
          </div>

          <div role="note" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#dbe5ef] bg-[#eef4fa] px-3.5 py-3 text-[#526174]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#58738e]" aria-hidden="true" />
            <p className="text-[12px] leading-[1.55] sm:text-[12.5px]">
              <strong className="font-bold text-[#34465e]">Wichtiger Nutzungshinweis:</strong> Aufgrund der aktuellen Einschränkungen können Eingaben verzögert verarbeitet werden. Bitte Aktionen nicht mehrfach ausführen und wichtige Änderungen auf erfolgreiche Speicherung prüfen.
            </p>
          </div>

          <button
            ref={actionRef}
            type="button"
            onClick={() => {
              try {
                window.sessionStorage.setItem("emd:system-notice-dismissed:v1", "1")
              } catch {
                // Hinweis auch ohne Session-Speicher schlieÃŸen.
              }
              setOpen(false)
            }}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#17263a] px-5 py-3 text-[14px] font-bold text-white shadow-[0_12px_28px_rgba(23,38,58,.16)] transition-colors hover:bg-[#263b56] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Verstanden · Zur Plattform
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-[11px] font-medium text-[#8a96a6]">EMD · Emoj!’s Dartverein</p>
        </div>
      </section>
    </div>
  )
}

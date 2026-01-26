"use client"

import { useEffect } from "react"

type Props = {
  open: boolean
  player1: string
  player2: string
  machineNumber?: number
  durationMs?: number
  onDone?: () => void
}

export function VsIntroOverlay({
  open,
  player1,
  player2,
  machineNumber,
  durationMs = 3000,
  onDone,
}: Props) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onDone?.(), durationMs)
    return () => clearTimeout(t)
  }, [open, durationMs, onDone])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">

      {/* Orange glow background */}
      <div className="absolute w-[600px] h-[600px] bg-orange-500/30 rounded-full blur-[160px]" />

      <div className="relative px-12 py-14 rounded-3xl border border-orange-400/40 bg-gradient-to-br from-black via-zinc-900 to-black shadow-[0_0_80px_rgba(255,140,0,0.5)]">

        {/* Titel */}
        <div className="text-center mb-10">
          <p className="uppercase tracking-[0.4em] text-orange-400 text-sm">
            Match startet {machineNumber && `• Automat ${machineNumber}`}
          </p>
        </div>

        {/* VS Layout */}
        <div className="flex items-center gap-14">

          {/* Player 1 */}
          <div className="text-right animate-slideLeft">
            <p className="text-4xl font-extrabold text-white drop-shadow-lg">
              {player1}
            </p>
            <span className="text-orange-400 text-sm">Spieler 1</span>
          </div>

          {/* VS Circle */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full blur-2xl opacity-60 animate-pulse" />
            <div className="relative px-10 py-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl">
              <span className="text-5xl font-black text-black tracking-widest">
                VS
              </span>
            </div>
          </div>

          {/* Player 2 */}
          <div className="text-left animate-slideRight">
            <p className="text-4xl font-extrabold text-white drop-shadow-lg">
              {player2}
            </p>
            <span className="text-orange-400 text-sm">Spieler 2</span>
          </div>

        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-orange-300/70 text-sm">
          Viel Erfolg!
        </p>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }

        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes slideLeft {
          from { transform: translateX(-40px); opacity: 0 }
          to { transform: translateX(0); opacity: 1 }
        }

        @keyframes slideRight {
          from { transform: translateX(40px); opacity: 0 }
          to { transform: translateX(0); opacity: 1 }
        }

        .animate-slideLeft {
          animation: slideLeft 0.4s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

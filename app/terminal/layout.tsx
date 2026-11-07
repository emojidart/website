"use client"

import type { ReactNode } from "react"
import { TerminalTransitionProvider } from "./_components/TerminalTransition"
import TerminalAutoTournamentMode from "./_components/TerminalAutoTournamentMode"

export default function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="emd-terminal-shell min-h-[100svh] bg-[#0b1018] text-white" data-emd-view="terminal">
      <style jsx global>{`
        html,
        body {
          background: #0b1018 !important;
          color-scheme: dark;
        }

        body {
          margin: 0;
          min-height: 100%;
        }

        #__next,
        body > div:first-child,
        [data-nextjs-scroll-focus-boundary] {
          background: #0b1018 !important;
          min-height: 100%;
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

      <TerminalTransitionProvider>
        <TerminalAutoTournamentMode />
        {children}
      </TerminalTransitionProvider>
    </div>
  )
}

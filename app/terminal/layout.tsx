"use client"

import type { ReactNode } from "react"
import { TerminalTransitionProvider } from "./_components/TerminalTransition"

export default function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-[#050608] text-white">
      <style jsx global>{`
        html,
        body {
          background: #050608 !important;
          color-scheme: dark;
        }

        body {
          margin: 0;
          min-height: 100%;
        }

        #__next,
        body > div:first-child,
        [data-nextjs-scroll-focus-boundary] {
          background: #050608 !important;
          min-height: 100%;
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

      <TerminalTransitionProvider>{children}</TerminalTransitionProvider>
    </div>
  )
}

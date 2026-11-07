"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

const EXCLUDED_PREFIXES = [
  "/admin", "/terminal", "/emd-tv", "/emd-tv-screen", "/beamer", "/chat-app",
  "/member-league-app/emd-tv", "/member-league-app/chat",
  "/messenger", "/8erdko/beamer", "/16erdko/beamer",
  "/32erdko/beamer", "/64erdko/beamer", "/128erdko/beamer",
]

function isStandalone(path: string) {
  return EXCLUDED_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + "/"))
}

/**
 * Sofortiges, nicht-blockierendes Navigationsfeedback für normale Vereinsseiten.
 * Verändert keine Routen, Berechtigungen oder Datenabfragen.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPending(false)
    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
      resetTimer.current = null
    }
  }, [pathname])

  useEffect(() => {
    const clear = () => {
      setPending(false)
      if (resetTimer.current) {
        clearTimeout(resetTimer.current)
        resetTimer.current = null
      }
    }

    const show = () => {
      setPending(true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      // Ein fehlgeschlagener Seitenwechsel darf nie dauerhaft "laden".
      resetTimer.current = setTimeout(clear, 10000)
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!anchor || anchor.hasAttribute("download") || anchor.target === "_blank" || anchor.getAttribute("rel")?.includes("external")) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      const current = window.location
      if (url.origin !== current.origin || url.pathname === current.pathname) return
      if (isStandalone(current.pathname) || isStandalone(url.pathname)) return
      show()
    }

    const onPopState = () => {
      if (!isStandalone(window.location.pathname)) show()
    }

    const onProgrammaticNavigation = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href
      if (!href) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      if (isStandalone(window.location.pathname) || isStandalone(url.pathname)) return
      show()
    }

    document.addEventListener("click", onClick)
    window.addEventListener("emd:route-start", onProgrammaticNavigation)
    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", clear)
    return () => {
      document.removeEventListener("click", onClick)
      window.removeEventListener("emd:route-start", onProgrammaticNavigation)
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", clear)
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  if (!pending || isStandalone(pathname)) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9998] h-[3px] overflow-hidden bg-[#26364b]" role="status" aria-label="Seite wird geöffnet">
      <div className="emd-route-progress-bar h-full bg-[#ff9859]" />
    </div>
  )
}

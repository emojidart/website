"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { RouteProgress } from "@/components/navigation/route-progress"
import "@/app/emd-navigation-2026.css"

export default function AppThemeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Specialized surfaces own their viewport and safe areas.
  if (pathname.startsWith("/terminal") || pathname.startsWith("/admin") || pathname.startsWith("/emd-tv-screen") || pathname === "/beamer" || pathname.endsWith("/beamer")) return <>{children}</>
  return <div className="emd-app-theme-shell"><RouteProgress />{children}</div>
}

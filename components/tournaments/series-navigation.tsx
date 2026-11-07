"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { LayoutGrid, ListOrdered, UserPlus, BookOpen } from "lucide-react"

export function SeriesNavigation() {
  const { slug } = useParams<{ slug: string }>()
  const pathname = usePathname()
  const base = `/turniere/serien/${slug}`
  const items = [
    { href: base, label: "Übersicht", icon: LayoutGrid },
    { href: `${base}/anmeldung`, label: "Anmeldung", icon: UserPlus },
    { href: `${base}/tabelle`, label: "Wertung", icon: ListOrdered },
    { href: `${base}/regelwerk`, label: "Regelwerk", icon: BookOpen },
  ]
  return <nav className="et-series-nav" aria-label="Turnierserie">{items.map(({ href, label, icon: Icon }) =>
    <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={17}/>{label}</Link>
  )}</nav>
}

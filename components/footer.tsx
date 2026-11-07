import Link from "next/link"

export function Footer() {
  return (
    <footer className="emd-main-footer border-t border-white/10 bg-[#101722] px-5 py-8 text-sm text-white/65">
      <div className="mx-auto flex max-w-[var(--emd-content-max)] flex-col items-center justify-between gap-4 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Emoj!'s Dartverein e.V.</p>
        <nav aria-label="Rechtliche Informationen" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/impressum" className="inline-flex min-h-11 items-center rounded-md hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50]">Impressum</Link>
          <Link href="/datenschutz" className="inline-flex min-h-11 items-center rounded-md hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50]">Datenschutz</Link>
          <Link href="/kontakt" className="inline-flex min-h-11 items-center rounded-md hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59b50]">Kontakt</Link>
        </nav>
      </div>
    </footer>
  )
}

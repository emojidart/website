import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight, Trophy, type LucideIcon } from "lucide-react"

export function TournamentPageTitle({ title, description, eyebrow = "EMD · Turniere", actions }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode }) {
  return <div className="et-page-title"><div><span className="et-eyebrow"><Trophy size={15} />{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="et-title-actions">{actions}</div>}</div>
}

export function TournamentNavCard({ href, title, description, icon: Icon, eyebrow }: { href: string; title: string; description: string; icon: LucideIcon; eyebrow?: string }) {
  return <Link href={href} className="et-nav-card"><div className="et-nav-card-top"><span className="et-icon"><Icon size={23} /></span><ArrowRight size={20} aria-hidden="true" /></div><div>{eyebrow && <span className="et-eyebrow">{eyebrow}</span>}<h2>{title}</h2><p>{description}</p></div><span className="et-card-link">Öffnen <ChevronRight size={16} /></span></Link>
}

export function TournamentStatus({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" }) {
  return <span className={`et-status et-status-${tone}`}>{children}</span>
}

export function TournamentFact({ label, children, icon: Icon }: { label: string; children: ReactNode; icon?: LucideIcon }) {
  return <div className="et-fact"><span>{Icon && <Icon size={16} />}{label}</span><strong>{children}</strong></div>
}

export function TournamentEmpty({ title, description }: { title: string; description: string }) {
  return <div className="et-empty"><Trophy size={28} /><h2>{title}</h2><p>{description}</p></div>
}

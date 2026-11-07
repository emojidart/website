"use client"

import { SectionSkeleton, ButtonLoader } from "@/components/loading/loading"

import Link from "next/link"
import { ArrowUpRight, CalendarDays, Check, Clock3, Swords } from "lucide-react"
import type { HomeLeagueMatch } from "@/app/_startseite/typen"

type Props = {
  authUserId: string | null
  hasLeaguePackage: boolean
  matches: HomeLeagueMatch[]
  loading: boolean
  saving: string
  onSetAvailability: (match: HomeLeagueMatch, status: "yes" | "maybe" | "no") => Promise<void>
}
const name = (m: HomeLeagueMatch, home: boolean) => home ? m.home_team?.name || m.home_opponent_team?.name || "Heimteam" : m.away_team?.name || m.away_opponent_team?.name || "Gastteam"
export function DeineNaechstenLigaspiele({ authUserId, hasLeaguePackage, matches, loading, saving, onSetAvailability }: Props) {
  if (!authUserId || !hasLeaguePackage) return null
  return <div className="eh-rsvp-grid">
    {loading ? <SectionSkeleton kind="table" /> : matches.length ? matches.map(match => {
      const isSteel = String(match.dart_type || "").toLowerCase().includes("steel")
      const status = match.my_status
      return <article className="eh-rsvp" key={match.id}>
        <div className="eh-rsvp-top"><span className="eh-rsvp-type"><Swords size={15} /> {isSteel ? "STEELDART" : "E-DART"}</span><span className="eh-rsvp-date"><CalendarDays size={14} /> {new Date(match.match_date).toLocaleDateString("de-AT", { day: "2-digit", month: "short" })}{match.match_time ? <><Clock3 size={13} /> {String(match.match_time).slice(0,5)}</> : null}</span></div>
        <div className="eh-rsvp-content"><h3>{name(match, true)} <span>vs</span> {name(match, false)}</h3><div className="eh-rsvp-state"><span>DEINE RÜCKMELDUNG</span><strong className={`eh-rsvp-status eh-rsvp-${status}`}>{status === "yes" ? "Zugesagt" : status === "maybe" ? "Vielleicht" : status === "no" ? "Abgesagt" : "Antwort ausstehend"}</strong></div><div className="eh-rsvp-options">{([ ["yes","Zusage"],["maybe","Vielleicht"],["no","Absage"] ] as const).map(([value,label]) => <button type="button" key={value} className={status === value ? "eh-rsvp-selected" : ""} disabled={Boolean(saving)} onClick={() => void onSetAvailability(match,value)} aria-busy={saving === `${match.id}-${value}` || undefined}><ButtonLoader loading={Boolean(saving === `${match.id}-${value}`)}>{status === value ? <Check size={15} /> : null}{label}</ButtonLoader></button>)}</div><Link href="/member-availability" className="eh-rsvp-open">Aufstellung & Spieldetails <ArrowUpRight size={16}/></Link></div>
      </article>
    }) : <div className="eh-rsvp-empty"><CalendarDays size={24}/><strong>Keine Ligaspiele geplant</strong><span>Deine nächsten Begegnungen erscheinen hier.</span></div>}
  </div>
}

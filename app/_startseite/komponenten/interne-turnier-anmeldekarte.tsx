"use client"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, Clock3, MapPin, Trophy } from "lucide-react"
import type { InternalSignupEvent } from "@/app/_startseite/typen"
import { formatInternalEventDateRange, formatInternalEventDrawDateTime } from "@/app/_startseite/utils"
export function InterneTurnierAnmeldekarte({ event, imageUrl }: { event: InternalSignupEvent; imageUrl: string }) {
  return <Link href={`/internal-events/${event.id}`} className="eh-signup">
    <div className="eh-signup-photo">{imageUrl ? <img src={imageUrl} alt="" /> : <Trophy size={40} />}<span>ANMELDUNG OFFEN</span></div>
    <div className="eh-signup-body"><span className="eh-eyebrow">INTERNER WETTBEWERB</span><h3>{event.title}</h3>{event.subtitle ? <p>{event.subtitle}</p> : null}<div className="eh-signup-details"><span><CalendarDays size={15}/>{formatInternalEventDateRange(event.event_date,event.end_date,event.date_open)}</span>{event.start_time ? <span><Clock3 size={15}/>{event.start_time.slice(0,5)} Uhr</span> : null}{event.location ? <span><MapPin size={15}/>{event.location}</span> : null}{event.draw_mode && <span>Auslosung: {formatInternalEventDrawDateTime(event.draw_datetime) || (event.draw_mode === "onsite" ? "vor Ort" : "online")}</span>}</div><span className="eh-signup-link">Jetzt anmelden <ArrowUpRight size={16}/></span></div>
  </Link>
}

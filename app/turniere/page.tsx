"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CalendarSearch, PlusCircle, FolderKanban, Trophy, Radio, History } from "lucide-react"
import { TournamentNavCard, TournamentPageTitle } from "@/components/tournaments/tournament-ui"

const tiles = [
  { title:"Turniere entdecken", description:"Kommende und vergangene Turniere in Österreich, Deutschland und der Schweiz. Mit Filtern für Ort, Datum und Spielformat.", href:"/turniere/entdecken", eyebrow:"Dein nächstes Turnier", icon:CalendarSearch },
  { title:"Turnierserien", description:"Alle Spieltage, deine Anmeldung und die Gesamtwertung. Verfolge deinen Weg durch die Saison.", href:"/turniere/serien", eyebrow:"Die ganze Saison", icon:Trophy },
  { title:"Veranstaltung einreichen", description:"Dein Turnier im EMD-Kalender: Termin, Veranstaltungsort und Flyer zur Freigabe einreichen.", href:"/turniere/neu", eyebrow:"Für Veranstalter", icon:PlusCircle },
  { title:"Meine Veranstaltungen", description:"Einreichungen und Freigaben im Blick behalten, Details bearbeiten und Veranstaltungen verwalten.", href:"/turniere/meine", eyebrow:"Deine Übersicht", icon:FolderKanban },
]

export default function DachTurniereHubPage() {
  const [backHref,setBackHref]=useState("/")
  useEffect(()=>{const stored=window.sessionStorage.getItem("emd:public-area-origin");if(stored&&stored.startsWith("/"))setBackHref(stored)},[])
  return <div>
    <Header variant="app" title="Turniere & Serien" subtitle="Turnierbereich" backHref={backHref} />
    <main className="et-shell">
      <TournamentPageTitle title="Dein Spiel. Dein Turnier." description="Vom nächsten Dartabend bis zur ganzen Saison: Entdecke Turniere, melde dich an und behalte deine Ergebnisse im Blick." actions={<Link className="et-button et-button-primary" href="/turniere/entdecken"><CalendarSearch size={18}/>Turnier finden</Link>} />
      <div className="et-hub-grid">{tiles.map(tile=><TournamentNavCard key={tile.href} {...tile}/>)}</div>
      <div className="et-section-heading"><h2>Das Turniergeschehen</h2></div>
      <div className="et-hub-grid">
        <TournamentNavCard href="/live-all-app" title="Live dabei" description="Laufende Spiele und aktuelle Spielstände verfolgen." icon={Radio}/>
        <TournamentNavCard href="/tournament-history" title="Ergebnisse & Rückblick" description="Abgeschlossene Turniere und gespeicherte Platzierungen ansehen." icon={History}/>
      </div>
    </main><MobileBottomNav/>
  </div>
}

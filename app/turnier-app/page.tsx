import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Calendar, Radio, Video, BookOpen, Trophy, History } from "lucide-react"
import { TournamentPageTitle, TournamentNavCard } from "@/components/tournaments/tournament-ui"

const destinations = [
  { href:"/upcoming-tournaments-app", title:"Kommende Events", description:"Termine entdecken und das nächste Turnier planen.", icon:Calendar },
  { href:"/turniere/serien", title:"Turnierserien", description:"Spieltage, Anmeldung und Gesamtwertung deiner Saison.", icon:Trophy },
  { href:"/live-all-app", title:"Liveticker", description:"Laufende Spiele und aktuelle Spielstände verfolgen.", icon:Radio },
  { href:"/livestream-app", title:"Livestream", description:"Die Spiele live im Stream erleben.", icon:Video },
  { href:"/tournament-history", title:"Ergebnisse", description:"Abgeschlossene Turniere und Platzierungen nachlesen.", icon:History },
  { href:"/regelwerk-app", title:"Lion Cup · Regelwerk", description:"Alle Regeln und Informationen zum EMD Lion Cup.", icon:BookOpen },
]

export default function TurnierAppPage() {
  return <div><Header/><main className="et-shell">
    <TournamentPageTitle title="Mitten im Turniergeschehen." description="Deine Turniere, deine Saison und alle Spiele live. Alles, was du für den nächsten Dartabend brauchst."/>
    <div className="et-hub-grid">{destinations.map(item=><TournamentNavCard key={item.href} {...item}/>)}</div>
  </main><MobileBottomNav/></div>
}

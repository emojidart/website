"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import Link from "next/link"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowRight, ArrowUpRight, AlertTriangle, CalendarDays, ChevronRight, MapPin, MonitorPlay, PartyPopper, Radio, ShoppingBag, Sparkles, Swords, Trophy, UsersRound, Zap } from "lucide-react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { ClubhouseStatusCard } from "@/components/clubhouse-status-card"
import { PushEnableBanner } from "@/components/push-enable-banner"
import { PushNotificationDialog } from "@/components/push-notification-dialog"
import { InstallEmdApp } from "@/components/install-emd-app"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { InterneTurnierAnmeldekarte } from "@/app/_startseite/komponenten/interne-turnier-anmeldekarte"
import { DeineNaechstenLigaspiele } from "@/app/_startseite/komponenten/deine-naechsten-ligaspiele"
import { useStartseitenLiga } from "@/app/_startseite/hooks/use-startseiten-liga"
import { useStartseitenVeranstaltungen } from "@/app/_startseite/hooks/use-startseiten-veranstaltungen"
import { useStartseitenDynamischeSerien } from "@/app/_startseite/hooks/use-startseiten-dynamische-serien"
import { useAktivesStartseitenTurnier } from "@/app/_startseite/hooks/use-aktives-startseiten-turnier"
import { useInterneStartseitenAnmeldungen } from "@/app/_startseite/hooks/use-interne-startseiten-anmeldungen"
import { useStartseitenGeburtstage } from "@/app/_startseite/hooks/use-startseiten-geburtstage"
import { useStartseitenNaechsteSpiele } from "@/app/_startseite/hooks/use-startseiten-naechste-spiele"
import { useStartseitenAuthUser } from "@/app/_startseite/hooks/use-startseiten-auth-user"
import type { CombinedEvent, Match } from "@/app/_startseite/typen"
import "./emd-app-home.css"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const dateLabel = (date: string) => { const d = new Date(date); return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("de-AT", { day: "2-digit", month: "short", year: "numeric" }) }
const dateTime = (date: string) => { const d = new Date(date); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("de-AT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) }
const teamName = (match: Match, home: boolean) => home ? match.home_team?.name || match.home_opponent_team?.name || "Heimteam" : match.away_team?.name || match.away_opponent_team?.name || "Gastteam"
const teamLogo = (match: Match, home: boolean) => home ? match.home_team?.logo_url || match.home_opponent_team?.logo_url : match.away_team?.logo_url || match.away_opponent_team?.logo_url
const internalImage = (path?: string | null, fallback?: string | null) => path ? supabase.storage.from("internal-events").getPublicUrl(path).data.publicUrl : fallback || ""

function SectionHeading({ eyebrow, title, href, action = "Alle ansehen", children }: { eyebrow: string; title: string; href?: string; action?: string; children?: React.ReactNode }) {
  return <div className="eh-section-heading"><div className="eh-section-title"><span className="eh-eyebrow">{eyebrow}</span><h2>{title}</h2>{children ? <p>{children}</p> : null}</div>{href ? <Link className="eh-more" href={href}>{action}<ArrowUpRight size={16} /></Link> : null}</div>
}
function TeamMark({ logo, name }: { logo?: string | null; name: string }) {
  return <div className="eh-team"><div className="eh-team-logo">{logo ? <img src={logo} alt="" /> : <Swords size={20} />}</div><strong title={name}>{name}</strong></div>
}
function Empty({ title, description }: { title: string; description: string }) { return <div className="eh-empty"><CalendarDays size={22} /><strong>{title}</strong><span>{description}</span></div> }

export default function Home() {
  const { loading: membershipLoading, hasModule } = useMembershipAccess()
  const canSeeEDartLeague = hasModule("edart_league")
  const canSeeSteeldartLeague = hasModule("steeldart_league")
  const canSeeInternalTournaments = hasModule("internal_tournaments")
  const hasLeaguePackage = canSeeEDartLeague || canSeeSteeldartLeague
  const authUserId = useStartseitenAuthUser()
  const { matches, loading: matchLoading } = useStartseitenNaechsteSpiele()
  const { myLeagueMatches, myLeagueLoading, myLeagueSaving, setHomeLeagueAvailability } = useStartseitenLiga({ authUserId, membershipLoading, canSeeEDartLeague, canSeeSteeldartLeague, hasLeaguePackage })
  const { combinedEvents } = useStartseitenVeranstaltungen()
  const { seriesItems, liveRegistrationItems, loading: dynamicSeriesLoading } = useStartseitenDynamischeSerien({ membershipLoading, canSeeInternalTournaments })
  const { activeTournament } = useAktivesStartseitenTurnier()
  const { internalSignupEvents, internalSignupLoading } = useInterneStartseitenAnmeldungen({ membershipLoading, canSeeInternalTournaments })
  const { birthdayPlayers, birthdayLoading } = useStartseitenGeburtstage()
  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const todaysEvents = combinedEvents.filter(e => { const start = e.start_date || e.date; const end = e.end_date || e.date; return Boolean(start && end && todayISO >= start && todayISO <= end) })
  const emdEvents = combinedEvents.filter(e => e.sourceKind === "internal").slice(0, 2)
  const keys = new Set(emdEvents.map(e => `${e.sourceKind}:${e.id}`))
  const events = [...emdEvents, ...combinedEvents.filter(e => e.type === "tournament" && !keys.has(`${e.sourceKind}:${e.id}`)).slice(0, 2)].slice(0, 4)
  const rememberOrigin = () => sessionStorage.setItem("emd:public-area-origin", location.pathname + location.search)
  const openEvent = async (item: CombinedEvent) => {
    if (item.sourceKind === "dach") { rememberOrigin(); window.location.href = `/dach-veranstaltungen/${item.id}`; return }
    if (item.type === "tournament") {
      const { data, error } = await supabase.from("dach_events").select("id").eq("internal_event_id", item.internalEventId || item.id).eq("event_status", "approved").maybeSingle()
      if (!error && data?.id) { rememberOrigin(); window.location.href = `/dach-veranstaltungen/${data.id}`; return }
    }
    window.location.href = `/veranstaltungen/${item.internalEventId || item.id}`
  }
  return <div className="emd-app-home">
    <Header />
    <div className="eh-header-spacer" aria-hidden="true" />
    <main className="eh-shell">
      <div className="eh-page-intro"><div><span className="eh-eyebrow"><span className="eh-online-dot" /> EMOJ!'S DARTVEREIN · SALZBURG</span><h1>Dein Verein. <span>Dein Spiel.</span></h1><p>Alles Wichtige für deinen nächsten Dart-Moment.</p></div><Link href="/veranstaltungen" className="eh-date-link"><CalendarDays size={18} /> Termine <ArrowUpRight size={16} /></Link></div>
      <div className="eh-top-grid">
        <section className="eh-feature"><div className="eh-feature-noise" aria-hidden="true" /><div className="eh-feature-top"><span className="eh-feature-kicker"><Sparkles size={15} /> DEIN CLUB-HUB</span><span className="eh-feature-index">EMD / 2026</span></div><div className="eh-feature-content"><div className="eh-feature-monogram">EMD<span>.</span></div><h2>Hier beginnt<br />dein <em>Match.</em></h2><p>Spiele organisieren, Turniere entdecken und gemeinsam mehr erleben.</p><div className="eh-feature-actions"><Link href="/member-availability" className="eh-button eh-button-light">Meine Spiele <ArrowUpRight size={17} /></Link><Link href="/turniere" className="eh-button eh-button-ghost">Turniere <ArrowRight size={17} /></Link></div></div><div className="eh-feature-bottom"><span><span className="eh-pulse" /> IMMER AM BALL</span><span>EMOJ!'S DARTVEREIN</span></div></section>
        <div className="eh-launchpad"><div className="eh-launchpad-head"><div><span className="eh-eyebrow">DEINE ZENTRALE</span><h2>Schnellzugriff</h2></div><span className="eh-launchpad-number">04</span></div><div className="eh-launchpad-grid">{[
          { label: "Meine Spiele", description: "Zusagen & Aufstellung", href: "/member-availability", count: myLeagueMatches.length, icon: Swords },
          { label: "Turniere", description: "Spielen & anmelden", href: "/turniere", count: combinedEvents.filter(e => e.type === "tournament").length, icon: Trophy },
          { label: "Kalender", description: "Events im Verein", href: "/veranstaltungen", count: todaysEvents.length, icon: CalendarDays },
          { label: "Line-up", description: "Aufstellungen & Zusagen", href: "/member-availability", count: null, icon: MonitorPlay },
        ].map(item => <Link href={item.href} key={item.label} className="eh-launch"><span className="eh-launch-icon"><item.icon size={22} strokeWidth={1.9} /></span><span className="eh-launch-copy"><strong>{item.label}</strong><small>{item.description}</small></span>{item.count !== null && item.count > 0 ? <span className="eh-count">{item.count}</span> : <ChevronRight className="eh-launch-arrow" size={17} />}</Link>)}</div></div>
      </div>
      <div className="eh-utility-row"><ClubhouseStatusCard />{activeTournament ? <Link href="/live-all-app" className="eh-live"><span><Radio size={18} /> LIVE-TURNIER</span><strong>{activeTournament.tournament_name}</strong><ArrowUpRight size={18} /></Link> : null}</div>
      <div className="eh-alert" role="status"><AlertTriangle size={19} /><div><strong>Eingeschränkte Verfügbarkeit</strong><p>Einzelne Funktionen sind derzeit eingeschränkt. Bitte prüfe, ob Änderungen erfolgreich gespeichert wurden.</p></div><span>Systemstatus</span></div>
      <PushEnableBanner /><PushNotificationDialog />
      {authUserId && hasLeaguePackage ? <section className="eh-section eh-my-matches"><SectionHeading eyebrow="DEIN TEAM" title="Deine nächsten Ligaspiele" href="/member-availability" action="Alle Spiele" /> <DeineNaechstenLigaspiele authUserId={authUserId} hasLeaguePackage={hasLeaguePackage} matches={myLeagueMatches} loading={Boolean(myLeagueLoading)} saving={myLeagueSaving} onSetAvailability={setHomeLeagueAvailability} /></section> : null}
      {todaysEvents.length > 0 || (!birthdayLoading && birthdayPlayers.length > 0) ? <div className="eh-today-grid">{todaysEvents.length > 0 ? <div className="eh-today"><span className="eh-eyebrow">HEUTE IM VEREIN</span>{todaysEvents.map(e => <button key={e.id} onClick={() => openEvent(e)}><CalendarDays size={18} /><strong>{e.name}</strong><ArrowRight size={17} /></button>)}</div> : null}{!birthdayLoading && birthdayPlayers.length > 0 ? <div className="eh-today"><span className="eh-eyebrow">WIR GRATULIEREN</span><div className="eh-birthday"><PartyPopper size={20}/><strong>{birthdayPlayers.map(p => p.name).join(", ")}</strong></div></div> : null}</div> : null}
      {canSeeInternalTournaments && (internalSignupLoading || internalSignupEvents.length > 0) ? <section className="eh-section"><SectionHeading eyebrow="VEREINSINTERN" title="Jetzt anmelden" href="/internal-events" />{internalSignupLoading ? <SectionSkeleton kind="tournament" label="Interne Veranstaltungen werden geladen…" /> : <div className="eh-signup-grid">{internalSignupEvents.map(event => <InterneTurnierAnmeldekarte key={event.id} event={event} imageUrl={internalImage(event.image_path, event.image_url)} />)}</div>}</section> : null}
      {liveRegistrationItems.length > 0 ? <section className="eh-section"><SectionHeading eyebrow="ANMELDUNG OFFEN" title="Nächste Startmöglichkeiten" /><div className="eh-registration-grid">{liveRegistrationItems.map(item => <Link key={item.id} href={`/turniere/serien/${item.slug}/anmeldung`} className="eh-registration"><span className="eh-registration-icon"><Zap size={19} /></span><span><small>Jetzt anmelden {item.accessType === "club_internal" ? "· Intern" : ""}</small><strong>{item.name}</strong>{item.nextEvent && <small>{dateTime(item.nextEvent.startAt)}</small>}</span><ArrowUpRight size={19} /></Link>)}</div></section> : null}
      <section className="eh-section"><SectionHeading eyebrow="DER SPIELPLAN" title="Nächste Begegnungen" href="/liga-statistiken-app" action="Spielplan"><span>Deine Teams, kommende Gegner und Anstoßzeiten.</span></SectionHeading><div className="eh-matches-grid">{matchLoading ? <SectionSkeleton kind="cards" /> : matches.length ? matches.slice(0, 4).map(match => <Link key={match.id} href="/liga-statistiken-app" className="eh-match"><div className="eh-match-meta"><span><CalendarDays size={14}/>{dateLabel(match.match_date)}</span><span>{match.match_time ? String(match.match_time).slice(0, 5) + " Uhr" : "Zeit offen"}</span></div><div className="eh-match-teams"><TeamMark logo={teamLogo(match, true)} name={teamName(match, true)} /><span className="eh-versus">VS</span><TeamMark logo={teamLogo(match, false)} name={teamName(match, false)} /></div><div className="eh-match-bottom"><span>{match.dart_type || "LIGA"}</span><span>Zum Spiel <ArrowUpRight size={16}/></span></div></Link>) : <Empty title="Keine Begegnungen" description="Der Spielplan ist aktuell leer." />}</div></section>
      <section className="eh-section"><SectionHeading eyebrow="WETTBEWERBE" title="Turnierserien" href="/turniere/serien" action="Alle Serien">Alle Serien, Spieltage und Anmeldungen auf einen Blick.</SectionHeading><div className="eh-series-grid">{dynamicSeriesLoading ? <SectionSkeleton kind="cards" /> : seriesItems.length ? seriesItems.slice(0, 6).map(item => <Link key={item.id} href={`/turniere/serien/${item.slug}`} className="eh-series"><div className="eh-series-art" style={item.imageUrl ? { backgroundImage: `linear-gradient(180deg,rgba(10,20,31,.04),rgba(10,20,31,.68)),url("${item.imageUrl}")` } : undefined}><span>TURNIERSERIE</span><span>{item.registrationOpen ? "ANMELDUNG OFFEN" : item.accessType === "club_internal" ? "INTERN" : "ÖFFENTLICH"}</span></div><div className="eh-series-body"><h3>{item.name}</h3><p>{item.description || "Alle Details zur Serie entdecken."}</p><div className="eh-series-info"><span><CalendarDays size={15}/>{item.nextEvent ? dateTime(item.nextEvent.startAt) : "Termin folgt"}</span>{item.totalTournamentDays ? <span>{item.totalTournamentDays} Spieltage</span> : null}</div><div className="eh-series-foot"><span>Startgeld € {item.startgeld.toFixed(2)}</span><span>Serie ansehen <ArrowUpRight size={16}/></span></div></div></Link>) : <Empty title="Noch keine Turnierserien" description="Sobald eine Serie aktiv ist, erscheint sie hier." />}</div></section>
      <section className="eh-section"><SectionHeading eyebrow="DEIN VEREINSLEBEN" title="Events & Turniere" href="/veranstaltungen" action="Alle Termine">Die nächsten Highlights und Veranstaltungen.</SectionHeading><div className="eh-events-grid">{events.length ? events.map(item => <button key={`${item.sourceKind}:${item.id}`} type="button" onClick={() => openEvent(item)} className="eh-event"><div className="eh-event-image">{item.photo_url ? <img src={item.photo_url} alt="" /> : <Trophy size={40}/>}<span>{item.sourceKind === "dach" ? "DACH" : "EMD"}</span></div><div className="eh-event-body"><div className="eh-event-date"><CalendarDays size={14}/>{dateLabel(item.date)}{item.time ? ` · ${String(item.time).slice(0, 5)} Uhr` : ""}</div><h3>{item.name}</h3><div className="eh-event-foot"><span><MapPin size={14}/>{item.location || "Ort folgt"}</span><ArrowUpRight size={18}/></div></div></button>) : <Empty title="Keine Events eingetragen" description="Kommende Veranstaltungen erscheinen hier." />}</div></section>
      <section className="eh-extras"><div><span className="eh-eyebrow">MEHR ENTDECKEN</span><h2>Auch das ist EMD.</h2></div><div className="eh-extras-grid"><Link href="/member-availability"><MonitorPlay size={22}/><strong>Line-up</strong><span>Aufstellungen ansehen</span><ArrowUpRight size={17}/></Link><Link href="/dartboerse" onClick={rememberOrigin}><ShoppingBag size={22}/><strong>Dartbörse</strong><span>Kaufen & verkaufen</span><ArrowUpRight size={17}/></Link><Link href="/gastzugang-info"><UsersRound size={22}/><strong>Gastzugang</strong><span>Verein kennenlernen</span><ArrowUpRight size={17}/></Link><Link href="/turniere" onClick={rememberOrigin}><Trophy size={22}/><strong>DACH-Turniere</strong><span>Turniere entdecken</span><ArrowUpRight size={17}/></Link></div></section>
      <section className="eh-section eh-sponsors"><SectionHeading eyebrow="UNSER RÜCKHALT" title="Partner & Unterstützer" href="/sponsoring" action="Partner werden">Unternehmen, die unseren Verein unterstützen.</SectionHeading><div className="eh-sponsors-grid"><div className="eh-sponsor-main"><span>HAUPTSPONSOR</span><Image src="/images/sponsoren/sponsor1.png" alt="Hauptsponsor" width={220} height={90} /></div><div className="eh-sponsor-premium"><span>PREMIUM PARTNER</span><div>{[2,3,4].map(num => <figure key={num}><Image src={`/images/sponsoren/sponsor${num}.png`} alt={`Premium Partner ${num}`} width={130} height={60}/></figure>)}</div></div></div><div className="eh-sponsor-others">{[5,6,7,8,9,10,11,12].map(num => <figure key={num}><Image src={`/images/sponsoren/sponsor${num}.png`} alt={`Vereinspartner ${num}`} width={115} height={54}/></figure>)}</div></section>
      <section className="eh-download"><div><span className="eh-eyebrow">EMD AUF DEINEM HANDY</span><h2>Dein Verein. Immer dabei.</h2><p>Installiere die Vereins-App und bleibe über Spiele und Veranstaltungen informiert.</p></div><div className="eh-download-actions"><InstallEmdApp /><a href="https://play.google.com/store/apps/details?id=com.emojisdartverein.app" target="_blank" rel="noopener noreferrer"><Image src="/images/google-play-badge.png" alt="Google Play" width={160} height={48}/></a></div></section>
      <footer className="eh-footer"><span>© {new Date().getFullYear()} Emoj!'s Dartverein · Salzburg</span><nav aria-label="Rechtliches"><Link href="/sponsoring">Partner & Sponsoring</Link><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/kontakt">Kontakt</Link></nav></footer>
    </main>
    <FAQChatWidget /><MobileBottomNav />
  </div>
}

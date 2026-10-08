"use client"

import { Header } from "@/components/header"
import { PushEnableBanner } from "@/components/push-enable-banner"
import { InstallEmdApp } from "@/components/install-emd-app"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import {
  Trophy,
  ArrowRight,
  Calendar,
  MapPin,
  Clock,
  PartyPopper,
  Zap,
  Loader2,
  UserPlus,
  ShoppingBag,
  Tv2
} from "lucide-react"
import Image from "next/image"
import { FAQChatWidget } from "@/components/faq-chat-widget"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { ClubhouseStatusCard } from "@/components/clubhouse-status-card"
import { useMembershipAccess } from "@/hooks/use-membership-access"
import { PushNotificationDialog } from "@/components/push-notification-dialog"

import { InterneTurnierAnmeldekarte } from "@/app/_startseite/komponenten/interne-turnier-anmeldekarte"
import { StartseitenHero } from "@/app/_startseite/komponenten/startseiten-hero"
import { DeineNaechstenLigaspiele } from "@/app/_startseite/komponenten/deine-naechsten-ligaspiele"
import { HeuteImVerein } from "@/app/_startseite/komponenten/heute-im-verein"
import { useStartseitenLiga } from "@/app/_startseite/hooks/use-startseiten-liga"
import { useStartseitenVeranstaltungen } from "@/app/_startseite/hooks/use-startseiten-veranstaltungen"
import { useStartseitenDynamischeSerien } from "@/app/_startseite/hooks/use-startseiten-dynamische-serien"
import { useAktivesStartseitenTurnier } from "@/app/_startseite/hooks/use-aktives-startseiten-turnier"
import { useInterneStartseitenAnmeldungen } from "@/app/_startseite/hooks/use-interne-startseiten-anmeldungen"
import { useStartseitenGeburtstage } from "@/app/_startseite/hooks/use-startseiten-geburtstage"
import { useStartseitenNaechsteSpiele } from "@/app/_startseite/hooks/use-startseiten-naechste-spiele"
import { useStartseitenAuthUser } from "@/app/_startseite/hooks/use-startseiten-auth-user"
import type { Match, CombinedEvent } from "@/app/_startseite/typen"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

//-----------------

function internalEventImageUrl(path:string|null|undefined,legacyUrl?:string|null){
  if(path)return supabase.storage.from("internal-events").getPublicUrl(path).data.publicUrl
  return legacyUrl||""
}

export default function Home() {
  const rememberPublicAreaOrigin = () => {
    window.sessionStorage.setItem("emd:public-area-origin", window.location.pathname + window.location.search)
  }
  const { loading: membershipLoading, hasModule } = useMembershipAccess()
  const canSeeEDartLeague = hasModule("edart_league")
  const canSeeSteeldartLeague = hasModule("steeldart_league")
  const canSeeInternalTournaments = hasModule("internal_tournaments")
  const hasLeaguePackage = canSeeEDartLeague || canSeeSteeldartLeague
  const {
    matches,
    loading,
  } = useStartseitenNaechsteSpiele()
  

  
  
    
  // --- DKO Self Registration (Turniertag-Box) ---
  const authUserId = useStartseitenAuthUser()
  const {
    myLeagueMatches,
    myLeagueLoading,
    myLeagueSaving,
    setHomeLeagueAvailability,
  } = useStartseitenLiga({
    authUserId,
    membershipLoading,
    canSeeEDartLeague,
    canSeeSteeldartLeague,
    hasLeaguePackage,
  })
  const { combinedEvents } = useStartseitenVeranstaltungen()
  const {
    seriesItems,
    liveRegistrationItems,
    loading: dynamicSeriesLoading,
  } = useStartseitenDynamischeSerien()
  const { activeTournament } = useAktivesStartseitenTurnier()
  const {
    internalSignupEvents,
    internalSignupLoading,
  } = useInterneStartseitenAnmeldungen({
    membershipLoading,
    canSeeInternalTournaments,
  })
  const {
    birthdayPlayers,
    birthdayLoading,
  } = useStartseitenGeburtstage()

  const getTeamName = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team?.name || match.home_opponent_team?.name || "Unbekanntes Team"
    }

    return match.away_team?.name || match.away_opponent_team?.name || "Unbekanntes Team"
  }

  const getTeamLogo = (match: Match, isHome: boolean) => {
    if (isHome) {
      return match.home_team?.logo_url || match.home_opponent_team?.logo_url || null
    }

    return match.away_team?.logo_url || match.away_opponent_team?.logo_url || null
  }

  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const todaysEvents = combinedEvents.filter((event) => {
    const start = event.start_date || event.date
    const end = event.end_date || event.date
    if (!start || !end) return false
    return todayISO >= start && todayISO <= end
  })

  const emdUpcomingEvents = combinedEvents
    .filter((item) => item.sourceKind === "internal")
    .slice(0, 2)

  const emdHomepageKeys = new Set(
    emdUpcomingEvents.map((item) => `${item.sourceKind}:${item.id}`),
  )

  const discoverTournaments = combinedEvents
    .filter((item) => item.type === "tournament")
    .filter((item) => !emdHomepageKeys.has(`${item.sourceKind}:${item.id}`))
    .slice(0, 2)

  const homepageEventItems = [...emdUpcomingEvents, ...discoverTournaments].slice(0, 3)

  const openHomepageEvent = async (item: CombinedEvent) => {
    if (item.sourceKind === "dach") {
      rememberPublicAreaOrigin()
      window.location.href = `/dach-veranstaltungen/${item.id}`
      return
    }

    // Interne EMD-Turniere immer über die neue DACH-Detailseite öffnen.
    // Dort läuft die Anmeldung ausschließlich über das zentrale Turniersystem.
    if (item.type === "tournament") {
      const internalEventId = item.internalEventId || item.id

      const { data: dachEvent, error: dachEventError } = await supabase
        .from("dach_events")
        .select("id")
        .eq("internal_event_id", internalEventId)
        .eq("event_status", "approved")
        .maybeSingle()

      if (!dachEventError && dachEvent?.id) {
        rememberPublicAreaOrigin()
        window.location.href = `/dach-veranstaltungen/${dachEvent.id}`
        return
      }
    }

    // Normale Vereinsveranstaltungen bleiben auf der internen Detailseite.
    window.location.href = `/veranstaltungen/${item.internalEventId || item.id}`
  }


  return (
    <div className="emd-home-page min-h-screen bg-transparent text-white">
      <Header />

      {/* Abstand für fixed Header */}
      <div className="h-12 sm:h-14" aria-hidden="true" />

      {/* Vereinslokal / Öffnungszeiten – mit sauberem Abstand zum Header */}
      <section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-4 sm:px-5 sm:pt-5 lg:px-8 xl:px-10">
        <ClubhouseStatusCard />
      </section>

      <div className="mt-4 sm:mt-5">
        <PushEnableBanner />
      </div>

      <PushNotificationDialog />


      <StartseitenHero
        leagueMatchCount={myLeagueMatches.length}
        todaysEventCount={todaysEvents.length}
        tournamentCount={combinedEvents.filter((item) => item.type === "tournament").length}
      />

      {canSeeInternalTournaments && (internalSignupLoading || internalSignupEvents.length > 0) ? (
        <section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-5 sm:px-5 sm:pt-6 lg:px-8 xl:px-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">Neu · Vereinsintern</div>
                <h2 className="text-lg font-black leading-tight text-slate-950 sm:text-xl">Jetzt anmelden</h2>
              </div>
            </div>
            <Button variant="ghost" className="rounded-xl font-black" onClick={() => (window.location.href = "/internal-events")}>
              Alle anzeigen
            </Button>
          </div>

          {internalSignupLoading ? (
            <div className="rounded-3xl border bg-white p-6 text-center text-sm font-bold text-slate-500">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Interne Events werden geladen…
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {internalSignupEvents.map((event) => (
                <InterneTurnierAnmeldekarte
                  key={event.id}
                  event={event}
                  imageUrl={internalEventImageUrl(event.image_path, event.image_url)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <DeineNaechstenLigaspiele
        authUserId={authUserId}
        hasLeaguePackage={hasLeaguePackage}
        matches={myLeagueMatches}
        loading={myLeagueLoading}
        saving={myLeagueSaving}
        onSetAvailability={setHomeLeagueAvailability}
      />

	  <HeuteImVerein events={todaysEvents} />	  {!birthdayLoading && birthdayPlayers.length > 0 && (
        <section className="mx-auto mt-3 w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8 xl:px-10">
          <div className="flex flex-col gap-3 rounded-2xl border border-orange-300/20 bg-orange-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10">
                <PartyPopper className="h-5 w-5 text-orange-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300/75">Geburtstag im Verein</div>
                <div className="mt-0.5 text-sm font-black text-white sm:text-base">
                  {birthdayPlayers.length === 1
                    ? `${birthdayPlayers[0].name}${birthdayPlayers[0].age ? ` · ${birthdayPlayers[0].age}. Geburtstag` : ""}`
                    : `${birthdayPlayers.length} Vereinsmitglieder feiern heute`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {birthdayPlayers.map((player) => (
                <span key={player.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-white/65">
                  {player.name}{player.age ? ` · ${player.age}` : ""}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}


<section className="mx-auto mt-6 w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8 xl:px-10">
  <button
    type="button"
    onClick={() => { rememberPublicAreaOrigin(); window.location.href = "/emd-tv" }}
    className="group relative w-full overflow-hidden rounded-[26px] border border-orange-300/20 bg-[linear-gradient(135deg,rgba(249,115,22,.16),rgba(7,11,18,.96)_46%,rgba(14,165,233,.10))] p-5 text-left shadow-[0_24px_70px_-45px_rgba(249,115,22,.85)] transition-all hover:-translate-y-0.5 hover:border-orange-300/40 hover:shadow-[0_30px_80px_-42px_rgba(249,115,22,.95)] sm:p-6"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl transition group-hover:bg-orange-500/20" />
    <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

    <div className="relative flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-300/30 bg-orange-500/12 shadow-[0_0_32px_rgba(249,115,22,.14)] sm:h-16 sm:w-16">
        <Tv2 className="h-7 w-7 text-orange-300 sm:h-8 sm:w-8" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-orange-300/25 bg-orange-500/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-200">
            Neu
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/75">EMD TV</span>
        </div>
        <div className="text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">Starting Lineup</div>
        <div className="mt-1 text-sm font-semibold text-white/45">Teamaufstellungen & Match-Intros ansehen</div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-white/80 transition group-hover:border-orange-300/20 group-hover:bg-orange-500/10 group-hover:text-white sm:flex">
        Jetzt ansehen
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>

      <ArrowRight className="h-5 w-5 shrink-0 text-orange-300 sm:hidden" />
    </div>
  </button>

  <div className="mt-5 mb-3">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Weitere Bereiche</div>
  </div>

  <div className="grid gap-3 sm:grid-cols-3">
    <button type="button" onClick={() => (window.location.href = "/gastzugang-info")} className="group flex min-h-[98px] items-center gap-3 rounded-2xl border border-white/10 bg-[#080d14]/85 p-4 text-left transition hover:border-orange-300/25 hover:bg-white/[0.045]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10"><UserPlus className="h-5 w-5 text-orange-300" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300/70">Gastzugang</div>
        <div className="mt-1 font-black text-white">VereinsApp kennenlernen</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
    </button>

    <button type="button" onClick={() => { rememberPublicAreaOrigin(); window.location.href = "/dartboerse" }} className="group flex min-h-[98px] items-center gap-3 rounded-2xl border border-white/10 bg-[#080d14]/85 p-4 text-left transition hover:border-orange-300/25 hover:bg-white/[0.045]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"><ShoppingBag className="h-5 w-5 text-orange-300" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300/70">Dartbörse DACH</div>
        <div className="mt-1 font-black text-white">Darts kaufen & verkaufen</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
    </button>

    <button type="button" onClick={() => { rememberPublicAreaOrigin(); window.location.href = "/turniere" }} className="group flex min-h-[98px] items-center gap-3 rounded-2xl border border-white/10 bg-[#080d14]/85 p-4 text-left transition hover:border-orange-300/25 hover:bg-white/[0.045]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-500/10"><Trophy className="h-5 w-5 text-orange-300" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300/70">DACH Turniere</div>
        <div className="mt-1 font-black text-white">Turniere entdecken</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
    </button>
  </div>
</section>
{activeTournament && (
  <div className="sticky top-12 sm:top-14 z-40">
    <div className="mx-auto mt-3 w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8 xl:px-10">
      <div className="rounded-2xl border border-orange-200 bg-white shadow-lg overflow-hidden">
        





{/* Top accent bar */}
        <div className="h-1 bg-orange-500" />

        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon bubble */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-700" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600" />
                    Live
                  </span>
                  <span className="hidden sm:inline text-[11px] font-bold text-gray-500">
                    Turnier läuft gerade
                  </span>
                </div>

                <div className="text-sm sm:text-base font-black text-gray-900 truncate">
                  {activeTournament.tournament_name}
                </div>

                <div className="text-[11px] sm:text-xs text-gray-600 truncate">
                  {activeTournament.tournament_type.replaceAll("_", " ").toUpperCase()}
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              size="sm"
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm px-3 sm:px-4"
              onClick={() => (window.location.href = "/live-all-app")}
            >
             <span className="hidden sm:inline">Live öffnen</span>
<span className="sm:hidden">Live</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      
	  
	  
      {liveRegistrationItems.length > 0 && (
        <section className="mx-auto mt-3 w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8 xl:px-10">
          <div
            className={`grid gap-3 ${
              liveRegistrationItems.length === 1
                ? "max-w-[520px]"
                : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {liveRegistrationItems.map((item) => {
              const eventDate = item.nextEvent ? new Date(item.nextEvent.startAt) : null

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (window.location.href = `/turniere/serien/${item.slug}/anmeldung`)}
                  className="group w-full rounded-2xl border border-white/[0.09] bg-[#0b1017]/92 p-4 text-left shadow-[0_18px_45px_-34px_rgba(0,0,0,.9)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-emerald-300/25 hover:bg-[#0d141b]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10">
                      <UserPlus className="h-5 w-5 text-emerald-300" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                          Anmeldung offen
                        </span>
                        {item.accessType === "club_internal" ? (
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-300">
                            Intern
                          </span>
                        ) : null}
                      </div>

                      <div className="truncate text-sm font-black text-white sm:text-base">
                        {item.name}
                      </div>

                      {eventDate ? (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/45">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-orange-300" />
                            {eventDate.toLocaleDateString("de-AT", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-orange-300" />
                            {eventDate.toLocaleTimeString("de-AT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} Uhr
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <ArrowRight className="h-5 w-5 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-[var(--emd-content-max)] overflow-x-hidden px-3 py-7 sm:px-5 lg:px-8 lg:py-9 xl:px-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/70">Serien & Wettbewerbe</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Turnierserien</h2>
            <p className="mt-1 text-xs font-semibold text-white/35">Aktive Serien, nächste Spieltage und Anmeldung</p>
          </div>
          <Button
            variant="ghost"
            className="h-9 shrink-0 px-3 font-black text-orange-200 hover:bg-orange-500/10 hover:text-white"
            onClick={() => (window.location.href = "/turniere/serien")}
          >
            Alle Serien
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {dynamicSeriesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1].map((item) => (
              <div key={item} className="h-[230px] animate-pulse rounded-[26px] border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : seriesItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seriesItems.slice(0, 6).map((item) => {
              const nextDate = item.nextEvent ? new Date(item.nextEvent.startAt) : null
              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[#080d14]/90 shadow-[0_24px_70px_-50px_rgba(0,0,0,.95)]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.22] transition duration-700 group-hover:scale-[1.03]"
                    style={{ backgroundImage: `url('${item.imageUrl}')` }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,8,12,.98),rgba(5,8,12,.88)_60%,rgba(5,8,12,.72))]" />

                  <div className="relative flex min-h-[230px] flex-col justify-between p-4 sm:p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">
                          Turnierserie
                        </span>
                        {item.accessType === "club_internal" ? (
                          <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-200">Intern</span>
                        ) : (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">Öffentlich</span>
                        )}
                        {item.registrationOpen ? (
                          <span className="rounded-full border border-emerald-300/25 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">Anmeldung offen</span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-xl font-black leading-tight text-white">{item.name}</h3>
                      {item.description ? (
                        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-white/38">{item.description}</p>
                      ) : null}
                    </div>

                    <div className="mt-4 border-t border-white/[0.07] pt-3">
                      {nextDate ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-white/48">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-orange-300" />
                            {nextDate.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-orange-300" />
                            {nextDate.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                          </span>
                          {item.nextEvent?.location ? (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-300" />
                              <span className="truncate">{item.nextEvent.location}</span>
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-white/35">Aktuell kein weiterer Spieltag eingetragen</div>
                      )}

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-white/35">
                          <span>Startgeld <strong className="text-white/75">€ {item.startgeld.toFixed(2)}</strong></span>
                          {item.totalTournamentDays ? <span>{item.totalTournamentDays} Spieltage</span> : null}
                        </div>
                        <Button
                          size="sm"
                          className="rounded-xl bg-orange-600 px-4 font-black text-white hover:bg-orange-500"
                          onClick={() => (window.location.href = `/turniere/serien/${item.slug}`)}
                        >
                          Zur Serie
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (window.location.href = "/turniere/serien")}
            className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-[#080d14]/88 p-4 text-left transition hover:border-orange-300/25 hover:bg-[#0b111a] sm:p-5"
          >
            <div>
              <div className="font-black text-white">Turnierserien</div>
              <div className="mt-1 text-xs font-semibold text-white/35">Serienübersicht öffnen</div>
            </div>
            <ArrowRight className="h-5 w-5 text-orange-300" />
          </button>
        )}
      </section>
 
 
 
 
 

      <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 py-6 sm:px-5 sm:py-8 lg:px-8 xl:px-10">
  <div className="space-y-8">
    {/* ================= NÄCHSTE SPIELE ================= */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900">Nächste Spiele</h2>
          <p className="text-xs sm:text-sm text-gray-500">Die nächsten angesetzten Begegnungen</p>
        </div>

        <Button
          variant="ghost"
          className="h-9 px-3 text-orange-700 hover:text-orange-800 hover:bg-orange-50 font-bold"
          onClick={() => (window.location.href = "/liga-statistiken-app")}
        >
          Alle
        </Button>
      </div>

      {/* Mobile: horizontal scroll / Desktop: grid */}
      {matches.length === 0 ? (
        <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm p-8 text-center">
          <p className="text-gray-600 font-semibold">Keine anstehenden Spiele</p>
        </div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {matches.slice(0, 4).map((match) => (
              <div
                key={match.id}
                className="min-w-[280px] sm:min-w-0 rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_38px_-34px_rgba(15,23,42,0.55)] hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      {new Date(match.match_date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>

                    {match.match_time ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {String(match.match_time).slice(0, 5)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {/* Home */}
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      {getTeamLogo(match, true) ? (
                        <img
                          src={getTeamLogo(match, true) || "/placeholder.svg"}
                          alt={getTeamName(match, true)}
                          className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mb-2"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2 border border-gray-200">
                          <Trophy className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <p className="font-black text-xs text-center text-gray-900 truncate w-full">
                        {getTeamName(match, true)}
                      </p>
                    </div>

                    <div className="text-xs font-black text-gray-400">VS</div>

                    {/* Away */}
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      {getTeamLogo(match, false) ? (
                        <img
                          src={getTeamLogo(match, false) || "/placeholder.svg"}
                          alt={getTeamName(match, false)}
                          className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mb-2"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-2 border border-gray-200">
                          <Trophy className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <p className="font-black text-xs text-center text-gray-900 truncate w-full">
                        {getTeamName(match, false)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      {match.venue ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {match.venue}
                        </span>
                      ) : (
                        "Ort folgt"
                      )}
                    </span>

                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black"
                      onClick={() => (window.location.href = "/liga-statistiken-app")}
                    >
                      Öffnen
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>

    {/* ================= VERANSTALTUNGEN & TURNIERE ================= */}
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/70">Aktuell & demnächst</div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Veranstaltungen & Turniere</h2>
          <p className="mt-1 text-sm font-semibold text-white/40">EMD-Termine und ausgewählte DACH-Turniere auf einen Blick.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-xl border-white/10 bg-white/[0.04] px-3 font-black text-white/70 hover:bg-white/[0.08] hover:text-white"
            onClick={() => (window.location.href = "/veranstaltungen")}
          >
            EMD-Veranstaltungen
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-xl border-orange-300/20 bg-orange-500/[0.06] px-3 font-black text-orange-100 hover:bg-orange-500/[0.12]"
            onClick={() => { rememberPublicAreaOrigin(); window.location.href = "/turniere" }}
          >
            DACH-Turniere
          </Button>
        </div>
      </div>

      {homepageEventItems.length === 0 ? (
        <div className="rounded-[22px] border border-white/10 bg-[#080d14]/88 p-6 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="font-semibold text-white/45">Derzeit sind keine kommenden Veranstaltungen verfügbar.</p>
        </div>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {homepageEventItems.map((item) => (
              <button
                key={`${item.sourceKind}:${item.id}`}
                type="button"
                onClick={() => openHomepageEvent(item)}
                className="group min-w-[82vw] overflow-hidden rounded-[22px] border border-white/10 bg-[#080d14]/90 text-left shadow-[0_18px_55px_-42px_rgba(0,0,0,.95)] transition hover:-translate-y-0.5 hover:border-orange-300/25 sm:min-w-0"
              >
                <div className="relative h-[112px] overflow-hidden bg-white/[0.035]">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Trophy className="h-8 w-8 text-orange-300/55" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080d14]/45 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">
                    {item.sourceKind === "dach" ? "DACH" : "EMD"}
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-white/38">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-orange-300/70" />
                      {new Date(item.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-orange-300/70" />
                      {String(item.time || "").slice(0, 5)} Uhr
                    </span>
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-base font-black leading-tight text-white">{item.name}</h3>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-white/40">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-300/70" />
                      <span className="truncate">{item.location || "Ort folgt"}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-orange-200">
                      Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  </div>
</div>
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
	  
<section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 py-6 sm:px-5 sm:py-8 lg:px-8 xl:px-10">
  <div className="rounded-[28px] border border-white/10 bg-[#080d14]/88 p-4 shadow-[0_24px_80px_-55px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5 lg:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/70">Unsere Partner</div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Partner & Unterstützer</h2>
        <p className="mt-1 text-sm font-semibold text-white/40">Danke an alle Unternehmen und Organisationen, die den Verein unterstützen.</p>
      </div>

      <Button
        variant="outline"
        className="h-10 rounded-xl border-orange-300/20 bg-orange-500/[0.08] px-4 font-black text-orange-100 hover:bg-orange-500/[0.14] hover:text-white"
        onClick={() => (window.location.href = "/sponsoring")}
      >
        Sponsoring
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <div className="rounded-[22px] border border-orange-300/15 bg-orange-500/[0.05] p-4 sm:p-5">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/60">Hauptsponsor</div>
        <div className="flex min-h-[110px] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20 px-5 py-4">
          <Image
            src="/images/sponsoren/sponsor1.png"
            alt="Hauptsponsor"
            width={220}
            height={90}
            className="max-h-[76px] w-auto max-w-full object-contain"
            priority
          />
        </div>
      </div>

      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Premium Partner</div>
        <div className="grid grid-cols-3 gap-2.5">
          {[2, 3, 4].map((num) => (
            <div key={num} className="flex min-h-[92px] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20 p-3">
              <Image
                src={`/images/sponsoren/sponsor${num}.png`}
                alt={`Premium Partner ${num}`}
                width={130}
                height={58}
                className="max-h-[58px] w-auto max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Offizielle Partner</div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {[5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
          <div key={num} className="flex min-h-[82px] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/20 p-2.5">
            <Image
              src={`/images/sponsoren/sponsor${num}.png`}
              alt={`Partner ${num}`}
              width={110}
              height={50}
              className="max-h-[50px] w-auto max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

<FAQChatWidget />





<section className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-8 sm:px-5 sm:pb-10 lg:px-8 xl:px-10">
  <div className="overflow-hidden rounded-[26px] border border-orange-300/15 bg-[linear-gradient(135deg,rgba(249,115,22,.12),rgba(7,12,20,.92)_45%,rgba(7,12,20,.96))] shadow-[0_24px_80px_-55px_rgba(0,0,0,.95)] backdrop-blur-xl">
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-6 lg:p-6">
      <div className="min-w-0">
        <div className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-500/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-200/80">
          EMD Vereinsapp
        </div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">Liga, Turniere und Vereinsnews in einer App</h2>
        <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
          Live-Scores, Turniere, Push-News und Statistiken direkt auf deinem Smartphone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Live-Scores','Turniere','Push-News','Statistiken'].map((item) => (
            <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-white/55">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
      <InstallEmdApp />
      <a
        href="https://play.google.com/store/apps/details?id=com.emojisdartverein.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex justify-start lg:justify-end"
      >
        <Image
          src="/images/google-play-badge.png"
          alt="Jetzt bei Google Play herunterladen"
          width={180}
          height={54}
          className="h-12 w-auto sm:h-14"
        />
      </a>
      </div>
    </div>
  </div>
</section>

<footer className="mt-10 border-t border-gray-200 bg-white">
  <div className="container mx-auto px-4 py-6">
    {/* Social row */}
    <div className="flex flex-wrap items-center justify-center gap-2">
      {[
        { href: "https://www.facebook.com/groups/1902196843213608", label: "Facebook", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )},
        { href: "https://www.instagram.com/emojsdartverein/", label: "Instagram", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        )},
        { href: "https://www.youtube.com/@emojsdartvereinev.9194", label: "YouTube", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        )},
        { href: "https://www.tiktok.com/@emojizyy3md?_t=8ahlStO563y&_r=1", label: "TikTok", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        )},
        { href: "https://api.whatsapp.com/send/?phone=436604696464&text&type=phone_number&app_absent=0", label: "WhatsApp", icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        )},
      ].map((s) => (
        <a
          key={s.href}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 text-gray-700 shadow-sm active:scale-[0.98]"
        >
          <span className="text-orange-600">{s.icon}</span>
          <span className="text-xs font-bold">{s.label}</span>
        </a>
      ))}
    </div>

    {/* Links */}
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
      <a href="/impressum" className="text-gray-600 hover:text-orange-700 font-semibold">
        Impressum
      </a>
      <a href="/datenschutz" className="text-gray-600 hover:text-orange-700 font-semibold">
        Datenschutz
      </a>
      <a href="/kontakt" className="text-gray-600 hover:text-orange-700 font-semibold">
        Kontakt
      </a>
    </div>

    {/* Copyright */}
    <div className="mt-5 text-center">
      <p className="text-xs text-gray-500">
        © {new Date().getFullYear()} EMD Salzburg • Erstellt von <span className="font-bold text-gray-700">Grafikguru</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-1">Alle Rechte vorbehalten.</p>
    </div>
  </div>
</footer>





      








      <MobileBottomNav />
    </div>
  )
}

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowRight, ShieldCheck, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VereinAppInstall } from "@/components/verein-app-install"

export default async function VereinBeitretenPage() {
  // Bestehende Spielersuche-Daten bleiben technisch verfügbar,
  // werden auf dieser neu positionierten Seite aber bewusst nicht angezeigt.
  const supabase = createServerClient()
  await supabase
    .from("player_recruitment_needs")
    .select("id")
    .limit(1)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white font-sans">
      <Header />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.10),transparent_34%,rgba(14,165,233,.07)_78%,transparent)]" />
          <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-500/15 blur-[110px]" />
          <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />

          <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.08fr_.92fr] lg:p-9 xl:p-10">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-orange-100">
                <UserPlus className="h-3.5 w-3.5" />
                Jetzt beitreten
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                Werde Teil von Emoj!´s Dartverein.
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/55 sm:text-base lg:text-lg">
                Starte zuerst mit einem kostenlosen Gastzugang. Damit kannst du bereits wichtige Funktionen der App nutzen,
                öffentliche Turniere entdecken und eigene Veranstaltungen verwalten.
              </p>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/45 sm:text-base">
                Wenn du danach Mitglied werden möchtest, kannst du direkt im Gastbereich mit wenigen Klicks deine
                Beitrittsanfrage an den Verein senden.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-2xl bg-orange-500 px-6 text-base font-black text-white shadow-[0_0_35px_rgba(249,115,22,.16)] hover:bg-orange-600"
                >
                  <Link href="/gastzugang">
                    Gastzugang erstellen
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-white/10 bg-white/5 px-6 font-black text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/guest-login">Bereits Gast? Einloggen</Link>
                </Button>
              </div>

              <div className="mt-5">
                <VereinAppInstall />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
                  <ShieldCheck className="h-5 w-5 text-orange-200" />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  Schritt 1
                </div>
                <h2 className="mt-1 text-lg font-black text-white">Gastzugang erstellen</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Registriere dich einmal und nutze danach deinen persönlichen Gastbereich.
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-500/10">
                  <Users className="h-5 w-5 text-sky-100" />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  Schritt 2
                </div>
                <h2 className="mt-1 text-lg font-black text-white">App kennenlernen</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Nutze wichtige Funktionen, entdecke Turniere und verwalte eigene Veranstaltungen.
                </p>
              </div>

              <div className="rounded-[22px] border border-orange-400/20 bg-orange-500/10 p-5 sm:col-span-2 lg:col-span-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-300/25 bg-orange-500/15">
                  <UserPlus className="h-5 w-5 text-orange-100" />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/60">
                  Schritt 3
                </div>
                <h2 className="mt-1 text-lg font-black text-white">Mitglied werden</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Direkt im Gastbereich kannst du anschließend mit einem Klick deine Beitrittsanfrage starten.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5 shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/55">Turniere</div>
            <h3 className="mt-2 text-xl font-black text-white">Entdecken & mitmachen</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Öffentliche Turniere ansehen und immer wissen, was als Nächstes ansteht.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5 shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/55">Veranstaltungen</div>
            <h3 className="mt-2 text-xl font-black text-white">Eigene Events verwalten</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Als freigeschalteter Gast kannst du eigene Turniere einreichen und später bearbeiten.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5 shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/55">Verein</div>
            <h3 className="mt-2 text-xl font-black text-white">Einfach beitreten</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Gefällt dir der Verein, startest du die Beitrittsanfrage direkt aus deinem Gastbereich.
            </p>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-black/30 p-5 shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Bereit?</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                Starte mit deinem Gastzugang.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                Du musst dich noch nicht sofort für eine Mitgliedschaft entscheiden. Schau dir zuerst alles in Ruhe an.
              </p>
            </div>

            <Button
              asChild
              className="h-12 shrink-0 rounded-2xl bg-orange-500 px-6 font-black text-white hover:bg-orange-600"
            >
              <Link href="/gastzugang">
                Gastzugang erstellen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}

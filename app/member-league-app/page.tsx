"use client"

import {
  Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useAuth } from "@/hooks/use-auth"
import {
  CalendarCheck2,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Table2,
  Trophy,
  Radio,
  Users,
  ChartNoAxesColumnIncreasing,
  MessageCircle,
  Camera,
  Gift,
  Tv2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

type LeagueTile = {
  title: string
  subtitle: string
  href?: string
  icon: React.ReactNode
  eyebrow: string
  ready: boolean
  image?: string
}

export default function MemberLeaguePage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  if (authLoading) return <div className="min-h-[1px]" aria-hidden="true" />
  if (!session) return null

  const tiles: LeagueTile[] = [
    {
      title: "Zusagen & Aufstellung",
      subtitle: "Zu- und Absagen, Mannschaftsaufstellung, Team-Chat und Planung für deine Ligaspiele.",
      href: "/member-availability",
      icon: <ClipboardCheck className="h-7 w-7" />,
      eyebrow: "MANNSCHAFT",
      ready: true,
      image: "/league/zusagen-aufstellung.png",
    },
    {
      title: "EMD TV",
      subtitle: "Bestätigte Aufstellungen als animierte Match-Preview im TV-Look ansehen.",
      href: "/member-league-app/emd-tv",
      icon: <Tv2 className="h-7 w-7" />,
      eyebrow: "MATCH PREVIEW",
      ready: true,
    },
    {
      title: "Spielplan",
      subtitle: "Deine Ligaspiele, Termine, Verschiebungen und Sportdarts-Prüfung auf einen Blick.",
      href: "/member-league-app/spielplan",
      icon: <CalendarCheck2 className="h-7 w-7" />,
      eyebrow: "TERMINE",
      ready: true,
      image: "/league/spielplan.png",
    },
    {
      title: "Meine Teams",
      subtitle: "Mannschaften, Rollen und Kader übersichtlich an einem Ort.",
      href: "/member-league-app/meine-teams",
      icon: <Users className="h-7 w-7" />,
      eyebrow: "TEAM",
      ready: true,
      image: "/league/meine-spiele.png",
    },
    {
      title: "Team-Chat",
      subtitle: "Team-Chats, Captain-Räume und Vereinsinfos direkt aus der Ligazentrale öffnen.",
      href: "/member-league-app/chat",
      icon: <MessageCircle className="h-7 w-7" />,
      eyebrow: "CHAT",
      ready: true,
      image: "/league/team-chat.png",
    },
    {
      title: "Match-Galerie",
      subtitle: "Teamfotos und Spielmomente ansehen, liken und kommentieren.",
      href: "/member-league-app/match-galerie",
      icon: <Camera className="h-7 w-7" />,
      eyebrow: "FOTOS",
      ready: true,
      image: "/league/match-galerie.png",
    },
    {
      title: "Liga-Bonuswertung",
      subtitle: "Bonuswerte aus Liga-Statistiken nach Saison und Team auswerten.",
      href: "/member-league-app/liga-bonuswertung",
      icon: <Gift className="h-7 w-7" />,
      eyebrow: "AUSWERTUNG",
      ready: true,
      image: "/league/bonusprogramm.png",
    },
    {
      title: "Tabellen",
      subtitle: "Mannschaftstabelle und persönliche Spielerstatistik deiner Liga.",
      href: "/member-league-app/tabellen",
      icon: <Table2 className="h-7 w-7" />,
      eyebrow: "LIGA",
      ready: true,
      image: "/league/tabellen.png",
    },
    {
      title: "LIVE-Spiele",
      subtitle: "Alle aktuell bei Sportdarts gelisteten Spiele mit Spielstand und Spieldetails.",
      href: "/member-league-app/live",
      icon: <Radio className="h-7 w-7" />,
      eyebrow: "LIVE",
      ready: true,
      image: "/league/live.png",
    },
    {
      title: "Offizielle Ergebnisse",
      subtitle: "Offizielle Sportdarts-Ergebnisse ansehen – inklusive abgeschlossener Spiele und Spieldetails.",
      href: "/member-league-app/ergebnisse",
      icon: <Trophy className="h-7 w-7" />,
      eyebrow: "SPORTDARTS",
      ready: true,
      image: "/league/ergebnisse.png",
    },
    {
      title: "Meine Statistik",
      subtitle: "Persönliche Liga- und Spielerstatistiken nach Saison und Dartart.",
      href: "/member-league-app/meine-statistik",
      icon: <ChartNoAxesColumnIncreasing className="h-7 w-7" />,
      eyebrow: "STATISTIK",
      ready: true,
      image: "/league/statistiken.png",
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header variant="app" title="Ligazentrale" subtitle="Mein EMD" backHref="/member-profile-app" />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.38]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.64),rgba(3,5,9,.90)_44%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_6%_18%,rgba(249,115,22,.22),transparent_28%),radial-gradient(circle_at_88%_26%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <section className="mb-6 overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 p-5 backdrop-blur-xl sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-300/15 bg-orange-500/[0.09] text-orange-200 shadow-[0_0_28px_rgba(249,115,22,.10)]">
              <LayoutGrid className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300/65">
                Mein EMD
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                Ligazentrale
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/40">
                Alles rund um deine Mannschaft, Spieltage, Tabellen und Ergebnisse an einem Ort.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const card = (
              <div
                className={[
                  "group relative min-h-[185px] overflow-hidden rounded-[28px] border p-5 text-left backdrop-blur-xl transition duration-300 sm:p-6",
                  tile.ready
                    ? tile.image
                      ? "cursor-pointer border-orange-300/[0.12] bg-black/30 hover:-translate-y-1 hover:border-orange-300/25 hover:shadow-[0_26px_70px_-34px_rgba(249,115,22,.36)]"
                      : "cursor-pointer border-white/[0.08] bg-black/30 hover:-translate-y-1 hover:border-orange-300/20 hover:bg-black/40 hover:shadow-[0_26px_70px_-36px_rgba(249,115,22,.32)]"
                    : "cursor-default border-white/[0.055] bg-black/20 opacity-70",
                ].join(" ")}
              >
                {tile.image ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url('${tile.image}')` }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.18),rgba(5,6,8,.62)_48%,rgba(5,6,8,.94))]" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,8,.42),transparent_70%)]" />
                  </>
                ) : null}

                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/[0.08] blur-[55px] transition group-hover:bg-orange-500/[0.12]" />
                <div className="pointer-events-none absolute -bottom-14 -left-12 h-32 w-32 rounded-full bg-sky-500/[0.05] blur-[50px]" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-300/[0.12] bg-orange-500/[0.07] text-orange-200">
                      {tile.icon}
                    </div>

                    {tile.ready ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300/35 bg-black/45 text-orange-200 shadow-[0_0_18px_rgba(249,115,22,.16)] transition group-hover:border-orange-300/60 group-hover:bg-orange-500/20 group-hover:text-white">
                        <ChevronRight className="h-5 w-5 stroke-[2.8]" />
                      </div>
                    ) : (
                      <div className="rounded-full border border-orange-300/35 bg-black/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-orange-100 shadow-[0_0_16px_rgba(249,115,22,.12)]">
                        Demnächst
                      </div>
                    )}
                  </div>

                  <div className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/80">
                    {tile.eyebrow}
                  </div>
                  <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-white">
                    {tile.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-5 text-white/60">
                    {tile.subtitle}
                  </p>
                </div>
              </div>
            )

            return tile.ready && tile.href ? (
              <button
                key={tile.title}
                type="button"
                onClick={() => router.push(tile.href!)}
                className="text-left"
              >
                {card}
              </button>
            ) : (
              <div key={tile.title}>{card}</div>
            )
          })}
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}

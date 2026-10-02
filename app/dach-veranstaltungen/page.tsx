"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import {
  MapPinned,
  CalendarSearch,
  PlusCircle,
  FolderKanban,
  ArrowRight,
  Globe2,
} from "lucide-react"

const tiles = [
  {
    title: "Turniere entdecken",
    subtitle: "Anstehende und vergangene Turniere in Österreich, Deutschland und der Schweiz durchsuchen.",
    href: "/dach-veranstaltungen/entdecken",
    eyebrow: "ENTDECKEN",
    icon: CalendarSearch,
    accent: "sky",
    image: "/league/ergebnisse.png",
  },
  {
    title: "Veranstaltung einreichen",
    subtitle: "Eigenes Turnier oder Event mit Ort, Termin, Flyer und weiteren Details zur Freigabe einreichen.",
    href: "/dach-veranstaltungen/neu",
    eyebrow: "EINREICHEN",
    icon: PlusCircle,
    accent: "orange",
    image: "/terminal/hero-startscreen.png",
  },
  {
    title: "Meine Veranstaltungen",
    subtitle: "Eigene Einreichungen, Freigaben, Änderungen und Absagen zentral verwalten.",
    href: "/dach-veranstaltungen/meine",
    eyebrow: "VERWALTEN",
    icon: FolderKanban,
    accent: "emerald",
    image: "/league/meine-spiele.png",
  },
]

export default function DachTurniereHubPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header
        variant="app"
        title="DACH Turniere"
        subtitle="Turnierbereich"
        backHref="/member-tournament-app"
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(14,165,233,.15),transparent_26%),radial-gradient(circle_at_88%_28%,rgba(249,115,22,.13),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(16,185,129,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -left-16 bottom-[-70px] h-48 w-48 rounded-full bg-sky-500/[0.13] blur-[70px]" />
          <div className="pointer-events-none absolute right-[12%] top-[-80px] h-52 w-52 rounded-full bg-orange-500/[0.11] blur-[75px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                <Globe2 className="h-3.5 w-3.5 text-sky-200" />
                DACH Turnierzentrale
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                Turniere in AT, DE & CH
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
                Entdecken, einreichen und eigene Veranstaltungen verwalten – sauber getrennt in einem Bereich.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-4 sm:min-w-[290px]">
              <MapPinned className="h-5 w-5 text-sky-200" />
              <div className="mt-2 text-sm font-black text-white">Österreich · Deutschland · Schweiz</div>
              <div className="mt-1 text-xs leading-5 text-white/35">
                Für E-Dart, Steel-Dart und weitere Turnierformate.
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon
            const isSky = tile.accent === "sky"
            const isOrange = tile.accent === "orange"

            const border = isSky
              ? "border-sky-300/[0.12] hover:border-sky-300/30"
              : isOrange
                ? "border-orange-300/[0.12] hover:border-orange-300/30"
                : "border-emerald-300/[0.12] hover:border-emerald-300/30"

            const iconTone = isSky
              ? "border-sky-300/[0.16] bg-sky-500/[0.09] text-sky-100"
              : isOrange
                ? "border-orange-300/[0.16] bg-orange-500/[0.09] text-orange-100"
                : "border-emerald-300/[0.16] bg-emerald-500/[0.09] text-emerald-100"

            const hoverTone = isSky
              ? "group-hover:border-sky-300/35 group-hover:bg-sky-500"
              : isOrange
                ? "group-hover:border-orange-300/35 group-hover:bg-orange-500"
                : "group-hover:border-emerald-300/35 group-hover:bg-emerald-500"

            return (
              <button
                key={tile.href}
                type="button"
                onClick={() => router.push(tile.href)}
                className={`group relative min-h-[270px] overflow-hidden rounded-[30px] border ${border} bg-black/30 text-left shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 active:scale-[0.995]`}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.66] transition duration-700 group-hover:scale-[1.035]"
                  style={{ backgroundImage: `url('${tile.image}')` }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.35),rgba(4,6,9,.70)_42%,rgba(4,6,9,.94))]" />
                <div className="relative flex min-h-[270px] flex-col justify-between p-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${iconTone}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-black/40 text-white/70 transition duration-300 ${hoverTone} group-hover:text-white`}>
                      <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                      {tile.eyebrow}
                    </div>
                    <h2 className="mt-1.5 text-2xl font-black tracking-[-0.035em] text-white">
                      {tile.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/46">
                      {tile.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}

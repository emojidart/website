"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CalendarDays, Clock, MapPin, ArrowLeft, CheckCircle2 } from "lucide-react"

type TerminRow = {
  datum: string
  tag: string
  art: string
  zeitKids: string
  zeitJunior: string
  zeitTeens: string
  ort: string
  hinweis?: string
}

const termine: TerminRow[] = [
  {
    datum: "10.01.2026",
    tag: "Samstag",
    art: "Infotag",
    zeitKids: "14:00 Uhr",
    zeitJunior: "14:00 Uhr",
    zeitTeens: "14:00 Uhr",
    ort: "Vereinsheim Pfeil-OK e.V., Linzer Bundesstraße 16, 5020 Salzburg",
    hinweis: "Gratis & unverbindlich",
  },
  {
    datum: "18.01.2026",
    tag: "Sonntag",
    art: "Trainingsstart",
    zeitKids: "14:00 – 15:00",
    zeitJunior: "15:15 – 16:30",
    zeitTeens: "16:45 – 18:15",
    ort: "Vereinsheim Pfeil-OK e.V., Salzburg",
  },
  {
    datum: "15.02.2026",
    tag: "Sonntag",
    art: "Modultraining",
    zeitKids: "14:00 – 15:00",
    zeitJunior: "15:15 – 16:30",
    zeitTeens: "16:45 – 18:15",
    ort: "Vereinsheim Pfeil-OK e.V., Salzburg",
  },
  {
    datum: "22.03.2026",
    tag: "Sonntag",
    art: "Modultraining",
    zeitKids: "14:00 – 15:00",
    zeitJunior: "15:15 – 16:30",
    zeitTeens: "16:45 – 18:15",
    ort: "Vereinsheim Pfeil-OK e.V., Salzburg",
  },
  {
    datum: "19.04.2026",
    tag: "Sonntag",
    art: "Modultraining",
    zeitKids: "14:00 – 15:00",
    zeitJunior: "15:15 – 16:30",
    zeitTeens: "16:45 – 18:15",
    ort: "Vereinsheim Pfeil-OK e.V., Salzburg",
  },
]

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "green" | "orange"
}) {
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-900 border-green-200"
      : tone === "orange"
        ? "bg-orange-50 text-orange-900 border-orange-200"
        : "bg-gray-50 text-gray-800 border-gray-200"

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${cls}`}>
      {children}
    </span>
  )
}

export default function CampusTerminePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 lg:max-w-screen-xl 2xl:max-w-screen-2xl">
        <section className="overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-5 text-white sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                  <CalendarDays className="h-3.5 w-3.5" />
                  EMD Campus Termine
                </div>

                <h1 className="mt-3 text-2xl font-black sm:text-3xl lg:text-4xl">Terminübersicht 2026</h1>
                <p className="mt-2 text-sm font-semibold text-orange-100 sm:text-base">
                  Alle wichtigen Termine
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip tone="green">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Infotag + Trainingsstart
                  </Chip>
                  <Chip tone="orange">
                    <Clock className="h-3.5 w-3.5" />
                    Zeiten je Altersgruppe
                  </Chip>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/emd-campus"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-orange-700 shadow-sm hover:bg-orange-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück zum Campus
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-100 bg-orange-50/60 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Infotag</p>
                <p className="mt-1 text-sm font-black text-gray-900">10. Januar 2026</p>
                <p className="mt-1 text-sm font-semibold text-orange-700">14:00 Uhr</p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Trainingsstart</p>
                <p className="mt-1 text-sm font-black text-gray-900">18. Januar 2026</p>
                <p className="mt-1 text-sm font-semibold text-orange-700">Kids / Junior / Teens</p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Ort</p>
                <p className="mt-1 text-sm font-black text-gray-900">Vereinsheim Pfeil-OK e.V.</p>
                <p className="mt-1 text-sm font-semibold text-orange-700">Salzburg</p>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE CARDS */}
        <section className="mt-6 lg:hidden">
          <div className="space-y-3">
            {termine.map((termin) => (
              <div key={`${termin.datum}-${termin.art}`} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">{termin.art}</p>
                    <p className="mt-1 text-base font-black text-gray-900">
                      {termin.tag}, {termin.datum}
                    </p>
                  </div>

                  {termin.hinweis ? <Chip tone="green">{termin.hinweis}</Chip> : <Chip tone="orange">Geplant</Chip>}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Zeiten</p>
                    <div className="mt-2 space-y-1.5 text-sm text-gray-700">
                      <p>
                        <span className="font-black text-red-700">Kids:</span> {termin.zeitKids}
                      </p>
                      <p>
                        <span className="font-black text-blue-700">Junior:</span> {termin.zeitJunior}
                      </p>
                      <p>
                        <span className="font-black text-purple-700">Teens:</span> {termin.zeitTeens}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Ort</p>
                    <p className="mt-2 text-sm text-gray-700 inline-flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
                      <span>{termin.ort}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DESKTOP TABLE */}
        <section className="mt-6 hidden lg:block">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-black text-gray-900">Alle Termine in Tabellenform</h2>
              <p className="mt-1 text-sm text-gray-500"></p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-white">
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Datum
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Art
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Kids
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Junior
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Teens
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Ort
                    </th>
                    <th className="border-b border-gray-200 px-4 py-4 text-left text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Hinweis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {termine.map((termin, index) => (
                    <tr key={`${termin.datum}-${termin.art}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                      <td className="border-b border-gray-100 px-4 py-4 align-top">
                        <div className="font-black text-gray-900">{termin.datum}</div>
                        <div className="text-sm text-gray-500">{termin.tag}</div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top">
                        <div className="font-black text-gray-900">{termin.art}</div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top text-sm font-semibold text-red-700">
                        {termin.zeitKids}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top text-sm font-semibold text-blue-700">
                        {termin.zeitJunior}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top text-sm font-semibold text-purple-700">
                        {termin.zeitTeens}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top text-sm text-gray-700">
                        {termin.ort}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 align-top">
                        {termin.hinweis ? <Chip tone="green">{termin.hinweis}</Chip> : <Chip tone="orange">Geplant</Chip>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
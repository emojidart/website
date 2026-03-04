"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Users } from "lucide-react"
import { RecruitmentHero } from "@/components/recruitment-hero"
import { TeamGallery } from "@/components/team-gallery"

export default function NewClubClient({ teamsWithPlayers }: { teamsWithPlayers: any[] }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="relative p-5 sm:p-6">
              <div className="relative flex items-start gap-4">
                <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 inline-flex px-2.5 py-1 rounded-full">
                    Vereinsbereich
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Vereinsübersicht
                  </h1>
                  <p className="mt-1 text-sm sm:text-base text-gray-600">
                    Lerne unsere Teams und Spieler kennen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6">
            <RecruitmentHero />
          </div>

          <div className="mt-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-black">Teams</div>
                  <div className="text-xs text-gray-500">{teamsWithPlayers.length} Team(s)</div>
                </div>
              </div>

              <TeamGallery teamsWithPlayers={teamsWithPlayers} />
            </div>
          </div>

          <div className="h-6" aria-hidden="true" />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
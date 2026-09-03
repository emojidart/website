"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Users, ArrowRight } from "lucide-react"

interface Player {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  birthdate: string | null
  origin: string | null
  role: string | null
}

interface TeamWithPlayers {
  id: string
  name: string
  logo_url: string | null
  players: Player[]
}

interface TeamGalleryProps {
  teamsWithPlayers: TeamWithPlayers[]
}

export function TeamGallery({ teamsWithPlayers }: TeamGalleryProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamWithPlayers | null>(null)

  const sortPlayersByRole = (players: Player[]) => {
    return [...players].sort((a, b) => {
      const roleOrder: { [key: string]: number } = {
        captain: 1,
        "co-captain": 2,
        spieler: 3,
        player: 3,
      }

      const roleA = a.role?.toLowerCase() || "spieler"
      const roleB = b.role?.toLowerCase() || "spieler"

      const orderA = roleOrder[roleA] || 3
      const orderB = roleOrder[roleB] || 3

      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name, "de")
    })
  }

  const getOriginText = (origin: string | null) => {
    if (!origin || !origin.trim()) return "-"
    return origin
  }

  const getRoleText = (role: string | null) => {
    if (!role || !role.trim()) return "Spieler"

    const normalized = role.trim().toLowerCase()

    if (normalized === "captain") return "Captain"
    if (normalized === "co-captain") return "Co-Captain"
    if (normalized === "player") return "Spieler"
    if (normalized === "spieler") return "Spieler"

    return role
  }

  if (selectedTeam) {
    const sortedPlayers = sortPlayersByRole(selectedTeam.players)

    return (
      <div className="w-full">
        <Button
          variant="ghost"
          onClick={() => setSelectedTeam(null)}
          className="mb-4 -ml-1 h-10 gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-950"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Alle Teams
        </Button>

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
          <div className="flex items-start gap-4 p-4 sm:p-5">
            <div className="shrink-0">
              {selectedTeam.logo_url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 sm:h-20 sm:w-20">
                  <Image
                    src={selectedTeam.logo_url || "/placeholder.svg"}
                    alt={selectedTeam.name}
                    fill
                    className="object-contain p-3"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 sm:h-20 sm:w-20">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700">
                Team
              </div>
              <h2 className="mt-2 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {selectedTeam.name}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedTeam.players.length} Spieler
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          {sortedPlayers.map((player) => (
            <Card
              key={player.id}
              className="group overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_38px_-34px_rgba(15,23,42,0.42)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.5)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                {player.photo_url ? (
                  <Image
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-300" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white">
                  <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-tight sm:text-base">
                    {player.name}
                  </h3>
                  <p className="mt-1 inline-flex rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">
                    {getRoleText(player.role)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Herkunft</p>
                <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-700">
                  {getOriginText(player.origin)}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {selectedTeam.players.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-600">
              Noch keine Spieler in diesem Team
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px] sm:p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700">
              Unser Verein
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Unsere Teams
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Tippe auf ein Team, um alle Spieler zu sehen.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {teamsWithPlayers.map((team) => (
          <Card
            key={team.id}
            className="group cursor-pointer overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_38px_-34px_rgba(15,23,42,0.42)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.5)]"
            onClick={() => setSelectedTeam(team)}
          >
            <div className="relative flex h-36 items-center justify-center overflow-hidden bg-slate-950 sm:h-40">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-500/10 blur-2xl" />

              {team.logo_url ? (
                <div className="relative h-[78%] w-[72%] max-w-[220px]">
                  <Image
                    src={team.logo_url || "/placeholder.svg"}
                    alt={team.name}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                  <Users className="h-7 w-7 text-white/35" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
              <div className="min-w-0">
                <div className="truncate text-base font-black tracking-tight text-slate-950">
                  {team.name}
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">
                  {team.players.length} Spieler
                </div>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 transition-colors group-hover:border-orange-500 group-hover:bg-orange-500">
                <ArrowRight className="h-4 w-4 text-orange-700 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {teamsWithPlayers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-600">
            Noch keine Teams verfügbar
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Teams werden bald hinzugefügt
          </p>
        </div>
      ) : null}
    </div>
  )
}
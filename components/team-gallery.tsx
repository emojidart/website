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

  const translateThrowingHand = (hand: string | null) => {
    if (!hand) return "-"

    const normalized = hand.trim().toLowerCase()

    if (normalized === "left") return "Links"
    if (normalized === "right") return "Rechts"

    return hand
  }

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null

    const birth = new Date(birthdate)
    if (isNaN(birth.getTime())) return null

    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()

    const monthDiff = today.getMonth() - birth.getMonth()
    const dayDiff = today.getDate() - birth.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--
    }

    return age
  }

  const getAgeText = (birthdate: string | null) => {
    const age = calculateAge(birthdate)
    return age !== null ? String(age) : "-"
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
          className="mb-4 -ml-2 gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Alle Teams
        </Button>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {selectedTeam.logo_url ? (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                  <Image
                    src={selectedTeam.logo_url || "/placeholder.svg"}
                    alt={selectedTeam.name}
                    fill
                    className="object-contain p-3"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 inline-flex px-2.5 py-1 rounded-full">
                Team
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-black leading-tight truncate">
                {selectedTeam.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedTeam.players.length} Spieler
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {sortedPlayers.map((player) => (
            <Card
              key={player.id}
              className="group overflow-hidden bg-white border border-gray-200 hover:border-orange-300 transition-all duration-300 hover:shadow-md"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                {player.photo_url ? (
                  <Image
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-300" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-70" />

                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="text-sm sm:text-base font-black leading-tight line-clamp-2">
                    {player.name}
                  </h3>
                  <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-200">
                    {getRoleText(player.role)}
                  </p>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Alter</p>
                    <p className="font-semibold text-gray-900">
                      {getAgeText(player.birthdate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Wurfhand</p>
                    <p className="font-semibold text-gray-900">
                      {translateThrowingHand(player.throwing_hand)}
                    </p>
                  </div>
                </div>

                <div className="text-xs">
                  <p className="text-gray-500">Herkunft</p>
                  <p className="font-semibold text-gray-900 line-clamp-1">
                    {getOriginText(player.origin)}
                  </p>
                </div>
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
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 inline-flex px-2.5 py-1 rounded-full">
              Unser Verein
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-black leading-tight">
              Unsere Teams
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Tippe auf ein Team, um alle Spieler zu sehen.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {teamsWithPlayers.map((team) => (
          <Card
            key={team.id}
            className="group cursor-pointer overflow-hidden bg-white border border-gray-200 hover:border-orange-300 transition-all duration-300 hover:shadow-md"
            onClick={() => setSelectedTeam(team)}
          >
            <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
              {team.logo_url ? (
                <Image
                  src={team.logo_url || "/placeholder.svg"}
                  alt={team.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-16 h-16 text-gray-300" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70" />

              <div className="absolute bottom-2 left-3 right-3 text-white">
                <div className="text-sm font-black line-clamp-1">{team.name}</div>
                <div className="text-[11px] text-white/90">
                  {team.players.length} Spieler
                </div>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 group-hover:text-orange-700 transition-colors">
                Team ansehen
              </span>

              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 group-hover:bg-orange-600 group-hover:border-orange-600 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-orange-700 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
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
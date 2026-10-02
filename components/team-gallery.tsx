"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Users, ArrowRight, Crown, MapPin, Hand } from "lucide-react"

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
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--
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
    if (normalized === "player" || normalized === "spieler") return "Spieler"
    return role
  }

  if (selectedTeam) {
    const sortedPlayers = sortPlayersByRole(selectedTeam.players)

    return (
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setSelectedTeam(null)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white hover:bg-white/[0.08] hover:text-white"
            type="button"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Alle Teams
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/25 p-4 shadow-[0_22px_64px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-500/10 blur-[90px]" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24">
              {selectedTeam.logo_url ? (
                <Image
                  src={selectedTeam.logo_url || "/placeholder.svg"}
                  alt={selectedTeam.name}
                  fill
                  className="object-contain p-2"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Users className="h-8 w-8 text-white/25" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/[0.12] bg-orange-500/[0.07] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                <Crown className="h-3 w-3" />
                Team
              </div>
              <h2 className="mt-2 truncate text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                {selectedTeam.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/45">
                {selectedTeam.players.length} Spieler
              </p>
            </div>
          </div>
        </section>

        {sortedPlayers.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {sortedPlayers.map((player) => (
              <article
                key={player.id}
                className="group overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/25 shadow-[0_18px_52px_-42px_rgba(0,0,0,.95)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.035]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white/[0.035]">
                  {player.photo_url ? (
                    <Image
                      src={player.photo_url || "/placeholder.svg"}
                      alt={player.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users className="h-14 w-14 text-white/15" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base">
                      {player.name}
                    </h3>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
                      {getRoleText(player.role)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
                  <div className="rounded-xl bg-white/[0.035] p-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">Alter</div>
                    <div className="mt-1 text-sm font-black text-white">{getAgeText(player.birthdate)}</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.035] p-2">
                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                      <Hand className="h-3 w-3" />
                      Hand
                    </div>
                    <div className="mt-1 text-sm font-black text-white">{translateThrowingHand(player.throwing_hand)}</div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-white/[0.035] p-2">
                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                      <MapPin className="h-3 w-3" />
                      Herkunft
                    </div>
                    <div className="mt-1 truncate text-sm font-black text-white">{getOriginText(player.origin)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-dashed border-white/10 bg-black/20 p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-3 text-sm font-bold text-white/45">Noch keine Spieler in diesem Team.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {teamsWithPlayers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {teamsWithPlayers.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeam(team)}
              className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/25 text-left shadow-[0_20px_60px_-46px_rgba(0,0,0,.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.035]"
            >
              <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[0.06] bg-black/45">
                {team.logo_url ? (
                  <Image
                    src={team.logo_url || "/placeholder.svg"}
                    alt={team.name}
                    fill
                    className="object-contain p-3 transition duration-500 group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Users className="h-14 w-14 text-white/15" />
                  </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,.72))]" />
                <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/65 backdrop-blur-md">
                  {team.players.length} Spieler
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black tracking-tight text-white sm:text-lg">{team.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-white/38">Kader anzeigen</p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.12] bg-orange-500/[0.07] text-orange-300 transition group-hover:border-orange-400/30 group-hover:bg-orange-500 group-hover:text-white">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-12 text-center">
          <Users className="mx-auto h-11 w-11 text-white/20" />
          <p className="mt-3 text-base font-black text-white/60">Noch keine Teams verfügbar</p>
          <p className="mt-1 text-sm font-semibold text-white/35">Teams werden hier automatisch angezeigt.</p>
        </div>
      )}
    </div>
  )
}

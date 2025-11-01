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
  age: number | null
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
        'captain': 1,
        'co-captain': 2,
        'spieler': 3,
        'player': 3,
      }
      
      const roleA = a.role?.toLowerCase() || 'spieler'
      const roleB = b.role?.toLowerCase() || 'spieler'
      
      const orderA = roleOrder[roleA] || 3
      const orderB = roleOrder[roleB] || 3
      
      if (orderA !== orderB) {
        return orderA - orderB
      }
      
      return a.name.localeCompare(b.name)
    })
  }

  if (selectedTeam) {
    const sortedPlayers = sortPlayersByRole(selectedTeam.players)

    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedTeam(null)}
          className="mb-12 text-lg hover:text-primary hover:bg-primary/10 transition-all"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          Alle Teams
        </Button>

        <div className="mb-16">
          <div className="flex items-center gap-6 mb-6">
            {selectedTeam.logo_url && (
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-muted shadow-lg">
                <Image
                  src={selectedTeam.logo_url || "/placeholder.svg"}
                  alt={selectedTeam.name}
                  fill
                  className="object-contain p-4"
                />
              </div>
            )}
            <div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-2">{selectedTeam.name}</h1>
              <p className="text-xl text-muted-foreground">
                {selectedTeam.players.length} {selectedTeam.players.length === 1 ? "Spieler" : "Spieler"}
              </p>
            </div>
          </div>
          <div className="h-1 w-24 bg-primary rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {sortedPlayers.map((player) => (
            <Card
              key={player.id}
              className="group overflow-hidden bg-card border-2 border-border hover:border-primary transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                {player.photo_url ? (
                  <Image
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-24 h-24 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold text-balance mb-1">{player.name}</h3>
                  {player.role && (
                    <p className="text-primary font-semibold uppercase tracking-wider text-sm">{player.role}</p>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-3 bg-card/50 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {player.age && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Alter</p>
                      <p className="font-semibold text-foreground">{player.age} Jahre</p>
                    </div>
                  )}
                  {player.throwing_hand && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Wurfhand</p>
                      <p className="font-semibold text-foreground">{player.throwing_hand}</p>
                    </div>
                  )}
                </div>
                {player.origin && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Herkunft</p>
                    <p className="font-semibold text-foreground">{player.origin}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {selectedTeam.players.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-muted-foreground">Noch keine Spieler in diesem Team</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-20 text-center max-w-4xl mx-auto">
        <div className="inline-block mb-4">
          <span className="text-primary font-bold uppercase tracking-widest text-sm">Unser Verein</span>
        </div>
        <div className="mb-8 overflow-hidden">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 text-balance leading-none animate-in fade-in slide-in-from-bottom-8 duration-700">
            UNSERE
            <br />
            MANNSCHAFTEN
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          Entdecke unsere Teams und Spieler
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
        {teamsWithPlayers.map((team) => (
          <Card
            key={team.id}
            className="group cursor-pointer overflow-hidden bg-card border-2 border-border hover:border-primary transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2"
            onClick={() => setSelectedTeam(team)}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted via-muted/80 to-muted/60">
              {team.logo_url ? (
                <Image
                  src={team.logo_url || "/placeholder.svg"}
                  alt={team.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-32 h-32 text-muted-foreground/20" />
                </div>
              )}
            </div>

            <div className="p-6 bg-gradient-to-b from-card to-card/50 space-y-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance mb-2 leading-tight group-hover:text-primary transition-colors">
                  {team.name}
                </h2>
                <p className="text-muted-foreground text-base font-medium">
                  {team.players.length} {team.players.length === 1 ? "Spieler" : "Spieler"}
                </p>
              </div>

              <div className="flex items-center justify-between text-foreground group-hover:text-primary transition-colors pt-2 border-t border-border/50">
                <span className="font-semibold text-base">Team ansehen</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {teamsWithPlayers.length === 0 && (
        <div className="text-center py-24">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-muted-foreground mb-2">Noch keine Teams verfügbar</p>
          <p className="text-lg text-muted-foreground/70">Teams werden bald hinzugefügt</p>
        </div>
      )}
    </div>
  )
}

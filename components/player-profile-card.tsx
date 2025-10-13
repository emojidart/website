"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Target, TrendingUp, Award, Users } from "lucide-react"
import Image from "next/image"

interface PlayerProfileCardProps {
  player: {
    player_name: string
    total_points: number
    placement_points: number
    bonus_points: number
    total_legs_won: number
    total_legs_lost: number
    tournaments_played: number
    total_matches_played: number
    total_matches_won: number
    total_matches_lost: number
    profile_picture_url?: string
  }
  rank: number
  className?: string
}

export function PlayerProfileCard({ player, rank, className }: PlayerProfileCardProps) {
  const winRate =
    player.total_matches_played > 0
      ? ((player.total_matches_won / player.total_matches_played) * 100).toFixed(1)
      : "0.0"

  const legDifference = player.total_legs_won - player.total_legs_lost

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-red-500 bg-gray-200 flex items-center justify-center">
              {player.profile_picture_url ? (
                <Image
                  src={player.profile_picture_url || "/placeholder.svg"}
                  alt={`Profilbild von ${player.player_name}`}
                  width={96}
                  height={96}
                  className="object-cover"
                  unoptimized={true}
                />
              ) : (
                <span className="text-4xl font-bold text-gray-600">{player.player_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-lg">
              #{rank}
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">{player.player_name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Rang {rank} in der Gesamtwertung</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Score */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Gesamtpunkte</span>
            </div>
            <span className="text-2xl font-bold text-yellow-700">{player.total_points}</span>
          </div>
        </div>

        {/* Points Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xs text-blue-600 font-medium mb-1">Platzierung</div>
            <div className="text-lg font-bold text-blue-800">{player.placement_points}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 font-medium mb-1">Legs</div>
            <div className="text-lg font-bold text-green-800">{player.total_legs_won}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xs text-purple-600 font-medium mb-1">Bonus</div>
            <div className="text-lg font-bold text-purple-800">{player.bonus_points}</div>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Antritte</span>
            </div>
            <span className="font-semibold text-gray-900">{player.tournaments_played}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Matches gespielt</span>
            </div>
            <span className="font-semibold text-gray-900">{player.total_matches_played}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Matches gewonnen</span>
            </div>
            <span className="font-semibold text-green-600">{player.total_matches_won}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Siegrate</span>
            </div>
            <span className="font-semibold text-gray-900">{winRate}%</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Leg-Differenz</span>
            </div>
            <span className={`font-semibold ${legDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {legDifference >= 0 ? "+" : ""}
              {legDifference}
            </span>
          </div>
        </div>

        {/* Qualification Status */}
        <div
          className={`rounded-lg p-3 text-center ${
            player.tournaments_played >= 20
              ? "bg-green-50 border-2 border-green-300"
              : "bg-red-50 border-2 border-red-300"
          }`}
        >
          <div className={`text-sm font-bold ${player.tournaments_played >= 20 ? "text-green-700" : "text-red-700"}`}>
            {player.tournaments_played >= 20 ? "✓ Für Finale qualifiziert" : "✗ Nicht qualifiziert"}
          </div>
          {player.tournaments_played < 20 && (
            <div className="text-xs text-red-600 mt-1">Noch {20 - player.tournaments_played} Antritte benötigt</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

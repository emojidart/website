"use client"

import type React from "react"

import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Target,
  Users,
  CheckCircle,
  AlertCircle,
  Crown,
  Medal,
  Award,
  MapPin,
  Calendar,
  Hand,
  Clock,
  Info,
  Edit3,
  Globe,
  Heart,
  BarChart3,
  UserCheck,
} from "lucide-react"
import type { CombinedPlayerData } from "@/hooks/use-dart-data"
import { cn } from "@/lib/utils" // Import cn for conditional class joining

interface PlayerProfileCardProps {
  player: CombinedPlayerData
  rank: number
  className?: string // Added className prop for external styling
}

// Helper for country flags (simplified for example)
const countryFlags: { [key: string]: string } = {
  Deutschland: "https://flagcdn.com/w40/de.png",
  Österreich: "https://flagcdn.com/w40/at.png",
  Schweiz: "https://flagcdn.com/w40/ch.png",
  // Add more as needed
}

// Helper to calculate age
function calculateAge(birthDate: string | null): string | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return `${age} Jahre`
}

// Qualification Progress Component
function QualificationProgress({ current, required }: { current: number; required: number }) {
  const percentage = Math.min((current / required) * 100, 100)
  const isQualified = current >= required

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isQualified ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Qualification Status Component
function QualificationStatus({ edartGames, steelGames }: { edartGames: number; steelGames: number }) {
  const edartQualified = edartGames >= 5
  const steelQualified = steelGames >= 5
  const fullyQualified = edartQualified && steelQualified

  if (fullyQualified) {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-bold">QUALIFIZIERT FÜR FINALE</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-bold">NICHT QUALIFIZIERT</span>
    </div>
  )
}

// Achievement Component
interface AchievementProps {
  icon: React.ElementType
  title: string
  description: string
  unlocked: boolean
}

function Achievement({ icon: Icon, title, description, unlocked }: AchievementProps) {
  return (
    <div
      className={`relative p-4 sm:p-6 rounded-xl text-center transition-all duration-300 overflow-hidden
      ${unlocked ? "bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-400 shadow-lg" : "bg-gray-50 border border-gray-200 shadow-sm"}
      hover:scale-[1.02] hover:shadow-xl`}
    >
      {unlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 via-yellow-100/0 to-yellow-300/20 animate-shine pointer-events-none" />
      )}
      <div
        className={`text-4xl mb-3 transition-opacity duration-300 ${unlocked ? "opacity-100 text-yellow-600" : "opacity-30 text-gray-500"}`}
      >
        <Icon className="h-10 w-10 mx-auto" />
      </div>
      <h4 className={`font-bold text-base mb-1 ${unlocked ? "text-yellow-900" : "text-gray-700"}`}>{title}</h4>
      <p className={`text-sm ${unlocked ? "text-yellow-800" : "text-gray-500"}`}>{description}</p>
    </div>
  )
}

export function PlayerProfileCard({ player, rank, className }: PlayerProfileCardProps) {
  let cardClasses = "w-full rounded-xl shadow-lg overflow-hidden border"
  const headerClasses = "relative p-4 pb-12 text-white"
  let profileBorderClass = "border-4 border-white"
  let badgeClasses = "mt-2 font-bold text-xs px-2 py-1 rounded-full shadow-sm border"
  let statBgClass = "bg-gray-50"
  let statBorderClass = "border-gray-100"
  let statItemBgClass = "bg-white"
  let statItemBorderClass = "border-gray-100"
  let statItemTextColor = "text-gray-900"
  let statItemLabelColor = "text-gray-500"
  const titleColor = "text-white"
  let rankIcon = null
  let headerGradient = "bg-gradient-to-r from-red-500 to-red-600" // Default red gradient

  if (rank === 1) {
    // Gold Design for Rank 1
    cardClasses =
      "w-full rounded-xl shadow-2xl overflow-hidden border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100"
    headerGradient = "bg-gradient-to-r from-yellow-500 to-yellow-700"
    profileBorderClass = "border-4 border-yellow-300 shadow-lg"
    badgeClasses =
      "mt-2 bg-yellow-100 text-yellow-800 font-bold text-xs px-2 py-1 rounded-full shadow-md border border-yellow-200"
    statBgClass = "bg-yellow-50"
    statBorderClass = "border-yellow-100"
    statItemBgClass = "bg-white"
    statItemBorderClass = "border-yellow-100"
    statItemTextColor = "text-yellow-900"
    statItemLabelColor = "text-yellow-600"
    rankIcon = <Crown className="h-6 w-6 text-yellow-300 drop-shadow-md" />
  } else if (rank === 2) {
    // Silver Design for Rank 2 (more distinct from neutral gray)
    cardClasses =
      "w-full rounded-xl shadow-xl overflow-hidden border-2 border-gray-500 bg-gradient-to-br from-gray-100 to-gray-200"
    headerGradient = "bg-gradient-to-r from-gray-600 to-gray-800" // Darker header for silver
    profileBorderClass = "border-4 border-gray-400 shadow-lg"
    badgeClasses =
      "mt-2 bg-gray-200 text-gray-900 font-bold text-xs px-2 py-1 rounded-full shadow-md border border-gray-300"
    statBgClass = "bg-gray-100"
    statBorderClass = "border-gray-200"
    statItemBgClass = "bg-white"
    statItemBorderClass = "border-gray-200"
    statItemTextColor = "text-gray-900"
    statItemLabelColor = "text-gray-700"
    rankIcon = <Medal className="h-6 w-6 text-gray-400 drop-shadow-md" />
  } else if (rank === 3) {
    // Bronze/Copper Design for Rank 3
    cardClasses =
      "w-full rounded-xl shadow-lg overflow-hidden border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100"
    headerGradient = "bg-gradient-to-r from-orange-500 to-orange-700"
    profileBorderClass = "border-4 border-orange-300 shadow-lg"
    badgeClasses =
      "mt-2 bg-orange-100 text-orange-800 font-bold text-xs px-2 py-1 rounded-full shadow-md border border-orange-200"
    statBgClass = "bg-orange-50"
    statBorderClass = "border-orange-100"
    statItemBgClass = "bg-white"
    statItemBorderClass = "border-orange-100"
    statItemTextColor = "text-orange-900"
    statItemLabelColor = "text-orange-600"
    rankIcon = <Award className="h-6 w-6 text-orange-300 drop-shadow-md" /> // Award icon fits bronze
  } else {
    // Neutral/White Design for Ranks 4 and above
    cardClasses = "w-full rounded-xl shadow-lg overflow-hidden border border-gray-200 bg-white"
    headerGradient = "bg-gradient-to-r from-gray-300 to-gray-400" // Lighter, more neutral gray gradient for header
    profileBorderClass = "border-4 border-gray-200 shadow-md"
    badgeClasses =
      "mt-2 bg-gray-100 text-gray-700 font-bold text-xs px-2 py-1 rounded-full shadow-sm border border-gray-200"
    statBgClass = "bg-gray-50"
    statBorderClass = "border-gray-100"
    statItemBgClass = "bg-white"
    statItemBorderClass = "border-gray-100"
    statItemTextColor = "text-gray-900"
    statItemLabelColor = "text-gray-500"
    rankIcon = null // No specific icon for these ranks
  }

  const achievements = [
    {
      icon: Trophy,
      title: "100 Punkte erreicht",
      description: "Insgesamt 100 Punkte in Turnieren erzielt",
      unlocked: player.totalPoints >= 100,
    },
    {
      icon: Target,
      title: "50 Legs gewonnen",
      description: "Insgesamt 50 Legs in Turnieren gewonnen",
      unlocked: player.totalLegs >= 50,
    },
    {
      icon: Users,
      title: "10 Antritte erreicht",
      description: "An 10 oder mehr Turnieren teilgenommen",
      unlocked: player.totalParticipations >= 10,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(cardClasses, className)} // Apply external className here
    >
      <Card className="bg-transparent text-gray-900 border-none shadow-none">
        <CardHeader className={`${headerClasses} ${headerGradient}`}>
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-28 h-28 rounded-full shadow-xl overflow-hidden bg-gray-200 flex items-center justify-center ${profileBorderClass}`}
            >
              {player.profile_picture_url ? (
                <Image
                  src={player.profile_picture_url || "/placeholder.svg"}
                  alt={`Profilbild von ${player.name}`}
                  width={112}
                  height={112}
                  className="object-cover"
                  unoptimized={true}
                />
              ) : (
                <span className="text-5xl font-bold text-gray-600">{player.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <CardTitle className={`mt-3 text-3xl font-extrabold text-center drop-shadow-sm ${titleColor}`}>
              {player.name}
            </CardTitle>
            <Badge className={badgeClasses}>Gesamt Score: {player.combinedScore}</Badge>
            {rankIcon && (
              <div className="absolute top-4 left-4 p-2 rounded-full bg-white/20 backdrop-blur-sm">{rankIcon}</div>
            )}
            {/* Adjusted right-4 to right-12 to prevent overlap with DialogClose button */}
            <div className="absolute top-4 right-12 text-white text-sm font-semibold">Rang #{rank}</div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          {/* Overall Stats */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Gesamt Statistiken
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Punkte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.totalPoints}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Legs</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.totalLegs}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Antritte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.totalParticipations}</div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-500" /> Persönliche Informationen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {player.geschlecht && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Geschlecht</div>
                    <div className="text-sm font-medium text-gray-900">{player.geschlecht}</div>
                  </div>
                </div>
              )}
              {player.geburtsdatum && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Alter</div>
                    <div className="text-sm font-medium text-gray-900">{calculateAge(player.geburtsdatum)}</div>
                  </div>
                </div>
              )}
              {player.land && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Land</div>
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      {countryFlags[player.land] && (
                        <Image
                          src={countryFlags[player.land] || "/placeholder.svg"}
                          alt={player.land}
                          width={20}
                          height={15}
                          className="mr-2 rounded-sm"
                          unoptimized={true}
                        />
                      )}
                      {player.land}
                    </div>
                  </div>
                </div>
              )}
              {player.ort && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ort</div>
                    <div className="text-sm font-medium text-gray-900">
                      {player.plz} {player.ort}
                    </div>
                  </div>
                </div>
              )}
              {player.wurfhand && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <Hand className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Wurfhand</div>
                    <div className="text-sm font-medium text-gray-900">{player.wurfhand}</div>
                  </div>
                </div>
              )}
              {player.lieblings_spiel && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Lieblingsspiel</div>
                    <div className="text-sm font-medium text-gray-900">{player.lieblings_spiel}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* E-Dart Stats */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" /> E-Dart
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Punkte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.edartPoints}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Legs</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.edartLegs}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Antritte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.edartParticipations}</div>
              </div>
            </div>
            <div className="mt-3">
              <QualificationProgress current={player.edartParticipations} required={5} />
            </div>
          </div>

          {/* Steel Dart Stats */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" /> Steel Dart
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Punkte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.steelPoints}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Legs</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.steelLegs}</div>
              </div>
              <div className={`${statItemBgClass} rounded-md p-2 border ${statItemBorderClass}`}>
                <div className={`text-xs ${statItemLabelColor}`}>Antritte</div>
                <div className={`text-base font-bold ${statItemTextColor}`}>{player.steelParticipations}</div>
              </div>
            </div>
            <div className="mt-3">
              <QualificationProgress current={player.steelParticipations} required={5} />
            </div>
          </div>

          {/* Preferences */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-orange-500" /> Präferenzen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {player.suchradius_km && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-orange-100 text-orange-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Suchradius</div>
                    <div className="text-sm font-medium text-gray-900">{player.suchradius_km} km</div>
                  </div>
                </div>
              )}
              {player.bevorzugte_zeiten && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-orange-100 text-orange-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Bevorzugte Zeiten</div>
                    <div className="text-sm font-medium text-gray-900">{player.bevorzugte_zeiten}</div>
                  </div>
                </div>
              )}
              {player.skill_level && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-orange-100 text-orange-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Skill Level</div>
                    <div className="text-sm font-medium text-gray-900">{player.skill_level}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About Me */}
          {player.bio && (
            <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
              <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-cyan-500" /> Über mich
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{player.bio}</p>
            </div>
          )}

          {/* Achievements */}
          <div className={`${statBgClass} rounded-lg p-3 border ${statBorderClass}`}>
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" /> Erfolge & Auszeichnungen
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements.map((achievement, index) => (
                <Achievement key={index} {...achievement} />
              ))}
            </div>
          </div>

          {/* Qualification Status */}
          <div className="pt-4 border-t border-gray-100">
            <QualificationStatus edartGames={player.edartParticipations} steelGames={player.steelParticipations} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

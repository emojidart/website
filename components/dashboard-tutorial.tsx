"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  BarChart3,
  Euro,
  Table,
  Target,
  Camera,
  Edit,
  Trophy,
  Info,
  Crown,
  UserCheck,
} from "lucide-react"

interface TutorialStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  target?: string
  position?: "top" | "bottom" | "left" | "right"
  roles?: ("player" | "captain" | "co-captain")[] // Added roles filter
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Willkommen im Dashboard!",
    description:
      "Hier ist eine kurze Einführung in dein Dart-Dashboard. Du kannst diese Anleitung jederzeit über das Hilfe-Symbol (?) starten.",
    icon: <HelpCircle className="h-6 w-6 text-blue-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "main-tabs",
    title: "Hauptnavigation",
    description:
      "Die vier Hauptbereiche: Dashboard (Übersicht), Statistiken (deine Dart-Leistung), Bonus (Geldverwaltung) und Liga (Tabellen).",
    icon: <Table className="h-6 w-6 text-orange-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "profile-section",
    title: "Dein Profil",
    description:
      "Hier siehst du deine persönlichen Daten und kannst dein Profilbild hochladen. Klicke auf 'Foto hochladen' um ein Bild hinzuzufügen.",
    icon: <Users className="h-6 w-6 text-green-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "teams-section",
    title: "Meine Teams",
    description:
      "Übersicht über alle Teams, in denen du Mitglied bist. Du siehst deine Rolle (Spieler, Kapitän, Co-Kapitän) und Teammitglieder.",
    icon: <Users className="h-6 w-6 text-purple-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "matches-section-player",
    title: "Spiele einsehen",
    description:
      "Hier findest du alle deine Spiele. Als Spieler kannst du vergangene und kommende Spiele einsehen und deine Statistiken verfolgen.",
    icon: <Target className="h-6 w-6 text-blue-600" />,
    roles: ["player"],
  },
  {
    id: "matches-section-captain",
    title: "Spiele & Statistiken verwalten",
    description:
      "Als Kapitän/Co-Kapitän kannst du zusätzlich: Statistiken eintragen, Spielergebnisse bearbeiten und Teamfotos hochladen. Klicke auf 'Statistiken' oder 'Ergebnis' bei einem Spiel.",
    icon: <Crown className="h-6 w-6 text-red-600" />,
    roles: ["captain", "co-captain"],
  },
  {
    id: "statistics-tab",
    title: "Statistiken-Bereich",
    description:
      "Im Statistiken-Tab siehst du deine Dart-Leistung: 180er, Wins, Penalties und mehr. Wähle zwischen 'Nach Spielen' und 'Gesamtstatistik'.",
    icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "match-stats-entry",
    title: "Statistiken eintragen (Kapitäne)",
    description:
      "Als Kapitän/Co-Kapitän kannst du bei einem Spiel auf 'Statistiken' klicken um Leg-Daten einzutragen: 180er, 171er, Wins, Penalties usw. Diese werden für Bonusberechnungen verwendet.",
    icon: <Edit className="h-6 w-6 text-green-600" />,
    roles: ["captain", "co-captain"],
  },
  {
    id: "bonus-system",
    title: "Bonus-System",
    description:
      "Im Bonus-Tab siehst du die Geldbeträge für Penalties (Under 26, Under 30, Semperit). Diese werden automatisch aus den Statistiken berechnet.",
    icon: <Euro className="h-6 w-6 text-yellow-600" />,
    roles: ["player", "captain", "co-captain"],
  },
  {
    id: "team-photos",
    title: "Teamfotos hochladen (Kapitäne)",
    description:
      "Als Kapitän/Co-Kapitän kannst du Teamfotos zu jedem Spiel hochladen. Klicke auf 'Teamfoto' bei einem Spiel um ein Gruppenbild hinzuzufügen.",
    icon: <Camera className="h-6 w-6 text-indigo-600" />,
    roles: ["captain", "co-captain"],
  },
  {
    id: "tips-player",
    title: "Tipps für Spieler",
    description:
      "1. Lade dein Profilbild hoch\n2. Überprüfe regelmäßig deine Statistiken\n3. Nutze den Bonus-Bereich um deine Penalties zu sehen\n4. Verfolge deine Leistung über die Zeit",
    icon: <Trophy className="h-6 w-6 text-amber-600" />,
    roles: ["player"],
  },
  {
    id: "tips-captain",
    title: "Tipps für Kapitäne",
    description:
      "1. Lade dein Profilbild hoch\n2. Trage nach jedem Spiel die Statistiken aller Spieler ein\n3. Lade Teamfotos hoch\n4. Überprüfe die Bonuskonfiguration für euer Team\n5. Bearbeite Spielergebnisse wenn nötig",
    icon: <Crown className="h-6 w-6 text-amber-600" />,
    roles: ["captain", "co-captain"],
  },
]

interface DashboardTutorialProps {
  onClose?: () => void
  userRole?: "player" | "captain" | "co-captain" // Added userRole prop
}

export function DashboardTutorial({ onClose, userRole = "player" }: DashboardTutorialProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false)

  const filteredSteps = tutorialSteps.filter((step) => !step.roles || step.roles.includes(userRole))

  useEffect(() => {
    const seen = localStorage.getItem(`dashboard-tutorial-seen-${userRole}`) // Role-specific tutorial tracking
    if (!seen) {
      setIsOpen(true)
    } else {
      setHasSeenTutorial(true)
    }
  }, [userRole])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem(`dashboard-tutorial-seen-${userRole}`, "true") // Role-specific tutorial tracking
    setHasSeenTutorial(true)
    onClose?.()
  }

  const handleNext = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  const openTutorial = () => {
    setCurrentStep(0)
    setIsOpen(true)
  }

  const currentStepData = filteredSteps[currentStep]

  const getRoleIcon = () => {
    switch (userRole) {
      case "captain":
        return <Crown className="h-4 w-4 text-yellow-600" />
      case "co-captain":
        return <UserCheck className="h-4 w-4 text-blue-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case "captain":
        return "Kapitän"
      case "co-captain":
        return "Co-Kapitän"
      default:
        return "Spieler"
    }
  }

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={openTutorial}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg"
        title="Dashboard-Anleitung öffnen"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Hilfe
      </Button>

      {/* Tutorial Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-2xl mx-auto p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                {currentStepData?.icon}
                {currentStepData?.title}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                Schritt {currentStep + 1} von {filteredSteps.length}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {getRoleIcon()}
                {getRoleLabel()}
              </Badge>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6">
            <Card className="border-0 shadow-none bg-gray-50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {currentStepData?.description}
                  </div>

                  {currentStep === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <strong>Tipp:</strong> Du kannst diese Anleitung jederzeit über den blauen "Hilfe"-Button
                          unten rechts erneut öffnen. Die Anleitung ist an deine Rolle als {getRoleLabel()} angepasst.
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStepData?.id === "matches-section-captain" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Crown className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <strong>Kapitäns-Berechtigung:</strong> Als Kapitän/Co-Kapitän hast du erweiterte Rechte für
                          die Teamverwaltung.
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStepData?.id === "match-stats-entry" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <strong>Wichtig:</strong> Statistiken sollten nach jedem Leg eingetragen werden, um genaue
                          Bonusberechnungen zu erhalten.
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStepData?.id === "bonus-system" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Euro className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <strong>Hinweis:</strong>{" "}
                          {userRole === "player"
                            ? "Die Bonuskonfiguration wird von deinem Kapitän verwaltet."
                            : "Die Bonuskonfiguration gilt für alle Teammitglieder. Sprich dich mit deinem Team ab."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip} className="text-gray-600 bg-transparent">
                  Überspringen
                </Button>
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrevious} className="flex items-center gap-2 bg-transparent">
                    <ChevronLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                )}
              </div>

              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                {currentStep === filteredSteps.length - 1 ? (
                  "Fertig"
                ) : (
                  <>
                    Weiter
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

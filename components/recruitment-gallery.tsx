"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Users, TrendingUp, Send } from "lucide-react"
import { PlayerApplicationForm } from "@/components/player-application-form"

interface RecruitmentNeed {
  id: string
  team_name: string
  league: string
  start_date: string
  description: string | null
  created_at: string
}

interface RecruitmentGalleryProps {
  recruitmentNeeds: RecruitmentNeed[]
}

export function RecruitmentGallery({ recruitmentNeeds }: RecruitmentGalleryProps) {
  const [openDialogId, setOpenDialogId] = useState<string | null>(null)

  if (recruitmentNeeds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground text-lg">Aktuell keine offenen Positionen verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Offene Positionen</h2>
        <p className="text-muted-foreground">Wir suchen motivierte Spieler für folgende Teams</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recruitmentNeeds.map((need) => (
          <Card
            key={need.id}
            className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-orange-500"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{need.league}</Badge>
                <div className="flex items-center gap-1 text-orange-600">
                  <Users className="h-4 w-4" />
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold leading-tight">{need.team_name}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Start:</span> {new Date(need.start_date).toLocaleDateString("de-DE")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {need.description && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{need.description}</p>
                </div>
              )}

              <Dialog open={openDialogId === need.id} onOpenChange={(open) => setOpenDialogId(open ? need.id : null)}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md transition-all duration-200">
                    <Send className="h-4 w-4 mr-2" />
                    Jetzt bewerben
                  </Button>
                </DialogTrigger>
                <PlayerApplicationForm
                  onApplicationSuccess={() => {
                    setOpenDialogId(null)
                  }}
                />
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

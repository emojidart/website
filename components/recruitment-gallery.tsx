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
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <Card className="border-0 shadow-md ring-1 ring-black/5">
          <CardContent className="p-6 text-center">
            <p className="text-gray-700 font-semibold">Aktuell keine offenen Positionen verfügbar.</p>
            <p className="text-sm text-gray-500 mt-1">Schau später nochmal rein 🙂</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-4">
        <div className="rounded-2xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5">
          <div className="p-4 sm:p-5">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Offene Positionen</h2>
            <p className="text-sm text-gray-500 mt-1">Wir suchen motivierte Spieler für folgende Teams</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {recruitmentNeeds.map((need) => (
          <Card
            key={need.id}
            className="border-0 shadow-md ring-1 ring-black/5 overflow-hidden"
          >
            {/* left accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-orange-600" />

            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl font-black leading-tight text-gray-900 truncate">
                    {need.team_name}
                  </CardTitle>

                  <CardDescription className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-orange-900 border border-orange-200">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold">Start:</span>
                      {new Date(need.start_date).toLocaleDateString("de-DE")}
                    </span>
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                    {need.league}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-orange-700">
                <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-bold">
                  <Users className="h-4 w-4" />
                  <TrendingUp className="h-4 w-4" />
                  Gesucht
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-4">
              {need.description ? (
                <div className="rounded-xl border border-gray-200/70 bg-gray-50 p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{need.description}</p>
                </div>
              ) : null}

              <Dialog open={openDialogId === need.id} onOpenChange={(open) => setOpenDialogId(open ? need.id : null)}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-lg">
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
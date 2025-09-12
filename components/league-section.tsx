"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Table, RefreshCw, ExternalLink } from "lucide-react"

export function LeagueSection() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Trophy className="h-8 w-8 text-orange-600" />
              <Badge variant="secondary">Aktiv</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">Herbstsaison 2025</div>
            <p className="text-sm text-gray-600">Aktuelle Saison</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-orange-600" />
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">18+ Divisionen</div>
            <p className="text-sm text-gray-600">Salzburg, Pongau, Lungau</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-orange-600" />
              <Badge variant="secondary">Neu</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">Steeldart</div>
            <p className="text-sm text-gray-600">5 neue Divisionen</p>
          </CardContent>
        </Card>
      </div>

      {/* Liga Tabellen Iframe */}
      <Card className="border-orange-200 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Table className="h-6 w-6 text-orange-600" />
                Liga Tabellen
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Aktuelle Tabellen und Spielerstatistiken der Sportdarts Liga Austria
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-orange-200 hover:bg-orange-50 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-orange-200 hover:bg-orange-50 bg-transparent"
              >
                <a
                  href="https://www.sportdartsliga.at/ligasystem/division-tables"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Vollbild
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full">
            <iframe
              src="https://www.sportdartsliga.at/ligasystem/division-tables"
              className="w-full h-[800px] border-0 rounded-b-lg"
              title="Sportdarts Liga Tabellen"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

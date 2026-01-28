"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table } from "lucide-react"

export function LeagueSection() {
  return (
    <div className="w-full">

      {/* Liga Tabellen */}
      <Card className="border-orange-200 shadow-xl">
        <CardHeader>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Table className="h-6 w-6 text-orange-600" />
              Liga Tabellen
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Aktuelle Tabellen und Spielerstatistiken der Sportdarts Liga Austria
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <iframe
            src="https://www.sportdartsliga.at/ligasystem/division-tables"
            className="w-full h-[800px] border-0 rounded-b-lg"
            title="Sportdarts Liga Tabellen"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </CardContent>
      </Card>

    </div>
  )
}

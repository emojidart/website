"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, RefreshCw, Table, Trophy, Users, Calendar } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function LigaTabellenPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-20">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Table className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">SPORTDARTS</span>
                <span className="block text-orange-200">LIGA TABELLEN</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Aktuelle Standings & Ergebnisse
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Live-Daten von der offiziellen Sportdarts Liga Austria</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </motion.div>

          {/* Liga Tabellen Iframe */}
          <motion.div variants={itemVariants}>
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
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="border-orange-200 hover:bg-orange-50 bg-transparent"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
                <div className="relative">
                  <iframe
                    src="https://www.sportdartsliga.at/ligasystem/division-tables"
                    className="w-full h-[800px] border-0 rounded-b-lg"
                    title="Sportdarts Liga Tabellen"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-b-lg">
                      <div className="flex items-center gap-3 text-orange-600">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="font-medium">Wird aktualisiert...</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Section */}
          <motion.div variants={itemVariants} className="mt-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 rounded-lg p-2 mt-1">
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Über die Liga Tabellen</h3>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Diese Seite zeigt die aktuellen Tabellen der Sportdarts Liga Austria direkt von der offiziellen
                      Website. Hier findest du alle Divisionen von Salzburg, Pongau und Lungau sowie die neuen
                      Steeldart-Ligen.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Live-Daten
                      </Badge>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Alle Divisionen
                      </Badge>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Spielerstatistiken
                      </Badge>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        PDF Export
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <footer className="py-6 bg-gray-200 text-gray-600 text-sm text-center border-t border-gray-300">
        <p>&copy; 2025 Emoj!'s Dartverein e.V. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}

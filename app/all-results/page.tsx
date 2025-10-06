"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Trophy } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DKOResultsSection from "@/components/dko-results-section"
import KratzerResultsSection from "@/components/kratzer-results-section"

export default function AllResultsPage() {
  const [activeTab, setActiveTab] = useState("dko")

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">TURNIER ERGEBNISSE</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">Alle vergangenen DKO und Kratzer Turniere</p>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12">
            <TabsTrigger value="dko" className="text-base font-bold">
              DKO Turniere
            </TabsTrigger>
            <TabsTrigger value="kratzer" className="text-base font-bold">
              Kratzer Turniere
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dko" className="mt-0">
            <DKOResultsSection />
          </TabsContent>

          <TabsContent value="kratzer" className="mt-0">
            <KratzerResultsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

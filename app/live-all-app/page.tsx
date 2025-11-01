"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/header"
import LiveDKOSection from "@/components/live-dko-section"
import LiveKratzerSection from "@/components/live-kratzer-section"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Trophy } from "lucide-react"

export default function LiveAllPage() {
  const [activeTab, setActiveTab] = useState("dko")

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              <Trophy className="w-4 h-4" />
              <span>Live Updates</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">LIVE TURNIERE</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Verfolge alle aktiven Turniere in Echtzeit
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-16 max-w-7xl">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
            <TabsTrigger value="dko" className="text-sm md:text-base font-semibold">
              DKO Turniere
            </TabsTrigger>
            <TabsTrigger value="kratzer" className="text-sm md:text-base font-semibold">
              Kratzer Turniere
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dko" className="mt-0">
            <LiveDKOSection />
          </TabsContent>

          <TabsContent value="kratzer" className="mt-0">
            <LiveKratzerSection />
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav />
    </div>
  )
}

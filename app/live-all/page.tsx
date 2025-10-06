"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LiveDKOSection from "@/components/live-dko-section"
import LiveKratzerSection from "@/components/live-kratzer-section"
import { Trophy } from "lucide-react"

export default function LiveAllPage() {
  const [activeTab, setActiveTab] = useState("dko")

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl flex-grow">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-10 w-10 text-orange-600" />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              Live Turniere
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Verfolge alle aktiven Turniere in Echtzeit</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="dko" className="text-base font-semibold">
              DKO Turniere
            </TabsTrigger>
            <TabsTrigger value="kratzer" className="text-base font-semibold">
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
    </div>
  )
}

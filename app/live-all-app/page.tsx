"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/header"
import LiveDKOSection from "@/components/live-dko-section"
import LiveKratzerSection from "@/components/live-kratzer-section"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Trophy } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } },
}

export default function LiveAllPage() {
  const [activeTab, setActiveTab] = useState("dko")

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Live Turniere</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Verfolge alle aktiven Turniere in Echtzeit.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs Card */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl bg-gray-100 p-1">
                    <TabsTrigger
                      value="dko"
                      className="rounded-xl text-xs sm:text-sm font-black data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      DKO Turniere
                    </TabsTrigger>
                    <TabsTrigger
                      value="kratzer"
                      className="rounded-xl text-xs sm:text-sm font-black data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      Kratzer Turniere
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <TabsContent value="dko" className="mt-0">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                        <LiveDKOSection />
                      </div>
                    </TabsContent>

                    <TabsContent value="kratzer" className="mt-0">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                        <LiveKratzerSection />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
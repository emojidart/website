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
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] pb-20 text-slate-950">
      <Header />

      <main className="pt-14 sm:pt-16">
        <motion.div
          className="w-full max-w-none px-2 py-3 sm:px-4 sm:py-5 lg:px-5 xl:px-6 2xl:px-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
                    <Trophy className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/50">Turniere</p>
                    <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                      Live Turniere
                    </h1>
                    <p className="mt-2 text-sm font-medium text-white/55 sm:text-base">
                      Verfolge alle aktiven Turniere in Echtzeit.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>

          {/* Tabs Card */}
          <motion.div variants={itemVariants}>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
              <div className="p-4 sm:p-5">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full max-w-xl grid-cols-2 rounded-[16px] bg-slate-100 p-1.5">
                    <TabsTrigger
                      value="dko"
                      className="rounded-xl px-3 py-2.5 text-xs font-black text-slate-500 transition data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      DKO Turniere
                    </TabsTrigger>
                    <TabsTrigger
                      value="kratzer"
                      className="rounded-xl px-3 py-2.5 text-xs font-black text-slate-500 transition data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      Kratzer Turniere
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <TabsContent value="dko" className="mt-0">
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-2 sm:p-4">
                        <LiveDKOSection />
                      </div>
                    </TabsContent>

                    <TabsContent value="kratzer" className="mt-0">
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-2 sm:p-4">
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
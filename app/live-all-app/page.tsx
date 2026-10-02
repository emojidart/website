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
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } },
}

export default function LiveAllPage() {
  const [activeTab, setActiveTab] = useState("dko")
return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* Same visual background as Member Profile – loaded hidden first to prevent image flash */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
              <div className="pointer-events-none absolute -left-20 top-[-120px] h-80 w-80 rounded-full bg-orange-400/15 blur-[110px]" />
              <div className="pointer-events-none absolute -right-24 bottom-[-140px] h-96 w-96 rounded-full bg-sky-500/12 blur-[120px]" />
              <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <Trophy className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl"><span className="h-2 w-2 rounded-full bg-orange-400" />Turniere · Live</div>
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
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/30 shadow-[0_28px_90px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[30px]">
              <div className="p-4 sm:p-5">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full max-w-xl grid-cols-2 rounded-[18px] border border-white/10 bg-white/5 p-1.5">
                    <TabsTrigger
                      value="dko"
                      className="rounded-xl px-3 py-2.5 text-xs font-black text-white/45 transition data-[state=active]:bg-orange-400 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      DKO Turniere
                    </TabsTrigger>
                    <TabsTrigger
                      value="kratzer"
                      className="rounded-xl px-3 py-2.5 text-xs font-black text-white/45 transition data-[state=active]:bg-orange-400 data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      Kratzer Turniere
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <TabsContent value="dko" className="mt-0">
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-2 sm:p-4 ">
                        <LiveDKOSection />
                      </div>
                    </TabsContent>

                    <TabsContent value="kratzer" className="mt-0">
                      <div className="rounded-[22px] border border-white/10 bg-white/5 p-2 sm:p-4 ">
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

      <div className="relative z-20"><MobileBottomNav /></div>
    </div>
  )
}
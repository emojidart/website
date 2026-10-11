"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/header"
import LiveDKOSection from "@/components/live-dko-section"
import LiveKratzerSection from "@/components/live-kratzer-section"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Trophy, Radio } from "lucide-react"
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

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          <motion.section variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#101620]/95 px-4 py-4 shadow-[0_16px_50px_-38px_rgba(0,0,0,.9)] sm:px-6 sm:py-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-400/20 bg-orange-400/10">
                <Radio className="h-5 w-5 text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-orange-300">EMD · Live Center</p>
                <h1 className="mt-0.5 text-[clamp(20px,3vw,32px)] font-black tracking-[-.04em] text-white">Live Turniere</h1>
              </div>
              <span className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/[.08] px-2.5 py-1 text-[10px] font-extrabold text-emerald-300">● LIVE</span>
            </div>
          </motion.section>

          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#101620] p-1.5 sm:max-w-[460px]">
                <TabsTrigger value="dko" className="min-h-11 rounded-lg px-2 py-2.5 text-[13px] font-extrabold text-slate-400 data-[state=active]:bg-orange-500 data-[state=active]:text-white">Doppel-KO</TabsTrigger>
                <TabsTrigger value="kratzer" className="min-h-11 rounded-lg px-2 py-2.5 text-[13px] font-extrabold text-slate-400 data-[state=active]:bg-orange-500 data-[state=active]:text-white">Kratzer</TabsTrigger>
              </TabsList>
              <TabsContent value="dko" className="mt-4"><LiveDKOSection /></TabsContent>
              <TabsContent value="kratzer" className="mt-4"><LiveKratzerSection /></TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>

      <div className="relative z-20"><MobileBottomNav /></div>
    </div>
  )
}
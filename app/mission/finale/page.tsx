"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function FinalePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20 overflow-x-hidden">
      <Header />

      <main className="relative">
        <motion.div
          className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-6">
            <Link href="/oster-mission">
              <Button
                variant="outline"
                className="rounded-2xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Oster Mission
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden rounded-3xl border border-orange-500/20 bg-zinc-950 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                <Sparkles className="h-3.5 w-3.5" />
                Finale freigeschaltet
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                Das letzte Rätsel
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                ....................
              </p>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/40 p-5">
                <p className="text-sm leading-relaxed text-zinc-400">
                  .....................
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
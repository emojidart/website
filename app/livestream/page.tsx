"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, Maximize, Settings, Radio as RadioOff, Lock, Radio, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

// Example: NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCxxxxx or NEXT_PUBLIC_STREAM_URL=https://youtube.com/embed/xxxxx
const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  (process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID
    ? `https://www.youtube.com/embed/live_stream?channel=${process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID}&autoplay=1&mute=0`
    : null)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

export default function LivestreamPage() {
  const isStreamConfigured = !!STREAM_URL

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      {/* fixed header offset */}
      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App-Header Card (wie Kontakt) */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Livestream</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Live Darts-Action aus der <span className="font-semibold">EMD Arena</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isStreamConfigured ? "Stream ist konfiguriert – viel Spaß!" : "Der Stream ist aktuell offline."}
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {isStreamConfigured ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-black text-red-700">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-[11px] font-black text-gray-700">
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-[1fr_380px] gap-4 sm:gap-6">
            {/* Main Video Area */}
            <div className="space-y-4">
              {/* Video Player */}
              <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {isStreamConfigured ? (
                    <>
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm animate-pulse"
                        >
                          <Radio className="h-3 w-3" />
                          LIVE
                        </Badge>
                      </div>

                      <iframe
                        src={STREAM_URL || undefined}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </>
                  ) : (
                    <>
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm"
                        >
                          <RadioOff className="h-3 w-3" />
                          OFFLINE
                        </Badge>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="text-center space-y-3 sm:space-y-4 px-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-slate-600/20 blur-3xl" />
                            <RadioOff className="h-16 w-16 sm:h-24 sm:w-24 text-slate-600 relative mx-auto" />
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <h3 className="text-lg sm:text-2xl font-black text-white">Stream derzeit offline</h3>
                            <p className="text-sm sm:text-base text-slate-400">
                              EMD Darts – nächster Stream wird bald angekündigt
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                              disabled
                            >
                              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <div className="w-20 sm:w-28 h-1 bg-white/30 rounded-full overflow-hidden">
                              <div className="w-0 h-full bg-white rounded-full" />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                              disabled
                            >
                              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                              disabled
                            >
                              <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Stream Info */}
              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-black mb-1">EMD Darts – Live Match Übertragung</h2>
                  <p className="text-sm text-gray-600">
                    Hier werden bald spannende Live-Matches aus der EMD Arena übertragen.
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-600">
                    {isStreamConfigured ? (
                      <>
                        <Radio className="h-4 w-4 text-orange-600" />
                        <span>Aktiver Stream</span>
                      </>
                    ) : (
                      <>
                        <RadioOff className="h-4 w-4 text-gray-500" />
                        <span>Kein aktiver Stream</span>
                      </>
                    )}
                  </div>

                  
                </div>
              </Card>
            </div>

            {/* Chat Sidebar */}
            <div className="lg:sticky lg:top-[80px] h-fit">
              <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[420px] sm:h-[520px] lg:h-[620px]">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm sm:text-base">Live Chat</h3>
                    <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-[11px] font-black text-gray-700">
                      <Lock className="h-3 w-3 mr-2" />
                      Deaktiviert
                    </span>
                  </div>
                </div>

                {/* Chat Messages - Empty/Disabled State */}
                <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-white">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-sm sm:text-base">Chat derzeit nicht verfügbar</h4>
                      <p className="text-xs sm:text-sm text-gray-600 max-w-[280px] px-4">
                        Der Live-Chat wird in Kürze aktiviert.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Input - Disabled */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex gap-2 opacity-60">
                      <input
                        disabled
                        placeholder="Chat ist deaktiviert..."
                        className="flex-1 px-3 py-2 text-sm rounded-2xl border border-gray-200 bg-white cursor-not-allowed"
                      />
                      <Button size="icon" disabled className="h-10 w-10 rounded-2xl">
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 text-center font-bold">
                      Chat-Funktion wird bald verfügbar sein
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
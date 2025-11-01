"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, Maximize, Settings, Radio as RadioOff, Lock, Radio, ArrowLeft } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useRouter } from "next/navigation"

// Example: NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCxxxxx or NEXT_PUBLIC_STREAM_URL=https://youtube.com/embed/xxxxx
const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  (process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID
    ? `https://www.youtube.com/embed/live_stream?channel=${process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID}&autoplay=1&mute=0`
    : null)

export default function LivestreamPage() {
  const router = useRouter()
  const isStreamConfigured = !!STREAM_URL

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container mx-auto px-3 sm:px-4 py-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/turnier-app")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Turniere
        </Button>

        <div className="grid lg:grid-cols-[1fr_380px] gap-4 sm:gap-6">
          {/* Main Video Area */}
          <div className="space-y-3 sm:space-y-4">
            {/* Video Player */}
            <Card className="relative aspect-video bg-black overflow-hidden">
              {isStreamConfigured ? (
                <>
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex items-center gap-2">
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm animate-pulse"
                    >
                      <Radio className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      LIVE
                    </Badge>
                  </div>

                  <iframe
                    src={STREAM_URL}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </>
              ) : (
                <>
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm"
                    >
                      <RadioOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
                        <h3 className="text-lg sm:text-2xl font-bold text-white">Stream derzeit offline</h3>
                        <p className="text-sm sm:text-base text-slate-400">
                          EMD Darts - Nächster Stream wird bald angekündigt
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                          disabled
                        >
                          <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <div className="w-16 sm:w-24 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="w-0 h-full bg-white rounded-full" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                          disabled
                        >
                          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                          disabled
                        >
                          <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Stream Info */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">EMD Darts - Live Match Übertragung</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Hier werden bald spannende Live-Matches aus der EMD Arena übertragen.
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {isStreamConfigured ? (
                    <>
                      <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Aktiver Stream</span>
                    </>
                  ) : (
                    <>
                      <RadioOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Kein aktiver Stream</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:sticky lg:top-4 h-fit">
            <Card className="flex flex-col h-[400px] sm:h-[500px] lg:h-[600px]">
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm sm:text-base">Live Chat</h3>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Deaktiviert
                  </Badge>
                </div>
              </div>

              {/* Chat Messages - Empty/Disabled State */}
              <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className="text-center space-y-2 sm:space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-3 sm:p-4">
                      <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm sm:text-base">Chat derzeit nicht verfügbar</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-[280px] px-4">
                      Der Live-Chat wird in Kürze aktiviert.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Input - Disabled */}
              <div className="p-3 sm:p-4 border-t bg-muted/30">
                <div className="space-y-2">
                  <div className="flex gap-2 opacity-50">
                    <input
                      disabled
                      placeholder="Chat ist deaktiviert..."
                      className="flex-1 px-3 py-2 text-sm rounded-md border bg-background cursor-not-allowed"
                    />
                    <Button size="icon" disabled className="h-9 w-9 sm:h-10 sm:w-10">
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                    Chat-Funktion wird bald verfügbar sein
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Target, Trophy, Play, Square, RotateCcw, Crosshair, Sparkles } from "lucide-react"
import { Header } from "@/components/header"
import { analyzeDartImage } from "@/app/actions/analyze-dart"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

interface DartHit {
  id: number
  score: number
  multiplier: string
  timestamp: Date
  position: { x: number; y: number }
}

export default function DartTrackingPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dartHits, setDartHits] = useState<DartHit[]>([])
  const [totalScore, setTotalScore] = useState(0)
  const [detectionPoints, setDetectionPoints] = useState<{ x: number; y: number }[]>([])
  const [analysisMessage, setAnalysisMessage] = useState<string>("")
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previousFrameRef = useRef<ImageData | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  // ✅ ADDED: Sobald isCameraActive true ist UND das <video> existiert, Stream anhängen
  useEffect(() => {
    if (!isCameraActive) return
    if (!videoRef.current) return
    if (!streamRef.current) return

    videoRef.current.srcObject = streamRef.current
    // Manche Browser brauchen play() explizit
    videoRef.current.play().catch(() => {})
  }, [isCameraActive])

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return false

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return false

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)

    if (!previousFrameRef.current) {
      previousFrameRef.current = currentFrame
      return false
    }

    let diffCount = 0
    const threshold = 30
    const minDiffPixels = canvas.width * canvas.height * 0.02

    for (let i = 0; i < currentFrame.data.length; i += 4) {
      const diff = Math.abs(currentFrame.data[i] - previousFrameRef.current.data[i])
      if (diff > threshold) {
        diffCount++
      }
    }

    previousFrameRef.current = currentFrame

    return diffCount > minDiffPixels
  }

  useEffect(() => {
    if (autoDetectEnabled && isCameraActive) {
      console.log("[v0] Starting automatic detection")
      let motionDetected = false
      let motionStoppedTimeout: NodeJS.Timeout | null = null

      detectionIntervalRef.current = setInterval(() => {
        const hasMotion = detectMotion()

        if (hasMotion) {
          motionDetected = true
          if (motionStoppedTimeout) {
            clearTimeout(motionStoppedTimeout)
            motionStoppedTimeout = null
          }
        } else if (motionDetected) {
          if (!motionStoppedTimeout) {
            motionStoppedTimeout = setTimeout(() => {
              console.log("[v0] Motion stopped, analyzing...")
              captureAndAnalyze()
              motionDetected = false
              motionStoppedTimeout = null
            }, 1000)
          }
        }
      }, 200)

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
        }
        if (motionStoppedTimeout) {
          clearTimeout(motionStoppedTimeout)
        }
      }
    }
  }, [autoDetectEnabled, isCameraActive, isProcessing])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false, // ✅ ADDED (harmlos, verhindert Audio-Permission Zeug)
      })

      // ✅ CHANGED: stream immer speichern + state setzen (nicht von videoRef abhängig)
      streamRef.current = stream
      previousFrameRef.current = null
      setIsCameraActive(true)
    } catch (error) {
      console.error("[v0] Error accessing camera:", error)
      alert("Kamera-Zugriff fehlgeschlagen. Bitte erlaube den Kamera-Zugriff in deinen Browser-Einstellungen.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setAutoDetectEnabled(false)
  }

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsProcessing(true)
    setAnalysisMessage("Analysiere Bild mit KI...")

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      setIsProcessing(false)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8)

    try {
      const result = await analyzeDartImage(imageDataUrl)

      console.log("[v0] Analysis result:", result)

      if (!result.success) {
        setAnalysisMessage(result.message || "Keine Dartscheibe oder Pfeil erkannt")
        setIsProcessing(false)
        setTimeout(() => setAnalysisMessage(""), 3000)
        return
      }

      const newHit: DartHit = {
        id: Date.now(),
        score: result.score,
        multiplier: result.multiplier,
        timestamp: new Date(),
        position: { x: canvas.width / 2, y: canvas.height / 2 },
      }

      setDartHits((prev) => [newHit, ...prev])
      setTotalScore((prev) => prev + result.score)
      setAnalysisMessage(
        `Erkannt: ${result.multiplier} ${result.segment} (${result.score} Punkte) - Sicherheit: ${Math.round(result.confidence * 100)}%`,
      )

      setTimeout(() => setAnalysisMessage(""), 5000)
    } catch (error) {
      console.error("[v0] Error in captureAndAnalyze:", error)
      setAnalysisMessage("Fehler bei der Analyse. Bitte versuche es erneut.")
      setTimeout(() => setAnalysisMessage(""), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetGame = () => {
    setDartHits([])
    setTotalScore(0)
    setDetectionPoints([])
  }

  const getMultiplierColor = (multiplier: string) => {
    switch (multiplier) {
      case "Bullseye":
        return "bg-red-500 text-white"
      case "Bull":
        return "bg-green-500 text-white"
      case "Triple":
        return "bg-orange-500 text-white"
      case "Double":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          <motion.div variants={itemVariants} className="text-center">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Target className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">Dartboard</span>
                <span className="block text-orange-200">Arrow Tracking</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Vollautomatische KI-Erkennung - Kamera an und fertig!
              </p>
              <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1">
                <Sparkles className="h-4 w-4 mr-1" />
                Automatische Motion Detection
              </Badge>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="overflow-hidden shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-6 w-6" />
                    Kamera-Ansicht
                    {autoDetectEnabled && (
                      <Badge className="bg-green-500 text-white ml-auto animate-pulse">Auto-Erkennung aktiv</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                    {!isCameraActive ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Camera className="h-24 w-24 mb-4 text-gray-600" />
                        <p className="text-lg mb-6">Kamera ist nicht aktiv</p>
                        <Button
                          onClick={startCamera}
                          size="lg"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Kamera starten
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* ✅ CHANGED: muted ergänzt */}
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <Crosshair
                              className={`h-16 w-16 ${autoDetectEnabled ? "text-green-500 animate-pulse" : "text-orange-500"} opacity-50`}
                            />
                          </div>
                        </div>

                        {analysisMessage && (
                          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
                            {analysisMessage}
                          </div>
                        )}

                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                          <Button
                            onClick={() => setAutoDetectEnabled(!autoDetectEnabled)}
                            size="lg"
                            className={`${autoDetectEnabled ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white shadow-lg`}
                          >
                            {autoDetectEnabled ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Auto-Erkennung läuft
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Auto-Erkennung starten
                              </>
                            )}
                          </Button>
                          {!autoDetectEnabled && (
                            <Button
                              onClick={captureAndAnalyze}
                              disabled={isProcessing}
                              size="lg"
                              className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                            >
                              {isProcessing ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Analysiert...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-5 w-5 mr-2" />
                                  Manuell erkennen
                                </>
                              )}
                            </Button>
                          )}
                          <Button onClick={stopCamera} size="lg" variant="destructive" className="shadow-lg">
                            <Square className="h-5 w-5 mr-2" />
                            Stoppen
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-lg p-4 text-center border-2 border-orange-200">
                      <div className="text-3xl font-bold text-orange-600">{dartHits.length}</div>
                      <div className="text-sm text-gray-600 font-medium">Würfe</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-200">
                      <div className="text-3xl font-bold text-green-600">{totalScore}</div>
                      <div className="text-sm text-gray-600 font-medium">Gesamt-Punkte</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden shadow-lg h-full">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-6 w-6" />
                      Wurf-Historie
                    </CardTitle>
                    {dartHits.length > 0 && (
                      <Button
                        onClick={resetGame}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {dartHits.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>Noch keine Würfe erkannt</p>
                      <p className="text-sm mt-2">Starte die Auto-Erkennung und wirf deinen ersten Pfeil!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {dartHits.map((hit, index) => (
                        <motion.div
                          key={hit.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-orange-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-orange-600">{dartHits.length - index}</span>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900">{hit.score}</div>
                                <div className="text-xs text-gray-500">{hit.timestamp.toLocaleTimeString("de-DE")}</div>
                              </div>
                            </div>
                            <Badge className={`${getMultiplierColor(hit.multiplier)} font-semibold`}>
                              {hit.multiplier}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  Wie funktioniert die automatische Erkennung?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <Camera className="h-8 w-8 text-orange-600 mx-auto" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">1. Kamera läuft</h3>
                    <p className="text-sm text-gray-600">
                      Die Kamera überwacht kontinuierlich die Dartscheibe mit Motion Detection
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <Target className="h-8 w-8 text-green-600 mx-auto" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">2. Wurf erkennen</h3>
                    <p className="text-sm text-gray-600">
                      System erkennt automatisch Bewegung wenn der Pfeil einschlägt
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-blue-600 mx-auto" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">3. KI analysiert</h3>
                    <p className="text-sm text-gray-600">
                      Nach dem Wurf analysiert die KI automatisch und berechnet den Score
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Vollautomatisch:</strong> Aktiviere die Auto-Erkennung und wirf einfach deine Pfeile. Das
                    System erkennt automatisch Bewegungen und analysiert jeden Wurf mit KI - komplett hands-free, ohne
                    Button drücken!
                  </p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Tipps für beste Ergebnisse:</strong>
                  </p>
                  <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Positioniere die Kamera stabil mit Blick auf die Dartscheibe</li>
                    <li>Sorge für gute, gleichmäßige Beleuchtung</li>
                    <li>Warte kurz nach dem Wurf bis die Analyse abgeschlossen ist</li>
                    <li>Vermeide unnötige Bewegungen im Kamerabild</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
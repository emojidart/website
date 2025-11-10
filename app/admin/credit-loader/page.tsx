"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  QrCode,
  Plus,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Wallet,
  Camera,
  History,
  CreditCard,
  Minus,
} from "lucide-react"
import { BrowserQRCodeReader } from "@zxing/browser"

interface Player {
  id: number
  name: string
  photo_url: string | null
}

interface PlayerCredit {
  player_id: number
  player_name: string
  photo_url: string | null
  credit_balance: number
}

interface Transaction {
  id: string
  player_id: string
  amount: number
  balance_after: number
  transaction_type: string
  admin_id: string
  created_at: string
  club_players: {
    name: string
    photo_url: string | null
  }
}

export default function AdminCreditLoaderPage() {
  const { session, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()

  const [activeView, setActiveView] = useState<"loader" | "history">("loader")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit")

  const [players, setPlayers] = useState<Player[]>([])
  const [playerCredits, setPlayerCredits] = useState<Map<number, number>>(new Map())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Scanner states
  const [showScanner, setShowScanner] = useState(false)
  const [scannerMessage, setScannerMessage] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (!authLoading && session && isAdmin) {
      fetchPlayers()
      fetchAllCredits()
    }
  }, [session, authLoading, isAdmin])

  useEffect(() => {
    if (activeView === "history" && session && isAdmin) {
      fetchTransactions()
    }
  }, [activeView, session, isAdmin])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("club_players")
        .select("id, name, photo_url")
        .order("name", { ascending: true })

      if (fetchError) throw fetchError
      setPlayers(data || [])
      console.log("[v0] Players fetched:", data?.length)
    } catch (err: any) {
      console.error("Error fetching players:", err)
      setError("Fehler beim Laden der Spieler: " + (err.message || "Unbekannter Fehler"))
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCredits = async () => {
    try {
      const { data, error: fetchError } = await supabase.from("player_credits").select("player_id, credit_balance")

      if (fetchError) {
        console.log("[v0] Credits fetch error:", fetchError)
        // If RLS blocks access, initialize empty map
        setPlayerCredits(new Map())
        return
      }

      const creditsMap = new Map<number, number>()
      data?.forEach((record) => {
        creditsMap.set(record.player_id, record.credit_balance)
      })
      setPlayerCredits(creditsMap)
      console.log("[v0] Credits fetched:", creditsMap.size)
    } catch (err) {
      console.error("Error fetching credits:", err)
      setPlayerCredits(new Map())
    }
  }

  const fetchTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const { data, error: fetchError } = await supabase
        .from("credit_transactions")
        .select(`
          id,
          player_id,
          amount,
          balance_after,
          transaction_type,
          admin_id,
          created_at,
          club_players (
            name,
            photo_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      setTransactions(data || [])
      console.log("[v0] Transactions fetched:", data?.length)
    } catch (err: any) {
      console.error("Error fetching transactions:", err)
      setError("Fehler beim Laden der Transaktionen: " + (err.message || "Unbekannter Fehler"))
    } finally {
      setLoadingTransactions(false)
    }
  }

  const startScanner = async () => {
    setShowScanner(true)
    setScannerMessage("Kamera wird gestartet...")
    setScanSuccess(false)

    try {
      if (!navigator.mediaDevices) {
        throw new Error("MediaDevices API nicht verfügbar")
      }

      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia nicht unterstützt")
      }

      console.log("[v0] Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      console.log("[v0] Camera access granted")
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      video.srcObject = stream
      await video.play()
      console.log("[v0] Video playing")

      setIsScanning(true)
      setScannerMessage("Bereit zum Scannen...")

      const codeReader = new BrowserQRCodeReader()

      scanIntervalRef.current = setInterval(async () => {
        try {
          const canvas = canvasRef.current
          const videoElement = videoRef.current
          if (!canvas || !videoElement || !videoElement.videoWidth) return

          const context = canvas.getContext("2d")
          if (!context) return

          canvas.width = videoElement.videoWidth
          canvas.height = videoElement.videoHeight
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

          try {
            const result = await codeReader.decodeFromCanvas(canvas)

            if (result) {
              console.log("[v0] QR Code detected:", result.getText())
              const decodedText = result.getText()
              setScannerMessage("QR-Code erkannt! Suche Spieler...")

              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
                scanIntervalRef.current = null
              }

              try {
                const { data: spielerData, error: spielerError } = await supabase
                  .from("spieldatenbank")
                  .select("id, name")
                  .eq("player_code", decodedText)
                  .single()

                if (spielerError || !spielerData) {
                  console.log("[v0] Player not found for code:", decodedText)
                  setScannerMessage("Spieler nicht gefunden!")
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 2000)
                  return
                }

                const { data: clubPlayer, error: clubError } = await supabase
                  .from("club_players")
                  .select("id, name, photo_url")
                  .eq("spieldatenbank_id", spielerData.id)
                  .single()

                if (clubError || !clubPlayer) {
                  console.log("[v0] Club player not found for spieldatenbank id:", spielerData.id)
                  setScannerMessage("Spieler-Profil nicht gefunden!")
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 2000)
                  return
                }

                console.log("[v0] Player found:", clubPlayer.name)
                setScannerMessage(`✓ ${clubPlayer.name} erkannt!`)
                setScanSuccess(true)
                setSelectedPlayer(clubPlayer)

                setTimeout(() => {
                  stopScanner()
                }, 1500)
              } catch (err) {
                console.error("[v0] Error finding player:", err)
                setScannerMessage("Fehler beim Suchen!")
                setTimeout(() => {
                  setScannerMessage("Bereit zum Scannen...")
                  startScanningLoop(codeReader)
                }, 2000)
              }
            }
          } catch (decodeError) {
            // Ignore QR decode errors (normal when no QR in frame)
          }
        } catch (err) {
          console.error("[v0] Scan loop error:", err)
        }
      }, 300)

      const startScanningLoop = (reader: BrowserQRCodeReader) => {
        if (scanIntervalRef.current) return

        scanIntervalRef.current = setInterval(async () => {
          try {
            const canvas = canvasRef.current
            const videoElement = videoRef.current
            if (!canvas || !videoElement || !videoElement.videoWidth) return

            const context = canvas.getContext("2d")
            if (!context) return

            canvas.width = videoElement.videoWidth
            canvas.height = videoElement.videoHeight
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

            try {
              const result = await reader.decodeFromCanvas(canvas)
              if (result) {
                console.log("[v0] QR detected in loop")
                // The main interval will handle this
              }
            } catch (err) {
              // Ignore decode errors
            }
          } catch (err) {
            console.error("[v0] Error in scanning loop:", err)
          }
        }, 300)
      }
    } catch (err: any) {
      console.error("[v0] Camera error:", err)
      const errorMessage = err.message || "Unbekannter Fehler"

      if (err.name === "NotAllowedError") {
        setScannerMessage(
          "Kamera-Berechtigung verweigert.\n\nBitte erlaube der App Zugriff auf deine Kamera in den Browser-Einstellungen.",
        )
      } else if (err.name === "NotFoundError") {
        setScannerMessage("Keine Kamera gefunden.\n\nBitte stelle sicher, dass ein Kamera-Gerät vorhanden ist.")
      } else if (err.name === "NotSupportedError") {
        setScannerMessage(
          "Kamera-Zugriff wird von deinem Browser nicht unterstützt.\n\nBitte verwende einen modernen Browser mit HTTPS-Verbindung.",
        )
      } else {
        setScannerMessage(`Fehler: ${errorMessage}\n\nBitte versuche es später erneut.`)
      }

      setTimeout(() => {
        setShowScanner(false)
        setScannerMessage("")
      }, 4000)
    }
  }

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setShowScanner(false)
    setScannerMessage("")
    setScanSuccess(false)
  }

  const handleAddCredit = async () => {
    if (!selectedPlayer || !creditAmount) {
      setError("Bitte Spieler und Betrag auswählen")
      return
    }

    const amount = Number.parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Ungültiger Betrag")
      return
    }

    try {
      setError(null)
      const currentCredit = playerCredits.get(selectedPlayer.id) || 0

      const adjustedAmount = transactionType === "credit" ? amount : -amount
      const newCredit = currentCredit + adjustedAmount

      if (newCredit < 0) {
        setError(`Nicht genügend Guthaben. Verfügbar: ${currentCredit.toFixed(2)}€`)
        return
      }

      const { error: upsertError } = await supabase.from("player_credits").upsert(
        {
          player_id: selectedPlayer.id,
          credit_balance: newCredit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" },
      )

      if (upsertError) throw upsertError

      const { error: transactionError } = await supabase.from("credit_transactions").insert({
        player_id: selectedPlayer.id,
        amount: adjustedAmount,
        balance_after: newCredit,
        transaction_type: transactionType === "credit" ? "credit_added" : "credit_withdrawn",
        admin_id: session?.user?.id,
      })

      if (transactionError) {
        console.error("Error creating transaction:", transactionError)
      }

      setPlayerCredits(new Map(playerCredits).set(selectedPlayer.id, newCredit))

      const actionText = transactionType === "credit" ? "hinzugefügt" : "ausgezahlt"
      setSuccessMessage(
        `✓ ${amount.toFixed(2)}€ ${actionText} für ${selectedPlayer.name}. Neuer Saldo: ${newCredit.toFixed(2)}€`,
      )
      setSuccess(true)
      setCreditAmount("")
      setSelectedPlayer(null)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error("Error adding credit:", err)
      setError("Fehler beim Verarbeiten der Transaktion")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const filteredPlayers = players.filter((player) => player.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">Sie benötigen Admin-Rechte für diese Seite.</p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-8 w-8" />
            <h1 className="text-3xl sm:text-4xl font-bold">Guthaben Manager</h1>
          </div>
          <p className="text-orange-100 max-w-2xl">Spielerguthaben aufladen und auszahlen</p>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Mitgliedskarte scannen</h3>
              <button
                onClick={stopScanner}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border-4 border-orange-500"
                style={{ minHeight: "300px", maxHeight: "400px" }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-orange-500 rounded-lg"></div>
              </div>
            </div>

            <div
              className={`text-center p-3 rounded-lg font-semibold ${
                scanSuccess ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              {scannerMessage || "Bereit zum Scannen..."}
            </div>

            <p className="text-sm text-gray-600 mt-4 text-center">Halte die Mitgliedskarte vor die Kamera</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            className="flex items-center gap-2 mb-6 border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Admin-Seite
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => setActiveView("loader")}
              variant={activeView === "loader" ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                activeView === "loader"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Transaktionen
            </Button>
            <Button
              onClick={() => setActiveView("history")}
              variant={activeView === "history" ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                activeView === "history"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
              }`}
            >
              <History className="w-4 h-4" />
              Historie
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800">{error}</h3>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-800">{successMessage}</h3>
            </div>
          </div>
        )}

        {activeView === "loader" ? (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Scanner and Player Selection */}
            <div className="md:col-span-2">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Spieler auswählen</h2>
                    <Button
                      onClick={startScanner}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg mb-4"
                    >
                      <Camera className="w-5 h-5" />
                      Mitgliedskarte scannen
                    </Button>
                  </div>

                  {selectedPlayer ? (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6 mb-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-white">
                          <AvatarImage
                            src={
                              selectedPlayer.photo_url ||
                              "/placeholder.svg?height=64&width=64&query=player avatar" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg"
                            }
                            alt={selectedPlayer.name}
                          />
                          <AvatarFallback className="bg-orange-500 text-white text-lg">
                            {selectedPlayer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <h3 className="text-xl font-bold text-gray-900">{selectedPlayer.name}</h3>
                          <p className="text-sm text-gray-600">
                            Aktuelle Guthaben: {(playerCredits.get(selectedPlayer.id) || 0).toFixed(2)}€
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPlayer(null)}
                          className="p-2 text-orange-600 hover:bg-orange-200 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        Scannen Sie eine Mitgliedskarte oder wählen Sie einen Spieler aus der Liste
                      </p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Oder nach Spieler suchen</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Spieler suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredPlayers.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                          selectedPlayer?.id === player.id
                            ? "bg-orange-100 border-orange-500"
                            : "bg-white border-gray-200 hover:border-orange-300"
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={
                              player.photo_url ||
                              "/placeholder.svg?height=40&width=40&query=player avatar" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg" ||
                              "/placeholder.svg"
                            }
                            alt={player.name}
                          />
                          <AvatarFallback className="bg-orange-500 text-white text-sm">
                            {player.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <p className="font-medium text-gray-900">{player.name}</p>
                          <p className="text-xs text-gray-500">{(playerCredits.get(player.id) || 0).toFixed(2)}€</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit Loader Form */}
            <div>
              <Card className="shadow-lg sticky top-6">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaktion durchführen</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Transaktionstyp</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setTransactionType("credit")}
                          className={`py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                            transactionType === "credit"
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          Aufladen
                        </button>
                        <button
                          onClick={() => setTransactionType("debit")}
                          className={`py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                            transactionType === "debit"
                              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Minus className="w-4 h-4" />
                          Auszahlen
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Betrag (€)</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="z.B. 20.00"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="flex-grow"
                        />
                        <span className="text-lg font-bold text-gray-600">€</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[5, 10, 20, 50].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCreditAmount(amount.toString())}
                          className={`py-2 px-3 font-semibold rounded-lg transition-colors border ${
                            transactionType === "credit"
                              ? "bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                              : "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                          }`}
                        >
                          {transactionType === "credit" ? "+" : "-"}
                          {amount}€
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={handleAddCredit}
                      disabled={!selectedPlayer || !creditAmount}
                      className={`w-full font-bold py-3 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                        transactionType === "credit"
                          ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      } text-white`}
                    >
                      {transactionType === "credit" ? (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Guthaben aufladen
                        </>
                      ) : (
                        <>
                          <Minus className="w-4 h-4 mr-2" />
                          Guthaben auszahlen
                        </>
                      )}
                    </Button>
                  </div>

                  {selectedPlayer && (
                    <div className="mt-6 pt-6 border-t-2 border-gray-200">
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">Ausgewählter Spieler</p>
                        <p className="font-bold text-gray-900">{selectedPlayer.name}</p>
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <p className="text-xs text-gray-600">Aktuelles Guthaben</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {(playerCredits.get(selectedPlayer.id) || 0).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Transaktions-Historie</h2>
                <Button
                  onClick={fetchTransactions}
                  variant="outline"
                  className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 bg-transparent"
                >
                  Aktualisieren
                </Button>
              </div>

              {loadingTransactions ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">Keine Transaktionen vorhanden</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Transaktionen werden hier angezeigt, sobald Guthaben aufgeladen wurde.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Spieler</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Betrag</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Saldo danach</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage
                                  src={
                                    transaction.club_players?.photo_url ||
                                    "/placeholder.svg?height=40&width=40&query=player avatar" ||
                                    "/placeholder.svg" ||
                                    "/placeholder.svg"
                                  }
                                  alt={transaction.club_players?.name}
                                />
                                <AvatarFallback className="bg-orange-500 text-white text-sm">
                                  {transaction.club_players?.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-900">{transaction.club_players?.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                transaction.amount >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {transaction.amount >= 0 ? "+" : ""}
                              {transaction.amount.toFixed(2)}€
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-gray-900">{transaction.balance_after.toFixed(2)}€</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{formatDate(transaction.created_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

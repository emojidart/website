"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import {
  Search,
  UserPlus,
  X,
  Play,
  Trophy,
  ArrowLeft,
  Euro,
  AlertCircle,
  ArrowRight,
  Star,
  Camera,
  Lock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BrowserQRCodeReader } from "@zxing/browser"

interface Player {
  id: number
  name: string
}

interface PlayerWithFrequency extends Player {
  playCount: number
  lastPlayed: string | null
}

interface RegisteredPlayer {
  id: number
  player_id: string
  player_name: string
  registered_at: string
  paid: boolean
  entry_fee: number
  deducted_from_credit?: boolean
}

export default function DKOTournamentRegistration() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [frequentPlayers, setFrequentPlayers] = useState<PlayerWithFrequency[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [tournamentName, setTournamentName] = useState("")
  const [tournamentEntryFee, setTournamentEntryFee] = useState("")
  const [showPaymentWarning, setShowPaymentWarning] = useState(false)
  const [showNameWarning, setShowNameWarning] = useState(false)
  const [playerViewMode, setPlayerViewMode] = useState<"frequent" | "all">("frequent")
  const [activeTournament, setActiveTournament] = useState<{
    tournamentId: string
    tournamentName: string
    tournamentType: string
    incompleteMatches: number
  } | null>(null)
  const [showCancelActiveTournamentDialog, setShowCancelActiveTournamentDialog] = useState(false)
  const router = useRouter()

  const [showScanner, setShowScanner] = useState(false)
  const [scannerMessage, setScannerMessage] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [tournamentFormCompleted, setTournamentFormCompleted] = useState(false)

  const [showCreditErrorModal, setShowCreditErrorModal] = useState<{
    open: boolean
    playerName?: string
    message?: string
  }>({ open: false })
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState<{
    open: boolean
    playerName?: string
    required?: number
    available?: number
  }>({ open: false })
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState<{ open: boolean; playerName?: string }>({
    open: false,
  })
  const [showSuccessModal, setShowSuccessModal] = useState<{ open: boolean; playerCount?: number }>({ open: false })
  const [showErrorModal, setShowErrorModal] = useState<{ open: boolean }>({ open: false })

  const [showCreditConfirmModal, setShowCreditConfirmModal] = useState<{
    open: boolean
    players?: Array<{ id: number; name: string; currentBalance: number; newBalance: number; clubPlayerId: string }>
    playersWithoutCredit?: number[]
    entryFee?: number
  }>({ open: false })

  const [scannedPlayerForConfirm, setScannedPlayerForConfirm] = useState<{
    id: number
    name: string
    clubPlayerId: string
    currentBalance: number
    entryFee: number
  } | null>(null)

  const [showPaidLockModal, setShowPaidLockModal] = useState<{ open: boolean; playerName?: string }>({ open: false })

  const [showPlayersWithoutAccountModal, setShowPlayersWithoutAccountModal] = useState<{
    open: boolean
    players?: Array<{ id: number; name: string }>
  }>({ open: false })

  const handleScannedPlayerConfirm = async (shouldDeduct: boolean) => {
    if (!scannedPlayerForConfirm) return

    try {
      const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
        player_id: scannedPlayerForConfirm.clubPlayerId,
        player_name: scannedPlayerForConfirm.name,
        paid: shouldDeduct,
        entry_fee: scannedPlayerForConfirm.entryFee,
        deducted_from_credit: shouldDeduct,
      })

      if (registerError) {
        if (registerError.message.includes("duplicate")) {
          setShowAlreadyRegisteredModal({
            open: true,
            playerName: scannedPlayerForConfirm.name,
          })
        } else {
          throw registerError
        }
        setScannedPlayerForConfirm(null)
        return
      }

      if (shouldDeduct) {
        const newBalance = scannedPlayerForConfirm.currentBalance - scannedPlayerForConfirm.entryFee
        const { error: updateError } = await supabase
          .from("player_credits")
          .update({
            credit_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("player_id", scannedPlayerForConfirm.clubPlayerId)

        if (updateError) {
          throw updateError
        }

        await supabase.from("credit_transactions").insert({
          player_id: scannedPlayerForConfirm.clubPlayerId,
          amount: -scannedPlayerForConfirm.entryFee,
          balance_after: newBalance,
          transaction_type: "tournament_entry_fee",
          admin_id: user?.id,
        })
      }

      setScannerMessage(`✓ ${scannedPlayerForConfirm.name} erfolgreich registriert!`)
      setScanSuccess(true)
      setScannedPlayerForConfirm(null)

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()

      setTimeout(() => {
        setScannerMessage("Bereit zum Scannen...")
        setScanSuccess(false)
        setShowScanner(true)
        startScanner()
      }, 2000)
    } catch (error) {
      console.error("[v0] Error confirming scanned player:", error)
      setScannerMessage("Fehler beim Registrieren!")
      setTimeout(() => {
        setScannerMessage("Bereit zum Scannen...")
        setScannedPlayerForConfirm(null)
        setShowScanner(true)
        startScanner()
      }, 2000)
    }
  }

  const handleRegisterPlayers = async () => {
    if (!tournamentFormCompleted) {
      alert("Bitte gib zuerst den Turniernamen und das Startgeld ein!")
      return
    }

    if (selectedPlayers.size === 0) return

    try {
      const entryFee = Number.parseFloat(tournamentEntryFee) || 0

      const playersWithCredit: Array<{
        id: number
        name: string
        currentBalance: number
        newBalance: number
        clubPlayerId: string
      }> = []
      const playersWithoutCredit: number[] = []

      for (const playerId of selectedPlayers) {
        const player = availablePlayers.find((p) => p.id === playerId)
        if (!player) continue

        if (entryFee > 0) {
          let clubPlayerId: string | null = null
          let creditData: { credit_balance: number } | null = null

          const { data: clubPlayer, error: clubError } = await supabase
            .from("club_players")
            .select("id")
            .eq("spieldatenbank_id", player.id)
            .maybeSingle()

          if (!clubError && clubPlayer) {
            clubPlayerId = clubPlayer.id

            const { data: creditDataFromClub, error: creditError } = await supabase
              .from("player_credits")
              .select("credit_balance")
              .eq("player_id", clubPlayerId)
              .maybeSingle()

            if (!creditError && creditDataFromClub) {
              creditData = creditDataFromClub
            }
          }

          if (creditData && clubPlayerId) {
            const currentCredit = creditData.credit_balance

            if (currentCredit < entryFee) {
              setShowInsufficientBalanceModal({
                open: true,
                playerName: player.name,
                required: entryFee,
                available: currentCredit,
              })
              return
            }

            playersWithCredit.push({
              id: player.id,
              name: player.name,
              currentBalance: currentCredit,
              newBalance: currentCredit - entryFee,
              clubPlayerId: clubPlayerId,
            })
          } else {
            playersWithoutCredit.push(playerId)
          }
        } else {
          playersWithoutCredit.push(playerId)
        }
      }

      if (playersWithCredit.length > 0) {
        setShowCreditConfirmModal({
          open: true,
          players: playersWithCredit,
          playersWithoutCredit,
          entryFee,
        })
      } else if (playersWithoutCredit.length > 0) {
        await registerPlayersDirectly(playersWithoutCredit, entryFee)
      } else {
        setShowErrorModal({ open: true })
      }
    } catch (error) {
      console.error("[v0] Error in handleRegisterPlayers:", error)
      setShowErrorModal({ open: true })
    }
  }

  const registerPlayersDirectly = async (playerIds: number[], entryFee: number) => {
    try {
      const successfullyRegistered: number[] = []
      const playersWithoutAccount: Array<{ id: number; name: string }> = []

      for (const playerId of playerIds) {
        const player = availablePlayers.find((p) => p.id === playerId)
        if (!player) continue

        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("id")
          .eq("spieldatenbank_id", playerId)
          .maybeSingle()

        const playerUUID = clubPlayer?.id || null

        if (!playerUUID) {
          playersWithoutAccount.push({ id: playerId, name: player.name })
          continue
        }

        const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
          player_id: playerUUID,
          player_name: player.name,
          paid: false,
          entry_fee: entryFee,
        })

        if (registerError) {
          if (registerError.message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: player.name,
            })
          } else {
            throw registerError
          }
          return
        }

        successfullyRegistered.push(playerId)
      }

      if (playersWithoutAccount.length > 0) {
        setShowPlayersWithoutAccountModal({
          open: true,
          players: playersWithoutAccount,
        })
      }

      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()
      setSelectedPlayers(new Set())

      if (successfullyRegistered.length > 0) {
        setShowSuccessModal({ open: true, playerCount: successfullyRegistered.length })
      }
    } catch (error) {
      console.error("[v0] Error in registerPlayersDirectly:", error)
      setShowErrorModal({ open: true })
    }
  }

  const registerPlayersWithoutCreditDeduction = async () => {
    try {
      const entryFee = showCreditConfirmModal.entryFee || 0
      const playersWithoutCredit = showCreditConfirmModal.playersWithoutCredit || []

      if (!playersWithoutCredit || playersWithoutCredit.length === 0) {
        setShowCreditConfirmModal({ open: false })
        return
      }

      setShowCreditConfirmModal({ open: false })

      await registerPlayersDirectly(playersWithoutCredit, entryFee)
    } catch (error) {
      console.error("[v0] Error in registerPlayersWithoutCreditDeduction:", error)
      setShowErrorModal({ open: true })
    }
  }

  const registerPlayersWithCreditDeduction = async () => {
    try {
      const entryFee = showCreditConfirmModal.entryFee || 0
      const playersWithCredit = showCreditConfirmModal.players || []
      const playersWithoutCredit = showCreditConfirmModal.playersWithoutCredit || []

      setShowCreditConfirmModal({ open: false })

      for (const playerWithCredit of playersWithCredit) {
        const player = availablePlayers.find((p) => p.id === playerWithCredit.id)
        if (!player) continue

        const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
          player_id: playerWithCredit.clubPlayerId,
          player_name: player.name,
          paid: true,
          entry_fee: entryFee,
          deducted_from_credit: true,
        })

        if (registerError) {
          if (registerError.message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: playerWithCredit.name,
            })
          } else {
            throw registerError
          }
          return
        }

        const { error: updateError } = await supabase
          .from("player_credits")
          .update({
            credit_balance: playerWithCredit.newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("player_id", playerWithCredit.clubPlayerId)

        if (updateError) {
          throw updateError
        }

        await supabase.from("credit_transactions").insert({
          player_id: playerWithCredit.clubPlayerId,
          amount: -entryFee,
          balance_after: playerWithCredit.newBalance,
          transaction_type: "tournament_entry_fee",
          admin_id: user?.id,
        })
      }

      for (const playerId of playersWithoutCredit) {
        const player = availablePlayers.find((p) => p.id === playerId)
        if (!player) continue

        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("id")
          .eq("spieldatenbank_id", playerId)
          .maybeSingle()

        const playerUUID = clubPlayer?.id || null

        if (!playerUUID) {
          continue
        }

        const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
          player_id: playerUUID,
          player_name: player.name,
          paid: false,
          entry_fee: entryFee,
        })

        if (registerError) {
          if (registerError.message.includes("duplicate")) {
            setShowAlreadyRegisteredModal({
              open: true,
              playerName: player.name,
            })
          } else {
            throw registerError
          }
          return
        }
      }

      const totalRegistered = playersWithCredit.length + playersWithoutCredit.length
      await fetchRegisteredPlayers()
      await fetchFrequentPlayers()
      setSelectedPlayers(new Set())
      setShowSuccessModal({ open: true, playerCount: totalRegistered })
    } catch (error) {
      console.error("[v0] Error in registerPlayersWithCreditDeduction:", error)
      setShowErrorModal({ open: true })
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase.from("spieldatenbank").select("id, name").order("name")

      if (error) throw error
      setAvailablePlayers(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("dko_tournament_registration")
        .select("*")
        .order("registered_at", { ascending: false })

      if (error) throw error
      setRegisteredPlayers(data || [])
    } catch (error) {
      console.error("Fehler beim Laden der registrierten Spieler:", error)
    }
  }

  const fetchFrequentPlayers = async () => {
    try {
      const { data: frequentPlayersData, error } = await supabase
        .from("tournament_series_aggregated")
        .select("player_name, tournaments_played")
        .order("tournaments_played", { ascending: false })
        .limit(100)

      if (error) throw error

      if (!frequentPlayersData || frequentPlayersData.length === 0) {
        setFrequentPlayers([])
        return
      }

      const { data: allPlayers, error: playersError } = await supabase.from("spieldatenbank").select("id, name")

      if (playersError) throw playersError

      const frequentPlayersArray: PlayerWithFrequency[] = frequentPlayersData
        .map((fp) => {
          const player = allPlayers?.find((p) => p.name === fp.player_name)
          if (!player) return null
          return {
            id: player.id,
            name: fp.player_name,
            playCount: fp.tournaments_played,
            lastPlayed: null,
          }
        })
        .filter((p): p is PlayerWithFrequency => p !== null)

      setFrequentPlayers(frequentPlayersArray)
    } catch (error) {
      console.error("Fehler beim Laden der häufig gespielten Spieler:", error)
      setFrequentPlayers([])
    }
  }

  useEffect(() => {
    fetchPlayers()
    fetchRegisteredPlayers()
    checkForActiveTournament()
    fetchFrequentPlayers()
  }, [])

  useEffect(() => {
    const isCompleted = tournamentName.trim() !== "" && tournamentEntryFee.trim() !== ""
    setTournamentFormCompleted(isCompleted)
  }, [tournamentName, tournamentEntryFee])

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

  const handlePlayerSelect = (playerId: number) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
      setSearchTerm("")
    }
    setSelectedPlayers(newSelected)
  }

  const handleUnregisterPlayer = async (registrationId: number) => {
    try {
      const playerToUnregister = registeredPlayers.find((p) => p.id === registrationId)

      if (!playerToUnregister) return

      if (playerToUnregister.deducted_from_credit && playerToUnregister.player_id) {
        const { data: currentCredit, error: fetchError } = await supabase
          .from("player_credits")
          .select("credit_balance")
          .eq("player_id", playerToUnregister.player_id)
          .maybeSingle()

        if (!fetchError && currentCredit) {
          const newBalance = currentCredit.credit_balance + playerToUnregister.entry_fee

          const { error: updateError } = await supabase
            .from("player_credits")
            .update({
              credit_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("player_id", playerToUnregister.player_id)

          if (!updateError) {
            await supabase.from("credit_transactions").insert({
              player_id: playerToUnregister.player_id,
              amount: playerToUnregister.entry_fee,
              balance_after: newBalance,
              transaction_type: "tournament_refund",
              admin_id: user?.id,
            })
          }
        }
      }

      const { error } = await supabase.from("dko_tournament_registration").delete().eq("id", registrationId)

      if (error) throw error
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Entfernen der Registrierung:", error)
    }
  }

  const togglePaymentStatus = async (registrationId: number, currentStatus: boolean) => {
    try {
      const playerToToggle = registeredPlayers.find((p) => p.id === registrationId)

      if (playerToToggle?.deducted_from_credit && currentStatus === true) {
        setShowPaidLockModal({ open: true, playerName: playerToToggle.player_name })
        return
      }

      const { error } = await supabase
        .from("dko_tournament_registration")
        .update({ paid: !currentStatus })
        .eq("id", registrationId)

      if (error) throw error

      setRegisteredPlayers((prevPlayers) =>
        prevPlayers.map((player) => (player.id === registrationId ? { ...player, paid: !currentStatus } : player)),
      )
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Bezahlstatus:", error)
    }
  }

  const checkForActiveTournament = async () => {
    try {
      const { data: activeTournament, error } = await supabase
        .from("tournaments_status")
        .select("tournament_id, tournament_type, tournament_name")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!activeTournament) {
        setActiveTournament(null)
        return
      }

      setActiveTournament({
        tournamentId: activeTournament.tournament_id,
        tournamentName: activeTournament.tournament_name,
        tournamentType: activeTournament.tournament_type,
        incompleteMatches: 0,
      })
    } catch (error) {
      console.error("Fehler beim Prüfen auf aktives Turnier:", error)
      setActiveTournament(null)
    }
  }

  const handleCancelActiveTournament = async () => {
    if (!activeTournament) return

    try {
      const { error: statusError } = await supabase
        .from("tournaments_status")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("tournament_id", activeTournament.tournamentId)

      if (statusError) throw statusError

      const { error: registrationError } = await supabase.from("dko_tournament_registration").delete().neq("id", 0)

      if (registrationError) throw registrationError

      setActiveTournament(null)
      setShowCancelActiveTournamentDialog(false)
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Abbrechen des aktiven Turniers:", error)
      alert("Fehler beim Abbrechen des Turniers. Bitte versuche es erneut.")
    }
  }

  const handleContinueTournament = () => {
    if (!activeTournament) return

    const { tournamentType, tournamentId, tournamentName } = activeTournament
    const encodedName = encodeURIComponent(tournamentName)

    const routeMap: Record<string, string> = {
      "8er_dko": "/8erdko",
      "16er_dko": "/16erdko",
      "32er_dko": "/32erdko",
      "64er_dko": "/64erdko",
    }

    const route = routeMap[tournamentType] || "/16erdko"
    router.push(`${route}?tournamentId=${tournamentId}&tournamentName=${encodedName}`)
  }

  const startScanner = async () => {
    if (!tournamentFormCompleted) {
      alert("Bitte gib zuerst den Turniernamen und das Startgeld ein, bevor du Spieler scannst!")
      return
    }

    setShowScanner(true)
    setScannerMessage("Kamera wird gestartet...")
    setScanSuccess(false)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerMessage(
          "Kamera-Zugriff nicht verfügbar! Bitte stelle sicher, dass:\n• Die Seite über HTTPS läuft\n• Dein Browser Kamera-Zugriff unterstützt\n• Du die Kamera-Berechtigung erteilt hast",
        )
        setTimeout(() => {
          setShowScanner(false)
          setScannerMessage("")
        }, 5000)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      video.srcObject = stream
      await video.play()

      setIsScanning(true)
      setScannerMessage("Bereit zum Scannen...")

      const codeReader = new BrowserQRCodeReader()

      scanIntervalRef.current = setInterval(async () => {
        try {
          const canvas = canvasRef.current
          if (!canvas || !video) return

          const context = canvas.getContext("2d")
          if (!context) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          const result = await codeReader.decodeFromCanvas(canvas)

          if (result) {
            const decodedText = result.getText()
            setScannerMessage("QR-Code erkannt! Suche Spieler...")

            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }

            try {
              const { data: player, error: playerError } = await supabase
                .from("spieldatenbank")
                .select("id, name")
                .eq("player_code", decodedText)
                .single()

              if (playerError || !player) {
                setScannerMessage("Spieler nicht gefunden!")
                setTimeout(() => {
                  setScannerMessage("Bereit zum Scannen...")
                  startScanningLoop(codeReader)
                }, 2000)
                return
              }

              const alreadyRegistered = registeredPlayers.some((rp) => rp.player_id === player.id)
              if (alreadyRegistered) {
                setScannerMessage(`${player.name} ist bereits registriert!`)
                setTimeout(() => {
                  setScannerMessage("Bereit zum Scannen...")
                  startScanningLoop(codeReader)
                }, 2000)
                return
              }

              const entryFee = Number.parseFloat(tournamentEntryFee) || 0

              if (entryFee > 0) {
                const { data: clubPlayer, error: clubError } = await supabase
                  .from("club_players")
                  .select("id")
                  .eq("spieldatenbank_id", player.id)
                  .maybeSingle()

                if (clubError || !clubPlayer) {
                  setScannerMessage("⚠️ Spieler hat kein Guthaben-Konto!")
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 2000)
                  return
                }

                const { data: creditData, error: creditError } = await supabase
                  .from("player_credits")
                  .select("credit_balance")
                  .eq("player_id", clubPlayer.id)
                  .maybeSingle()

                if (creditError || !creditData) {
                  setScannerMessage("⚠️ Spieler hat kein Guthaben-Konto!")
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 2000)
                  return
                }

                const currentCredit = creditData.credit_balance

                if (currentCredit < entryFee) {
                  setScannerMessage(
                    `⚠️ ${player.name}: Zu wenig Guthaben!\nBenötigt: ${entryFee.toFixed(2)}€\nVerfügbar: ${currentCredit.toFixed(2)}€`,
                  )
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 3000)
                  return
                }

                setScannedPlayerForConfirm({
                  id: player.id,
                  name: player.name,
                  clubPlayerId: clubPlayer.id,
                  currentBalance: currentCredit,
                  entryFee: entryFee,
                })
                stopScanner()
                return
              } else {
                const { data: clubPlayer } = await supabase
                  .from("club_players")
                  .select("id")
                  .eq("spieldatenbank_id", player.id)
                  .maybeSingle()

                const playerUUID = clubPlayer?.id || null

                if (!playerUUID) {
                  setScannerMessage("⚠️ Spieler hat kein Guthaben-Konto!")
                  setTimeout(() => {
                    setScannerMessage("Bereit zum Scannen...")
                    startScanningLoop(codeReader)
                  }, 2000)
                  return
                }

                const { error: insertError } = await supabase.from("dko_tournament_registration").insert({
                  player_id: playerUUID,
                  player_name: player.name,
                  paid: false,
                  entry_fee: entryFee,
                })

                if (insertError) throw insertError

                setScannerMessage(`✓ ${player.name} erfolgreich registriert!`)
                setScanSuccess(true)
                await fetchRegisteredPlayers()
                await fetchFrequentPlayers()

                setTimeout(() => {
                  setScannerMessage("Bereit zum Scannen...")
                  setScanSuccess(false)
                  startScanningLoop(codeReader)
                }, 2000)
              }
            } catch (error) {
              console.error("[v0] Error registering player:", error)
              setScannerMessage("Fehler beim Registrieren!")
              setTimeout(() => {
                setScannerMessage("Bereit zum Scannen...")
                startScanningLoop(codeReader)
              }, 2000)
            }
          }
        } catch (error) {
          // Ignore decode errors
        }
      }, 300)

      const startScanningLoop = (reader: BrowserQRCodeReader) => {
        if (scanIntervalRef.current) return

        scanIntervalRef.current = setInterval(async () => {
          try {
            const canvas = canvasRef.current
            const video = videoRef.current
            if (!canvas || !video) return

            const context = canvas.getContext("2d")
            if (!context) return

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            const result = await reader.decodeFromCanvas(canvas)
            if (result) {
              console.log("[v0] QR Code detected in loop:", result.getText())
            }
          } catch (error) {
            // Ignore
          }
        }, 300)
      }
    } catch (error) {
      console.error("[v0] Camera error:", error)
      setScannerMessage("Kamera konnte nicht gestartet werden! Bitte Berechtigungen prüfen.")
      setTimeout(() => {
        setShowScanner(false)
        setScannerMessage("")
      }, 3000)
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

  const allPlayersPaid = registeredPlayers.every((player) => player.paid)
  const paidCount = registeredPlayers.filter((player) => player.paid).length
  const unpaidPlayers = registeredPlayers.filter((player) => !player.paid)

  const getTournamentSize = (playerCount: number): number => {
    if (playerCount <= 8) return 8
    if (playerCount <= 16) return 16
    if (playerCount <= 32) return 32
    return 64
  }

  const tournamentSize = getTournamentSize(registeredPlayers.length)

  const handleStartTournament = () => {
    if (registeredPlayers.length === 0) {
      alert("Bitte registriere mindestens einen Spieler!")
      return
    }

    if (!tournamentName.trim()) {
      setShowNameWarning(true)
      return
    }

    if (!allPlayersPaid) {
      setShowPaymentWarning(true)
      return
    }

    const encodedName = encodeURIComponent(tournamentName.trim())

    if (tournamentSize === 16) {
      router.push(`/16erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 8) {
      router.push(`/8erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 32) {
      router.push(`/32erdko?shuffle=true&tournamentName=${encodedName}`)
    } else if (tournamentSize === 64) {
      router.push(`/64erdko?shuffle=true&tournamentName=${encodedName}`)
    }
  }

  const filteredPlayers = availablePlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !registeredPlayers.some((rp) => rp.player_id === player.id),
  )

  const availableFrequentPlayers = frequentPlayers.filter(
    (player) => !registeredPlayers.some((rp) => rp.player_id === player.id),
  )

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardContent className="text-center">
              <p className="text-gray-700">Lade...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-700">
                Sie benötigen Admin-Rechte, um auf die DKO Turnier Registrierung zuzugreifen.
              </p>
              <Button onClick={() => router.push("/admin")} className="w-full">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">DKO TURNIER REGISTRIERUNG</h1>
        </div>
      </div>

      {/* Credit Error Modal */}
      {showCreditErrorModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4 mx-auto">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Fehler beim Guthaben-Check</h3>
            <p className="text-center text-gray-600 mb-2">{showCreditErrorModal.playerName}</p>
            <p className="text-center text-gray-500 mb-6">{showCreditErrorModal.message}</p>
            <Button
              onClick={() => setShowCreditErrorModal({ open: false })}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {showInsufficientBalanceModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4 mx-auto">
              <AlertCircle className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-1">Nicht genug Guthaben</h3>
            <p className="text-center text-gray-600 font-semibold mb-6">{showInsufficientBalanceModal.playerName}</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 rounded-lg p-4 text-center border-2 border-red-100">
                <p className="text-xs text-red-600 font-semibold mb-1">Benötigt</p>
                <p className="text-2xl font-bold text-red-600">{showInsufficientBalanceModal.required?.toFixed(2)}€</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center border-2 border-orange-100">
                <p className="text-xs text-orange-600 font-semibold mb-1">Verfügbar</p>
                <p className="text-2xl font-bold text-orange-600">
                  {showInsufficientBalanceModal.available?.toFixed(2)}€
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowInsufficientBalanceModal({ open: false })}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {/* Already Registered Modal */}
      {showAlreadyRegisteredModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <UserPlus className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Bereits registriert</h3>
            <p className="text-center text-gray-600 font-semibold mb-2">{showAlreadyRegisteredModal.playerName}</p>
            <p className="text-center text-gray-500 mb-6">Dieser Spieler ist bereits für das Turnier registriert.</p>
            <Button
              onClick={() => setShowAlreadyRegisteredModal({ open: false })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4 mx-auto animate-bounce">
              <Star className="w-7 h-7 text-green-600 fill-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Erfolg!</h3>
            <p className="text-center text-gray-600 mb-6">
              {showSuccessModal.playerCount} Spieler wurden erfolgreich registriert.
            </p>
            <Button
              onClick={() => setShowSuccessModal({ open: false })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
            >
              Fertig
            </Button>
          </div>
        </div>
      )}

      {/* General Error Modal */}
      {showErrorModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4 mx-auto">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Fehler</h3>
            <p className="text-center text-gray-600 mb-6">
              Ein Fehler ist aufgetreten. Der Spieler könnte bereits registriert sein.
            </p>
            <Button
              onClick={() => setShowErrorModal({ open: false })}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {/* Players Without Account Modal - NEW FIX */}
      {showPlayersWithoutAccountModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4 mx-auto">
              <AlertCircle className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Spieler nicht registriert</h3>
            <p className="text-center text-gray-600 mb-4">
              {showPlayersWithoutAccountModal.players?.length || 0} Spieler konnten nicht registriert werden:
            </p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {showPlayersWithoutAccountModal.players?.map((player) => (
                  <li key={player.id} className="text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Diese Spieler haben kein Guthaben-Konto. Bitte erstelle zunächst für diese Spieler ein Guthaben-Konto.
            </p>
            <Button
              onClick={() => setShowPlayersWithoutAccountModal({ open: false })}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

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

            <p className="text-sm text-gray-600 mt-4 text-center">
              Halte die Mitgliedskarte vor die Kamera, um den QR-Code zu scannen
            </p>
          </div>
        </div>
      )}

      {showNameWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Turniername fehlt</h3>
            </div>
            <p className="text-gray-600 mb-6">Bitte gib einen Turniernamen ein, bevor du das Turnier startest.</p>
            <Button onClick={() => setShowNameWarning(false)} className="w-full bg-orange-500 hover:bg-orange-600">
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {showPaymentWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Nicht alle Spieler haben bezahlt</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Das Turnier kann erst gestartet werden, wenn alle Spieler ihre Teilnahmegebühr bezahlt haben.
            </p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900 mb-2">Noch nicht bezahlt:</p>
              <ul className="space-y-1">
                {unpaidPlayers.map((player) => (
                  <li key={player.id} className="text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    {player.player_name}
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={() => setShowPaymentWarning(false)} className="w-full bg-orange-500 hover:bg-orange-600">
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {showCancelActiveTournamentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Turnier wirklich abbrechen?</h3>
            </div>
            <p className="text-gray-600 mb-4">Alle Daten des aktiven Turniers werden gelöscht:</p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
              <li>Match-Stati und Ergebnisse</li>
              <li>Freilose</li>
              <li>Ranglisten-Einträge</li>
              <li>Spieler-Registrierungen</li>
            </ul>
            <p className="text-sm text-red-600 font-semibold mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowCancelActiveTournamentDialog(false)} variant="outline" className="flex-1">
                Nein, zurück
              </Button>
              <Button onClick={handleCancelActiveTournament} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Ja, abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTournament && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aktives Turnier gefunden!</h3>
                <p className="text-gray-700 mb-1">Es gibt ein laufendes Turnier.</p>
                <p className="text-sm text-gray-600">Möchtest du zum Turnier zurückkehren oder es abbrechen?</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleContinueTournament}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <ArrowRight className="w-4 h-4" />
                Zum Turnier zurückkehren
              </Button>
              <Button
                onClick={() => setShowCancelActiveTournamentDialog(true)}
                variant="outline"
                className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold"
              >
                <X className="w-4 h-4 mr-2" />
                Turnier abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            className="flex items-center gap-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Admin-Seite
          </Button>
        </div>

        <div className="mb-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-white rounded-lg p-6 shadow-lg">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-bold text-gray-900">Turniername</h3>
                <span className="text-red-500 font-bold">*</span>
              </div>
              <input
                type="text"
                placeholder="z.B. Herbst Turnier 2025, Lion Cup, ..."
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-white rounded-lg focus:border-orange-500 focus:outline-none text-lg font-medium bg-white shadow-md"
                maxLength={100}
              />
              <p className="text-sm text-gray-600 mt-2">Pflichtfeld!</p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Euro className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-bold text-gray-900">Startgeld</h3>
                <span className="text-red-500 font-bold">*</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="z.B. 10.00"
                  value={tournamentEntryFee}
                  onChange={(e) => setTournamentEntryFee(e.target.value)}
                  className="flex-grow px-4 py-3 border-2 border-white rounded-lg focus:border-orange-500 focus:outline-none text-lg font-medium bg-white shadow-md"
                />
                <span className="text-lg font-bold text-gray-600">€</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Pflichtfeld!</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border-2 border-orange-200">
            {tournamentFormCompleted ? (
              <p className="text-green-600 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>✓ Formular vollständig - Du kannst jetzt
                Spieler registrieren
              </p>
            ) : (
              <p className="text-orange-600 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Bitte fülle beide Felder aus, um Spieler zu registrieren
              </p>
            )}
          </div>
        </div>

        {registeredPlayers.length > 0 && (
          <div className="mb-8 bg-orange-50 border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Turnier bereit zum Starten</h3>
                <p className="text-gray-600">
                  {registeredPlayers.length} Spieler registriert → {tournamentSize}er DKO Turnier
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Euro className="w-5 h-5 text-orange-600" />
                  <span className={`font-semibold ${allPlayersPaid ? "text-green-600" : "text-orange-600"}`}>
                    {paidCount} von {registeredPlayers.length} bezahlt
                  </span>
                </div>
              </div>
              <button
                onClick={handleStartTournament}
                disabled={!allPlayersPaid}
                className={`flex items-center gap-2 font-bold py-3 px-6 rounded-lg transition-colors ${
                  allPlayersPaid
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Play className="w-5 h-5" />
                Turnier starten
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Verfügbare Spieler</h2>
              <span className="text-sm text-gray-500">
                {playerViewMode === "frequent" ? availableFrequentPlayers.length : filteredPlayers.length} Spieler
              </span>
            </div>

            <button
              onClick={startScanner}
              disabled={!tournamentFormCompleted}
              className={`w-full mb-4 font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                tournamentFormCompleted
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Camera className="w-5 h-5" />
              Mitgliedskarte scannen
            </button>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPlayerViewMode("frequent")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  playerViewMode === "frequent"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-4 h-4" />
                  Häufig verwendet
                </div>
              </button>
              <button
                onClick={() => setPlayerViewMode("all")}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  playerViewMode === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Alle Spieler
              </button>
            </div>

            {playerViewMode === "all" && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-white rounded-lg focus:border-orange-500 focus:outline-none bg-white shadow-md"
                />
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {loading ? (
                <p className="text-center text-gray-500 py-8">Lade Spieler...</p>
              ) : playerViewMode === "frequent" ? (
                availableFrequentPlayers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Keine häufig verwendeten Spieler gefunden</p>
                ) : (
                  availableFrequentPlayers.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg hover:border-orange-400 cursor-pointer transition-colors shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => handlePlayerSelect(player.id)}
                        className="w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 shadow-sm"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">{player.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-orange-600 font-medium">{player.playCount}x gespielt</span>
                        </div>
                      </div>
                      <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </label>
                  ))
                )
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Spieler gefunden</p>
              ) : (
                filteredPlayers.map((player) => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-white border-2 border-white rounded-lg hover:border-orange-500 cursor-pointer transition-colors shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => handlePlayerSelect(player.id)}
                      className="w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 shadow-sm"
                    />
                    <span className="font-medium text-gray-900">{player.name}</span>
                  </label>
                ))
              )}
            </div>

            <button
              onClick={handleRegisterPlayers}
              disabled={selectedPlayers.size === 0 || !tournamentFormCompleted}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                selectedPlayers.size > 0 && tournamentFormCompleted
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {selectedPlayers.size > 0 ? `${selectedPlayers.size} Spieler registrieren` : "Spieler auswählen"}
            </button>
          </div>

          <div className="bg-white border-2 border-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Registrierte Spieler</h2>
              <span className="text-sm font-bold text-orange-500">
                {registeredPlayers.length} / {tournamentSize}
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {registeredPlayers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Noch keine Spieler registriert</p>
              ) : (
                registeredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 border-2 rounded-lg shadow-sm transition-colors ${
                      player.paid ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white font-bold rounded-full text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{player.player_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={player.paid}
                          onChange={() => togglePaymentStatus(player.id, player.paid)}
                          disabled={player.deducted_from_credit === true}
                          className={`w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 ${
                            player.deducted_from_credit === true ? "cursor-not-allowed opacity-50" : ""
                          }`}
                          title={
                            player.deducted_from_credit ? "Automatisch abgezogen - kann nicht geändert werden" : ""
                          }
                        />
                        <span className="text-sm text-gray-600">Bezahlt</span>
                      </label>
                      <button
                        onClick={() => handleUnregisterPlayer(player.id)}
                        className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                        title={player.deducted_from_credit ? "Guthaben wird rückerstattet" : "Registrierung entfernen"}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Credit Confirm Modal */}
      {showCreditConfirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <Euro className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Vom Guthaben abziehen?</h3>
            <p className="text-center text-gray-600 mb-6">
              {showCreditConfirmModal.players && showCreditConfirmModal.players.length > 0
                ? `${showCreditConfirmModal.players.length} Spieler haben Guthaben. Möchtest du das Startgeld automatisch abziehen?`
                : "Es gibt keine Spieler mit Guthaben-Konten."}
            </p>

            {showCreditConfirmModal.players && showCreditConfirmModal.players.length > 0 && (
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {showCreditConfirmModal.players.map((player) => (
                  <div key={player.id} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-2">{player.name}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Aktuell:</span>
                      <span className="font-bold text-gray-900">{player.currentBalance.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Nach Abzug:</span>
                      <span className="font-bold text-blue-600">{player.newBalance.toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={registerPlayersWithCreditDeduction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
              >
                Ja, vom Guthaben abziehen
              </Button>
              <Button
                onClick={registerPlayersWithoutCreditDeduction}
                variant="outline"
                className="w-full border-2 border-gray-300 hover:bg-gray-50 font-semibold py-3 rounded-lg bg-transparent"
              >
                Nein, ohne Abzug registrieren
              </Button>
            </div>
          </div>
        </div>
      )}

      {scannedPlayerForConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <Euro className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Guthaben abziehen?</h3>
            <p className="text-center text-gray-600 mb-6 font-semibold">{scannedPlayerForConfirm.name}</p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Aktuelles Guthaben:</span>
                <span className="font-bold text-gray-900">{scannedPlayerForConfirm.currentBalance.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Startgeld:</span>
                <span className="font-bold text-red-600">-{scannedPlayerForConfirm.entryFee.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t-2 border-blue-200 pt-2">
                <span className="text-gray-600">Nach Abzug:</span>
                <span className="font-bold text-blue-600">
                  {(scannedPlayerForConfirm.currentBalance - scannedPlayerForConfirm.entryFee).toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleScannedPlayerConfirm(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
              >
                Ja, abziehen
              </Button>
              <Button
                onClick={() => handleScannedPlayerConfirm(false)}
                variant="outline"
                className="w-full border-2 border-gray-300 hover:bg-gray-50 font-semibold py-3 rounded-lg bg-transparent"
              >
                Nein, ohne Abzug
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPaidLockModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4 mx-auto">
              <Lock className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Bezahlung gesperrt</h3>
            <p className="text-center text-gray-600 font-semibold mb-4">{showPaidLockModal.playerName}</p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-center text-gray-700 text-sm">
                Dieser Spieler wurde automatisch als <span className="font-bold text-orange-600">bezahlt</span>{" "}
                markiert, da das Startgeld vom Guthaben abgezogen wurde.
              </p>
              <p className="text-center text-gray-600 text-sm mt-2">Du kannst diese Markierung nicht mehr ändern.</p>
            </div>
            <Button
              onClick={() => setShowPaidLockModal({ open: false })}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

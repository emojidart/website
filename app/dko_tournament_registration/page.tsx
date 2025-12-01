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
  QrCode,
  Lock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
  deducted_from_credit?: boolean | string
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
  const [scanSuccess, setScanSuccess] = useState(false)
  const [scannerInput, setScannerInput] = useState("")
  const scannerInputRef = useRef<HTMLInputElement | null>(null)
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [tournamentFormCompleted, setTournamentFormCompleted] = useState(false)

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

  const [showRefundConfirmModal, setShowRefundConfirmModal] = useState<{
    open: boolean
    registrationId?: number
    playerName?: string
    refundAmount?: number
  }>({ open: false })

  const [showRefundSuccessModal, setShowRefundSuccessModal] = useState<{
    open: boolean
    playerName?: string
    refundAmount?: number
  }>({ open: false })

  const handleScannedPlayerConfirm = async (shouldDeduct: boolean) => {
    if (!scannedPlayerForConfirm) return

    try {
      const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
        player_id: scannedPlayerForConfirm.id.toString(),
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
        setScannerMessage("USB-Scanner bereit...")
        setScanSuccess(false)
        setShowScanner(true)
        startScanner()
      }, 2000)
    } catch (error) {
      console.error("[v0] Error confirming scanned player:", error)
      setScannerMessage("Fehler beim Registrieren!")
      setTimeout(() => {
        setScannerMessage("USB-Scanner bereit...")
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
          const { data: clubPlayer } = await supabase
            .from("club_players")
            .select("id")
            .eq("spieldatenbank_id", playerId)
            .maybeSingle()

          if (clubPlayer) {
            const { data: creditData } = await supabase
              .from("player_credits")
              .select("credit_balance")
              .eq("player_id", clubPlayer.id)
              .maybeSingle()

            if (creditData) {
              const currentCredit = creditData.credit_balance

              if (currentCredit >= entryFee) {
                playersWithCredit.push({
                  id: player.id,
                  name: player.name,
                  currentBalance: currentCredit,
                  newBalance: currentCredit - entryFee,
                  clubPlayerId: clubPlayer.id,
                })
              } else {
                playersWithoutCredit.push(playerId)
              }
            } else {
              playersWithoutCredit.push(playerId)
            }
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

      for (const playerId of playerIds) {
        const player = availablePlayers.find((p) => p.id === playerId)
        if (!player) continue

        const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
          player_id: playerId.toString(),
          player_name: player.name,
          paid: false,
          entry_fee: entryFee,
          deducted_from_credit: false,
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
          continue
        }

        successfullyRegistered.push(playerId)
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
      const playersWithCredit = showCreditConfirmModal.players || []
      const playersWithoutCredit = showCreditConfirmModal.playersWithoutCredit || []

      setShowCreditConfirmModal({ open: false })

      // Register ALL players (both with and without credit) without deduction
      const allPlayerIds = [...playersWithCredit.map((p) => p.id), ...playersWithoutCredit]

      await registerPlayersDirectly(allPlayerIds, entryFee)
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
          player_id: playerWithCredit.id.toString(),
          player_name: player.name,
          paid: true,
          entry_fee: entryFee,
          deducted_from_credit: true,
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
          continue
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

        const { error: registerError } = await supabase.from("dko_tournament_registration").insert({
          player_id: playerId.toString(),
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
          continue
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

      const deductedFromCredit =
        playerToUnregister.deducted_from_credit === true || playerToUnregister.deducted_from_credit === "true"

      if (deductedFromCredit && playerToUnregister.player_id) {
        setShowRefundConfirmModal({
          open: true,
          registrationId,
          playerName: playerToUnregister.player_name,
          refundAmount: playerToUnregister.entry_fee,
        })
        return
      }

      const { error } = await supabase.from("dko_tournament_registration").delete().eq("id", registrationId)

      if (error) throw error
      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("Fehler beim Entfernen der Registrierung:", error)
    }
  }

  const confirmRefund = async () => {
    const registrationId = showRefundConfirmModal.registrationId
    if (!registrationId) return

    try {
      const playerToUnregister = registeredPlayers.find((p) => p.id === registrationId)

      if (!playerToUnregister || !playerToUnregister.player_id) {
        setShowRefundConfirmModal({ open: false })
        return
      }

      const spieldatenbankId = playerToUnregister.player_id

      const { data: clubPlayer, error: clubPlayerError } = await supabase
        .from("club_players")
        .select("id")
        .eq("spieldatenbank_id", spieldatenbankId)
        .maybeSingle()

      if (clubPlayerError || !clubPlayer) {
        console.error("[v0] Club player not found:", clubPlayerError)
        setShowRefundConfirmModal({ open: false })
        return
      }

      const { data: currentCredit, error: fetchError } = await supabase
        .from("player_credits")
        .select("credit_balance")
        .eq("player_id", clubPlayer.id)
        .maybeSingle()

      if (fetchError) {
        console.error("[v0] Error fetching credit balance:", fetchError)
        setShowRefundConfirmModal({ open: false })
        return
      }

      if (!currentCredit) {
        console.error("[v0] No credit record found for player")
        setShowRefundConfirmModal({ open: false })
        return
      }

      const newBalance = currentCredit.credit_balance + playerToUnregister.entry_fee

      const { error: updateError } = await supabase
        .from("player_credits")
        .update({
          credit_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("player_id", clubPlayer.id)

      if (updateError) {
        console.error("[v0] Error updating credit balance:", updateError)
        setShowRefundConfirmModal({ open: false })
        return
      }

      await supabase.from("credit_transactions").insert({
        player_id: clubPlayer.id,
        amount: playerToUnregister.entry_fee,
        balance_after: newBalance,
        transaction_type: "tournament_refund",
        admin_id: user?.id,
      })

      const { error: deleteError } = await supabase
        .from("dko_tournament_registration")
        .delete()
        .eq("id", registrationId)

      if (deleteError) {
        console.error("[v0] Error deleting registration:", deleteError)
        setShowRefundConfirmModal({ open: false })
        return
      }

      console.log("[v0] Refund successful, showing success modal")
      setShowRefundConfirmModal({ open: false })
      setShowRefundSuccessModal({
        open: true,
        playerName: playerToUnregister.player_name,
        refundAmount: playerToUnregister.entry_fee,
      })

      await fetchRegisteredPlayers()
    } catch (error) {
      console.error("[v0] Unhandled error in confirmRefund:", error)
      setShowRefundConfirmModal({ open: false })
    }
  }

  const togglePaymentStatus = async (registrationId: number, currentStatus: boolean) => {
    try {
      const playerToToggle = registeredPlayers.find((p) => p.id === registrationId)

      // Fixed: Check for both boolean true AND string "true"
      const deductedFromCredit =
        playerToToggle?.deducted_from_credit === true || playerToToggle?.deducted_from_credit === "true"

      if (deductedFromCredit && currentStatus === true) {
        console.log("[v0] Opening paid lock modal")
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
    setScannerMessage("USB-Scanner bereit...")
    setScanSuccess(false)
    setScannerInput("")
    setTimeout(() => {
      scannerInputRef.current?.focus()
    }, 100)
  }

  const stopScanner = () => {
    setIsScanning(false)
    setShowScanner(false)
    setScannerMessage("")
    setScanSuccess(false)
    setScannerInput("")
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }

  const handleScannerInput = async (code: string) => {
    if (!code.trim() || isScanning) return

    setScannerMessage("QR-Code erkannt! Suche Spieler...")
    setIsScanning(true)

    try {
      let cleanCode = code.trim().replace(/ß/g, "-")

      if (cleanCode.toLowerCase().startsWith("emd")) {
        cleanCode = "EMD" + cleanCode.slice(3).toLowerCase()
      }

      console.log("[v0] Original code:", code)
      console.log("[v0] Cleaned code:", cleanCode)

      const { data: spielData, error: queryError } = await supabase
        .from("spieldatenbank")
        .select("id, name, player_code")
        .eq("player_code", cleanCode)
        .single()

      console.log("[v0] Spieldatenbank query error:", queryError)
      console.log("[v0] Spieldatenbank result:", spielData)

      if (queryError || !spielData) {
        console.log("[v0] Player code not found in spieldatenbank:", cleanCode)
        setScannerMessage("Spieler-Code nicht gefunden!")
        setIsScanning(false)
        setScannerInput("")
        setTimeout(() => {
          setScannerMessage("USB-Scanner bereit...")
          scannerInputRef.current?.focus()
        }, 2000)
        return
      }

      const alreadyRegistered = registeredPlayers.some((rp) => rp.player_id === spielData.id.toString())
      if (alreadyRegistered) {
        console.log("[v0] Player already registered:", spielData.name)
        setScannerMessage(`${spielData.name} ist bereits registriert!`)
        setIsScanning(false)
        setScannerInput("")
        setTimeout(() => {
          setScannerMessage("USB-Scanner bereit...")
          scannerInputRef.current?.focus()
        }, 2000)
        return
      }

      const entryFee = Number.parseFloat(tournamentEntryFee) || 0

      if (entryFee > 0) {
        const { data: clubPlayer } = await supabase
          .from("club_players")
          .select("id")
          .eq("spieldatenbank_id", spielData.id)
          .maybeSingle()

        if (clubPlayer) {
          const { data: creditData } = await supabase
            .from("player_credits")
            .select("credit_balance")
            .eq("player_id", clubPlayer.id)
            .maybeSingle()

          if (creditData) {
            const currentCredit = creditData.credit_balance

            if (currentCredit >= entryFee) {
              console.log("[v0] Player has sufficient credit, showing confirm modal")
              setScannedPlayerForConfirm({
                id: spielData.id,
                name: spielData.name,
                clubPlayerId: clubPlayer.id,
                currentBalance: currentCredit,
                entryFee: entryFee,
              })
              stopScanner()
              return
            } else {
              console.log("[v0] Player has insufficient credit, registering without payment")
              const { error: insertError } = await supabase.from("dko_tournament_registration").insert({
                player_id: spielData.id.toString(),
                player_name: spielData.name,
                paid: false,
                entry_fee: entryFee,
              })

              if (insertError) throw insertError

              setScannerMessage(`✓ ${spielData.name} registriert (Zahlung vor Ort)`)
              setScanSuccess(true)
              setIsScanning(false)
              setScannerInput("")
              await fetchRegisteredPlayers()
              await fetchFrequentPlayers()

              setTimeout(() => {
                setScannerMessage("USB-Scanner bereit...")
                setScanSuccess(false)
                scannerInputRef.current?.focus()
              }, 2000)
              return
            }
          }
        }

        console.log("[v0] No credit account found, registering without payment")
        const { error: insertError } = await supabase.from("dko_tournament_registration").insert({
          player_id: spielData.id.toString(),
          player_name: spielData.name,
          paid: false,
          entry_fee: entryFee,
        })

        if (insertError) throw insertError

        setScannerMessage(`✓ ${spielData.name} registriert (Zahlung vor Ort)`)
        setScanSuccess(true)
        setIsScanning(false)
        setScannerInput("")
        await fetchRegisteredPlayers()
        await fetchFrequentPlayers()

        setTimeout(() => {
          setScannerMessage("USB-Scanner bereit...")
          setScanSuccess(false)
          scannerInputRef.current?.focus()
        }, 2000)
      } else {
        console.log("[v0] No entry fee, registering player")
        const { error: insertError } = await supabase.from("dko_tournament_registration").insert({
          player_id: spielData.id.toString(),
          player_name: spielData.name,
          paid: false,
          entry_fee: entryFee,
        })

        if (insertError) throw insertError

        setScannerMessage(`✓ ${spielData.name} erfolgreich registriert!`)
        setScanSuccess(true)
        setIsScanning(false)
        setScannerInput("")
        await fetchRegisteredPlayers()
        await fetchFrequentPlayers()

        setTimeout(() => {
          setScannerMessage("USB-Scanner bereit...")
          setScanSuccess(false)
          scannerInputRef.current?.focus()
        }, 2000)
      }
    } catch (error) {
      console.error("[v0] Error finding player:", error)
      setScannerMessage("Fehler beim Suchen!")
      setIsScanning(false)
      setScannerInput("")
      setTimeout(() => {
        setScannerMessage("USB-Scanner bereit...")
        scannerInputRef.current?.focus()
      }, 2000)
    }
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
      !registeredPlayers.some((rp) => rp.player_name === player.name),
  )

  const availableFrequentPlayers = frequentPlayers.filter(
    (player) => !registeredPlayers.some((rp) => rp.player_name === player.name),
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

      {showCreditConfirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <Euro className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">Guthaben abziehen?</h3>

            {showCreditConfirmModal.players && showCreditConfirmModal.players.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3 font-semibold">Folgende Spieler haben genug Guthaben:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {showCreditConfirmModal.players.map((p) => (
                    <div key={p.id} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Aktuell: {p.currentBalance.toFixed(2)}€</span>
                        <span className="text-blue-600 font-semibold">→ {p.newBalance.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showCreditConfirmModal.playersWithoutCredit && showCreditConfirmModal.playersWithoutCredit.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-orange-600 font-semibold">
                  {showCreditConfirmModal.playersWithoutCredit.length} Spieler ohne Guthaben werden ohne Abzug
                  registriert.
                </p>
              </div>
            )}

            <p className="text-center text-gray-600 mb-6">
              Möchtest du das Startgeld von {showCreditConfirmModal.entryFee?.toFixed(2)}€ vom Guthaben abziehen?
            </p>

            <div className="flex gap-3">
              <Button
                onClick={registerPlayersWithoutCreditDeduction}
                variant="outline"
                className="flex-1 border-2 bg-transparent"
              >
                Nein, ohne Abzug
              </Button>
              <Button onClick={registerPlayersWithCreditDeduction} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Ja, abziehen
              </Button>
            </div>
          </div>
        </div>
      )}

      {scannedPlayerForConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4 mx-auto">
              <Euro className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Guthaben abziehen?</h3>
            <p className="text-center text-gray-600 font-semibold mb-6">{scannedPlayerForConfirm.name}</p>

            <div className="bg-green-50 rounded-lg p-4 mb-6 border-2 border-green-200">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Aktuelles Guthaben:</span>
                <span className="font-bold text-gray-900">{scannedPlayerForConfirm.currentBalance.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Startgeld:</span>
                <span className="font-bold text-orange-600">-{scannedPlayerForConfirm.entryFee.toFixed(2)}€</span>
              </div>
              <div className="border-t-2 border-green-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Neues Guthaben:</span>
                  <span className="font-bold text-green-600">
                    {(scannedPlayerForConfirm.currentBalance - scannedPlayerForConfirm.entryFee).toFixed(2)}€
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => handleScannedPlayerConfirm(false)} variant="outline" className="flex-1 border-2">
                Nein, ohne Abzug
              </Button>
              <Button
                onClick={() => handleScannedPlayerConfirm(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Ja, abziehen
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
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Status gesperrt</h3>
            <p className="text-center text-gray-600 font-semibold mb-4">{showPaidLockModal.playerName}</p>
            <p className="text-center text-gray-600 mb-6">
              Das Startgeld wurde automatisch vom Guthaben abgezogen. Der Bezahlstatus kann nicht geändert werden.
            </p>
            <Button
              onClick={() => setShowPaidLockModal({ open: false })}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Verstanden
            </Button>
          </div>
        </div>
      )}

      {showRefundConfirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 mx-auto">
              <Euro className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Guthaben zurückerstatten?</h3>
            <p className="text-center text-gray-600 font-semibold mb-6">{showRefundConfirmModal.playerName}</p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 border-2 border-blue-200">
              <p className="text-sm text-gray-700 mb-2 text-center">
                Das Startgeld wurde vom Guthaben abgezogen und wird nun zurückerstattet:
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-3xl font-bold text-green-600">
                  +{showRefundConfirmModal.refundAmount?.toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowRefundConfirmModal({ open: false })}
                variant="outline"
                className="flex-1 border-2"
              >
                Abbrechen
              </Button>
              <Button onClick={confirmRefund} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Ja, zurückerstatten
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRefundSuccessModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4 mx-auto animate-bounce">
              <Star className="w-7 h-7 text-green-600 fill-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Guthaben zurückerstattet!</h3>
            <p className="text-center text-gray-600 font-semibold mb-6">{showRefundSuccessModal.playerName}</p>

            <div className="bg-green-50 rounded-lg p-4 mb-6 border-2 border-green-200">
              <p className="text-center text-gray-700 mb-2">Erfolgreich zurückerstattet:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold text-green-600">
                  +{showRefundSuccessModal.refundAmount?.toFixed(2)}€
                </span>
              </div>
            </div>

            <Button
              onClick={() => setShowRefundSuccessModal({ open: false })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
            >
              Perfekt!
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

            <div className="mb-4">
              <div className="relative mb-4 p-6 border-4 border-dashed border-orange-500 rounded-lg bg-orange-50 text-center">
                <QrCode className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">USB-Scanner verbunden</p>
              </div>

              <input
                ref={scannerInputRef}
                type="text"
                value={scannerInput}
                onChange={(e) => {
                  const newValue = e.target.value
                  setScannerInput(newValue)

                  if (scanTimerRef.current) {
                    clearTimeout(scanTimerRef.current)
                  }

                  if (newValue.trim().length > 0) {
                    scanTimerRef.current = setTimeout(() => {
                      if (!isScanning) {
                        handleScannerInput(newValue)
                        setScannerInput("")
                      }
                    }, 150)
                  }
                }}
                placeholder="Scanner Eingabe..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-center text-lg font-semibold"
                autoFocus
              />
            </div>

            <div
              className={`text-center p-3 rounded-lg font-semibold ${
                scanSuccess ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              {scannerMessage || "USB-Scanner bereit..."}
            </div>

            <p className="text-sm text-gray-600 mt-4 text-center">
              Halte die Mitgliedskarte vor den Scanner - Erkennung erfolgt automatisch
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
                <h3 className="text-xl font-bold text-gray-900">Turnier bereit zum Starten</h3>
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
              <h2 className="text-2xl font-bold text-gray-900">Spieler hinzufügen</h2>
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
              <QrCode className="w-5 h-5" />
              USB-Scanner aktivieren
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
                          disabled={player.deducted_from_credit === true || player.deducted_from_credit === "true"}
                          className={`w-5 h-5 border-2 border-white rounded focus:ring-orange-500 accent-orange-500 ${
                            player.deducted_from_credit === true || player.deducted_from_credit === "true"
                              ? "cursor-not-allowed opacity-50"
                              : ""
                          }`}
                          title={
                            player.deducted_from_credit === true || player.deducted_from_credit === "true"
                              ? "Automatisch abgezogen - kann nicht geändert werden"
                              : ""
                          }
                        />
                        <span className="text-sm text-gray-600">Bezahlt</span>
                      </label>
                      <button
                        onClick={() => handleUnregisterPlayer(player.id)}
                        className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                        title={
                          player.deducted_from_credit === true || player.deducted_from_credit === "true"
                            ? "Guthaben wird rückerstattet"
                            : "Registrierung entfernen"
                        }
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
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

interface PlayerInfo {
  playerName: string
  nextOpponent: string | null
  nextMatchId: number | null
  pastOpponents: Array<{ opponent: string; result: string; matchId: number }>
  profilePicture: string
}

export default function PlayerScannerModal({ tournamentId, tournamentType = "8er_dko" }: { tournamentId: string; tournamentType?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [scannedCode, setScannedCode] = useState("")
  const scanBufferRef = useRef("")
  const scanTimerRef = useRef<NodeJS.Timeout>()
  const autoCloseTimerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    console.log("[v0] PlayerScannerModal mounted, listening for scans...")
    
    const handleKeyPress = (e: KeyboardEvent) => {
      const ignoredKeys = ['Control', 'Meta', 'Shift', 'Tab', 'CapsLock', 'Escape', 'Backspace']
      if (ignoredKeys.includes(e.key)) {
        console.log("[v0] Ignored modifier key:", e.key)
        return
      }

      console.log("[v0] Key pressed:", {
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        buffer: scanBufferRef.current
      })

      // Sammle alle sichtbaren Zeichen (auch mit Alt)
      if (e.key.length === 1) {
        scanBufferRef.current += e.key
        console.log("[v0] Character added to buffer:", scanBufferRef.current)

        // Clear timer bei jeder neuen Eingabe
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current)
        }

        scanTimerRef.current = setTimeout(() => {
          console.log("[v0] Timer triggered, processing buffer:", scanBufferRef.current)
          if (scanBufferRef.current.trim()) {
            processScannedCode(scanBufferRef.current.trim())
            scanBufferRef.current = ""
          }
        }, 200)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => {
      console.log("[v0] PlayerScannerModal unmounted")
      window.removeEventListener("keydown", handleKeyPress)
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    }
  }, [])

  const processScannedCode = async (code: string) => {
    console.log("[v0] Processing scanned code:", code)

    // Prüfe ob Code mit "emd-" beginnt
    if (!code.toLowerCase().startsWith("emd-")) {
      console.log("[v0] Invalid code format (missing emd- prefix), ignoring")
      return
    }

    console.log("[v0] Valid code detected, fetching player info...")
    setScannedCode(code)
    await fetchPlayerInfo(code)
  }

  const fetchPlayerInfo = async (playerCode: string) => {
    try {
      console.log("[v0] Fetching player info for:", playerCode)
      console.log("[v0] Tournament ID:", tournamentId, "Type:", tournamentType)
      
      // Hole alle Match-States für dieses Turnier
      const { data: matchStates, error } = await supabase
        .from("dko_match_states")
        .select("*")
        .eq("tournament_type", tournamentType)
        .eq("tournament_id", tournamentId)
        .order("match_id", { ascending: true })

      console.log("[v0] Match states query result:", { matchStates, error })

      if (error) throw error

      if (!matchStates || matchStates.length === 0) {
        console.log("[v0] No match states found for this tournament")
        return
      }

      // Finde den Spieler anhand des Codes (vereinfacht: nehme alles nach "emd-")
      const playerName = playerCode.toLowerCase()
      console.log("[v0] Searching for player with code:", playerName)
      
      // Suche in allen Matches nach dem Spieler
      let foundPlayer: string | null = null
      let nextOpponent: string | null = null
      let nextMatchId: number | null = null
      const pastOpponents: Array<{ opponent: string; result: string; matchId: number }> = []

      for (const match of matchStates) {
        const p1Lower = match.player1?.toLowerCase() || ""
        const p2Lower = match.player2?.toLowerCase() || ""

        // Prüfe ob der gescannte Code im Spielernamen vorkommt
        if (p1Lower.includes(playerName) || p2Lower.includes(playerName)) {
          console.log("[v0] Found match:", match)
          const isPlayer1 = p1Lower.includes(playerName)
          foundPlayer = isPlayer1 ? match.player1 : match.player2
          const opponent = isPlayer1 ? match.player2 : match.player1

          // Hat dieses Match einen Gewinner?
          if (match.winner) {
            // Vergangenes Match
            const won = match.winner === foundPlayer
            pastOpponents.push({
              opponent: opponent || "Unbekannt",
              result: won ? "Gewonnen" : "Verloren",
              matchId: match.match_id
            })
          } else if (match.player1 && match.player2) {
            // Aktuelles/Nächstes Match
            nextOpponent = opponent
            nextMatchId = match.match_id
          }
        }
      }

      if (!foundPlayer) {
        console.log("[v0] Player not found in any match")
        return
      }

      console.log("[v0] Found player:", foundPlayer, "Next opponent:", nextOpponent, "Past matches:", pastOpponents.length)

      // Hole Profilbild
      const { data: profileData } = await supabase
        .from("spieldatenbank")
        .select("profile_picture_url")
        .ilike("name", foundPlayer)
        .maybeSingle()

      console.log("[v0] Profile data:", profileData)

      setPlayerInfo({
        playerName: foundPlayer,
        nextOpponent,
        nextMatchId,
        pastOpponents,
        profilePicture: profileData?.profile_picture_url || "/placeholder-user.jpg"
      })

      console.log("[v0] Opening modal...")
      setIsOpen(true)

      // Auto-close nach 10 Sekunden
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
      }
      autoCloseTimerRef.current = setTimeout(() => {
        console.log("[v0] Auto-closing modal after 10 seconds")
        setIsOpen(false)
      }, 10000)

    } catch (error) {
      console.error("[v0] Error fetching player info:", error)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Spieler Info</DialogTitle>
          <DialogDescription>Turnier: {tournamentType}</DialogDescription>
        </DialogHeader>

        {playerInfo && (
          <div className="space-y-4 py-4">
            {/* Spieler Avatar & Name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={playerInfo.profilePicture || "/placeholder.svg"} alt={playerInfo.playerName} />
                <AvatarFallback>{playerInfo.playerName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">{playerInfo.playerName}</h3>
                <p className="text-sm text-muted-foreground">Code: {scannedCode}</p>
              </div>
            </div>

            {/* Nächster Gegner */}
            {playerInfo.nextOpponent ? (
              <Card className="p-4 bg-orange-50 border-orange-300">
                <h4 className="font-semibold text-orange-800 mb-2">Nächster Gegner</h4>
                <p className="text-lg font-bold text-orange-900">{playerInfo.nextOpponent}</p>
                <p className="text-xs text-orange-600 mt-1">Match #{playerInfo.nextMatchId}</p>
              </Card>
            ) : (
              <Card className="p-4 bg-gray-50 border-gray-300">
                <p className="text-sm text-muted-foreground italic">Kein anstehendes Match</p>
              </Card>
            )}

            {/* Vergangene Gegner */}
            {playerInfo.pastOpponents.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Vergangene Matches</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {playerInfo.pastOpponents.map((past, idx) => (
                    <Card key={idx} className="p-3 bg-muted">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{past.opponent}</p>
                          <p className="text-xs text-muted-foreground">Match #{past.matchId}</p>
                        </div>
                        <span 
                          className={`text-sm font-bold px-2 py-1 rounded ${
                            past.result === "Gewonnen" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {past.result}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground mt-4">
              Fenster schließt automatisch in 10 Sekunden
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

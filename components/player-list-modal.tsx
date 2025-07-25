"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react" // Importiere einen Lade-Icon

interface PlayerListModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlayer: (playerName: string) => void
  fetchAllUniquePlayers: () => Promise<string[]>
}

export function PlayerListModal({ isOpen, onClose, onSelectPlayer, fetchAllUniquePlayers }: PlayerListModalProps) {
  const [allPlayers, setAllPlayers] = useState<string[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchAllUniquePlayers().then((players) => {
        setAllPlayers(players)
        setFilteredPlayers(players)
        setLoading(false)
      })
      setSearchTerm("") // Reset search term when modal opens
    }
  }, [isOpen, fetchAllUniquePlayers])

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    const filtered = allPlayers.filter((name) => name.toLowerCase().includes(lowerCaseSearchTerm))
    setFilteredPlayers(filtered)
  }, [searchTerm, allPlayers])

  const handleSelect = (name: string) => {
    onSelectPlayer(name)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-brutal-card-bg text-brutal-text border-brutal-border rounded-xl shadow-2xl max-w-md p-8">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-4xl font-extrabold text-center text-brutal-accent-gold drop-shadow-md">
            Spieler auswählen
          </DialogTitle>
        </DialogHeader>
        <Input
          type="text"
          placeholder="Spieler suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 mb-6 bg-brutal-bg border-brutal-border text-brutal-text placeholder:text-brutal-text-muted focus:ring-brutal-accent-red focus:border-brutal-accent-red text-lg px-4 rounded-lg"
        />
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-10 w-10 animate-spin text-brutal-accent-red" />
            <p className="ml-4 text-xl text-brutal-text-muted">Lade Spieler...</p>
          </div>
        ) : (
          <ul className="player-list max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredPlayers.length === 0 ? (
              <li className="text-center text-brutal-text-muted text-lg p-4">Keine Spieler gefunden.</li>
            ) : (
              filteredPlayers.map((name) => (
                <li
                  key={name}
                  onClick={() => handleSelect(name)}
                  className="p-4 bg-brutal-bg rounded-lg cursor-pointer hover:bg-brutal-hover transition-colors text-xl font-medium border border-brutal-border hover:border-brutal-accent-red"
                >
                  {name}
                </li>
              ))
            )}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { InlineLoader } from "@/components/loading/loading"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, User, X, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PlayerListModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlayer: (name: string) => void
}

export function PlayerListModal({ isOpen, onClose, onSelectPlayer }: PlayerListModalProps) {
  const [players, setPlayers] = useState<string[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPlayers()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredPlayers(players)
    } else {
      setFilteredPlayers(players.filter((player) => player.toLowerCase().includes(searchTerm.toLowerCase())))
    }
  }, [searchTerm, players])

  const loadPlayers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("spieldatenbank").select("name").order("name")

      if (error) {
        console.error("Fehler beim Laden der Spieler:", error)
        return
      }

      const playerNames = data?.map((player) => player.name) || []
      setPlayers(playerNames)
      setFilteredPlayers(playerNames)
    } catch (error) {
      console.error("Fehler beim Laden der Spieler:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlayer = (playerName: string) => {
    onSelectPlayer(playerName)
    onClose()
    setSearchTerm("")
  }

  const handleClose = () => {
    onClose()
    setSearchTerm("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-card  border-0 shadow-2xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-foreground p-2 bg-card   rounded-lg shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">Spieler auswählen</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Wählen Sie einen Spieler aus der Liste</p>
              </div>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Spieler suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-border focus:border-red-500 focus:ring-red-500 bg-muted/50 transition-all duration-200"
            />
          </div>

          {/* Player List */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  
                  <InlineLoader label="Spieler werden geladen..." />
                </div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Keine Spieler gefunden" : "Keine Spieler verfügbar"}
                </p>
              </div>
            ) : (
              filteredPlayers.map((player, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 hover:border-red-200 border border-transparent transition-all duration-200 text-left group"
                >
                  <div className="text-foreground flex-shrink-0 h-8 w-8 bg-card   rounded-full flex items-center justify-center   transition-all duration-200">
                    <User className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-red-700 transition-colors duration-200">
                      {player}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {!loading && filteredPlayers.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground text-center">
                {filteredPlayers.length} von {players.length} Spielern
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

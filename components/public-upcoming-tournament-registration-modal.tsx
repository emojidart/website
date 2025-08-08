"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Calendar, Clock, MapPin, Euro, Swords, User, Mail, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { UserPlus } from 'lucide-react'

interface PublicUpcomingTournamentRegistrationModalProps { // Name geändert
  isOpen: boolean
  onClose: () => void
  tournamentId: string | null
  tournamentName: string | null
  tournamentDate: string | null
  tournamentTime: string | null
  tournamentLocation: string | null
  tournamentMode: string | null
  tournamentEntryFee: number | null
}

export function PublicUpcomingTournamentRegistrationModal({ // Name geändert
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  tournamentDate,
  tournamentTime,
  tournamentLocation,
  tournamentMode,
  tournamentEntryFee,
}: PublicUpcomingTournamentRegistrationModalProps) { // Name geändert
  const [playerName, setPlayerName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!tournamentId) {
      setMessage({ type: "error", text: "Fehler: Turnier-ID fehlt." })
      setLoading(false)
      return
    }

    if (!playerName || !email) {
      setMessage({ type: "error", text: "Bitte füllen Sie alle Pflichtfelder (Name, E-Mail) aus." })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("tournament_registrations").insert([
        {
          tournament_id: tournamentId,
          player_name: playerName,
          email: email,
          phone: phone || null, // Optionales Feld
        },
      ])

      if (error) {
        throw error
      }

      setMessage({ type: "success", text: "Anmeldung erfolgreich! Wir freuen uns auf dich!" })
      setPlayerName("")
      setEmail("")
      setPhone("")
      // Optional: Modal nach kurzer Zeit schließen
      setTimeout(() => {
        onClose()
        setMessage(null); // Nachricht zurücksetzen, wenn Modal geschlossen wird
      }, 2000);
    } catch (error: any) {
      console.error("Error during registration:", error)
      setMessage({ type: "error", text: `Fehler bei der Anmeldung: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-lg shadow-xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Turnier Anmeldung</DialogTitle>
          <DialogDescription className="text-gray-600">
            Melde dich für das Turnier "{tournamentName}" an.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {tournamentName && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="font-semibold">{tournamentName}</span>
            </div>
          )}
          {tournamentDate && tournamentTime && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{new Date(tournamentDate).toLocaleDateString("de-DE")} um {tournamentTime}</span>
            </div>
          )}
          {tournamentLocation && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>{tournamentLocation}</span>
            </div>
          )}
          {tournamentMode && (
            <div className="flex items-center gap-2 text-gray-700">
              <Swords className="h-4 w-4 text-purple-500" />
              <span>Modus: {tournamentMode === "edart" ? "E-Dart" : tournamentMode === "steeldart" ? "Steel Dart" : "Beide"}</span>
            </div>
          )}
          {tournamentEntryFee !== null && (
            <div className="flex items-center gap-2 text-gray-700">
              <Euro className="h-4 w-4 text-yellow-500" />
              <span>Startgeld: {tournamentEntryFee.toFixed(2)} €</span>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName" className="flex items-center gap-2 text-gray-700">
              <User className="h-4 w-4" /> Name
            </Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Dein vollständiger Name"
              required
              className="h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4" /> E-Mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Deine E-Mail-Adresse"
              required
              className="h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
              <Phone className="h-4 w-4" /> Telefon (optional)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Deine Telefonnummer"
              className="h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm font-medium flex items-center gap-2 ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-green-50 text-green-700 border border-green-100"
              }`}
            >
              {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Anmelden...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Jetzt anmelden</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

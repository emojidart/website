"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  Target,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface TournamentRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentDate: string
  tournamentTime: string
  tournamentType: "edart" | "steeldart"
}

export function TournamentRegistrationModal({
  isOpen,
  onClose,
  tournamentDate,
  tournamentTime,
  tournamentType,
}: TournamentRegistrationModalProps) {
  const [formData, setFormData] = useState({
    spielerName: "",
    email: "",
    telefon: "",
    notizen: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      // Datum parsen (z.B. "02. Juli 2025" -> "2025-07-02")
      const dateStr = tournamentDate
      const [day, month, year] = dateStr.split(/[.\s]+/)
      const monthMap: { [key: string]: string } = {
        Januar: "01",
        Jan: "01",
        Februar: "02",
        Feb: "02",
        März: "03",
        Mär: "03",
        April: "04",
        Apr: "04",
        Mai: "05",
        Juni: "06",
        Jun: "06",
        Juli: "07",
        Jul: "07",
        August: "08",
        Aug: "08",
        September: "09",
        Sep: "09",
        Oktober: "10",
        Okt: "10",
        November: "11",
        Nov: "11",
        Dezember: "12",
        Dez: "12",
      }

      const monthNum = monthMap[month] || "01"
      const formattedDate = `${year}-${monthNum}-${day.padStart(2, "0")}`

      const { error } = await supabase.from("anmeldungen").insert([
        {
          spieler_name: formData.spielerName,
          turnier_typ: tournamentType,
          turnier_datum: formattedDate,
          turnier_zeit: tournamentTime,
          email: formData.email || null,
          telefon: formData.telefon || null,
          notizen: formData.notizen || null,
        },
      ])

      if (error) {
        throw error
      }

      setSuccess(true)
      setMessage("Anmeldung erfolgreich! Du bist für das Turnier registriert.")

      // Form zurücksetzen
      setFormData({
        spielerName: "",
        email: "",
        telefon: "",
        notizen: "",
      })

      // Modal nach 2 Sekunden schließen
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setMessage("")
      }, 2000)
    } catch (error: any) {
      setMessage(`Fehler bei der Anmeldung: ${error.message}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setMessage("")
    setSuccess(false)
    setFormData({
      spielerName: "",
      email: "",
      telefon: "",
      notizen: "",
    })
  }

  const isEdart = tournamentType === "edart"

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg shadow-lg ${isEdart ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}
            >
              {isEdart ? <Users className="h-5 w-5 text-white" /> : <Target className="h-5 w-5 text-white" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isEdart ? "E-Dart" : "Steeldart"} Anmeldung
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Für das Turnier registrieren</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Tournament Info */}
          <div
            className={`rounded-xl p-4 mb-6 border ${isEdart ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className={`h-4 w-4 ${isEdart ? "text-blue-600" : "text-red-600"}`} />
                <span className="font-semibold text-gray-900">{tournamentDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className={`h-4 w-4 ${isEdart ? "text-blue-600" : "text-red-600"}`} />
                <span className="font-semibold text-gray-900">{tournamentTime}</span>
              </div>
            </div>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-700 mb-2">Anmeldung erfolgreich!</h3>
              <p className="text-green-600">Du bist für das Turnier registriert.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Spieler Name */}
              <div className="space-y-2">
                <label htmlFor="spielerName" className="text-sm font-medium text-gray-700">
                  Spielername *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="spielerName"
                    type="text"
                    value={formData.spielerName}
                    onChange={(e) => setFormData({ ...formData, spielerName: e.target.value })}
                    placeholder="Dein Name"
                    className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-Mail (optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="deine@email.de"
                    className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <label htmlFor="telefon" className="text-sm font-medium text-gray-700">
                  Telefon (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="telefon"
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    placeholder="+43 123 456789"
                    className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Notizen */}
              <div className="space-y-2">
                <label htmlFor="notizen" className="text-sm font-medium text-gray-700">
                  Notizen (optional)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="notizen"
                    value={formData.notizen}
                    onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                    placeholder="Besondere Wünsche oder Anmerkungen..."
                    className="pl-10 pt-3 border-gray-200 focus:border-red-500 focus:ring-red-500 bg-gray-50/50 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !formData.spielerName.trim()}
                className={`w-full h-12 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  isEdart
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                } text-white`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Anmeldung läuft...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Jetzt anmelden</span>
                  </div>
                )}
              </Button>

              {/* Status Message */}
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    success
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-red-50 text-red-700 border border-red-100"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{message}</span>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

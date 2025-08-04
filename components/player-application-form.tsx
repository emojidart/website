"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Loader2, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PlayerApplicationFormProps {
  onApplicationSuccess: () => void
}

export function PlayerApplicationForm({ onApplicationSuccess }: PlayerApplicationFormProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [alias, setAlias] = useState("")
  const [age, setAge] = useState<number | string>("")
  const [experience, setExperience] = useState("")
  const [jerseySize, setJerseySize] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Bewerbung wird gesendet...")
    setFormMessageType("info")

    // Basic validation
    if (!firstName || !lastName || !email || !age || !experience) {
      setFormMessage("Bitte füllen Sie alle Pflichtfelder aus (Vorname, Nachname, E-Mail, Alter, Erfahrung).")
      setFormMessageType("error")
      setLoading(false)
      return
    }
    if (isNaN(Number(age)) || Number(age) <= 0) {
      setFormMessage("Bitte geben Sie ein gültiges Alter ein.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("player_applications").insert([
        {
          first_name: firstName,
          last_name: lastName,
          alias: alias || null,
          age: Number(age),
          experience: experience,
          jersey_size: jerseySize || null,
          email: email,
          phone: phone || null,
          notes: notes || null,
          is_read: false, // Hinzugefügt: Explizit auf false setzen
        },
      ])

      if (error) {
        throw error
      }

      setFormMessage("Bewerbung erfolgreich gesendet! Wir melden uns bald bei Ihnen.")
      setFormMessageType("success")
      // Reset form
      setFirstName("")
      setLastName("")
      setAlias("")
      setAge("")
      setExperience("")
      setJerseySize("")
      setEmail("")
      setPhone("")
      setNotes("")
      onApplicationSuccess() // Notify parent to close dialog or show success
    } catch (error: any) {
      console.error("Error submitting application:", error)
      setFormMessage(`Fehler beim Senden der Bewerbung: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto flex flex-col [&>div:first-child]:pb-4 [&>div:last-child]:pt-4">
      <DialogHeader className="pb-4 border-b border-gray-200">
        <DialogTitle className="text-2xl font-bold text-gray-900 text-center">Spielerbewerbung</DialogTitle>
        <DialogDescription className="text-center text-gray-600">
          Füllen Sie das Formular aus, um sich bei unserem Verein zu bewerben.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              Vorname <span className="text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ihr Vorname"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Nachname <span className="text-red-500">*</span>
            </label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ihr Nachname"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="alias" className="text-sm font-medium text-gray-700">
              Alias / Spitzname
            </label>
            <Input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ihr Spitzname (optional)"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="age" className="text-sm font-medium text-gray-700">
              Alter <span className="text-red-500">*</span>
            </label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ihr Alter"
              min="10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="experience" className="text-sm font-medium text-gray-700">
            Erfahrung (kurze Beschreibung) <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Beschreiben Sie Ihre Darts-Erfahrung (z.B. Liga, Turniere, Spielstil)."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="jerseySize" className="text-sm font-medium text-gray-700">
            Trikotgröße (optional)
          </label>
          <Input
            id="jerseySize"
            type="text"
            value={jerseySize}
            onChange={(e) => setJerseySize(e.target.value)}
            placeholder="Z.B. M, L, XL"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-Mail <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ihre E-Mail-Adresse"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Telefon (optional)
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ihre Telefonnummer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Anmerkungen (optional)
          </label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Weitere Anmerkungen oder Fragen."
            rows={2}
          />
        </div>

        {formMessage && (
          <div
            className={`p-3 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              formMessageType === "error"
                ? "bg-red-50 text-red-700 border border-red-100"
                : formMessageType === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-gray-50 text-gray-700 border border-gray-100"
            }`}
          >
            {formMessageType === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : formMessageType === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>{formMessage}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Bewerbung absenden
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

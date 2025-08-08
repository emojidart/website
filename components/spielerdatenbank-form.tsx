"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Correct Shadcn Select imports
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Save, Users, XCircle } from 'lucide-react'
import { supabase } from "@/lib/supabase"

// Definieren Sie den Typ für die Spielerdatenbank-Einträge
export interface SpielerdatenbankEntry {
  id?: string; // Optional, da es beim Erstellen noch nicht vorhanden ist
  name: string;
  verein: string | null;
  ligastatus: string | null;
  geschlecht: string | null;
  created_at?: string;
}

interface SpieldatenbankFormProps {
  initialData?: SpielerdatenbankEntry | null;
  onSaveSuccess: () => void;
  onCancelEdit?: () => void;
}

export function SpieldatenbankForm({ initialData, onSaveSuccess, onCancelEdit }: SpieldatenbankFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [verein, setVerein] = useState(initialData?.verein || "")
  const [ligastatus, setLigastatus] = useState(initialData?.ligastatus || "")
  const [geschlecht, setGeschlecht] = useState(initialData?.geschlecht || "")
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setVerein(initialData.verein || "")
      setLigastatus(initialData.ligastatus || "")
      setGeschlecht(initialData.geschlecht || "")
      setFormMessage("")
      setFormMessageType("info")
    } else {
      setName("")
      setVerein("")
      setLigastatus("")
      setGeschlecht("")
      setFormMessage("")
      setFormMessageType("info")
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormMessage("Daten werden gespeichert...")
    setFormMessageType("info")

    if (!name) {
      setFormMessage("Bitte geben Sie einen Namen ein.")
      setFormMessageType("error")
      setLoading(false)
      return
    }

    try {
      const dataToSave = {
        name,
        verein: verein || null,
        ligastatus: ligastatus || null,
        geschlecht: geschlecht || null,
      }

      if (initialData?.id) {
        // Update existing entry
        const { error } = await supabase
          .from("spieldatenbank")
          .update(dataToSave)
          .eq("id", initialData.id)

        if (error) {
          throw error
        }
        setFormMessage("Spielerdaten erfolgreich aktualisiert!")
      } else {
        // Insert new entry
        const { error } = await supabase.from("spieldatenbank").insert([dataToSave])

        if (error) {
          throw error
        }
        setFormMessage("Spielerdaten erfolgreich hinzugefügt!")
      }

      setFormMessageType("success")
      onSaveSuccess() // Callback, um die Tabelle zu aktualisieren
      if (!initialData) { // Nur Formular leeren, wenn es ein neuer Eintrag war
        setName("")
        setVerein("")
        setLigastatus("")
        setGeschlecht("")
      }
    } catch (error: any) {
      setFormMessage(`Fehler beim Speichern der Daten: ${error.message}`)
      setFormMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {initialData ? "Spielerdaten bearbeiten" : "Neue Spielerdaten eingeben"}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {initialData ? "Bestehenden Spieler aktualisieren" : "Fügen Sie neue Spieler zur Datenbank hinzu"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spielername"
                className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900 transition-all duration-200"
                required
              />
            </div>

            {/* Verein */}
            <div className="space-y-2">
              <label htmlFor="verein" className="text-sm font-medium text-gray-700">
                Verein
              </label>
              <Input
                id="verein"
                type="text"
                value={verein}
                onChange={(e) => setVerein(e.target.value)}
                placeholder="Vereinsname"
                className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900 transition-all duration-200"
              />
            </div>

            {/* Ligastatus */}
            <div className="space-y-2">
              <label htmlFor="ligastatus" className="text-sm font-medium text-gray-700">
                Ligastatus
              </label>
              <Select value={ligastatus} onValueChange={setLigastatus}>
                <SelectTrigger id="ligastatus" className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900">
                  <SelectValue placeholder="Ligastatus auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NC">NC</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="R">R</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Geschlecht */}
            <div className="space-y-2">
              <label htmlFor="geschlecht" className="text-sm font-medium text-gray-700">
                Geschlecht
              </label>
              <Select value={geschlecht} onValueChange={setGeschlecht}>
                <SelectTrigger id="geschlecht" className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 bg-white text-gray-900">
                  <SelectValue placeholder="Geschlecht auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">Männlich</SelectItem>
                  <SelectItem value="w">Weiblich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Speichern läuft...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{initialData ? "Änderungen speichern" : "Daten speichern"}</span>
                  </div>
                )}
              </Button>
              {initialData && onCancelEdit && (
                <Button
                  type="button"
                  onClick={onCancelEdit}
                  variant="outline"
                  className="h-12 px-4 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 bg-transparent transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              )}
            </div>

            {/* Status Message */}
            {formMessage && (
              <div
                className={`p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formMessageType === "error"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : formMessageType === "success"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-gray-50 text-gray-700 border border-gray-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {formMessageType === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : formMessageType === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{formMessage}</span>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

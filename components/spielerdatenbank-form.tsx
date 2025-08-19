"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Define the type for a player entry
export interface SpielerdatenbankEntry {
  id?: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
  created_at?: string
}

interface SpieldatenbankFormProps {
  initialData?: SpielerdatenbankEntry | null
  onSaveSuccess: () => void
  onCancelEdit?: () => void
}

export function SpieldatenbankForm({ initialData, onSaveSuccess, onCancelEdit }: SpieldatenbankFormProps) {
  const [formData, setFormData] = useState<SpielerdatenbankEntry>(
    initialData || {
      name: "",
      verein: null,
      ligastatus: null,
      geschlecht: null,
    },
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    setFormData(
      initialData || {
        name: "",
        verein: null,
        ligastatus: null,
        geschlecht: null,
      },
    )
    setMessage(null) // Clear messages when initialData changes
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: keyof SpielerdatenbankEntry, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value === "ohne_status" ? null : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      let error = null
      if (formData.id) {
        // Update existing player
        const { error: updateError } = await supabase
          .from("spieldatenbank")
          .update({
            name: formData.name,
            verein: formData.verein,
            ligastatus: formData.ligastatus,
            geschlecht: formData.geschlecht,
          })
          .eq("id", formData.id)
        error = updateError
      } else {
        // Add new player
        const { error: insertError } = await supabase.from("spieldatenbank").insert([
          {
            name: formData.name,
            verein: formData.verein,
            ligastatus: formData.ligastatus,
            geschlecht: formData.geschlecht,
          },
        ])
        error = insertError
      }

      if (error) {
        throw error
      }

      setMessage({ type: "success", text: `Spieler erfolgreich ${formData.id ? "aktualisiert" : "hinzugefügt"}!` })
      setFormData({ name: "", verein: null, ligastatus: null, geschlecht: null }) // Reset form
      onSaveSuccess() // Notify parent component to refresh data
    } catch (err: any) {
      setMessage({ type: "error", text: `Fehler: ${err.message}` })
      console.error("Error saving player:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <CardTitle className="text-xl font-semibold text-gray-900">
            {initialData ? "Spieler bearbeiten" : "Neuen Spieler hinzufügen"}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 mt-1">
            {initialData
              ? "Bearbeiten Sie die Details des ausgewählten Spielers."
              : "Fügen Sie einen neuen Spieler zur Datenbank hinzu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-gray-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="verein" className="text-gray-700">
                Verein
              </Label>
              <Input id="verein" name="verein" value={formData.verein || ""} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ligastatus" className="text-gray-700">
                Ligastatus
              </Label>
              <Select
                name="ligastatus"
                value={formData.ligastatus || "ohne_status"}
                onValueChange={(value) => handleSelectChange("ligastatus", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Wählen Sie einen Ligastatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ohne_status">Ohne Status</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="R">R</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="NC">NC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="geschlecht" className="text-gray-700">
                Geschlecht
              </Label>
              <Select
                name="geschlecht"
                value={formData.geschlecht || "ohne_status"}
                onValueChange={(value) => handleSelectChange("geschlecht", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Wählen Sie ein Geschlecht" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ohne_status">Ohne Status</SelectItem>
                  <SelectItem value="m">Männlich</SelectItem>
                  <SelectItem value="w">Weiblich</SelectItem>
                  <SelectItem value="d">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            <div className="flex justify-end gap-3">
              {initialData && onCancelEdit && (
                <Button type="button" variant="outline" onClick={onCancelEdit} disabled={loading}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

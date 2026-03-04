"use client"

import type React from "react"
import React, { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2, Send } from "lucide-react"

interface PlayerApplicationFormProps {
  onApplicationSuccess: () => void
}

type FieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "birthDate"
    | "street"
    | "houseNumber"
    | "postalCode"
    | "city"
    | "phone",
    string
  >
>

function normalizeSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

function isValidBirthDate(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(dateStr + "T00:00:00")
  if (Number.isNaN(d.getTime())) return false

  const today = new Date()
  const min = new Date()
  min.setFullYear(today.getFullYear() - 100) // max 100 years old
  const max = new Date()
  max.setDate(today.getDate() - 1) // must be in the past

  return d >= min && d <= max
}

function isValidPostalCode(v: string) {
  const x = v.trim()
  return /^\d{4,6}$/.test(x)
}

function isValidText(v: string, minLen = 2) {
  const x = normalizeSpaces(v)
  if (x.length < minLen) return false
  return /^[A-Za-zÄÖÜäöüßÀ-ÿ\s\-.'()]+$/.test(x)
}

function isValidStreet(v: string) {
  const x = normalizeSpaces(v)
  if (x.length < 2) return false
  return /^[A-Za-zÄÖÜäöüßÀ-ÿ0-9\s\-.'()/]+$/.test(x)
}

function isValidHouseNumber(v: string) {
  const x = v.trim()
  return /^[0-9]{1,5}[A-Za-z]?([/-][0-9]{1,5}[A-Za-z]?)?$/.test(x)
}

function isValidPhone(v: string) {
  const x = v.trim()
  if (!x) return true
  const digits = x.replace(/\D/g, "")
  if (digits.length < 6) return false
  return /^[0-9+()\s-]+$/.test(x)
}

/**
 * ✅ WICHTIG: Field NICHT in PlayerApplicationForm definieren.
 * Sonst bekommt es bei jedem Render eine neue Identität -> Inputs remounten -> Fokus weg.
 */
const Field = React.memo(function Field({
  id,
  label,
  required,
  error,
  children,
  hint,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-semibold text-gray-900">
          {label} {required ? <span className="text-orange-700">*</span> : null}
        </Label>
        {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
})

export function PlayerApplicationForm({ onApplicationSuccess }: PlayerApplicationFormProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [birthDate, setBirthDate] = useState("") // required

  // Address (required)
  const [street, setStreet] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("") // Ort/Stadt

  // Contact
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Optional
  const [experience, setExperience] = useState("") // optional
  const [jerseySize, setJerseySize] = useState("") // optional
  const [playerNumber, setPlayerNumber] = useState("") // optional
  const [notes, setNotes] = useState("") // optional

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formMessage, setFormMessage] = useState("")
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | "info">("info")
  const [loading, setLoading] = useState(false)

  const requiredSnapshot = useMemo(() => {
    return {
      firstName: normalizeSpaces(firstName),
      lastName: normalizeSpaces(lastName),
      email: email.trim(),
      birthDate: birthDate.trim(),
      street: normalizeSpaces(street),
      houseNumber: houseNumber.trim(),
      postalCode: postalCode.trim(),
      city: normalizeSpaces(city),
      phone: phone.trim(),
    }
  }, [firstName, lastName, email, birthDate, street, houseNumber, postalCode, city, phone])

  function validateAll(): FieldErrors {
    const e: FieldErrors = {}

    if (!requiredSnapshot.firstName) e.firstName = "Vorname ist erforderlich."
    else if (!isValidText(requiredSnapshot.firstName, 2)) e.firstName = "Bitte einen echten Vornamen eingeben."

    if (!requiredSnapshot.lastName) e.lastName = "Nachname ist erforderlich."
    else if (!isValidText(requiredSnapshot.lastName, 2)) e.lastName = "Bitte einen echten Nachnamen eingeben."

    if (!requiredSnapshot.email) e.email = "E-Mail ist erforderlich."
    else if (!isValidEmail(requiredSnapshot.email)) e.email = "Bitte eine gültige E-Mail eingeben."

    if (!requiredSnapshot.birthDate) e.birthDate = "Geburtsdatum ist erforderlich."
    else if (!isValidBirthDate(requiredSnapshot.birthDate)) e.birthDate = "Geburtsdatum ist nicht plausibel."

    if (!requiredSnapshot.street) e.street = "Straße ist erforderlich."
    else if (!isValidStreet(requiredSnapshot.street)) e.street = "Bitte eine gültige Straße eingeben."

    if (!requiredSnapshot.houseNumber) e.houseNumber = "Hausnummer ist erforderlich."
    else if (!isValidHouseNumber(requiredSnapshot.houseNumber))
      e.houseNumber = "Bitte gültige Hausnummer (z.B. 12, 12A, 12/3)."

    if (!requiredSnapshot.postalCode) e.postalCode = "PLZ ist erforderlich."
    else if (!isValidPostalCode(requiredSnapshot.postalCode)) e.postalCode = "PLZ muss 4–6 Ziffern sein."

    if (!requiredSnapshot.city) e.city = "Ort ist erforderlich."
    else if (!isValidText(requiredSnapshot.city, 2)) e.city = "Bitte einen gültigen Ort eingeben."

    if (!isValidPhone(requiredSnapshot.phone)) e.phone = "Telefonnummer wirkt ungültig."

    return e
  }

  const canSubmit = useMemo(() => {
    const e = validateAll()
    return Object.keys(e).length === 0 && !loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredSnapshot, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setFormMessage("")
    const nextErrors = validateAll()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setFormMessage("Bitte überprüfe die markierten Felder.")
      setFormMessageType("error")
      return
    }

    setLoading(true)
    setFormMessage("Bewerbung wird gesendet…")
    setFormMessageType("info")

    try {
      const payload = {
        first_name: requiredSnapshot.firstName,
        last_name: requiredSnapshot.lastName,
        email: requiredSnapshot.email,
        birth_date: requiredSnapshot.birthDate,

        street: requiredSnapshot.street,
        house_number: requiredSnapshot.houseNumber,
        postal_code: requiredSnapshot.postalCode,
        city: requiredSnapshot.city,

        // DB hat origin: wir speichern dort einfach Ort/Stadt mit
        origin: requiredSnapshot.city,

        phone: requiredSnapshot.phone || null,

        // optional
        experience: normalizeSpaces(experience) || null,
        jersey_size: normalizeSpaces(jerseySize) || null,
        player_number: normalizeSpaces(playerNumber) || null,
        notes: normalizeSpaces(notes) || null,

        is_read: false,
      }

      const { error } = await supabase.from("player_applications").insert([payload])
      if (error) throw error

      setFormMessage("Bewerbung erfolgreich gesendet!")
      setFormMessageType("success")

      setTimeout(() => onApplicationSuccess(), 900)
    } catch (err: any) {
      setFormMessage(err?.message ? `Fehler: ${err.message}` : "Fehler beim Senden.")
      setFormMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent
      className="
        w-[calc(100vw-20px)]
        sm:max-w-[720px]
        p-0
        bg-white
        rounded-2xl
        overflow-hidden
        border border-gray-200
        shadow-2xl
        max-h-[92dvh]
        flex flex-col
      "
    >
      <DialogHeader className="px-5 sm:px-6 py-4 border-b border-gray-200 bg-white">
        <DialogTitle className="text-lg sm:text-xl font-black">Spielerbewerbung</DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          Pflichtfelder ausfüllen – optionales kannst du leer lassen.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
        {/* Person */}
        <div className="rounded-2xl border border-gray-200/70 bg-gray-50 p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="text-sm sm:text-base font-black text-gray-900">Persönliche Daten</h3>
            <p className="text-xs sm:text-sm text-gray-600">Damit wir dich kontaktieren können.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field id="firstName" label="Vorname" required error={errors.firstName}>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                className={errors.firstName ? "border-red-300 focus-visible:ring-red-300" : ""}
                autoComplete="given-name"
              />
            </Field>

            <Field id="lastName" label="Nachname" required error={errors.lastName}>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                className={errors.lastName ? "border-red-300 focus-visible:ring-red-300" : ""}
                autoComplete="family-name"
              />
            </Field>

            <Field id="email" label="E-Mail" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@mail.com"
                className={errors.email ? "border-red-300 focus-visible:ring-red-300" : ""}
                autoComplete="email"
              />
            </Field>

            <Field id="phone" label="Telefon" error={errors.phone} hint="Optional – z.B. +43 660 1234567">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+43 660 1234567"
                className={errors.phone ? "border-red-300 focus-visible:ring-red-300" : ""}
                autoComplete="tel"
              />
            </Field>

            <Field
              id="birthDate"
              label="Geburtsdatum"
              required
              error={errors.birthDate}
              hint="Muss in der Vergangenheit liegen."
            >
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={errors.birthDate ? "border-red-300 focus-visible:ring-red-300" : ""}
              />
            </Field>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="text-sm sm:text-base font-black text-gray-900">Adresse</h3>
            <p className="text-xs sm:text-sm text-gray-600">Pflicht für die Anmeldung.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
            <div className="sm:col-span-8">
              <Field id="street" label="Straße" required error={errors.street}>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Hauptstraße"
                  className={errors.street ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="address-line1"
                />
              </Field>
            </div>

            <div className="sm:col-span-4">
              <Field id="houseNumber" label="Hausnummer" required error={errors.houseNumber}>
                <Input
                  id="houseNumber"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="12A"
                  className={errors.houseNumber ? "border-red-300 focus-visible:ring-red-300" : ""}
                />
              </Field>
            </div>

            <div className="sm:col-span-4">
              <Field id="postalCode" label="PLZ" required error={errors.postalCode}>
                <Input
                  id="postalCode"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="5020"
                  className={errors.postalCode ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="postal-code"
                />
              </Field>
            </div>

            <div className="sm:col-span-8">
              <Field id="city" label="Ort / Stadt" required error={errors.city}>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Salzburg"
                  className={errors.city ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="address-level2"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Optional */}
        <div className="rounded-2xl border border-gray-200/70 bg-gray-50 p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="text-sm sm:text-base font-black text-gray-900">Optional</h3>
            <p className="text-xs sm:text-sm text-gray-600">Kannst du leer lassen.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field id="experience" label="Erfahrung">
              <Textarea
                id="experience"
                rows={4}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Anfänger, Fortgeschritten, Profi"
              />
            </Field>

            <div className="space-y-3 sm:space-y-4">
              <Field id="jerseySize" label="Trikotgröße">
                <Input
                  id="jerseySize"
                  value={jerseySize}
                  onChange={(e) => setJerseySize(e.target.value)}
                  placeholder="z.B. M / L / XL"
                />
              </Field>

              <Field id="playerNumber" label="Spielernummer (wenn vorhanden)">
                <Input
                  id="playerNumber"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  placeholder="z.B. 3588"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="notes" label="Anmerkungen">
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sonstiges…"
                />
              </Field>
            </div>
          </div>
        </div>

        {formMessage ? (
          <div
            className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              formMessageType === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : formMessageType === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            {formMessageType === "error" && <AlertCircle className="w-4 h-4" />}
            {formMessageType === "success" && <CheckCircle className="w-4 h-4" />}
            {formMessageType === "info" && <Loader2 className="w-4 h-4 animate-spin" />}
            {formMessage}
          </div>
        ) : null}

        {/* ✅ Damit der Submit-Button unten (außerhalb) via requestSubmit funktioniert */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>

      <div className="px-5 sm:px-6 py-4 border-t border-gray-200 bg-white space-y-3">
        <Button type="button" variant="outline" className="w-full" onClick={onApplicationSuccess}>
          Abbrechen
        </Button>

        <Button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.closest("[role='dialog']")?.querySelector("form")
            form?.requestSubmit()
          }}
          disabled={!canSubmit}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Bewerbung absenden
        </Button>
      </div>
    </DialogContent>
  )
}
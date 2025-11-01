"use client"

import type React from "react"

import { useState } from "react"
import { X, UserPlus, Calendar, Users, Phone, Mail, MapPin, AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface CampusRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedAgeGroup?: "kids" | "junior" | "teens"
}

export function CampusRegistrationModal({ isOpen, onClose, preselectedAgeGroup }: CampusRegistrationModalProps) {
  const [formData, setFormData] = useState({
    childFirstName: "",
    childLastName: "",
    birthDate: "",
    ageGroup: preselectedAgeGroup || "kids",
    parentFirstName: "",
    parentLastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    medicalNotes: "",
    experienceLevel: "beginner",
    startMonth: "januar",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")
    setErrorMessage("")

    try {
      const { error } = await supabase.from("campus_registrations").insert([
        {
          child_first_name: formData.childFirstName,
          child_last_name: formData.childLastName,
          birth_date: formData.birthDate,
          age_group: formData.ageGroup,
          parent_first_name: formData.parentFirstName,
          parent_last_name: formData.parentLastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          emergency_contact: formData.phone,
          emergency_phone: formData.phone,
          medical_notes: formData.medicalNotes || null,
          experience_level: formData.experienceLevel,
          start_month: formData.startMonth,
          message: formData.message || null,
          status: "pending",
        },
      ])

      if (error) throw error

      setSubmitStatus("success")
      setTimeout(() => {
        onClose()
        setFormData({
          childFirstName: "",
          childLastName: "",
          birthDate: "",
          ageGroup: preselectedAgeGroup || "kids",
          parentFirstName: "",
          parentLastName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          postalCode: "",
          medicalNotes: "",
          experienceLevel: "beginner",
          startMonth: "januar",
          message: "",
        })
        setSubmitStatus("idle")
      }, 2000)
    } catch (error: any) {
      console.error("Error submitting registration:", error)
      setSubmitStatus("error")
      setErrorMessage(error.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">EMD-CAMPUS Anmeldung</h2>
              <p className="text-orange-100 text-xs sm:text-sm">Dart Nachwuchs Akademie 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {submitStatus === "success" ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Anmeldung erfolgreich!</h3>
              <p className="text-gray-600 mb-4">
                Vielen Dank für die Anmeldung. Wir werden uns in Kürze bei dir melden.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 pb-8">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Informationen zum Kind</h3>
                    <p className="text-sm text-gray-600">Bitte gib die Daten des Kindes ein</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vorname des Kindes *</label>
                  <input
                    type="text"
                    name="childFirstName"
                    value={formData.childFirstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nachname des Kindes *</label>
                  <input
                    type="text"
                    name="childLastName"
                    value={formData.childLastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Geburtsdatum *
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Altersgruppe *</label>
                  <select
                    name="ageGroup"
                    value={formData.ageGroup}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="kids">Kids (6-10 Jahre)</option>
                    <option value="junior">Junior (11-14 Jahre)</option>
                    <option value="teens">Teens (15-18 Jahre)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dart-Erfahrung *</label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="beginner">Anfänger - noch keine Erfahrung</option>
                  <option value="intermediate">Fortgeschritten - erste Erfahrungen</option>
                  <option value="advanced">Fortgeschritten - regelmäßig gespielt</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Erziehungsberechtigte/r</h3>
                    <p className="text-sm text-gray-600">Kontaktdaten der Eltern/Erziehungsberechtigten</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vorname *</label>
                  <input
                    type="text"
                    name="parentFirstName"
                    value={formData.parentFirstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nachname *</label>
                  <input
                    type="text"
                    name="parentLastName"
                    value={formData.parentLastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Adresse *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Straße und Hausnummer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Postleitzahl *</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stadt *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medizinische Hinweise (optional)
                </label>
                <textarea
                  name="medicalNotes"
                  value={formData.medicalNotes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Allergien, Medikamente, besondere Bedürfnisse..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gewünschter Startmonat *</label>
                <select
                  name="startMonth"
                  value={formData.startMonth}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="januar">Jänner 2026</option>
                  <option value="februar">Februar 2026</option>
                  <option value="maerz">März 2026</option>
                  <option value="april">April 2026</option>
                  <option value="mai">Mai 2026</option>
                  <option value="juni">Juni 2026</option>
                  <option value="juli">Juli 2026</option>
                  <option value="august">August 2026</option>
                  <option value="september">September 2026</option>
                  <option value="oktober">Oktober 2026</option>
                  <option value="november">November 2026</option>
                  <option value="dezember">Dezember 2026</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Zusätzliche Nachricht (optional)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Fragen, Wünsche oder zusätzliche Informationen..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {submitStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-red-900 mb-1">Fehler bei der Anmeldung</h4>
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white pb-4 -mb-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 text-sm sm:text-base font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Wird gesendet..." : "Jetzt Anmelden"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

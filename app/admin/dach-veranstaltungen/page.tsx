"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"
import {
  Calendar,
  Check,
  Clock,
  Coins,
  ExternalLink,
  FileText,
  Gamepad2,
  Globe2,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type EventRow = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  country_code: string
  postal_code: string | null
  city: string
  street: string | null
  region: string | null
  organizer_name: string
  organizer_email: string | null
  organizer_phone: string | null
  registration_url: string | null
  registration_deadline: string | null
  entry_fee: number | null
  max_participants: number | null
  details: string | null
  photo_url: string | null
  mode: string | null
  discipline: string | null
  format: string | null
  startgeld_details: string | null
  event_status: string
  rejection_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—"
  return value.slice(0, 5)
}

function formatMoney(value: number | null) {
  if (value == null) return "Nicht angegeben"
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

function disciplineLabel(value: string | null) {
  if (value === "edart") return "E-Dart"
  if (value === "steeldart") return "Steel-Dart"
  if (value === "both") return "E-Dart & Steel-Dart"
  return value || "Nicht angegeben"
}

function formatLabel(value: string | null) {
  if (value === "single") return "Einzel"
  if (value === "double") return "Doppel"
  if (value === "team") return "Mannschaft"
  if (value === "mixed") return "Gemischt"
  return value || "Nicht angegeben"
}

function eventTypeLabel(value: string) {
  if (value === "tournament") return "Turnier"
  if (value === "party") return "Party"
  if (value === "meeting") return "Versammlung"
  if (value === "game_night") return "Spielabend"
  return value || "Veranstaltung"
}

function InfoItem({
  icon,
  label,
  value,
  full = false,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  full?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-gray-50 p-4 ${
        full ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-500">
        <span className="text-orange-600">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-gray-900 break-words">
        {value || "—"}
      </div>
    </div>
  )
}

async function sendApprovedMail(
  event: Pick<EventRow, "id" | "name" | "organizer_name" | "organizer_email">,
) {
  if (!event.organizer_email) return

  const response = await fetch("/api/dach-event-approved-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: event.organizer_email,
      organizerName: event.organizer_name,
      eventName: event.name,
      eventId: event.id,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || "Freigabe-Mail konnte nicht gesendet werden.")
  }
}

async function sendRejectedMail(event: EventRow, rejectionReason: string) {
  if (!event.organizer_email) return

  const response = await fetch("/api/dach-event-rejected-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: event.organizer_email,
      organizerName: event.organizer_name,
      eventName: event.name,
      eventId: event.id,
      rejectionReason,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || "Ablehnungs-Mail konnte nicht gesendet werden.")
  }
}

export default function AdminVeranstaltungenPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [savingId, setSavingId] = useState("")
  const [message, setMessage] = useState("")
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setMessage("")

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setAllowed(false)
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError || !profile?.is_admin) {
      setAllowed(false)
      setLoading(false)
      return
    }

    setAllowed(true)

    const { data, error } = await supabase
      .from("dach_events")
      .select(`
        id,
        name,
        event_type,
        event_date,
        start_date,
        end_date,
        event_time,
        location,
        country_code,
        postal_code,
        city,
        street,
        region,
        organizer_name,
        organizer_email,
        organizer_phone,
        registration_url,
        registration_deadline,
        entry_fee,
        max_participants,
        details,
        photo_url,
        mode,
        discipline,
        format,
        startgeld_details,
        event_status,
        rejection_reason,
        created_by,
        created_at,
        updated_at
      `)
      .eq("event_status", "pending")
      .order("created_at", { ascending: true })

    if (error) {
      setMessage(error.message)
      setEvents([])
    } else {
      setEvents((data || []) as EventRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function approveEvent(id: string) {
    try {
      setSavingId(id)
      setMessage("")

      const { data: authData } = await supabase.auth.getUser()

      const { data: updatedEvent, error } = await supabase
        .from("dach_events")
        .update({
          event_status: "approved",
          rejection_reason: null,
          approved_by: authData.user?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(`
          id,
          name,
          organizer_name,
          organizer_email
        `)
        .single()

      if (error) throw error

      if (!updatedEvent) {
        throw new Error("Veranstaltungsdaten konnten nicht geladen werden.")
      }

      let mailError = ""

      try {
        await sendApprovedMail(updatedEvent)
      } catch (error: any) {
        console.error("[AdminVeranstaltungen] Freigabe-Mail:", error)
        mailError =
          error?.message || "Freigabe-Mail konnte nicht gesendet werden."
      }

      setEvents((old) => old.filter((item) => item.id !== id))

      setMessage(
        mailError
          ? `Veranstaltung wurde freigegeben. Achtung: ${mailError}`
          : "Veranstaltung wurde freigegeben und der Veranstalter per E-Mail informiert.",
      )
    } catch (error: any) {
      setMessage(
        error?.message || "Veranstaltung konnte nicht freigegeben werden.",
      )
    } finally {
      setSavingId("")
    }
  }

  async function rejectEvent(id: string) {
    const reason = rejectionReasons[id]?.trim()

    if (!reason) {
      setMessage("Bitte gib vor der Ablehnung einen Grund ein.")
      return
    }

    try {
      setSavingId(id)
      setMessage("")

      const event = events.find((item) => item.id === id)

      if (!event) {
        throw new Error("Veranstaltung wurde nicht gefunden.")
      }

      const { error } = await supabase
        .from("dach_events")
        .update({
          event_status: "rejected",
          rejection_reason: reason,
          approved_by: null,
          approved_at: null,
        })
        .eq("id", id)

      if (error) throw error

      let mailError = ""

      try {
        await sendRejectedMail(event, reason)
      } catch (error: any) {
        console.error("[AdminVeranstaltungen] Ablehnungs-Mail:", error)
        mailError = error?.message || "Ablehnungs-Mail konnte nicht gesendet werden."
      }

      setEvents((old) => old.filter((item) => item.id !== id))
      setRejectionReasons((old) => {
        const next = { ...old }
        delete next[id]
        return next
      })

      setMessage(
        mailError
          ? `Veranstaltung wurde abgelehnt. Achtung: ${mailError}`
          : "Veranstaltung wurde abgelehnt und der Veranstalter per E-Mail informiert.",
      )
    } catch (error: any) {
      setMessage(error?.message || "Veranstaltung konnte nicht abgelehnt werden.")
    } finally {
      setSavingId("")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />

      <main className="pt-16 px-4">
        <div className="mx-auto max-w-6xl py-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase text-orange-600">
                DACH-Veranstaltungen
              </div>
              <h1 className="text-2xl font-black mt-1">
                Veranstaltungen freigeben
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Alle Angaben kontrollieren, Flyer prüfen und anschließend freigeben oder mit Begründung ablehnen.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Aktualisieren
            </Button>
          </div>

          {loading || allowed === null ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
            </div>
          ) : !allowed ? (
            <Card className="mt-5 rounded-3xl">
              <CardContent className="py-14 text-center">
                <ShieldAlert className="w-12 h-12 mx-auto text-red-600 mb-3" />
                <h2 className="text-xl font-black">Kein Admin-Zugriff</h2>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 space-y-5">
              {message ? (
                <div
                  className={
                    message.includes("konnte nicht") ||
                    message.includes("Bitte") ||
                    message.includes("Achtung")
                      ? "rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 font-semibold"
                      : "rounded-xl bg-green-50 border border-green-200 p-3 text-green-800 font-semibold"
                  }
                >
                  {message}
                </div>
              ) : null}

              {events.length === 0 ? (
                <Card className="rounded-3xl">
                  <CardContent className="py-14 text-center text-gray-600">
                    Aktuell wartet keine Veranstaltung auf Freigabe.
                  </CardContent>
                </Card>
              ) : (
                events.map((event) => {
                  const isImage =
                    event.photo_url &&
                    !event.photo_url.toLowerCase().endsWith(".pdf")

                  const fullAddress = [
                    event.street,
                    [event.postal_code, event.city].filter(Boolean).join(" "),
                    event.region,
                    COUNTRY_NAMES[event.country_code] || event.country_code,
                  ]
                    .filter(Boolean)
                    .join(", ")

                  return (
                    <Card
                      key={event.id}
                      className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm"
                    >
                      <div className="grid lg:grid-cols-[320px_1fr]">
                        <div className="relative min-h-[300px] bg-slate-900">
                          {isImage ? (
                            <Image
                              src={event.photo_url!}
                              alt={event.name}
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
                              <FileText className="w-12 h-12 mb-3 opacity-80" />
                              <div className="font-black">
                                {event.photo_url
                                  ? "PDF-Flyer vorhanden"
                                  : "Kein Flyer hochgeladen"}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <CardHeader className="pb-3">
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className="bg-orange-600 text-white">
                                In Prüfung
                              </Badge>
                              <Badge variant="outline">
                                {eventTypeLabel(event.event_type)}
                              </Badge>
                              <Badge variant="outline">
                                {disciplineLabel(event.discipline || event.mode)}
                              </Badge>
                              <Badge variant="outline">
                                {formatLabel(event.format)}
                              </Badge>
                            </div>

                            <CardTitle className="text-2xl font-black">
                              {event.name}
                            </CardTitle>

                            <p className="text-xs text-gray-500">
                              Eingereicht am {formatDateTime(event.created_at)}
                              {event.updated_at !== event.created_at
                                ? ` · zuletzt geändert am ${formatDateTime(event.updated_at)}`
                                : ""}
                            </p>
                          </CardHeader>

                          <CardContent className="pt-0 pb-6">
                            <div className="grid md:grid-cols-2 gap-3">
                              <InfoItem
                                icon={<Calendar className="w-4 h-4" />}
                                label="Datum"
                                value={
                                  event.start_date === event.end_date
                                    ? formatDate(event.start_date)
                                    : `${formatDate(event.start_date)} bis ${formatDate(event.end_date)}`
                                }
                              />

                              <InfoItem
                                icon={<Clock className="w-4 h-4" />}
                                label="Beginn"
                                value={`${formatTime(event.event_time)} Uhr`}
                              />

                              <InfoItem
                                icon={<MapPin className="w-4 h-4" />}
                                label="Vollständige Adresse"
                                value={fullAddress || event.location || "—"}
                                full
                              />

                              <InfoItem
                                icon={<Globe2 className="w-4 h-4" />}
                                label="Land"
                                value={
                                  COUNTRY_NAMES[event.country_code] ||
                                  event.country_code
                                }
                              />

                              <InfoItem
                                icon={<MapPin className="w-4 h-4" />}
                                label="Bundesland / Kanton"
                                value={event.region || "Nicht angegeben"}
                              />

                              <InfoItem
                                icon={<Trophy className="w-4 h-4" />}
                                label="Dartart"
                                value={disciplineLabel(
                                  event.discipline || event.mode,
                                )}
                              />

                              <InfoItem
                                icon={<Gamepad2 className="w-4 h-4" />}
                                label="Spielform"
                                value={formatLabel(event.format)}
                              />

                              <InfoItem
                                icon={<Coins className="w-4 h-4" />}
                                label="Startgeld / Eintritt"
                                value={
                                  <div className="space-y-1">
                                    <div>{formatMoney(event.entry_fee)}</div>
                                    {event.startgeld_details ? (
                                      <div className="text-xs font-medium text-gray-600 whitespace-pre-line">
                                        {event.startgeld_details}
                                      </div>
                                    ) : null}
                                  </div>
                                }
                              />

                              <InfoItem
                                icon={<Users className="w-4 h-4" />}
                                label="Maximale Teilnehmer"
                                value={
                                  event.max_participants
                                    ? event.max_participants
                                    : "Nicht begrenzt / nicht angegeben"
                                }
                              />

                              <InfoItem
                                icon={<UserRound className="w-4 h-4" />}
                                label="Veranstalter"
                                value={event.organizer_name}
                              />

                              <InfoItem
                                icon={<Mail className="w-4 h-4" />}
                                label="E-Mail"
                                value={
                                  event.organizer_email ? (
                                    <a
                                      href={`mailto:${event.organizer_email}`}
                                      className="text-blue-700 hover:underline"
                                    >
                                      {event.organizer_email}
                                    </a>
                                  ) : (
                                    "Nicht angegeben"
                                  )
                                }
                              />

                              <InfoItem
                                icon={<Phone className="w-4 h-4" />}
                                label="Telefon"
                                value={
                                  event.organizer_phone ? (
                                    <a
                                      href={`tel:${event.organizer_phone}`}
                                      className="text-blue-700 hover:underline"
                                    >
                                      {event.organizer_phone}
                                    </a>
                                  ) : (
                                    "Nicht angegeben"
                                  )
                                }
                              />

                              <InfoItem
                                icon={<Calendar className="w-4 h-4" />}
                                label="Anmeldeschluss"
                                value={formatDateTime(
                                  event.registration_deadline,
                                )}
                              />

                              <InfoItem
                                icon={<LinkIcon className="w-4 h-4" />}
                                label="Anmeldelink"
                                value={
                                  event.registration_url ? (
                                    <a
                                      href={event.registration_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-700 hover:underline break-all"
                                    >
                                      {event.registration_url}
                                    </a>
                                  ) : (
                                    "Nicht angegeben"
                                  )
                                }
                                full
                              />

                              <InfoItem
                                icon={<FileText className="w-4 h-4" />}
                                label="Beschreibung / weitere Angaben"
                                value={
                                  event.details ? (
                                    <div className="whitespace-pre-line font-medium text-gray-700">
                                      {event.details}
                                    </div>
                                  ) : (
                                    "Keine zusätzlichen Angaben"
                                  )
                                }
                                full
                              />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {event.photo_url ? (
                                <Button asChild variant="outline">
                                  <a
                                    href={event.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Flyer vollständig öffnen
                                  </a>
                                </Button>
                              ) : null}

                              {event.registration_url ? (
                                <Button asChild variant="outline">
                                  <a
                                    href={event.registration_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Anmeldung prüfen
                                  </a>
                                </Button>
                              ) : null}
                            </div>

                            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                              <label className="text-sm font-black text-gray-900">
                                Ablehnungsgrund
                              </label>
                              <p className="text-xs text-gray-600 mt-1 mb-3">
                                Wird dem Einreicher bei einer Ablehnung angezeigt.
                              </p>
                              <Textarea
                                value={rejectionReasons[event.id] || ""}
                                onChange={(e) =>
                                  setRejectionReasons((old) => ({
                                    ...old,
                                    [event.id]: e.target.value,
                                  }))
                                }
                                placeholder="z. B. Bitte vollständige Adresse ergänzen oder einen lesbaren Flyer hochladen."
                                className="min-h-[90px] bg-white rounded-xl"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <Button
                                onClick={() => void approveEvent(event.id)}
                                disabled={savingId === event.id}
                                className="bg-green-600 hover:bg-green-700 rounded-xl"
                              >
                                {savingId === event.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 mr-2" />
                                )}
                                Veranstaltung freigeben
                              </Button>

                              <Button
                                variant="destructive"
                                onClick={() => void rejectEvent(event.id)}
                                disabled={savingId === event.id}
                                className="rounded-xl"
                              >
                                {savingId === event.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Mit Begründung ablehnen
                              </Button>
                            </div>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

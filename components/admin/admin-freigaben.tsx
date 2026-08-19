"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
  Tag,
  Trophy,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

type Tab = "dach" | "marketplace"

type DachEvent = {
  id: string
  name: string
  start_date: string
  end_date: string
  event_time: string | null
  location: string | null
  country_code: string
  postal_code: string | null
  city: string
  region: string | null
  organizer_name: string
  organizer_email: string | null
  organizer_phone: string | null
  entry_fee: number | null
  startgeld_details: string | null
  discipline: string | null
  format: string | null
  details: string | null
  photo_url: string | null
  created_at: string
}

type ListingImage = {
  id: string
  image_url: string
  sort_order: number
}

type MarketplaceListing = {
  id: string
  title: string
  category: string
  description: string | null
  condition: string
  price: number | null
  price_type: string
  currency: string
  city: string
  postal_code: string | null
  country_code: string
  seller_name: string
  seller_email: string | null
  seller_phone: string | null
  created_at: string
  dart_marketplace_images: ListingImage[] | null
}

const categoryLabels: Record<string, string> = {
  complete_darts: "Komplette Darts",
  barrels: "Barrels",
  shafts: "Schäfte",
  flights: "Flights",
  tips: "Spitzen",
  boards: "Dartscheiben",
  machines: "Dartautomaten",
  lighting: "Beleuchtung",
  surrounds: "Surrounds",
  mats: "Dartmatten",
  cases: "Taschen & Cases",
  spare_parts: "Ersatzteile",
  other: "Sonstiges",
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

function formatMoney(value: number | null, currency = "EUR") {
  if (value == null) return "Preis nicht angegeben"
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency,
  }).format(value)
}

async function sendDachApprovedMail(event: DachEvent) {
  if (!event.organizer_email) return
  const response = await fetch("/api/dach-event-approved-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: event.organizer_email,
      organizerName: event.organizer_name,
      eventName: event.name,
      eventId: event.id,
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || "Freigabe-Mail konnte nicht gesendet werden.")
  }
}

async function sendDachRejectedMail(event: DachEvent, reason: string) {
  if (!event.organizer_email) return
  const response = await fetch("/api/dach-event-rejected-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: event.organizer_email,
      organizerName: event.organizer_name,
      eventName: event.name,
      eventId: event.id,
      rejectionReason: reason,
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || "Ablehnungs-Mail konnte nicht gesendet werden.")
  }
}

export function AdminApprovalsManagement() {
  const [tab, setTab] = useState<Tab>("dach")
  const [dachEvents, setDachEvents] = useState<DachEvent[]>([])
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [message, setMessage] = useState("")
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const counts = useMemo(
    () => ({
      dach: dachEvents.length,
      marketplace: listings.length,
      total: dachEvents.length + listings.length,
    }),
    [dachEvents, listings],
  )

  async function load() {
    setLoading(true)
    setMessage("")

    const [dachRes, marketRes] = await Promise.all([
      supabase
        .from("dach_events")
        .select(
          "id,name,start_date,end_date,event_time,location,country_code,postal_code,city,region,organizer_name,organizer_email,organizer_phone,entry_fee,startgeld_details,discipline,format,details,photo_url,created_at",
        )
        .eq("event_status", "pending")
        .order("created_at", { ascending: true }),

      supabase
        .from("dart_marketplace_listings")
        .select(
          "id,title,category,description,condition,price,price_type,currency,city,postal_code,country_code,seller_name,seller_email,seller_phone,created_at,dart_marketplace_images(id,image_url,sort_order)",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ])

    if (dachRes.error) setMessage(`DACH: ${dachRes.error.message}`)
    if (marketRes.error) {
      setMessage((old) =>
        old ? `${old} · Dartbörse: ${marketRes.error.message}` : `Dartbörse: ${marketRes.error.message}`,
      )
    }

    setDachEvents((dachRes.data || []) as DachEvent[])
    setListings((marketRes.data || []) as MarketplaceListing[])
    setLoading(false)
  }

  useEffect(() => {
    void load()

    const channel = supabase
      .channel("admin-approvals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "dach_events" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "dart_marketplace_listings" }, () => void load())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  async function approveDach(event: DachEvent) {
    try {
      setSavingId(event.id)
      setMessage("")

      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from("dach_events")
        .update({
          event_status: "approved",
          rejection_reason: null,
          approved_by: auth.user?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", event.id)

      if (error) throw error

      let mailWarning = ""
      try {
        await sendDachApprovedMail(event)
      } catch (error: any) {
        mailWarning = error?.message || "E-Mail konnte nicht gesendet werden."
      }

      setDachEvents((old) => old.filter((item) => item.id !== event.id))
      setMessage(
        mailWarning
          ? `DACH-Turnier freigegeben. Hinweis: ${mailWarning}`
          : "DACH-Turnier wurde freigegeben und der Veranstalter informiert.",
      )
    } catch (error: any) {
      setMessage(error?.message || "DACH-Turnier konnte nicht freigegeben werden.")
    } finally {
      setSavingId("")
    }
  }

  async function rejectDach(event: DachEvent) {
    const reason = reasons[`dach:${event.id}`]?.trim()
    if (!reason) {
      setMessage("Bitte zuerst einen Ablehnungsgrund eingeben.")
      return
    }

    try {
      setSavingId(event.id)
      setMessage("")

      const { error } = await supabase
        .from("dach_events")
        .update({
          event_status: "rejected",
          rejection_reason: reason,
          approved_by: null,
          approved_at: null,
        })
        .eq("id", event.id)

      if (error) throw error

      let mailWarning = ""
      try {
        await sendDachRejectedMail(event, reason)
      } catch (error: any) {
        mailWarning = error?.message || "E-Mail konnte nicht gesendet werden."
      }

      setDachEvents((old) => old.filter((item) => item.id !== event.id))
      setMessage(
        mailWarning
          ? `DACH-Turnier abgelehnt. Hinweis: ${mailWarning}`
          : "DACH-Turnier wurde abgelehnt und der Veranstalter informiert.",
      )
    } catch (error: any) {
      setMessage(error?.message || "DACH-Turnier konnte nicht abgelehnt werden.")
    } finally {
      setSavingId("")
    }
  }

  async function updateListing(listing: MarketplaceListing, status: "approved" | "rejected") {
    const reason = status === "rejected" ? reasons[`market:${listing.id}`]?.trim() : null

    if (status === "rejected" && !reason) {
      setMessage("Bitte zuerst einen Ablehnungsgrund eingeben.")
      return
    }

    try {
      setSavingId(listing.id)
      setMessage("")

      const { error } = await supabase
        .from("dart_marketplace_listings")
        .update({
          status,
          rejection_reason: reason,
        })
        .eq("id", listing.id)

      if (error) throw error

      setListings((old) => old.filter((item) => item.id !== listing.id))
      setMessage(status === "approved" ? "Dartbörsen-Inserat wurde freigegeben." : "Dartbörsen-Inserat wurde abgelehnt.")
    } catch (error: any) {
      setMessage(error?.message || "Inserat konnte nicht bearbeitet werden.")
    } finally {
      setSavingId("")
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-black">Freigaben</h2>
              {counts.total > 0 ? (
                <Badge className="bg-red-600 text-white">{counts.total}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              DACH-Turniere und Dartbörsen-Inserate zentral prüfen.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("dach")}
          className={`rounded-xl px-3 py-3 text-sm font-black transition ${
            tab === "dach" ? "bg-orange-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
        >
          DACH-Turniere
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === "dach" ? "bg-white/20" : "bg-orange-100 text-orange-800"}`}>
            {counts.dach}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("marketplace")}
          className={`rounded-xl px-3 py-3 text-sm font-black transition ${
            tab === "marketplace" ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
        >
          Dartbörse
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === "marketplace" ? "bg-white/20" : "bg-slate-200 text-slate-800"}`}>
            {counts.marketplace}
          </span>
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-orange-600" />
        </div>
      ) : tab === "dach" ? (
        dachEvents.length === 0 ? (
          <EmptyState text="Keine offenen DACH-Turniere." />
        ) : (
          <div className="space-y-4">
            {dachEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden rounded-2xl border-gray-200">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[220px_1fr]">
                    <PreviewImage src={event.photo_url} alt={event.name} fallbackIcon="trophy" />

                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                          <Globe2 className="mr-1 h-3.5 w-3.5" /> DACH
                        </Badge>
                        <Badge variant="outline">{event.country_code}</Badge>
                        <span className="text-xs font-semibold text-gray-500">
                          eingereicht {formatDateTime(event.created_at)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black text-gray-950">{event.name}</h3>

                      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                        <div><strong>Datum:</strong> {formatDate(event.start_date)}{event.end_date !== event.start_date ? ` – ${formatDate(event.end_date)}` : ""}</div>
                        <div><strong>Uhrzeit:</strong> {(event.event_time || "—").slice(0, 5)}</div>
                        <div className="sm:col-span-2 flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                          {[event.postal_code, event.city, event.region].filter(Boolean).join(" · ") || event.location || "—"}
                        </div>
                        <div><strong>Veranstalter:</strong> {event.organizer_name}</div>
                        <div><strong>Startgeld:</strong> {event.startgeld_details || formatMoney(event.entry_fee)}</div>
                      </div>

                      {event.details ? <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{event.details}</p> : null}

                      <Textarea
                        value={reasons[`dach:${event.id}`] || ""}
                        onChange={(e) => setReasons((old) => ({ ...old, [`dach:${event.id}`]: e.target.value }))}
                        placeholder="Ablehnungsgrund (nur bei Ablehnung notwendig)"
                        className="mt-4 rounded-xl"
                      />

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          onClick={() => void approveDach(event)}
                          disabled={savingId === event.id}
                          className="rounded-xl bg-green-600 hover:bg-green-700"
                        >
                          {savingId === event.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Freigeben
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void rejectDach(event)}
                          disabled={savingId === event.id}
                          className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Ablehnen
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : listings.length === 0 ? (
        <EmptyState text="Keine offenen Dartbörsen-Inserate." />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const firstImage = [...(listing.dart_marketplace_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || null

            return (
              <Card key={listing.id} className="overflow-hidden rounded-2xl border-gray-200">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[220px_1fr]">
                    <PreviewImage src={firstImage} alt={listing.title} fallbackIcon="package" />

                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                          <Tag className="mr-1 h-3.5 w-3.5" /> Dartbörse
                        </Badge>
                        <Badge variant="outline">{categoryLabels[listing.category] || listing.category}</Badge>
                        <span className="text-xs font-semibold text-gray-500">
                          eingereicht {formatDateTime(listing.created_at)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black text-gray-950">{listing.title}</h3>
                      <div className="mt-2 text-2xl font-black">{formatMoney(listing.price, listing.currency || "EUR")}</div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                        <div><strong>Verkäufer:</strong> {listing.seller_name}</div>
                        <div><strong>Ort:</strong> {[listing.postal_code, listing.city, listing.country_code].filter(Boolean).join(" · ")}</div>
                      </div>

                      {listing.description ? <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{listing.description}</p> : null}

                      <Textarea
                        value={reasons[`market:${listing.id}`] || ""}
                        onChange={(e) => setReasons((old) => ({ ...old, [`market:${listing.id}`]: e.target.value }))}
                        placeholder="Ablehnungsgrund (nur bei Ablehnung notwendig)"
                        className="mt-4 rounded-xl"
                      />

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          onClick={() => void updateListing(listing, "approved")}
                          disabled={savingId === listing.id}
                          className="rounded-xl bg-green-600 hover:bg-green-700"
                        >
                          {savingId === listing.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Freigeben
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void updateListing(listing, "rejected")}
                          disabled={savingId === listing.id}
                          className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Ablehnen
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-14 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <div className="mt-3 font-black text-gray-900">{text}</div>
      <div className="mt-1 text-sm text-gray-500">Aktuell ist nichts zu prüfen.</div>
    </div>
  )
}

function PreviewImage({
  src,
  alt,
  fallbackIcon,
}: {
  src: string | null
  alt: string
  fallbackIcon: "trophy" | "package"
}) {
  return (
    <div className="relative min-h-44 bg-gradient-to-br from-slate-900 to-slate-700">
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="220px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          {fallbackIcon === "trophy" ? <Trophy className="h-12 w-12" /> : <PackageSearch className="h-12 w-12" />}
        </div>
      )}
    </div>
  )
}

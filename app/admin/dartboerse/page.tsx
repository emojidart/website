"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Status = "draft" | "pending" | "approved" | "reserved" | "sold" | "rejected"
type FilterStatus = "all" | Status

type ListingImage = {
  id: string
  image_url: string
  sort_order: number
}

type Listing = {
  id: string
  title: string
  category: string
  description: string | null
  condition: string
  price: number | null
  price_type: string
  currency: string
  country_code: string
  postal_code: string | null
  city: string
  shipping_available: boolean
  pickup_available: boolean
  seller_name: string
  seller_email: string | null
  seller_phone: string | null
  status: Status
  rejection_reason: string | null
  created_at: string
  updated_at: string
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

const conditionLabels: Record<string, string> = {
  new: "Neu",
  like_new: "Neuwertig",
  good: "Gut",
  used: "Gebraucht",
  defective: "Defekt / Bastler",
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "border-gray-200 bg-gray-100 text-gray-700" },
  pending: { label: "Offen", className: "border-amber-200 bg-amber-50 text-amber-800" },
  approved: { label: "Freigegeben", className: "border-green-200 bg-green-50 text-green-800" },
  reserved: { label: "Reserviert", className: "border-blue-200 bg-blue-50 text-blue-800" },
  sold: { label: "Verkauft", className: "border-slate-200 bg-slate-100 text-slate-700" },
  rejected: { label: "Abgelehnt", className: "border-red-200 bg-red-50 text-red-800" },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(listing: Listing) {
  if (listing.price_type === "free") return "Zu verschenken"
  if (listing.price == null) return "Preis auf Anfrage"
  const value = new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: listing.currency || "EUR",
  }).format(listing.price)
  return listing.price_type === "negotiable" ? `${value} VB` : value
}

export default function AdminDartboersePage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [message, setMessage] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [rejectListing, setRejectListing] = useState<Listing | null>(null)
  const [deleteListing, setDeleteListing] = useState<Listing | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  async function loadListings() {
    setLoading(true)
    setMessage("")

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      router.push("/guest-login")
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (profileError || !profile?.is_admin) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("dart_marketplace_listings")
      .select("*,dart_marketplace_images(id,image_url,sort_order)")
      .order("created_at", { ascending: false })

    if (error) setMessage(error.message)
    setListings((data || []) as Listing[])
    setLoading(false)
  }

  useEffect(() => {
    void loadListings()
  }, [])

  const counts = useMemo(() => {
    return {
      all: listings.length,
      pending: listings.filter((item) => item.status === "pending").length,
      approved: listings.filter((item) => item.status === "approved").length,
      rejected: listings.filter((item) => item.status === "rejected").length,
    }
  }, [listings])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return listings.filter((listing) => {
      if (statusFilter !== "all" && listing.status !== statusFilter) return false
      if (!search) return true
      return [
        listing.title,
        listing.city,
        listing.postal_code,
        listing.seller_name,
        listing.seller_email,
        categoryLabels[listing.category],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    })
  }, [listings, query, statusFilter])

  async function updateStatus(id: string, status: Status, rejectionReasonValue: string | null = null) {
    setSavingId(id)
    setMessage("")

    const { error } = await supabase
      .from("dart_marketplace_listings")
      .update({
        status,
        rejection_reason: rejectionReasonValue,
        reserved_at: status === "reserved" ? new Date().toISOString() : null,
        sold_at: status === "sold" ? new Date().toISOString() : null,
      })
      .eq("id", id)

    if (error) {
      setMessage(error.message)
    } else {
      setRejectListing(null)
      setRejectionReason("")
      await loadListings()
    }

    setSavingId(null)
  }

  async function removeListing() {
    if (!deleteListing) return
    setSavingId(deleteListing.id)
    setMessage("")

    const { error } = await supabase
      .from("dart_marketplace_listings")
      .delete()
      .eq("id", deleteListing.id)

    if (error) {
      setMessage(error.message)
    } else {
      setDeleteListing(null)
      await loadListings()
    }

    setSavingId(null)
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header />
        <main className="mx-auto max-w-lg px-4 pt-24">
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-orange-600" />
              <h1 className="mt-4 text-2xl font-black">Kein Admin-Zugriff</h1>
              <p className="mt-2 text-gray-600">Diese Seite ist nur für Administratoren freigeschaltet.</p>
              <Button className="mt-6 rounded-xl" onClick={() => router.push("/dartboerse")}>Zur Dartbörse</Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-20">
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>

        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <PackageSearch className="h-7 w-7 text-orange-300" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Administration</div>
                <h1 className="mt-1 text-3xl font-black sm:text-4xl">Dartbörse verwalten</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Inserate prüfen, freigeben, ablehnen oder dauerhaft entfernen.</p>
              </div>
            </div>
            <Button variant="secondary" className="rounded-2xl" onClick={() => void loadListings()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Neu laden
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { key: "all", label: "Gesamt", value: counts.all, icon: PackageSearch },
            { key: "pending", label: "Offen", value: counts.pending, icon: Clock3 },
            { key: "approved", label: "Freigegeben", value: counts.approved, icon: CheckCircle2 },
            { key: "rejected", label: "Abgelehnt", value: counts.rejected, icon: XCircle },
          ].map((item) => {
            const Icon = item.icon
            const active = statusFilter === item.key
            return (
              <button key={item.key} type="button" onClick={() => setStatusFilter(item.key as FilterStatus)} className="text-left">
                <Card className={`rounded-2xl transition ${active ? "border-orange-400 ring-2 ring-orange-100" : "hover:border-gray-300"}`}>
                  <CardContent className="p-4">
                    <Icon className={`h-5 w-5 ${active ? "text-orange-600" : "text-gray-400"}`} />
                    <div className="mt-2 text-2xl font-black">{item.value}</div>
                    <div className="text-xs font-black uppercase tracking-wide text-gray-500">{item.label}</div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>

        <Card className="rounded-3xl border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Inserat, Verkäufer, E-Mail oder Ort suchen …"
                className="h-12 rounded-2xl pl-12"
              />
            </div>
            <div className="mt-3 text-xs font-semibold text-gray-500">{filtered.length} Inserat(e) angezeigt</div>
          </CardContent>
        </Card>

        {message ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{message}</div> : null}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /></div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl"><CardContent className="p-12 text-center"><PackageSearch className="mx-auto h-11 w-11 text-gray-300" /><h2 className="mt-4 text-xl font-black">Keine passenden Inserate</h2><p className="mt-1 text-sm text-gray-500">Ändere den Statusfilter oder den Suchbegriff.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((listing) => {
              const image = [...(listing.dart_marketplace_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]
              const busy = savingId === listing.id
              const config = statusConfig[listing.status]

              return (
                <Card key={listing.id} className="overflow-hidden rounded-3xl border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex min-h-52">
                      <div className="w-32 flex-shrink-0 bg-slate-100 sm:w-44">
                        {image ? <img src={image.image_url} alt={listing.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><PackageSearch className="h-10 w-10 text-slate-300" /></div>}
                      </div>
                      <div className="min-w-0 flex-1 p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-black uppercase tracking-wide text-orange-600">{categoryLabels[listing.category] || listing.category}</div>
                            <h2 className="mt-1 line-clamp-2 text-xl font-black leading-tight">{listing.title}</h2>
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${config.className}`}>{config.label}</Badge>
                        </div>

                        <div className="mt-3 text-xl font-black text-gray-900">{formatPrice(listing)}</div>
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600"><MapPin className="h-4 w-4 text-orange-600" /> {[listing.postal_code, listing.city, listing.country_code].filter(Boolean).join(" · ")}</div>
                        <div className="mt-1 text-sm text-gray-600">Zustand: <strong>{conditionLabels[listing.condition] || listing.condition}</strong></div>
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                          <div><strong>Verkäufer:</strong> {listing.seller_name}</div>
                          <div className="mt-1"><strong>Kontakt:</strong> {listing.seller_email || listing.seller_phone || "Keine Angabe"}</div>
                          <div className="mt-1"><strong>Eingereicht:</strong> {formatDate(listing.created_at)}</div>
                        </div>

                        {listing.description ? <p className="mt-3 line-clamp-3 text-sm text-gray-600">{listing.description}</p> : null}
                        {listing.status === "rejected" && listing.rejection_reason ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">Ablehnungsgrund: {listing.rejection_reason}</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t bg-gray-50 p-3">
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/dartboerse/${listing.id}`} target="_blank"><Eye className="mr-1.5 h-4 w-4" /> Vorschau <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
                      </Button>

                      {listing.status !== "approved" ? (
                        <Button size="sm" disabled={busy} className="rounded-xl bg-green-600 hover:bg-green-700" onClick={() => void updateStatus(listing.id, "approved", null)}>
                          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} Freigeben
                        </Button>
                      ) : null}

                      {listing.status !== "rejected" ? (
                        <Button size="sm" variant="outline" disabled={busy} className="rounded-xl border-red-200 text-red-700 hover:bg-red-50" onClick={() => { setRejectListing(listing); setRejectionReason(listing.rejection_reason || "") }}>
                          <XCircle className="mr-1.5 h-4 w-4" /> Ablehnen
                        </Button>
                      ) : null}

                      <Button size="sm" variant="ghost" disabled={busy} className="rounded-xl text-red-600" onClick={() => setDeleteListing(listing)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Löschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <AlertDialog open={Boolean(rejectListing)} onOpenChange={(open) => { if (!open && !savingId) { setRejectListing(null); setRejectionReason("") } }}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Inserat ablehnen?</AlertDialogTitle>
            <AlertDialogDescription>Der Verkäufer sieht den Grund unter „Meine Angebote“ und kann das Inserat anschließend bearbeiten und erneut einreichen.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-black">Grund der Ablehnung *</label>
            <Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="z. B. unklare Beschreibung, falsche Kategorie oder ungeeignete Bilder" className="min-h-28 rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(savingId)} className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(savingId) || !rejectionReason.trim()}
              className="rounded-xl bg-red-600 hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault()
                if (rejectListing && rejectionReason.trim()) void updateStatus(rejectListing.id, "rejected", rejectionReason.trim())
              }}
            >
              {savingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Inserat ablehnen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteListing)} onOpenChange={(open) => { if (!open && !savingId) setDeleteListing(null) }}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100"><Trash2 className="h-7 w-7 text-red-600" /></div>
            <AlertDialogTitle className="text-center">Inserat dauerhaft löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">„{deleteListing?.title}“ und die zugehörigen Daten werden dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Diese Aktion kann nicht rückgängig gemacht werden.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(savingId)} className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(savingId)} className="rounded-xl bg-red-600 hover:bg-red-700" onClick={(event) => { event.preventDefault(); void removeListing() }}>
              {savingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Dauerhaft löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  )
}

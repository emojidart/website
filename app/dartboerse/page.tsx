"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowUpDown, Box, Images, MapPin, PackageCheck, Plus, Search, SlidersHorizontal, Tag, Truck } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Listing = {
  id: string
  title: string
  category: string
  condition: string
  price: number | null
  price_type: string
  city: string
  region: string | null
  country_code: string
  shipping_available: boolean
  pickup_available: boolean
  status: "approved" | "reserved" | "sold"
  created_at: string
  image_url?: string | null
  image_urls?: string[]
  image_count?: number
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
  mats: "Matten",
  cases: "Taschen & Cases",
  spare_parts: "Ersatzteile",
  other: "Sonstiges",
}

const conditionLabels: Record<string, string> = {
  new: "Neu",
  like_new: "Wie neu",
  good: "Gut",
  used: "Gebraucht",
  defective: "Defekt",
}

function priceLabel(item: Listing) {
  if (item.price_type === "free") return "Zu verschenken"
  if (item.price == null) return "Preis auf Anfrage"
  const suffix = item.price_type === "negotiable" ? " VB" : ""
  return `${item.price.toLocaleString("de-AT", { style: "currency", currency: "EUR" })}${suffix}`
}

export default function DartboersePage() {
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [condition, setCondition] = useState("all")
  const [country, setCountry] = useState("all")
  const [region, setRegion] = useState("all")
  const [shipping, setShipping] = useState("all")
  const [sort, setSort] = useState("newest")
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("dart_marketplace_listings")
        .select("id,title,category,condition,price,price_type,city,region,country_code,shipping_available,pickup_available,status,created_at")
        .in("status", ["approved", "reserved", "sold"])
        .order("created_at", { ascending: false })

      if (!active) return
      if (error) {
        console.error("[Dartboerse] Listings:", error)
        setItems([])
        setLoading(false)
        return
      }

      const rows = (data || []) as Listing[]
      const ids = rows.map((row) => row.id)
      const { data: images } = ids.length
        ? await supabase.from("dart_marketplace_images").select("listing_id,image_url,sort_order").in("listing_id", ids).order("sort_order")
        : { data: [] as any[] }

      const imagesByListing = new Map<string, string[]>()

      for (const image of images || []) {
        const current = imagesByListing.get(image.listing_id) || []
        current.push(image.image_url)
        imagesByListing.set(image.listing_id, current)
      }

      setItems(
        rows.map((row) => {
          const imageUrls = imagesByListing.get(row.id) || []
          return {
            ...row,
            image_url: imageUrls[0] || null,
            image_urls: imageUrls,
            image_count: imageUrls.length,
          }
        }),
      )
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const availableRegions = useMemo(() => {
    return Array.from(
      new Set(
        items
          .filter((item) => country === "all" || item.country_code === country)
          .map((item) => item.region?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b, "de"))
  }, [items, country])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return items
      .filter((item) => !search || `${item.title} ${item.city} ${item.region || ""} ${categoryLabels[item.category] || item.category}`.toLowerCase().includes(search))
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => condition === "all" || item.condition === condition)
      .filter((item) => country === "all" || item.country_code === country)
      .filter((item) => region === "all" || item.region === region)
      .filter((item) => shipping === "all" || (shipping === "shipping" ? item.shipping_available : item.pickup_available))
      .sort((a, b) => {
        if (sort === "price_asc") return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)
        if (sort === "price_desc") return (b.price ?? -1) - (a.price ?? -1)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [items, query, category, condition, country, region, shipping, sort])

  const activeFilters = [category, condition, country, region, shipping].filter((value) => value !== "all").length

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <Header />
      <main className="mx-auto max-w-screen-xl px-4 pt-20">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-200">
                <Tag className="h-3.5 w-3.5" /> Dartbörse DACH
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Dartartikel kaufen und verkaufen</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Darts, Barrels, Flights, Spitzen, Boards und Zubehör aus Österreich, Deutschland und der Schweiz.</p>
            </div>
            <Button asChild className="h-12 rounded-2xl bg-orange-600 px-5 font-black hover:bg-orange-500">
              <Link href="/dartboerse/neu"><Plus className="mr-2 h-5 w-5" /> Inserat erstellen</Link>
            </Button>
          </div>
        </section>

        <section className="sticky top-14 z-20 mt-5 rounded-[1.75rem] border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nach Darts, Ort, Bundesland oder Zubehör suchen …" className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-12 text-base" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setFiltersOpen((old) => !old)} className="h-12 flex-1 rounded-2xl lg:flex-none">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter {activeFilters ? `(${activeFilters})` : ""}
              </Button>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-12 w-[170px] rounded-2xl"><ArrowUpDown className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="newest">Neueste zuerst</SelectItem><SelectItem value="price_asc">Preis aufsteigend</SelectItem><SelectItem value="price_desc">Preis absteigend</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={category} onValueChange={setCategory}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Kategorie" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Kategorien</SelectItem>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Select value={condition} onValueChange={setCondition}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Zustand" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Zustände</SelectItem>{Object.entries(conditionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Select
                value={country}
                onValueChange={(value) => {
                  setCountry(value)
                  setRegion("all")
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Land" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Länder</SelectItem>
                  <SelectItem value="AT">Österreich</SelectItem>
                  <SelectItem value="DE">Deutschland</SelectItem>
                  <SelectItem value="CH">Schweiz</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={region}
                onValueChange={setRegion}
                disabled={availableRegions.length === 0}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Bundesland / Kanton" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bundesländer / Kantone</SelectItem>
                  {availableRegions.map((itemRegion) => (
                    <SelectItem key={itemRegion} value={itemRegion}>
                      {itemRegion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={shipping} onValueChange={setShipping}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Übergabe" /></SelectTrigger><SelectContent><SelectItem value="all">Versand oder Abholung</SelectItem><SelectItem value="shipping">Versand möglich</SelectItem><SelectItem value="pickup">Abholung möglich</SelectItem></SelectContent></Select>
            </div>
          ) : null}
        </section>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>{loading ? "Dartbörse wird geladen …" : `${filtered.length} Angebot${filtered.length === 1 ? "" : "e"}`}</span><Link href="/dartboerse/meine" className="font-black text-orange-700 hover:text-orange-800">Meine Angebote</Link></div>

        {loading ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-[430px] animate-pulse rounded-[2rem] bg-white shadow-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="mt-4 rounded-3xl"><CardContent className="p-12 text-center"><Box className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black">Keine passenden Angebote</h2><p className="mt-2 text-sm text-slate-500">Ändere die Suche oder erstelle selbst das erste Inserat.</p></CardContent></Card>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Link key={item.id} href={`/dartboerse/${item.id}`} className="group">
                <Card className="h-full overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-900/10">
                  <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200">
                        <Box className="h-14 w-14 text-slate-300" />
                        <span className="text-sm font-bold text-slate-400">Kein Bild vorhanden</span>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

                    {(item.image_count || 0) > 1 ? (
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-950/70 px-3 py-1.5 text-xs font-black text-white shadow-lg backdrop-blur-md">
                        <Images className="h-4 w-4" />
                        {item.image_count} Bilder
                      </span>
                    ) : null}
                    {item.status !== "approved" ? <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black text-white ${item.status === "sold" ? "bg-slate-900" : "bg-amber-600"}`}>{item.status === "sold" ? "VERKAUFT" : "RESERVIERT"}</span> : null}
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/40 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-lg backdrop-blur">
                      {conditionLabels[item.condition]}
                    </span>
                  </div>
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-xs font-black uppercase tracking-wide text-orange-700">{categoryLabels[item.category]}</div>
                    <h2 className="mt-2 line-clamp-2 text-xl font-black leading-snug tracking-tight sm:text-2xl">{item.title}</h2>
                    <div className="mt-4 text-2xl font-black text-slate-950">{priceLabel(item)}</div>
                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {item.city}
                        {item.region ? ` · ${item.region}` : ""}
                        {" · "}
                        {item.country_code}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-600">{item.shipping_available ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Truck className="h-3 w-3" /> Versand</span> : null}{item.pickup_available ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><PackageCheck className="h-3 w-3" /> Abholung</span> : null}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  )
}

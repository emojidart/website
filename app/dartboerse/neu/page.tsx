"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Loader2, MapPin, Package, Send, ShieldAlert, Trash2, UserRound, X } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const categories = {
  complete_darts: "Komplette Darts", barrels: "Barrels", shafts: "Schäfte", flights: "Flights", tips: "Spitzen", boards: "Dartscheiben", machines: "Dartautomaten", lighting: "Beleuchtung", surrounds: "Surrounds", mats: "Matten", cases: "Taschen & Cases", spare_parts: "Ersatzteile", other: "Sonstiges",
}

const initialForm = { title: "", category: "complete_darts", description: "", condition: "good", price: "", priceType: "fixed", countryCode: "AT", postalCode: "", city: "", shipping: true, pickup: true, sellerName: "", sellerEmail: "", sellerPhone: "" }

type FormState = typeof initialForm

type SellerData = {
  sellerName: string
  sellerEmail: string
  sellerPhone: string
}

async function loadSellerData(user: { id: string; email?: string | null }): Promise<SellerData> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_guest, player_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error("Benutzerprofil wurde nicht gefunden.")

  if (profile.is_guest) {
    const { data: guest, error: guestError } = await supabase
      .from("guest_requests")
      .select("full_name, player_name, email, phone")
      .eq("auth_user_id", user.id)
      .eq("status", "approved")
      .maybeSingle()

    if (guestError) throw guestError
    if (!guest) throw new Error("Freigeschaltetes Gastprofil wurde nicht gefunden.")

    const fullName = guest.full_name?.trim() || "Gast"
    const playerName = guest.player_name?.trim()

    return {
      sellerName: playerName ? `${fullName} (${playerName})` : fullName,
      sellerEmail: guest.email?.trim() || user.email?.trim() || "",
      sellerPhone: guest.phone?.trim() || "",
    }
  }

  if (!profile.player_id) {
    throw new Error("Das Mitglied ist noch keinem Spieler zugeordnet.")
  }

  const { data: member, error: memberError } = await supabase
    .from("club_players")
    .select("name, email")
    .eq("id", profile.player_id)
    .maybeSingle()

  if (memberError) throw memberError
  if (!member) throw new Error("Mitglied wurde nicht gefunden.")

  return {
    sellerName: member.name?.trim() || "Mitglied",
    sellerEmail: member.email?.trim() || user.email?.trim() || "",
    sellerPhone: "",
  }
}


export default function NeuesInseratPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [images, setImages] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          router.push("/guest-login")
          return
        }

        const seller = await loadSellerData(data.user)
        setForm((old) => ({
          ...old,
          sellerName: seller.sellerName,
          sellerEmail: seller.sellerEmail,
          sellerPhone: seller.sellerPhone || old.sellerPhone,
        }))
      } catch (error: any) {
        setMessage(error?.message || "Verkäuferdaten konnten nicht geladen werden.")
      }
    })()
  }, [router])

  const setField = (key: keyof FormState, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }))

  const imagePreviews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  )

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [imagePreviews])

  function addImages(files: FileList | null) {
    const selected = Array.from(files || [])
    if (!selected.length) return

    const remaining = Math.max(0, 5 - images.length)
    const valid = selected
      .filter((file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
      .filter((file) => file.size <= 8 * 1024 * 1024)
      .slice(0, remaining)

    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    ) {
      setSuccess(false)
      setMessage("Erlaubt sind nur JPG, PNG und WebP.")
    } else if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
      setSuccess(false)
      setMessage("Ein Bild ist größer als 8 MB.")
    } else if (selected.length > remaining) {
      setSuccess(false)
      setMessage("Es sind insgesamt maximal fünf Bilder möglich.")
    } else {
      setMessage("")
    }

    setImages((old) => [...old, ...valid])
  }

  function removeImage(imageIndex: number) {
    setImages((old) => old.filter((_, index) => index !== imageIndex))
  }

  function moveImage(imageIndex: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? imageIndex - 1 : imageIndex + 1

    if (targetIndex < 0 || targetIndex >= images.length) return

    setImages((old) => {
      const next = [...old]
      ;[next[imageIndex], next[targetIndex]] = [
        next[targetIndex],
        next[imageIndex],
      ]
      return next
    })
  }

  async function uploadImages(userId: string, listingId: string) {
    for (const [index, file] of images.entries()) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from("dart-marketplace-images").upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
      const imageUrl = supabase.storage.from("dart-marketplace-images").getPublicUrl(path).data.publicUrl
      const { error: imageError } = await supabase.from("dart_marketplace_images").insert({ listing_id: listingId, image_url: imageUrl, sort_order: index })
      if (imageError) throw imageError
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setSuccess(false)
    try {
      const { data } = await supabase.auth.getUser(); const user = data.user
      if (!user) throw new Error("Bitte melde dich zuerst an.")
      if (!form.title.trim() || !form.description.trim() || !form.city.trim()) throw new Error("Bitte Titel, Beschreibung und Ort ausfüllen.")
      if (!form.shipping && !form.pickup) throw new Error("Bitte Versand oder Abholung auswählen.")
      if (images.length === 0) throw new Error("Bitte mindestens ein Bild auswählen.")
      if (images.length > 5) throw new Error("Es sind maximal fünf Bilder möglich.")
      if (images.some((file) => file.size > 8 * 1024 * 1024)) throw new Error("Ein Bild ist größer als 8 MB.")
      if (form.priceType !== "free" && (!form.price || Number(form.price.replace(",", ".")) < 0)) throw new Error("Bitte einen gültigen Preis eingeben.")

      const seller = await loadSellerData(user)

      const { data: listing, error } = await supabase.from("dart_marketplace_listings").insert({
        created_by: user.id, title: form.title.trim(), category: form.category, description: form.description.trim(), condition: form.condition,
        price: form.priceType === "free" ? null : Number(form.price.replace(",", ".")), price_type: form.priceType,
        country_code: form.countryCode, postal_code: form.postalCode.trim() || null, city: form.city.trim(), shipping_available: form.shipping, pickup_available: form.pickup,
        seller_name: seller.sellerName, seller_email: seller.sellerEmail || null, seller_phone: form.sellerPhone.trim() || seller.sellerPhone || null, status: "pending",
      }).select("id").single()
      if (error) throw error
      await uploadImages(user.id, listing.id)
      setSuccess(true)
      setMessage("Dein Inserat wurde eingereicht und wartet auf die Freigabe.")
      setForm({
        ...initialForm,
        sellerName: seller.sellerName,
        sellerEmail: seller.sellerEmail,
        sellerPhone: seller.sellerPhone,
      })
      setImages([])
    } catch (error: any) { setMessage(error?.message || "Das Inserat konnte nicht gespeichert werden.") }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32"><Header />
      <main className="mx-auto max-w-4xl px-4 pt-20">
        <Button variant="outline" onClick={() => router.push("/dartboerse")} className="mb-4 rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" />Zur Dartbörse</Button>
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-orange-950 p-6 text-white shadow-2xl sm:p-8"><div className="text-sm font-black uppercase tracking-[0.18em] text-orange-300">Neues Angebot</div><h1 className="mt-2 text-3xl font-black sm:text-4xl">Dartartikel verkaufen</h1><p className="mt-2 text-slate-300">Mit guten Bildern und einer ehrlichen Beschreibung findest du schneller einen Käufer.</p></section>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <Section title="Artikel" icon={<Package className="h-5 w-5" />}>
            <Field label="Titel *"><Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="z. B. Target Phil Taylor Gen 10, 24 g" required /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Kategorie *"><Select value={form.category} onValueChange={(value) => setField("category", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categories).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Zustand *"><Select value={form.condition} onValueChange={(value) => setField("condition", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Neu</SelectItem><SelectItem value="like_new">Wie neu</SelectItem><SelectItem value="good">Gut</SelectItem><SelectItem value="used">Gebraucht</SelectItem><SelectItem value="defective">Defekt</SelectItem></SelectContent></Select></Field></div>
            <Field label="Beschreibung *"><Textarea rows={7} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Marke, Gewicht, Lieferumfang, Gebrauchsspuren und Besonderheiten …" required /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Preisart"><Select value={form.priceType} onValueChange={(value) => setField("priceType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixpreis</SelectItem><SelectItem value="negotiable">Verhandlungsbasis</SelectItem><SelectItem value="free">Zu verschenken</SelectItem></SelectContent></Select></Field><Field label="Preis in €"> <Input disabled={form.priceType === "free"} inputMode="decimal" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="0,00" /></Field></div>
          </Section>

          <Section title="Bilder verwalten" icon={<ImagePlus className="h-5 w-5" />}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Bis zu fünf Bilder, jeweils maximal 8 MB. Das erste Bild wird als Titelbild verwendet.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Erlaubt sind JPG, PNG und WebP.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {images.length}/5 Bilder
              </span>
            </div>

            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagePreviews.map((preview, imageIndex) => (
                  <div
                    key={`${preview.file.name}-${imageIndex}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={preview.url}
                        alt={`Bild ${imageIndex + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {imageIndex === 0 ? (
                        <span className="absolute left-2 top-2 rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-black text-white shadow">
                          TITELBILD
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => removeImage(imageIndex)}
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
                        aria-label="Bild entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={imageIndex === 0}
                        onClick={() => moveImage(imageIndex, "left")}
                        className="h-9 flex-1 rounded-xl"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-xs font-black text-slate-500">
                        {imageIndex + 1}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={imageIndex === images.length - 1}
                        onClick={() => moveImage(imageIndex, "right")}
                        className="h-9 flex-1 rounded-xl"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {images.length < 5 ? (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-8 text-center transition hover:bg-orange-100">
                <ImagePlus className="h-9 w-9 text-orange-600" />
                <span className="mt-3 font-black text-orange-900">
                  {images.length
                    ? "Weitere Bilder hinzufügen"
                    : "Bilder auswählen"}
                </span>
                <span className="mt-1 text-xs text-orange-700">
                  JPG, PNG oder WebP
                </span>

                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    addImages(event.target.files)
                    event.target.value = ""
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Maximale Anzahl von fünf Bildern erreicht.
              </div>
            )}
          </Section>

          <Section title="Standort und Übergabe" icon={<MapPin className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3"><Field label="Land"><Select value={form.countryCode} onValueChange={(value) => setField("countryCode", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AT">Österreich</SelectItem><SelectItem value="DE">Deutschland</SelectItem><SelectItem value="CH">Schweiz</SelectItem></SelectContent></Select></Field><Field label="PLZ"><Input value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value.replace(/\D/g, ""))} /></Field><Field label="Ort *"><Input value={form.city} onChange={(e) => setField("city", e.target.value)} required /></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className={`cursor-pointer rounded-2xl border p-4 font-bold ${form.shipping ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mr-2" checked={form.shipping} onChange={(e) => setField("shipping", e.target.checked)} />Versand möglich</label><label className={`cursor-pointer rounded-2xl border p-4 font-bold ${form.pickup ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mr-2" checked={form.pickup} onChange={(e) => setField("pickup", e.target.checked)} />Abholung möglich</label></div>
          </Section>

          <Section title="Verkäufer" icon={<UserRound className="h-5 w-5" />}>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Name und E-Mail werden automatisch aus deinem freigeschalteten Profil übernommen und können hier nicht geändert werden.
            </div>
            <Field label="Name">
              <Input value={form.sellerName} readOnly className="cursor-not-allowed bg-slate-100 text-slate-700" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-Mail">
                <Input type="email" value={form.sellerEmail} readOnly className="cursor-not-allowed bg-slate-100 text-slate-700" />
              </Field>
              <Field label="Telefon (optional)">
                <Input value={form.sellerPhone} onChange={(e) => setField("sellerPhone", e.target.value)} />
              </Field>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="mr-2 inline h-4 w-4" />
              Teile keine Zahlungsdaten oder Ausweiskopien in der Beschreibung.
            </div>
          </Section>

          {message ? <div className={`rounded-2xl border p-4 text-sm font-bold ${success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{success ? <CheckCircle2 className="mr-2 inline h-5 w-5" /> : <ShieldAlert className="mr-2 inline h-5 w-5" />}{message}</div> : null}
          <Button disabled={saving} className="h-13 w-full rounded-2xl bg-orange-600 text-base font-black hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}{saving ? "Wird eingereicht …" : "Inserat zur Freigabe einreichen"}</Button>
        </form>
      </main><MobileBottomNav /></div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-5 sm:p-6"><div className="flex items-center gap-2 text-lg font-black"><span className="text-orange-600">{icon}</span>{title}</div>{children}</CardContent></Card> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>{children}</label> }

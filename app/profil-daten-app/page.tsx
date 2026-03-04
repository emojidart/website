"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  Loader2,
  Save,
  User,
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Hash,
  Target,
  Home,
  Building,
  Shirt,
} from "lucide-react"
import { motion } from "framer-motion"

type ClubPlayer = {
  id: string
  user_id: string

  name: string | null
  throwing_hand: string | null
  origin: string | null

  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null

  birthdate: string | null
  player_number: number | null
  jersey_size: string | null
  email: string | null
  phone: string | null

  club_joined_at: string | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

const toDateInput = (v: string | null) => (v ? String(v).slice(0, 10) : "")

const formatDateDE = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const normalizeEmptyToNull = (v: any) => {
  if (v === "") return null
  if (typeof v === "string" && v.trim() === "") return null
  return v
}

// ✅ DB -> UI (Right/Left -> Rechts/Links)
const mapThrowingHandFromDB = (value: string | null) => {
  if (!value) return ""
  const v = value.toLowerCase()
  if (v === "right" || v === "rechts") return "Rechts"
  if (v === "left" || v === "links") return "Links"
  return value
}

// ✅ UI -> DB (nur deutsch speichern)
const mapThrowingHandToDB = (value: string | null) => {
  if (!value) return null
  const v = value.toLowerCase()
  if (v === "rechts") return "Rechts"
  if (v === "links") return "Links"
  return value
}

function TileInput(props: {
  label: string
  placeholder?: string
  value: any
  onChange: (v: string) => void
  type?: string
  icon?: React.ReactNode
}) {
  const { label, placeholder, value, onChange, type = "text", icon } = props
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        {icon ? (
          <div className="w-8 h-8 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            {icon}
          </div>
        ) : null}
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-black">{label}</p>
      </div>

      <Input
        type={type}
        className="mt-2 rounded-2xl border-gray-200 bg-white font-semibold"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ThrowingHandSelect(props: { value: string; onChange: (v: string) => void }) {
  const { value, onChange } = props
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-orange-600" />
        </div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-black">Wurfhand</p>
      </div>

      <select
        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Bitte wählen</option>
        <option value="Rechts">Rechts</option>
        <option value="Links">Links</option>
      </select>
    </div>
  )
}

export default function ProfilDatenAppPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [row, setRow] = useState<ClubPlayer | null>(null)

  const [form, setForm] = useState({
    name: "",
    throwing_hand: "",
    origin: "",

    street: "",
    house_number: "",
    postal_code: "",
    city: "",

    birthdate: "",
    player_number: "" as string | number,
    jersey_size: "",
    email: "",
    phone: "",
  })

  const clubJoinedLabel = useMemo(() => {
    if (!row?.club_joined_at) return "—"
    return formatDateDE(row.club_joined_at)
  }, [row?.club_joined_at])

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, session, router])

  useEffect(() => {
    if (!session?.user) return
    loadMyClubPlayer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const setField = (k: keyof typeof form, v: any) => {
    setError(null)
    setSuccess(null)
    setForm((p) => ({ ...p, [k]: v }))
  }

  const loadMyClubPlayer = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // ✅ Fix: mehrere rows pro user_id → order + limit(1)
      const { data, error } = await supabase
        .from("club_players")
        .select(`
          id, user_id,
          name, throwing_hand, origin,
          street, house_number, postal_code, city,
          birthdate, player_number, jersey_size, email, phone,
          club_joined_at
        `)
        .eq("user_id", session!.user.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const cp = (data ?? null) as ClubPlayer | null
      setRow(cp)

      setForm({
        name: cp?.name ?? "",
        throwing_hand: mapThrowingHandFromDB(cp?.throwing_hand ?? null),
        origin: cp?.origin ?? "",

        street: cp?.street ?? "",
        house_number: cp?.house_number ?? "",
        postal_code: cp?.postal_code ?? "",
        city: cp?.city ?? "",

        birthdate: toDateInput(cp?.birthdate ?? null),
        player_number: cp?.player_number ?? "",
        jersey_size: cp?.jersey_size ?? "",
        email: cp?.email ?? "",
        phone: cp?.phone ?? "",
      })
    } catch (e: any) {
      console.error("loadMyClubPlayer ERROR:", e)
      setError(e?.message ? `Fehler: ${e.message}` : "Fehler beim Laden deiner Daten.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!session?.user) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const cleanName = String(form.name || "").trim()
      if (!cleanName) {
        setError("Bitte trage deinen Vor- und Nachnamen ein.")
        setSaving(false)
        return
      }

      const payload = {
        user_id: session.user.id,
        name: cleanName,
        throwing_hand: mapThrowingHandToDB(form.throwing_hand),
        origin: normalizeEmptyToNull(form.origin),

        street: normalizeEmptyToNull(form.street),
        house_number: normalizeEmptyToNull(form.house_number),
        postal_code: normalizeEmptyToNull(form.postal_code),
        city: normalizeEmptyToNull(form.city),

        birthdate: form.birthdate ? form.birthdate : null,
        player_number: form.player_number === "" ? null : Number(form.player_number),
        jersey_size: normalizeEmptyToNull(form.jersey_size),
        email: normalizeEmptyToNull(form.email),
        phone: normalizeEmptyToNull(form.phone),
      }

      if (row?.id) {
        const { error: upErr } = await supabase
          .from("club_players")
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", session.user.id)

        if (upErr) throw upErr

        setSuccess("Gespeichert ✅")
        await loadMyClubPlayer()
        return
      }

      const { error: insErr } = await supabase.from("club_players").insert(payload)
      if (insErr) throw insErr

      setSuccess("Gespeichert ✅")
      await loadMyClubPlayer()
    } catch (e: any) {
      console.error("handleSave ERROR:", e)
      setError(e?.message ? `Speichern fehlgeschlagen: ${e.message}` : "Speichern fehlgeschlagen.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 pt-12 sm:pt-14">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white shadow-xl px-10 py-10 border border-gray-200">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            <div className="text-center">
              <div className="text-lg font-black">Daten werden geladen…</div>
              <div className="text-sm text-gray-500 mt-1">Bitte kurz warten</div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
        className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-5 sm:mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-black">Meine Mitgliedsdaten</h1>
                    <p className="text-sm text-gray-600 mt-1">Hier kannst du deine Daten aktualisieren.</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Mitglied seit: <span className="font-black text-gray-800">{clubJoinedLabel}</span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-black flex-shrink-0"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Status Badges */}
          {(error || success) && (
            <motion.div variants={itemVariants} className="mb-4">
              <div className="flex flex-wrap gap-2">
                {error && <Badge className="bg-red-600 text-white rounded-full px-3 py-1">{error}</Badge>}
                {success && <Badge className="bg-green-600 text-white rounded-full px-3 py-1">{success}</Badge>}
              </div>
            </motion.div>
          )}

          {/* Persönliche Daten */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <User className="w-5 h-5 text-orange-600" />
                  Persönliche Daten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TileInput
                    label="Name"
                    icon={<User className="w-4 h-4 text-orange-600" />}
                    value={form.name}
                    onChange={(v) => setField("name", v)}
                    placeholder="Vor- und Nachname"
                  />

                  <ThrowingHandSelect value={form.throwing_hand} onChange={(v) => setField("throwing_hand", v)} />

                  <TileInput
                    label="Geburtsdatum"
                    icon={<CalendarDays className="w-4 h-4 text-orange-600" />}
                    type="date"
                    value={form.birthdate}
                    onChange={(v) => setField("birthdate", v)}
                  />

                  <TileInput
                    label="Spielernummer"
                    icon={<Hash className="w-4 h-4 text-orange-600" />}
                    type="number"
                    value={form.player_number}
                    onChange={(v) => setField("player_number", v)}
                    placeholder="z.B. 258"
                  />

                  <div className="sm:col-span-2">
                    <TileInput
                      label="Trikotgröße"
                      icon={<Shirt className="w-4 h-4 text-orange-600" />}
                      value={form.jersey_size}
                      onChange={(v) => setField("jersey_size", v)}
                      placeholder="S / M / L / XL"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <TileInput
                      label="Herkunft"
                      icon={<MapPin className="w-4 h-4 text-orange-600" />}
                      value={form.origin}
                      onChange={(v) => setField("origin", v)}
                      placeholder="z.B. Salzburg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Adresse */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <TileInput
                      label="Straße"
                      icon={<MapPin className="w-4 h-4 text-orange-600" />}
                      value={form.street}
                      onChange={(v) => setField("street", v)}
                      placeholder="Musterstraße"
                    />
                  </div>

                  <TileInput
                    label="Hausnummer"
                    icon={<Home className="w-4 h-4 text-orange-600" />}
                    value={form.house_number}
                    onChange={(v) => setField("house_number", v)}
                    placeholder="12A"
                  />

                  <TileInput
                    label="PLZ"
                    icon={<Hash className="w-4 h-4 text-orange-600" />}
                    value={form.postal_code}
                    onChange={(v) => setField("postal_code", v)}
                    placeholder="5020"
                  />

                  <div className="sm:col-span-2">
                    <TileInput
                      label="Ort"
                      icon={<Building className="w-4 h-4 text-orange-600" />}
                      value={form.city}
                      onChange={(v) => setField("city", v)}
                      placeholder="Salzburg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Kontakt */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <Mail className="w-5 h-5 text-orange-600" />
                  Kontakt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <TileInput
                    label="E-Mail"
                    icon={<Mail className="w-4 h-4 text-orange-600" />}
                    value={form.email}
                    onChange={(v) => setField("email", v)}
                    placeholder="name@mail.at"
                  />
                  <TileInput
                    label="Telefon"
                    icon={<Phone className="w-4 h-4 text-orange-600" />}
                    value={form.phone}
                    onChange={(v) => setField("phone", v)}
                    placeholder="+43 …"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action: Speichern */}
          <motion.div variants={itemVariants} className="mt-5">
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <CardContent className="p-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichern…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
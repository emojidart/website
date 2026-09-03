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
    <div className="group min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 transition-all duration-200 hover:border-slate-300 hover:shadow-sm sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600">
            {icon}
          </div>
        ) : null}
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">{label}</p>
      </div>

      <Input
        type={type}
        className="mt-3 h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 font-semibold text-slate-900 shadow-none outline-none transition-colors placeholder:text-slate-400 focus-visible:border-orange-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-100"
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
    <div className="group min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 transition-all duration-200 hover:border-slate-300 hover:shadow-sm sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
          <Target className="h-4 w-4 text-orange-600" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">Wurfhand</p>
      </div>

      <select
        className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
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
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Konto-Verknüpfung ist die einzige Quelle der Wahrheit:
      // auth user -> user_profiles.player_id -> club_players.id
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.player_id) {
        setRow(null)
        setError(
          "Dein Benutzerkonto ist noch keinem Vereinsmitglied zugeordnet. Bitte wende dich an den Vorstand.",
        )
        return
      }

      const { data, error } = await supabase
        .from("club_players")
        .select(`
          id, user_id,
          name, throwing_hand, origin,
          street, house_number, postal_code, city,
          birthdate, player_number, jersey_size, email, phone,
          club_joined_at
        `)
        .eq("id", profile.player_id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setRow(null)
        setError(
          "Der mit deinem Benutzerkonto verknüpfte Mitgliedsdatensatz wurde nicht gefunden.",
        )
        return
      }

      const cp = data as ClubPlayer
      setRow(cp)

      setForm({
        name: cp.name ?? "",
        throwing_hand: mapThrowingHandFromDB(cp.throwing_hand ?? null),
        origin: cp.origin ?? "",

        street: cp.street ?? "",
        house_number: cp.house_number ?? "",
        postal_code: cp.postal_code ?? "",
        city: cp.city ?? "",

        birthdate: toDateInput(cp.birthdate ?? null),
        player_number: cp.player_number ?? "",
        jersey_size: cp.jersey_size ?? "",
        email: cp.email ?? "",
        phone: cp.phone ?? "",
      })
    } catch (e: any) {
      console.error("loadMyClubPlayer ERROR:", e)
      setRow(null)
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
        return
      }

      // Sicherheitsregel:
      // Diese Seite darf niemals selbst einen neuen club_players-Datensatz anlegen.
      if (!row?.id) {
        setError(
          "Dein Konto ist keinem Mitglied zugeordnet. Speichern wurde aus Sicherheitsgründen verhindert.",
        )
        return
      }

      // Noch einmal prüfen, ob der eingeloggte User wirklich mit genau diesem
      // club_players-Datensatz verknüpft ist.
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.player_id || profile.player_id !== row.id) {
        setError(
          "Die Mitglieds-Verknüpfung ist nicht eindeutig. Speichern wurde aus Sicherheitsgründen verhindert.",
        )
        return
      }

      const payload = {
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

      const { error: updateError } = await supabase
        .from("club_players")
        .update(payload)
        .eq("id", row.id)

      if (updateError) throw updateError

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
      <main className="min-h-screen overflow-x-hidden bg-[#f3f5f8] text-slate-950">
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pb-24 pt-16 sm:pt-20">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-46px_rgba(15,23,42,0.55)]">
            <div className="h-1.5 bg-orange-500" />
            <div className="flex flex-col items-center gap-5 px-6 py-9 sm:px-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              </div>
              <div className="text-center">
                <div className="text-lg font-black tracking-tight text-slate-950">Deine Daten werden geladen</div>
                <div className="mt-1 text-sm font-medium text-slate-500">Einen Moment bitte.</div>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f5f8] text-slate-950">
      <Header />

      <main className="w-full pt-14 sm:pt-16">
        <motion.div
          className="w-full px-3 py-3 pb-24 sm:px-6 sm:py-6 sm:pb-10 lg:px-8 xl:px-10 2xl:px-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Premium Header */}
          <motion.section
            variants={itemVariants}
            className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.75)] sm:rounded-[30px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.08),transparent_28%)]" />

            <div className="relative px-4 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-orange-400 backdrop-blur-sm sm:h-12 sm:w-12">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400 sm:text-xs">
                        Mein Profil
                      </div>
                      <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl lg:text-4xl">
                        Meine Mitgliedsdaten
                      </h1>
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-400 sm:text-base">
                    Halte deine persönlichen Daten, Adresse und Kontaktdaten aktuell.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-300">
                    <CalendarDays className="h-3.5 w-3.5 text-orange-400" />
                    Mitglied seit {clubJoinedLabel}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-white/10 bg-white/10 px-4 font-bold text-white shadow-none backdrop-blur-sm hover:bg-white/15 hover:text-white sm:w-auto"
                  onClick={() => router.push("/member-profile-app")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zum Profil
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Rückmeldungen */}
          {(error || success) && (
            <motion.div variants={itemVariants} className="mt-4">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-800 shadow-sm">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-800 shadow-sm">
                  {success}
                </div>
              ) : null}
            </motion.div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-start">
            <div className="min-w-0 space-y-4">
              {/* Persönliche Daten */}
              <motion.section variants={itemVariants}>
                <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.48)] sm:rounded-[28px]">
                  <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                        <User className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Persönlich</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                          Persönliche Daten
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
                      <TileInput
                        label="Name"
                        icon={<User className="h-4 w-4 text-orange-600" />}
                        value={form.name}
                        onChange={(v) => setField("name", v)}
                        placeholder="Vor- und Nachname"
                      />

                      <ThrowingHandSelect
                        value={form.throwing_hand}
                        onChange={(v) => setField("throwing_hand", v)}
                      />

                      <TileInput
                        label="Geburtsdatum"
                        icon={<CalendarDays className="h-4 w-4 text-orange-600" />}
                        type="date"
                        value={form.birthdate}
                        onChange={(v) => setField("birthdate", v)}
                      />

                      <TileInput
                        label="Spielernummer"
                        icon={<Hash className="h-4 w-4 text-orange-600" />}
                        type="number"
                        value={form.player_number}
                        onChange={(v) => setField("player_number", v)}
                        placeholder="z. B. 258"
                      />

                      <TileInput
                        label="Trikotgröße"
                        icon={<Shirt className="h-4 w-4 text-orange-600" />}
                        value={form.jersey_size}
                        onChange={(v) => setField("jersey_size", v)}
                        placeholder="S / M / L / XL"
                      />

                      <TileInput
                        label="Herkunft"
                        icon={<MapPin className="h-4 w-4 text-orange-600" />}
                        value={form.origin}
                        onChange={(v) => setField("origin", v)}
                        placeholder="z. B. Salzburg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Adresse */}
              <motion.section variants={itemVariants}>
                <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.48)] sm:rounded-[28px]">
                  <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Wohnadresse</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                          Adresse
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <TileInput
                          label="Straße"
                          icon={<MapPin className="h-4 w-4 text-orange-600" />}
                          value={form.street}
                          onChange={(v) => setField("street", v)}
                          placeholder="Musterstraße"
                        />
                      </div>

                      <TileInput
                        label="Hausnummer"
                        icon={<Building className="h-4 w-4 text-orange-600" />}
                        value={form.house_number}
                        onChange={(v) => setField("house_number", v)}
                        placeholder="12A"
                      />

                      <TileInput
                        label="PLZ"
                        icon={<Hash className="h-4 w-4 text-orange-600" />}
                        value={form.postal_code}
                        onChange={(v) => setField("postal_code", v)}
                        placeholder="5020"
                      />

                      <div className="md:col-span-2">
                        <TileInput
                          label="Ort"
                          icon={<Building className="h-4 w-4 text-orange-600" />}
                          value={form.city}
                          onChange={(v) => setField("city", v)}
                          placeholder="Salzburg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>

            <div className="min-w-0 space-y-4 xl:sticky xl:top-20">
              {/* Kontakt */}
              <motion.section variants={itemVariants}>
                <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.48)] sm:rounded-[28px]">
                  <CardHeader className="border-b border-slate-100 px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                        <Mail className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Erreichbarkeit</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                          Kontakt
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 sm:p-6">
                    <TileInput
                      label="E-Mail"
                      icon={<Mail className="h-4 w-4 text-orange-600" />}
                      value={form.email}
                      onChange={(v) => setField("email", v)}
                      placeholder="name@mail.at"
                    />

                    <TileInput
                      label="Telefon"
                      icon={<Phone className="h-4 w-4 text-orange-600" />}
                      value={form.phone}
                      onChange={(v) => setField("phone", v)}
                      placeholder="+43 …"
                    />
                  </CardContent>
                </Card>
              </motion.section>

              {/* Speichern */}
              <motion.section variants={itemVariants}>
                <Card className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.75)] sm:rounded-[28px]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(249,115,22,0.18),transparent_38%)]" />
                  <CardContent className="relative p-4 sm:p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400 sm:text-xs">
                      Änderungen übernehmen
                    </div>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                      Daten speichern
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                      Prüfe deine Angaben kurz und speichere anschließend deine Änderungen.
                    </p>

                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="mt-5 h-12 w-full rounded-xl bg-orange-500 font-black text-white shadow-none hover:bg-orange-600"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wird gespeichert…
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Änderungen speichern
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useEffect, useId, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { UnsavedProfileGuard } from "@/components/members/unsaved-profile-guard"
import { TournamentPageTitle } from "@/components/tournaments/tournament-ui"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { Save, User, MapPin, Mail, Phone, CalendarDays, Hash, Target, Building, Shirt, LockKeyhole, Send, X, CheckCircle2, XCircle } from "lucide-react"
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
  const inputId = useId()
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-card px-3.5 py-3.5 shadow-none  transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.05] sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07] text-orange-300 shadow-none">
            {icon}
          </div>
        ) : null}
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">{label}</label>
      </div>

      <Input
        id={inputId}
        type={type}
        className="mt-3 h-11 rounded-xl border-white/[0.09] bg-card px-3.5 font-semibold text-white shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:border-orange-300/30 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-orange-400/10"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ThrowingHandSelect(props: { value: string; onChange: (v: string) => void }) {
  const { value, onChange } = props
  const inputId = useId()
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-card px-3.5 py-3.5 shadow-none  transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.05] sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07] shadow-none">
          <Target className="h-4 w-4 text-orange-300" />
        </div>
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Wurfhand</label>
      </div>

      <select
        id={inputId}
        className="mt-3 h-11 w-full rounded-xl border border-white/[0.09] bg-card px-3.5 text-sm font-semibold text-white outline-none transition focus:border-orange-300/30 focus:bg-card focus:ring-2 focus:ring-orange-400/10"
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
  const [nameRequestOpen, setNameRequestOpen] = useState(false)
  const [requestedName, setRequestedName] = useState("")
  const [nameRequestSaving, setNameRequestSaving] = useState(false)
  const [nameRequestMessage, setNameRequestMessage] = useState("")
  const [pendingNameRequest, setPendingNameRequest] = useState<string | null>(null)
  const [nameDecision, setNameDecision] = useState<{
    id: string
    status: "approved" | "rejected"
    requested_name: string | null
    admin_note: string | null
    reviewed_at: string | null
  } | null>(null)

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

  const [savedForm, setSavedForm] = useState<string | null>(null)
  const dirty = savedForm !== null && JSON.stringify(form) !== savedForm

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
      setSavedForm(JSON.stringify({
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
      }))

      const { data: pendingRequest } = await supabase
        .from("profile_change_requests")
        .select("requested_name")
        .eq("user_id", session.user.id)
        .eq("request_type", "name")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      setPendingNameRequest(pendingRequest?.requested_name || null)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: latestDecision, error: decisionError } = await supabase
        .from("profile_change_requests")
        .select("id,status,requested_name,admin_note,reviewed_at")
        .eq("user_id", session.user.id)
        .eq("request_type", "name")
        .in("status", ["approved", "rejected"])
        .is("user_acknowledged_at", null)
        .gte("reviewed_at", sevenDaysAgo)
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (decisionError) throw decisionError
      setNameDecision((latestDecision as any) || null)
    } catch (e: any) {
      console.error("loadMyClubPlayer ERROR:", e)
      setRow(null)
      setError(e?.message ? `Fehler: ${e.message}` : "Fehler beim Laden deiner Daten.")
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeNameDecision = async () => {
    if (!nameDecision) return
    try {
      const { error } = await supabase.rpc("acknowledge_profile_change_request", {
        p_request_id: nameDecision.id,
      })
      if (error) throw error
      setNameDecision(null)
    } catch (error) {
      console.error("Name decision acknowledge error:", error)
    }
  }

  const submitNameChangeRequest = async () => {
    const clean = requestedName.trim()
    setNameRequestMessage("")

    if (clean.length < 3) {
      setNameRequestMessage("Bitte den vollständigen neuen Namen eingeben.")
      return
    }

    try {
      setNameRequestSaving(true)
      const { error } = await supabase.rpc("submit_member_name_change_request", {
        p_requested_name: clean,
      })
      if (error) throw error

      setPendingNameRequest(clean)
      setNameDecision(null)
      setNameRequestMessage("Namensänderung wurde zur Prüfung gesendet.")
      window.setTimeout(() => {
        setNameRequestOpen(false)
        setNameRequestMessage("")
      }, 1600)
    } catch (e: any) {
      console.error("name change request error:", e)
      const msg = String(e?.message || "").toLowerCase()
      setNameRequestMessage(
        msg.includes("name unchanged")
          ? "Der gewünschte Name entspricht bereits deinem aktuellen Namen."
          : "Anfrage konnte nicht gesendet werden.",
      )
    } finally {
      setNameRequestSaving(false)
    }
  }

  const handleSave = async () => {
    if (!session?.user) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
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

      await loadMyClubPlayer()
      setSuccess("Deine Mitgliedsdaten wurden gespeichert.")
    } catch (e: any) {
      console.error("handleSave ERROR:", e)
      setError(e?.message ? `Speichern fehlgeschlagen: ${e.message}` : "Speichern fehlgeschlagen.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="emd-loading-surface profile-data-premium relative min-h-screen overflow-x-clip bg-background text-white">
        <SectionSkeleton kind="profile" />
      <Header variant="app" title="Meine Mitgliedsdaten" subtitle="Mein EMD" backHref="/member-profile-app" />

        

        
        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="profile-data-premium relative min-h-screen overflow-x-clip bg-background text-white">
      <UnsavedProfileGuard dirty={dirty} />
      <Header variant="app" title="Meine Mitgliedsdaten" subtitle="Mein EMD" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />


      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Premium Header */}
          <TournamentPageTitle title="Meine Mitgliedsdaten" eyebrow="Mein EMD · Profil bearbeiten" description={`Persönliche Daten, Adresse und Kontakt. Mitglied seit ${clubJoinedLabel}.`} />

          {nameDecision ? (
            <motion.section variants={itemVariants} className="mt-4">
              <div className={`rounded-[22px] border p-4 sm:p-5 ${
                nameDecision.status === "approved"
                  ? "border-emerald-300/20 bg-emerald-500/[0.08]"
                  : "border-red-300/20 bg-red-500/[0.08]"
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      nameDecision.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-red-500/15 text-red-200"
                    }`}>
                      {nameDecision.status === "approved" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                        nameDecision.status === "approved" ? "text-emerald-200/60" : "text-red-200/60"
                      }`}>
                        Namensänderung
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {nameDecision.status === "approved"
                          ? "Deine Namensänderung wurde übernommen."
                          : "Deine Namensänderung wurde nicht übernommen."}
                      </div>
                      {nameDecision.requested_name ? (
                        <div className="mt-1 text-sm font-semibold text-muted-foreground">
                          Angefragter Name: {nameDecision.requested_name}
                        </div>
                      ) : null}
                      {nameDecision.admin_note ? (
                        <div className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                          Hinweis: {nameDecision.admin_note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void acknowledgeNameDecision()}
                    className="shrink-0 rounded-xl border-white/10 bg-white/[0.05] font-semibold text-white/75 hover:bg-white/[0.09] hover:text-white"
                  >
                    Verstanden
                  </Button>
                </div>
              </div>
            </motion.section>
          ) : null}

          {/* Rückmeldungen */}
          {(error || success) && (
            <motion.div variants={itemVariants} className="mt-4">
              {error ? (
                <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.08] px-4 py-3.5 text-sm font-bold text-red-200 shadow-sm">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.08] px-4 py-3.5 text-sm font-bold text-emerald-200 shadow-sm">
                  {success}
                </div>
              ) : null}
            </motion.div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-start">
            <div className="min-w-0 space-y-4">
              {/* Persönliche Daten */}
              <motion.section variants={itemVariants}>
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-card shadow-sm  sm:rounded-[20px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <User className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Persönlich</div>
                        <CardTitle className="mt-0.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                          Persönliche Daten
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
                      <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-card px-3.5 py-3.5 sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                            <LockKeyhole className="h-4 w-4 text-orange-300" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Name</p>
                            <div className="mt-1 text-xs font-bold text-muted-foreground">Nur über Änderungsanfrage</div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/[0.09] bg-card px-3.5 py-3 font-semibold text-white">
                          {form.name || "—"}
                        </div>

                        {pendingNameRequest ? (
                          <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-500/[0.07] px-3 py-2 text-xs font-bold text-amber-100/75">
                            Änderung angefragt: {pendingNameRequest}
                          </div>
                        ) : null}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setRequestedName(pendingNameRequest || form.name || "")
                            setNameRequestMessage("")
                            setNameRequestOpen(true)
                          }}
                          className="mt-3 h-10 w-full rounded-xl border-orange-300/20 bg-orange-500/[0.07] font-semibold text-orange-100 hover:bg-orange-500/[0.13] hover:text-white"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Namensänderung anfragen
                        </Button>
                      </div>

                      <ThrowingHandSelect
                        value={form.throwing_hand}
                        onChange={(v) => setField("throwing_hand", v)}
                      />

                      <TileInput
                        label="Geburtsdatum"
                        icon={<CalendarDays className="h-4 w-4 text-orange-300" />}
                        type="date"
                        value={form.birthdate}
                        onChange={(v) => setField("birthdate", v)}
                      />

                      <TileInput
                        label="Spielernummer"
                        icon={<Hash className="h-4 w-4 text-orange-300" />}
                        type="number"
                        value={form.player_number}
                        onChange={(v) => setField("player_number", v)}
                        placeholder="z. B. 258"
                      />

                      <TileInput
                        label="Trikotgröße"
                        icon={<Shirt className="h-4 w-4 text-orange-300" />}
                        value={form.jersey_size}
                        onChange={(v) => setField("jersey_size", v)}
                        placeholder="S / M / L / XL"
                      />

                      <TileInput
                        label="Herkunft"
                        icon={<MapPin className="h-4 w-4 text-orange-300" />}
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
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-card shadow-sm  sm:rounded-[20px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <MapPin className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Wohnadresse</div>
                        <CardTitle className="mt-0.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
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
                          icon={<MapPin className="h-4 w-4 text-orange-300" />}
                          value={form.street}
                          onChange={(v) => setField("street", v)}
                          placeholder="Musterstraße"
                        />
                      </div>

                      <TileInput
                        label="Hausnummer"
                        icon={<Building className="h-4 w-4 text-orange-300" />}
                        value={form.house_number}
                        onChange={(v) => setField("house_number", v)}
                        placeholder="12A"
                      />

                      <TileInput
                        label="PLZ"
                        icon={<Hash className="h-4 w-4 text-orange-300" />}
                        value={form.postal_code}
                        onChange={(v) => setField("postal_code", v)}
                        placeholder="5020"
                      />

                      <div className="md:col-span-2">
                        <TileInput
                          label="Ort"
                          icon={<Building className="h-4 w-4 text-orange-300" />}
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
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-card shadow-sm  sm:rounded-[20px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <Mail className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Erreichbarkeit</div>
                        <CardTitle className="mt-0.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                          Kontakt
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 sm:p-6">
                    <TileInput
                      label="E-Mail"
                      icon={<Mail className="h-4 w-4 text-orange-300" />}
                      value={form.email}
                      onChange={(v) => setField("email", v)}
                      placeholder="name@mail.at"
                    />

                    <TileInput
                      label="Telefon"
                      icon={<Phone className="h-4 w-4 text-orange-300" />}
                      value={form.phone}
                      onChange={(v) => setField("phone", v)}
                      placeholder="+43 …"
                    />
                  </CardContent>
                </Card>
              </motion.section>

              {/* Speichern */}

            </div>
          </div>
        <div className="mp-save-bar"><div role="status"><strong className="block text-sm font-semibold">{dirty ? "Ungespeicherte Änderungen" : "Alles auf dem aktuellen Stand"}</strong><p className="mt-1 text-sm text-muted-foreground">Prüfe deine Angaben vor dem Speichern.</p></div><Button
                      onClick={handleSave}
                      disabled={saving || !dirty}
                      className="h-12 w-full sm:w-auto sm:shrink-0 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_0_28px_rgba(249,115,22,.16)] hover:bg-orange-400 active:scale-[0.99]"
                     loading={Boolean(saving)} loadingLabel="Wird gespeichert…">{(
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Änderungen speichern
                        </>
                      )}</Button></div></motion.div>
      </main>

      {nameRequestOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-0  sm:items-center sm:p-4">
          <div className="w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-card shadow-2xl sm:max-w-md sm:rounded-[20px]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300/60">Mitgliedsdaten</div>
                <h3 className="mt-1 text-xl font-semibold text-white">Namensänderung anfragen</h3>
              </div>
              <button
                type="button"
                onClick={() => setNameRequestOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-orange-300/15 bg-orange-500/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-orange-100/75">
                Dein Name wird nicht sofort geändert. Die Anfrage wird gespeichert und später vom Vorstand geprüft.
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aktueller Name</div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 font-semibold text-muted-foreground">
                  {form.name || "—"}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Gewünschter neuer Name</div>
                <Input
                  value={requestedName}
                  onChange={(e) => setRequestedName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="h-12 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-muted-foreground"
                />
              </div>

              {nameRequestMessage ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-white/65">
                  {nameRequestMessage}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={() => void submitNameChangeRequest()}
                disabled={nameRequestSaving}
                className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-orange-400 disabled:opacity-40"
               loading={Boolean(nameRequestSaving)} loadingLabel="Wird gesendet …">{(
                  <><Send className="mr-2 h-4 w-4" />Anfrage senden</>
                )}</Button>
            </div>
          </div>
        </div>
      ) : null}

      <MobileBottomNav />
    </div>
  )
}

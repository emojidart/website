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
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Hash,
  Target,
  Building,
  Shirt,
  LockKeyhole,
  Send,
  X,
  CheckCircle2,
  XCircle,
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
    <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-black/25 px-3.5 py-3.5 shadow-none backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.05] sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07] text-orange-300 shadow-none">
            {icon}
          </div>
        ) : null}
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[11px]">{label}</p>
      </div>

      <Input
        type={type}
        className="mt-3 h-11 rounded-xl border-white/[0.09] bg-[#080c12]/95 px-3.5 font-semibold text-white shadow-none outline-none transition placeholder:text-white/25 focus-visible:border-orange-300/30 focus-visible:bg-[#0b1017] focus-visible:ring-2 focus-visible:ring-orange-400/10"
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
    <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-black/25 px-3.5 py-3.5 shadow-none backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/20 hover:bg-white/[0.05] sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07] shadow-none">
          <Target className="h-4 w-4 text-orange-300" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[11px]">Wurfhand</p>
      </div>

      <select
        className="mt-3 h-11 w-full rounded-xl border border-white/[0.09] bg-[#080c12]/95 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-orange-300/30 focus:bg-[#0b1017] focus:ring-2 focus:ring-orange-400/10"
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
      <main className="profile-data-premium relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Mitgliedsdaten" subtitle="Mein EMD" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_47%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.16),transparent_26%),radial-gradient(circle_at_90%_28%,rgba(14,165,233,.10),transparent_28%)]" />
        </div>

        <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pb-24 pt-20">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/35 shadow-[0_28px_90px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl">
            <div className="h-1.5 bg-orange-500" />
            <div className="flex flex-col items-center gap-5 px-6 py-9 sm:px-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                <Loader2 className="h-6 w-6 animate-spin text-orange-300" />
              </div>
              <div className="text-center">
                <div className="text-lg font-black tracking-tight text-white">Deine Daten werden geladen</div>
                <div className="mt-1 text-sm font-medium text-white/40">Einen Moment bitte.</div>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="profile-data-premium relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <Header variant="app" title="Meine Mitgliedsdaten" subtitle="Mein EMD" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.30]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.95)_47%,rgba(2,4,7,.99))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.16),transparent_26%),radial-gradient(circle_at_90%_28%,rgba(14,165,233,.10),transparent_28%)]" />
        </div>


      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Premium Header */}
          <motion.section
            variants={itemVariants}
            className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,.20),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,.10),transparent_28%)]" />

            <div className="relative px-4 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-orange-500/[0.08] text-orange-100 backdrop-blur-sm sm:h-12 sm:w-12">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200 sm:text-xs">
                        Mein Profil
                      </div>
                      <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl lg:text-4xl">
                        Meine Mitgliedsdaten
                      </h1>
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/35 sm:text-base">
                    Halte deine persönlichen Daten, Adresse und Kontaktdaten aktuell.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/55">
                    <CalendarDays className="h-3.5 w-3.5 text-orange-200" />
                    Mitglied seit {clubJoinedLabel}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

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
                      <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                        nameDecision.status === "approved" ? "text-emerald-200/60" : "text-red-200/60"
                      }`}>
                        Namensänderung
                      </div>
                      <div className="mt-1 text-lg font-black text-white">
                        {nameDecision.status === "approved"
                          ? "Deine Namensänderung wurde übernommen."
                          : "Deine Namensänderung wurde nicht übernommen."}
                      </div>
                      {nameDecision.requested_name ? (
                        <div className="mt-1 text-sm font-semibold text-white/45">
                          Angefragter Name: {nameDecision.requested_name}
                        </div>
                      ) : null}
                      {nameDecision.admin_note ? (
                        <div className="mt-2 text-sm font-semibold leading-6 text-white/60">
                          Hinweis: {nameDecision.admin_note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void acknowledgeNameDecision()}
                    className="shrink-0 rounded-xl border-white/10 bg-white/[0.05] font-black text-white/75 hover:bg-white/[0.09] hover:text-white"
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
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:rounded-[28px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <User className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">Persönlich</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">
                          Persönliche Daten
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
                      <div className="group relative min-w-0 overflow-hidden rounded-[20px] border border-orange-300/[0.10] bg-black/25 px-3.5 py-3.5 sm:border-white/[0.08] sm:bg-white/[0.035] sm:px-4 sm:py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                            <LockKeyhole className="h-4 w-4 text-orange-300" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[11px]">Name</p>
                            <div className="mt-1 text-xs font-bold text-white/25">Nur über Änderungsanfrage</div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/[0.09] bg-[#080c12]/95 px-3.5 py-3 font-black text-white">
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
                          className="mt-3 h-10 w-full rounded-xl border-orange-300/20 bg-orange-500/[0.07] font-black text-orange-100 hover:bg-orange-500/[0.13] hover:text-white"
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
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:rounded-[28px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <MapPin className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">Wohnadresse</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">
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
                <Card className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:rounded-[28px]">
                  <CardHeader className="border-b border-white/[0.07] px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.07]">
                        <Mail className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">Erreichbarkeit</div>
                        <CardTitle className="mt-0.5 text-lg font-black tracking-tight text-white sm:text-xl">
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
              <motion.section variants={itemVariants}>
                <Card className="relative overflow-hidden rounded-[24px] border border-orange-300/[0.11] bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:rounded-[28px]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(249,115,22,0.18),transparent_38%)]" />
                  <CardContent className="relative p-4 sm:p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-200 sm:text-xs">
                      Änderungen übernehmen
                    </div>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                      Daten speichern
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-white/35">
                      Prüfe deine Angaben kurz und speichere anschließend deine Änderungen.
                    </p>

                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="mt-5 h-12 w-full rounded-xl bg-orange-500 font-black text-white shadow-[0_0_28px_rgba(249,115,22,.16)] hover:bg-orange-400 active:scale-[0.99]"
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

      {nameRequestOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <div className="w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0f15] shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300/60">Mitgliedsdaten</div>
                <h3 className="mt-1 text-xl font-black text-white">Namensänderung anfragen</h3>
              </div>
              <button
                type="button"
                onClick={() => setNameRequestOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-orange-300/15 bg-orange-500/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-orange-100/75">
                Dein Name wird nicht sofort geändert. Die Anfrage wird gespeichert und später vom Vorstand geprüft.
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Aktueller Name</div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 font-black text-white/60">
                  {form.name || "—"}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Gewünschter neuer Name</div>
                <Input
                  value={requestedName}
                  onChange={(e) => setRequestedName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="h-12 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
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
                className="h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400 disabled:opacity-40"
              >
                {nameRequestSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gesendet …</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Anfrage senden</>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <MobileBottomNav />
    </div>
  )
}

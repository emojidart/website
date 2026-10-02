"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

import { motion } from "framer-motion"
import {
  Trash2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react"

type UserProfileLite = {
  id: string
  user_id: string
  player_id: string | null
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

const REASONS = [
  { id: "not_needed", label: "Ich nutze die App nicht mehr" },
  { id: "privacy", label: "Datenschutz / Vertrauen" },
  { id: "bugs", label: "Zu viele Bugs / Probleme" },
  { id: "missing_features", label: "Fehlende Funktionen" },
  { id: "switched", label: "Zu einer anderen App gewechselt" },
  { id: "other", label: "Anderer Grund" },
] as const

type ReasonId = (typeof REASONS)[number]["id"]

export default function KontoLoeschenPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfileLite | null>(null)

  const [reasonId, setReasonId] = useState<ReasonId | "">("")
  const [otherReason, setOtherReason] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [confirm1, setConfirm1] = useState(false)
  const [confirm2, setConfirm2] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, session, router])

  useEffect(() => {
    if (!session?.user) return

    ;(async () => {
      setLoading(true)

      const { data } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (data) setProfile(data as any)

      setLoading(false)
    })()
  }, [session?.user?.id])

  const reasonText = useMemo(() => {
    if (!reasonId) return ""

    const base = REASONS.find((r) => r.id === reasonId)?.label ?? ""

    if (reasonId === "other") {
      if (!otherReason.trim()) return ""
      return `Andere: ${otherReason}`
    }

    return base
  }, [reasonId, otherReason])

  const disabled = useMemo(() => {
    if (!reasonText) return true
    if (!confirm1 || !confirm2) return true
    if (submitting) return true
    return false
  }, [reasonText, confirm1, confirm2, submitting])

  async function submitRequest() {
    if (!session?.access_token) return

    setSubmitting(true)

    try {
      await fetch("/api/account-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reason: reasonText,
          contact_email: contactEmail || null,
          profile_id: profile?.id ?? null,
        }),
      })

      setOk(true)
    } catch (e: any) {
      setError("Fehler beim Senden")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
        <Header />

        {/* Stabiler Hintergrund wie im Member-Profil – ohne Fade/Flackern */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
          <div
            className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
            style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
          <div className="w-full">
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-orange-300" />
              <span className="text-base font-medium text-white/55">
                Lade…
              </span>
            </div>
          </div>
        </main>

        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* Stabiler Hintergrund wie im Member-Profil – ohne Fade/Flackern */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <motion.div
          className="w-full"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/* Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(239,68,68,.06)_78%,transparent)]" />
              <div className="relative flex items-start gap-4 p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10">
                  <ShieldAlert className="h-5 w-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-red-200"><span className="h-2 w-2 rounded-full bg-red-400" />Konto · Datenschutz</div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Konto löschen</h1>
                  <p className="mt-2 text-sm font-medium text-white/55">Antrag auf Löschung deines EMD VereinsApp-Kontos.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <Card className="rounded-[24px] border border-white/10 bg-black/35 shadow-[0_24px_80px_-54px_rgba(0,0,0,.95)] backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-black">
                <AlertTriangle className="w-5 h-5 text-orange-300" />
                Löschanfrage
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {ok && (
                <Alert className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <AlertTitle>Anfrage gesendet</AlertTitle>
                  <AlertDescription>
                    Wir melden uns bei Rückfragen.
                  </AlertDescription>
                </Alert>
              )}

              <RadioGroup
                value={reasonId}
                onValueChange={(v) => setReasonId(v as ReasonId)}
              >
                {REASONS.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <RadioGroupItem value={r.id} id={r.id} />
                    <Label htmlFor={r.id}>{r.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              {reasonId === "other" && (
                <Textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Bitte kurz beschreiben"
                  className="min-h-[110px] rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              )}

              <Input
                placeholder="Kontakt E-Mail (optional)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={confirm1}
                    onCheckedChange={(v) => setConfirm1(Boolean(v))}
                  />
                  <Label>Ich verstehe die Anfrage</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={confirm2}
                    onCheckedChange={(v) => setConfirm2(Boolean(v))}
                  />
                  <Label>Ich bestätige die Löschung</Label>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={submitRequest}
                  disabled={disabled}
                  className="h-11 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Löschanfrage senden
                </Button>

                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10"
                  onClick={() => router.push("/member-profile-app")}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
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
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
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
      <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
        <Header />

        <main className="pt-12 sm:pt-14">
          <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
              <span className="text-base font-medium text-gray-700">
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
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      <Header />

      <main className="pt-12 sm:pt-14">
        <motion.div
          className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Card */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-orange-600" />
                </div>

                <div>
                  <h1 className="text-lg font-black">Konto löschen</h1>

                  <p className="text-sm text-gray-600 mt-1">
                    Du stellst hier eine Löschanfrage.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-black">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Löschanfrage
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {ok && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
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
                  <div key={r.id} className="flex items-center gap-2">
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
                />
              )}

              <Input
                placeholder="Kontakt E-Mail (optional)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
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
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Löschanfrage senden
                </Button>

                <Button
                  variant="outline"
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
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

import { AlertTriangle, Loader2, Trash2, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react"

type UserProfileLite = {
  id: string
  user_id: string
  player_id: string | null
}

// "Zu teuer" + User-Badge entfernt
const REASONS = [
  { id: "not_needed", label: "Ich nutze die App nicht mehr" },
  { id: "privacy", label: "Datenschutz / Vertrauen" },
  { id: "bugs", label: "Zu viele Bugs / Probleme" },
  { id: "missing_features", label: "Fehlende Funktionen" },
  { id: "switched", label: "Zu einer anderen App gewechselt" },
  { id: "other", label: "Anderer Grund (bitte kurz schreiben)" },
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
      setError(null)
      setOk(false)

      const { data, error: profErr } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!profErr && data) setProfile(data as any)
      setLoading(false)
    })()
  }, [session?.user?.id])

  const reasonText = useMemo(() => {
    if (!reasonId) return ""
    const base = REASONS.find((r) => r.id === reasonId)?.label ?? ""
    if (reasonId === "other") {
      const extra = otherReason.trim()
      if (!extra) return ""
      return `Andere: ${extra}`
    }
    return base
  }, [reasonId, otherReason])

  const disabled = useMemo(() => {
    if (!reasonText || reasonText.trim().length < 5) return true
    if (!confirm1 || !confirm2) return true
    if (submitting) return true
    return false
  }, [reasonText, confirm1, confirm2, submitting])

  async function submitRequest() {
    if (!session?.access_token) return
    setSubmitting(true)
    setError(null)
    setOk(false)

    try {
      const res = await fetch("/api/account-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reason: reasonText.trim(),
          contact_email: contactEmail.trim() || null,
          app_store: "google_play",
          platform: "web",
          app_version: null,
          locale: typeof navigator !== "undefined" ? navigator.language : null,
          profile_id: profile?.id ?? null,
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Konnte Anfrage nicht senden.")
      }

      setOk(true)
      setReasonId("")
      setOtherReason("")
      setContactEmail("")
      setConfirm1(false)
      setConfirm2(false)
    } catch (e: any) {
      setError(e?.message ?? "Unbekannter Fehler")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10 max-w-3xl">
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
            <span className="text-base font-medium text-zinc-700">Lade…</span>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10 max-w-3xl">
        {/* nur zurück-button, ohne User-Badge */}
        <div className="mb-5">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 bg-white/80 backdrop-blur border-zinc-200 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        </div>

        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100">
              <Trash2 className="h-5 w-5 text-orange-700" />
            </span>
            Konto löschen
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Du stellst hier eine <span className="font-medium text-zinc-800">Löschanfrage</span>. Wir prüfen sie und
            melden uns bei Rückfragen.
          </p>
        </div>

        <Card className="border-zinc-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Löschanfrage
            </CardTitle>
            <CardDescription className="text-sm">
              Wähle einen Grund aus und bestätige die beiden Punkte.
            </CardDescription>

            <Alert className="mt-2 border-orange-200 bg-orange-50/60">
              <ShieldAlert className="h-4 w-4 text-orange-700" />
              <AlertTitle className="text-orange-900">Wichtig</AlertTitle>
              <AlertDescription className="text-orange-900/80">
                Das Absenden erstellt eine Anfrage. Die endgültige Löschung kann je nach Prüfung etwas dauern.
              </AlertDescription>
            </Alert>
          </CardHeader>

          <CardContent className="space-y-5">
            {error ? (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {ok ? (
              <Alert className="rounded-2xl border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertTitle className="text-green-900">Anfrage gesendet</AlertTitle>
                <AlertDescription className="text-green-900/80">
                  Wir melden uns, falls Rückfragen nötig sind.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Gründe anklicken */}
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <Label className="text-sm font-medium">
                  Warum möchtest du dein Konto löschen? <span className="text-orange-700">*</span>
                </Label>
                <span className="text-xs text-zinc-500">{reasonText ? "Ausgewählt" : "Bitte wählen"}</span>
              </div>

              <RadioGroup
                value={reasonId}
                onValueChange={(v) => setReasonId(v as ReasonId)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {REASONS.map((r) => {
                  const active = reasonId === r.id
                  return (
                    <div key={r.id} className="relative">
                      <RadioGroupItem value={r.id} id={`reason-${r.id}`} className="peer sr-only" />
                      <Label
                        htmlFor={`reason-${r.id}`}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition",
                          "bg-white hover:bg-zinc-50",
                          active ? "border-orange-300 ring-2 ring-orange-200" : "border-zinc-200"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border",
                            active ? "border-orange-400 bg-orange-50" : "border-zinc-300 bg-white"
                          )}
                        >
                          {active ? <span className="h-2.5 w-2.5 rounded-full bg-orange-600" /> : null}
                        </span>

                        <span className="text-sm leading-snug text-zinc-800">{r.label}</span>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>

              {reasonId === "other" ? (
                <div className="pt-2 space-y-2">
                  <Label htmlFor="otherReason" className="text-sm font-medium">
                    Bitte kurz beschreiben <span className="text-orange-700">*</span>
                  </Label>
                  <Textarea
                    id="otherReason"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="z.B. Ich habe ein neues Konto / …"
                    className={cn(
                      "min-h-[110px] rounded-2xl",
                      otherReason.trim().length > 0 && otherReason.trim().length < 5
                        ? "border-orange-300 focus-visible:ring-orange-300"
                        : ""
                    )}
                  />
                  <p className="text-xs text-zinc-500">Mindestens 5 Zeichen.</p>
                </div>
              ) : null}

              {!reasonId ? <p className="text-xs text-orange-700">Bitte einen Grund auswählen.</p> : null}
            </div>

            {/* Kontakt */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Kontakt E-Mail <span className="text-zinc-400">(optional)</span>
              </Label>
              <Input
                id="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@mail.com"
                className="rounded-2xl"
              />
              <p className="text-xs text-zinc-500">Falls wir Rückfragen haben, können wir dich hier erreichen.</p>
            </div>

            <Separator />

            {/* Bestätigungen */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Bestätigungen</div>

              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="confirm1"
                    checked={confirm1}
                    onCheckedChange={(v) => setConfirm1(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="confirm1" className="text-sm leading-relaxed cursor-pointer">
                    Ich verstehe, dass das eine <span className="font-medium">Löschanfrage</span> ist und die Bearbeitung
                    ggf. etwas dauert.
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="confirm2"
                    checked={confirm2}
                    onCheckedChange={(v) => setConfirm2(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="confirm2" className="text-sm leading-relaxed cursor-pointer">
                    Ich bestätige, dass ich wirklich die Löschung meines Kontos anstoßen möchte.
                  </Label>
                </div>
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={submitRequest}
                disabled={disabled}
                className={cn(
                  "rounded-2xl",
                  "bg-orange-600 hover:bg-orange-700",
                  "disabled:opacity-60 disabled:hover:bg-orange-600"
                )}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Löschanfrage senden
              </Button>

              <Button variant="outline" onClick={() => router.push("/member-profile-app")} className="rounded-2xl">
                Abbrechen
              </Button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Nach dem Absenden prüfen wir deine Anfrage und löschen dein Konto anschließend.
              Du erhältst ggf. eine Rückfrage per E-Mail, falls etwas unklar ist.
            </p>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  )
}
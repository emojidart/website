"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { AlertTriangle, Loader2, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react"

type UserProfileLite = {
  id: string
  user_id: string
  player_id: string | null
}

export default function KontoLoeschenPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfileLite | null>(null)

  const [reason, setReason] = useState("")
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

      // optional: profile_id mitschicken (falls du’s willst)
      const { data, error: profErr } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!profErr && data) setProfile(data as any)
      setLoading(false)
    })()
  }, [session?.user?.id])

  const disabled = useMemo(() => {
    const r = reason.trim()
    if (!r || r.length < 5) return true
    if (!confirm1 || !confirm2) return true
    if (submitting) return true
    return false
  }, [reason, confirm1, confirm2, submitting])

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
          reason: reason.trim(),
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

      // optional: user ausloggen (keine echte Löschung hier - nur Anfrage)
      // await supabase.auth.signOut()

      setReason("")
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
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-3xl overflow-x-hidden">
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-lg font-medium">Lade…</span>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-3xl overflow-x-hidden">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-orange-600" />
            Konto löschen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Hier kannst du eine <span className="font-medium">Löschanfrage</span> stellen.
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-xl font-bold">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Löschanfrage
              </span>

              <Badge variant="outline" className="text-xs">
                User: {session?.user?.id?.slice(0, 8)}…
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            {ok ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium">Anfrage gesendet</div>
                  <div className="text-xs mt-0.5">Wir melden uns, falls Rückfragen nötig sind.</div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs text-gray-500">Warum möchtest du dein Konto löschen? (Pflicht)</div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. App nicht mehr nötig / Datenschutz / neues Konto /"
                className="min-h-[120px]"
              />
              <div className="text-[11px] text-gray-500">Mindestens 5 Zeichen.</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-500">Kontakt E-Mail (optional)</div>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@mail.com"
              />
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4 space-y-2">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirm1}
                  onChange={(e) => setConfirm1(e.target.checked)}
                />
                <span>
                  Ich verstehe, dass das eine <span className="font-medium">Löschanfrage</span> ist und die Bearbeitung ggf. etwas dauert.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirm2}
                  onChange={(e) => setConfirm2(e.target.checked)}
                />
                <span>
                  Ich bestätige, dass ich wirklich die Löschung meines Kontos anstoßen möchte.
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={submitRequest}
                disabled={disabled}
                className="bg-orange-600 hover:bg-orange-700 rounded-xl"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Löschanfrage senden
              </Button>

              <Button variant="outline" onClick={() => router.push("/member-profile-app")} className="rounded-xl">
                Abbrechen
              </Button>
            </div>

            <div className="text-[11px] text-gray-500 leading-relaxed">
              Nach dem Absenden prüfen wir deine Anfrage und löschen dein Konto anschließend.
Du erhältst ggf. eine Rückfrage per E-Mail, falls etwas unklar ist.
            </div>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Send, UserPlus } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type JoinRequestLite = {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  created_at: string
}

export default function ClubJoinPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState("")
  const [existing, setExisting] = useState<JoinRequestLite | null>(null)
  const [linkedSpieldatenbankId, setLinkedSpieldatenbankId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birthdate: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    phone: "",
    jersey_size: "",
    note: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error("Bitte zuerst einloggen.")

        setUserId(user.id)

        const [requestRes, guestRes] = await Promise.all([
          supabase
            .from("club_join_requests")
            .select("id,status,created_at")
            .eq("user_id", user.id)
            .in("status", ["pending", "approved"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("guest_requests")
            .select("full_name,player_name,linked_spieldatenbank_id")
            .eq("auth_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        if (requestRes.error) throw requestRes.error
        if (guestRes.error) throw guestRes.error

        setExisting((requestRes.data || null) as JoinRequestLite | null)
        setLinkedSpieldatenbankId(guestRes.data?.linked_spieldatenbank_id || null)
        setForm((prev) => ({
          ...prev,
          full_name: guestRes.data?.full_name || guestRes.data?.player_name || prev.full_name,
          email: user.email || prev.email,
        }))
      } catch (error: any) {
        setMessage({ type: "error", text: error?.message || "Beitrittsseite konnte nicht geladen werden." })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit() {
    if (!userId) return
    if (!form.full_name.trim()) {
      setMessage({ type: "error", text: "Bitte gib deinen vollständigen Namen ein." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const { data, error } = await supabase
        .from("club_join_requests")
        .insert({
          user_id: userId,
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          birthdate: form.birthdate || null,
          street: form.street.trim() || null,
          house_number: form.house_number.trim() || null,
          postal_code: form.postal_code.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          jersey_size: form.jersey_size.trim() || null,
          linked_spieldatenbank_id: linkedSpieldatenbankId,
          note: form.note.trim() || null,
          status: "pending",
        })
        .select("id,status,created_at")
        .single()

      if (error) throw error

      try {
        const notifyResponse = await fetch("/api/notify-new-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "club_join_request",
            fullName: form.full_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }),
        })

        if (!notifyResponse.ok) {
          const notifyError = await notifyResponse.json().catch(() => null)
          console.error("[club-join] Info-Mail konnte nicht gesendet werden:", notifyError)
        }
      } catch (notifyError) {
        console.error("[club-join] Info-Mail Fehler:", notifyError)
      }

      setExisting(data as JoinRequestLite)
      setMessage({
        type: "success",
        text: "Deine Beitrittsanfrage wurde gesendet. Bis zur Bestätigung bleibst du ganz normal Gast.",
      })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Die Beitrittsanfrage konnte nicht gesendet werden." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div>
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Card className="overflow-hidden rounded-2xl border-orange-200">
        <div className="h-2 bg-orange-600" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-600" />
            Verein beitreten
          </CardTitle>
          <CardDescription>
            Du bleibst Gast, bis deine Anfrage von der Vereinsleitung bestätigt wurde. Dein bestehender Account bleibt erhalten.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {existing?.status === "pending" ? (
            <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div>
                <div className="font-black text-orange-900">Beitrittsanfrage wird geprüft</div>
                <p className="mt-1 text-sm font-semibold text-orange-800">
                  Deine Anfrage ist bereits eingelangt. Du musst nichts weiter machen.
                </p>
              </div>

              <Button asChild variant="outline" className="w-full rounded-xl border-orange-300 bg-white font-black text-orange-800 hover:bg-orange-100">
                <Link href="/guest-profile-app">Zurück zum Gastprofil</Link>
              </Button>
            </div>
          ) : existing?.status === "approved" ? (
            <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
              <div>
                <div className="flex items-center gap-2 font-black text-green-900">
                  <CheckCircle2 className="h-5 w-5" />
                  Beitritt bestätigt
                </div>
                <p className="mt-1 text-sm font-semibold text-green-800">
                  Du wurdest bereits als Vereinsmitglied aufgenommen.
                </p>
              </div>

              <Button asChild className="w-full rounded-xl bg-green-700 font-black text-white hover:bg-green-800">
                <Link href="/member-profile-app">EMD VereinsApp öffnen</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Vor- und Nachname</Label>
                  <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Geburtsdatum</Label>
                  <Input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} />
                </div>

                <div className="space-y-2"><Label>Straße</Label><Input value={form.street} onChange={(e) => setField("street", e.target.value)} /></div>
                <div className="space-y-2"><Label>Hausnummer</Label><Input value={form.house_number} onChange={(e) => setField("house_number", e.target.value)} /></div>
                <div className="space-y-2"><Label>PLZ</Label><Input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} /></div>
                <div className="space-y-2"><Label>Ort</Label><Input value={form.city} onChange={(e) => setField("city", e.target.value)} /></div>
                <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
                <div className="space-y-2"><Label>Trikotgröße (optional)</Label><Input value={form.jersey_size} onChange={(e) => setField("jersey_size", e.target.value)} /></div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Nachricht an den Verein (optional)</Label>
                  <Textarea value={form.note} onChange={(e) => setField("note", e.target.value)} placeholder="Optionaler Hinweis..." />
                </div>
              </div>

              <Button type="button" onClick={() => void submit()} disabled={saving} className="w-full bg-orange-600 font-black text-white hover:bg-orange-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Beitrittsanfrage senden
              </Button>
            </>
          )}

          {message ? (
            <div className={
              message.type === "success"
                ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800"
                : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
            }>
              {message.text}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

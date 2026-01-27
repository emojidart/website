"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react"

export default function SetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setStatus({ type: "error", message: "Du bist nicht eingeloggt. Bitte den Link aus der E‑Mail erneut öffnen." })
        setLoading(false)
        return
      }
      setLoading(false)
    }
    init()
  }, [])

  const pwOk = useMemo(() => pw1.length >= 8, [pw1])
  const match = useMemo(() => pw1 === pw2, [pw1, pw2])
  const canSave = pwOk && match && !saving && !loading

  const save = async () => {
    setStatus({ type: null, message: "" })
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 })
      if (error) throw error

      setStatus({ type: "success", message: "Passwort gespeichert! Du kannst dich jetzt anmelden." })
      setTimeout(() => router.replace("/login"), 1200)
    } catch (e: any) {
      setStatus({ type: "error", message: e?.message || "Passwort konnte nicht gespeichert werden." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-700" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="font-black text-2xl text-gray-900">Passwort festlegen</div>
            <p className="text-sm text-gray-600">Lege jetzt dein Passwort fest, um dein Vereins‑Konto zu aktivieren.</p>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Neues Passwort</label>
              <div className="relative">
                <Input type={show ? "text" : "password"} value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="mind. 8 Zeichen" className="pr-12" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-xs ${pwOk ? "text-green-700" : "text-gray-500"}`}>{pwOk ? "✓ Länge passt" : "Mindestens 8 Zeichen"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Passwort wiederholen</label>
              <Input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="nochmal eingeben" />
              <p className={`text-xs ${pw2 ? (match ? "text-green-700" : "text-red-600") : "text-gray-500"}`}>{pw2 ? (match ? "✓ stimmt überein" : "Passwörter sind nicht gleich") : ""}</p>
            </div>

            {status.type ? (
              <div
                className={`rounded-xl p-4 text-sm ${
                  status.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {status.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
                  <div>{status.message}</div>
                </div>
              </div>
            ) : null}

            <Button onClick={save} disabled={!canSave} className="w-full rounded-xl h-11 font-extrabold bg-orange-600 hover:bg-orange-700">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichern...
                </span>
              ) : (
                "Passwort speichern"
              )}
            </Button>

            <p className="text-xs text-gray-500">Nach dem Speichern wirst du zur Login‑Seite weitergeleitet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

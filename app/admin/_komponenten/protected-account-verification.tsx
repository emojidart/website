"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Shield, Trash2, Users } from "lucide-react"

const OWNER_USER_ID = "966f979e-e14d-4d86-abbe-21a2d93eade9"

// Entirely isolated interface: this component has no service-role access,
// no actual delete handler, and no way to toggle administration privileges.
export function ProtectedAccountVerification() {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const start = () => {
    setConfirmed(false)
    setError("")
    setOpen(true)
  }

  const confirm = async () => {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const { error: rpcError } = await supabase.rpc("record_protected_account_delete_attempt", {
        p_target_user_id: OWNER_USER_ID,
      })
      if (rpcError) throw rpcError
      setConfirmed(true)
    } catch {
      setError("Der Vorgang konnte nicht verarbeitet werden.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-12 pt-20">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3 text-gray-900">
          <Shield className="h-7 w-7 text-blue-700" />
          <div>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-sm text-gray-500">Benutzerverwaltung</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Benutzerverwaltung</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">Gamal Wilhelmer</p>
              <p className="text-sm text-gray-500">Administrator</p>
            </div>
            <Button className="bg-red-700 hover:bg-red-800" onClick={start}>
              <Trash2 className="mr-2 h-4 w-4" /> Dauerhaft sperren & löschen
            </Button>
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) setOpen(false) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-white">
          {confirmed ? (
            <div className="space-y-4 py-4 text-center">
              <div className="text-5xl" aria-hidden="true">🙂</div>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">Interessant.</DialogTitle>
              </DialogHeader>
              <p>Du hast soeben versucht, ein geschütztes Konto dauerhaft zu löschen.</p>
              <p className="font-semibold">Die Aktion wurde aufgezeichnet.</p>
              <p className="text-xs text-gray-500">Es wurde kein Konto gelöscht oder gesperrt.</p>
              <Button className="w-full" onClick={() => setOpen(false)}>Schließen</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-red-700">Dauerhaft sperren & löschen</DialogTitle>
              </DialogHeader>
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                Möchtest du die endgültige Entfernung des Kontos „Gamal Wilhelmer“ bestätigen?
              </p>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button className="flex-1 bg-red-700 hover:bg-red-800" disabled={saving} onClick={confirm}>
                  {saving ? "Wird geprüft ..." : "Endgültig bestätigen"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

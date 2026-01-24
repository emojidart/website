"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { CheckCircle, AlertCircle, Loader2, LogIn, UserPlus, LogOut } from "lucide-react"

export default function DKOSelfRegistrationPage() {
  const router = useRouter()
  const { session, user, loading: authLoading } = useAuth() as any

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [playerId, setPlayerId] = useState<string | null>(null) // spieldatenbank.id (uuid)
  const [playerName, setPlayerName] = useState<string>("")

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const canAct = useMemo(() => {
    return !!session && !!playerId && !!playerName && !actionLoading
  }, [session, playerId, playerName, actionLoading])

  // 1) Spieler-ID + Name aus Profil -> club_players -> spieldatenbank
  useEffect(() => {
    const run = async () => {
      setMessage(null)

      if (!session?.user) {
        setLoading(false)
        setPlayerId(null)
        setPlayerName("")
        setAlreadyRegistered(false)
        return
      }

      setLoading(true)

      try {
        // Annahme (passt zu deinem bisherigen Pattern):
        // user_profiles hat user_id und Relation club_players(...)
        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("club_players(spieldatenbank_id)")
          .eq("user_id", session.user.id)
          .single()

        if (profErr) throw profErr

        const spieldatenbankId = profile?.club_players?.spieldatenbank_id
        if (!spieldatenbankId) {
          setPlayerId(null)
          setPlayerName("")
          setAlreadyRegistered(false)
          setMessage({
            type: "error",
            text: "Dein Profil ist noch nicht mit der Spieldatenbank verknüpft (spieldatenbank_id fehlt).",
          })
          return
        }

        setPlayerId(String(spieldatenbankId))

        // Name immer aus spieldatenbank holen (wie du es willst)
        const { data: spieler, error: spielErr } = await supabase
          .from("spieldatenbank")
          .select("name")
          .eq("id", spieldatenbankId)
          .single()

        if (spielErr) throw spielErr

        const name = spieler?.name ?? ""
        setPlayerName(name)

        // 2) Check: schon registriert?
        const { data: reg, error: regErr } = await supabase
          .from("dko_tournament_registration")
          .select("id")
          .eq("player_id", String(spieldatenbankId))
          .limit(1)

        if (regErr) throw regErr

        setAlreadyRegistered((reg?.length ?? 0) > 0)
      } catch (e: any) {
        console.error(e)
        setMessage({ type: "error", text: `Fehler beim Laden: ${e.message}` })
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [session])

  const handleRegister = async () => {
    if (!playerId || !playerName) return

    setActionLoading(true)
    setMessage(null)

    try {
      // Eintragen (ohne Email)
      // entry_fee: 0 -> Admin kann es später setzen/bezahlen markieren
      const { error } = await supabase.from("dko_tournament_registration").insert({
        player_id: playerId,
        player_name: playerName,
        paid: false,
        entry_fee: 0,
        deducted_from_credit: false,
      })

      if (error) throw error

      setAlreadyRegistered(true)
      setMessage({ type: "success", text: "Du bist jetzt fürs heutige Turnier registriert!" })
    } catch (e: any) {
      // Bei Unique Index kommt oft "duplicate key value"
      const msg = String(e?.message || "")
      if (msg.toLowerCase().includes("duplicate")) {
        setAlreadyRegistered(true)
        setMessage({ type: "success", text: "Du warst bereits registriert." })
      } else {
        setMessage({ type: "error", text: `Fehler bei der Anmeldung: ${e.message}` })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnregister = async () => {
    if (!playerId) return

    setActionLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("dko_tournament_registration").delete().eq("player_id", playerId)
      if (error) throw error

      setAlreadyRegistered(false)
      setMessage({ type: "success", text: "Du wurdest abgemeldet." })
    } catch (e: any) {
      setMessage({ type: "error", text: `Fehler beim Abmelden: ${e.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
        <Card className="w-full max-w-md p-6 shadow-lg">
          <CardTitle className="text-2xl font-bold text-center mb-6">DKO Turnier Anmeldung</CardTitle>

          <CardContent className="space-y-4">
            {authLoading || loading ? (
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Lade…</span>
              </div>
            ) : !session ? (
              <>
                <div className="p-3 rounded-md text-sm bg-yellow-50 text-yellow-800 border border-yellow-100">
                  Bitte einloggen, um dich selbst zu registrieren.
                </div>
                <Button
                  onClick={() => router.push("/member-login")}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    <span>Einloggen</span>
                  </div>
                </Button>
              </>
            ) : !playerId || !playerName ? (
              <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-100">
                Dein Account ist nicht mit der Spieldatenbank verknüpft. Bitte Admin kontaktieren.
              </div>
            ) : (
              <>
                <div className="p-3 rounded-md text-sm bg-white border">
                  <div className="font-semibold text-gray-900">Angemeldet als:</div>
                  <div className="mt-1 text-gray-700">
                    <div>
                      <span className="font-medium">Name:</span> {playerName}
                    </div>
                  </div>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-md text-sm font-medium flex items-center gap-2 ${
                      message.type === "error"
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-green-50 text-green-700 border border-green-100"
                    }`}
                  >
                    {message.type === "error" ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                {alreadyRegistered ? (
                  <Button
                    onClick={handleUnregister}
                    disabled={!canAct}
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Abmelden…</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        <span>Abmelden</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleRegister}
                    disabled={!canAct}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Anmelden…</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        <span>Für heute registrieren</span>
                      </div>
                    )}
                  </Button>
                )}

                <div className="text-xs text-gray-500 text-center">
                  Nach der Anmeldung erscheinst du automatisch in der Admin-Registrierungsliste.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

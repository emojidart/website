"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Calendar, Clock, Crown, CheckCircle, AlertCircle, Loader2, LogIn, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface TournamentRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentDate: string // "02. Feb. 2026" oder "02. Februar 2026"
  tournamentTime: string // "19:30"
}

function parseGermanDateToISO(dateStr: string): string | null {
  const parts = dateStr.replace(",", " ").split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null

  const dayRaw = parts[0].replace(".", "")
  const monthRaw = parts[1].replace(".", "")
  const yearRaw = parts[2]

  const day = Number(dayRaw)
  const year = Number(yearRaw)
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null

  const monthMap: { [key: string]: string } = {
    Januar: "01",
    Jan: "01",
    Februar: "02",
    Feb: "02",
    März: "03",
    Mär: "03",
    April: "04",
    Apr: "04",
    Mai: "05",
    Juni: "06",
    Jun: "06",
    Juli: "07",
    Jul: "07",
    August: "08",
    Aug: "08",
    September: "09",
    Sep: "09",
    Oktober: "10",
    Okt: "10",
    November: "11",
    Nov: "11",
    Dezember: "12",
    Dez: "12",
  }

  const monthNum = monthMap[monthRaw] || monthMap[monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1)]
  if (!monthNum) return null

  const dd = String(day).padStart(2, "0")
  return `${year}-${monthNum}-${dd}`
}

export function TournamentRegistrationModal({
  isOpen,
  onClose,
  tournamentDate,
  tournamentTime,
}: TournamentRegistrationModalProps) {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [playerName, setPlayerName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [profileLoading, setProfileLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)

  const formattedDate = useMemo(() => parseGermanDateToISO(tournamentDate), [tournamentDate])

  useEffect(() => {
    const run = async () => {
      if (!isOpen) return

      setMessage("")
      setSuccess(false)
      setAlreadyRegistered(false)

      if (!session?.user) {
        setPlayerName("")
        setEmail("")
        return
      }

      setProfileLoading(true)
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("club_players(name)")
          .eq("user_id", session.user.id)
          .single()

        if (error) throw error

        setPlayerName(data?.club_players?.name ?? "")
        setEmail(session.user.email ?? "")
      } catch (err: any) {
        console.error("Error loading profile:", err)
        setMessage("Profil konnte nicht geladen werden. Bitte erneut versuchen.")
      } finally {
        setProfileLoading(false)
      }
    }

    run()
  }, [isOpen, session])

  // ✅ Doppel-Anmeldung prüfen (anmeldungen: typ + datum + zeit + email)
  useEffect(() => {
    const check = async () => {
      if (!isOpen) return
      if (!session?.user) return
      if (!formattedDate) return
      if (!session.user.email) return

      setCheckingRegistration(true)
      try {
        const { data, error } = await supabase
          .from("anmeldungen")
          .select("id")
          .eq("turnier_typ", "edart")
          .eq("turnier_datum", formattedDate)
          .eq("turnier_zeit", tournamentTime)
          .eq("email", session.user.email)
          .limit(1)

        if (error) throw error
        setAlreadyRegistered((data?.length ?? 0) > 0)
      } catch (err: any) {
        console.error("Error checking registration:", err)
      } finally {
        setCheckingRegistration(false)
      }
    }

    check()
  }, [isOpen, session, formattedDate, tournamentTime])

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      if (!session?.user) {
        setMessage("Bitte zuerst einloggen, um dich anzumelden.")
        return
      }

      if (!formattedDate) {
        setMessage("Turnierdatum konnte nicht gelesen werden.")
        return
      }

      if (!playerName?.trim() || !email?.trim()) {
        setMessage("Dein Profil ist unvollständig (Name/E-Mail). Bitte im Member-Profil vervollständigen.")
        return
      }

      if (alreadyRegistered) {
        setMessage("Du bist für dieses Turnier bereits angemeldet.")
        return
      }

      // Doppelcheck direkt vor Insert
      const { data: exists, error: existsErr } = await supabase
        .from("anmeldungen")
        .select("id")
        .eq("turnier_typ", "edart")
        .eq("turnier_datum", formattedDate)
        .eq("turnier_zeit", tournamentTime)
        .eq("email", email.trim())
        .limit(1)

      if (existsErr) throw existsErr
      if ((exists?.length ?? 0) > 0) {
        setAlreadyRegistered(true)
        setMessage("Du bist für dieses Turnier bereits angemeldet.")
        return
      }

      const { error } = await supabase.from("anmeldungen").insert([
        {
          spieler_name: playerName.trim(),
          turnier_typ: "edart",
          turnier_datum: formattedDate,
          turnier_zeit: tournamentTime,
          email: email.trim(),
          telefon: null,
          notizen: null,
        },
      ])

      if (error) throw error

      setAlreadyRegistered(true)
      setSuccess(true)
      setMessage("Anmeldung erfolgreich! Du bist für das Turnier registriert.")
    } catch (err: any) {
      setMessage(`Fehler bei der Anmeldung: ${err.message}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleUnregister = async () => {
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      if (!session?.user) {
        setMessage("Bitte zuerst einloggen.")
        return
      }

      if (!formattedDate) {
        setMessage("Turnierdatum konnte nicht gelesen werden.")
        return
      }

      const userEmail = session.user.email ?? ""
      if (!userEmail) {
        setMessage("E-Mail fehlt im Login. Bitte erneut einloggen.")
        return
      }

      const { error } = await supabase
        .from("anmeldungen")
        .delete()
        .eq("turnier_typ", "edart")
        .eq("turnier_datum", formattedDate)
        .eq("turnier_zeit", tournamentTime)
        .eq("email", userEmail)

      if (error) throw error

      setAlreadyRegistered(false)
      setSuccess(true)
      setMessage("Du wurdest erfolgreich abgemeldet.")
    } catch (err: any) {
      setMessage(`Fehler beim Abmelden: ${err.message}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setMessage("")
    setSuccess(false)
    setLoading(false)
    setProfileLoading(false)
    setAlreadyRegistered(false)
    setCheckingRegistration(false)
  }

  const disabledReason = useMemo(() => {
    if (!session) return "Bitte einloggen."
    if (!formattedDate) return "Turnierdatum ungültig."
    if (!playerName?.trim() || !email?.trim()) return "Profil unvollständig (Name/E-Mail)."
    return null
  }, [session, formattedDate, playerName, email])

  const canDoAction =
    !!session &&
    !authLoading &&
    !profileLoading &&
    !checkingRegistration &&
    !loading &&
    !!formattedDate &&
    !!playerName?.trim() &&
    !!email?.trim()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">Lion Cup Anmeldung</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Für das Turnier registrieren</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-xl p-4 mb-6 border bg-orange-50 border-orange-100">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-900">{tournamentDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-900">{tournamentTime}</span>
              </div>
            </div>
          </div>

          {authLoading ? (
            <div className="text-sm text-gray-600">Lade Benutzerstatus…</div>
          ) : !session ? (
            <div className="p-3 rounded-md text-sm bg-yellow-50 text-yellow-800 border border-yellow-100">
              Bitte melde dich an, um dich für dieses Turnier zu registrieren.
            </div>
          ) : (
            <div className="p-3 rounded-md text-sm bg-gray-50 text-gray-700 border border-gray-100 mb-4">
              <div className="font-semibold">Du meldest dich an als:</div>
              <div className="mt-1">
                <div>
                  <span className="font-medium">Name:</span> {profileLoading ? "lädt…" : playerName || "(fehlt)"}
                </div>
                <div>
                  <span className="font-medium">E-Mail:</span> {email || "(fehlt)"}
                </div>
              </div>

              {checkingRegistration && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Prüfe Anmeldung…
                </div>
              )}

              {alreadyRegistered && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-md p-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Du bist bereits angemeldet.
                </div>
              )}
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 mt-4 ${
                success
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                {success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          {!authLoading && !session ? (
            <Button
              type="button"
              onClick={() => router.push("/member-login")}
              className="w-full h-12 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white"
            >
              <div className="flex items-center space-x-2">
                <LogIn className="h-4 w-4" />
                <span>Einloggen</span>
              </div>
            </Button>
          ) : alreadyRegistered ? (
            <Button
              type="button"
              onClick={handleUnregister}
              disabled={!canDoAction}
              title={disabledReason ?? undefined}
              className="w-full h-12 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Abmelden…</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span>Abmelden</span>
                </div>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => handleRegister()}
              disabled={!canDoAction}
              title={disabledReason ?? undefined}
              className="w-full h-12 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Anmeldung läuft…</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Jetzt anmelden</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

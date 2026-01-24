"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  Calendar,
  Clock,
  MapPin,
  Euro,
  Swords,
  Loader2,
  CheckCircle,
  AlertCircle,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface PublicUpcomingTournamentRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentId: string | null
  tournamentName: string | null
  tournamentDate: string | null // kann ISO ODER deutsch formatiert sein
  tournamentTime: string | null // "19:30" oder "19:30 Uhr"
  tournamentLocation: string | null
  tournamentMode: string | null
  tournamentEntryFee: number | null
}

function normalizeTime(time: string | null): string | null {
  if (!time) return null
  const t = time.replace("Uhr", "").trim()
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = String(Number(m[1])).padStart(2, "0")
  const min = String(Number(m[2])).padStart(2, "0")
  return `${h}:${min}`
}

function parseDateFlexible(dateStr: string | null): { y: number; m: number; d: number } | null {
  if (!dateStr) return null
  const s = dateStr.trim()

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3])
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return { y, m, d }
  }

  const dmY = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dmY) {
    const d = Number(dmY[1])
    const m = Number(dmY[2])
    const y = Number(dmY[3])
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return { y, m, d }
  }

  const monthMap: Record<string, number> = {
    januar: 1,
    jan: 1,
    februar: 2,
    feb: 2,
    märz: 3,
    maerz: 3,
    mär: 3,
    mar: 3,
    april: 4,
    apr: 4,
    mai: 5,
    juni: 6,
    jun: 6,
    juli: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    oktober: 10,
    okt: 10,
    november: 11,
    nov: 11,
    dezember: 12,
    dez: 12,
  }

  const parts = s.replace(",", " ").split(/\s+/).filter(Boolean)
  if (parts.length >= 3) {
    const dayRaw = parts[0].replace(".", "")
    const monthRaw = parts[1].replace(".", "").toLowerCase()
    const yearRaw = parts[2].replace(".", "")

    const d = Number(dayRaw)
    const y = Number(yearRaw)
    const m = monthMap[monthRaw]

    if (Number.isFinite(d) && Number.isFinite(y) && Number.isFinite(m)) {
      return { y, m, d }
    }
  }

  return null
}

function buildLocalDateTime(dateStr: string | null, timeStr: string | null): Date | null {
  const date = parseDateFlexible(dateStr)
  const time = normalizeTime(timeStr)
  if (!date || !time) return null

  const [hh, mm] = time.split(":").map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null

  const dt = new Date(date.y, date.m - 1, date.d, hh, mm, 0, 0)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

export function PublicUpcomingTournamentRegistrationModal({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  tournamentDate,
  tournamentTime,
  tournamentLocation,
  tournamentMode,
  tournamentEntryFee,
}: PublicUpcomingTournamentRegistrationModalProps) {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [playerName, setPlayerName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [profileLoading, setProfileLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)

  // optional: nicht fürs Disable notwendig, aber behalten wie vorher
  const tournamentStart = useMemo(() => buildLocalDateTime(tournamentDate, tournamentTime), [tournamentDate, tournamentTime])

  useEffect(() => {
    const loadProfile = async () => {
      if (!isOpen) return

      setMessage(null)
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
        setMessage({ type: "error", text: "Profil konnte nicht geladen werden. Bitte erneut versuchen." })
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [isOpen, session])

  // ✅ Check ob schon angemeldet (tournament_id + email)
  useEffect(() => {
    const check = async () => {
      if (!isOpen) return
      if (!session?.user) return
      if (!tournamentId) return

      const userEmail = session.user.email ?? ""
      if (!userEmail) return

      setCheckingRegistration(true)
      try {
        const { data, error } = await supabase
          .from("tournament_registrations")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("email", userEmail)
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
  }, [isOpen, session, tournamentId])

  const handleRegister = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!tournamentId) {
        setMessage({ type: "error", text: "Fehler: Turnier-ID fehlt." })
        return
      }

      if (!session?.user) {
        setMessage({ type: "error", text: "Bitte zuerst einloggen, um dich anzumelden." })
        return
      }

      // (kein 7-Tage Check)
      if (!tournamentStart) {
        setMessage({
          type: "error",
          text: "Turnierdatum/-zeit konnte nicht gelesen werden. (Format prüfen: z.B. 26.01.2026 und 19:30)",
        })
        return
      }

      if (alreadyRegistered) {
        setMessage({ type: "error", text: "Du bist für dieses Turnier bereits angemeldet." })
        return
      }

      if (!playerName?.trim() || !email?.trim()) {
        setMessage({
          type: "error",
          text: "Dein Profil ist unvollständig (Name/E-Mail). Bitte im Member-Profil vervollständigen.",
        })
        return
      }

      // Doppelcheck direkt vor Insert
      const { data: exists, error: existsErr } = await supabase
        .from("tournament_registrations")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("email", email.trim())
        .limit(1)

      if (existsErr) throw existsErr
      if ((exists?.length ?? 0) > 0) {
        setAlreadyRegistered(true)
        setMessage({ type: "error", text: "Du bist für dieses Turnier bereits angemeldet." })
        return
      }

      const { error } = await supabase.from("tournament_registrations").insert([
        {
          tournament_id: tournamentId,
          player_name: playerName.trim(),
          email: email.trim(),
          phone: null,
        },
      ])

      if (error) throw error

      setAlreadyRegistered(true)
      setMessage({ type: "success", text: "Anmeldung erfolgreich! Du bist registriert." })
    } catch (err: any) {
      console.error("Error during registration:", err)
      setMessage({ type: "error", text: `Fehler bei der Anmeldung: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleUnregister = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!tournamentId) {
        setMessage({ type: "error", text: "Fehler: Turnier-ID fehlt." })
        return
      }

      if (!session?.user) {
        setMessage({ type: "error", text: "Bitte zuerst einloggen." })
        return
      }

      const userEmail = session.user.email ?? ""
      if (!userEmail) {
        setMessage({ type: "error", text: "E-Mail fehlt im Login. Bitte erneut einloggen." })
        return
      }

      // Lösche die Anmeldung (falls es mehrere wären: alle für dieses Turnier+email)
      const { error } = await supabase
        .from("tournament_registrations")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("email", userEmail)

      if (error) throw error

      setAlreadyRegistered(false)
      setMessage({ type: "success", text: "Du wurdest erfolgreich abgemeldet." })
    } catch (err: any) {
      console.error("Error during unregister:", err)
      setMessage({ type: "error", text: `Fehler beim Abmelden: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setMessage(null)
    setLoading(false)
    setProfileLoading(false)
    setAlreadyRegistered(false)
    setCheckingRegistration(false)
  }

  const modeLabel =
    tournamentMode === "edart"
      ? "E-Dart"
      : tournamentMode === "steeldart"
        ? "Steel Dart"
        : tournamentMode
          ? "Beide"
          : null

  const disabledReason = useMemo(() => {
    if (!session) return "Bitte einloggen."
    if (!tournamentStart) return "Turnierdatum/-zeit ungültig."
    if (!playerName?.trim() || !email?.trim()) return "Profil unvollständig (Name/E-Mail)."
    return null
  }, [session, tournamentStart, playerName, email])

  const canDoAction =
    !!session &&
    !authLoading &&
    !profileLoading &&
    !checkingRegistration &&
    !loading &&
    !!tournamentStart &&
    !!playerName?.trim() &&
    !!email?.trim()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-lg shadow-xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Turnier Anmeldung</DialogTitle>
          <DialogDescription className="text-gray-600">
            {tournamentName ? `Turnier "${tournamentName}"` : "Turnier"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {tournamentName && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="font-semibold">{tournamentName}</span>
            </div>
          )}

          {tournamentDate && tournamentTime && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                {tournamentDate} um {tournamentTime}
              </span>
            </div>
          )}

          {tournamentLocation && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>{tournamentLocation}</span>
            </div>
          )}

          {modeLabel && (
            <div className="flex items-center gap-2 text-gray-700">
              <Swords className="h-4 w-4 text-purple-500" />
              <span>Modus: {modeLabel}</span>
            </div>
          )}

          {tournamentEntryFee !== null && (
            <div className="flex items-center gap-2 text-gray-700">
              <Euro className="h-4 w-4 text-yellow-500" />
              <span>Startgeld: {tournamentEntryFee.toFixed(2)} €</span>
            </div>
          )}

          {authLoading ? (
            <div className="text-sm text-gray-600">Lade Benutzerstatus…</div>
          ) : !session ? (
            <div className="p-3 rounded-md text-sm bg-yellow-50 text-yellow-800 border border-yellow-100">
              Bitte melde dich an, um dich für dieses Turnier zu registrieren.
            </div>
          ) : (
            <div className="p-3 rounded-md text-sm bg-gray-50 text-gray-700 border border-gray-100">
              <div className="font-semibold">Du bist eingeloggt als:</div>
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
              className={`p-3 rounded-md text-sm font-medium flex items-center gap-2 ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-green-50 text-green-700 border border-green-100"
              }`}
            >
              {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          {!authLoading && !session ? (
            <Button
              type="button"
              onClick={() => router.push("/member-login")}
              className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center gap-2">
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
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Abmelden…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Abmelden</span>
                </div>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleRegister}
              disabled={!canDoAction}
              title={disabledReason ?? undefined}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Anmelden…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Jetzt anmelden</span>
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

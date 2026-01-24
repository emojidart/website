"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  LogOut,
  Calendar,
  Clock,
  Lock,
  Info,
} from "lucide-react"

type Message = { type: "success" | "error"; text: string } | null

function parseGermanShortDate(dateString: string): Date | null {
  const months: { [key: string]: number } = {
    "Jan.": 0,
    Jan: 0,
    "Feb.": 1,
    Feb: 1,
    "Mär.": 2,
    Mär: 2,
    "Mar.": 2,
    Mar: 2,
    "Apr.": 3,
    Apr: 3,
    Mai: 4,
    "Jun.": 5,
    Jun: 5,
    Juli: 6,
    "Jul.": 6,
    Jul: 6,
    "Aug.": 7,
    Aug: 7,
    "Sep.": 8,
    Sep: 8,
    "Okt.": 9,
    Okt: 9,
    "Nov.": 10,
    Nov: 10,
    "Dez.": 11,
    Dez: 11,
  }

  const parts = dateString.trim().split(/\s+/)
  if (parts.length < 3) return null

  const day = Number.parseInt(parts[0].replace(".", ""), 10)
  const monthKey = parts[1]
  const year = Number.parseInt(parts[2], 10)

  const month = months[monthKey]
  if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) return null

  const d = new Date(year, month, day)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseGermanTime(timeString: string): { hours: number; minutes: number } | null {
  // erwartet z.B. "19:30 Uhr" oder "19:00 Uhr"
  const cleaned = timeString.replace("Uhr", "").trim()
  const m = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hours = Number.parseInt(m[1], 10)
  const minutes = Number.parseInt(m[2], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return { hours, minutes }
}

function getStartDateTime(dateLabel?: string, timeLabel?: string): Date | null {
  if (!dateLabel || !timeLabel) return null
  const date = parseGermanShortDate(dateLabel)
  const t = parseGermanTime(timeLabel)
  if (!date || !t) return null
  const dt = new Date(date)
  dt.setHours(t.hours, t.minutes, 0, 0)
  return dt
}

export function DKOSelfRegistrationModal(props: {
  isOpen: boolean
  onClose: () => void
  title?: string
  dateLabel?: string
  timeLabel?: string
  onRegistrationChanged?: (isRegistered: boolean) => void
}) {
  const { isOpen, onClose, title = "Anmeldung", dateLabel, timeLabel, onRegistrationChanged } = props

  const router = useRouter()
  const { session, loading: authLoading } = useAuth() as any

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string>("")

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  // ✅ 10 Minuten Regel
  const startDateTime = useMemo(() => getStartDateTime(dateLabel, timeLabel), [dateLabel, timeLabel])
  const cutoffDateTime = useMemo(() => {
    if (!startDateTime) return null
    return new Date(startDateTime.getTime() - 10 * 60 * 1000)
  }, [startDateTime])

  const isRegistrationClosed = useMemo(() => {
    if (!startDateTime || !cutoffDateTime) return false
    return new Date().getTime() >= cutoffDateTime.getTime()
  }, [startDateTime, cutoffDateTime])

  const canAct = useMemo(() => {
    return !!session && !!playerId && !!playerName && !actionLoading
  }, [session, playerId, playerName, actionLoading])

  const canRegisterNow = useMemo(() => {
    // Anmelden nur möglich, wenn nicht geschlossen
    return canAct && !isRegistrationClosed
  }, [canAct, isRegistrationClosed])

  const resetState = () => {
    setMessage(null)
    setLoading(true)
    setActionLoading(false)
    setPlayerId(null)
    setPlayerName("")
    setAlreadyRegistered(false)
  }

  const loadStatus = async () => {
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
          text: "Dein Profil ist nicht mit der Spieldatenbank verknüpft (spieldatenbank_id fehlt).",
        })
        return
      }

      const pid = String(spieldatenbankId)
      setPlayerId(pid)

      const { data: spieler, error: spielErr } = await supabase
        .from("spieldatenbank")
        .select("name")
        .eq("id", spieldatenbankId)
        .single()

      if (spielErr) throw spielErr

      const name = spieler?.name ?? ""
      setPlayerName(name)

      const { data: reg, error: regErr } = await supabase
        .from("dko_tournament_registration")
        .select("id")
        .eq("player_id", pid)
        .limit(1)

      if (regErr) throw regErr

      const isReg = (reg?.length ?? 0) > 0
      setAlreadyRegistered(isReg)
      onRegistrationChanged?.(isReg)
    } catch (e: any) {
      console.error(e)
      setMessage({ type: "error", text: `Fehler beim Laden: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session])

  const handleRegister = async () => {
    if (!playerId || !playerName) return
    if (isRegistrationClosed) {
      setMessage({ type: "error", text: "Anmeldung ist geschlossen (max. 10 Minuten vor Beginn möglich)." })
      return
    }

    setActionLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("dko_tournament_registration").insert({
        player_id: playerId,
        player_name: playerName,
        paid: false,
        entry_fee: 0,
        deducted_from_credit: false,
      })

      if (error) throw error

      setAlreadyRegistered(true)
      onRegistrationChanged?.(true)
      setMessage({ type: "success", text: "Du bist jetzt registriert!" })
    } catch (e: any) {
      const msg = String(e?.message || "")
      if (msg.toLowerCase().includes("duplicate")) {
        setAlreadyRegistered(true)
        onRegistrationChanged?.(true)
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
      onRegistrationChanged?.(false)
      setMessage({ type: "success", text: "Du wurdest abgemeldet." })
    } catch (e: any) {
      setMessage({ type: "error", text: `Fehler beim Abmelden: ${e.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    resetState()
  }

  const cutoffText = cutoffDateTime
    ? `Anmeldung möglich bis ${cutoffDateTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr (10 Minuten vor Beginn).`
    : "Anmeldung ist bis spätestens 10 Minuten vor Turnierbeginn möglich."

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] p-6 bg-white rounded-lg shadow-xl">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            <span className="block">{cutoffText}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {(dateLabel || timeLabel) && (
            <div className="p-3 rounded-md border bg-gray-50">
              {dateLabel && (
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold">{dateLabel}</span>
                </div>
              )}
              {timeLabel && (
                <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>{timeLabel}</span>
                </div>
              )}
              {cutoffDateTime && (
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                  <Info className="h-3 w-3" />
                  <span>
                    Anmeldung bis{" "}
                    {cutoffDateTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </span>
                </div>
              )}
            </div>
          )}

          {authLoading || loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Lade…</span>
            </div>
          ) : !session ? (
            <div className="space-y-3">
              <div className="p-3 rounded-md text-sm bg-yellow-50 text-yellow-800 border border-yellow-100">
                Bitte einloggen, um dich zu registrieren.
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
            </div>
          ) : !playerId || !playerName ? (
            <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-100">
              Dein Account ist nicht mit der Spieldatenbank verknüpft. Bitte Admin kontaktieren.
            </div>
          ) : (
            <>
              <div className="p-3 rounded-md text-sm bg-white border">
                <div className="font-semibold text-gray-900">Angemeldet als:</div>
                <div className="mt-1 text-gray-700">
                  <span className="font-medium">Name:</span> {playerName}
                </div>

                {alreadyRegistered && (
                  <div className="mt-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-md p-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Du bist bereits registriert.
                  </div>
                )}
              </div>

              {!alreadyRegistered && isRegistrationClosed && (
                <div className="p-3 rounded-md text-sm bg-gray-50 text-gray-800 border border-gray-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Anmeldung ist geschlossen (10 Minuten vor Beginn).</span>
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
                  {message.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-2">
          {!session || authLoading || loading ? (
            <Button type="button" disabled className="w-full opacity-60">
              Bitte warten…
            </Button>
          ) : alreadyRegistered ? (
            <Button
              type="button"
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
              type="button"
              onClick={handleRegister}
              disabled={!canRegisterNow}
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
                  <span>Anmelden</span>
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

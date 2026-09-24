"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { BrowserQRCodeReader } from "@zxing/browser"
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  Delete,
  Gamepad2,
  KeyRound,
  QrCode,
  ScanLine,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  Wifi,
  X,
  Wallet,
  History,
  LogOut,
  CreditCard,
  UserCheck,
  Calendar,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"
import TerminalLoader from "../_components/TerminalLoader"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type ScannedMember = {
  playerCode: string
  playerId: string | null
  name: string
  photoUrl: string | null
}


type CreditTransaction = {
  id: string
  amount: number
  balance_after: number
  transaction_type: string
  created_at: string
}

type TerminalCupSeries = {
  id: string
  name: string
  series_type: "members_cup" | "lion_cup"
  startgeld: number
}

type TerminalCupEvent = {
  id: string
  series_id: string
  title: string
  start_at: string
  is_matchday: boolean
  registration_cutoff_minutes: number | null
  is_rescheduled?: boolean | null
  rescheduled_at?: string | null
}

type TerminalCupCard = {
  key: "members" | "lion"
  label: string
  series: TerminalCupSeries | null
  event: TerminalCupEvent | null
  eventDate: Date | null
  registrationOpen: boolean
  unregisterOpen: boolean
  statusText: string
  registered: boolean
  paymentMethod: string | null
  entryFee: number
  registrationId: number | null
}

export default function TerminalPersonalPage() {
  const [pin, setPin] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerStatus, setScannerStatus] = useState<"idle" | "starting" | "scanning" | "checking" | "error" | "found">("idle")
  const [scannerMessage, setScannerMessage] = useState("")
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [activeMember, setActiveMember] = useState<ScannedMember | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [personalLoading, setPersonalLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState("")
  const [pinChecking, setPinChecking] = useState(false)
  const [pinOpening, setPinOpening] = useState(false)
  const [personalSection, setPersonalSection] = useState<"home" | "registrations">("home")
  const [sectionTransitionLabel, setSectionTransitionLabel] = useState<string | null>(null)
  const [cupCards, setCupCards] = useState<TerminalCupCard[]>([])
  const [cupLoading, setCupLoading] = useState(false)
  const [cupBusyKey, setCupBusyKey] = useState<"members" | "lion" | null>(null)
  const [cupMessage, setCupMessage] = useState("")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)
  const scannedCodeRef = useRef<string>("")

  const benefits = useMemo(
    () => [
      {
        icon: Trophy,
        title: "Turniere & Cups",
        text: "Anmeldungen, Ergebnisse, Ranglisten und aktuelle Serien immer dabei.",
      },
      {
        icon: Target,
        title: "Live-Scores & Statistiken",
        text: "Ergebnisse, persönliche Statistiken und Wertungen direkt am Smartphone.",
      },
      {
        icon: BellRing,
        title: "Push-News",
        text: "Wichtige Vereinsinfos, Termine und Turnierupdates sofort mitbekommen.",
      },
      {
        icon: Gamepad2,
        title: "Liga & Verfügbarkeit",
        text: "Deine Spiele sehen und Verfügbarkeit für kommende Begegnungen verwalten.",
      },
      {
        icon: UsersRound,
        title: "Community",
        text: "Alles rund um EMD, Mannschaften und Vereinsleben an einem Ort.",
      },
      {
        icon: ShieldCheck,
        title: "Persönlicher Bereich",
        text: "Deine persönlichen EMD-Funktionen nach der Terminal-Anmeldung.",
      },
    ],
    [],
  )

  const addDigit = (digit: string) => {
    if (pin.length >= 4) return
    setPin((value) => `${value}${digit}`)
  }

  const removeDigit = () => setPin((value) => value.slice(0, -1))
  const clearPin = () => setPin("")

  const stopScanner = () => {
    try {
      zxingControlsRef.current?.stop()
    } catch {}
    zxingControlsRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const closeScanner = () => {
    stopScanner()
    setScannerOpen(false)
    setScannerStatus("idle")
    setScannerMessage("")
    scannedCodeRef.current = ""
  }

  const resolveMemberFromCode = async (rawValue: string) => {
    const code = String(rawValue || "").trim()
    if (!code || scannedCodeRef.current === code) return

    scannedCodeRef.current = code
    setScannerStatus("checking")
    setScannerMessage("Mitglied wird erkannt …")

    try {
      const { data: playerDb, error: playerDbError } = await supabase
        .from("spieldatenbank")
        .select("id,player_code,name")
        .eq("player_code", code)
        .maybeSingle()

      if (playerDbError) throw playerDbError

      if (!playerDb?.id) {
        setScannerStatus("error")
        setScannerMessage("Dieser QR-Code gehört zu keinem bekannten EMD-Mitglied.")
        scannedCodeRef.current = ""
        return
      }

      const { data: clubPlayer, error: clubPlayerError } = await supabase
        .from("club_players")
        .select("id,name,photo_url,spieldatenbank_id")
        .eq("spieldatenbank_id", playerDb.id)
        .maybeSingle()

      if (clubPlayerError) throw clubPlayerError

      if (!clubPlayer?.id) {
        setScannerStatus("error")
        setScannerMessage("Spielercode erkannt, aber kein Vereinsmitglied zugeordnet.")
        scannedCodeRef.current = ""
        return
      }

      stopScanner()
      setScannedMember({
        playerCode: code,
        playerId: String(clubPlayer.id),
        name: String(clubPlayer.name || playerDb.name || "EMD Mitglied"),
        photoUrl: clubPlayer.photo_url ? String(clubPlayer.photo_url) : null,
      })
      setScannerStatus("found")
      setScannerMessage("Mitglied erkannt")
    } catch (error) {
      console.error("Terminal QR scan lookup error:", error)
      setScannerStatus("error")
      setScannerMessage("Mitglied konnte nicht geprüft werden. Bitte erneut versuchen.")
      scannedCodeRef.current = ""
    }
  }

  const startScanner = async () => {
    setScannedMember(null)
    setScannerMessage("")
    setScannerStatus("starting")
    scannedCodeRef.current = ""

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerStatus("error")
        setScannerMessage("Kamerazugriff ist in diesem Browser nicht verfügbar.")
        return
      }

      const video = videoRef.current
      if (!video) return

      const codeReader = new BrowserQRCodeReader()
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      setCameraDevices(devices)

      if (devices.length === 0) {
        setScannerStatus("error")
        setScannerMessage("Keine Kamera auf diesem Gerät gefunden.")
        return
      }

      const preferred =
        devices.find((device) =>
          /back|rear|environment|rück|hinten/i.test(device.label || ""),
        ) || devices[devices.length - 1]

      const cameraId =
        selectedCameraId && devices.some((device) => device.deviceId === selectedCameraId)
          ? selectedCameraId
          : preferred.deviceId

      if (!selectedCameraId) setSelectedCameraId(cameraId)

      setScannerStatus("scanning")
      setScannerMessage("Mitgliedskarte vor die Kamera halten")

      const controls = await codeReader.decodeFromVideoDevice(
        cameraId,
        video,
        (result, error) => {
          if (result) {
            const value = result.getText()
            if (value) void resolveMemberFromCode(value)
          }

          if (error && String((error as any)?.name || "") !== "NotFoundException") {
            console.debug("ZXing scan frame:", error)
          }
        },
      )

      zxingControlsRef.current = controls
    } catch (error: any) {
      console.error("Terminal QR camera error:", error)
      stopScanner()
      setScannerStatus("error")

      if (error?.name === "NotFoundError") {
        setScannerMessage("Keine Kamera gefunden. Bitte Webcam anschließen oder am Tablet/Handy testen.")
      } else if (error?.name === "NotAllowedError") {
        setScannerMessage("Kamerazugriff wurde blockiert. Bitte für diese Website erlauben.")
      } else if (error?.name === "NotReadableError") {
        setScannerMessage("Kamera ist gerade belegt. Bitte Teams/Zoom/Kamera-App schließen und erneut versuchen.")
      } else {
        setScannerMessage("Kamera konnte nicht geöffnet werden.")
      }
    }
  }

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner()
      return
    }

    const timeout = window.setTimeout(() => {
      void startScanner()
    }, 120)

    return () => {
      window.clearTimeout(timeout)
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen])

  const loadPersonalData = async (member: ScannedMember) => {
    if (!member.playerId) return
    setPersonalLoading(true)
    try {
      const [{ data: creditRows }, { data: txRows }] = await Promise.all([
        supabase
          .from("player_credits")
          .select("credit_balance")
          .eq("player_id", member.playerId)
          .limit(1),
        supabase
          .from("credit_transactions")
          .select("id,amount,balance_after,transaction_type,created_at")
          .eq("player_id", member.playerId)
          .order("created_at", { ascending: false })
          .limit(8),
      ])

      setCreditBalance(Number((creditRows || [])[0]?.credit_balance || 0))
      setCreditTransactions((txRows || []).map((row: any) => ({
        id: String(row.id),
        amount: Number(row.amount || 0),
        balance_after: Number(row.balance_after || 0),
        transaction_type: String(row.transaction_type || ""),
        created_at: String(row.created_at || ""),
      })))
    } catch (error) {
      console.error("Terminal personal data error:", error)
      setCreditBalance(0)
      setCreditTransactions([])
    } finally {
      setPersonalLoading(false)
    }
  }

  const enterPersonalArea = async () => {
    if (!scannedMember) return
    stopScanner()
    setScannerOpen(false)
    setActiveMember(scannedMember)
    await loadPersonalData(scannedMember)
  }

  const logoutPersonalArea = () => {
    setActiveMember(null)
    setScannedMember(null)
    setCreditBalance(0)
    setCreditTransactions([])
    setPin("")
    setPersonalSection("home")
    setCupCards([])
    setCupMessage("")
    scannedCodeRef.current = ""
  }

  const loginWithPin = async () => {
    if (pin.length !== 4 || pinChecking || pinOpening) return

    setPinChecking(true)
    setPinMessage("PIN wird geprüft …")

    try {
      const { data, error } = await supabase.rpc("terminal_verify_pin_code", {
        p_pin: pin,
      })

      if (error) {
        if (String(error.message || "").toLowerCase().includes("rate limited")) {
          setPinMessage("Zu viele Fehlversuche. Bitte 10 Minuten warten.")
        } else {
          setPinMessage("PIN konnte nicht geprüft werden.")
        }
        setPin("")
        return
      }

      const member = Array.isArray(data) ? data[0] : null

      if (!member?.player_id) {
        setPinMessage("PIN nicht erkannt.")
        setPin("")
        return
      }

      const resolvedMember: ScannedMember = {
        playerCode: String(member.player_code || ""),
        playerId: String(member.player_id),
        name: String(member.name || "EMD Mitglied"),
        photoUrl: member.photo_url ? String(member.photo_url) : null,
      }

      setPinOpening(true)
      setPinMessage("Willkommen!")
      void loadPersonalData(resolvedMember)

      window.setTimeout(() => {
        setActiveMember(resolvedMember)
        setPin("")
        setPinMessage("")
        setPinOpening(false)
      }, 2000)
    } catch (error) {
      console.error("Terminal PIN login error:", error)
      setPinMessage("PIN konnte nicht geprüft werden.")
      setPin("")
    } finally {
      setPinChecking(false)
    }
  }

  const switchPersonalSection = (section: "home" | "registrations") => {
    setSectionTransitionLabel(section === "registrations" ? "Anmeldungen werden geöffnet" : "Mein EMD wird geöffnet")
    window.setTimeout(() => {
      setPersonalSection(section)
      setSectionTransitionLabel(null)
    }, 2000)
  }

  const getEffectiveEventDate = (event: TerminalCupEvent) =>
    new Date(event.is_rescheduled && event.rescheduled_at ? event.rescheduled_at : event.start_at)

  const sameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const formatDateTime = (date: Date | null) => {
    if (!date) return "Kein Termin"
    return date.toLocaleString("de-AT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const loadCupRegistrations = async (member: ScannedMember) => {
    if (!member.playerId) return

    setCupLoading(true)
    setCupMessage("")

    try {
      const { data: clubPlayer, error: clubError } = await supabase
        .from("club_players")
        .select("id,spieldatenbank_id")
        .eq("id", member.playerId)
        .maybeSingle()

      if (clubError) throw clubError
      if (!clubPlayer?.spieldatenbank_id) throw new Error("Keine Spielerzuordnung gefunden.")

      const registrationPlayerId = String(clubPlayer.spieldatenbank_id)

      const { data: seriesRows, error: seriesError } = await supabase
        .from("dko_series")
        .select("id,name,series_type,startgeld,is_active")
        .in("series_type", ["members_cup", "lion_cup"])
        .eq("is_active", true)

      if (seriesError) throw seriesError

      const seriesByType = new Map<string, TerminalCupSeries>()
      ;(seriesRows || []).forEach((row: any) => {
        if (!seriesByType.has(String(row.series_type))) {
          seriesByType.set(String(row.series_type), {
            id: String(row.id),
            name: String(row.name || ""),
            series_type: row.series_type,
            startgeld: Number(row.startgeld || 0),
          })
        }
      })

      const seriesIds = Array.from(seriesByType.values()).map((s) => s.id)
      let eventRows: any[] = []

      if (seriesIds.length > 0) {
        const { data, error } = await supabase
          .from("dko_series_events")
          .select("id,series_id,title,start_at,is_matchday,registration_cutoff_minutes,is_rescheduled,rescheduled_at")
          .in("series_id", seriesIds)
          .eq("is_matchday", true)
          .order("start_at", { ascending: true })

        if (error) throw error
        eventRows = data || []
      }

      const now = new Date()

      const makeCard = async (
        key: "members" | "lion",
        seriesType: "members_cup" | "lion_cup",
        label: string,
      ): Promise<TerminalCupCard> => {
        const series = seriesByType.get(seriesType) || null
        let event: TerminalCupEvent | null = null
        let eventDate: Date | null = null

        if (series) {
          const possible = eventRows
            .filter((row: any) => String(row.series_id) === series.id)
            .map((row: any) => row as TerminalCupEvent)
            .sort((a, b) => getEffectiveEventDate(a).getTime() - getEffectiveEventDate(b).getTime())

          event =
            possible.find((row) => sameLocalDay(getEffectiveEventDate(row), now)) ||
            possible.find((row) => getEffectiveEventDate(row).getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) ||
            null

          eventDate = event ? getEffectiveEventDate(event) : null
        }

        let registrationOpen = false
        let unregisterOpen = false
        let statusText = "Kein aktiver Spieltag vorhanden."

        if (event && eventDate) {
          const today = sameLocalDay(eventDate, now)

          if (seriesType === "members_cup") {
            const regClose = new Date(eventDate)
            regClose.setHours(17, 0, 0, 0)
            const unregClose = new Date(eventDate)
            unregClose.setHours(14, 0, 0, 0)

            registrationOpen = today && now <= regClose
            unregisterOpen = today && now <= unregClose

            if (!today) {
              statusText = "Anmeldung öffnet am Turniertag um 00:00 Uhr."
            } else if (registrationOpen) {
              statusText = "Anmeldung heute bis 17:00 Uhr · Abmeldung bis 14:00 Uhr."
            } else {
              statusText = "Anmeldung für heute geschlossen."
            }
          } else {
            const cutoffMinutes = Number(event.registration_cutoff_minutes ?? 10) || 10
            const close = new Date(eventDate.getTime() - cutoffMinutes * 60_000)

            registrationOpen = today && now <= close
            unregisterOpen = registrationOpen

            if (!today) {
              statusText = "Anmeldung öffnet am Turniertag um 00:00 Uhr."
            } else if (registrationOpen) {
              statusText = `An- und Abmeldung bis ${cutoffMinutes} Minuten vor Turnierstart.`
            } else {
              statusText = "An- und Abmeldung für heute geschlossen."
            }
          }
        }

        let registered = false
        let paymentMethod: string | null = null
        let entryFee = Number(series?.startgeld || 0)
        let registrationId: number | null = null

        if (event?.id) {
          const { data: regRows, error: regError } = await supabase
            .from("dko_tournament_registration")
            .select("id,payment_method,entry_fee")
            .eq("player_id", registrationPlayerId)
            .eq("event_id", event.id)
            .order("id", { ascending: false })
            .limit(1)

          if (regError) throw regError

          const reg = (regRows || [])[0]
          if (reg) {
            registered = true
            paymentMethod = reg.payment_method ? String(reg.payment_method) : null
            entryFee = Number(reg.entry_fee ?? entryFee)
            registrationId = Number(reg.id)
          }
        }

        return {
          key,
          label,
          series,
          event,
          eventDate,
          registrationOpen,
          unregisterOpen,
          statusText,
          registered,
          paymentMethod,
          entryFee,
          registrationId,
        }
      }

      const cards = await Promise.all([
        makeCard("members", "members_cup", "Members Champion Cup"),
        makeCard("lion", "lion_cup", "Lion Cup"),
      ])

      setCupCards(cards)
    } catch (error: any) {
      console.error("Terminal cup registration load error:", error)
      setCupCards([])
      setCupMessage(error?.message || "Anmeldungen konnten nicht geladen werden.")
    } finally {
      setCupLoading(false)
    }
  }

  const registerCupWithCredit = async (card: TerminalCupCard) => {
    if (!activeMember?.playerId || !card.series?.id || !card.event?.id) return
    if (!card.registrationOpen) return

    setCupBusyKey(card.key)
    setCupMessage("")

    try {
      const { data: clubPlayer, error: clubError } = await supabase
        .from("club_players")
        .select("id,name,spieldatenbank_id")
        .eq("id", activeMember.playerId)
        .maybeSingle()

      if (clubError) throw clubError
      if (!clubPlayer?.spieldatenbank_id) throw new Error("Keine Spielerzuordnung gefunden.")

      const { error } = await supabase.rpc("register_dko_with_credit", {
        p_credit_player_id: activeMember.playerId,
        p_registration_player_id: String(clubPlayer.spieldatenbank_id),
        p_player_name: String(clubPlayer.name || activeMember.name),
        p_series_id: card.series.id,
        p_event_id: card.event.id,
        p_fee: Number(card.entryFee || card.series.startgeld || 0),
      })

      if (error) throw error

      setCupMessage(`Erfolgreich für ${card.label} angemeldet.`)
      await Promise.all([
        loadCupRegistrations(activeMember),
        loadPersonalData(activeMember),
      ])
    } catch (error: any) {
      console.error("Terminal cup registration error:", error)
      setCupMessage(error?.message || "Anmeldung fehlgeschlagen.")
    } finally {
      setCupBusyKey(null)
    }
  }

  const unregisterCup = async (card: TerminalCupCard) => {
    if (!activeMember?.playerId || !card.event?.id) return
    if (!card.unregisterOpen) return

    setCupBusyKey(card.key)
    setCupMessage("")

    try {
      const { data: clubPlayer, error: clubError } = await supabase
        .from("club_players")
        .select("id,spieldatenbank_id")
        .eq("id", activeMember.playerId)
        .maybeSingle()

      if (clubError) throw clubError
      if (!clubPlayer?.spieldatenbank_id) throw new Error("Keine Spielerzuordnung gefunden.")

      if (card.paymentMethod === "credit") {
        const { error } = await supabase.rpc("unregister_dko_with_credit", {
          p_credit_player_id: activeMember.playerId,
          p_registration_player_id: String(clubPlayer.spieldatenbank_id),
          p_event_id: card.event.id,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("dko_tournament_registration")
          .delete()
          .eq("id", card.registrationId)

        if (error) throw error
      }

      setCupMessage(
        card.paymentMethod === "credit"
          ? `Abmeldung erfolgreich. ${formatEuro(card.entryFee)} wurden deinem Guthaben zurückgebucht.`
          : "Abmeldung erfolgreich.",
      )

      await Promise.all([
        loadCupRegistrations(activeMember),
        loadPersonalData(activeMember),
      ])
    } catch (error: any) {
      console.error("Terminal cup unregister error:", error)
      setCupMessage(error?.message || "Abmeldung fehlgeschlagen.")
    } finally {
      setCupBusyKey(null)
    }
  }

  const transactionLabel = (type: string) => {
    if (type === "credit_added") return "Guthaben aufgeladen"
    if (type === "tournament_entry_fee") return "Turnier-Startgeld"
    if (type === "tournament_refund") return "Turnier-Rückerstattung"
    if (type === "credit_refund") return "Rückerstattung"
    return type || "Buchung"
  }

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(value || 0)

  if (sectionTransitionLabel) {
    return <TerminalLoader label={sectionTransitionLabel} />
  }

  if (pinOpening) {
    return <TerminalLoader label="Mein EMD wird geöffnet" />
  }

  if (activeMember && personalSection === "registrations") {
    return (
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.84)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_100%_82%,rgba(14,165,233,.11),transparent_30%)]" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => switchPersonalSection("home")}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                  Mein EMD
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Meine Anmeldungen
                </h1>
                <div className="mt-1 text-sm font-semibold text-white/38">
                  Members Champion Cup & Lion Cup
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadCupRegistrations(activeMember)}
              disabled={cupLoading}
              className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-black text-white/60 backdrop-blur-xl transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${cupLoading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          </header>

          <section className="mt-8">
            <div className="rounded-[34px] border border-white/10 bg-black/30 p-5 backdrop-blur-2xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/45">
                    Angemeldetes Mitglied
                  </div>
                  <div className="mt-1 text-2xl font-black">{activeMember.name}</div>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/55">Guthaben</div>
                  <div className="mt-1 text-2xl font-black text-emerald-200">{formatEuro(creditBalance)}</div>
                </div>
              </div>
            </div>

            {cupMessage ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center text-sm font-bold text-white/70 backdrop-blur-xl">
                {cupMessage}
              </div>
            ) : null}

            {cupLoading && cupCards.length === 0 ? (
              <div className="mt-5 flex min-h-52 items-center justify-center rounded-[34px] border border-white/10 bg-black/30 backdrop-blur-2xl">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-300" />
                  <div className="mt-3 text-sm font-black text-white/45">Anmeldungen werden geladen …</div>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {cupCards.map((card) => {
                  const busy = cupBusyKey === card.key
                  const hasEvent = !!card.event && !!card.eventDate
                  const accent = card.key === "members" ? "orange" : "cyan"

                  return (
                    <article
                      key={card.key}
                      className={`overflow-hidden rounded-[34px] border bg-black/30 backdrop-blur-2xl ${
                        accent === "orange" ? "border-orange-400/20" : "border-cyan-300/20"
                      }`}
                    >
                      <div className="p-6 sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                              accent === "orange" ? "text-orange-200/55" : "text-cyan-100/55"
                            }`}>
                              {card.key === "members" ? "EMD Members" : "EMD"}
                            </div>
                            <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{card.label}</h2>
                          </div>

                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                            accent === "orange"
                              ? "border-orange-300/20 bg-orange-500/10 text-orange-300"
                              : "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200"
                          }`}>
                            <Trophy className="h-7 w-7" />
                          </div>
                        </div>

                        {hasEvent ? (
                          <>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                                <div className="flex items-center gap-2 text-white/35">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em]">Spieltag</span>
                                </div>
                                <div className="mt-2 text-base font-black">{formatDateTime(card.eventDate)}</div>
                              </div>

                              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                                <div className="flex items-center gap-2 text-white/35">
                                  <Wallet className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em]">Startgeld</span>
                                </div>
                                <div className="mt-2 text-2xl font-black">{formatEuro(card.entryFee)}</div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                              <div className="flex items-start gap-3">
                                <Clock className={`mt-0.5 h-5 w-5 shrink-0 ${
                                  card.registrationOpen || (card.registered && card.unregisterOpen)
                                    ? "text-emerald-300"
                                    : "text-orange-300"
                                }`} />
                                <div>
                                  <div className="text-sm font-black">
                                    {card.registered ? "Du bist angemeldet" : "Anmeldestatus"}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold leading-5 text-white/40">
                                    {card.statusText}
                                  </div>
                                  {card.registered && card.paymentMethod === "credit" ? (
                                    <div className="mt-2 text-xs font-bold text-emerald-200/75">
                                      Mit Guthaben bezahlt · bei rechtzeitiger Abmeldung wird {formatEuro(card.entryFee)} zurückgebucht.
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {!card.registered ? (
                              <button
                                type="button"
                                disabled={!card.registrationOpen || busy || card.entryFee <= 0}
                                onClick={() => void registerCupWithCredit(card)}
                                className="mt-5 flex h-15 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 text-base font-black text-white transition enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-5 w-5" />}
                                {busy ? "Anmeldung läuft …" : `Mit Guthaben anmelden · ${formatEuro(card.entryFee)}`}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!card.unregisterOpen || busy}
                                onClick={() => void unregisterCup(card)}
                                className="mt-5 flex h-15 w-full items-center justify-center gap-3 rounded-2xl border border-red-300/20 bg-red-500/[0.08] text-base font-black text-red-100 transition enabled:hover:bg-red-500/[0.14] disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                                {busy ? "Abmeldung läuft …" : "Abmelden"}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm font-semibold text-white/40">
                            Aktuell ist kein kommender Spieltag eingetragen.
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  if (activeMember) {
    return (
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.82)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_100%_82%,rgba(14,165,233,.11),transparent_30%)]" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TerminalLink
                href="/terminal/menu"
                label="Hauptmenü wird geöffnet"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
              >
                <ArrowLeft className="h-5 w-5" />
              </TerminalLink>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                  Mein EMD
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Persönlicher Bereich
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={logoutPersonalArea}
              className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-black text-white/60 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </header>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="overflow-hidden rounded-[38px] border border-orange-400/20 bg-black/32 p-6 backdrop-blur-2xl sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[30px] border border-orange-300/20 bg-orange-500/10">
                  {activeMember.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeMember.photoUrl} alt={activeMember.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-12 w-12 text-orange-200" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/60">
                    Angemeldet
                  </div>
                  <h2 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                    {activeMember.name}
                  </h2>
                  <div className="mt-3 font-mono text-sm font-bold text-white/35">
                    {activeMember.playerCode}
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-emerald-300/14 bg-emerald-400/[0.06] p-5">
                  <div className="flex items-center gap-2 text-emerald-200/70">
                    <Wallet className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Guthaben</span>
                  </div>
                  <div className="mt-3 text-4xl font-black">
                    {personalLoading ? "…" : formatEuro(creditBalance)}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-white/35">
                    Für Members Cup und Lion Cup
                  </div>
                </div>

                <div className="rounded-[28px] border border-cyan-300/14 bg-cyan-400/[0.05] p-5">
                  <div className="flex items-center gap-2 text-cyan-100/70">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mitgliedskarte</span>
                  </div>
                  <div className="mt-3 text-xl font-black">QR erkannt</div>
                  <div className="mt-2 text-xs font-semibold text-white/35">
                    Persönlicher Terminal-Zugang aktiv
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    void loadCupRegistrations(activeMember)
                    switchPersonalSection("registrations")
                  }}
                  className="flex min-h-24 items-center justify-between rounded-[26px] border border-orange-300/15 bg-orange-500/[0.07] px-5 text-left transition hover:bg-orange-500/[0.12]"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/55">Turniere</div>
                    <div className="mt-1 text-xl font-black">Anmeldungen</div>
                    <div className="mt-1 text-xs font-semibold text-white/30">Members Cup & Lion Cup</div>
                  </div>
                  <UserCheck className="h-7 w-7 text-orange-300" />
                </button>

                <button
                  type="button"
                  onClick={() => void loadPersonalData(activeMember)}
                  className="flex min-h-24 items-center justify-between rounded-[26px] border border-white/10 bg-white/[0.035] px-5 text-left transition hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Konto</div>
                    <div className="mt-1 text-xl font-black">Guthaben aktualisieren</div>
                  </div>
                  <Wallet className="h-7 w-7 text-white/45" />
                </button>
              </div>
            </div>

            <div className="rounded-[38px] border border-white/10 bg-black/30 p-6 backdrop-blur-2xl">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-200" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/45">Wallet</div>
                  <div className="text-2xl font-black">Letzte Buchungen</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {personalLoading ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm font-semibold text-white/40">
                    Daten werden geladen …
                  </div>
                ) : creditTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm font-semibold text-white/40">
                    Noch keine Guthaben-Buchungen vorhanden.
                  </div>
                ) : (
                  creditTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">{transactionLabel(tx.transaction_type)}</div>
                        <div className="mt-1 text-[11px] font-semibold text-white/30">
                          {tx.created_at ? new Date(tx.created_at).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </div>
                      <div className={`shrink-0 text-lg font-black ${tx.amount >= 0 ? "text-emerald-300" : "text-orange-300"}`}>
                        {tx.amount >= 0 ? "+" : ""}{formatEuro(tx.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.78)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.16),transparent_28%),radial-gradient(circle_at_100%_82%,rgba(14,165,233,.11),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center gap-4">
          <TerminalLink
            href="/terminal/menu"
            label="Hauptmenü wird geöffnet"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-5 w-5" />
          </TerminalLink>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
              EMD Club Terminal
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Mein EMD
            </h1>
            <div className="mt-1 text-sm font-semibold text-white/38">
              Persönliche Terminal-Anmeldung
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="relative overflow-hidden rounded-[38px] border border-orange-400/22 bg-black/32 p-6 backdrop-blur-2xl sm:p-8">
            <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-orange-500/13 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-orange-300/18 bg-orange-500/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                  Terminal-Anmeldung
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                  PIN
                </span>
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-orange-400/22 bg-orange-500/10 text-orange-300">
                  <KeyRound className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-3xl font-black tracking-[-0.05em] sm:text-5xl">
                    Bei Mein EMD anmelden
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/45 sm:text-base">
                    Gib deine persönliche 4-stellige Terminal-PIN ein. Die PIN legst du einmalig in deiner EMD App im Mitgliederbereich fest.
                  </p>
                </div>
              </div>

              <div className="mt-7 rounded-[30px] border border-white/[0.08] bg-black/25 p-5 sm:p-6">
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                    Persönliche PIN
                  </div>

                  <div className="mt-4 flex justify-center gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                          index < pin.length
                            ? "border-orange-300/30 bg-orange-500/10"
                            : "border-white/10 bg-white/[0.025]"
                        }`}
                      >
                        <div
                          className={`h-3 w-3 rounded-full ${
                            index < pin.length ? "bg-orange-300" : "bg-white/10"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mx-auto mt-6 grid max-w-[420px] grid-cols-3 gap-3">
                  {["1","2","3","4","5","6","7","8","9"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => addDigit(digit)}
                      className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-2xl font-black transition hover:bg-white/[0.07] active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={clearPin}
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-xs font-black uppercase tracking-[0.15em] text-white/35 transition hover:bg-white/[0.06]"
                  >
                    Löschen
                  </button>

                  <button
                    type="button"
                    onClick={() => addDigit("0")}
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-2xl font-black transition hover:bg-white/[0.07] active:scale-95"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={removeDigit}
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-white/45 transition hover:bg-white/[0.06]"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void loginWithPin()}
                  disabled={pin.length !== 4 || pinChecking || pinOpening}
                  className="mx-auto mt-5 flex h-14 w-full max-w-[420px] items-center justify-center gap-3 rounded-2xl bg-orange-500 text-base font-black text-white transition enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <KeyRound className="h-5 w-5" />
                  {pinChecking ? "PIN wird geprüft …" : "Anmelden"}
                  <ArrowRight className="h-5 w-5" />
                </button>

                <div className={`mt-3 min-h-5 text-center text-[11px] font-semibold ${
                  pinMessage === "PIN nicht erkannt." || pinMessage.includes("Fehlversuche") || pinMessage.includes("konnte")
                    ? "text-red-300/80"
                    : "text-white/35"
                }`}>
                  {pinMessage || "4-stellige Terminal-PIN aus der EMD App"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-cyan-300/15 bg-black/30 p-6 backdrop-blur-2xl">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-cyan-200" />
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">
                  Alternative Anmeldung
                </div>
              </div>

              <div className="mt-4 text-2xl font-black">Mitgliedskarte scannen</div>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                Scanne den QR-Code deiner bestehenden digitalen EMD-Mitgliedskarte. Das Terminal erkennt deinen Spielercode automatisch.
              </p>

              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.07] text-sm font-black text-cyan-50 transition hover:bg-cyan-400/[0.12] active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                QR-Code jetzt scannen
                <ScanLine className="h-5 w-5" />
              </button>

              <div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                Bestehende EMD-Mitgliedskarte
              </div>
            </div>


          </div>
        </section>

        {scannerOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[#090b0f] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                    Mein EMD
                  </div>
                  <div className="mt-1 text-xl font-black">Mitgliedskarte scannen</div>
                </div>

                <button
                  type="button"
                  onClick={closeScanner}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08]"
                  aria-label="Scanner schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6">
                {scannerStatus === "found" && scannedMember ? (
                  <div className="py-5 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] border border-emerald-300/20 bg-emerald-400/10">
                      {scannedMember.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={scannedMember.photoUrl}
                          alt={scannedMember.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-9 w-9 text-emerald-200" />
                      )}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      Mitglied erkannt
                    </div>

                    <div className="mt-4 text-3xl font-black">{scannedMember.name}</div>
                    <div className="mt-2 font-mono text-sm font-bold text-white/35">
                      {scannedMember.playerCode}
                    </div>

                    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-semibold leading-6 text-white/42">
                      Die Mitgliedskarte wurde erfolgreich erkannt. Du kannst jetzt deinen persönlichen Mein-EMD-Bereich öffnen.
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          scannedCodeRef.current = ""
                          setScannedMember(null)
                          setScannerStatus("idle")
                          setScannerOpen(false)
                          window.setTimeout(() => setScannerOpen(true), 100)
                        }}
                        className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/60"
                      >
                        <QrCode className="h-4 w-4" />
                        Andere Karte scannen
                      </button>

                      <button
                        type="button"
                        onClick={() => void enterPersonalArea()}
                        className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-black text-white"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Zu Mein EMD
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {cameraDevices.length > 1 && (
                      <div className="mx-auto mb-4 max-w-[620px]">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                          Kamera auswählen
                        </label>
                        <select
                          value={selectedCameraId}
                          onChange={(event) => {
                            setSelectedCameraId(event.target.value)
                            stopScanner()
                            window.setTimeout(() => void startScanner(), 80)
                          }}
                          className="h-12 w-full rounded-2xl border border-white/10 bg-[#11141a] px-4 text-sm font-black text-white outline-none"
                        >
                          {cameraDevices.map((device, index) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Kamera ${index + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative mx-auto aspect-[4/3] w-full max-w-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-black">
                      <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.42),transparent_22%,transparent_78%,rgba(0,0,0,.42)),linear-gradient(0deg,rgba(0,0,0,.35),transparent_25%,transparent_75%,rgba(0,0,0,.35))]" />

                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2">
                        <div className="absolute left-0 top-0 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-cyan-300" />
                        <div className="absolute right-0 top-0 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-cyan-300" />
                        <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-cyan-300" />
                        <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-cyan-300" />
                        {scannerStatus === "scanning" && (
                          <div className="absolute left-3 right-3 top-1/2 h-px animate-pulse bg-cyan-200 shadow-[0_0_18px_rgba(165,243,252,.9)]" />
                        )}
                      </div>

                      {(scannerStatus === "starting" || scannerStatus === "checking") && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                          <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
                            <div className="mt-3 text-sm font-black text-white/70">
                              {scannerStatus === "checking" ? "Mitglied wird geprüft …" : "Kamera wird gestartet …"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`mx-auto mt-4 max-w-[620px] rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
                      scannerStatus === "error"
                        ? "border-red-400/15 bg-red-500/[0.06] text-red-100"
                        : "border-white/[0.07] bg-white/[0.025] text-white/45"
                    }`}>
                      {scannerMessage || "Mitgliedskarte vor die Kamera halten"}
                    </div>

                    {scannerStatus === "error" && (
                      <button
                        type="button"
                        onClick={() => void startScanner()}
                        className="mx-auto mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.06] px-5 text-sm font-black text-cyan-50"
                      >
                        <Camera className="h-4 w-4" />
                        Erneut versuchen
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="mt-7">
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
              VereinsApp
            </div>
            <h3 className="mt-1 text-2xl font-black">Alle Vorteile auf deinem Smartphone</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              const orange = index % 2 === 0

              return (
                <article
                  key={benefit.title}
                  className={`relative overflow-hidden rounded-[28px] border bg-black/27 p-5 backdrop-blur-xl ${
                    orange ? "border-orange-400/14" : "border-cyan-300/14"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                      orange
                        ? "border-orange-400/18 bg-orange-500/[0.08] text-orange-300"
                        : "border-cyan-300/18 bg-cyan-400/[0.07] text-cyan-200"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-5 text-xl font-black">{benefit.title}</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-white/40">
                    {benefit.text}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

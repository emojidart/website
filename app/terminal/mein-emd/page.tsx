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
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"

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

export default function TerminalPersonalPage() {
  const [pin, setPin] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerStatus, setScannerStatus] = useState<"idle" | "starting" | "scanning" | "checking" | "error" | "found">("idle")
  const [scannerMessage, setScannerMessage] = useState("")
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null)
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
    if (pin.length >= 6) return
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
      const preferred =
        devices.find((device) =>
          /back|rear|environment|rück|hinten/i.test(device.label || ""),
        ) || devices[devices.length - 1]

      setScannerStatus("scanning")
      setScannerMessage("Mitgliedskarte vor die Kamera halten")

      const controls = await codeReader.decodeFromVideoDevice(
        preferred?.deviceId,
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
    } catch (error) {
      console.error("Terminal QR camera error:", error)
      stopScanner()
      setScannerStatus("error")
      setScannerMessage("Kamera konnte nicht geöffnet werden. Bitte Kamerazugriff erlauben.")
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
                    Gib deine persönliche Terminal-PIN ein. Die echte Anmeldung wird später mit deinem EMD-Mitgliedskonto verbunden.
                  </p>
                </div>
              </div>

              <div className="mt-7 rounded-[30px] border border-white/[0.08] bg-black/25 p-5 sm:p-6">
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                    Persönliche PIN
                  </div>

                  <div className="mt-4 flex justify-center gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
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
                  disabled={pin.length < 4}
                  className="mx-auto mt-5 flex h-14 w-full max-w-[420px] items-center justify-center gap-3 rounded-2xl bg-orange-500 text-base font-black text-white transition enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <KeyRound className="h-5 w-5" />
                  Anmelden
                  <ArrowRight className="h-5 w-5" />
                </button>

                <div className="mt-3 text-center text-[11px] font-semibold text-white/25">
                  PIN-Logik folgt später.
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

            <div className="rounded-[30px] border border-orange-300/12 bg-black/28 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-orange-300" />
                <div className="text-xl font-black">NFC</div>
              </div>
              <div className="mt-2 text-sm font-semibold leading-6 text-white/40">
                NFC ist ebenfalls für die spätere schnelle Terminal-Anmeldung vorgesehen.
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
                      Die Mitgliedskarte wurde erfolgreich erkannt. Die eigentliche Terminal-Anmeldung wird im nächsten Schritt mit diesem Mitglied verknüpft.
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
                        onClick={closeScanner}
                        className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-black text-white"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Fertig
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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

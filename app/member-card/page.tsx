"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreditCard, QrCode, Download, Target, Wallet, History, Smartphone, Zap, HandCoins, RefreshCw, X } from "lucide-react"
import type { UserProfile } from "@/types"
import { QRCodeSVG } from "qrcode.react"
import html2canvas from "html2canvas"
import Image from "next/image"

/* ---------------- types ---------------- */

interface Transaction {
  id: string
  amount: number
  balance_after: number
  transaction_type: string
  created_at: string
}

/* ---------------- small ui helpers ---------------- */

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "orange" | "blue" | "emerald" | "amber" | "slate" | "red" | "green"
}) {
  const cls =
    tone === "orange"
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : tone === "green"
            ? "bg-green-50 text-green-900 border-green-200"
            : tone === "red"
              ? "bg-red-50 text-red-900 border-red-200"
              : tone === "amber"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : tone === "slate"
                  ? "bg-slate-50 text-slate-800 border-slate-200"
                  : "bg-gray-50 text-gray-800 border-gray-200"

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

function formatEuro(n: number) {
  // idiotensicher: immer 2 Nachkommastellen und € vorne (damit nicht nur "15" steht)
  return `€${n.toFixed(2)}`
}

function formatDateDE(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTransactionTypeLabel(type: string) {
  const labelMap: Record<string, string> = {
    credit_added: "Guthaben aufgeladen",
    credit_withdrawn: "Guthaben ausgezahlt",
    tournament_entry: "Turnieranmeldung",
    tournament_refund: "Turnier-Rückerstattung",
    tournament_entrance_fee: "Turnier-Startgeld",
    tournament_entry_fee: "Turnier-Startgeld",
    credit_refund: "Rückerstattung",
  }
  return labelMap[type] || type
}

/* ---------------- page ---------------- */

export default function MemberCardPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<"card" | "history">("card")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // simple QR modal (schön app-like)
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [session, authLoading, router])

  useEffect(() => {
    if (session?.user) fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const fetchProfile = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(
          "id, user_id, player_id, club_players!inner(id, name, photo_url, throwing_hand, age, origin, created_at, spieldatenbank_id, spieldatenbank(id, player_code, name, verein))",
        )
        .eq("user_id", session.user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      if (profileData?.player_id) {
        const { data: creditData, error: creditErr } = await supabase
          .from("player_credits")
          .select("credit_balance")
          .eq("player_id", profileData.player_id)
          .single()

        if (!creditErr && creditData?.credit_balance != null) {
          setCreditBalance(Number(creditData.credit_balance) || 0)
        } else {
          setCreditBalance(0)
        }

        fetchTransactions(profileData.player_id)
      } else {
        setCreditBalance(0)
        setTransactions([])
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError("Fehler beim Laden des Profils")
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (playerId: string) => {
    setLoadingTransactions(true)
    try {
      const { data, error: fetchError } = await supabase
        .from("credit_transactions")
        .select("id, amount, balance_after, transaction_type, created_at")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) {
        console.error("Error fetching transactions:", fetchError)
        setTransactions([])
        return
      }
      setTransactions((data as Transaction[]) || [])
    } catch (err: any) {
      console.error("Error fetching transactions:", err)
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const downloadCard = async () => {
    if (!cardRef.current) return

    try {
      setDownloading(true)

      const cloned = cardRef.current.cloneNode(true) as HTMLElement
      cloned.style.position = "absolute"
      cloned.style.left = "-9999px"
      cloned.style.top = "-9999px"
      document.body.appendChild(cloned)

      const convertStylesToInline = (element: HTMLElement) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null)
        let node: HTMLElement | null
        while ((node = walker.nextNode() as HTMLElement)) {
          const computed = window.getComputedStyle(node)
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i]
            const value = computed.getPropertyValue(prop)
            if (value) node.style.setProperty(prop, value, "important")
          }
        }
      }

      convertStylesToInline(cloned)

      const canvas = await html2canvas(cloned, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      })

      document.body.removeChild(cloned)

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      const safeName = (profile?.club_players?.name || "mitglied").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "")
      link.download = `mitgliedskarte-${safeName}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Error downloading card:", err)
      alert("Fehler beim Herunterladen der Karte")
    } finally {
      setDownloading(false)
    }
  }

  const playerCode = profile?.club_players?.spieldatenbank?.player_code || "Noch kein Turniercode"
  const memberSince = profile?.club_players?.created_at
    ? new Date(profile.club_players.created_at).toLocaleDateString("de-DE")
    : "—"
  const memberNumber = playerCode

  const initials =
    (profile?.club_players?.name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"

  const quickStats = useMemo(() => {
    const txCount = transactions.length
    const lastTx = transactions[0]?.created_at ? formatDateDE(transactions[0].created_at) : "—"
    return { txCount, lastTx }
  }, [transactions])

  /* ---------------- states ---------------- */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="h-12 sm:h-14" aria-hidden="true" />
        <main className="mx-auto w-full px-4 py-10 flex items-center justify-center max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="h-12 sm:h-14" aria-hidden="true" />
       <main className="mx-auto w-full px-4 py-10 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-orange-700" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 mb-1">{error || "Profil nicht gefunden"}</h1>
            <p className="text-sm text-gray-600 mb-5">Bitte melde dich erneut an.</p>
            <Button onClick={() => router.push("/member-login")} className="rounded-2xl">
              Zur Anmeldung
            </Button>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  /* ---------------- ui ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <main className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
        {/* top hero */}
        <div className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 sm:p-7 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.20),transparent_60%)]" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-white/80">Mitgliedsbereich</p>
                    <h1 className="text-lg sm:text-2xl font-black leading-tight truncate">Meine Mitgliedskarte</h1>
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/85">Digitale Vereinskarte • QR • Guthaben • Historie</p>
              </div>

              <Image src="/icon-192.png" alt="EMD Logo" width={56} height={56} className="opacity-95 drop-shadow-lg" />
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              <Chip tone="amber">
                <Wallet className="w-3.5 h-3.5" />
                Guthaben: {formatEuro(creditBalance)}
              </Chip>
              <Chip tone="gray">
                <History className="w-3.5 h-3.5" />
                {quickStats.txCount} Transaktionen
              </Chip>
              <Chip tone="gray">
                <Target className="w-3.5 h-3.5" />
                Code: <span className="font-mono">{memberNumber}</span>
              </Chip>
            </div>
          </div>

          {/* tabs */}
          <div className="p-3 sm:p-4 bg-white border-t border-orange-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={[
                  "h-11 rounded-2xl border font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]",
                  activeTab === "card"
                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <CreditCard className="w-4 h-4" />
                Karte
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={[
                  "h-11 rounded-2xl border font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]",
                  activeTab === "history"
                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <History className="w-4 h-4" />
                Historie
              </button>
            </div>
          </div>
        </div>

        {/* content */}
        <div className="mt-4">
          {activeTab === "card" ? (
            <>
              {/* card preview (download target) */}
              <Card
                ref={cardRef}
                className="rounded-3xl border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 relative"
              >
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full -ml-28 -mb-28" />

                <CardContent className="p-6 sm:p-8 relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-white">
                      <p className="text-sm font-black opacity-90">EMD Darts Verein</p>
                      <p className="text-xs opacity-75">Mitgliedskarte</p>
                    </div>
                    <Image src="/icon-192.png" alt="EMD Logo" width={56} height={56} className="opacity-90 drop-shadow-lg" />
                  </div>

                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white/20 shadow-xl">
                      <AvatarImage
                        src={
                          profile.club_players?.photo_url ||
                          "/placeholder.svg?height=96&width=96&query=dart player avatar" ||
                          "/placeholder.svg"
                        }
                        alt={profile.club_players?.name || "Spieler"}
                      />
                      <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-xl font-black">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-grow text-white min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-black mb-1 truncate">
                        {profile.club_players?.name || "Mitglied"}
                      </h2>

                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-white" />
                        <span className="text-sm font-semibold opacity-90">Vereinsmitglied</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm opacity-90">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-mono truncate">{memberNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 grid grid-cols-2 gap-4 border border-white/10">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Mitglied seit</p>
                      <p className="text-sm font-bold text-white">{memberSince}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/70 mb-1">Guthaben</p>
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-white" />
                        <p className="text-sm font-bold text-white">{formatEuro(creditBalance)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QR block */}
              <div className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">QR-Code</p>
                    <p className="text-lg font-black text-gray-900">Scannen zum Anmelden</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-orange-700" />
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-gray-50">
                  <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-gray-700">
                        {playerCode !== "Noch kein Turniercode"
                          ? "Jetzt anmelden – QR-Code scannen"
                          : "QR-Code wird erstellt nach erster Turnieranmeldung"}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono mt-2">{memberNumber}</p>

                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          className="rounded-2xl bg-orange-600 hover:bg-orange-700"
                          onClick={() => setQrOpen(true)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR groß anzeigen
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => router.push("/member-profile-app")}
                        >
                          Zum Profil
                        </Button>
                      </div>
                    </div>

                    <div className="mx-auto sm:mx-0">
                      <div className="inline-block bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                        {playerCode !== "Noch kein Turniercode" ? (
                          <QRCodeSVG value={playerCode} size={160} level="H" includeMargin />
                        ) : (
                          <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                            <QrCode className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* benefits */}
              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-orange-200">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">So nutzt du’s</p>
                  <p className="text-lg font-black text-orange-950">Schnell • Bargeldlos • Flexibel</p>
                </div>

                <div className="p-4 sm:p-6 grid sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-orange-200 bg-white p-4">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3">
                      <HandCoins className="w-5 h-5 text-orange-700" />
                    </div>
                    <p className="text-sm font-black text-gray-900">Vor Ort aufladen</p>
                    <p className="text-sm text-gray-700 mt-1">Guthaben direkt im Vereinsheim aufladen und flexibel zahlen.</p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-white p-4">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3">
                      <Zap className="w-5 h-5 text-orange-700" />
                    </div>
                    <p className="text-sm font-black text-gray-900">Bargeldlos & schnell</p>
                    <p className="text-sm text-gray-700 mt-1">Turniere/Events per QR in Sekunden – ohne Stress.</p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-white p-4">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3">
                      <Smartphone className="w-5 h-5 text-orange-700" />
                    </div>
                    <p className="text-sm font-black text-gray-900">Jederzeit auszahlen</p>
                    <p className="text-sm text-gray-700 mt-1">Dein Guthaben kann jederzeit ausgezahlt werden.</p>
                  </div>
                </div>
              </div>

              {/* info blocks */}
              <div className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">Profil</p>
                  <p className="text-lg font-black text-gray-900">Mitgliedsinformationen</p>
                </div>

                <div className="p-4 sm:p-6 bg-gray-50">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Name</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{profile.club_players?.name || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">E-Mail</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{session?.user?.email || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Herkunft</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{profile.club_players?.origin || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Alter</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {profile.club_players?.age ? `${profile.club_players.age} Jahre` : "—"}
                      </p>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-orange-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Guthaben</p>
                          <p className="mt-1 text-xl font-black text-orange-700">{formatEuro(creditBalance)}</p>
                        </div>
                        <Chip tone="amber">
                          <Wallet className="w-3.5 h-3.5" />
                          Aktualisiert
                        </Chip>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    <Button
                      onClick={downloadCard}
                      disabled={downloading}
                      className="rounded-2xl bg-orange-600 hover:bg-orange-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloading ? "Wird heruntergeladen…" : "Karte herunterladen"}
                    </Button>

                    <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/member-profile-app")}>
                      Zum Profil
                    </Button>
                  </div>
                </div>
              </div>

              {/* QR modal */}
              {qrOpen ? (
                <div
                  className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                  role="dialog"
                  aria-modal="true"
                  onMouseDown={() => setQrOpen(false)}
                >
                  <div
                    className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-gray-500">QR-Code</p>
                        <p className="text-lg font-black text-gray-900">Scannen</p>
                      </div>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center"
                        onClick={() => setQrOpen(false)}
                        aria-label="Schließen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-6 bg-gray-50 flex flex-col items-center">
                      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
                        {playerCode !== "Noch kein Turniercode" ? (
                          <QRCodeSVG value={playerCode} size={260} level="H" includeMargin />
                        ) : (
                          <div className="w-[260px] h-[260px] bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                            <QrCode className="h-20 w-20 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-[11px] text-gray-500 font-mono">{memberNumber}</p>
                      <p className="mt-2 text-sm text-gray-700 text-center">
                        {playerCode !== "Noch kein Turniercode"
                          ? "QR-Code kann für Anmeldungen vor Ort genutzt werden."
                          : "QR-Code erscheint nach der ersten Turnieranmeldung."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            /* HISTORY */
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">Guthaben</p>
                  <p className="text-lg font-black text-gray-900">Transaktions-Historie</p>
                  <p className="text-sm text-gray-600 mt-1">Letzte: {quickStats.lastTx}</p>
                </div>

                <Button
                  onClick={() => profile?.player_id && fetchTransactions(profile.player_id)}
                  variant="outline"
                  className="rounded-2xl"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aktualisieren
                </Button>
              </div>

              <div className="p-4 sm:p-6 bg-gray-50">
                {loadingTransactions ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-800 font-black">Keine Transaktionen vorhanden</p>
                    <p className="text-sm text-gray-600 mt-1">Deine Guthaben-Transaktionen werden hier angezeigt.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => {
                      const isPlus = t.amount >= 0
                      return (
                        <div key={t.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Chip tone={isPlus ? "green" : "red"}>
                                  {isPlus ? "+" : "–"} {formatEuro(Math.abs(t.amount))}
                                </Chip>
                                <p className="text-sm font-bold text-gray-900">{getTransactionTypeLabel(t.transaction_type)}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{formatDateDE(t.created_at)}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Saldo danach</p>
                              <p className="text-sm font-black text-gray-900">{formatEuro(t.balance_after)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
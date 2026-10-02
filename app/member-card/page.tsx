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
import { CreditTopupCard } from "@/components/credit-topup-card"

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
      ? "bg-orange-500/[0.09] text-orange-100 border-orange-300/[0.16]"
      : tone === "blue"
        ? "bg-sky-500/[0.09] text-sky-100 border-sky-300/[0.16]"
        : tone === "emerald"
          ? "bg-emerald-500/[0.09] text-emerald-100 border-emerald-300/[0.16]"
          : tone === "green"
            ? "bg-emerald-500/[0.09] text-emerald-100 border-emerald-300/[0.16]"
            : tone === "red"
              ? "bg-red-500/[0.09] text-red-100 border-red-300/[0.16]"
              : tone === "amber"
                ? "bg-amber-500/[0.09] text-amber-100 border-amber-300/[0.16]"
                : tone === "slate"
                  ? "bg-white/[0.045] text-white/70 border-white/[0.09]"
                  : "bg-white/[0.035] text-white/60 border-white/[0.08]"

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
      <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Mitgliedskarte" subtitle="Mein EMD" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.94)_48%,rgba(2,4,7,.985))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(14,165,233,.12),transparent_28%)]" />
        </div>

        
        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[var(--emd-content-max)] items-center justify-center px-4 py-10">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
        <Header variant="app" title="Meine Mitgliedskarte" subtitle="Mein EMD" backHref="/member-profile-app" />

        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.94)_48%,rgba(2,4,7,.985))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(14,165,233,.12),transparent_28%)]" />
        </div>

        
       <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-4 py-10">
          <div className="rounded-3xl border border-white/[0.08] bg-black/35 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] backdrop-blur-2xl p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/[0.08] border border-orange-300/[0.14] flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-orange-300" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white mb-1">{error || "Profil nicht gefunden"}</h1>
            <p className="text-sm text-white/45 mb-5">Bitte melde dich erneut an.</p>
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <Header variant="app" title="Meine Mitgliedskarte" subtitle="Mein EMD" backHref="/member-profile-app" />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.28]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.72),rgba(3,5,9,.94)_48%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(249,115,22,.18),transparent_28%),radial-gradient(circle_at_90%_30%,rgba(14,165,233,.12),transparent_28%)]" />
      </div>
      

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">
        {/* top hero */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/35 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[0.14] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-sky-500/[0.06] blur-3xl" />

          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Mitgliederbereich
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/[0.14] bg-orange-500/[0.08]">
                    <CreditCard className="h-6 w-6 text-orange-200" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                      Meine Mitgliedskarte
                    </h1>
                    <p className="mt-2 text-sm font-medium text-white/55 sm:text-base">
                      Digitale Vereinskarte, QR-Code, Guthaben und Buchungen an einem Ort.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  variant="outline"
                  className={`h-10 rounded-xl border-white/10 text-white hover:text-white ${
                    activeTab === "card" ? "border-orange-300/30 bg-orange-500 hover:bg-orange-400" : "bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Karte
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  variant="outline"
                  className={`h-10 rounded-xl border-white/10 text-white hover:text-white ${
                    activeTab === "history" ? "border-orange-300/30 bg-orange-500 hover:bg-orange-400" : "bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  <History className="mr-2 h-4 w-4" />
                  Historie
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
              <div className="relative min-w-0 overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[11px] sm:tracking-[0.16em]">Guthaben</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="whitespace-nowrap text-lg font-black text-white sm:text-2xl">{formatEuro(creditBalance)}</div>
                  <Wallet className="h-5 w-5 shrink-0 text-orange-200" />
                </div>
              </div>
              <div className="relative min-w-0 overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[11px] sm:tracking-[0.16em]">Buchungen</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-2xl font-black text-white">{quickStats.txCount}</div>
                  <History className="h-5 w-5 shrink-0 text-orange-200" />
                </div>
              </div>
              <div className="relative min-w-0 overflow-hidden rounded-2xl border border-orange-300/[0.10] bg-white/[0.05] p-3 shadow-[0_0_24px_rgba(249,115,22,.055)] backdrop-blur-sm sm:border-white/10 sm:bg-white/[0.055] sm:shadow-none sm:p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[11px] sm:tracking-[0.16em]">Spielercode</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="truncate font-mono text-[11px] font-black text-white sm:text-sm">{memberNumber}</div>
                  <Target className="hidden h-5 w-5 shrink-0 text-orange-200 sm:block" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* wallet top-up */}
        <CreditTopupCard onTopupComplete={() => void fetchProfile()} />

        {/* content */}
        <div className="mt-4">
          {activeTab === "card" ? (
            <>
              {/* card preview (download target) */}
              <Card
                ref={cardRef}
                className="relative overflow-hidden rounded-[30px] border border-orange-300/[0.13] bg-[linear-gradient(145deg,#0b0e13,#080a0e_58%,#120b07)] shadow-[0_0_42px_rgba(249,115,22,.07),0_28px_80px_-48px_rgba(0,0,0,.98)]"
              >
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[0.14] blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-sky-500/[0.06] blur-3xl" />

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
              <div className="mt-4 rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl overflow-hidden sm:rounded-[30px]">
                <div className="p-4 sm:p-6 border-b border-white/[0.07] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-white/35">QR-Code</p>
                    <p className="text-lg font-black text-white">Scannen zum Anmelden</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/[0.08] border border-orange-300/[0.14] flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-orange-300" />
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-white/[0.025]">
                  <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-white/55">
                        {playerCode !== "Noch kein Turniercode"
                          ? "Jetzt anmelden – QR-Code scannen"
                          : "QR-Code wird erstellt nach erster Turnieranmeldung"}
                      </p>
                      <p className="text-[11px] text-white/35 font-mono mt-2">{memberNumber}</p>

                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          className="rounded-2xl bg-orange-500 shadow-[0_0_26px_rgba(249,115,22,.14)] hover:bg-orange-400 active:scale-[0.99]"
                          onClick={() => setQrOpen(true)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR groß anzeigen
                        </Button>
                      </div>
                    </div>

                    <div className="mx-auto sm:mx-0">
                      <div className="inline-block rounded-2xl border border-white/15 bg-white p-4 shadow-[0_18px_45px_-24px_rgba(0,0,0,.8)]">
                        {playerCode !== "Noch kein Turniercode" ? (
                          <QRCodeSVG value={playerCode} size={160} level="H" includeMargin />
                        ) : (
                          <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                            <QrCode className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* benefits */}
              <div className="mt-4 rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl overflow-hidden sm:rounded-[30px]">
                <div className="p-4 sm:p-6 border-b border-orange-300/[0.10]">
                  <p className="text-xs font-black uppercase tracking-wider text-white/35">So nutzt du’s</p>
                  <p className="text-lg font-black text-white">Schnell • Bargeldlos • Flexibel</p>
                </div>

                <div className="p-4 sm:p-6 grid sm:grid-cols-3 gap-3">
                  <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.12] bg-orange-500/[0.04] p-4 shadow-[0_0_24px_rgba(249,115,22,.05)] transition active:scale-[0.992] sm:shadow-none">
                    <div className="w-11 h-11 rounded-2xl bg-orange-500/[0.08] border border-orange-300/[0.14] flex items-center justify-center mb-3">
                      <HandCoins className="w-5 h-5 text-orange-300" />
                    </div>
                    <p className="text-sm font-black text-white">Online aufladen</p>
                    <p className="text-sm text-white/55 mt-1">10, 20, 30 oder 50 € wählen und sicher über Stripe bezahlen.</p>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.12] bg-orange-500/[0.04] p-4 shadow-[0_0_24px_rgba(249,115,22,.05)] transition active:scale-[0.992] sm:shadow-none">
                    <div className="w-11 h-11 rounded-2xl bg-orange-500/[0.08] border border-orange-300/[0.14] flex items-center justify-center mb-3">
                      <Zap className="w-5 h-5 text-orange-300" />
                    </div>
                    <p className="text-sm font-black text-white">Bargeldlos & schnell</p>
                    <p className="text-sm text-white/55 mt-1">Turniere/Events per QR in Sekunden – ohne Stress.</p>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-orange-300/[0.12] bg-orange-500/[0.04] p-4 shadow-[0_0_24px_rgba(249,115,22,.05)] transition active:scale-[0.992] sm:shadow-none">
                    <div className="w-11 h-11 rounded-2xl bg-orange-500/[0.08] border border-orange-300/[0.14] flex items-center justify-center mb-3">
                      <Smartphone className="w-5 h-5 text-orange-300" />
                    </div>
                    <p className="text-sm font-black text-white">Für Cups verwenden</p>
                    <p className="text-sm text-white/55 mt-1">Guthaben zunächst für Members Cup und Lion Cup verwenden.</p>
                  </div>
                </div>
              </div>

              {/* info blocks */}
              <div className="mt-4 rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl overflow-hidden sm:rounded-[30px]">
                <div className="p-4 sm:p-6 border-b border-white/[0.07]">
                  <p className="text-xs font-black uppercase tracking-wider text-white/35">Profil</p>
                  <p className="text-lg font-black text-white">Mitgliedsinformationen</p>
                </div>

                <div className="p-4 sm:p-6 bg-white/[0.025]">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Name</p>
                      <p className="mt-1 text-sm font-bold text-white">{profile.club_players?.name || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/35">E-Mail</p>
                      <p className="mt-1 text-sm font-bold text-white">{session?.user?.email || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Herkunft</p>
                      <p className="mt-1 text-sm font-bold text-white">{profile.club_players?.origin || "—"}</p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Alter</p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {profile.club_players?.age ? `${profile.club_players.age} Jahre` : "—"}
                      </p>
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-orange-300/[0.10] bg-orange-500/[0.035] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Guthaben</p>
                          <p className="mt-1 text-xl font-black text-orange-300">{formatEuro(creditBalance)}</p>
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
                      className="rounded-2xl bg-orange-500 shadow-[0_0_26px_rgba(249,115,22,.14)] hover:bg-orange-400 active:scale-[0.99]"
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
                    <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-white/35">QR-Code</p>
                        <p className="text-lg font-black text-white">Scannen</p>
                      </div>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-2xl border border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.025] flex items-center justify-center"
                        onClick={() => setQrOpen(false)}
                        aria-label="Schließen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-6 bg-white/[0.025] flex flex-col items-center">
                      <div className="bg-white p-4 rounded-3xl border border-white/[0.08] shadow-sm">
                        {playerCode !== "Noch kein Turniercode" ? (
                          <QRCodeSVG value={playerCode} size={260} level="H" includeMargin />
                        ) : (
                          <div className="w-[260px] h-[260px] bg-gray-100 rounded-2xl flex items-center justify-center border border-white/[0.08]">
                            <QrCode className="h-20 w-20 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-[11px] text-white/35 font-mono">{memberNumber}</p>
                      <p className="mt-2 text-sm text-white/55 text-center">
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
            <div className="rounded-[26px] border border-white/[0.08] bg-black/30 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl overflow-hidden sm:rounded-[30px]">
              <div className="p-4 sm:p-6 border-b border-white/[0.07] flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white/35">Guthaben</p>
                  <p className="text-lg font-black text-white">Transaktions-Historie</p>
                  <p className="text-sm text-white/45 mt-1">Letzte: {quickStats.lastTx}</p>
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

              <div className="p-4 sm:p-6 bg-white/[0.025]">
                {loadingTransactions ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-800 font-black">Keine Transaktionen vorhanden</p>
                    <p className="text-sm text-white/45 mt-1">Deine Guthaben-Transaktionen werden hier angezeigt.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => {
                      const isPlus = t.amount >= 0
                      return (
                        <div key={t.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Chip tone={isPlus ? "green" : "red"}>
                                  {isPlus ? "+" : "–"} {formatEuro(Math.abs(t.amount))}
                                </Chip>
                                <p className="text-sm font-bold text-white">{getTransactionTypeLabel(t.transaction_type)}</p>
                              </div>
                              <p className="text-xs text-white/35 mt-1">{formatDateDE(t.created_at)}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-[11px] font-black uppercase tracking-wider text-white/35">Saldo danach</p>
                              <p className="text-sm font-black text-white">{formatEuro(t.balance_after)}</p>
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
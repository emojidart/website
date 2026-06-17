"use client"

import Image from "next/image"
import Link from "next/link"
import { notFound, useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Loader2,
  Lock,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { getPraemieBySlug, praemienProducts } from "@/lib/praemien-products"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

type UserProfileRow = {
  id: string
  user_id: string
  player_id: string | null
  club_players?: {
    id: string
    name: string
    photo_url?: string | null
  } | null
}

type BonusTransaction = {
  id: string
  player_id: string
  player_name: string
  points: number
}

type RedemptionRow = {
  id: string
  product_slug: string
  product_title: string
  product_points: number
  player_id: string | null
  player_name: string
  user_id: string | null
  status: string
  created_at: string
}

const REDEMPTION_RULE_ID = "75ed3a8b-f973-4488-905d-7138deacacde"

const categoryStyle: Record<string, string> = {
  Bronze: "border-orange-300 bg-orange-50 text-orange-700",
  Silber: "border-slate-300 bg-slate-100 text-slate-700",
  Gold: "border-yellow-300 bg-yellow-50 text-yellow-700",
}

export default function PraemieDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { session } = useAuth()

  const slug = String(params?.slug || "")
  const product = getPraemieBySlug(slug)

  if (!product) {
    notFound()
  }

  const Icon = product.icon

  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [redemption, setRedemption] = useState<RedemptionRow | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [pointsAfterRedeem, setPointsAfterRedeem] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, slug])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const { data: redemptionData } = await supabase
        .from("praemien_redemptions")
        .select("*")
        .eq("product_slug", product.slug)
        .maybeSingle()

      setRedemption((redemptionData || null) as RedemptionRow | null)

      if (!session?.user) {
        setProfile(null)
        setTransactions([])
        return
      }

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select(`
          id,
          user_id,
          player_id,
          club_players (
            id,
            name,
            photo_url
          )
        `)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!profileData) {
        setProfile(null)
        setTransactions([])
        return
      }

      const nextProfile = profileData as any as UserProfileRow
      setProfile(nextProfile)

      const playerName = String(nextProfile.club_players?.name || "").trim()

      const possiblePlayerIds = Array.from(
        new Set(
          [
            nextProfile.club_players?.id ? String(nextProfile.club_players.id) : "",
            nextProfile.player_id ? String(nextProfile.player_id) : "",
          ].filter(Boolean),
        ),
      )

      const foundTransactions: BonusTransaction[] = []

      if (possiblePlayerIds.length > 0) {
        const { data } = await supabase
          .from("bonus_transactions")
          .select("*")
          .in("player_id", possiblePlayerIds)

        foundTransactions.push(...((data || []) as BonusTransaction[]))
      }

      if (playerName) {
        const { data } = await supabase
          .from("bonus_transactions")
          .select("*")
          .ilike("player_name", playerName)

        foundTransactions.push(...((data || []) as BonusTransaction[]))
      }

      const map = new Map<string, BonusTransaction>()
      foundTransactions.forEach((row) => {
        if (row.id) map.set(row.id, row)
      })

      setTransactions(Array.from(map.values()))
    } finally {
      setLoading(false)
    }
  }

  const totalPoints = useMemo(() => {
    return transactions.reduce((sum, item) => sum + Number(item.points || 0), 0)
  }, [transactions])

  const isRedeemed = Boolean(redemption)
  const canRedeem = Boolean(session?.user && profile && totalPoints >= product.points && !isRedeemed)
  const missingPoints = Math.max(0, product.points - totalPoints)

  const handleRedeem = async () => {
    if (!session?.user) {
      router.push("/member-login")
      return
    }

    if (!profile) {
      setMessage("Für dein Konto wurde kein Spielerprofil gefunden.")
      return
    }

    if (isRedeemed) {
      setMessage("Diese Prämie wurde bereits eingelöst und ist nicht mehr verfügbar.")
      return
    }

    if (totalPoints < product.points) {
      setMessage(`Dir fehlen noch ${missingPoints} Punkte für diese Prämie.`)
      return
    }

    try {
      setRedeeming(true)
      setMessage(null)

      const playerName =
        profile.club_players?.name ||
        transactions[0]?.player_name ||
        "Vereinsmitglied"

      const playerId =
        profile.club_players?.id ||
        profile.player_id ||
        transactions[0]?.player_id ||
        null

      const newPointsAfterRedeem = totalPoints - product.points

      const { error: redemptionError } = await supabase
        .from("praemien_redemptions")
        .insert({
          product_slug: product.slug,
          product_title: product.title,
          product_points: product.points,
          player_id: playerId,
          player_name: playerName,
          user_id: session.user.id,
          status: "offen",
        })

      if (redemptionError) throw redemptionError

      const { error: bonusError } = await supabase
        .from("bonus_transactions")
        .insert({
          player_id: playerId,
          player_name: playerName,
          rule_id: REDEMPTION_RULE_ID,
          rule_title: `Prämie eingelöst: ${product.title}`,
          category_name: "Prämien Einlösung",
          points: -Math.abs(product.points),
          source_type: "praemie_redemption",
          source_context: product.slug,
          source_id: product.slug,
          source_name: product.title,
          note: `${product.title} wurde für ${product.points} Bonuspunkte eingelöst.`,
        })

      if (bonusError) throw bonusError

      setPointsAfterRedeem(newPointsAfterRedeem)
      setSuccessOpen(true)
      await loadData()
    } catch (error: any) {
      console.error("redeem error:", error)
      setMessage(error?.message || "Prämie konnte nicht eingelöst werden.")
    } finally {
      setRedeeming(false)
    }
  }

  const relatedProducts = praemienProducts
    .filter((item) => item.slug !== product.slug && item.category === product.category)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header />

      <div className="h-12 sm:h-14" />
	  
	  {confirmOpen ? (
  <div className="fixed inset-0 z-[998] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50">
        <Gift className="h-9 w-9 text-red-600" />
      </div>

      <h2 className="mt-5 text-center text-2xl font-black uppercase text-slate-950">
        Wirklich einlösen?
      </h2>

      <p className="mt-4 text-center text-sm leading-7 text-slate-600">
        Du möchtest folgende Prämie einlösen:
      </p>

      <p className="mt-3 text-center text-xl font-black uppercase text-slate-950">
        {product.title}
      </p>

      <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
        <p className="text-xs font-black uppercase text-red-600">
          Punkte werden abgezogen
        </p>

        <p className="mt-1 text-3xl font-black text-red-700">
          -{product.points}
        </p>

        <p className="mt-2 text-sm font-semibold text-slate-600">
          Verbleibend:
          {" "}
          {Math.max(0, totalPoints - product.points)}
          {" "}
          Punkte
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => setConfirmOpen(false)}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-black uppercase"
        >
          Abbrechen
        </button>

        <button
          type="button"
          onClick={() => {
            setConfirmOpen(false)
            handleRedeem()
          }}
          className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-black uppercase text-white"
        >
          Ja, einlösen
        </button>
      </div>
    </div>
  </div>
) : null}

      {successOpen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 p-8 text-white">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_30%),radial-gradient(circle_at_80%_10%,white,transparent_25%),radial-gradient(circle_at_50%_90%,white,transparent_35%)]" />

              <div className="relative">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-xl backdrop-blur">
                  <PartyPopper className="h-11 w-11 text-white" />
                </div>

                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/85">
                  Erfolgreich eingelöst
                </p>

                <h2 className="mt-2 text-4xl font-black uppercase leading-tight">
                  Glückwunsch!
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/90">
                  Deine Bonuspunkte wurden erfolgreich eingelöst und die Prämie wurde für dich reserviert.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                      Eingelöste Prämie
                    </p>
                    <h3 className="mt-1 text-lg font-black uppercase leading-tight text-slate-950">
                      {product.title}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                  <p className="text-xs font-black uppercase text-red-600">
                    Abgezogen
                  </p>
                  <p className="mt-1 text-3xl font-black text-red-700">
                    -{product.points}
                  </p>
                  <p className="text-xs font-bold text-slate-500">Punkte</p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
                  <p className="text-xs font-black uppercase text-green-700">
                    Neuer Stand
                  </p>
                  <p className="mt-1 text-3xl font-black text-green-700">
                    {pointsAfterRedeem ?? Math.max(0, totalPoints - product.points)}
                  </p>
                  <p className="text-xs font-bold text-slate-500">Punkte</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-600">
                Die Anfrage wurde automatisch an den Vorstand weitergeleitet. Die Ausgabe deiner Prämie wird nun bearbeitet.
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/praemien"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-200 transition hover:bg-red-500"
                >
                  Zurück zu Prämien
                </Link>

                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:border-red-300 hover:text-red-600"
                >
                  Auf Seite bleiben
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
        <Link
          href="/praemien"
          className="mb-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-600 hover:text-red-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu allen Prämien
        </Link>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <div className="relative h-[420px] bg-slate-100 sm:h-[540px]">
              <Image
                src={product.image}
                alt={product.title}
                fill
                priority
                className={`object-cover ${isRedeemed ? "grayscale opacity-60" : ""}`}
              />

              <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                    categoryStyle[product.category]
                  }`}
                >
                  {product.category}
                </span>

                <span className="rounded-full border border-red-200 bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white shadow-sm">
                  {product.points} Punkte
                </span>
              </div>

              {isRedeemed ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
                  <div className="rounded-full bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-wide text-white">
                    Bereits eingelöst
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <Icon className="h-9 w-9 text-red-600" />
            </div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-red-600">
              <Sparkles className="h-4 w-4" />
              Bonusprogramm-Prämie
            </div>

            <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {product.title}
            </h1>

            <p className="mt-4 text-xl font-black text-red-600">
              {product.points} Bonuspunkte
            </p>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                  <p className="font-bold text-slate-700">Status wird geladen...</p>
                </div>
              ) : isRedeemed ? (
                <div className="flex items-center gap-3 text-slate-700">
                  <Lock className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="font-black">Nicht mehr verfügbar</p>
                    <p className="text-sm font-semibold text-slate-500">
                      Diese Prämie wurde bereits eingelöst.
                    </p>
                  </div>
                </div>
              ) : canRedeem ? (
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-black">Einlösbar</p>
                    <p className="text-sm font-semibold">
                      Du hast {totalPoints} Punkte und kannst diese Prämie einlösen.
                    </p>
                  </div>
                </div>
              ) : session?.user ? (
                <div className="flex items-center gap-3 text-orange-700">
                  <Lock className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-black">Noch nicht einlösbar</p>
                    <p className="text-sm font-semibold">
                      Du hast {totalPoints} Punkte. Es fehlen noch {missingPoints} Punkte.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-slate-700">
                  <Lock className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="font-black">Login erforderlich</p>
                    <p className="text-sm font-semibold text-slate-500">
                      Melde dich an, um deine Punkte zu prüfen.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <h2 className="mt-8 text-2xl font-black text-slate-950">
              {product.descriptionTitle}
            </h2>

            <p className="mt-4 text-base leading-8 text-slate-600">
              {product.description}
            </p>

            <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <Gift className="mt-1 h-6 w-6 shrink-0 text-red-600" />
                <p className="text-sm font-semibold leading-7 text-slate-700">
                  {product.bonusText}
                </p>
              </div>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                {message}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
               onClick={() => setConfirmOpen(true)}
                disabled={redeeming || loading || isRedeemed || !canRedeem}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-200 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {redeeming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRedeemed ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                {isRedeemed
  ? "Nicht verfügbar"
  : totalPoints < product.points
    ? `Noch ${missingPoints} Punkte fehlen`
    : "Prämie einlösen"}
              </button>

              <Link
                href="/praemien-rangliste"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-slate-900 shadow-sm transition hover:border-red-300 hover:text-red-600"
              >
                Rangliste ansehen
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <h2 className="text-2xl font-black uppercase text-slate-950">
              Highlights
            </h2>

            <div className="mt-6 grid gap-3">
              {product.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <p className="text-sm font-semibold leading-6 text-slate-700">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <h2 className="text-2xl font-black uppercase text-slate-950">
              Perfekt geeignet für
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">
              {product.perfectFor.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  <Star className="h-4 w-4 text-red-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
                Weitere Prämien
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase text-slate-950">
                Auch interessant
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link
                  key={item.slug}
                  href={`/praemien/${item.slug}`}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:border-red-300"
                >
                  <div className="relative h-56 bg-slate-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                      {item.points} Punkte
                    </p>
                    <h3 className="mt-2 text-lg font-black uppercase text-slate-950">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
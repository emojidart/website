"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Loader2,
  Lock,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { praemienCategories, praemienProducts } from "@/lib/praemien-products"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

type RedemptionRow = {
  id: string
  product_slug: string
  status: string
}

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

const categoryStyle: Record<string, string> = {
  Bronze: "border-orange-300 bg-orange-50 text-orange-700",
  Silber: "border-slate-300 bg-slate-100 text-slate-700",
  Gold: "border-yellow-300 bg-yellow-50 text-yellow-700",
}

const steps = [
  {
    number: "01",
    title: "Punkte sammeln",
    text: "Durch Turniere, Training, Vereinsleben und besondere Aktionen sammelst du Bonuspunkte.",
    icon: Trophy,
  },
  {
    number: "02",
    title: "Prämie wählen",
    text: "Je nach Punktestand kannst du deine Wunschprämie auswählen.",
    icon: Gift,
  },
  {
    number: "03",
    title: "Prämie sichern",
    text: "Deine Punkte werden eingelöst und du erhältst deine ausgewählte Sachprämie.",
    icon: CheckCircle2,
  },
]

function getCurrentLevel(points: number) {
  if (points >= 2000) return "Gold"
  if (points >= 1500) return "Silber"
  if (points >= 1000) return "Bronze"
  return "Starter"
}

function getNextLevel(points: number) {
  if (points < 1000) return { title: "Bronze", missing: 1000 - points }
  if (points < 1500) return { title: "Silber", missing: 1500 - points }
  if (points < 2000) return { title: "Gold", missing: 2000 - points }
  return null
}


async function hasActiveBaseMembership(playerIds: string[]) {
  const cleanPlayerIds = Array.from(new Set(playerIds.filter(Boolean)))
  if (cleanPlayerIds.length === 0) return false

  const { data: baseModule, error: baseModuleError } = await supabase
    .from("membership_modules")
    .select("id")
    .eq("code", "base_membership")
    .eq("is_active", true)
    .maybeSingle()

  if (baseModuleError) throw baseModuleError
  if (!baseModule?.id) return false

  const { data: memberships, error: membershipsError } = await supabase
    .from("member_memberships")
    .select("id")
    .in("player_id", cleanPlayerIds)
    .eq("status", "active")

  if (membershipsError) throw membershipsError

  const membershipIds = (memberships || []).map((row: any) => String(row.id))
  if (membershipIds.length === 0) return false

  const { data: membershipModule, error: membershipModuleError } = await supabase
    .from("member_membership_modules")
    .select("membership_id")
    .in("membership_id", membershipIds)
    .eq("module_id", baseModule.id)
    .limit(1)
    .maybeSingle()

  if (membershipModuleError) throw membershipModuleError

  return !!membershipModule
}

export default function PraemienPage() {
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([])
  const [hasBaseMembership, setHasBaseMembership] = useState(false)

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: redemptionData } = await supabase
        .from("praemien_redemptions")
        .select("id, product_slug, status")

      setRedemptions((redemptionData || []) as RedemptionRow[])

      if (!session?.user) {
        setProfile(null)
        setTransactions([])
        setHasBaseMembership(false)
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
        setHasBaseMembership(false)
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

      const isBaseMember = await hasActiveBaseMembership(possiblePlayerIds)
      setHasBaseMembership(isBaseMember)

      if (!isBaseMember) {
        setTransactions([])
        return
      }

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

  const currentLevel = getCurrentLevel(totalPoints)
  const nextLevel = getNextLevel(totalPoints)

  const redeemedSlugs = useMemo(() => {
    return new Set(redemptions.map((item) => item.product_slug))
  }, [redemptions])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header />

      <div className="h-12 sm:h-14" />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0">
          <Image
            src="/images/praemien/hero.jpg"
            alt="EMD Prämien"
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-red-600 shadow-sm">
              <Sparkles className="h-4 w-4" />
              EMD Bonusprogramm
            </div>

            <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Punkte sammeln.
              <span className="mt-2 block text-red-600">Prämien sichern.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Sammle Bonuspunkte bei Turnieren, Training und Vereinsaktivitäten
              und löse sie gegen exklusive EMD Sachpreise ein.
            </p>
          </div>

          <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70 lg:p-6">
            {loading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                <p className="font-bold text-slate-700">Punkte werden geladen...</p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_1fr] lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
                    <Trophy className="h-9 w-9 text-red-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                      Deine Bonuspunkte
                    </p>
                    <p className="mt-1 text-3xl font-black text-slate-950">
                      {session?.user
                        ? hasBaseMembership
                          ? totalPoints
                          : "Grundmitgliedschaft erforderlich"
                        : "Login erforderlich"}
                    </p>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-red-600"
                        style={{
                          width: `${Math.min(100, Math.round((totalPoints / 2000) * 100))}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {session?.user
                        ? hasBaseMembership
                          ? nextLevel
                            ? `Noch ${nextLevel.missing} Punkte bis ${nextLevel.title}`
                            : "Gold erreicht – stark!"
                          : "Das Bonus- und Prämienprogramm ist in der Grundmitgliedschaft enthalten."
                        : "Melde dich an, um deine Punkte zu sehen."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-slate-200 lg:border-l lg:pl-8">
                  <Target className="h-7 w-7 text-slate-800" />
                  <span className="text-sm font-semibold text-slate-800">
                    Status: {currentLevel}
                  </span>
                </div>

                <div className="flex items-center gap-3 border-slate-200 lg:border-l lg:pl-8">
                  <Gift className="h-7 w-7 text-slate-800" />
                  <span className="text-sm font-semibold text-slate-800">
                    Prämien auswählen
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
            Prämienlevel
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-wide text-slate-950 sm:text-4xl">
            Bronze. Silber. Gold.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {praemienCategories.map((category) => (
            <div
              key={category.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60"
            >
              <div
                className={`mb-5 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                  categoryStyle[category.title]
                }`}
              >
                {category.title}
              </div>

              <h3 className="text-2xl font-black uppercase text-slate-950">
                {category.points}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {category.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
              Sachpreise
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-wide text-slate-950">
              Alle Prämien
            </h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {praemienProducts.map((product) => {
            const Icon = product.icon
            const isRedeemed = redeemedSlugs.has(product.slug)
            const canRedeem =
              session?.user &&
              hasBaseMembership &&
              totalPoints >= product.points &&
              !isRedeemed
            const missingPoints = Math.max(0, product.points - totalPoints)

            return (
              <Link
                key={product.slug}
                href={`/praemien/${product.slug}`}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:border-red-300"
              >
                <div className="relative h-72 overflow-hidden bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className={`object-cover transition duration-500 group-hover:scale-105 ${
                      isRedeemed ? "grayscale opacity-60" : ""
                    }`}
                  />

                  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
                        categoryStyle[product.category]
                      }`}
                    >
                      {product.category}
                    </span>

                    <span className="rounded-full border border-red-200 bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm">
                      {product.points} Punkte
                    </span>
                  </div>

                  {isRedeemed ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
                      <div className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-wide text-white">
                        Bereits eingelöst
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                    <Icon className="h-7 w-7 text-red-600" />
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-wide text-slate-950">
                    {product.title}
                  </h3>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">
                    {product.shortText}
                  </p>

                  <div className="mt-5">
                    {isRedeemed ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-600">
                        <Lock className="h-4 w-4" />
                        Nicht mehr verfügbar
                      </div>
                    ) : canRedeem ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Einlösbar
                      </div>
                    ) : session?.user && !hasBaseMembership ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase text-blue-700">
                        <Lock className="h-4 w-4" />
                        Grundmitgliedschaft erforderlich
                      </div>
                    ) : session?.user ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase text-orange-700">
                        <Lock className="h-4 w-4" />
                        Noch {missingPoints} Punkte
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-600">
                        Login erforderlich
                      </div>
                    )}
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-600">
                    Produkt ansehen
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <div className="relative overflow-hidden bg-white px-5 py-10 text-slate-950 sm:px-8 lg:px-10">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_15%_20%,#ef4444,transparent_30%),radial-gradient(circle_at_85%_15%,#f97316,transparent_30%),radial-gradient(circle_at_50%_100%,#ffffff,transparent_22%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/80">
                <Sparkles className="h-4 w-4 text-red-400" />
                Bonusprogramm
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-wide sm:text-4xl lg:text-5xl">
                    So funktioniert’s
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                    Sammeln, auswählen und sichern – dein Weg zur EMD Sachprämie ist einfach und transparent.
                  </p>
                </div>

                <div className="hidden lg:flex justify-end">
                  <div className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white/80">
                    3 einfache Schritte
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <div
                  key={step.number}
                  className={`relative p-6 sm:p-8 ${
                    index !== steps.length - 1 ? "border-b border-slate-200 lg:border-b-0 lg:border-r" : ""
                  }`}
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <Icon className="h-7 w-7" />
                    </div>

                    <div className="text-5xl font-black leading-none text-slate-100">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-wide text-slate-950">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {step.text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <MobileBottomNav />
    </div>
  )
}
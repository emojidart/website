"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Gift,
  ListOrdered,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Series = {
  id: string
  name: string
  slug: string
  series_type: string | null
  access_type: string | null
  description: string | null
  rules_text: string | null
  startgeld: number | null
  series_fee: number | null
  qualification_requirement: number | null
  total_tournament_days: number | null
  halving_active: boolean | null
  halving_date: string | null
  division_active: boolean | null
  division_date: string | null
  tournament_format: string
  team_mode: string
  draw_method: string
  placement_scoring_mode: "fixed" | "dynamic"
  dynamic_last_place_points: number | null
  dynamic_step_points: number | null
  result_counting_mode: "all" | "best_n"
  best_n_results: number | null
  legs_scoring_active: boolean | null
  legs_points_per_win: number | null
  undefeated_winner_bonus_active: boolean | null
  undefeated_winner_bonus_points: number | null
  participation_bonus_mode: string | null
  registration_enabled: boolean | null
  registration_open_mode: string | null
  registration_open_time: string | null
  registration_close_mode: string | null
  registration_close_time: string | null
  unregister_close_mode: string | null
  unregister_close_time: string | null
  min_participants: number | null
  max_participants: number | null
  require_even_participants: boolean | null
  odd_participant_policy: string | null
  no_show_penalty_mode: string | null
}

type PointRule = { id: string; place_from: number; place_to: number; points: number }
type Bonus = { id: string; required_starts: number; bonus_points: number; label: string | null }
type CashReward = { id: string; required_starts: number; amount: number; label: string | null }
type Tiebreak = { id: string; priority: number; rule_key: string; label: string | null }

const FORMAT_LABEL: Record<string, string> = {
  dko: "Doppel-K.-o.",
  round_robin: "Round Robin",
  kratzer: "Kratzer",
  survival: "Survival",
}
const TEAM_LABEL: Record<string, string> = {
  single: "Einzel",
  drawn_doubles: "Gelostes Doppel",
  fixed_doubles: "Fixes Doppel",
}
const DRAW_LABEL: Record<string, string> = {
  none: "Keine Auslosung",
  random: "Zufällige Auslosung",
  level_balanced: "Auslosung nach Leistungsgruppen",
  manual: "Manuelle Einteilung",
}
const ACCESS_LABEL: Record<string, string> = {
  public: "Öffentlich",
  club_internal: "Nur Vereinsmitglieder",
  club_external: "Vereins-Auswärts",
}
const SERIES_TYPE_LABEL: Record<string, string> = {
  lion_cup: "Lion Cup",
  members_cup: "Members Champion Cup",
  summer_special: "Summer Special",
  buffalo_cup: "Buffalo Cup",
}
const ODD_POLICY_LABEL: Record<string, string> = {
  allow: "Ungerade Teilnehmerzahl erlaubt",
  last_waitlist: "Letzte Anmeldung wartet bei ungerader Teilnehmerzahl",
}
const NO_SHOW_LABEL: Record<string, string> = {
  none: "Keine automatische Strafe",
  delete_worst_result: "Schlechtestes Ergebnis wird gestrichen",
}
const BONUS_MODE_LABEL: Record<string, string> = {
  highest_only: "Nur der höchste erreichte Teilnahmebonus zählt",
  cumulative: "Teilnahmeboni werden addiert",
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("de-AT", { style: "currency", currency: "EUR" })
}
function time(value: string | null | undefined) {
  return value ? value.slice(0, 5) : null
}
function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" }) : null
}
function registrationOpenText(series: Series) {
  if (!series.registration_enabled) return "Geschlossen"
  if (series.registration_open_mode === "always") return "Dauerhaft geöffnet"
  if (series.registration_open_mode === "event_day") return series.registration_open_time ? `Am Turniertag ab ${time(series.registration_open_time)} Uhr` : "Am Turniertag"
  return "Nach Ausschreibung"
}
function registrationCloseText(series: Series) {
  if (!series.registration_enabled) return "–"
  if (series.registration_close_mode === "fixed_time") return series.registration_close_time ? `${time(series.registration_close_time)} Uhr am Turniertag` : "Feste Uhrzeit"
  if (series.registration_close_mode === "minutes_before_start") return "Vor Turnierbeginn"
  return "Nach Ausschreibung"
}
function unregisterCloseText(series: Series) {
  if (series.unregister_close_mode === "same_as_registration") return "Wie Anmeldeschluss"
  if (series.unregister_close_mode === "fixed_time") return series.unregister_close_time ? `${time(series.unregister_close_time)} Uhr am Turniertag` : "Feste Uhrzeit"
  if (series.unregister_close_mode === "minutes_before_start") return "Vor Turnierbeginn"
  return "Nach Ausschreibung"
}

export default function DynamicSeriesRulesPage() {
  const params = useParams<{ slug: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [points, setPoints] = useState<PointRule[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [cash, setCash] = useState<CashReward[]>([])
  const [tiebreaks, setTiebreaks] = useState<Tiebreak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: seriesRow } = await supabase
        .from("dko_series")
        .select("id,name,slug,series_type,access_type,description,rules_text,startgeld,series_fee,qualification_requirement,total_tournament_days,halving_active,halving_date,division_active,division_date,tournament_format,team_mode,draw_method,placement_scoring_mode,dynamic_last_place_points,dynamic_step_points,result_counting_mode,best_n_results,legs_scoring_active,legs_points_per_win,undefeated_winner_bonus_active,undefeated_winner_bonus_points,participation_bonus_mode,registration_enabled,registration_open_mode,registration_open_time,registration_close_mode,registration_close_time,unregister_close_mode,unregister_close_time,min_participants,max_participants,require_even_participants,odd_participant_policy,no_show_penalty_mode")
        .eq("slug", params.slug)
        .eq("is_active", true)
        .maybeSingle()

      if (!mounted) return
      if (!seriesRow) {
        setSeries(null)
        setLoading(false)
        return
      }

      const loaded = seriesRow as Series
      const [pointsRes, bonusRes, cashRes, tiebreakRes] = await Promise.all([
        supabase.from("dko_series_point_rules").select("id,place_from,place_to,points").eq("series_id", loaded.id).order("sort_order"),
        supabase.from("dko_series_participation_bonuses").select("id,required_starts,bonus_points,label").eq("series_id", loaded.id).order("required_starts"),
        supabase.from("dko_series_cash_rewards").select("id,required_starts,amount,label").eq("series_id", loaded.id).order("required_starts"),
        supabase.from("dko_series_tiebreak_rules").select("id,priority,rule_key,label").eq("series_id", loaded.id).order("priority"),
      ])

      if (!mounted) return
      setSeries(loaded)
      setPoints((pointsRes.data || []) as PointRule[])
      setBonuses((bonusRes.data || []) as Bonus[])
      setCash((cashRes.data || []) as CashReward[])
      setTiebreaks((tiebreakRes.data || []) as Tiebreak[])
      setLoading(false)
    }
    if (params.slug) void load()
    return () => { mounted = false }
  }, [params.slug])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header variant="app" title={series?.name || "Regelwerk"} subtitle="Regelwerk" backHref={`/turniere/serien/${params.slug}`} />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[64%_50%] bg-no-repeat opacity-[0.24]" style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.76),rgba(3,5,9,.96)_42%,rgba(2,4,7,.995))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(14,165,233,.11),transparent_27%),radial-gradient(circle_at_90%_22%,rgba(249,115,22,.10),transparent_26%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-10 pt-20 sm:px-5 sm:pt-24 lg:px-7 xl:px-8">
        {loading ? (
          <div className="min-h-[420px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
        ) : !series ? (
          <div className="rounded-[28px] border border-white/10 bg-black/35 p-8 text-center font-bold text-white/60">Turnierserie nicht gefunden.</div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <section className="relative overflow-hidden rounded-[30px] border border-sky-300/[0.13] bg-black/40 p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-7">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-sky-500/[0.09] blur-[75px]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-500/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/75">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  {SERIES_TYPE_LABEL[series.series_type || ""] || "Turnierserie"}
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">Regelwerk · {series.name}</h1>
                {series.description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/48 sm:text-base">{series.description}</p> : null}

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <QuickFact icon={<Target className="h-4 w-4" />} label="Modus" value={`${FORMAT_LABEL[series.tournament_format] || series.tournament_format} · ${TEAM_LABEL[series.team_mode] || series.team_mode}`} />
                  <QuickFact icon={<Users className="h-4 w-4" />} label="Zugang" value={ACCESS_LABEL[series.access_type || ""] || "–"} />
                  <QuickFact icon={<Euro className="h-4 w-4" />} label="Startgeld" value={money(series.startgeld)} />
                  <QuickFact icon={<CalendarDays className="h-4 w-4" />} label="Turniertage" value={series.total_tournament_days ? String(series.total_tournament_days) : "–"} />
                </div>
              </div>
            </section>

            {series.rules_text ? (
              <RuleSection icon={<ShieldCheck className="h-5 w-5" />} title="Teilnahmebedingungen & Zusatzregeln" tone="sky">
                <div className="whitespace-pre-line text-sm font-semibold leading-7 text-white/68 sm:text-[15px]">{series.rules_text}</div>
              </RuleSection>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              <RuleSection icon={<CalendarDays className="h-5 w-5" />} title="Serie" tone="orange">
                <Info label="Zugang" value={ACCESS_LABEL[series.access_type || ""] || series.access_type || "Nicht festgelegt"} />
                {series.total_tournament_days ? <Info label="Turniertage" value={series.total_tournament_days} /> : null}
                {series.qualification_requirement && series.qualification_requirement > 0 ? <Info label="Mindestantritte" value={series.qualification_requirement} /> : null}
                {series.min_participants ? <Info label="Mindestteilnehmer" value={series.min_participants} /> : null}
                {series.max_participants ? <Info label="Maximalteilnehmer" value={series.max_participants} /> : null}
              </RuleSection>

              <RuleSection icon={<Euro className="h-5 w-5" />} title="Gebühren" tone="emerald">
                <Info label="Startgeld je Turniertag" value={money(series.startgeld)} strong />
                <Info label="Seriengebühr" value={money(series.series_fee)} />
              </RuleSection>

              <RuleSection icon={<Clock3 className="h-5 w-5" />} title="Anmeldung" tone="amber">
                <Info label="Status" value={series.registration_enabled ? "Anmeldung geöffnet" : "Anmeldung geschlossen"} strong={!!series.registration_enabled} />
                {series.registration_enabled ? <>
                  <Info label="Öffnung" value={registrationOpenText(series)} />
                  <Info label="Anmeldeschluss" value={registrationCloseText(series)} />
                  <Info label="Abmeldeschluss" value={unregisterCloseText(series)} />
                </> : null}
              </RuleSection>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RuleSection icon={<Target className="h-5 w-5" />} title="Spielmodus & Serienwertung" tone="orange">
                <Info label="Spielmodus" value={FORMAT_LABEL[series.tournament_format] || series.tournament_format} />
                <Info label="Teammodus" value={TEAM_LABEL[series.team_mode] || series.team_mode} />
                {series.draw_method !== "none" ? <Info label="Auslosung" value={DRAW_LABEL[series.draw_method] || series.draw_method} /> : null}
                <Info label="Wertung" value={series.result_counting_mode === "best_n" && series.best_n_results ? `Die besten ${series.best_n_results} Ergebnisse zählen` : "Alle Ergebnisse zählen"} />
                <Info label="Teilnahmebonus" value={BONUS_MODE_LABEL[series.participation_bonus_mode || ""] || series.participation_bonus_mode || "Kein Sondermodus"} />
                {series.halving_active ? <Info label="Punktehalbierung" value={series.halving_date ? `Ab ${date(series.halving_date)}` : "Aktiv"} /> : null}
                {series.division_active ? <Info label="Tabellenteilung" value={series.division_date ? `Ab ${date(series.division_date)}` : "Aktiv"} /> : null}
              </RuleSection>

              <RuleSection icon={<Users className="h-5 w-5" />} title="Teilnahme am Turniertag" tone="violet">
                <Info label="Gerade Teilnehmerzahl" value={series.require_even_participants ? "Erforderlich" : "Nicht erforderlich"} />
                <Info label="Ungerade Teilnehmerzahl" value={ODD_POLICY_LABEL[series.odd_participant_policy || ""] || series.odd_participant_policy || "Keine Sonderregel"} />
                <Info label="Nicht erschienen" value={NO_SHOW_LABEL[series.no_show_penalty_mode || ""] || series.no_show_penalty_mode || "Keine Sonderregel"} />
              </RuleSection>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RuleSection icon={<ListOrdered className="h-5 w-5" />} title="Punkteschlüssel" tone="amber">
                {series.placement_scoring_mode === "dynamic" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ScoreBox label="Letzter Platz" value={`${series.dynamic_last_place_points || 0} Pkt.`} />
                    <ScoreBox label="Je bessere Platzierung" value={`+${series.dynamic_step_points || 0} Pkt.`} />
                  </div>
                ) : points.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {points.map((rule) => (
                      <ScoreBox key={rule.id} label={rule.place_from === rule.place_to ? `${rule.place_from}. Platz` : `${rule.place_from}.–${rule.place_to}. Platz`} value={`${rule.points} Pkt.`} />
                    ))}
                  </div>
                ) : <EmptyText>Kein eigener Platzierungsschlüssel hinterlegt.</EmptyText>}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {series.legs_scoring_active ? <ScoreBox label="Gewonnenes Leg" value={`+${series.legs_points_per_win || 0} Pkt.`} accent /> : null}
                  {series.undefeated_winner_bonus_active ? <ScoreBox label="Ungeschlagener Turniersieg" value={`+${series.undefeated_winner_bonus_points || 0} Pkt.`} accent /> : null}
                </div>
              </RuleSection>

              <RuleSection icon={<Gift className="h-5 w-5" />} title="Boni & Prämien" tone="emerald">
                {bonuses.length > 0 ? bonuses.map((bonus) => <RewardRow key={bonus.id} label={bonus.label || `Ab ${bonus.required_starts} Antritten`} value={`+${bonus.bonus_points} Punkte`} />) : null}
                {cash.length > 0 ? cash.map((reward) => <RewardRow key={reward.id} label={reward.label || `Ab ${reward.required_starts} Antritten`} value={money(reward.amount)} cash />) : null}
                {bonuses.length === 0 && cash.length === 0 ? <EmptyText>Keine zusätzlichen Boni oder Prämien vorgesehen.</EmptyText> : null}
              </RuleSection>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RuleSection icon={<Scale className="h-5 w-5" />} title="Tie-Break" tone="sky">
                {tiebreaks.length > 0 ? tiebreaks.map((rule, index) => (
                  <div key={rule.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-xs font-black text-white/65">{index + 1}</div>
                    <div className="font-bold text-white/72">{rule.label || rule.rule_key}</div>
                  </div>
                )) : <EmptyText>Keine zusätzliche Tie-Break-Reihenfolge hinterlegt.</EmptyText>}
              </RuleSection>

              <RuleSection icon={<Trophy className="h-5 w-5" />} title="Wichtige Hinweise" tone="orange">
                {series.registration_enabled ? (
                  <Notice icon={<CheckCircle2 className="h-4 w-4" />} text="Die Anmeldung für die Serie ist aktuell freigeschaltet." positive />
                ) : (
                  <Notice icon={<AlertTriangle className="h-4 w-4" />} text="Die Anmeldung für die Serie ist derzeit geschlossen." />
                )}
                {series.qualification_requirement && series.qualification_requirement > 0 ? <Notice icon={<Sparkles className="h-4 w-4" />} text={`Für die Serienwertung sind mindestens ${series.qualification_requirement} Antritte erforderlich.`} positive /> : null}
              </RuleSection>
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

function RuleSection({ icon, title, tone, children }: { icon: ReactNode; title: string; tone: "orange" | "emerald" | "amber" | "sky" | "violet"; children: ReactNode }) {
  const toneClass = {
    orange: "text-orange-200 border-orange-300/[0.10]",
    emerald: "text-emerald-200 border-emerald-300/[0.10]",
    amber: "text-amber-200 border-amber-300/[0.10]",
    sky: "text-sky-200 border-sky-300/[0.10]",
    violet: "text-violet-200 border-violet-300/[0.10]",
  }[tone]
  return (
    <section className={`rounded-[26px] border bg-black/40 p-4 shadow-[0_22px_60px_-42px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5 ${toneClass}`}>
      <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">{icon}</div><h2 className="text-lg font-black sm:text-xl">{title}</h2></div>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  )
}

function QuickFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3"><div className="flex items-center gap-1.5 text-white/28">{icon}<span className="text-[9px] font-black uppercase tracking-[0.13em]">{label}</span></div><div className="mt-1.5 truncate text-sm font-black text-white/82">{value}</div></div>
}
function Info({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3"><span className="text-xs font-bold leading-5 text-white/38">{label}</span><span className={`max-w-[62%] text-right text-sm leading-5 ${strong ? "font-black text-white" : "font-bold text-white/72"}`}>{value}</span></div>
}
function ScoreBox({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-3.5 ${accent ? "border-orange-300/12 bg-orange-500/[0.05]" : "border-white/[0.07] bg-white/[0.025]"}`}><div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">{label}</div><div className={`mt-1 text-lg font-black ${accent ? "text-orange-100" : "text-white/85"}`}>{value}</div></div>
}
function RewardRow({ label, value, cash = false }: { label: string; value: string; cash?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 rounded-2xl border px-3.5 py-3 ${cash ? "border-emerald-300/12 bg-emerald-500/[0.05]" : "border-white/[0.07] bg-white/[0.025]"}`}><span className="text-sm font-bold text-white/58">{label}</span><strong className={cash ? "text-emerald-100" : "text-white/85"}>{value}</strong></div>
}
function EmptyText({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm font-semibold text-white/30">{children}</div>
}
function Notice({ icon, text, positive = false }: { icon: ReactNode; text: string; positive?: boolean }) {
  return <div className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-semibold leading-6 ${positive ? "border-emerald-300/10 bg-emerald-500/[0.045] text-emerald-50/70" : "border-amber-300/10 bg-amber-500/[0.045] text-amber-50/70"}`}><span className="mt-1 shrink-0">{icon}</span><span>{text}</span></div>
}

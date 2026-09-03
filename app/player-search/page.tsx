import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { AlertCircle, ArrowRight, CalendarDays, ShieldCheck, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecruitmentNeed {
  id: string
  team_name: string
  league: string
  start_date: string
  description: string | null
  created_at: string
}

export default async function PlayerSearchPage() {
  const supabase = createServerClient()

  const { data: recruitmentData, error: recruitmentError } = await supabase
    .from("player_recruitment_needs")
    .select("*")
    .order("created_at", { ascending: false })

  if (recruitmentError) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20 md:pb-0">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Positionen</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const recruitmentNeeds: RecruitmentNeed[] = recruitmentData || []

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] pb-24 text-slate-950 font-sans md:pb-0">
      <Header />

      <main className="w-full max-w-none px-2 pb-24 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
                    <Users className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/50">Emoj!´s Dartverein</p>
                    <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Offene Positionen</h1>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                  Hier siehst du, für welche Teams aktuell Spieler gesucht werden.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white">
                <Users className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Aktuell</div>
                  <div className="text-lg font-black">{recruitmentNeeds.length} offene Position{recruitmentNeeds.length === 1 ? "" : "en"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-5">
          <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:rounded-[28px]">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Teams auf Spielersuche</h2>
              <p className="mt-1 text-sm text-slate-500">Alle aktuell gemeldeten offenen Positionen.</p>
            </div>

            <div className="p-3 sm:p-5">
              {recruitmentNeeds.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-3 font-black text-slate-950">Aktuell keine offenen Positionen</h3>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {recruitmentNeeds.map((need) => (
                    <article key={need.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_34px_-30px_rgba(15,23,42,0.4)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-950">{need.team_name}</h3>
                          <p className="mt-1 text-sm font-semibold text-orange-600">{need.league}</p>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
                          <Users className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span>ab {new Date(need.start_date).toLocaleDateString("de-AT")}</span>
                      </div>

                      {need.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{need.description}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] sm:p-5 xl:sticky xl:top-20">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
              <UserPlus className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">Interesse am Verein?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Erstelle zuerst einen Gastzugang. Danach kannst du im Gastbereich eine Beitrittsanfrage an den Verein stellen.
            </p>
            <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <p className="text-xs font-medium leading-5 text-slate-600">Eine direkte Bewerbung über diese Seite ist nicht erforderlich.</p>
              </div>
            </div>
            <Button asChild className="mt-4 h-11 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-600">
              <Link href="/gastzugang">
                Gastzugang erstellen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </aside>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
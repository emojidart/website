"use client"

import { ArrowRight, Bell, Calendar, Loader2, Swords } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { HomeLeagueMatch } from "@/app/_startseite/typen"

type DeineNaechstenLigaspieleProps = {
  authUserId: string | null
  hasLeaguePackage: boolean
  matches: HomeLeagueMatch[]
  loading: boolean
  saving: string
  onSetAvailability: (
    match: HomeLeagueMatch,
    status: "yes" | "maybe" | "no",
  ) => Promise<void>
}

function getTeamName(match: HomeLeagueMatch, isHome: boolean) {
  if (isHome) {
    return (
      match.home_team?.name ||
      match.home_opponent_team?.name ||
      "Unbekanntes Team"
    )
  }

  return (
    match.away_team?.name ||
    match.away_opponent_team?.name ||
    "Unbekanntes Team"
  )
}

export function DeineNaechstenLigaspiele({
  authUserId,
  hasLeaguePackage,
  matches,
  loading,
  saving,
  onSetAvailability,
}: DeineNaechstenLigaspieleProps) {
  if (!authUserId || !hasLeaguePackage) return null

  return (
    <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pt-5 sm:px-5 sm:pt-6 lg:px-8 xl:px-10">
      <div className="space-y-4">
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Swords className="h-5 w-5 text-orange-600" />
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                  Liga
                </div>

                <h2 className="text-lg font-black leading-tight text-gray-950 sm:text-xl">
                  Deine nächsten Spiele
                </h2>
              </div>
            </div>

            <Button
              variant="ghost"
              className="h-9 rounded-xl px-3 font-bold text-gray-600 hover:bg-white hover:text-orange-700"
              onClick={() => (window.location.href = "/member-availability")}
            >
              Alle
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deine Ligaspiele werden geladen...
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-3xl border border-gray-200/80 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>

              <p className="mt-3 font-bold text-gray-800">
                Aktuell kein Ligaspiel geplant
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Sobald ein neues Spiel angesetzt ist, erscheint es hier.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((match) => {
                const dartType = String(match.dart_type || "").toLowerCase()
                const isSteel = dartType === "steeldart"

                return (
                  <div
                    key={match.id}
                    className="group overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_18px_55px_-45px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_65px_-45px_rgba(15,23,42,0.62)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={
                          isSteel
                            ? "rounded-full border-slate-200 bg-slate-900 px-3 py-1 text-[11px] font-black tracking-wide text-white"
                            : "rounded-full border-orange-200 bg-orange-600 px-3 py-1 text-[11px] font-black tracking-wide text-white"
                        }
                      >
                        {isSteel ? "STEELDART" : "E-DART"}
                      </Badge>

                      <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                        <Calendar className="h-3.5 w-3.5 text-orange-600" />
                        {new Date(match.match_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {match.match_time
                          ? ` · ${String(match.match_time).slice(0, 5)}`
                          : ""}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-xl font-black leading-tight tracking-tight text-gray-950">
                        {getTeamName(match, true)}{" "}
                        <span className="font-semibold text-gray-400">vs</span>{" "}
                        {getTeamName(match, false)}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Deine Antwort
                        </div>

                        <div className="mt-1">
                          {match.my_status === "yes" ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Zugesagt ✓
                            </Badge>
                          ) : match.my_status === "maybe" ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                            >
                              Vielleicht
                            </Badge>
                          ) : match.my_status === "no" ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-rose-200 bg-rose-50 text-rose-700"
                            >
                              Abgesagt
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-full border-amber-300 bg-amber-50 text-amber-800"
                            >
                              Noch keine Antwort
                            </Badge>
                          )}
                        </div>
                      </div>

                      {match.my_status === "none" ? (
                        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-bold text-amber-900">
                          <Bell className="h-4 w-4 shrink-0" />
                          Bitte noch zu- oder absagen – wichtig für die Aufstellung.
                        </div>
                      ) : null}

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!!saving}
                          onClick={() => void onSetAvailability(match, "yes")}
                          className="rounded-xl border border-emerald-200 bg-white px-2 font-black text-slate-800 shadow-none hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          {saving === `${match.id}-yes` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Zusage"
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={!!saving}
                          onClick={() => void onSetAvailability(match, "maybe")}
                          className="rounded-xl border border-amber-200 bg-white px-2 font-black text-slate-800 shadow-none hover:bg-amber-50 hover:text-amber-800"
                        >
                          {saving === `${match.id}-maybe` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Vielleicht"
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={!!saving}
                          onClick={() => void onSetAvailability(match, "no")}
                          className="rounded-xl border border-rose-200 bg-white px-2 font-black text-slate-800 shadow-none hover:bg-rose-50 hover:text-rose-800"
                        >
                          {saving === `${match.id}-no` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Absage"
                          )}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full rounded-xl border-slate-200 bg-slate-950 font-black text-white hover:bg-slate-800 hover:text-white"
                        onClick={() =>
                          (window.location.href = `/member-availability?match_id=${match.id}&team_id=${match.my_team_id}`)
                        }
                      >
                        Details & Aufstellung
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

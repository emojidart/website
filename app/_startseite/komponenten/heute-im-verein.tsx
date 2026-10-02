"use client"

import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CombinedEvent } from "@/app/_startseite/typen"
import { ensureUhr, getEventTypeLabel } from "@/app/_startseite/utils"

function getDetailsHref(event: CombinedEvent) {
  if (event.type === "tournament") {
    const publicTournamentId =
      event.dachEventId || (event.sourceKind === "dach" ? event.id : null)

    if (publicTournamentId) {
      return `/turniere/${publicTournamentId}`
    }
  }

  return `/veranstaltungen/${event.internalEventId || event.id}`
}

export function HeuteImVerein({
  events,
}: {
  events: CombinedEvent[]
}) {
  if (events.length === 0) return null

  return (
    <div className="mx-auto mt-3 w-full max-w-[var(--emd-content-max)] px-3 sm:px-5 lg:px-8 xl:px-10">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-orange-500 to-slate-900" />

        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-orange-50">
                <Calendar className="h-6 w-6 text-orange-700" />
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-wider text-orange-700">
                  Heute im Verein
                </div>

                <div className="text-lg font-black text-gray-900 sm:text-xl">
                  {events.length === 1
                    ? events[0].name
                    : `${events.length} Veranstaltungen heute`}
                </div>

                <div className="mt-2 space-y-2">
                  {events.map((event) => (
                    <div
                      key={`${event.type}-${event.id}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
                    >
                      <div className="text-sm font-black text-gray-900">
                        {event.name}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-orange-700" />
                          {ensureUhr(event.time)}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-orange-700" />
                          {event.location}
                        </span>

                        {event.type === "tournament" && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 font-black text-orange-800">
                            Turnier
                          </span>
                        )}

                        {event.type === "event" && event.eventType && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-black text-slate-800">
                            {getEventTypeLabel(event.eventType)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full rounded-xl bg-slate-950 font-black text-white shadow-sm hover:bg-slate-800 sm:w-auto"
              onClick={() => {
                if (events.length === 1) {
                  window.location.href = getDetailsHref(events[0])
                  return
                }

                window.location.href = "/turniere"
              }}
            >
              Details ansehen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

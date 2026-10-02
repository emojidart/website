"use client"

import Link from "next/link"
import { ArrowRight, Calendar, Clock, MapPin, Trophy } from "lucide-react"
import type { InternalSignupEvent } from "@/app/_startseite/typen"
import {
  formatInternalEventDateRange,
  formatInternalEventDrawDateTime,
} from "@/app/_startseite/utils"

export function InterneTurnierAnmeldekarte({
  event,
  imageUrl,
}: {
  event: InternalSignupEvent
  imageUrl: string
}) {
  return (
    <Link
      href={`/internal-events/${event.id}`}
      className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="grid h-full sm:grid-cols-[240px_1fr]">
        <div className="relative overflow-hidden bg-black">
          {imageUrl ? (
            <div className="aspect-video w-full sm:h-full sm:min-h-[170px]">
              <img
                src={imageUrl}
                alt={event.title}
                className="block h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-video min-h-[170px] items-center justify-center bg-gradient-to-br from-slate-950 to-orange-950">
              <Trophy className="h-14 w-14 text-orange-400" />
            </div>
          )}

          <div className="absolute left-3 top-3 z-10 rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Anmeldung offen
          </div>
        </div>

        <div className="relative z-10 flex min-w-0 flex-col justify-between bg-white p-5">
          <div>
            <div className="text-xl font-black leading-tight text-slate-950">
              {event.title}
            </div>

            {event.subtitle ? (
              <div className="mt-1 text-sm font-semibold text-slate-500">
                {event.subtitle}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-orange-600" />
                {formatInternalEventDateRange(
                  event.event_date,
                  event.end_date,
                  event.date_open,
                )}
              </span>

              {event.start_time ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-orange-600" />
                  {event.start_time.slice(0, 5)} Uhr
                </span>
              ) : null}

              {event.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  {event.location}
                </span>
              ) : null}
            </div>

            {event.draw_mode ? (
              <div
                className={`mt-3 rounded-2xl border px-3 py-3 ${
                  event.draw_mode === "onsite"
                    ? "border-amber-200 bg-amber-50"
                    : "border-sky-200 bg-sky-50"
                }`}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        event.draw_mode === "onsite"
                          ? "text-amber-700"
                          : "text-sky-700"
                      }`}
                    >
                      Auslosung
                    </div>

                    <div className="mt-1 text-sm font-black text-slate-950">
                      {event.draw_datetime
                        ? formatInternalEventDrawDateTime(event.draw_datetime)
                        : "Termin folgt"}
                    </div>

                    <div className="mt-0.5 text-xs font-bold text-slate-600">
                      {event.draw_mode === "onsite" ? "Live vor Ort" : "Online"}
                      {event.draw_mode === "onsite" &&
                      event.draw_attendance_required
                        ? " · Anwesenheit erforderlich"
                        : ""}
                    </div>
                  </div>

                  <div className="border-t border-black/10 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                      Turnier
                    </div>

                    <div className="mt-1 text-sm font-black text-slate-950">
                      {formatInternalEventDateRange(
                        event.event_date,
                        event.end_date,
                        event.date_open,
                      )}
                    </div>

                    <div className="mt-0.5 text-xs font-bold text-slate-600">
                      {event.start_time
                        ? `Beginn ${event.start_time.slice(0, 5)} Uhr`
                        : "Spieltermine laut Spielplan"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-700">
              Paket Interne Turniere
            </span>

            <span className="flex items-center gap-1.5 text-sm font-black text-orange-700">
              Zur Anmeldung
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

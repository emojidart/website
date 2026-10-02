"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Gamepad2,
  MapPin,
  PartyPopper,
  Trophy,
  Users,
} from "lucide-react"
import type { CombinedEvent } from "@/app/_startseite/typen"
import {
  formatGermanDateRange,
  getEventTypeLabel,
} from "@/app/_startseite/utils"

function getEventTypeIcon(eventType: string) {
  const type = eventType.toLowerCase()
  if (type.includes("party")) return PartyPopper
  if (type.includes("spiel")) return Gamepad2
  if (type.includes("turnier")) return Trophy
  return Users
}

export function StartseitenVeranstaltungskarte({
  item,
}: {
  item: CombinedEvent
}) {
  const EventIcon =
    item.type === "event" && item.eventType
      ? getEventTypeIcon(item.eventType)
      : Trophy

  const badgeText =
    item.type === "tournament"
      ? "TURNIER"
      : getEventTypeLabel(item.eventType || "").toUpperCase()

  const publicTournamentId =
    item.type === "tournament"
      ? item.dachEventId || (item.sourceKind === "dach" ? item.id : null)
      : null

  const detailsHref =
    item.type === "tournament" && publicTournamentId
      ? `/turniere/${publicTournamentId}`
      : `/veranstaltungen/${item.internalEventId || item.id}`

  return (
    <Link
      href={detailsHref}
      className="block min-w-[300px] sm:min-w-0 rounded-[22px] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <div className="relative h-40 bg-gray-100">
        {item.photo_url ? (
          <Image
            src={item.photo_url || "/placeholder.svg"}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
            <EventIcon className="h-12 w-12 text-orange-600" />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-black text-gray-900 border border-gray-200">
            {badgeText}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[11px] text-gray-500 font-bold mb-1">
          {formatGermanDateRange(item.start_date, item.end_date, item.date)}
          {item.time ? ` • ${item.time.slice(0, 5)} Uhr` : ""}
        </p>

        <h3 className="font-black text-gray-900 mb-1 line-clamp-2">
          {item.name}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-2">
          {item.type === "tournament" ? (
            <>
              {item.details && <span>{item.details} • </span>}
              {item.startgeld_details && (
                <span>Startgeld: {item.startgeld_details} • </span>
              )}
              {typeof item.entry_fee === "number" && item.entry_fee > 0 && (
                <span>Eintritt: €{item.entry_fee.toFixed(2)} • </span>
              )}
              {item.mode === "edart"
                ? "E-Dart"
                : item.mode === "steeldart"
                  ? "Steel Dart"
                  : item.mode === "both"
                    ? "Beide Modi"
                    : ""}
            </>
          ) : (
            item.details ||
            `${getEventTypeLabel(item.eventType || "")} • ${item.location}`
          )}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs text-gray-500 inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-600" />
            <span className="truncate">
              {item.location || "Wird bekannt gegeben"}
            </span>
          </span>

          <span className="shrink-0 inline-flex items-center gap-1 text-orange-700 text-xs font-black">
            Details
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

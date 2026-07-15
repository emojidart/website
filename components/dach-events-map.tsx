"use client"

import { useEffect } from "react"
import Link from "next/link"
import L from "leaflet"
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"

type MapEvent = {
  id: string
  name: string
  event_date: string
  start_date: string | null
  end_date: string | null
  event_time: string | null
  location: string | null
  postal_code: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

function formatDate(startDate: string | null, endDate: string | null, fallback: string) {
  const start = startDate || fallback
  const end = endDate || fallback
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }

  const first = new Date(`${start}T12:00:00`).toLocaleDateString("de-DE", options)
  const last = new Date(`${end}T12:00:00`).toLocaleDateString("de-DE", options)

  return start === end ? first : `${first} – ${last}`
}

const redFlagIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:34px;height:42px;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35));">
      <div style="position:absolute;left:8px;top:4px;width:3px;height:34px;background:#262626;border-radius:999px;"></div>
      <div style="position:absolute;left:10px;top:5px;width:22px;height:15px;background:#dc2626;clip-path:polygon(0 0,100% 0,76% 50%,100% 100%,0 100%);border-radius:2px;"></div>
      <div style="position:absolute;left:5px;bottom:1px;width:10px;height:4px;background:rgba(0,0,0,.28);border-radius:50%;"></div>
    </div>
  `,
  iconSize: [34, 42],
  iconAnchor: [10, 40],
  popupAnchor: [6, -35],
})

function FitMarkers({ events }: { events: MapEvent[] }) {
  const map = useMap()

  useEffect(() => {
    const points = events
      .filter(
        (event) =>
          typeof event.latitude === "number" &&
          typeof event.longitude === "number",
      )
      .map(
        (event) =>
          [event.latitude as number, event.longitude as number] as [
            number,
            number,
          ],
      )

    if (points.length === 0) return

    if (points.length === 1) {
      map.setView(points[0], 11)
      return
    }

    map.fitBounds(points, {
      padding: [35, 35],
      maxZoom: 11,
    })
  }, [events, map])

  return null
}

export function DachEventsMap({ events }: { events: MapEvent[] }) {
  const visibleEvents = events.filter(
    (event) =>
      typeof event.latitude === "number" &&
      typeof event.longitude === "number",
  )

  if (visibleEvents.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-gray-200 bg-white p-8 text-center">
        <div>
          <p className="font-black text-gray-900">
            Noch keine Standorte auf der Karte
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Für die vorhandenen Veranstaltungen sind noch keine Koordinaten
            gespeichert.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-gray-200 bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <strong>{visibleEvents.length} Standorte auf der Karte</strong>
        <span className="text-xs text-slate-300">
          Klicke eine rote Fahne an, um die Veranstaltung zu öffnen.
        </span>
      </div>

      <MapContainer
        center={[47.5, 13.5]}
        zoom={6}
        scrollWheelZoom
        className="h-[520px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMarkers events={visibleEvents} />

        {visibleEvents.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude as number, event.longitude as number]}
            icon={redFlagIcon}
          >
            <Popup minWidth={235}>
              <div className="space-y-2">
                <p className="m-0 text-base font-black">{event.name}</p>

                <p className="m-0 text-sm">
                  <strong>Datum:</strong>{" "}
                  {formatDate(
                    event.start_date,
                    event.end_date,
                    event.event_date,
                  )}
                </p>

                <p className="m-0 text-sm">
                  <strong>Uhrzeit:</strong>{" "}
                  {(event.event_time || "19:00").slice(0, 5)} Uhr
                </p>

                <p className="m-0 text-sm">
                  <strong>Ort:</strong>{" "}
                  {[event.postal_code, event.city]
                    .filter(Boolean)
                    .join(" ") ||
                    event.location ||
                    "Ort folgt"}
                </p>

                <Link
                  href={`/dach-veranstaltungen/${event.id}`}
                  className="mt-3 inline-flex rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white no-underline hover:bg-red-700"
                >
                  Details ansehen
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

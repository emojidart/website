import { NextResponse } from "next/server"

type NominatimResult = {
  lat?: string
  lon?: string
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria",
  DE: "Germany",
  CH: "Switzerland",
}

function parseCoordinates(results: NominatimResult[]) {
  const first = results[0]

  const latitude = first?.lat ? Number(first.lat) : null
  const longitude = first?.lon ? Number(first.lon) : null

  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  }
}

async function searchNominatim(params: URLSearchParams) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent":
          "EMD-VereinsApp/1.0 (kontakt@emojisdartverein.com)",
        "Accept": "application/json",
        "Accept-Language": "de",
      },
      cache: "no-store",
    },
  )

  if (!response.ok) {
    const responseText = await response.text().catch(() => "")
    throw new Error(
      `Geocoding fehlgeschlagen (${response.status}): ${responseText}`,
    )
  }

  return (await response.json()) as NominatimResult[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      street?: string
      postalCode?: string
      city?: string
      countryCode?: string
    }

    const street = String(body.street || "").trim()
    const postalCode = String(body.postalCode || "").trim()
    const city = String(body.city || "").trim()
    const countryCode = String(body.countryCode || "")
      .trim()
      .toUpperCase()

    if (!city || !countryCode) {
      return NextResponse.json(
        { error: "Ort und Land fehlen." },
        { status: 400 },
      )
    }

    const country = COUNTRY_NAMES[countryCode] || countryCode

    // 1. Genaue strukturierte Suche
    const exactParams = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      addressdetails: "0",
      countrycodes: countryCode.toLowerCase(),
      city,
      country,
    })

    if (street) exactParams.set("street", street)
    if (postalCode) exactParams.set("postalcode", postalCode)

    let results = await searchNominatim(exactParams)
    let coordinates = parseCoordinates(results)

    // 2. Fallback ohne Straße
    if (coordinates.latitude === null || coordinates.longitude === null) {
      const cityParams = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        addressdetails: "0",
        countrycodes: countryCode.toLowerCase(),
        postalcode: postalCode,
        city,
        country,
      })

      results = await searchNominatim(cityParams)
      coordinates = parseCoordinates(results)
    }

    // 3. Letzter Fallback als freie Suche
    if (coordinates.latitude === null || coordinates.longitude === null) {
      const fallbackParams = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        addressdetails: "0",
        countrycodes: countryCode.toLowerCase(),
        q: [postalCode, city, country].filter(Boolean).join(", "),
      })

      results = await searchNominatim(fallbackParams)
      coordinates = parseCoordinates(results)
    }

    if (coordinates.latitude === null || coordinates.longitude === null) {
      return NextResponse.json(
        {
          error: "Für diese Adresse wurden keine Koordinaten gefunden.",
          latitude: null,
          longitude: null,
        },
        { status: 404 },
      )
    }

    return NextResponse.json(coordinates)
  } catch (error: any) {
    console.error("[dach-events-geocode]", error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Koordinaten konnten nicht ermittelt werden.",
        latitude: null,
        longitude: null,
      },
      { status: 500 },
    )
  }
}

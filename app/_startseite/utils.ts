export function toISODate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function toHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function getEventTypeLabel(eventType: string) {
  const type = String(eventType || "").toLowerCase()

  if (type.includes("party")) return "Party"
  if (type.includes("spiel")) return "Spielabend"
  if (type.includes("turnier") || type === "tournament") return "Turnier"
  if (type.includes("versammlung")) return "Versammlung"
  if (type === "other") return "Veranstaltung"
  if (type === "announcement") return "Ankündigung"
  if (type === "console" || type === "gaming") return "Konsole"

  return "Veranstaltung"
}

export function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function formatGermanShortDateFromISO(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((x) => Number.parseInt(x, 10))
  const months = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."]
  const mm = Number.isFinite(m) ? m - 1 : 0
  return `${pad2(d)}. ${months[mm] || "Jan."} ${y}`
}

export function formatGermanDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  fallbackIso: string,
) {
  const start = startIso || fallbackIso
  const end = endIso || fallbackIso

  const startText = new Date(start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  if (start === end) return startText

  const endText = new Date(end).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return `${startText} – ${endText}`
}

export function ensureUhr(time: string) {
  const raw = String(time || "19:00").replace("Uhr", "").trim()
  const t = raw.length >= 5 ? raw.slice(0, 5) : raw
  return t.includes(":") ? `${t} Uhr` : `${t}:00 Uhr`
}

export function parseTimeToHHMM(time: string) {
  return time.replace("Uhr", "").trim()
}

export function getStartDateTimeFromISO(isoDate: string, time: string): Date {
  const t = parseTimeToHHMM(time)
  return new Date(`${isoDate}T${t}:00`)
}

export function formatHoursMinutesSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return `${hours} Std ${pad2(minutes)} Min ${pad2(seconds)} Sek`
}

export function formatInternalEventDrawDate(value: string | null | undefined) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatInternalEventDrawDateTime(value: string | null | undefined) {
  if (!value) return ""
  return new Date(value).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatInternalEventDateRange(
  start: string | null,
  end: string | null,
  dateOpen = false,
) {
  if (dateOpen || !start) return "Termin offen"
  const effectiveEnd = end || start
  const fmt = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

  return start === effectiveEnd ? fmt(start) : `${fmt(start)} – ${fmt(effectiveEnd)}`
}

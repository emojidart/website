/** Gemeinsame, deterministische Anzeigeplanung fuer Beamer und EMD TV.
 * Alle Clients benutzen absolute Zeitstempel; nie zwei Overlays zugleich.
 * Wiederholungen werden bei Ueberlast nicht aufgestaut.
 */
export type ScheduledAnnouncement = {
  id: string
  created_at: string
  ends_at: string
  display_mode?: "repeat" | "once" | "permanent"
  display_seconds?: number
  repeat_seconds?: number
}

/** Berechnet zu einem Zeitpunkt die sichtbare Nachricht, ohne Clientzustand.
 * 5-Sekunden-Raster: jedes Intervall hat genau einen Besitzer. Wiederholungsintervalle
 * werden als Mindestabstand interpretiert; bei mehreren Meldungen kann es spaeter werden.
 */
export function selectLiveAnnouncement<T extends ScheduledAnnouncement>(items: T[], now: number): T | null {
  const live = items.filter(a => {
    const start = Date.parse(a.created_at)
    return Number.isFinite(start) && start <= now && Date.parse(a.ends_at) > now
  }).sort((a,b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id))
  if (!live.length) return null
  const earliest = Math.min(...live.map(x => Date.parse(x.created_at)))
  let cursor = Math.floor(earliest / 1000) * 1000
  // Max. 4 Stunden nachvollziehen: keine Endlosschleifen bei alten Daten.
  cursor = Math.max(cursor, now - 4 * 3600 * 1000)
  const lastPlayed = new Map<string, number>()
  const oneShotPlayed = new Set<string>()
  let selected: T | null = null
  let selectedUntil = 0
  let guard = 0
  while (cursor <= now && guard++ < 5000) {
    const candidates = live.filter(item => {
      const created = Date.parse(item.created_at)
      if (created > cursor || Date.parse(item.ends_at) <= cursor) return false
      if (item.display_mode === 'once') return !oneShotPlayed.has(item.id) && cursor - created < 120000
      if (item.display_mode === 'permanent') return true
      return cursor - (lastPlayed.get(item.id) ?? (created - Math.max(30, item.repeat_seconds ?? 60)*1000)) >= Math.max(30, item.repeat_seconds ?? 60)*1000
    })
    // Meldung mit laengster Wartezeit zuerst; verhindert Verhungern.
    candidates.sort((a,b) => {
      const aLast = lastPlayed.get(a.id) ?? Date.parse(a.created_at) - Math.max(30, a.repeat_seconds ?? 60)*1000
      const bLast = lastPlayed.get(b.id) ?? Date.parse(b.created_at) - Math.max(30, b.repeat_seconds ?? 60)*1000
      return aLast - bLast || Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id)
    })
    const item = candidates[0]
    if (!item) { cursor += 1000; continue }
    const duration = item.display_mode === 'permanent' ? 12 : Math.max(5, Math.min(30, item.display_seconds ?? 12))
    selected = item
    selectedUntil = cursor + duration * 1000
    lastPlayed.set(item.id, cursor)
    if (item.display_mode === 'once') oneShotPlayed.add(item.id)
    cursor = selectedUntil
  }
  return selected && now < selectedUntil ? selected : null
}

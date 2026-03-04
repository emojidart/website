"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { ClubPlayer, DuesCadence, DuesLedgerEntry, DuesSetting } from "@/components/vereinsverwaltung/types"

type MessageType = "success" | "error" | "info"

function toUTCDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`)
}

function toISODate(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function todayISO() {
  const now = new Date()
  return toISODate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
}

function addMonths(dateStr: string, months: number) {
  const d = toUTCDate(dateStr)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()

  const next = new Date(Date.UTC(y, m + months, 1))
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  const clamped = Math.min(day, lastDay)
  next.setUTCDate(clamped)
  return toISODate(next)
}

function cadenceMonths(cadence: DuesCadence) {
  switch (cadence) {
    case "monthly":
      return 1
    case "quarterly":
      return 3
    case "semiannual":
      return 6
    case "annual":
      return 12
  }
}

/**
 * ✅ "Überfällig" erst ab dem 26. (wenn bis inkl. 25. nicht bezahlt markiert wurde)
 * graceDate-Regel:
 * - Standard: 25. des Monats von due_on
 * - Aber: graceDate darf NIE vor due_on liegen (Sicherheit, falls due_on > 25)
 */
function graceDateISO(dueOnISO: string) {
  const d = toUTCDate(dueOnISO)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const grace = toISODate(new Date(Date.UTC(y, m, 25)))
  return grace < dueOnISO ? dueOnISO : grace
}

export type PeriodStatusTone = "paid" | "due" | "overdue" | "upcoming"

export type DuesPeriod = {
  due_on: string
  amount: number
  currency: string
  paid_on: string | null
  status_label: "Bezahlt" | "Fällig" | "Überfällig" | "Noch nicht fällig"
  status_tone: PeriodStatusTone
}

export type PlayerDuesSummaryTone = "ok" | "due" | "overdue" | "inactive" | "no_plan"

export type PlayerDuesSummaryRow = {
  player_id: string
  player_name: string

  cadence: DuesCadence | null
  amount: number | null
  currency: string | null
  start_on: string | null
  is_active: boolean
  has_plan: boolean

  // membership window
  joined_at: string | null
  left_at: string | null

  // summary
  next_unpaid_due_on: string | null
  summary_label: string
  summary_tone: PlayerDuesSummaryTone
}

export type PlayerDuesDetail = {
  player_id: string
  currency: string
  overdueCount: number
  dueCount: number
  unpaidCount: number
  overdueAmount: number
  dueAmount: number
  totalUnpaidAmount: number
  nextUnpaidDueOn: string | null
}

function inRange(date: string, start: string, endInclusive: string) {
  return date >= start && date <= endInclusive
}

function buildScheduleDates(startOn: string, cadence: DuesCadence, rangeStart: string, rangeEndInclusive: string) {
  const months = cadenceMonths(cadence)
  const dates: string[] = []

  let cur = startOn
  while (cur < rangeStart) {
    const nxt = addMonths(cur, months)
    if (nxt === cur) break
    cur = nxt
  }

  while (cur <= rangeEndInclusive) {
    if (inRange(cur, rangeStart, rangeEndInclusive)) dates.push(cur)
    const nxt = addMonths(cur, months)
    if (nxt === cur) break
    cur = nxt
  }

  return dates
}

export function useDues(user: User | null, clubPlayers: ClubPlayer[], onDataSaved: () => void) {
  const [settings, setSettings] = useState<DuesSetting[]>([])
  const [ledger, setLedger] = useState<DuesLedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<MessageType>("info")

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("club_dues_settings").select("*")
    if (error) throw error
    setSettings((data || []) as any)
  }

  const fetchLedger = async () => {
    const { data, error } = await supabase.from("club_dues_ledger").select("*")
    if (error) throw error
    setLedger((data || []) as any)
  }

  const refetchAll = async () => {
    try {
      setMessage("")
      await fetchSettings()
      await fetchLedger()
    } catch (e: any) {
      console.error(e)
      setMessage("Fehler beim Laden der Beitragsdaten.")
      setMessageType("error")
    }
  }

  useEffect(() => {
    refetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settingByPlayer = useMemo(() => {
    const m = new Map<string, DuesSetting>()
    for (const s of settings) m.set(s.player_id, s)
    return m
  }, [settings])

  const ledgerByPlayerDue = useMemo(() => {
    const m = new Map<string, Map<string, DuesLedgerEntry>>()
    for (const e of ledger) {
      if (!m.has(e.player_id)) m.set(e.player_id, new Map())
      m.get(e.player_id)!.set(e.due_on, e)
    }
    return m
  }, [ledger])

  const periodsByPlayer = useMemo(() => {
    const today = todayISO()
    const endRange = addMonths(today, 12)
    const out = new Map<string, DuesPeriod[]>()

    for (const p of clubPlayers) {
      const s = settingByPlayer.get(p.id) || null
      if (!s || !s.is_active) {
        out.set(p.id, [])
        continue
      }

      const startA = s.start_on
      const startB = p.club_joined_at || startA
      const rangeStart = startA > startB ? startA : startB

      const rangeEndInclusive = p.club_left_at ? (p.club_left_at < endRange ? p.club_left_at : endRange) : endRange

      if (rangeEndInclusive < rangeStart) {
        out.set(p.id, [])
        continue
      }

      const dates = buildScheduleDates(rangeStart, s.cadence, rangeStart, rangeEndInclusive)

      const per: DuesPeriod[] = dates.map((due_on) => {
        const entry = ledgerByPlayerDue.get(p.id)?.get(due_on) || null
        const paid_on = entry?.paid_on ?? null

        if (paid_on) {
          return {
            due_on,
            amount: Number(s.amount),
            currency: s.currency || "EUR",
            paid_on,
            status_label: "Bezahlt",
            status_tone: "paid",
          }
        }

        if (due_on > today) {
          return {
            due_on,
            amount: Number(s.amount),
            currency: s.currency || "EUR",
            paid_on: null,
            status_label: "Noch nicht fällig",
            status_tone: "upcoming",
          }
        }

        const grace = graceDateISO(due_on)

        if (today > grace) {
          return {
            due_on,
            amount: Number(s.amount),
            currency: s.currency || "EUR",
            paid_on: null,
            status_label: "Überfällig",
            status_tone: "overdue",
          }
        }

        return {
          due_on,
          amount: Number(s.amount),
          currency: s.currency || "EUR",
          paid_on: null,
          status_label: "Fällig",
          status_tone: "due",
        }
      })

      per.sort((a, b) => b.due_on.localeCompare(a.due_on))
      out.set(p.id, per)
    }

    return out
  }, [clubPlayers, settingByPlayer, ledgerByPlayerDue])

  // ✅ Detail-Counts + Summen pro Spieler
  const detailByPlayer = useMemo(() => {
    const out = new Map<string, PlayerDuesDetail>()

    for (const p of clubPlayers) {
      const s = settingByPlayer.get(p.id) || null
      const periods = periodsByPlayer.get(p.id) || []

      const currency = s?.currency || "EUR"

      let overdueCount = 0
      let dueCount = 0
      let overdueAmount = 0
      let dueAmount = 0
      let nextUnpaidDueOn: string | null = null

      for (const per of periods) {
        if (per.status_tone === "overdue") {
          overdueCount += 1
          overdueAmount += Number(per.amount || 0)
          if (!nextUnpaidDueOn || per.due_on < nextUnpaidDueOn) nextUnpaidDueOn = per.due_on
        } else if (per.status_tone === "due") {
          dueCount += 1
          dueAmount += Number(per.amount || 0)
          if (!nextUnpaidDueOn || per.due_on < nextUnpaidDueOn) nextUnpaidDueOn = per.due_on
        }
      }

      const unpaidCount = overdueCount + dueCount
      const totalUnpaidAmount = overdueAmount + dueAmount

      out.set(p.id, {
        player_id: p.id,
        currency,
        overdueCount,
        dueCount,
        unpaidCount,
        overdueAmount,
        dueAmount,
        totalUnpaidAmount,
        nextUnpaidDueOn,
      })
    }

    return out
  }, [clubPlayers, settingByPlayer, periodsByPlayer])

  const summaryRows: PlayerDuesSummaryRow[] = useMemo(() => {
    const out: PlayerDuesSummaryRow[] = []

    for (const p of clubPlayers) {
      const s = settingByPlayer.get(p.id) || null
      if (!s) {
        out.push({
          player_id: p.id,
          player_name: p.name,
          cadence: null,
          amount: null,
          currency: null,
          start_on: null,
          is_active: false,
          has_plan: false,
          joined_at: p.club_joined_at ?? null,
          left_at: p.club_left_at ?? null,
          next_unpaid_due_on: null,
          summary_label: "Kein Beitrag",
          summary_tone: "no_plan",
        })
        continue
      }

      if (!s.is_active) {
        out.push({
          player_id: p.id,
          player_name: p.name,
          cadence: s.cadence,
          amount: Number(s.amount),
          currency: s.currency,
          start_on: s.start_on,
          is_active: false,
          has_plan: true,
          joined_at: p.club_joined_at ?? null,
          left_at: p.club_left_at ?? null,
          next_unpaid_due_on: null,
          summary_label: "Inaktiv",
          summary_tone: "inactive",
        })
        continue
      }

      const periods = periodsByPlayer.get(p.id) || []
      const unpaid = periods.find((x) => x.status_tone === "overdue" || x.status_tone === "due") || null

      if (!unpaid) {
        out.push({
          player_id: p.id,
          player_name: p.name,
          cadence: s.cadence,
          amount: Number(s.amount),
          currency: s.currency,
          start_on: s.start_on,
          is_active: true,
          has_plan: true,
          joined_at: p.club_joined_at ?? null,
          left_at: p.club_left_at ?? null,
          next_unpaid_due_on: null,
          summary_label: "Alles bezahlt",
          summary_tone: "ok",
        })
        continue
      }

      out.push({
        player_id: p.id,
        player_name: p.name,
        cadence: s.cadence,
        amount: Number(s.amount),
        currency: s.currency,
        start_on: s.start_on,
        is_active: true,
        has_plan: true,
        joined_at: p.club_joined_at ?? null,
        left_at: p.club_left_at ?? null,
        next_unpaid_due_on: unpaid.due_on,
        summary_label: unpaid.status_tone === "overdue" ? "Überfällig" : "Fällig",
        summary_tone: unpaid.status_tone === "overdue" ? "overdue" : "due",
      })
    }

    const rank = (r: PlayerDuesSummaryRow) => {
      switch (r.summary_tone) {
        case "overdue":
          return 0
        case "due":
          return 1
        case "ok":
          return 2
        case "no_plan":
          return 3
        case "inactive":
          return 4
      }
    }
    out.sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      return a.player_name.localeCompare(b.player_name)
    })

    return out
  }, [clubPlayers, settingByPlayer, periodsByPlayer])

  const upsertSetting = async (playerId: string, cadence: DuesCadence, amount: number, startOn: string, isActive: boolean) => {
    setLoading(true)
    setMessage("Beitrag wird gespeichert...")
    setMessageType("info")

    if (!user) {
      setMessage("Fehler: Nicht authentifiziert.")
      setMessageType("error")
      setLoading(false)
      return
    }

    try {
      const payload = {
        player_id: playerId,
        cadence,
        amount,
        currency: "EUR",
        start_on: startOn,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("club_dues_settings").upsert(payload, { onConflict: "player_id" })
      if (error) throw error

      setMessage("Beitrag gespeichert!")
      setMessageType("success")
      await refetchAll()
      onDataSaved()
    } catch (e: any) {
      setMessage(`Fehler: ${e.message}`)
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const markPaid = async (playerId: string, dueOn: string, paidOn?: string) => {
    setLoading(true)
    setMessage("Zahlung wird gespeichert...")
    setMessageType("info")

    if (!user) {
      setMessage("Fehler: Nicht authentifiziert.")
      setMessageType("error")
      setLoading(false)
      return
    }

    try {
      const s = settingByPlayer.get(playerId)
      if (!s || !s.is_active) {
        setMessage("Kein aktiver Beitrag für diesen Spieler.")
        setMessageType("error")
        setLoading(false)
        return
      }

      const payDate = paidOn || todayISO()

      const payload = {
        player_id: playerId,
        due_on: dueOn,
        amount: Number(s.amount),
        paid_on: payDate,
        note: null,
      }

      const { error } = await supabase.from("club_dues_ledger").upsert(payload, { onConflict: "player_id,due_on" })
      if (error) throw error

      setMessage("Als bezahlt markiert!")
      setMessageType("success")
      await refetchAll()
      onDataSaved()
    } catch (e: any) {
      setMessage(`Fehler: ${e.message}`)
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // ✅ NEU: Alle offenen Perioden bis inkl. heute als bezahlt markieren
  const markPaidAllOpen = async (playerId: string) => {
    setLoading(true)
    setMessage("Alle offenen Perioden werden als bezahlt markiert...")
    setMessageType("info")

    if (!user) {
      setMessage("Fehler: Nicht authentifiziert.")
      setMessageType("error")
      setLoading(false)
      return
    }

    try {
      const s = settingByPlayer.get(playerId)
      if (!s || !s.is_active) {
        setMessage("Kein aktiver Beitrag für diesen Spieler.")
        setMessageType("error")
        setLoading(false)
        return
      }

      const today = todayISO()
      const periods = periodsByPlayer.get(playerId) || []

      const payload = periods
        .filter((p) => !p.paid_on && p.due_on <= today)
        .map((p) => ({
          player_id: playerId,
          due_on: p.due_on,
          amount: Number(s.amount),
          paid_on: today,
          note: "Bulk: als bezahlt markiert",
        }))

      if (payload.length === 0) {
        setMessage("Keine offenen (bis heute) Perioden gefunden.")
        setMessageType("info")
        setLoading(false)
        return
      }

      const { error } = await supabase.from("club_dues_ledger").upsert(payload, { onConflict: "player_id,due_on" })
      if (error) throw error

      setMessage(`Fertig! ${payload.length} Perioden als bezahlt markiert.`)
      setMessageType("success")
      await refetchAll()
      onDataSaved()
    } catch (e: any) {
      setMessage(`Fehler: ${e.message}`)
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const resetPaid = async (playerId: string, dueOn: string) => {
    setLoading(true)
    setMessage("Zahlung wird zurückgesetzt...")
    setMessageType("info")

    if (!user) {
      setMessage("Fehler: Nicht authentifiziert.")
      setMessageType("error")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from("club_dues_ledger")
        .update({ paid_on: null })
        .eq("player_id", playerId)
        .eq("due_on", dueOn)

      if (error) throw error

      setMessage("Zahlung zurückgesetzt.")
      setMessageType("success")
      await refetchAll()
      onDataSaved()
    } catch (e: any) {
      setMessage(`Fehler: ${e.message}`)
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  return {
    summaryRows,
    periodsByPlayer,
    detailByPlayer,

    loading,
    message,
    messageType,

    upsertSetting,
    markPaid,
    markPaidAllOpen, // ✅ NEU
    resetPaid,
    refetchAll,
  }
}
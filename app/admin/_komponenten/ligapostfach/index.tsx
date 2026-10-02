"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Archive,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  AlertTriangle,
  ClipboardList,
  BellRing,
  MessageSquareReply,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react"

type ThreadRow = {
  id: string
  batch_id: string
  subject: string
  category: string
  priority: string
  status: "open" | "waiting_member" | "waiting_admin" | "closed"
  source_kind: "manual" | "system"
  team_id: string | null
  match_id: string | null
  season_id: string | null
  recipient_player_id: string | null
  dedupe_key?: string | null
  admin_last_read_at?: string | null
  last_message_at: string
  created_at: string
}

type MessageRow = {
  id: string
  thread_id: string
  sender_role: "admin" | "member" | "system"
  sender_player_id: string | null
  body: string
  created_at: string
}

type Player = { id: string; name: string | null; photo_url: string | null }
type Team = { id: string; name: string }

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  waiting_member: "Wartet auf Antwort",
  waiting_admin: "Antwort erhalten",
  closed: "Geschlossen",
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Allgemein",
  lineup: "Aufstellung",
  result: "Ergebnis",
  schedule: "Spieltermin",
  team: "Team",
  info: "Information",
  other: "Sonstiges",
}

function fmt(value?: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminLeagueMailbox({
  onOpenCountChange,
  prefill,
  onPrefillConsumed,
}: {
  onOpenCountChange?: (count: number) => void
  prefill?: {
    recipientMode: "player" | "team" | "captains" | "all"
    recipientTeamId?: string
    recipientPlayerId?: string
    subject: string
    body: string
    category: "general" | "lineup" | "result" | "schedule" | "team" | "info" | "other"
    priority: "info" | "normal" | "important" | "urgent"
    matchId?: string
    seasonId?: string
  } | null
  onPrefillConsumed?: () => void
}) {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"open" | "waiting_admin" | "closed" | "all">("open")

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeCategory, setComposeCategory] = useState("general")
  const [composePriority, setComposePriority] = useState("normal")
  const [recipientMode, setRecipientMode] = useState<"player" | "team" | "captains" | "all">("player")
  const [recipientPlayerId, setRecipientPlayerId] = useState("")
  const [recipientTeamId, setRecipientTeamId] = useState("")
  const [composeMatchId, setComposeMatchId] = useState<string | null>(null)
  const [composeSeasonId, setComposeSeasonId] = useState<string | null>(null)

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || null,
    [threads, selectedId],
  )

  const isNewMemberReply = (thread: ThreadRow) => {
    if (thread.status !== "waiting_admin") return false
    if (!thread.admin_last_read_at) return true
    return new Date(thread.last_message_at).getTime() > new Date(thread.admin_last_read_at).getTime()
  }

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  )

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  )

  const loadBase = async () => {
    setLoading(true)
    setMessage("")
    try {
      const [threadsRes, playersRes, teamsRes] = await Promise.all([
        supabase
          .from("league_mail_threads")
          .select("*")
          .order("last_message_at", { ascending: false }),
        supabase
          .from("club_players")
          .select("id,name,photo_url")
          .eq("is_active", true)
          .is("club_left_at", null)
          .order("name"),
        supabase.from("teams").select("id,name").order("name"),
      ])

      if (threadsRes.error) throw threadsRes.error
      if (playersRes.error) throw playersRes.error
      if (teamsRes.error) throw teamsRes.error

      const nextThreads = (threadsRes.data || []) as ThreadRow[]
      setThreads(nextThreads)
      setPlayers((playersRes.data || []) as Player[])
      setTeams((teamsRes.data || []) as Team[])
      onOpenCountChange?.(nextThreads.filter((row) => isNewMemberReply(row)).length)

      if (selectedId && !nextThreads.some((row) => row.id === selectedId)) {
        setSelectedId(null)
        setMessages([])
      }
    } catch (error: any) {
      console.error("Admin league mailbox load error:", error)
      setMessage(error?.message || "Ligapostfach konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (threadId: string) => {
    setDetailLoading(true)
    try {
      const { data, error } = await supabase
        .from("league_mail_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages((data || []) as MessageRow[])
    } catch (error: any) {
      console.error("League mailbox messages load error:", error)
      setMessage(error?.message || "Nachrichten konnten nicht geladen werden.")
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    void loadBase()

    const channel = supabase
      .channel("admin_league_mailbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "league_mail_threads" }, () => {
        void loadBase()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "league_mail_messages" }, (payload: any) => {
        void loadBase()
        if (selectedId && payload?.new?.thread_id === selectedId) void loadMessages(selectedId)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (!prefill) return

    setRecipientMode(prefill.recipientMode)
    setRecipientTeamId(prefill.recipientTeamId || "")
    setRecipientPlayerId(prefill.recipientPlayerId || "")
    setComposeSubject(prefill.subject)
    setComposeBody(prefill.body)
    setComposeCategory(prefill.category)
    setComposePriority(prefill.priority)
    setComposeMatchId(prefill.matchId || null)
    setComposeSeasonId(prefill.seasonId || null)
    setComposeOpen(true)
    setSelectedId(null)
    setMessage("")
    onPrefillConsumed?.()
  }, [prefill, onPrefillConsumed])

  const openThread = async (threadId: string) => {
    setSelectedId(threadId)
    setReply("")
    setMessage("")

    try {
      const { error } = await supabase.rpc("league_mail_admin_mark_read", {
        p_thread_id: threadId,
      })
      if (error) throw error

      const now = new Date().toISOString()
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? { ...thread, admin_last_read_at: now }
            : thread,
        ),
      )
      onOpenCountChange?.(
        threads.filter((thread) =>
          thread.id === threadId
            ? false
            : isNewMemberReply(thread),
        ).length,
      )
    } catch (error) {
      console.warn("Ligapostfach konnte nicht als gelesen markiert werden:", error)
    }

    await Promise.all([loadMessages(threadId), loadBase()])
  }

  const reloadMailbox = async () => {
    setLoading(true)
    setMessage("")
    try {
      await loadBase()
      if (selectedId) await loadMessages(selectedId)
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setBusy(true)
    setMessage("")
    try {
      const { error } = await supabase.rpc("league_mail_reply", {
        p_thread_id: selected.id,
        p_body: reply.trim(),
      })
      if (error) throw error
      setReply("")
      await Promise.all([loadBase(), loadMessages(selected.id)])
    } catch (error: any) {
      console.error("Admin league reply error:", error)
      setMessage(error?.message || "Antwort konnte nicht gesendet werden.")
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: "open" | "closed") => {
    if (!selected) return
    setBusy(true)
    setMessage("")
    try {
      const { error } = await supabase.rpc("league_mail_admin_set_status", {
        p_thread_id: selected.id,
        p_status: status,
      })
      if (error) throw error
      await loadBase()
    } catch (error: any) {
      console.error("League mailbox status error:", error)
      setMessage(error?.message || "Status konnte nicht geändert werden.")
    } finally {
      setBusy(false)
    }
  }

  const createCases = async () => {
    if (!composeSubject.trim() || !composeBody.trim()) {
      setMessage("Betreff und Nachricht sind erforderlich.")
      return
    }
    if (recipientMode === "player" && !recipientPlayerId) {
      setMessage("Bitte ein Mitglied auswählen.")
      return
    }
    if ((recipientMode === "team" || recipientMode === "captains") && !recipientTeamId) {
      setMessage("Bitte ein Team auswählen.")
      return
    }

    setBusy(true)
    setMessage("")
    try {
      const { data, error } = await supabase.rpc("league_mail_admin_create_cases", {
        p_subject: composeSubject.trim(),
        p_body: composeBody.trim(),
        p_category: composeCategory,
        p_priority: composePriority,
        p_recipient_mode: recipientMode,
        p_recipient_player_id: recipientMode === "player" ? recipientPlayerId : null,
        p_team_id: recipientMode === "team" || recipientMode === "captains" ? recipientTeamId : null,
        p_match_id: composeMatchId,
        p_season_id: composeSeasonId,
        p_source_kind: "manual",
        p_dedupe_key: null,
      })
      if (error) throw error

      setMessage(`${Number(data || 0)} Ligapostfach-Fall/Fälle erstellt.`)
      setComposeSubject("")
      setComposeBody("")
      setRecipientPlayerId("")
      setRecipientTeamId("")
      setComposeMatchId(null)
      setComposeSeasonId(null)
      setComposeOpen(false)
      await loadBase()
    } catch (error: any) {
      console.error("Create league mailbox cases error:", error)
      setMessage(error?.message || "Nachricht konnte nicht erstellt werden.")
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return threads.filter((row) => {
      if (filter === "open" && row.status === "closed") return false
      if (filter === "waiting_admin" && row.status !== "waiting_admin") return false
      if (filter === "closed" && row.status !== "closed") return false

      if (!q) return true
      const playerName = row.recipient_player_id ? playerMap.get(row.recipient_player_id)?.name || "" : ""
      const teamName = row.team_id ? teamMap.get(row.team_id)?.name || "" : ""
      return `${row.subject} ${playerName} ${teamName}`.toLowerCase().includes(q)
    })
  }, [filter, playerMap, query, teamMap, threads])

  const openThreads = threads.filter((row) => row.status !== "closed")
  const waitingAdminCount = openThreads.filter((row) => row.status === "waiting_admin").length
  const newReplyCount = threads.filter((row) => isNewMemberReply(row)).length

  return (
    <div className="emd-admin-content space-y-5">
      <section className="emd-admin-hero">
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/45">
              Mein EMD · Verwaltung
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-[-0.025em] text-white sm:text-[30px]">
              <Inbox className="h-6 w-6 text-orange-300" />
              Ligapostfach
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/38">
              Mitglieder direkt anschreiben, Antworten verfolgen und Liga-Fälle übersichtlich bearbeiten.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="emd-admin-stat min-w-[105px] px-3 py-2 text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Offene Fälle</div>
              <div className="mt-0.5 text-sm font-black text-white">{openThreads.length}</div>
            </div>
            <div className="emd-admin-stat min-w-[105px] px-3 py-2 text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Neue Antworten</div>
              <div className={newReplyCount > 0 ? "mt-0.5 text-sm font-black text-amber-200" : "mt-0.5 text-sm font-black text-white"}>
                {newReplyCount}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="emd-admin-button-secondary"
              onClick={() => void reloadMailbox()}
              disabled={loading || busy}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Neu laden
            </Button>

            <Button
              type="button"
              className="emd-admin-button-primary"
              onClick={() => {
                setComposeOpen(true)
                setRecipientMode("player")
                setRecipientPlayerId("")
                setRecipientTeamId("")
                setComposeMatchId(null)
                setComposeSeasonId(null)
                setComposeCategory("general")
                setComposePriority("normal")
                setComposeSubject("")
                setComposeBody("")
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Mitglied anschreiben
            </Button>
          </div>
        </div>
      </section>

      {composeOpen ? (
        <section className="emd-admin-surface overflow-hidden">
          <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/45">Neue Nachricht</div>
                <h2 className="mt-1 text-xl font-black text-white">Liga-Nachricht schreiben</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                className="emd-admin-button-secondary"
                onClick={() => setComposeOpen(false)}
              >
                Schließen
              </Button>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-5">
            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Empfänger</div>
              <select
                value={recipientMode}
                onChange={(e) => setRecipientMode(e.target.value as any)}
                className="emd-admin-select h-11 w-full px-3 text-sm font-bold"
              >
                <option value="player">Einzelnes Mitglied</option>
                <option value="captains">Kapitän & Co-Kapitän</option>
                <option value="team">Ganzes Team</option>
                <option value="all">Alle Liga-Mitglieder</option>
              </select>
            </div>

            {recipientMode === "player" ? (
              <div>
                <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Mitglied</div>
                <select
                  value={recipientPlayerId}
                  onChange={(e) => setRecipientPlayerId(e.target.value)}
                  className="emd-admin-select h-11 w-full px-3 text-sm font-bold"
                >
                  <option value="">Mitglied auswählen …</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name || "Mitglied"}</option>
                  ))}
                </select>
              </div>
            ) : recipientMode === "team" || recipientMode === "captains" ? (
              <div>
                <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Mannschaft</div>
                <select
                  value={recipientTeamId}
                  onChange={(e) => setRecipientTeamId(e.target.value)}
                  className="emd-admin-select h-11 w-full px-3 text-sm font-bold"
                >
                  <option value="">Mannschaft auswählen …</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="emd-admin-inset flex items-center px-4 py-3 text-sm font-semibold text-white/48">
                Jedes Mitglied erhält einen eigenen privaten Verlauf.
              </div>
            )}

            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Kategorie</div>
              <select
                value={composeCategory}
                onChange={(e) => setComposeCategory(e.target.value)}
                className="emd-admin-select h-11 w-full px-3 text-sm font-bold"
              >
                <option value="general">Allgemein</option>
                <option value="lineup">Aufstellung</option>
                <option value="result">Ergebnis</option>
                <option value="schedule">Spieltermin</option>
                <option value="team">Team</option>
                <option value="info">Information</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Priorität</div>
              <select
                value={composePriority}
                onChange={(e) => setComposePriority(e.target.value)}
                className="emd-admin-select h-11 w-full px-3 text-sm font-bold"
              >
                <option value="info">Info</option>
                <option value="normal">Normal</option>
                <option value="important">Wichtig</option>
                <option value="urgent">Dringend</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Betreff</div>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Betreff"
                className="emd-admin-input h-11"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/30">Nachricht</div>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Nachricht schreiben …"
                className="emd-admin-input min-h-[150px] w-full p-3 text-sm font-medium"
              />
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <Button onClick={() => void createCases()} disabled={busy} className="emd-admin-button-primary min-w-[150px]">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Nachricht senden
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="emd-admin-surface overflow-hidden">
        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/25" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mitglied, Mannschaft oder Betreff suchen …"
                className="emd-admin-input h-11 pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["open", "Offen"],
                ["waiting_admin", "Antworten"],
                ["closed", "Geschlossen"],
                ["all", "Alle"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as any)}
                  className={`emd-admin-tab ${
                    filter === value
                      ? "border-orange-300/25 bg-orange-500/10 text-orange-100"
                      : "border-white/10 bg-white/[0.03] text-white/45"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {message ? (
            <div className="emd-admin-inset mt-4 px-4 py-3 text-sm font-bold text-white/60">
              {message}
            </div>
          ) : null}
        </div>

        <div className="grid min-h-[650px] xl:grid-cols-[minmax(430px,520px)_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.07] xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="text-xs font-black uppercase tracking-wider text-white/25">{filtered.length} Fälle</div>
              <div className="text-[11px] font-bold text-white/25">Neueste zuerst</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-white/35">
                <Loader2 className="h-5 w-5 animate-spin text-orange-300" />
                Laden …
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Inbox className="mx-auto h-9 w-9 text-white/12" />
                <div className="mt-3 font-black text-white/65">Keine Fälle vorhanden</div>
                <div className="mt-1 text-sm font-semibold text-white/28">
                  Über „Mitglied anschreiben“ kannst du einen neuen Verlauf starten.
                </div>
              </div>
            ) : (
              <div className="max-h-[760px] overflow-y-auto">
                {filtered.map((thread) => {
                  const player = thread.recipient_player_id ? playerMap.get(thread.recipient_player_id) : null
                  const team = thread.team_id ? teamMap.get(thread.team_id) : null
                  const active = selectedId === thread.id
                  const hasNewReply = isNewMemberReply(thread)

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className={`relative w-full border-b border-white/[0.055] px-5 py-4 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-orange-500/[0.12] via-orange-500/[0.04] to-transparent"
                          : hasNewReply
                            ? "bg-gradient-to-r from-orange-500/[0.075] via-transparent to-transparent hover:bg-orange-500/[0.06]"
                            : "bg-transparent hover:bg-white/[0.025]"
                      }`}
                    >
                      {hasNewReply ? (
                        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,.45)]" />
                      ) : null}
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          hasNewReply
                            ? "border-orange-300/25 bg-orange-500/12 text-orange-200 shadow-[0_0_18px_rgba(251,146,60,.12)]"
                            : "border-white/[0.08] bg-white/[0.035] text-white/35"
                        }`}>
                          <Mail className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <div className="line-clamp-2 min-w-0 flex-1 text-sm font-black leading-5 text-white/90">
                              {thread.subject}
                            </div>
                            {hasNewReply ? (
                              <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.10em] text-white shadow-[0_0_14px_rgba(249,115,22,.22)]">
                                Neue Antwort
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1.5 text-xs font-bold text-white/42">
                            {player?.name || "Mitglied"}
                            {team?.name ? <span className="text-white/22"> · </span> : null}
                            {team?.name ? team.name : null}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-black text-white/48">
                              {CATEGORY_LABELS[thread.category] || thread.category}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                              thread.status === "closed"
                                ? "bg-white/[0.05] text-white/35"
                                : thread.status === "waiting_admin"
                                  ? "bg-orange-500/10 text-orange-200"
                                  : "bg-sky-500/10 text-sky-200"
                            }`}>
                              {STATUS_LABELS[thread.status]}
                            </span>
                            <span className="ml-auto text-[10px] font-semibold text-white/24">
                              {fmt(thread.last_message_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          <main className="min-w-0">
            {!selected ? (
              <div className="flex min-h-[650px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025]">
                  <Inbox className="h-8 w-8 text-white/16" />
                </div>
                <div className="mt-5 text-xl font-black text-white">Nachricht auswählen</div>
                <div className="mt-1 max-w-sm text-sm font-semibold leading-6 text-white/30">
                  Wähle links einen Verlauf aus. Neue Antworten sind orange markiert.
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-white/[0.07] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/45">
                        {CATEGORY_LABELS[selected.category] || selected.category}
                      </div>
                      <h2 className="mt-1 text-xl font-black leading-7 text-white sm:text-2xl">
                        {selected.subject}
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-black text-white/50">
                          {selected.recipient_player_id
                            ? playerMap.get(selected.recipient_player_id)?.name || "Mitglied"
                            : "Mitglied"}
                        </span>
                        {selected.team_id ? (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-black text-white/50">
                            {teamMap.get(selected.team_id)?.name || "Mannschaft"}
                          </span>
                        ) : null}
                        <span className={selected.status === "closed"
                          ? "rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/40"
                          : selected.status === "waiting_admin"
                            ? "rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-black text-orange-200"
                            : "rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-black text-sky-200"
                        }>
                          {STATUS_LABELS[selected.status]}
                        </span>
                      </div>
                    </div>

                    {selected.status === "closed" ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void setStatus("open")}
                        className="emd-admin-button-secondary"
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Wieder öffnen
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void setStatus("closed")}
                        className="emd-admin-button-secondary"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Fall schließen
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex min-h-[550px] flex-col">
                  <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
                    {detailLoading ? (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-white/35">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-300" />
                        Nachrichten laden …
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-12 text-center text-sm font-bold text-white/30">Noch keine Nachrichten.</div>
                    ) : (
                      messages.map((item) => {
                        const own = item.sender_role === "admin"
                        const system = item.sender_role === "system"

                        return (
                          <div key={item.id} className={`flex ${own || system ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${
                              own
                                ? "border-white/[0.08] bg-white/[0.035] text-white/82"
                                : system
                                  ? "border-white/[0.08] bg-white/[0.035] text-white/70"
                                  : "border-orange-300/[0.16] bg-orange-500/[0.13] text-white"
                            }`}>
                              <div className={`text-[10px] font-black uppercase tracking-wider ${
                                own || system ? "text-white/28" : "text-orange-100/60"
                              }`}>
                                {own ? "Admin" : system ? "Hinweis" : "Mitglied"}
                              </div>
                              <div className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6">{item.body}</div>
                              <div className="mt-2 text-[10px] font-semibold text-white/25">{fmt(item.created_at)}</div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="border-t border-white/[0.07] bg-black/10 p-4 sm:p-5">
                    {selected.status === "closed" ? (
                      <div className="emd-admin-inset px-4 py-3 text-sm font-bold text-white/40">
                        Dieser Fall ist geschlossen.
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Antwort schreiben …"
                          className="emd-admin-input min-h-[96px] flex-1 p-3 text-sm font-medium"
                        />
                        <Button
                          type="button"
                          disabled={busy || !reply.trim()}
                          onClick={() => void sendReply()}
                          className="emd-admin-button-primary self-end px-5"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </section>
    </div>
  )
}

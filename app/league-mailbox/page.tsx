"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type MailFilter = "all" | "unread" | "open" | "closed"

type ParticipantRow = {
  thread_id: string
  last_read_at: string | null
  can_reply: boolean
}

type LeagueThread = {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  source_kind: string
  team_id: string | null
  match_id: string | null
  season_id: string | null
  last_message_at: string
  created_at: string
  team?: { name?: string | null } | null
  match?: {
    match_date?: string | null
    match_time?: string | null
    status?: string | null
    home_team_type?: string | null
    away_team_type?: string | null
    home_team?: { name?: string | null } | null
    away_team?: { name?: string | null } | null
    home_opponent_team?: { name?: string | null } | null
    away_opponent_team?: { name?: string | null } | null
  } | null
}

type LeagueMessage = {
  id: string
  sender_role: "admin" | "member" | "system" | string
  body: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Allgemein",
  lineup: "Aufstellung",
  result: "Ergebnis",
  schedule: "Spieltermin",
  team: "Mannschaft",
  info: "Information",
  other: "Sonstiges",
}

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  waiting_member: "Antwort von dir",
  waiting_admin: "Wartet auf Liga",
  closed: "Geschlossen",
}

function formatDateTime(value?: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMatchDate(value?: string | null) {
  if (!value) return ""
  return new Date(`${value}T00:00:00`).toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function teamName(match: LeagueThread["match"], home: boolean) {
  if (!match) return ""
  if (home) {
    return match.home_team_type === "own"
      ? match.home_team?.name || "Heim"
      : match.home_opponent_team?.name || "Heim"
  }
  return match.away_team_type === "own"
    ? match.away_team?.name || "Auswärts"
    : match.away_opponent_team?.name || "Auswärts"
}

export default function LeagueMailboxPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [threads, setThreads] = useState<LeagueThread[]>([])
  const [messages, setMessages] = useState<LeagueMessage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<MailFilter>("all")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, router, session])

  const readMap = useMemo(
    () => new Map(participants.map((row) => [row.thread_id, row.last_read_at])),
    [participants],
  )
  const canReplyMap = useMemo(
    () => new Map(participants.map((row) => [row.thread_id, row.can_reply])),
    [participants],
  )

  const isUnread = useCallback(
    (thread: LeagueThread) => {
      const lastRead = readMap.get(thread.id)
      if (!lastRead) return true
      return new Date(thread.last_message_at).getTime() > new Date(lastRead).getTime()
    },
    [readMap],
  )

  const loadThreads = useCallback(async () => {
    if (!session?.user?.id) return
    setError("")

    try {
      const { data: participantData, error: participantError } = await supabase
        .from("league_mail_participants")
        .select("thread_id,last_read_at,can_reply")
        .eq("user_id", session.user.id)

      if (participantError) throw participantError

      const rows = (participantData || []) as ParticipantRow[]
      setParticipants(rows)

      const ids = rows.map((row) => row.thread_id).filter(Boolean)
      if (ids.length === 0) {
        setThreads([])
        setSelectedId(null)
        return
      }

      const { data: threadData, error: threadError } = await supabase
        .from("league_mail_threads")
        .select(`
          id,subject,category,priority,status,source_kind,
          team_id,match_id,season_id,last_message_at,created_at,
          team:teams(name),
          match:matches(
            match_date,match_time,status,home_team_type,away_team_type,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name),
            home_opponent_team:opponent_teams!matches_home_opponent_team_id_fkey(name),
            away_opponent_team:opponent_teams!matches_away_opponent_team_id_fkey(name)
          )
        `)
        .in("id", ids)
        .order("last_message_at", { ascending: false })

      if (threadError) throw threadError
      setThreads((threadData || []) as LeagueThread[])
    } catch (err: any) {
      console.error("League mailbox load error:", err)
      setError(err?.message || "Das Liga-Postfach konnte nicht geladen werden.")
    }
  }, [session?.user?.id])

  const openThread = useCallback(async (threadId: string) => {
    setSelectedId(threadId)
    setDetailLoading(true)
    setError("")

    try {
      const { data, error: messageError } = await supabase
        .from("league_mail_messages")
        .select("id,sender_role,body,created_at")
        .eq("thread_id", threadId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true })

      if (messageError) throw messageError
      setMessages((data || []) as LeagueMessage[])

      const { error: readError } = await supabase.rpc("league_mail_mark_read", {
        p_thread_id: threadId,
      })
      if (readError) throw readError

      setParticipants((prev) =>
        prev.map((row) =>
          row.thread_id === threadId
            ? { ...row, last_read_at: new Date().toISOString() }
            : row,
        ),
      )
    } catch (err: any) {
      console.error("League mailbox detail error:", err)
      setError(err?.message || "Die Nachricht konnte nicht geöffnet werden.")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    setLoading(true)
    void loadThreads().finally(() => setLoading(false))

    const channel = supabase
      .channel(`league_mailbox_member_${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_mail_threads" }, () => void loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "league_mail_messages" }, (payload: any) => {
        void loadThreads()
        if (payload?.new?.thread_id && payload.new.thread_id === selectedId) {
          void openThread(selectedId)
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadThreads, openThread, selectedId, session?.user?.id])

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    setError("")

    try {
      const { error: replyError } = await supabase.rpc("league_mail_reply", {
        p_thread_id: selectedId,
        p_body: reply.trim(),
      })
      if (replyError) throw replyError

      setReply("")
      await openThread(selectedId)
      await loadThreads()
    } catch (err: any) {
      console.error("League mailbox reply error:", err)
      setError(err?.message || "Deine Antwort konnte nicht gesendet werden.")
    } finally {
      setSending(false)
    }
  }

  const selected = threads.find((thread) => thread.id === selectedId) || null
  const unreadCount = threads.filter(isUnread).length
  const openCount = threads.filter((thread) => thread.status !== "closed").length

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase()

    return threads.filter((thread) => {
      if (filter === "unread" && !isUnread(thread)) return false
      if (filter === "open" && thread.status === "closed") return false
      if (filter === "closed" && thread.status !== "closed") return false

      if (!q) return true

      return [
        thread.subject,
        CATEGORY_LABELS[thread.category] || thread.category,
        thread.team?.name || "",
        teamName(thread.match, true),
        teamName(thread.match, false),
      ].join(" ").toLowerCase().includes(q)
    })
  }, [filter, isUnread, query, threads])

  if (authLoading || !session) return null

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050608] pb-24 text-white">
      <Header
        variant="app"
        title="Liga-Postfach"
        subtitle="Mein EMD"
        backHref="/member-profile-app"
      />

      <div className="mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 xl:px-8">

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_5%_18%,rgba(249,115,22,.16),transparent_32%),radial-gradient(circle_at_96%_18%,rgba(14,165,233,.11),transparent_32%),linear-gradient(110deg,rgba(50,22,9,.72),rgba(7,12,18,.91)_44%,rgba(5,25,37,.76))] p-5 shadow-[0_28px_90px_-60px_rgba(0,0,0,.98)] sm:p-7">
          <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-orange-300/25 to-transparent" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/[0.12] bg-orange-500/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/70">
                <ShieldCheck className="h-3.5 w-3.5" />
                Liga-Kommunikation
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                Mein Liga-Postfach
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/38 sm:text-base">
                Nachrichten, Rückfragen und Informationen der Ligaverwaltung – privat und direkt bei dir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right backdrop-blur-xl">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">Ungelesen</div>
                <div className={unreadCount > 0 ? "mt-1 text-xl font-black text-orange-200" : "mt-1 text-xl font-black text-white"}>
                  {unreadCount}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right backdrop-blur-xl">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">Offen</div>
                <div className="mt-1 text-xl font-black text-white">{openCount}</div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(10,17,25,.94),rgba(6,11,17,.89))] shadow-[0_30px_80px_-58px_rgba(0,0,0,.98)]">
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/25" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nachrichten durchsuchen …"
                  className="h-11 border-white/[0.08] bg-black/20 pl-9 text-white placeholder:text-white/22"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "Alle"],
                  ["unread", `Ungelesen${unreadCount ? ` ${unreadCount}` : ""}`],
                  ["open", "Offen"],
                  ["closed", "Geschlossen"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value as MailFilter)}
                    className={`rounded-xl border px-3.5 py-2.5 text-sm font-black transition ${
                      filter === value
                        ? "border-orange-300/20 bg-orange-500/[0.10] text-orange-100"
                        : "border-white/[0.08] bg-white/[0.025] text-white/42 hover:bg-white/[0.05] hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-h-[650px] xl:grid-cols-[430px_minmax(0,1fr)]">
            <aside className={`${selected ? "hidden xl:block" : "block"} border-b border-white/[0.07] xl:border-b-0 xl:border-r`}>
              <div className="flex items-center justify-between border-b border-white/[0.055] px-5 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">
                  {filteredThreads.length} Nachrichten
                </span>
                <Sparkles className="h-4 w-4 text-orange-300/45" />
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-sm font-bold text-white/35">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-300" />
                  Nachrichten werden geladen …
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025]">
                    <Inbox className="h-7 w-7 text-white/16" />
                  </div>
                  <div className="mt-4 text-lg font-black text-white">Noch keine Nachrichten</div>
                  <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-white/30">
                    Sobald die Ligaverwaltung dir schreibt, erscheint der Verlauf hier.
                  </p>
                </div>
              ) : (
                <div className="max-h-[760px] overflow-y-auto">
                  {filteredThreads.map((thread) => {
                    const unread = isUnread(thread)
                    const active = selectedId === thread.id

                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => void openThread(thread.id)}
                        className={`group w-full border-b border-white/[0.05] px-4 py-4 text-left transition sm:px-5 ${
                          active
                            ? "bg-gradient-to-r from-orange-500/[0.10] via-orange-500/[0.035] to-transparent"
                            : "hover:bg-white/[0.025]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            unread
                              ? "border-orange-300/20 bg-orange-500/[0.10] text-orange-200"
                              : "border-white/[0.07] bg-white/[0.03] text-white/30"
                          }`}>
                            {unread ? <Mail className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className={`line-clamp-2 text-sm leading-5 ${unread ? "font-black text-white" : "font-bold text-white/68"}`}>
                                {thread.subject}
                              </div>
                              {unread ? (
                                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,.50)]" />
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-black text-white/42">
                                {CATEGORY_LABELS[thread.category] || "Liga"}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                thread.status === "closed"
                                  ? "bg-white/[0.045] text-white/32"
                                  : thread.status === "waiting_member"
                                    ? "bg-orange-500/[0.10] text-orange-200"
                                    : "bg-sky-500/[0.10] text-sky-200"
                              }`}>
                                {STATUS_LABELS[thread.status] || "Offen"}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-semibold text-white/22">
                              <span className="truncate">{thread.team?.name || "Ligaverwaltung"}</span>
                              <span className="shrink-0">{formatDateTime(thread.last_message_at)}</span>
                            </div>
                          </div>

                          <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/18 transition group-hover:translate-x-0.5 group-hover:text-orange-200/70" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </aside>

            <div className={`${selected ? "block" : "hidden xl:block"} min-w-0`}>
              {!selected ? (
                <div className="flex min-h-[650px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/[0.07] bg-white/[0.025]">
                    <Inbox className="h-9 w-9 text-white/14" />
                  </div>
                  <div className="mt-5 text-xl font-black text-white">Nachricht auswählen</div>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/30">
                    Öffne links einen Verlauf, um Nachrichten und Antworten zu sehen.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[650px] flex-col">
                  <div className="border-b border-white/[0.07] p-4 sm:p-6">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-white/35 xl:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Nachrichten
                    </button>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/50">
                          {CATEGORY_LABELS[selected.category] || "Liga-Nachricht"}
                        </div>
                        <h2 className="mt-1 text-xl font-black leading-7 text-white sm:text-2xl">{selected.subject}</h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {selected.team?.name ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-black text-white/48">
                              <UserRound className="h-3.5 w-3.5" />
                              {selected.team.name}
                            </span>
                          ) : null}

                          <span className={selected.status === "closed"
                            ? "rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-white/38"
                            : selected.status === "waiting_member"
                              ? "rounded-full bg-orange-500/[0.10] px-2.5 py-1 text-[11px] font-black text-orange-200"
                              : "rounded-full bg-sky-500/[0.10] px-2.5 py-1 text-[11px] font-black text-sky-200"
                          }>
                            {STATUS_LABELS[selected.status] || "Offen"}
                          </span>
                        </div>

                        {selected.match ? (
                          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/24">Ligaspiel</div>
                            <div className="mt-1 text-sm font-black text-white/72">
                              {teamName(selected.match, true)} <span className="text-white/20">vs.</span>{" "}
                              {teamName(selected.match, false)}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-white/32">
                              <span>{formatMatchDate(selected.match.match_date)}</span>
                              {selected.match.match_time ? <span>{String(selected.match.match_time).slice(0, 5)} Uhr</span> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-black text-white/35">
                        <Clock3 className="mr-1.5 inline h-3.5 w-3.5" />
                        {formatDateTime(selected.last_message_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                    {detailLoading ? (
                      <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-white/35">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-300" />
                        Verlauf wird geladen …
                      </div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.sender_role === "member"
                        const fromAdmin = message.sender_role === "admin"

                        return (
                          <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[88%] rounded-[20px] border px-4 py-3 sm:max-w-[76%] ${
                              mine
                                ? "border-orange-300/[0.15] bg-orange-500/[0.12] text-white"
                                : fromAdmin
                                  ? "border-white/[0.08] bg-white/[0.035] text-white/82"
                                  : "border-sky-300/[0.10] bg-sky-500/[0.06] text-white/72"
                            }`}>
                              <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                                mine ? "text-orange-100/60" : fromAdmin ? "text-white/28" : "text-sky-200/50"
                              }`}>
                                {mine ? "Du" : fromAdmin ? "Ligaverwaltung" : "Hinweis"}
                              </div>
                              <div className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6">{message.body}</div>
                              <div className="mt-2 text-[10px] font-semibold text-white/22">{formatDateTime(message.created_at)}</div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="border-t border-white/[0.07] bg-black/10 p-4 sm:p-5">
                    {selected.status === "closed" ? (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-bold text-white/35">
                        Dieser Verlauf wurde von der Ligaverwaltung abgeschlossen.
                      </div>
                    ) : canReplyMap.get(selected.id) === false ? (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm font-bold text-white/35">
                        Für diesen Verlauf ist keine Antwort möglich.
                      </div>
                    ) : (
                      <div className="flex items-end gap-3">
                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                              event.preventDefault()
                              void sendReply()
                            }
                          }}
                          placeholder="Antwort an die Ligaverwaltung …"
                          className="min-h-[104px] flex-1 resize-none rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-white/20 focus:border-orange-300/25"
                        />
                        <Button
                          type="button"
                          onClick={() => void sendReply()}
                          disabled={sending || !reply.trim()}
                          className="h-12 rounded-2xl bg-orange-500 px-5 font-black text-white hover:bg-orange-400"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          <span className="ml-2 hidden sm:inline">Senden</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav />
    </main>
  )
}

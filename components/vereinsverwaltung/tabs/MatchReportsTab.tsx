"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Settings2,
  Swords,
  Trash2,
  Users,
} from "lucide-react"

type Team = { id: string; name: string; dart_type?: string | null }
type TeamMember = {
  id: string
  team_id: string
  player_id: string
  role: string | null
  club_players?: { id: string; name: string } | null
}
type Template = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  allow_player_repeat: boolean
  require_final_team_confirmation: boolean
  max_substitutes: number
}
type TemplateGame = {
  id?: string
  template_id?: string
  section_name: string
  sort_order: number
  label: string
  game_type: "single" | "double" | "team"
  dart_type: "edart" | "steeldart" | "free"
  mode: string
  best_of: number
  home_slots: number
  away_slots: number
  required_role: "any" | "captain" | "captain_or_co" | "none"
  composition: "free" | "mixed" | "captain_plus_player"
  mode_source: "fixed" | "dice" | "free"
  bonus_points: number
  require_result_confirmation: boolean
  notes?: string | null
}
type Competition = {
  id: string
  name: string
  competition_type: string
  template_id: string | null
  start_date: string
  end_date: string | null
  default_match_time: string
  day_interval: number
  max_matches_per_day: number
  legs: number
  points_win: number
  points_draw: number
  points_loss: number
  status: string
  notes: string | null
}
type Report = {
  id: string
  competition_id: string | null
  matchday_id: string | null
  template_id: string | null
  home_team_id: string
  away_team_id: string
  scheduled_at: string
  venue: string | null
  status: string
  home_match_points: number
  away_match_points: number
  home_confirmed_at: string | null
  away_confirmed_at: string | null
}
type ReportGame = TemplateGame & {
  id: string
  match_report_id: string
  home_score: number | null
  away_score: number | null
  status: string
}
type Assignment = { id?: string; game_id: string; side: "home" | "away"; slot: number; player_id: string }

const blankGame = (index: number): TemplateGame => ({
  section_name: "Spiele",
  sort_order: index,
  label: `Spiel ${index + 1}`,
  game_type: "single",
  dart_type: "edart",
  mode: "501 DO",
  best_of: 3,
  home_slots: 1,
  away_slots: 1,
  required_role: "any",
  composition: "free",
  mode_source: "fixed",
  bonus_points: 0,
  require_result_confirmation: true,
  notes: "",
})

const MATCH_TIME_ZONE = "Europe/Vienna"

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-AT", {
    timeZone: MATCH_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
function localTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-AT", {
    timeZone: MATCH_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
}
function formatViennaDateTimeLocal(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MATCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}
function viennaLocalToIso(value: string) {
  const [datePart, timePart = "00:00"] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)
  const targetWall = Date.UTC(year, month - 1, day, hour, minute, 0)
  let guess = targetWall

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MATCH_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess))
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
    const representedWall = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    )
    guess += targetWall - representedWall
  }

  return new Date(guess).toISOString()
}
function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function roundRobin(teamIds: string[], legs = 1) {
  const arr = [...teamIds]
  if (arr.length < 2) return [] as Array<{ home: string; away: string; round: number }>
  if (arr.length % 2 === 1) arr.push("__BYE__")
  const rounds = arr.length - 1
  const half = arr.length / 2
  const out: Array<{ home: string; away: string; round: number }> = []
  let current = [...arr]

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = current[i]
      const b = current[current.length - 1 - i]
      if (a !== "__BYE__" && b !== "__BYE__") {
        const flip = (r + i) % 2 === 1
        out.push({ home: flip ? b : a, away: flip ? a : b, round: r + 1 })
      }
    }
    current = [current[0], current[current.length - 1], ...current.slice(1, -1)]
  }

  if (legs === 2) {
    const first = [...out]
    out.push(...first.map((m) => ({ home: m.away, away: m.home, round: m.round + rounds })))
  }
  return out
}

export function MatchReportsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateGames, setTemplateGames] = useState<Record<string, TemplateGame[]>>({})
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionTeamIds, setCompetitionTeamIds] = useState<Record<string, string[]>>({})
  const [reports, setReports] = useState<Report[]>([])
  const [allReportGames, setAllReportGames] = useState<ReportGame[]>([])

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [allowPlayerRepeat, setAllowPlayerRepeat] = useState(true)
  const [requireFinalConfirmation, setRequireFinalConfirmation] = useState(true)
  const [maxSubstitutes, setMaxSubstitutes] = useState(3)
  const [games, setGames] = useState<TemplateGame[]>([blankGame(0)])

  const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null)
  const [competitionName, setCompetitionName] = useState("")
  const [competitionType, setCompetitionType] = useState("cup")
  const [competitionTemplateId, setCompetitionTemplateId] = useState("")
  const [competitionStartDate, setCompetitionStartDate] = useState("")
  const [competitionEndDate, setCompetitionEndDate] = useState("")
  const [defaultTime, setDefaultTime] = useState("19:00")
  const [dayInterval, setDayInterval] = useState(7)
  const [maxMatchesPerDay, setMaxMatchesPerDay] = useState(1)
  const [legs, setLegs] = useState(1)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [competitionNotes, setCompetitionNotes] = useState("")

  const [standingsCompetitionId, setStandingsCompetitionId] = useState("")
  const [lineupOpen, setLineupOpen] = useState(false)
  const [lineupReport, setLineupReport] = useState<Report | null>(null)
  const [lineupGames, setLineupGames] = useState<ReportGame[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [lineupLoading, setLineupLoading] = useState(false)

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || "Team"
  const selectedTemplate = templates.find((t) => t.id === competitionTemplateId)

  async function loadAll() {
    try {
      setLoading(true)
      setMessage("")
      const [
        teamsRes,
        membersRes,
        templatesRes,
        gamesRes,
        compsRes,
        compTeamsRes,
        reportsRes,
        reportGamesRes,
      ] = await Promise.all([
        supabase.from("teams").select("id,name,dart_type").order("name"),
        supabase
          .from("team_members")
          .select("id,team_id,player_id,role,club_players:club_players!team_members_player_id_fkey(id,name)")
          .is("left_at", null),
        supabase.from("match_report_templates").select("*").order("created_at", { ascending: false }),
        supabase.from("match_report_template_games").select("*").order("sort_order"),
        supabase.from("match_report_competitions").select("*").order("created_at", { ascending: false }),
        supabase.from("match_report_competition_teams").select("competition_id,team_id,sort_order").order("sort_order"),
        supabase.from("match_reports").select("*").order("scheduled_at", { ascending: true }),
        supabase.from("match_report_games").select("*").order("sort_order"),
      ])

      for (const r of [teamsRes, membersRes, templatesRes, gamesRes, compsRes, compTeamsRes, reportsRes, reportGamesRes]) {
        if (r.error) throw r.error
      }

      setTeams((teamsRes.data || []) as Team[])
      setTeamMembers((membersRes.data || []) as any)
      setTemplates((templatesRes.data || []) as Template[])
      const grouped: Record<string, TemplateGame[]> = {}
      for (const row of (gamesRes.data || []) as any[]) {
        ;(grouped[row.template_id] ||= []).push(row as TemplateGame)
      }
      setTemplateGames(grouped)
      setCompetitions((compsRes.data || []) as Competition[])
      const ct: Record<string, string[]> = {}
      for (const row of (compTeamsRes.data || []) as any[]) {
        ;(ct[row.competition_id] ||= []).push(row.team_id)
      }
      setCompetitionTeamIds(ct)
      setReports((reportsRes.data || []) as Report[])
      setAllReportGames((reportGamesRes.data || []) as ReportGame[])
    } catch (e: any) {
      setMessage(e?.message || "Daten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  function resetTemplate() {
    setEditingTemplateId(null)
    setTemplateName("")
    setTemplateDescription("")
    setAllowPlayerRepeat(true)
    setRequireFinalConfirmation(true)
    setMaxSubstitutes(3)
    setGames([blankGame(0)])
  }

  function editTemplate(t: Template) {
    setEditingTemplateId(t.id)
    setTemplateName(t.name)
    setTemplateDescription(t.description || "")
    setAllowPlayerRepeat(t.allow_player_repeat)
    setRequireFinalConfirmation(t.require_final_team_confirmation)
    setMaxSubstitutes(Number(t.max_substitutes ?? 3))
    setGames((templateGames[t.id] || [blankGame(0)]).map((g, i) => ({ ...g, sort_order: i })))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function saveTemplate() {
    if (!templateName.trim()) return setMessage("Bitte Vorlagenname eingeben.")
    if (!games.length) return setMessage("Mindestens ein Spiel ist erforderlich.")

    try {
      setSaving(true)
      setMessage("")
      let templateId = editingTemplateId

      if (templateId) {
        const { error } = await supabase
          .from("match_report_templates")
          .update({
            name: templateName.trim(),
            description: templateDescription.trim() || null,
            allow_player_repeat: allowPlayerRepeat,
            require_final_team_confirmation: requireFinalConfirmation,
            max_substitutes: Math.max(0, Math.min(10, Number(maxSubstitutes) || 0)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", templateId)
        if (error) throw error

        const del = await supabase.from("match_report_template_games").delete().eq("template_id", templateId)
        if (del.error) throw del.error
      } else {
        const { data, error } = await supabase
          .from("match_report_templates")
          .insert({
            name: templateName.trim(),
            description: templateDescription.trim() || null,
            allow_player_repeat: allowPlayerRepeat,
            require_final_team_confirmation: requireFinalConfirmation,
            max_substitutes: Math.max(0, Math.min(10, Number(maxSubstitutes) || 0)),
          })
          .select("id")
          .single()
        if (error) throw error
        templateId = data.id
      }

      const rows = games.map((g, i) => ({
        template_id: templateId!,
        section_name: g.section_name.trim() || "Spiele",
        sort_order: i,
        label: g.label.trim() || `Spiel ${i + 1}`,
        game_type: g.game_type,
        dart_type: g.dart_type,
        mode: g.mode.trim() || "501 DO",
        best_of: Number(g.best_of) || 1,
        home_slots: g.game_type === "single" ? 1 : Math.max(2, Number(g.home_slots) || 2),
        away_slots: g.game_type === "single" ? 1 : Math.max(2, Number(g.away_slots) || 2),
        required_role: g.required_role,
        composition: g.composition,
        mode_source: g.mode_source,
        bonus_points: Number(g.bonus_points) || 0,
        require_result_confirmation: g.require_result_confirmation,
        notes: g.notes?.trim() || null,
      }))
      const ins = await supabase.from("match_report_template_games").insert(rows)
      if (ins.error) throw ins.error

      setMessage("Vorlage gespeichert.")
      resetTemplate()
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message || "Vorlage konnte nicht gespeichert werden.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm("Vorlage wirklich löschen? Bereits erstellte Spielberichte bleiben bestehen.")) return
    const { error } = await supabase.from("match_report_templates").delete().eq("id", id)
    if (error) setMessage(error.message)
    else await loadAll()
  }

  function patchGame(index: number, patch: Partial<TemplateGame>) {
    setGames((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }
  function moveGame(index: number, dir: -1 | 1) {
    setGames((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((g, i) => ({ ...g, sort_order: i }))
    })
  }

  function resetCompetition() {
    setEditingCompetitionId(null)
    setCompetitionName("")
    setCompetitionType("cup")
    setCompetitionTemplateId("")
    setCompetitionStartDate("")
    setCompetitionEndDate("")
    setDefaultTime("19:00")
    setDayInterval(7)
    setMaxMatchesPerDay(1)
    setLegs(1)
    setSelectedTeamIds([])
    setCompetitionNotes("")
  }

  function editCompetition(c: Competition) {
    setEditingCompetitionId(c.id)
    setCompetitionName(c.name)
    setCompetitionType(c.competition_type)
    setCompetitionTemplateId(c.template_id || "")
    setCompetitionStartDate(c.start_date)
    setCompetitionEndDate(c.end_date || "")
    setDefaultTime(String(c.default_match_time || "19:00").slice(0, 5))
    setDayInterval(c.day_interval)
    setMaxMatchesPerDay(c.max_matches_per_day)
    setLegs(c.legs)
    setSelectedTeamIds(competitionTeamIds[c.id] || [])
    setCompetitionNotes(c.notes || "")
  }

  async function saveCompetition() {
    if (!competitionName.trim() || !competitionStartDate || !competitionTemplateId) {
      return setMessage("Name, Startdatum und Spielbericht-Vorlage sind erforderlich.")
    }
    if (selectedTeamIds.length < 2) return setMessage("Mindestens zwei Mannschaften auswählen.")

    try {
      setSaving(true)
      setMessage("")
      let id = editingCompetitionId
      const payload = {
        name: competitionName.trim(),
        competition_type: competitionType,
        template_id: competitionTemplateId,
        start_date: competitionStartDate,
        end_date: competitionEndDate || null,
        default_match_time: defaultTime,
        day_interval: Math.max(1, Number(dayInterval) || 7),
        max_matches_per_day: Math.max(1, Number(maxMatchesPerDay) || 1),
        legs,
        notes: competitionNotes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (id) {
        const up = await supabase.from("match_report_competitions").update(payload).eq("id", id)
        if (up.error) throw up.error
        const del = await supabase.from("match_report_competition_teams").delete().eq("competition_id", id)
        if (del.error) throw del.error
      } else {
        const ins = await supabase.from("match_report_competitions").insert(payload).select("id").single()
        if (ins.error) throw ins.error
        id = ins.data.id
      }

      const teamRows = selectedTeamIds.map((team_id, i) => ({ competition_id: id!, team_id, sort_order: i }))
      const teamsIns = await supabase.from("match_report_competition_teams").insert(teamRows)
      if (teamsIns.error) throw teamsIns.error

      setMessage("Wettbewerb gespeichert.")
      resetCompetition()
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message || "Wettbewerb konnte nicht gespeichert werden.")
    } finally {
      setSaving(false)
    }
  }

  async function generateSchedule(c: Competition) {
    const ids = competitionTeamIds[c.id] || []
    if (ids.length < 2 || !c.template_id) return setMessage("Teams oder Vorlage fehlen.")

    const existing = reports.filter((r) => r.competition_id === c.id)
    if (existing.some((r) => r.status === "completed")) {
      return setMessage("Spielplan enthält bereits abgeschlossene Spiele und wird deshalb nicht überschrieben.")
    }
    if (existing.length && !window.confirm("Vorhandenen Spielplan löschen und neu erzeugen?")) return

    try {
      setSaving(true)
      setMessage("")

      if (existing.length) {
        const delReports = await supabase.from("match_reports").delete().eq("competition_id", c.id)
        if (delReports.error) throw delReports.error
        const delDays = await supabase.from("match_report_matchdays").delete().eq("competition_id", c.id)
        if (delDays.error) throw delDays.error
      }

      const fixtures = roundRobin(ids, c.legs)
      let currentDate = c.start_date
      let usedToday = 0
      let dayIndex = 0
      const dayIds = new Map<string, string>()

      for (let i = 0; i < fixtures.length; i++) {
        if (usedToday >= c.max_matches_per_day) {
          dayIndex += 1
          currentDate = addDays(c.start_date, dayIndex * c.day_interval)
          usedToday = 0
        }

        let matchdayId = dayIds.get(currentDate)
        if (!matchdayId) {
          const md = await supabase
            .from("match_report_matchdays")
            .insert({
              competition_id: c.id,
              match_date: currentDate,
              default_time: String(c.default_match_time).slice(0, 8),
              max_matches: c.max_matches_per_day,
              label: `Spieltag ${dayIndex + 1}`,
              sort_order: dayIndex,
            })
            .select("id")
            .single()
          if (md.error) throw md.error
          matchdayId = md.data.id
          dayIds.set(currentDate, matchdayId)
        }

        const f = fixtures[i]
        const report = await supabase
          .from("match_reports")
          .insert({
            competition_id: c.id,
            matchday_id: matchdayId,
            template_id: c.template_id,
            home_team_id: f.home,
            away_team_id: f.away,
            scheduled_at: viennaLocalToIso(`${currentDate}T${String(c.default_match_time).slice(0, 5)}`),
            status: "scheduled",
          })
          .select("id")
          .single()
        if (report.error) throw report.error

        const copy = await supabase.rpc("copy_match_report_template_games", {
          p_report_id: report.data.id,
          p_template_id: c.template_id,
        })
        if (copy.error) throw copy.error

        usedToday += 1
      }

      setMessage(`Spielplan mit ${fixtures.length} Begegnungen erstellt.`)
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message || "Spielplan konnte nicht erstellt werden.")
    } finally {
      setSaving(false)
    }
  }

  async function updateReportSchedule(report: Report, value: string) {
    const { error } = await supabase.from("match_reports").update({ scheduled_at: viennaLocalToIso(value) }).eq("id", report.id)
    if (error) setMessage(error.message)
    else await loadAll()
  }

  async function openLineup(report: Report) {
    try {
      setLineupOpen(true)
      setLineupLoading(true)
      setLineupReport(report)
      const [g, a] = await Promise.all([
        supabase.from("match_report_games").select("*").eq("match_report_id", report.id).order("sort_order"),
        supabase.from("match_report_game_players").select("*").in(
          "game_id",
          (await supabase.from("match_report_games").select("id").eq("match_report_id", report.id)).data?.map((x:any)=>x.id) || ["00000000-0000-0000-0000-000000000000"],
        ),
      ])
      if (g.error) throw g.error
      if (a.error) throw a.error
      setLineupGames((g.data || []) as any)
      setAssignments((a.data || []) as any)
    } catch (e: any) {
      setMessage(e?.message || "Aufstellung konnte nicht geladen werden.")
      setLineupOpen(false)
    } finally {
      setLineupLoading(false)
    }
  }

  function assignedPlayer(gameId: string, side: "home" | "away", slot: number) {
    return assignments.find((a) => a.game_id === gameId && a.side === side && a.slot === slot)?.player_id || ""
  }

  function setAssignedPlayer(gameId: string, side: "home" | "away", slot: number, playerId: string) {
    setAssignments((prev) => {
      const rest = prev.filter((a) => !(a.game_id === gameId && a.side === side && a.slot === slot))
      if (!playerId || playerId === "__none__") return rest
      return [...rest, { game_id: gameId, side, slot, player_id: playerId }]
    })
  }

  function optionsForSide(side: "home" | "away") {
    if (!lineupReport) return []
    const teamId = side === "home" ? lineupReport.home_team_id : lineupReport.away_team_id
    return teamMembers.filter((m) => m.team_id === teamId)
  }

  async function saveLineup() {
    if (!lineupReport) return
    try {
      setSaving(true)
      const ids = lineupGames.map((g) => g.id)
      if (ids.length) {
        const del = await supabase.from("match_report_game_players").delete().in("game_id", ids)
        if (del.error) throw del.error
      }
      if (assignments.length) {
        const ins = await supabase.from("match_report_game_players").insert(
          assignments.map((a) => ({ game_id: a.game_id, side: a.side, slot: a.slot, player_id: a.player_id })),
        )
        if (ins.error) throw ins.error
      }
      setMessage("Aufstellung gespeichert.")
      setLineupOpen(false)
    } catch (e: any) {
      setMessage(e?.message || "Aufstellung konnte nicht gespeichert werden.")
    } finally {
      setSaving(false)
    }
  }

  const futureReports = useMemo(() => reports.slice().sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)), [reports])

  function reportScore(reportId: string) {
    const gs = allReportGames.filter((g) => g.match_report_id === reportId && g.status === "confirmed")
    let home = 0
    let away = 0
    for (const g of gs) {
      const hs = Number(g.home_score ?? 0)
      const as = Number(g.away_score ?? 0)
      if (hs > as) home += 1 + Number(g.bonus_points || 0)
      else if (as > hs) away += 1 + Number(g.bonus_points || 0)
    }
    return { home, away, confirmed: gs.length, total: allReportGames.filter((g)=>g.match_report_id===reportId).length }
  }

  function standingsForCompetition(competitionId: string) {
    const competition = competitions.find((c) => c.id === competitionId)
    const teamIds = competitionTeamIds[competitionId] || []
    const rows = teamIds.map((teamId) => ({
      teamId,
      teamName: teamName(teamId),
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scored: 0,
      conceded: 0,
      points: 0,
    }))

    const byTeam = new Map(rows.map((r) => [r.teamId, r]))
    const completedReports = reports.filter((r) => r.competition_id === competitionId && r.status === "completed")

    for (const r of completedReports) {
      const score = reportScore(r.id)
      const home = byTeam.get(r.home_team_id)
      const away = byTeam.get(r.away_team_id)
      if (!home || !away) continue

      home.played += 1
      away.played += 1
      home.scored += score.home
      home.conceded += score.away
      away.scored += score.away
      away.conceded += score.home

      if (score.home > score.away) {
        home.wins += 1
        away.losses += 1
        home.points += Number(competition?.points_win ?? 2)
        away.points += Number(competition?.points_loss ?? 0)
      } else if (score.away > score.home) {
        away.wins += 1
        home.losses += 1
        away.points += Number(competition?.points_win ?? 2)
        home.points += Number(competition?.points_loss ?? 0)
      } else {
        home.draws += 1
        away.draws += 1
        home.points += Number(competition?.points_draw ?? 1)
        away.points += Number(competition?.points_draw ?? 1)
      }
    }

    return rows.sort((a, b) =>
      b.points - a.points ||
      (b.scored - b.conceded) - (a.scored - a.conceded) ||
      b.scored - a.scored ||
      a.teamName.localeCompare(b.teamName)
    )
  }


  if (loading) {
    return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-600" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-center gap-2 font-black text-orange-900"><Swords className="h-5 w-5" /> Spielberichte & Wettbewerbe</div>
        <p className="mt-1 text-sm text-orange-800">
          Spielberichte, Wettbewerbe und Spielpläne verwalten.
        </p>
      </div>

      {message ? <div className="rounded-xl border bg-white p-3 text-sm font-semibold">{message}</div> : null}

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          <TabsTrigger value="competitions">Wettbewerbe</TabsTrigger>
          <TabsTrigger value="schedule">Spielplan</TabsTrigger>
          <TabsTrigger value="standings">Tabelle</TabsTrigger>
          <TabsTrigger value="results">Ergebnisse</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-5">
          <Card>
            <CardHeader><CardTitle>{editingTemplateId ? "Vorlage bearbeiten" : "Neue Spielbericht-Vorlage"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input value={templateName} onChange={(e)=>setTemplateName(e.target.value)} placeholder="z.B. Captain’s Cup, Mixed Cup, interne Liga" /></div>
                <div className="space-y-2"><Label>Beschreibung</Label><Input value={templateDescription} onChange={(e)=>setTemplateDescription(e.target.value)} placeholder="optional" /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-xl border p-3">
                  <span><span className="block font-bold">Spieler mehrfach einsetzbar</span><span className="text-xs text-slate-500">Kann derselbe Spieler in mehreren Spielen vorkommen?</span></span>
                  <Switch checked={allowPlayerRepeat} onCheckedChange={setAllowPlayerRepeat} />
                </label>
                <label className="flex items-center justify-between rounded-xl border p-3">
                  <span><span className="block font-bold">Endbestätigung beider Teams</span><span className="text-xs text-slate-500">Spielbericht am Ende von beiden Teamleitungen bestätigen.</span></span>
                  <Switch checked={requireFinalConfirmation} onCheckedChange={setRequireFinalConfirmation} />
                </label>
                <div className="rounded-xl border p-3">
                  <Label className="font-bold">Max. Auswechselspieler</Label>
                  <p className="mt-0.5 text-xs text-slate-500">0 bis 10 pro Team und Begegnung.</p>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={maxSubstitutes}
                    onChange={(e)=>setMaxSubstitutes(Math.max(0,Math.min(10,Number(e.target.value)||0)))}
                    className="mt-2 h-10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {games.map((g, i) => (
                  <div key={i} className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-black">{i + 1}. {g.label || "Spiel"}</div>
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="icon" disabled={i===0} onClick={()=>moveGame(i,-1)}><ChevronUp className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" disabled={i===games.length-1} onClick={()=>moveGame(i,1)}><ChevronDown className="h-4 w-4" /></Button>
                        <Button type="button" variant="destructive" size="icon" onClick={()=>setGames(prev=>prev.filter((_,x)=>x!==i))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1"><Label>Bereich</Label><Input value={g.section_name} onChange={(e)=>patchGame(i,{section_name:e.target.value})} placeholder="E-Dart Einzel" /></div>
                      <div className="space-y-1"><Label>Bezeichnung</Label><Input value={g.label} onChange={(e)=>patchGame(i,{label:e.target.value})} placeholder="Runde 1 – Spiel 1" /></div>
                      <div className="space-y-1"><Label>Spielart</Label>
                        <Select value={g.game_type} onValueChange={(v:any)=>patchGame(i,{game_type:v,home_slots:v==="single"?1:2,away_slots:v==="single"?1:2})}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="single">Einzel</SelectItem><SelectItem value="double">Doppel</SelectItem><SelectItem value="team">Teamspiel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Dartart</Label>
                        <Select value={g.dart_type} onValueChange={(v:any)=>patchGame(i,{dart_type:v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="edart">E-Dart</SelectItem><SelectItem value="steeldart">Steeldart</SelectItem><SelectItem value="free">Frei</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="space-y-1"><Label>Modus</Label><Input value={g.mode} onChange={(e)=>patchGame(i,{mode:e.target.value})} placeholder="501 DO" /></div>
                      <div className="space-y-1"><Label>Moduswahl</Label>
                        <Select value={g.mode_source} onValueChange={(v:any)=>patchGame(i,{mode_source:v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="fixed">Fix</SelectItem><SelectItem value="dice">Würfeln</SelectItem><SelectItem value="free">Vor Ort frei wählen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Best of</Label><Input type="number" min={1} max={21} value={g.best_of} onChange={(e)=>patchGame(i,{best_of:Number(e.target.value)})} /></div>
                      <div className="space-y-1"><Label>Spieleranforderung</Label>
                        <Select value={g.required_role} onValueChange={(v:any)=>patchGame(i,{required_role:v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="any">Beliebiger Spieler</SelectItem>
                            <SelectItem value="captain">Captain</SelectItem>
                            <SelectItem value="captain_or_co">Captain oder Co-Captain</SelectItem>
                            <SelectItem value="none">Keine Vorgabe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Zusammensetzung</Label>
                        <Select value={g.composition} onValueChange={(v:any)=>patchGame(i,{composition:v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="free">Frei</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                            <SelectItem value="captain_plus_player">Captain + Spieler</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {g.game_type !== "single" ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1"><Label>Spieler Heim</Label><Input type="number" min={2} max={8} value={g.home_slots} onChange={(e)=>patchGame(i,{home_slots:Number(e.target.value)})} /></div>
                        <div className="space-y-1"><Label>Spieler Gast</Label><Input type="number" min={2} max={8} value={g.away_slots} onChange={(e)=>patchGame(i,{away_slots:Number(e.target.value)})} /></div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1"><Label>Sonderpunkte für Sieger</Label><Input type="number" step="0.5" value={g.bonus_points} onChange={(e)=>patchGame(i,{bonus_points:Number(e.target.value)})} /></div>
                      <label className="flex items-center justify-between rounded-xl border bg-white p-3 md:col-span-2">
                        <span><span className="font-bold">Ergebnis muss vom Gegner bestätigt werden</span><span className="block text-xs text-slate-500">Bei Aus bleibt das Ergebnis nach Eingabe sofort bestätigt.</span></span>
                        <Switch checked={g.require_result_confirmation} onCheckedChange={(v)=>patchGame(i,{require_result_confirmation:v})} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={()=>setGames(prev=>[...prev,blankGame(prev.length)])}><Plus className="mr-2 h-4 w-4" />Spiel hinzufügen</Button>
                <Button type="button" onClick={()=>void saveTemplate()} disabled={saving}><Save className="mr-2 h-4 w-4" />{editingTemplateId ? "Änderungen speichern" : "Vorlage speichern"}</Button>
                {editingTemplateId ? <Button variant="ghost" onClick={resetTemplate}>Abbrechen</Button> : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((t)=>(
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-black">{t.name}</div><div className="mt-1 text-sm text-slate-500">{t.description || "Keine Beschreibung"}</div></div>
                    <Badge>{(templateGames[t.id]||[]).length} Spiele</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={()=>editTemplate(t)}>Bearbeiten</Button>
                    <Button size="sm" variant="destructive" onClick={()=>void deleteTemplate(t.id)}>Löschen</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="competitions" className="space-y-5">
          <Card>
            <CardHeader><CardTitle>{editingCompetitionId ? "Wettbewerb bearbeiten" : "Interne Liga / Cup anlegen"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2"><Label>Name</Label><Input value={competitionName} onChange={(e)=>setCompetitionName(e.target.value)} placeholder="z.B. EMD Mixed Cup Herbst 2026" /></div>
                <div className="space-y-1"><Label>Art</Label>
                  <Select value={competitionType} onValueChange={setCompetitionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="league">Liga</SelectItem><SelectItem value="cup">Cup</SelectItem><SelectItem value="mixed">Mixed Cup</SelectItem><SelectItem value="fun">Fun Cup</SelectItem><SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1 md:col-span-2"><Label>Spielbericht-Vorlage</Label>
                  <Select value={competitionTemplateId} onValueChange={setCompetitionTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Vorlage wählen" /></SelectTrigger>
                    <SelectContent>{templates.map((t)=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Startdatum</Label><Input type="date" value={competitionStartDate} onChange={(e)=>setCompetitionStartDate(e.target.value)} /></div>
                <div className="space-y-1"><Label>Enddatum optional</Label><Input type="date" value={competitionEndDate} onChange={(e)=>setCompetitionEndDate(e.target.value)} /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1"><Label>Standard-Uhrzeit</Label><Input type="time" value={defaultTime} onChange={(e)=>setDefaultTime(e.target.value)} /></div>
                <div className="space-y-1"><Label>Abstand Spieltage</Label><Input type="number" min={1} max={60} value={dayInterval} onChange={(e)=>setDayInterval(Number(e.target.value))} /><p className="text-xs text-slate-500">Tage bis zum nächsten Termin.</p></div>
                <div className="space-y-1"><Label>Max. Spiele pro Tag</Label>
                  <Select value={String(maxMatchesPerDay)} onValueChange={(v)=>setMaxMatchesPerDay(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {[1,2,3,4,5,6].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Hin-/Rückrunde</Label>
                  <Select value={String(legs)} onValueChange={(v)=>setLegs(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="1">1× jeder gegen jeden</SelectItem><SelectItem value="2">Hin- und Rückrunde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Mannschaften</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teams.map((t)=>{
                    const active = selectedTeamIds.includes(t.id)
                    return <button key={t.id} type="button" onClick={()=>setSelectedTeamIds(prev=>active?prev.filter(x=>x!==t.id):[...prev,t.id])} className={`rounded-xl border p-3 text-left ${active?"border-orange-500 bg-orange-50":"bg-white"}`}>
                      <div className="font-bold">{t.name}</div><div className="text-xs text-slate-500">{t.dart_type || "Dart"}</div>
                    </button>
                  })}
                </div>
              </div>

              <div className="space-y-1"><Label>Notiz</Label><Textarea value={competitionNotes} onChange={(e)=>setCompetitionNotes(e.target.value)} /></div>

              <div className="flex gap-2">
                <Button onClick={()=>void saveCompetition()} disabled={saving}><Save className="mr-2 h-4 w-4" />Speichern</Button>
                {editingCompetitionId ? <Button variant="ghost" onClick={resetCompetition}>Abbrechen</Button> : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {competitions.map((c)=>(
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black">{c.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {localDate(`${c.start_date}T12:00:00`)} · {competitionTeamIds[c.id]?.length || 0} Teams · max. {c.max_matches_per_day} Spiele/Tag
                      </div>
                    </div>
                    <Badge variant="secondary">{c.competition_type}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={()=>editCompetition(c)}>Bearbeiten</Button>
                    <Button size="sm" onClick={()=>void generateSchedule(c)} disabled={saving}><CalendarDays className="mr-2 h-4 w-4" />Spielplan erzeugen</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-3">
          {futureReports.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">Noch kein Spielplan vorhanden.</CardContent></Card>
          ) : futureReports.map((r)=>(
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-orange-600">{competitions.find(c=>c.id===r.competition_id)?.name || "Interner Wettbewerb"}</div>
                    <div className="mt-1 text-lg font-black">{teamName(r.home_team_id)} <span className="text-slate-400">vs.</span> {teamName(r.away_team_id)}</div>
                    <div className="mt-1 text-sm text-slate-500">{localDate(r.scheduled_at)} · {localTime(r.scheduled_at)} · {r.status}</div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1"><Label className="text-xs">Termin ändern</Label><Input className="w-[220px]" type="datetime-local" defaultValue={formatViennaDateTimeLocal(r.scheduled_at)} onBlur={(e)=>e.target.value && void updateReportSchedule(r,e.target.value)} /></div>
                    <Button variant="outline" onClick={()=>void openLineup(r)}><Users className="mr-2 h-4 w-4" />Aufstellung</Button>
                    <Button asChild><Link href={`/internal-matches/${r.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />Live-Spielbericht</Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="standings" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[320px_1fr] md:items-end">
                <div className="space-y-1">
                  <Label>Wettbewerb</Label>
                  <Select
                    value={standingsCompetitionId || competitions[0]?.id || ""}
                    onValueChange={setStandingsCompetitionId}
                  >
                    <SelectTrigger><SelectValue placeholder="Wettbewerb wählen" /></SelectTrigger>
                    <SelectContent>{competitions.map((c)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-slate-500">
                  Gewertet werden nur vollständig abgeschlossene Begegnungen.
                </div>
              </div>
            </CardContent>
          </Card>

          {(() => {
            const cid = standingsCompetitionId || competitions[0]?.id || ""
            const rows = cid ? standingsForCompetition(cid) : []
            return rows.length ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-950 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Mannschaft</th>
                          <th className="px-3 py-3 text-center">Sp</th>
                          <th className="px-3 py-3 text-center">S</th>
                          <th className="px-3 py-3 text-center">U</th>
                          <th className="px-3 py-3 text-center">N</th>
                          <th className="px-3 py-3 text-center">Spiele</th>
                          <th className="px-3 py-3 text-center">Diff.</th>
                          <th className="px-4 py-3 text-center">Pkt.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={r.teamId} className="border-t bg-white">
                            <td className="px-4 py-3 font-black">{idx + 1}</td>
                            <td className="px-4 py-3 font-black">{r.teamName}</td>
                            <td className="px-3 py-3 text-center">{r.played}</td>
                            <td className="px-3 py-3 text-center">{r.wins}</td>
                            <td className="px-3 py-3 text-center">{r.draws}</td>
                            <td className="px-3 py-3 text-center">{r.losses}</td>
                            <td className="px-3 py-3 text-center">{r.scored}:{r.conceded}</td>
                            <td className="px-3 py-3 text-center">{r.scored - r.conceded}</td>
                            <td className="px-4 py-3 text-center text-lg font-black">{r.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-slate-500">Noch keine Tabelle vorhanden.</CardContent></Card>
            )
          })()}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid gap-3">
            {reports.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">Noch keine Begegnungen vorhanden.</CardContent></Card>
            ) : reports
              .slice()
              .sort((a,b)=>b.scheduled_at.localeCompare(a.scheduled_at))
              .map((r) => {
                const score = reportScore(r.id)
                const comp = competitions.find((c)=>c.id===r.competition_id)
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wide text-orange-600">{comp?.name || "Interner Wettbewerb"}</div>
                          <div className="mt-1 text-lg font-black text-slate-950">{teamName(r.home_team_id)} <span className="text-slate-400">vs.</span> {teamName(r.away_team_id)}</div>
                          <div className="mt-1 text-sm text-slate-500">{localDate(r.scheduled_at)} · {localTime(r.scheduled_at)} · {score.confirmed}/{score.total} Spiele bestätigt</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="rounded-2xl border bg-slate-50 px-5 py-3 text-center">
                            <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Ergebnis</div>
                            <div className="mt-1 text-2xl font-black">{score.home} : {score.away}</div>
                          </div>
                          <Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge>
                          <Button asChild variant="outline"><Link href={`/internal-matches/${r.id}`} target="_blank">Details</Link></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={lineupOpen} onOpenChange={setLineupOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>Aufstellung – {lineupReport ? `${teamName(lineupReport.home_team_id)} vs. ${teamName(lineupReport.away_team_id)}` : ""}</DialogTitle></DialogHeader>
          {lineupLoading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : (
            <div className="space-y-4">
              {lineupGames.map((g)=>(
                <div key={g.id} className="rounded-2xl border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div><div className="font-black">{g.section_name} · {g.label}</div><div className="text-xs text-slate-500">{g.game_type} · {g.dart_type} · {g.mode} · Best of {g.best_of} · {g.required_role !== "any" ? `Vorgabe: ${g.required_role}` : "freie Spielerwahl"}{g.composition !== "free" ? ` · ${g.composition}` : ""}</div></div>
                    {g.require_result_confirmation ? <Badge>Gegner bestätigt Ergebnis</Badge> : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><div className="mb-2 font-bold">{lineupReport ? teamName(lineupReport.home_team_id) : "Heim"}</div>
                      <div className="space-y-2">{Array.from({length:g.home_slots}).map((_,slot)=>(
                        <Select key={slot} value={assignedPlayer(g.id,"home",slot+1) || "__none__"} onValueChange={(v)=>setAssignedPlayer(g.id,"home",slot+1,v)}>
                          <SelectTrigger><SelectValue placeholder={`Spieler ${slot+1}`} /></SelectTrigger><SelectContent>
                            <SelectItem value="__none__">Noch nicht gewählt</SelectItem>
                            {optionsForSide("home").map((m)=><SelectItem key={m.player_id} value={m.player_id}>{m.club_players?.name || "Spieler"}{m.role ? ` · ${m.role}` : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ))}</div>
                    </div>
                    <div><div className="mb-2 font-bold">{lineupReport ? teamName(lineupReport.away_team_id) : "Gast"}</div>
                      <div className="space-y-2">{Array.from({length:g.away_slots}).map((_,slot)=>(
                        <Select key={slot} value={assignedPlayer(g.id,"away",slot+1) || "__none__"} onValueChange={(v)=>setAssignedPlayer(g.id,"away",slot+1,v)}>
                          <SelectTrigger><SelectValue placeholder={`Spieler ${slot+1}`} /></SelectTrigger><SelectContent>
                            <SelectItem value="__none__">Noch nicht gewählt</SelectItem>
                            {optionsForSide("away").map((m)=><SelectItem key={m.player_id} value={m.player_id}>{m.club_players?.name || "Spieler"}{m.role ? ` · ${m.role}` : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ))}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end"><Button onClick={()=>void saveLineup()} disabled={saving}><Save className="mr-2 h-4 w-4" />Aufstellung speichern</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Cake,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fmtDate = (v: string) =>
  new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" }).format(
    new Date(`${v}T12:00:00`),
  );
const fmtTime = (v?: string | null) => (v ? String(v).slice(0, 5) : "");
const normDart = (v?: string | null) => {
  const x = String(v ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (x.includes("edart")) return "edart";
  if (x.includes("steel")) return "steeldart";
  return "";
};
const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const dateTimeInVienna = (iso: string) => {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date: parts, time };
};

type AvailabilityStatus = "yes" | "maybe" | "no";
type Membership = {
  team_id: string;
  role: string | null;
  teams: { id: string; name: string; dart_type?: string | null } | null;
};
type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_type: string;
  away_team_type: string;
  home_opponent_team_id: string | null;
  away_opponent_team_id: string | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  week_number: number;
  status: string;
  dart_type: string | null;
  home_team?: { id: string; name: string } | null;
  away_team?: { id: string; name: string } | null;
  home_opponent_team?: { id: string; name: string } | null;
  away_opponent_team?: { id: string; name: string } | null;
};
type Summary = {
  match: Match;
  teamId: string;
  teamName: string;
  role: string | null;
  myStatus: AvailabilityStatus | null;
  yes: number;
  maybe: number;
  no: number;
  open: number;
  total: number;
  lineupConfirmed: boolean;
  starters: string[];
  subs: string[];
};
type CalendarFeedItem = {
  id: string;
  kind: "event" | "tournament" | "birthday" | "board";
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  description?: string | null;
};

function FeedIcon({ kind }: { kind: CalendarFeedItem["kind"] }) {
  if (kind === "tournament") return <Trophy className="h-4 w-4" />;
  if (kind === "birthday") return <Cake className="h-4 w-4" />;
  if (kind === "board") return <ShieldCheck className="h-4 w-4" />;
  return <CalendarDays className="h-4 w-4" />;
}

function FeedBadge({ kind }: { kind: CalendarFeedItem["kind"] }) {
  const cls =
    kind === "tournament"
      ? "border-violet-300/15 bg-violet-500/10 text-violet-200"
      : kind === "birthday"
        ? "border-pink-300/15 bg-pink-500/10 text-pink-200"
        : kind === "board"
          ? "border-sky-300/15 bg-sky-500/10 text-sky-200"
          : "border-orange-300/15 bg-orange-500/10 text-orange-200";
  const label = kind === "tournament" ? "Turnier" : kind === "birthday" ? "Geburtstag" : kind === "board" ? "Vorstand" : "Event";
  return <Badge className={`${cls} hover:bg-inherit`}>{label}</Badge>;
}

export default function ChatUpdatesPanel({ onOpenLineup }: { onOpenLineup: () => void }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) void loadAll();
  }, [session?.user?.id]);

  async function loadAll() {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(p ?? null);

      await Promise.all([loadCalendarFeed(), p?.player_id ? loadLeagueSummaries(p.player_id) : Promise.resolve(setSummaries([]))]);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeagueSummaries(playerId: string) {
    const { data: tm } = await supabase
      .from("team_members")
      .select("team_id,role,teams(id,name,dart_type)")
      .eq("player_id", playerId)
      .is("left_at", null);
    const ms = (tm as any[] ?? []) as Membership[];
    const teamIds = ms.map((x) => x.team_id);
    if (!teamIds.length) {
      setSummaries([]);
      return;
    }

    const [mr, or] = await Promise.all([
      supabase
        .from("matches")
        .select(`*,home_team:teams!matches_home_team_id_fkey(id,name,dart_type),away_team:teams!matches_away_team_id_fkey(id,name,dart_type)`)
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .neq("status", "completed")
        .order("match_date", { ascending: true })
        .limit(6),
      supabase.from("opponent_teams").select("id,name"),
    ]);
    const opp = (or.data as any[] ?? []);
    const matches = (mr.data as any[] ?? []).map((m) => ({
      ...m,
      home_opponent_team: m.home_opponent_team_id ? opp.find((o) => o.id === m.home_opponent_team_id) ?? null : null,
      away_opponent_team: m.away_opponent_team_id ? opp.find((o) => o.id === m.away_opponent_team_id) ?? null : null,
    })) as Match[];

    const rows: Summary[] = [];
    for (const m of matches) {
      const own = ms.filter((x) => x.team_id === m.home_team_id || x.team_id === m.away_team_id);
      for (const mem of own) {
        const dart = normDart(mem.teams?.dart_type || m.dart_type);
        const module = dart === "edart" ? "edart_league" : "steeldart_league";
        const [{ data: eligible }, { data: av }, { data: lh }, { data: lu }] = await Promise.all([
          supabase.rpc("eligible_team_players_for_league", { p_team_id: mem.team_id, p_required_module_code: module }),
          supabase.from("match_availability").select("player_id,status").eq("match_id", m.id).eq("team_id", mem.team_id),
          supabase.from("match_lineup_headers").select("status,current_version,confirmed_version").eq("match_id", m.id).eq("team_id", mem.team_id).maybeSingle(),
          supabase.from("match_lineups").select("player_id,is_substitute,position,club_players:club_players(id,name)").eq("match_id", m.id).eq("team_id", mem.team_id).order("position", { ascending: true }),
        ]);
        const eligibleIds = new Set((eligible as any[] ?? []).map((x) => x.player_id));
        const avRows = (av as any[] ?? []).filter((x) => eligibleIds.has(x.player_id));
        const total = eligibleIds.size;
        const yes = avRows.filter((x) => x.status === "yes").length;
        const maybe = avRows.filter((x) => x.status === "maybe").length;
        const no = avRows.filter((x) => x.status === "no").length;
        const open = Math.max(0, total - avRows.length);
        const myStatus = (avRows.find((x) => x.player_id === playerId)?.status ?? null) as AvailabilityStatus | null;
        const lineupConfirmed =
          (lh as any)?.status === "confirmed" &&
          (lh as any)?.confirmed_version != null &&
          (lh as any)?.confirmed_version === (lh as any)?.current_version;
        const lineup = (lu as any[] ?? []);
        rows.push({
          match: m,
          teamId: mem.team_id,
          teamName: mem.teams?.name || "Team",
          role: mem.role,
          myStatus,
          yes,
          maybe,
          no,
          open,
          total,
          lineupConfirmed,
          starters: lineup.filter((x) => !x.is_substitute).map((x) => x.club_players?.name).filter(Boolean),
          subs: lineup.filter((x) => x.is_substitute).map((x) => x.club_players?.name).filter(Boolean),
        });
      }
    }
    setSummaries(rows);
  }

  async function loadCalendarFeed() {
    const now = new Date();
    const today = ymd(now);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 45);
    const until = ymd(horizon);

    const [eventsRes, tournamentsRes, birthdaysRes, boardRes] = await Promise.all([
      supabase.from("events").select("id,name,event_date,start_date,end_date,event_type,event_time,details,location").order("event_date", { ascending: true }),
      supabase
        .from("dko_series_events")
        .select(`id,title,start_at,location,is_matchday,series:dko_series(id,name,slug,startgeld)`)
        .order("start_at", { ascending: true }),
      supabase.from("club_players").select("id,name,birthdate").not("birthdate", "is", null),
      supabase.from("board_events").select("id,title,description,starts_at").order("starts_at", { ascending: true }),
    ]);

    const items: CalendarFeedItem[] = [];

    for (const r of (eventsRes.data as any[] ?? [])) {
      const date = r.start_date || r.event_date;
      if (!date || date < today || date > until) continue;
      items.push({
        id: `event_${r.id}`,
        kind: "event",
        title: r.name || "Vereinsevent",
        date,
        time: r.event_time ? String(r.event_time).slice(0, 5) : null,
        location: r.location ?? null,
        description: r.details ?? null,
      });
    }

    for (const r of (tournamentsRes.data as any[] ?? [])) {
      if (!r?.start_at || !r?.series) continue;
      const dt = dateTimeInVienna(r.start_at);
      if (dt.date < today || dt.date > until) continue;
      const titlePart = r.title ? ` – ${r.title}` : "";
      const details = [r.is_matchday ? "Spieltag" : "Spielfrei", r.series?.startgeld != null ? `${r.series.startgeld} € Startgeld` : null]
        .filter(Boolean)
        .join(" • ");
      items.push({
        id: `dko_${r.id}`,
        kind: "tournament",
        title: `${r.series?.name || "Turnier"}${titlePart}`,
        date: dt.date,
        time: dt.time,
        location: r.location ?? null,
        description: details || null,
      });
    }

    const year = now.getFullYear();
    for (const r of (birthdaysRes.data as any[] ?? [])) {
      if (!r.birthdate) continue;
      const [, mm, dd] = String(r.birthdate).split("-");
      let date = `${year}-${mm}-${dd}`;
      if (date < today) date = `${year + 1}-${mm}-${dd}`;
      if (date > until) continue;
      items.push({ id: `birthday_${r.id}_${date}`, kind: "birthday", title: `${r.name} hat Geburtstag`, date });
    }

    // board_events sind im Vereinskalender als "nur für Vorstand sichtbar" gedacht.
    // Wenn RLS nichts zurückgibt, erscheint hier automatisch nichts.
    for (const r of (boardRes.data as any[] ?? [])) {
      if (!r.starts_at) continue;
      const dt = dateTimeInVienna(r.starts_at);
      if (dt.date < today || dt.date > until) continue;
      items.push({
        id: `board_${r.id}`,
        kind: "board",
        title: r.title || "Vorstandstermin",
        date: dt.date,
        time: dt.time,
        description: r.description ?? null,
      });
    }

    items.sort((a, b) => `${a.date}T${a.time || "23:59"}`.localeCompare(`${b.date}T${b.time || "23:59"}`));
    setCalendarItems(items.slice(0, 12));
  }

  async function setMyStatus(s: Summary, status: AvailabilityStatus) {
    if (!profile?.player_id || s.lineupConfirmed) return;
    const key = `${s.match.id}:${s.teamId}`;
    setSaving(key);
    try {
      await supabase.from("match_availability").upsert(
        { match_id: s.match.id, team_id: s.teamId, player_id: profile.player_id, status, note: null },
        { onConflict: "match_id,player_id" },
      );
      await loadLeagueSummaries(profile.player_id);
    } finally {
      setSaving(null);
    }
  }

  const actionCount = useMemo(
    () =>
      summaries.filter(
        (s) =>
          !s.lineupConfirmed &&
          (!s.myStatus || ((s.role === "Captain" || s.role === "Co-Captain") && (s.open > 0 || !s.lineupConfirmed))),
      ).length,
    [summaries],
  );

  const today = ymd(new Date());
  const todayItems = calendarItems.filter((x) => x.date === today);
  const upcomingItems = calendarItems.filter((x) => x.date !== today);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-white/35">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  return (
    <div className="h-full overflow-y-auto bg-[#0b1117] pb-8">
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#171f27]/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-black text-white">Aktuell</div>
            <div className="mt-1 text-xs text-white/40">Wichtiges, Termine und was du noch erledigen musst</div>
          </div>
          {actionCount > 0 ? (
            <Badge className="bg-orange-500/15 text-orange-200">{actionCount} offen</Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-200">Alles erledigt</Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-5">
        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-orange-300" />
            <div className="text-sm font-black text-white">Für dich wichtig</div>
          </div>

          {summaries.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                <div>
                  <div className="font-black text-white">Nichts offen</div>
                  <div className="mt-1 text-sm text-white/40">Aktuell gibt es keine offenen Ligathemen für dich.</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.slice(0, 3).map((s, idx) => {
                const captain = s.role === "Captain" || s.role === "Co-Captain";
                const needsAction = !s.lineupConfirmed && (!s.myStatus || (captain && (s.open > 0 || !s.lineupConfirmed)));
                const home = s.match.home_team_type === "opponent" ? s.match.home_opponent_team?.name : s.match.home_team?.name;
                const away = s.match.away_team_type === "opponent" ? s.match.away_opponent_team?.name : s.match.away_team?.name;
                const key = `${s.match.id}:${s.teamId}`;

                return (
                  <section
                    key={key}
                    className={`overflow-hidden rounded-[22px] border ${needsAction ? "border-orange-300/15 bg-[#141c24]" : "border-white/[0.07] bg-[#121a22]"}`}
                  >
                    <div className="border-b border-white/[0.06] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[.14em] text-orange-300/70">
                            {idx === 0 ? "Nächstes Spiel" : `Spieltag ${s.match.week_number}`}
                          </div>
                          <div className="mt-1 truncate text-[15px] font-black text-white">
                            {home || "Unbekannt"} <span className="text-white/25">vs.</span> {away || "Unbekannt"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-orange-300" />{fmtDate(s.match.match_date)}</span>
                            {s.match.match_time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-orange-300" />{fmtTime(s.match.match_time)}</span>}
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-orange-300" />{s.match.venue || "—"}</span>
                          </div>
                        </div>
                        <Badge
                          className={`shrink-0 whitespace-nowrap px-3 py-1 text-xs font-black ${
                            s.lineupConfirmed
                              ? "bg-emerald-500/15 text-emerald-200"
                              : !s.myStatus
                                ? "bg-orange-500/15 text-orange-200"
                                : s.myStatus === "no"
                                  ? "bg-red-500/15 text-red-200"
                                  : s.myStatus === "maybe"
                                    ? "bg-amber-500/15 text-amber-200"
                                    : "bg-sky-500/15 text-sky-200"
                          }`}
                        >
                          {s.lineupConfirmed
                            ? (s.starters.includes(profile?.club_players?.name || "") || s.subs.includes(profile?.club_players?.name || "")
                                ? "Aufgestellt"
                                : "Nicht aufgestellt")
                            : !s.myStatus
                              ? "Aktion nötig"
                              : s.myStatus === "yes"
                                ? "Eingeplant"
                                : s.myStatus === "maybe"
                                  ? "Bereit wenn nötig"
                                  : "Nicht dabei"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 p-3">
                      {!s.lineupConfirmed ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-black text-white/40">DEINE ZUSAGE</div>
                              <div className="mt-1 text-sm font-black text-white">
                                {s.myStatus === "yes" ? "Ja, ich bin dabei" : s.myStatus === "maybe" ? "Nur wenn nötig" : s.myStatus === "no" ? "Nein" : "Noch nicht beantwortet"}
                              </div>
                            </div>
                            {s.myStatus === "yes" ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : s.myStatus === "no" ? <XCircle className="h-5 w-5 text-red-300" /> : <HelpCircle className="h-5 w-5 text-amber-300" />}
                          </div>
                          {!s.myStatus && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <Button disabled={saving === key} onClick={() => setMyStatus(s, "yes")} className="h-9 rounded-xl bg-emerald-500/15 text-xs font-black text-emerald-200 hover:bg-emerald-500/25">Ja</Button>
                              <Button disabled={saving === key} onClick={() => setMyStatus(s, "maybe")} className="h-9 rounded-xl bg-amber-500/15 text-xs font-black text-amber-200 hover:bg-amber-500/25">Wenn nötig</Button>
                              <Button disabled={saving === key} onClick={() => setMyStatus(s, "no")} className="h-9 rounded-xl bg-red-500/15 text-xs font-black text-red-200 hover:bg-red-500/25">Nein</Button>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {!s.lineupConfirmed ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-black text-white/40"><Users className="h-3.5 w-3.5" />TEAM-RÜCKMELDUNGEN</div>
                              <div className="mt-1 text-sm font-black text-white">{s.open > 0 ? `${s.open} noch offen` : "Alle haben geantwortet"}</div>
                            </div>
                            <div className="text-right text-[11px] font-bold text-white/45"><span className="text-emerald-300">{s.yes} Ja</span> · <span className="text-amber-300">{s.maybe} ?</span> · <span className="text-red-300">{s.no} Nein</span></div>
                          </div>
                          {captain && s.open > 0 && <div className="mt-2 text-xs font-semibold text-orange-200/75">Captain/Co: Rückmeldungen fehlen noch.</div>}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-black text-white/40"><ShieldCheck className="h-3.5 w-3.5" />AUFSTELLUNG</div>
                            <div className={`mt-1 text-sm font-black ${s.lineupConfirmed ? "text-emerald-200" : "text-white"}`}>{s.lineupConfirmed ? "Bestätigt ✓" : "Noch nicht bestätigt"}</div>
                          </div>
                          <Button variant="ghost" onClick={onOpenLineup} className="h-9 rounded-xl px-3 text-xs font-black text-orange-300 hover:bg-orange-500/10">Öffnen <ChevronRight className="ml-1 h-4 w-4" /></Button>
                        </div>
                        {s.lineupConfirmed && s.starters.length > 0 && (
                          <div className="mt-2 text-xs leading-5 text-white/50">
                            <span className="font-bold text-white/65">Starter:</span> {s.starters.join(" · ")}
                            {s.subs.length ? <><br /><span className="font-bold text-white/65">Ersatz:</span> {s.subs.join(" · ")}</> : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        {todayItems.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2 px-1"><Target className="h-4 w-4 text-emerald-300" /><div className="text-sm font-black text-white">Heute</div></div>
            <div className="space-y-2">
              {todayItems.map((item) => <CalendarFeedCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2 px-1"><CalendarDays className="h-4 w-4 text-sky-300" /><div className="text-sm font-black text-white">Demnächst</div></div>
          {upcomingItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm text-white/40">In den nächsten Wochen ist im Vereinskalender nichts Weiteres eingetragen.</div>
          ) : (
            <div className="space-y-2">
              {upcomingItems.map((item) => <CalendarFeedCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CalendarFeedCard({ item }: { item: CalendarFeedItem }) {
  return (
    <div className="rounded-[20px] border border-white/[0.07] bg-[#121a22] p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-orange-300">
          <FeedIcon kind={item.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 text-sm font-black text-white">{item.title}</div>
            <FeedBadge kind={item.kind} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-orange-300/80" />{fmtDate(item.date)}</span>
            {item.time ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-orange-300/80" />{fmtTime(item.time)}</span> : null}
            {item.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-orange-300/80" />{item.location}</span> : null}
          </div>
          {item.description ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/40">{item.description}</div> : null}
        </div>
      </div>
    </div>
  );
}

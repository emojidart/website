"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, MapPin, RefreshCw, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type MatchRow = {
  id: string;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  status: string | null;
  dart_type: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_type: string | null;
  away_team_type: string | null;
  home_opponent_team_id: string | null;
  away_opponent_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team?: { id: string; name: string } | null;
  away_team?: { id: string; name: string } | null;
};

function viennaToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function fmtTime(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

export default function ChatMatchDayBar({
  teamId,
  onOpenLineup,
  onOpenUpdates,
}: {
  teamId: string;
  onOpenLineup: (matchId: string, teamId: string) => void;
  onOpenUpdates: () => void;
}) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [opponents, setOpponents] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<{ name: string; dart_type: string | null } | null>(null);
  const [availabilityOpen, setAvailabilityOpen] = useState<number | null>(null);
  const [lineupConfirmed, setLineupConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const today = viennaToday();

      const [{ data: teamData }, { data: matchData }] = await Promise.all([
        supabase.from("teams").select("name,dart_type").eq("id", teamId).maybeSingle(),
        supabase
          .from("matches")
          .select(`
            id,match_date,match_time,venue,status,dart_type,
            home_team_id,away_team_id,home_team_type,away_team_type,
            home_opponent_team_id,away_opponent_team_id,
            home_score,away_score,
            home_team:teams!matches_home_team_id_fkey(id,name),
            away_team:teams!matches_away_team_id_fkey(id,name)
          `)
          .eq("match_date", today)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order("match_time", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      setTeam((teamData as any) ?? null);
      const m = (matchData as any) as MatchRow | null;
      setMatch(m);

      if (!m) {
        setAvailabilityOpen(null);
        setLineupConfirmed(false);
        return;
      }

      const opponentIds = [m.home_opponent_team_id, m.away_opponent_team_id].filter(Boolean) as string[];
      if (opponentIds.length) {
        const { data } = await supabase
          .from("opponent_teams")
          .select("id,name")
          .in("id", opponentIds);
        setOpponents(
          Object.fromEntries(((data as any[]) ?? []).map((row) => [row.id, row.name])),
        );
      } else {
        setOpponents({});
      }

      const norm = String((teamData as any)?.dart_type || m.dart_type || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
      const moduleCode = norm.includes("edart") ? "edart_league" : "steeldart_league";

      const [{ data: eligible }, { data: av }, { data: header }] = await Promise.all([
        supabase.rpc("eligible_team_players_for_league", {
          p_team_id: teamId,
          p_required_module_code: moduleCode,
        }),
        supabase
          .from("match_availability")
          .select("player_id,status")
          .eq("match_id", m.id)
          .eq("team_id", teamId),
        supabase
          .from("match_lineup_headers")
          .select("status,current_version,confirmed_version")
          .eq("match_id", m.id)
          .eq("team_id", teamId)
          .maybeSingle(),
      ]);

      const eligibleIds = new Set(((eligible as any[]) ?? []).map((row) => row.player_id));
      const answered = new Set(
        ((av as any[]) ?? [])
          .filter((row) => eligibleIds.has(row.player_id))
          .map((row) => row.player_id),
      );

      setAvailabilityOpen(Math.max(0, eligibleIds.size - answered.size));
      setLineupConfirmed(
        (header as any)?.status === "confirmed" &&
          (header as any)?.confirmed_version != null &&
          (header as any)?.confirmed_version === (header as any)?.current_version,
      );
    } catch (error) {
      console.error("match day bar error", error);
      setMatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel(`match_day_bar_${teamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_availability" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineup_headers" }, () => void load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const names = useMemo(() => {
    if (!match) return { home: "", away: "" };

    const home =
      match.home_team_type === "opponent"
        ? opponents[match.home_opponent_team_id || ""] || "Gegner"
        : match.home_team?.name || (match.home_team_id === teamId ? team?.name : "Team");

    const away =
      match.away_team_type === "opponent"
        ? opponents[match.away_opponent_team_id || ""] || "Gegner"
        : match.away_team?.name || (match.away_team_id === teamId ? team?.name : "Team");

    return { home, away };
  }, [match, opponents, team, teamId]);

  if (loading) {
    return (
      <div className="shrink-0 border-b border-orange-300/[0.08] bg-[#111922] px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-white/35">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Match-Day wird geprüft …
        </div>
      </div>
    );
  }

  if (!match) return null;

  const completed =
    match.status === "completed" &&
    match.home_score != null &&
    match.away_score != null;

  const routeUrl = match.venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`
    : null;

  return (
    <div className="shrink-0 border-b border-orange-300/[0.10] bg-[linear-gradient(105deg,rgba(249,115,22,.13),rgba(10,17,24,.98)_55%)] px-3 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-500/10 text-orange-200 sm:flex">
          <Trophy className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">
              Match Day
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/45">
              <CalendarDays className="h-3.5 w-3.5" />
              Heute{match.match_time ? ` · ${fmtTime(match.match_time)} Uhr` : ""}
            </span>
          </div>

          <div className="mt-0.5 truncate text-[13px] font-black text-white">
            {names.home} <span className="text-white/35">vs.</span> {names.away}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-white/40">
            {completed ? (
              <span className="text-emerald-200">
                Endstand {match.home_score}:{match.away_score}
              </span>
            ) : lineupConfirmed ? (
              <span className="inline-flex items-center gap-1 text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Aufstellung bestätigt
              </span>
            ) : availabilityOpen != null ? (
              <span className={availabilityOpen > 0 ? "text-amber-200" : "text-emerald-200"}>
                {availabilityOpen > 0
                  ? `${availabilityOpen} Rückmeldung${availabilityOpen === 1 ? "" : "en"} offen`
                  : "Alle haben geantwortet"}
              </span>
            ) : null}

            {match.venue ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{match.venue}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onOpenLineup(match.id, teamId)}
            className="h-8 rounded-lg px-2 text-[10px] font-black text-white/70 hover:bg-white/[0.08] hover:text-orange-100 sm:px-3"
          >
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aufstellung</span>
          </Button>

          {routeUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.open(routeUrl, "_blank", "noopener,noreferrer")}
              className="h-8 rounded-lg px-2 text-[10px] font-black text-white/70 hover:bg-white/[0.08] hover:text-orange-100 sm:px-3"
            >
              <MapPin className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Route</span>
            </Button>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={completed ? onOpenUpdates : () => void load()}
            className="h-8 rounded-lg px-2 text-[10px] font-black text-white/70 hover:bg-white/[0.08] hover:text-orange-100 sm:px-3"
          >
            {completed ? <Trophy className="mr-1 h-3.5 w-3.5" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{completed ? "Ergebnis" : "Aktualisieren"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

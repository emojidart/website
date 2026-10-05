"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, HelpCircle, Loader2, MapPin, ShieldCheck, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const MATCH_CARD_PREFIX = "[[EMD_MATCH_CARD|";

export function makeChatMatchCardMessage(matchId: string, teamId: string) {
  return `${MATCH_CARD_PREFIX}${matchId}|${teamId}]]`;
}

export function parseChatMatchCardMessage(value?: string | null) {
  const text = String(value || "");
  const match = text.match(/^\[\[EMD_MATCH_CARD\|([^|]+)\|([^\]]+)\]\]$/);
  if (!match) return null;
  return { matchId: match[1], teamId: match[2] };
}

type AvailabilityStatus = "yes" | "maybe" | "no";

type MatchRow = {
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
  status: string;
  dart_type: string | null;
  home_team?: { id: string; name: string } | null;
  away_team?: { id: string; name: string } | null;
};

type CardData = {
  match: MatchRow;
  teamName: string;
  homeName: string;
  awayName: string;
  myStatus: AvailabilityStatus | null;
  yes: number;
  maybe: number;
  no: number;
  open: number;
  total: number;
  canRespond: boolean;
  lineupConfirmed: boolean;
  lineupStale: boolean;
  starters: string[];
  substitutes: string[];
};

function fmtDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function fmtTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : "";
}

function normalizeDart(value?: string | null) {
  const v = String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (v.includes("edart")) return "edart";
  if (v.includes("steel")) return "steeldart";
  return "";
}

function isLocked(match: MatchRow) {
  if (match.status === "completed") return true;
  const time = (match.match_time || "23:59").slice(0, 5);
  const ms = new Date(`${match.match_date}T${time}:00`).getTime();
  return Number.isFinite(ms) ? Date.now() >= ms : false;
}

export default function ChatMatchCard({
  matchId,
  teamId,
}: {
  matchId: string;
  teamId: string;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setError(null);

      const { data: p, error: pErr } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (pErr) throw pErr;
      setProfile(p ?? null);

      const [{ data: match, error: matchErr }, { data: team, error: teamErr }] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id,home_team_id,away_team_id,home_team_type,away_team_type,
            home_opponent_team_id,away_opponent_team_id,match_date,match_time,
            venue,status,dart_type,
            home_team:teams!matches_home_team_id_fkey(id,name),
            away_team:teams!matches_away_team_id_fkey(id,name)
          `)
          .eq("id", matchId)
          .maybeSingle(),
        supabase.from("teams").select("id,name,dart_type").eq("id", teamId).maybeSingle(),
      ]);

      if (matchErr) throw matchErr;
      if (teamErr) throw teamErr;
      if (!match || !team) throw new Error("Spiel nicht gefunden.");

      const opponentIds = [
        (match as any).home_opponent_team_id,
        (match as any).away_opponent_team_id,
      ].filter(Boolean);

      let opponents: any[] = [];
      if (opponentIds.length) {
        const { data: rows } = await supabase
          .from("opponent_teams")
          .select("id,name")
          .in("id", opponentIds);
        opponents = (rows as any[]) || [];
      }

      const homeName =
        (match as any).home_team_type === "opponent"
          ? opponents.find((x) => x.id === (match as any).home_opponent_team_id)?.name || "Gegner"
          : (match as any).home_team?.name || "Heim";
      const awayName =
        (match as any).away_team_type === "opponent"
          ? opponents.find((x) => x.id === (match as any).away_opponent_team_id)?.name || "Gegner"
          : (match as any).away_team?.name || "Auswärts";

      const dart = normalizeDart((team as any).dart_type || (match as any).dart_type);
      const moduleCode = dart === "edart" ? "edart_league" : "steeldart_league";

      const [{ data: eligible }, { data: availability }, { data: header }, { data: lineup }] =
        await Promise.all([
          supabase.rpc("eligible_team_players_for_league", {
            p_team_id: teamId,
            p_required_module_code: moduleCode,
          }),
          supabase
            .from("match_availability")
            .select("player_id,status")
            .eq("match_id", matchId)
            .eq("team_id", teamId),
          supabase
            .from("match_lineup_headers")
            .select("status,current_version,confirmed_version")
            .eq("match_id", matchId)
            .eq("team_id", teamId)
            .maybeSingle(),
          supabase
            .from("match_lineups")
            .select("player_id,position,is_substitute,club_players:club_players(id,name)")
            .eq("match_id", matchId)
            .eq("team_id", teamId)
            .order("position", { ascending: true }),
        ]);

      const eligibleIds = new Set(((eligible as any[]) || []).map((x) => x.player_id));
      const availabilityRows = ((availability as any[]) || []).filter((x) =>
        eligibleIds.has(x.player_id),
      );
      const lineupRows = (lineup as any[]) || [];

      const lineupConfirmed =
        (header as any)?.status === "confirmed" &&
        (header as any)?.confirmed_version != null &&
        (header as any)?.confirmed_version === (header as any)?.current_version;

      const lineupStale =
        (header as any)?.status === "confirmed" &&
        (header as any)?.confirmed_version != null &&
        (header as any)?.current_version != null &&
        (header as any)?.confirmed_version < (header as any)?.current_version;

      setData({
        match: match as any,
        teamName: (team as any).name || "Team",
        homeName,
        awayName,
        myStatus:
          (availabilityRows.find((x) => x.player_id === (p as any)?.player_id)?.status ??
            null) as AvailabilityStatus | null,
        yes: availabilityRows.filter((x) => x.status === "yes").length,
        maybe: availabilityRows.filter((x) => x.status === "maybe").length,
        no: availabilityRows.filter((x) => x.status === "no").length,
        open: Math.max(0, eligibleIds.size - availabilityRows.length),
        total: eligibleIds.size,
        canRespond: !!(p as any)?.player_id && eligibleIds.has((p as any).player_id),
        lineupConfirmed,
        lineupStale,
        starters: lineupRows
          .filter((x) => !x.is_substitute)
          .map((x) => x.club_players?.name)
          .filter(Boolean),
        substitutes: lineupRows
          .filter((x) => x.is_substitute)
          .map((x) => x.club_players?.name)
          .filter(Boolean),
      });
    } catch (e: any) {
      console.error("ChatMatchCard load error", e);
      setError(e?.message || "Spiel konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, matchId, teamId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-match-card-${matchId}-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_availability", filter: `match_id=eq.${matchId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${matchId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineup_headers", filter: `match_id=eq.${matchId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, teamId, load]);

  const locked = useMemo(() => (data ? isLocked(data.match) : false), [data]);

  async function setAvailability(status: AvailabilityStatus) {
    if (!data || !profile?.player_id || !data.canRespond || locked || saving) return;

    const previous = data.myStatus;
    setSaving(status);
    setData((cur) => {
      if (!cur) return cur;
      const next = { ...cur };
      if (previous === "yes") next.yes = Math.max(0, next.yes - 1);
      if (previous === "maybe") next.maybe = Math.max(0, next.maybe - 1);
      if (previous === "no") next.no = Math.max(0, next.no - 1);
      if (previous == null) next.open = Math.max(0, next.open - 1);
      if (status === "yes") next.yes += 1;
      if (status === "maybe") next.maybe += 1;
      if (status === "no") next.no += 1;
      next.myStatus = status;
      return next;
    });

    try {
      const { error: upsertError } = await supabase.from("match_availability").upsert(
        {
          match_id: matchId,
          team_id: teamId,
          player_id: profile.player_id,
          status,
          note: null,
        },
        { onConflict: "match_id,player_id" },
      );
      if (upsertError) throw upsertError;
      await load();
    } catch (e) {
      console.error("ChatMatchCard availability error", e);
      await load();
    } finally {
      setSaving(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="mx-auto my-2 flex w-full max-w-[560px] items-center justify-center rounded-[22px] border border-orange-300/10 bg-[#111820] p-5 text-white/45">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Spiel wird geladen …
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto my-2 w-full max-w-[560px] rounded-[22px] border border-red-300/10 bg-red-500/[0.05] p-4 text-sm text-red-200">
        {error || "Spiel konnte nicht geladen werden."}
      </div>
    );
  }

  return (
    <div className="mx-auto my-2 w-full max-w-[560px] overflow-hidden rounded-[24px] border border-orange-300/15 bg-[#111820] text-white shadow-[0_18px_55px_-30px_rgba(249,115,22,.30)]">
      <div className="border-b border-white/[0.07] bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,.17),transparent_45%)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-orange-300/15 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
            🎯 Ligaspiel
          </Badge>
          {data.lineupConfirmed ? (
            <Badge className="border border-emerald-300/15 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Aufstellung bestätigt
            </Badge>
          ) : data.lineupStale ? (
            <Badge className="border border-amber-300/15 bg-amber-500/10 text-amber-200 hover:bg-amber-500/10">
              Aufstellung geändert
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/50">
              Aufstellung offen
            </Badge>
          )}
        </div>

        <div className="mt-3 text-[17px] font-black leading-tight text-white">
          {data.homeName} <span className="text-white/30">vs.</span> {data.awayName}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-orange-300" />
            {fmtDate(data.match.match_date)}
          </span>
          {data.match.match_time ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-orange-300" />
              {fmtTime(data.match.match_time)} Uhr
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-300" />
            <span className="truncate">{data.match.venue || "Kein Spielort"}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/35">
            Bist du dabei?
          </div>

          {data.canRespond ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button
                type="button"
                disabled={locked || !!saving}
                onClick={() => void setAvailability("yes")}
                variant="outline"
                className={`h-11 rounded-xl px-1 text-xs font-black ${
                  data.myStatus === "yes"
                    ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-white/60"
                }`}
              >
                {saving === "yes" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Zusage
              </Button>

              <Button
                type="button"
                disabled={locked || !!saving}
                onClick={() => void setAvailability("maybe")}
                variant="outline"
                className={`h-11 rounded-xl px-1 text-[11px] font-black ${
                  data.myStatus === "maybe"
                    ? "border-amber-300/30 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-white/[0.03] text-white/60"
                }`}
              >
                {saving === "maybe" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-1 h-4 w-4" />}
                Wenn nötig
              </Button>

              <Button
                type="button"
                disabled={locked || !!saving}
                onClick={() => void setAvailability("no")}
                variant="outline"
                className={`h-11 rounded-xl px-1 text-xs font-black ${
                  data.myStatus === "no"
                    ? "border-red-300/30 bg-red-500/15 text-red-200"
                    : "border-white/10 bg-white/[0.03] text-white/60"
                }`}
              >
                {saving === "no" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                Absage
              </Button>
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/45">
              Für dieses Team kannst du keine Verfügbarkeit abgeben.
            </div>
          )}

          {locked ? (
            <div className="mt-2 text-xs font-semibold text-red-200/75">
              Spielbeginn erreicht – Änderungen sind gesperrt.
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-xl border border-emerald-300/10 bg-emerald-500/[0.06] p-2 text-center">
            <div className="text-base font-black text-emerald-200">{data.yes}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/35">Ja</div>
          </div>
          <div className="rounded-xl border border-amber-300/10 bg-amber-500/[0.06] p-2 text-center">
            <div className="text-base font-black text-amber-200">{data.maybe}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/35">Wenn nötig</div>
          </div>
          <div className="rounded-xl border border-red-300/10 bg-red-500/[0.06] p-2 text-center">
            <div className="text-base font-black text-red-200">{data.no}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/35">Nein</div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2 text-center">
            <div className="text-base font-black text-white/65">{data.open}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/35">Offen</div>
          </div>
        </div>

        {(data.lineupConfirmed || data.lineupStale) && (data.starters.length > 0 || data.substitutes.length > 0) ? (
          <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/35">
              <Users className="h-3.5 w-3.5 text-orange-300" />
              Aufstellung
            </div>
            {data.starters.length > 0 ? (
              <div className="text-sm font-semibold text-white/80">
                <span className="text-white/40">Starter:</span> {data.starters.join(" · ")}
              </div>
            ) : null}
            {data.substitutes.length > 0 ? (
              <div className="mt-1 text-sm font-semibold text-white/65">
                <span className="text-white/35">Ersatz:</span> {data.substitutes.join(" · ")}
              </div>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(`/member-availability?match_id=${encodeURIComponent(matchId)}&team_id=${encodeURIComponent(teamId)}&tab=lineup`)
          }
          className="h-10 w-full rounded-xl border-white/10 bg-white/[0.03] text-xs font-black text-white/65"
        >
          Planung & Aufstellung öffnen
        </Button>
      </div>
    </div>
  );
}

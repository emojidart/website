"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Calendar, CheckCircle2, Clock, Loader2, MapPin, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const fmtDate = (v: string) => {
  const d = new Date(`${v}T12:00:00`);
  return new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};
const fmtTime = (v?: string | null) => (v ? v.slice(0, 5) : "");
const normDart = (v?: string | null) => {
  const x = String(v ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (x.includes("edart")) return "edart";
  if (x.includes("steel")) return "steeldart";
  return "";
};

type Membership = {
  team_id: string;
  role: string | null;
  teams: { id: string; name: string; logo_url: string | null; dart_type?: string | null } | null;
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
type Player = { id: string; name: string; photo_url: string | null };
type LineupRow = { id: string; player_id: string; position: number; is_substitute: boolean; club_players?: Player | null };
type Header = { status: string; current_version: number | null; confirmed_version: number | null; confirmed_at: string | null };
type CardStatus = { teamId: string; myStatus: "yes" | "maybe" | "no" | null; open: number; yes: number; maybe: number; no: number; lineupConfirmed: boolean; starters: number; required: number };
type AvailabilityRow = { player_id: string; status: "yes" | "maybe" | "no" };

export default function ChatLineupPanel({ initialMatchId, initialTeamId }: { initialMatchId?: string | null; initialTeamId?: string | null }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [saved, setSaved] = useState<LineupRow[]>([]);
  const [draft, setDraft] = useState<LineupRow[]>([]);
  const [header, setHeader] = useState<Header | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardStatus, setCardStatus] = useState<Record<string, CardStatus>>({});
  const [availabilitySaving, setAvailabilitySaving] = useState<Record<string, boolean>>({});
  const [publishingChat, setPublishingChat] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([]);
  const [remindSending, setRemindSending] = useState<Record<string, boolean>>({});
  const [remindOk, setRemindOk] = useState<Record<string, boolean>>({});
  const [remindAllSending, setRemindAllSending] = useState(false);
  const [remindAllResult, setRemindAllResult] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const initialDeepLinkOpened = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("user_profiles")
        .select("id,user_id,player_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(p ?? null);
      if (!p?.player_id) { setLoading(false); return; }
      const { data: tm } = await supabase
        .from("team_members")
        .select("team_id,role,teams(id,name,logo_url,dart_type)")
        .eq("player_id", p.player_id)
        .is("left_at", null);
      const ms = (tm as any[] ?? []) as Membership[];
      setMemberships(ms);
      const teamIds = ms.map(x => x.team_id);
      if (!teamIds.length) { setLoading(false); return; }
      const [mr, or] = await Promise.all([
        supabase.from("matches").select(`*,home_team:teams!matches_home_team_id_fkey(id,name,dart_type),away_team:teams!matches_away_team_id_fkey(id,name,dart_type)`).or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`).neq("status","completed").order("match_date", { ascending: true }),
        supabase.from("opponent_teams").select("id,name"),
      ]);
      const opp = (or.data as any[] ?? []);
      const enriched = (mr.data as any[] ?? []).map(m => ({
        ...m,
        home_opponent_team: m.home_opponent_team_id ? opp.find(o => o.id === m.home_opponent_team_id) ?? null : null,
        away_opponent_team: m.away_opponent_team_id ? opp.find(o => o.id === m.away_opponent_team_id) ?? null : null,
      })) as Match[];
      setMatches(enriched);

      const statusEntries = await Promise.all(enriched.map(async (m) => {
        const mem = ms.find(x => x.team_id === m.home_team_id || x.team_id === m.away_team_id);
        if (!mem) return null;
        const dart = normDart(mem.teams?.dart_type || m.dart_type);
        const module = dart === "edart" ? "edart_league" : "steeldart_league";
        const required = dart === "edart" ? 4 : dart === "steeldart" ? 3 : 1;
        const [{ data: eligible }, { data: av }, { data: lh }, { data: lu }] = await Promise.all([
          supabase.rpc("eligible_team_players_for_league", { p_team_id: mem.team_id, p_required_module_code: module }),
          supabase.from("match_availability").select("player_id,status").eq("match_id", m.id).eq("team_id", mem.team_id),
          supabase.from("match_lineup_headers").select("status,current_version,confirmed_version").eq("match_id", m.id).eq("team_id", mem.team_id).maybeSingle(),
          supabase.from("match_lineups").select("player_id,is_substitute").eq("match_id", m.id).eq("team_id", mem.team_id),
        ]);
        const eligibleIds = new Set((eligible as any[] ?? []).map(x => x.player_id));
        const avRows = (av as any[] ?? []).filter(x => eligibleIds.has(x.player_id));
        const open = Math.max(0, eligibleIds.size - avRows.length);
        const lineupConfirmed = (lh as any)?.status === "confirmed" && (lh as any)?.confirmed_version != null && (lh as any)?.confirmed_version === (lh as any)?.current_version;
        const starters = (lu as any[] ?? []).filter(x => !x.is_substitute).length;
        return [m.id, {
          teamId: mem.team_id,
          myStatus: (avRows.find(x => x.player_id === p.player_id)?.status ?? null) as "yes" | "maybe" | "no" | null,
          open,
          yes: avRows.filter(x => x.status === "yes").length,
          maybe: avRows.filter(x => x.status === "maybe").length,
          no: avRows.filter(x => x.status === "no").length,
          lineupConfirmed, starters, required,
        } satisfies CardStatus] as const;
      }));
      setCardStatus(Object.fromEntries(statusEntries.filter(Boolean) as any));
      setLoading(false);
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading || initialDeepLinkOpened.current || !initialMatchId || matches.length === 0) return;
    const target = matches.find((m) => m.id === initialMatchId);
    if (!target) return;
    initialDeepLinkOpened.current = true;
    void openMatch(target, initialTeamId || undefined);
  }, [loading, initialMatchId, initialTeamId, matches]);

  const ownTeamsForMatch = (m: Match) => memberships.filter(x => x.team_id === m.home_team_id || x.team_id === m.away_team_id);
  const teamMembership = memberships.find(x => x.team_id === selectedTeamId) ?? null;
  const isCaptain = teamMembership?.role === "Captain" || teamMembership?.role === "Co-Captain";
  const dartType = normDart(teamMembership?.teams?.dart_type || selectedMatch?.dart_type);
  const required = dartType === "edart" ? 4 : dartType === "steeldart" ? 3 : 1;
  const starters = useMemo(() => draft.filter(x => !x.is_substitute).sort((a,b) => a.position-b.position), [draft]);
  const subs = useMemo(() => draft.filter(x => x.is_substitute), [draft]);
  const confirmed = header?.status === "confirmed" && header.confirmed_version != null && header.confirmed_version === header.current_version;
  const locked = selectedMatch ? Date.now() >= new Date(`${selectedMatch.match_date}T${(selectedMatch.match_time || "23:59").slice(0,5)}:00`).getTime() : false;
  const selectedCardStatus = selectedMatch ? cardStatus[selectedMatch.id] ?? null : null;
  const availabilityByPlayer = useMemo(() => {
    const map = new Map<string, "yes" | "maybe" | "no">();
    for (const row of availabilityRows) map.set(row.player_id, row.status);
    return map;
  }, [availabilityRows]);
  const openPlayerIds = useMemo(
    () => players.map((p) => p.id).filter((id) => !availabilityByPlayer.has(id) && id !== profile?.player_id),
    [players, availabilityByPlayer, profile?.player_id],
  );

  const teamAvailabilitySummary = useMemo(() => {
    let yes = 0;
    let maybe = 0;
    let no = 0;
    let open = 0;

    for (const player of players) {
      const status = availabilityByPlayer.get(player.id);
      if (status === "yes") yes += 1;
      else if (status === "maybe") maybe += 1;
      else if (status === "no") no += 1;
      else open += 1;
    }

    return { yes, maybe, no, open };
  }, [players, availabilityByPlayer]);

  const matchName = (m: Match) => {
    const home = m.home_team_type === "opponent" ? m.home_opponent_team?.name : m.home_team?.name;
    const away = m.away_team_type === "opponent" ? m.away_opponent_team?.name : m.away_team?.name;
    return `${home || "Unbekannt"} vs. ${away || "Unbekannt"}`;
  };


  function isMatchLocked(m: Match) {
    return Date.now() >= new Date(`${m.match_date}T${(m.match_time || "23:59").slice(0,5)}:00`).getTime();
  }

  async function setMyAvailability(m: Match, status: "yes" | "maybe" | "no") {
    const cs = cardStatus[m.id];
    if (!profile?.player_id || !cs?.teamId || isMatchLocked(m) || cs.lineupConfirmed || availabilitySaving[m.id]) return;

    const previous = cs.myStatus;
    setAvailabilitySaving(prev => ({ ...prev, [m.id]: true }));

    // Sofort sichtbar aktualisieren; Supabase speichert im Hintergrund.
    setCardStatus(prev => {
      const cur = prev[m.id];
      if (!cur) return prev;
      const next = { ...cur };
      if (previous === "yes") next.yes = Math.max(0, next.yes - 1);
      if (previous === "maybe") next.maybe = Math.max(0, next.maybe - 1);
      if (previous === "no") next.no = Math.max(0, next.no - 1);
      if (previous == null) next.open = Math.max(0, next.open - 1);
      if (status === "yes") next.yes += 1;
      if (status === "maybe") next.maybe += 1;
      if (status === "no") next.no += 1;
      next.myStatus = status;
      return { ...prev, [m.id]: next };
    });

    try {
      const { error: avError } = await supabase.from("match_availability").upsert(
        {
          match_id: m.id,
          team_id: cs.teamId,
          player_id: profile.player_id,
          status,
          note: null,
        },
        { onConflict: "match_id,player_id" },
      );
      if (avError) throw avError;
    } catch (e) {
      console.error("setMyAvailability error", e);
      // Bei Fehler Status wieder zurücksetzen.
      setCardStatus(prev => {
        const cur = prev[m.id];
        if (!cur) return prev;
        const next = { ...cur };
        if (status === "yes") next.yes = Math.max(0, next.yes - 1);
        if (status === "maybe") next.maybe = Math.max(0, next.maybe - 1);
        if (status === "no") next.no = Math.max(0, next.no - 1);
        if (previous === "yes") next.yes += 1;
        if (previous === "maybe") next.maybe += 1;
        if (previous === "no") next.no += 1;
        if (previous == null) next.open += 1;
        next.myStatus = previous;
        return { ...prev, [m.id]: next };
      });
    } finally {
      setAvailabilitySaving(prev => ({ ...prev, [m.id]: false }));
    }
  }

  async function openMatch(m: Match, teamId?: string) {
    const tid = teamId ?? ownTeamsForMatch(m)[0]?.team_id ?? null;
    setSelectedMatch(m); setSelectedTeamId(tid); setError(null);
    if (!tid) return;
    await loadLineup(m, tid);
  }

  async function loadLineup(m: Match, tid: string) {
    const mem = memberships.find(x => x.team_id === tid);
    const module = normDart(mem?.teams?.dart_type || m.dart_type) === "edart" ? "edart_league" : "steeldart_league";
    const { data: eligible } = await supabase.rpc("eligible_team_players_for_league", { p_team_id: tid, p_required_module_code: module });
    const eligibleIds = new Set((eligible as any[] ?? []).map(x => x.player_id));
    const { data: tm } = await supabase.from("team_members").select("player_id,club_players:club_players!team_members_player_id_fkey(id,name,photo_url)").eq("team_id", tid).is("left_at", null);
    const ps = (tm as any[] ?? []).filter(x => eligibleIds.has(x.player_id)).map(x => x.club_players).filter(Boolean) as Player[];
    setPlayers(ps);
    const [{ data: lu }, { data: av }] = await Promise.all([
      supabase.from("match_lineups").select("id,player_id,position,is_substitute,club_players:club_players(id,name,photo_url)").eq("match_id", m.id).eq("team_id", tid).order("position", { ascending: true }),
      supabase.from("match_availability").select("player_id,status").eq("match_id", m.id).eq("team_id", tid),
    ]);
    const rows = (lu as any[] ?? []) as LineupRow[];
    setSaved(rows); setDraft(rows);
    setAvailabilityRows(((av as any[]) ?? []) as AvailabilityRow[]);
    const { data: lh } = await supabase.from("match_lineup_headers").select("status,current_version,confirmed_version,confirmed_at").eq("match_id", m.id).eq("team_id", tid).maybeSingle();
    setHeader((lh as any) ?? null);
  }

  function choose(playerId: string, mode: "starter"|"substitute"|"remove") {
    if (!isCaptain || locked) return;
    setDraft(prev => {
      let next = prev.filter(x => x.player_id !== playerId);
      if (mode !== "remove") {
        const old = prev.find(x => x.player_id === playerId);
        next.push({ id: old?.id ?? `draft_${playerId}`, player_id: playerId, is_substitute: mode === "substitute", position: mode === "starter" ? next.filter(x => !x.is_substitute).length + 1 : 0 });
      }
      const ss = next.filter(x=>!x.is_substitute).sort((a,b)=>a.position-b.position).map((x,i)=>({...x,position:i+1}));
      const es = next.filter(x=>x.is_substitute).map(x=>({...x,position:0}));
      return [...ss,...es];
    });
  }

  async function publishToTeamChat() {
    if (!selectedMatch || !selectedTeamId || !profile?.id || !isCaptain || locked || publishingChat) return;

    setPublishingChat(true);
    setPublishResult(null);

    try {
      const res = await fetch("/api/push/team-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "publish",
          team_id: selectedTeamId,
          match_id: selectedMatch.id,
          sender_profile_id: profile.id,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Veröffentlichen fehlgeschlagen.");

      setPublishResult(
        json?.created
          ? "✓ Im Team-Chat veröffentlicht · Team wurde per Push informiert."
          : "✓ Spiel war bereits im Chat · Team wurde erneut per Push informiert.",
      );
      setTimeout(() => setPublishResult(null), 8000);
    } catch (e: any) {
      console.error("publishToTeamChat error", e);
      setPublishResult(e?.message || "Veröffentlichen fehlgeschlagen.");
      setTimeout(() => setPublishResult(null), 4500);
    } finally {
      setPublishingChat(false);
    }
  }

  async function sendReminder(playerId: string) {
    if (!selectedMatch || !selectedTeamId || !profile?.id || !isCaptain || locked) return;
    if (playerId === profile.player_id || remindSending[playerId]) return;

    setRemindSending((prev) => ({ ...prev, [playerId]: true }));
    setRemindOk((prev) => ({ ...prev, [playerId]: false }));

    try {
      const res = await fetch("/api/push/team-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "reminder",
          team_id: selectedTeamId,
          match_id: selectedMatch.id,
          target_player_id: playerId,
          sender_profile_id: profile.id,
        }),
      });

      const json = await res.json().catch(() => null);

      if (json?.cooldown) {
        setRemindAllResult(`⏱ Erinnerung erst wieder in ca. ${json.minutes_left ?? 30} Min. möglich.`);
        setTimeout(() => setRemindAllResult(null), 6000);
        return;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Erinnerung konnte nicht gesendet werden.");
      }

      setRemindOk((prev) => ({ ...prev, [playerId]: true }));
      setTimeout(() => setRemindOk((prev) => ({ ...prev, [playerId]: false })), 5000);
    } catch (e: any) {
      console.error("sendReminder error", e);
      setRemindAllResult(e?.message || "Erinnerung konnte nicht gesendet werden.");
      setTimeout(() => setRemindAllResult(null), 6000);
    } finally {
      setRemindSending((prev) => ({ ...prev, [playerId]: false }));
    }
  }

  async function remindAllOpen() {
    if (!selectedMatch || !selectedTeamId || !profile?.id || !isCaptain || locked || remindAllSending) return;

    if (openPlayerIds.length === 0) {
      setRemindAllResult("✓ Niemand offen – alle haben bereits geantwortet.");
      setTimeout(() => setRemindAllResult(null), 5000);
      return;
    }

    setRemindAllSending(true);
    setRemindAllResult(null);

    let sent = 0;
    let cooldown = 0;
    let failed = 0;

    for (const playerId of openPlayerIds) {
      try {
        const res = await fetch("/api/push/team-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            action: "reminder",
            team_id: selectedTeamId,
            match_id: selectedMatch.id,
            target_player_id: playerId,
            sender_profile_id: profile.id,
          }),
        });

        const json = await res.json().catch(() => null);
        if (json?.cooldown) {
          cooldown += 1;
        } else if (res.ok && json?.success) {
          sent += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    const parts = [];
    if (sent) parts.push(`${sent} Erinnerung${sent === 1 ? "" : "en"} gesendet`);
    if (cooldown) parts.push(`${cooldown} im 30-Min.-Cooldown`);
    if (failed) parts.push(`${failed} fehlgeschlagen`);
    setRemindAllResult(`✓ ${parts.join(" · ") || "Fertig"}`);
    setTimeout(() => setRemindAllResult(null), 8000);
    setRemindAllSending(false);
  }

  async function confirm() {
    if (!selectedMatch || !selectedTeamId || !profile?.id || !isCaptain || locked) return;
    if (starters.length < required) {
      setError(`Es fehlen noch ${required - starters.length} Starter.`);
      return;
    }

    setSaving(true);
    setError(null);
    setConfirmResult(null);

    try {
      // 1) Aufstellung speichern
      const { error: deleteError } = await supabase
        .from("match_lineups")
        .delete()
        .eq("match_id", selectedMatch.id)
        .eq("team_id", selectedTeamId);

      if (deleteError) throw deleteError;

      if (draft.length) {
        const { error: insertError } = await supabase
          .from("match_lineups")
          .insert(
            draft.map((x) => ({
              match_id: selectedMatch.id,
              team_id: selectedTeamId,
              player_id: x.player_id,
              position: x.is_substitute ? 0 : x.position,
              is_substitute: x.is_substitute,
            })),
          );

        if (insertError) throw insertError;
      }

      // 2) Bestätigung in Supabase setzen
      const { error: confirmError } = await supabase.rpc("confirm_lineup", {
        p_match_id: selectedMatch.id,
        p_team_id: selectedTeamId,
      });

      if (confirmError) throw confirmError;

      // Ab hier IST die Aufstellung gespeichert/bestätigt.
      await loadLineup(selectedMatch, selectedTeamId);

      setCardStatus((prev) => {
        const current = prev[selectedMatch.id];
        if (!current) return prev;
        return {
          ...prev,
          [selectedMatch.id]: {
            ...current,
            lineupConfirmed: true,
            starters: draft.filter((x) => !x.is_substitute).length,
          },
        };
      });

      // 3) Chat + Push separat behandeln.
      // Ein Push-/Chat-Fehler darf NICHT mehr behaupten,
      // dass die Aufstellung nicht gespeichert wurde.
      try {
        const teamInfoRes = await fetch("/api/push/team-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            action: "confirmed",
            team_id: selectedTeamId,
            match_id: selectedMatch.id,
            sender_profile_id: profile.id,
          }),
        });

        const teamInfoJson = await teamInfoRes.json().catch(() => null);

        if (!teamInfoRes.ok || !teamInfoJson?.success) {
          throw new Error(teamInfoJson?.error || "Team-Info konnte nicht gesendet werden.");
        }

        setConfirmResult(
          "✓ Aufstellung gespeichert & bestätigt · im Team-Chat gepostet · Team per Push informiert.",
        );
      } catch (notifyError: any) {
        console.error("lineup confirmed, but team notification failed", notifyError);
        setConfirmResult(
          "✓ Aufstellung gespeichert & bestätigt. ⚠ Team-Chat/Push konnte nicht gesendet werden.",
        );
      }

      setTimeout(() => setConfirmResult(null), 9000);
    } catch (e: any) {
      console.error("confirm lineup save error", e);

      if (e?.message?.includes("Spielbeginn")) {
        setError("Spielbeginn erreicht – Aufstellung ist gesperrt.");
      } else {
        const detail = String(e?.message || "").trim();
        setError(
          detail
            ? `Aufstellung konnte nicht gespeichert werden: ${detail}`
            : "Aufstellung konnte nicht gespeichert werden.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center text-white/35"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!profile) return <div className="p-6 text-sm text-white/50">Kein Mitgliedsprofil gefunden.</div>;

  if (!selectedMatch) {
    return (
      <div className="h-full overflow-y-auto bg-[#0b1117] pb-8">
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#171f27]/95 px-4 py-4 backdrop-blur-xl">
          <div className="text-xl font-black text-white">Aufstellung</div>
          <div className="mt-1 text-xs text-white/40">Kommende Ligaspiele</div>
        </div>
        <div className="mx-auto max-w-3xl p-3 sm:p-5">
          {matches.length === 0 ? <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-center text-sm text-white/40">Keine kommenden Spiele.</div> : matches.map(m => {
            const cs = cardStatus[m.id];
            const matchLocked = isMatchLocked(m);
            const savingAvailability = !!availabilitySaving[m.id];
            return (
              <div key={m.id} onClick={()=>openMatch(m)} className="mb-2.5 w-full cursor-pointer rounded-2xl border border-white/[0.07] bg-[#141c24] p-4 text-left transition hover:bg-[#19232d] active:scale-[0.995]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-black text-white">{matchName(m)}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45"><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-orange-300" />{fmtDate(m.match_date)}</span>{m.match_time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-orange-300" />{fmtTime(m.match_time)}</span>}<span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-orange-300" />{m.venue || "—"}</span></div>
                    {cs ? (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cs.lineupConfirmed ? "bg-emerald-500/15 text-emerald-200" : "bg-orange-500/15 text-orange-200"}`}>{cs.lineupConfirmed ? "✓ Aufstellung bestätigt" : `Aufstellung offen · ${cs.starters}/${cs.required}`}</span>
                          {!cs.lineupConfirmed ? (
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cs.open === 0 ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>{cs.open === 0 ? "✓ Alle haben geantwortet" : `${cs.open} Rückmeldung${cs.open === 1 ? "" : "en"} offen`}</span>
                          ) : null}
                        </div>

                        {!cs.lineupConfirmed ? (
                          <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${cs.myStatus ? "border-white/[0.07] bg-black/15" : "border-orange-300/15 bg-orange-500/[0.045]"}`}>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">Deine Zusage</div>
                              <div className={`mt-0.5 text-xs font-black ${cs.myStatus === "yes" ? "text-emerald-200" : cs.myStatus === "maybe" ? "text-amber-200" : cs.myStatus === "no" ? "text-red-200" : "text-orange-200"}`}>
                                {cs.myStatus === "yes" ? "Ja · du bist dabei" : cs.myStatus === "maybe" ? "Wenn nötig" : cs.myStatus === "no" ? "Nein · du bist nicht dabei" : "Noch offen · Spiel öffnen"}
                              </div>
                            </div>
                            <span className="text-lg text-white/30">›</span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-orange-500/12 px-2.5 py-1 text-[10px] font-black text-orange-200">Spieltag {m.week_number}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b1117]">
      <div className="shrink-0 border-b border-white/[0.06] bg-[#171f27] px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3"><Button variant="ghost" onClick={()=>setSelectedMatch(null)} className="h-9 rounded-full px-3 text-white/70 hover:bg-white/[0.07]">← Zurück</Button><div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-white">{matchName(selectedMatch)}</div><div className="mt-0.5 text-[11px] text-white/40">{fmtDate(selectedMatch.match_date)}{selectedMatch.match_time ? ` · ${fmtTime(selectedMatch.match_time)} Uhr` : ""}</div></div>{confirmed && <Badge className="bg-emerald-500/15 text-emerald-200">Bestätigt</Badge>}</div>
        {ownTeamsForMatch(selectedMatch).length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{ownTeamsForMatch(selectedMatch).map(m => <button key={m.team_id} onClick={async()=>{setSelectedTeamId(m.team_id); await loadLineup(selectedMatch,m.team_id)}} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${selectedTeamId===m.team_id?"border-orange-400/30 bg-orange-500/15 text-orange-200":"border-white/10 text-white/55"}`}>{m.teams?.name}</button>)}</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className={`rounded-2xl border p-4 ${starters.length>=required?"border-emerald-300/15 bg-emerald-500/[0.05]":"border-amber-300/15 bg-amber-500/[0.05]"}`}><div className="flex items-center justify-between"><div><div className="text-[11px] font-black uppercase tracking-[.14em] text-white/30">Starter</div><div className="mt-1 text-sm font-bold text-white/60">{dartType==="edart"?"E-Dart · 4 Starter":dartType==="steeldart"?"Steeldart · 3 Starter":"Aufstellung"}</div></div><div className={`text-3xl font-black ${starters.length>=required?"text-emerald-300":"text-amber-300"}`}>{starters.length}<span className="text-lg text-white/25">/{required}</span></div></div></div>

          {selectedCardStatus && (
            <div className={`rounded-2xl border p-4 ${selectedCardStatus.lineupConfirmed ? "border-emerald-300/15 bg-emerald-500/[0.045]" : selectedCardStatus.myStatus ? "border-white/[0.07] bg-[#141c24]" : "border-orange-300/15 bg-orange-500/[0.045]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.13em] text-white/30">Deine Zusage</div>
                  <div className="mt-1 text-sm font-black text-white">
                    {selectedCardStatus.myStatus === "yes" ? "Ja · du bist dabei" : selectedCardStatus.myStatus === "maybe" ? "Wenn nötig" : selectedCardStatus.myStatus === "no" ? "Nein · du bist nicht dabei" : "Noch keine Rückmeldung"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white/40">
                    {selectedCardStatus.lineupConfirmed ? "Aufstellung bestätigt – Rückmeldung gesperrt." : locked ? "Spielbeginn erreicht – Rückmeldung gesperrt." : "Du kannst deine Rückmeldung bis zur bestätigten Aufstellung ändern."}
                  </div>
                </div>
                {availabilitySaving[selectedMatch.id] ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-orange-300" /> : null}
              </div>

              {!selectedCardStatus.lineupConfirmed && !locked ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button type="button" size="sm" disabled={!!availabilitySaving[selectedMatch.id]} onClick={()=>void setMyAvailability(selectedMatch,"yes")} className={`h-10 rounded-xl border text-xs font-black ${selectedCardStatus.myStatus === "yes" ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/25" : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]"}`}>Ja</Button>
                  <Button type="button" size="sm" disabled={!!availabilitySaving[selectedMatch.id]} onClick={()=>void setMyAvailability(selectedMatch,"maybe")} className={`h-10 rounded-xl border px-1 text-[11px] font-black ${selectedCardStatus.myStatus === "maybe" ? "border-amber-300/30 bg-amber-500/20 text-amber-100 hover:bg-amber-500/25" : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]"}`}>Wenn nötig</Button>
                  <Button type="button" size="sm" disabled={!!availabilitySaving[selectedMatch.id]} onClick={()=>void setMyAvailability(selectedMatch,"no")} className={`h-10 rounded-xl border text-xs font-black ${selectedCardStatus.myStatus === "no" ? "border-red-300/30 bg-red-500/20 text-red-100 hover:bg-red-500/25" : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07]"}`}>Nein</Button>
                </div>
              ) : null}
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.07] bg-[#141c24] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Users className="h-4 w-4 text-orange-300" />
                Rückmeldungen
              </div>
              <div className="text-[10px] font-bold text-white/35">
                {players.length} Spieler
              </div>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-1.5">
              <div className="rounded-xl bg-emerald-500/[0.08] px-2 py-2 text-center">
                <div className="text-sm font-black text-emerald-200">{teamAvailabilitySummary.yes}</div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-200/60">Zusage</div>
              </div>
              <div className="rounded-xl bg-amber-500/[0.08] px-2 py-2 text-center">
                <div className="text-sm font-black text-amber-200">{teamAvailabilitySummary.maybe}</div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-amber-200/60">Wenn nötig</div>
              </div>
              <div className="rounded-xl bg-red-500/[0.08] px-2 py-2 text-center">
                <div className="text-sm font-black text-red-200">{teamAvailabilitySummary.no}</div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-red-200/60">Absage</div>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-2 py-2 text-center">
                <div className="text-sm font-black text-white/55">{teamAvailabilitySummary.open}</div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white/30">Offen</div>
              </div>
            </div>

            <div className="space-y-1.5">
              {players.map((p) => {
                const status = availabilityByPlayer.get(p.id);

                return (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-black/15 px-2.5 py-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={p.photo_url || undefined} />
                      <AvatarFallback>{p.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {p.name}
                    </div>

                    {status === "yes" ? (
                      <Badge className="shrink-0 bg-emerald-500/10 text-emerald-200">Zusage</Badge>
                    ) : status === "maybe" ? (
                      <Badge className="shrink-0 bg-amber-500/10 text-amber-200">Wenn nötig</Badge>
                    ) : status === "no" ? (
                      <Badge className="shrink-0 bg-red-500/10 text-red-200">Absage</Badge>
                    ) : (
                      <Badge className="shrink-0 bg-white/[0.05] text-white/45">Offen</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {locked && <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.05] p-3 text-sm font-semibold text-red-200">Ab Spielbeginn ist die Aufstellung gesperrt.</div>}
          {!isCaptain && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm text-white/50"><ShieldCheck className="mr-2 inline h-4 w-4 text-orange-300" />Nur Captain oder Co-Captain können ändern. Du siehst hier die aktuelle Aufstellung.</div>}
          {error && <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.05] p-3 text-sm text-red-200">{error}</div>}

          {isCaptain && !locked && <div className="rounded-2xl border border-white/[0.07] bg-[#141c24] p-3"><div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Users className="h-4 w-4 text-orange-300" />Spieler auswählen</div><div className="grid gap-2 sm:grid-cols-2">{players.map(p=>{const row=draft.find(x=>x.player_id===p.id); return <div key={p.id} className={`rounded-xl border p-3 ${row?"border-orange-300/15 bg-orange-500/[0.045]":"border-white/[0.06] bg-black/15"}`}><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={p.photo_url || undefined}/><AvatarFallback>{p.name.slice(0,1)}</AvatarFallback></Avatar><div className="min-w-0 flex-1 truncate text-sm font-bold text-white">{p.name}</div>
{availabilityByPlayer.get(p.id) === "yes" ? <Badge className="bg-emerald-500/10 text-emerald-200">Zusage</Badge> : availabilityByPlayer.get(p.id) === "maybe" ? <Badge className="bg-amber-500/10 text-amber-200">Wenn nötig</Badge> : availabilityByPlayer.get(p.id) === "no" ? <Badge className="bg-red-500/10 text-red-200">Absage</Badge> : <Badge className="bg-white/[0.05] text-white/45">Offen</Badge>}
{row && <Badge className={row.is_substitute?"bg-sky-500/10 text-sky-200":"bg-orange-500/10 text-orange-200"}>{row.is_substitute?"Ersatz":"Starter"}</Badge>}</div>
{!availabilityByPlayer.has(p.id) && p.id !== profile?.player_id ? (
  <Button
    type="button"
    size="sm"
    variant="outline"
    disabled={!!remindSending[p.id]}
    onClick={()=>void sendReminder(p.id)}
    className={`mt-2 h-9 w-full border-white/10 text-xs font-black ${remindOk[p.id] ? "bg-emerald-500/10 text-emerald-200" : "bg-white/[0.03] text-white/65"}`}
  >
    {remindSending[p.id] ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : remindOk[p.id] ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Bell className="mr-1.5 h-3.5 w-3.5" />}
    {remindOk[p.id] ? "Erinnerung gesendet" : "Erinnern"}
  </Button>
) : null}
<div className="mt-2 grid grid-cols-2 gap-2">{!row?<><Button size="sm" variant="outline" onClick={()=>choose(p.id,"starter")} className="border-white/10 bg-white/[0.03] text-xs text-white/70">Starter</Button><Button size="sm" variant="outline" onClick={()=>choose(p.id,"substitute")} className="border-white/10 bg-white/[0.03] text-xs text-white/70">Ersatz</Button></>:<><Button size="sm" variant="outline" onClick={()=>choose(p.id,"remove")} className="border-white/10 bg-white/[0.03] text-xs text-red-200">Raus</Button><Button size="sm" variant="outline" onClick={()=>choose(p.id,row.is_substitute?"starter":"substitute")} className="border-white/10 bg-white/[0.03] text-xs text-white/70">{row.is_substitute?"Starter":"Ersatz"}</Button></>}</div></div>})}</div></div>}

          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/[0.07] bg-[#141c24] p-3"><div className="mb-2 text-sm font-black text-white">Starter ({starters.length})</div><div className="space-y-1.5">{starters.length?starters.map(x=><div key={x.player_id} className="rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-white">{players.find(p=>p.id===x.player_id)?.name ?? x.club_players?.name ?? "Spieler"}</div>):<div className="text-xs text-white/30">Noch keine Starter</div>}</div></div><div className="rounded-2xl border border-white/[0.07] bg-[#141c24] p-3"><div className="mb-2 text-sm font-black text-white">Ersatz ({subs.length})</div><div className="space-y-1.5">{subs.length?subs.map(x=><div key={x.player_id} className="rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-white">{players.find(p=>p.id===x.player_id)?.name ?? x.club_players?.name ?? "Spieler"}</div>):<div className="text-xs text-white/30">Kein Ersatz</div>}</div></div></div>

          {isCaptain && !locked && (
            <div className="space-y-3 rounded-2xl border border-sky-300/10 bg-sky-500/[0.035] p-3">
              <div>
                <div className="text-sm font-black text-white">Team-Chat & Erinnerungen</div>
                <div className="mt-1 text-xs font-medium leading-5 text-white/45">
                  Spiel veröffentlichen, Team per Push informieren und offene Rückmeldungen direkt hier erinnern.
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={()=>void publishToTeamChat()}
                disabled={publishingChat}
                className="h-11 w-full rounded-xl border-sky-300/15 bg-sky-500/[0.07] font-black text-sky-100 hover:bg-sky-500/[0.12]"
              >
                {publishingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                {publishingChat ? "Wird veröffentlicht …" : "Im Team-Chat veröffentlichen"}
              </Button>

              {publishResult ? (
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/[0.08] px-3 py-2.5 text-center text-xs font-black text-emerald-200">
                  {publishResult}
                </div>
              ) : null}

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
                <div>
                  <div className="text-xs font-black text-white">Offene Rückmeldungen</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-white/40">
                    {openPlayerIds.length === 0 ? "Alle haben bereits geantwortet." : `${openPlayerIds.length} Spieler noch offen`}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={()=>void remindAllOpen()}
                  disabled={remindAllSending || openPlayerIds.length === 0}
                  className="h-9 rounded-xl border-orange-300/15 bg-orange-500/[0.07] px-3 text-xs font-black text-orange-100"
                >
                  {remindAllSending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1.5 h-3.5 w-3.5" />}
                  Alle erinnern
                </Button>
              </div>

              {remindAllResult ? (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-center text-xs font-bold text-white/65">
                  {remindAllResult}
                </div>
              ) : null}
            </div>
          )}

          {confirmResult ? (
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.08] p-3 text-center text-sm font-black text-emerald-200">
              {confirmResult}
            </div>
          ) : null}

          {isCaptain && !locked && <Button onClick={confirm} disabled={saving || starters.length<required} className="h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400 disabled:bg-white/10 disabled:text-white/25">{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<CheckCircle2 className="mr-2 h-4 w-4"/>}{saving ? "Wird bestätigt …" : confirmed ? "Änderungen bestätigen" : "Aufstellung bestätigen"}</Button>}
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DIST = 0.43;
const MIN_GAP = 0.08;
const limits = new Map<string, { hits: number; until: number }>();
const json = (payload: object, status = 200) => NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
const validVector = (v: unknown): v is number[] => Array.isArray(v) && v.length === 128 && v.every(x => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 10);
const d = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

export async function POST(req: NextRequest) {
  // Same-origin kiosk endpoint. Server checks all match permissions independently of client UI.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const expected = new URL(req.url);
      const submitted = new URL(origin);
      if (submitted.protocol !== "https:" || submitted.hostname !== expected.hostname) return json({ error: "Nicht erlaubt." }, 403);
    } catch { return json({ error: "Nicht erlaubt." }, 403); }
  }
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const state = limits.get(ip);
  if (!state || state.until < now) limits.set(ip, { hits: 1, until: now + 60_000 });
  else { if (state.hits >= 12) return json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, 429); state.hits++; }
  const body = await req.json().catch(() => null);
  const tournamentId = String(body?.tournament_id || "");
  const tournamentType = String(body?.tournament_type || "");
  const matchId = Number(body?.match_id);
  if (!validVector(body?.vector) || !/^[\da-f]{8}-[\da-f-]{27,}$/i.test(tournamentId) || !/^\d+er_dko$/.test(tournamentType) || !Number.isSafeInteger(matchId) || matchId <= 0) return json({ error: "Ungültige Matchdaten." }, 400);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Serverkonfiguration fehlt." }, 503);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: statuses, error: se } = await db.from("tournaments_status")
      .select("central_event_id,series_id,series_event_id,status")
      .eq("tournament_id", tournamentId).eq("tournament_type", tournamentType).eq("status", "active").limit(2);
    if (se || statuses?.length !== 1) return json({ error: "Kein aktives DKO-Turnier." }, 403);
    const status = statuses[0];
    if (status.series_id || status.series_event_id) return json({ error: "Face-ID-Sieg nur bei spontanen DKO-Turnieren." }, 403);
    if (status.central_event_id) {
      const { data: event, error: ee } = await db.from("central_tournament_events").select("is_spontaneous").eq("id", status.central_event_id).single();
      if (ee || event?.is_spontaneous !== true) return json({ error: "Kein spontanes Turnier." }, 403);
    }

    const { data: match, error: me } = await db.from("dko_match_states")
      .select("id,player1,player2,player1_id,player2_id,winner,machine_number")
      .eq("tournament_id", tournamentId).eq("tournament_type", tournamentType).eq("match_id", matchId).single();
    if (me || !match || match.winner || !match.machine_number || !match.player1_id || !match.player2_id) return json({ error: "Dieses Match ist nicht zur Bestätigung bereit." }, 409);

    const { data: profiles, error: pe } = await db.from("emd_face_profiles")
      .select("identity_kind,identity_id,player_id,spieldatenbank_id,vector");
    if (pe) return json({ error: "Face ID ist derzeit nicht verfügbar." }, 503);
    const ranked = (profiles || []).filter(p => validVector(p.vector)).map(p => ({ person: p, distance: d(p.vector as number[], body.vector) })).sort((a,b) => a.distance - b.distance);
    const first = ranked[0], second = ranked[1];
    if (!first || first.distance > MAX_DIST || (second && second.distance - first.distance < MIN_GAP)) return json({ error: "Gesicht nicht eindeutig erkannt. Bitte erneut versuchen." }, 403);
    if (first.person.identity_kind !== "member") return json({ error: "Nur registrierte DKO-Spieler können bestätigen." }, 403);
    const playerId = first.person.spieldatenbank_id;
    const side = playerId && String(playerId) === String(match.player1_id) ? 1 : playerId && String(playerId) === String(match.player2_id) ? 2 : 0;
    if (!side) return json({ error: "Das erkannte Gesicht gehört nicht zu dieser Paarung." }, 403);

    // Spontanes DKO wertet nur Sieg/Niederlage. 1:0 ist deshalb ein Platzhalter, keine Leg-Statistik.
    const { data: updated, error: ue } = await db.from("dko_match_states")
      .update({ score1: side === 1 ? 1 : 0, score2: side === 2 ? 1 : 0,
        winner: side === 1 ? match.player1 : match.player2,
        loser: side === 1 ? match.player2 : match.player1,
        machine_number: null, updated_at: new Date().toISOString() })
      .eq("id", match.id).is("winner", null).not("machine_number", "is", null).select("id");
    if (ue || updated?.length !== 1) return json({ error: "Match wurde bereits abgeschlossen oder konnte nicht gespeichert werden." }, 409);
    return json({ ok: true, winner: side === 1 ? match.player1 : match.player2, loser: side === 1 ? match.player2 : match.player1 });
  } catch { return json({ error: "Ergebnis konnte nicht gespeichert werden." }, 503); }
}

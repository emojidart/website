"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Car, Clock3, Loader2, MapPin, Plus, Trash2, UserRoundCheck, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Offer = {
  id: string;
  driver_user_id: string;
  driver_player_id: string;
  seats_total: number;
  meeting_point: string | null;
  departure_time: string | null;
  active: boolean;
  driver?: { id: string; name: string; photo_url: string | null } | null;
};

type Passenger = {
  id: string;
  offer_id: string;
  user_id: string;
  player_id: string;
  player?: { id: string; name: string; photo_url: string | null } | null;
};

type RideRequest = {
  id: string;
  user_id: string;
  player_id: string;
  active: boolean;
  player?: { id: string; name: string; photo_url: string | null } | null;
};

export default function ChatCarpool({
  matchId,
  teamId,
  locked = false,
}: {
  matchId: string;
  teamId: string;
  locked?: boolean;
}) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<{ player_id: string | null } | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [seats, setSeats] = useState(3);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [departureTime, setDepartureTime] = useState("");

  const uid = session?.user?.id ?? null;

  const sendCarpoolPush = async (
    action: "request" | "offer",
    extra?: { seats?: number; meeting_point?: string | null; departure_time?: string | null },
  ) => {
    if (!session?.access_token) return;

    try {
      await fetch("/api/push/carpool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action,
          match_id: matchId,
          team_id: teamId,
          seats: extra?.seats ?? null,
          meeting_point: extra?.meeting_point ?? null,
          departure_time: extra?.departure_time ?? null,
        }),
      });
    } catch (e) {
      // Fahrgemeinschaft muss gespeichert bleiben, auch wenn Push einmal fehlschlägt.
      console.error("carpool push failed", e);
    }
  };

  const load = useCallback(async () => {
    if (!uid) return;

    setLoading(true);
    try {
      const [{ data: p }, { data: offerRows }, { data: requestRows }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("match_carpool_offers")
          .select("id,driver_user_id,driver_player_id,seats_total,meeting_point,departure_time,active,driver:club_players!match_carpool_offers_driver_player_id_fkey(id,name,photo_url)")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("match_carpool_requests")
          .select("id,user_id,player_id,active,player:club_players!match_carpool_requests_player_id_fkey(id,name,photo_url)")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
      ]);

      const os = (offerRows as any[] ?? []) as Offer[];
      setProfile((p as any) ?? null);
      setOffers(os);
      setRequests((requestRows as any[] ?? []) as RideRequest[]);

      if (os.length) {
        const { data: pax } = await supabase
          .from("match_carpool_passengers")
          .select("id,offer_id,user_id,player_id,player:club_players!match_carpool_passengers_player_id_fkey(id,name,photo_url)")
          .in("offer_id", os.map((x) => x.id));
        setPassengers((pax as any[] ?? []) as Passenger[]);
      } else {
        setPassengers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [uid, matchId, teamId]);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel(`carpool-${matchId}-${teamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_carpool_offers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_carpool_passengers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_carpool_requests" }, () => void load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, matchId, teamId]);

  const myOffer = useMemo(
    () => offers.find((x) => x.driver_user_id === uid) ?? null,
    [offers, uid],
  );

  const myRequest = useMemo(
    () => requests.find((x) => x.user_id === uid) ?? null,
    [requests, uid],
  );

  const myPassenger = useMemo(
    () => passengers.find((x) => x.user_id === uid) ?? null,
    [passengers, uid],
  );

  const paxFor = (offerId: string) => passengers.filter((x) => x.offer_id === offerId);

  async function createOffer() {
    if (!uid || !profile?.player_id || locked || busy) return;
    setBusy("offer");
    try {
      if (myRequest) {
        await supabase.from("match_carpool_requests").update({ active: false, updated_at: new Date().toISOString() }).eq("id", myRequest.id);
      }
      if (myPassenger) {
        await supabase.from("match_carpool_passengers").delete().eq("id", myPassenger.id);
      }

      const { error } = await supabase.from("match_carpool_offers").insert({
        match_id: matchId,
        team_id: teamId,
        driver_user_id: uid,
        driver_player_id: profile.player_id,
        seats_total: seats,
        meeting_point: meetingPoint.trim() || null,
        departure_time: departureTime || null,
      });
      if (error) throw error;

      await sendCarpoolPush("offer", {
        seats,
        meeting_point: meetingPoint.trim() || null,
        departure_time: departureTime || null,
      });

      setShowOfferForm(false);
      setMeetingPoint("");
      setDepartureTime("");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function toggleNeedRide() {
    if (!uid || !profile?.player_id || locked || busy || myOffer) return;
    setBusy("request");
    try {
      if (myRequest) {
        await supabase
          .from("match_carpool_requests")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", myRequest.id);
      } else {
        if (myPassenger) {
          await supabase.from("match_carpool_passengers").delete().eq("id", myPassenger.id);
        }
        const { error } = await supabase.from("match_carpool_requests").insert({
          match_id: matchId,
          team_id: teamId,
          user_id: uid,
          player_id: profile.player_id,
          active: true,
        });
        if (error) throw error;
        await sendCarpoolPush("request");
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function joinOffer(offer: Offer) {
    if (!uid || !profile?.player_id || locked || busy || offer.driver_user_id === uid) return;

    const used = paxFor(offer.id).length;
    if (used >= offer.seats_total && myPassenger?.offer_id !== offer.id) return;

    setBusy(`join-${offer.id}`);
    try {
      if (myRequest) {
        await supabase.from("match_carpool_requests").update({ active: false, updated_at: new Date().toISOString() }).eq("id", myRequest.id);
      }

      if (myPassenger && myPassenger.offer_id !== offer.id) {
        await supabase.from("match_carpool_passengers").delete().eq("id", myPassenger.id);
      }

      if (myPassenger?.offer_id === offer.id) {
        await supabase.from("match_carpool_passengers").delete().eq("id", myPassenger.id);
      } else {
        const { error } = await supabase.from("match_carpool_passengers").insert({
          offer_id: offer.id,
          user_id: uid,
          player_id: profile.player_id,
        });
        if (error) throw error;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function removeOwnOffer() {
    if (!myOffer || locked || busy) return;
    setBusy("delete-offer");
    try {
      await supabase
        .from("match_carpool_offers")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", myOffer.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading && !offers.length && !requests.length) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 text-xs text-white/45">
        <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
        Fahrgemeinschaften werden geladen …
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-300/10 bg-sky-500/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/50">
            <Car className="h-4 w-4 text-sky-300" />
            Fahrgemeinschaft
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/35">
            Wer fährt · wer braucht einen Platz?
          </div>
        </div>
      </div>

      {offers.length ? (
        <div className="mt-3 space-y-2">
          {offers.map((offer) => {
            const pax = paxFor(offer.id);
            const free = Math.max(0, offer.seats_total - pax.length);
            const joined = myPassenger?.offer_id === offer.id;
            const own = offer.driver_user_id === uid;

            return (
              <div key={offer.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">
                      🚗 {offer.driver?.name || "Fahrer"} fährt
                    </div>
                    <div className="mt-1 text-xs font-semibold text-sky-200">
                      {free > 0 ? `${free} Platz${free === 1 ? "" : "plätze"} frei` : "Voll"}
                    </div>

                    {(offer.departure_time || offer.meeting_point) ? (
                      <div className="mt-2 space-y-1 text-[11px] font-semibold text-white/45">
                        {offer.departure_time ? (
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            Abfahrt {offer.departure_time} Uhr
                          </div>
                        ) : null}
                        {offer.meeting_point ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {offer.meeting_point}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {own ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={locked || !!busy}
                      onClick={() => void removeOwnOffer()}
                      className="h-8 rounded-lg border-red-300/15 bg-red-500/[0.06] px-2 text-[10px] font-black text-red-200"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Löschen
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={locked || !!busy || (free <= 0 && !joined) || !!myOffer}
                      onClick={() => void joinOffer(offer)}
                      className={`h-9 rounded-xl px-3 text-[11px] font-black ${
                        joined
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : "bg-sky-600 text-white hover:bg-sky-500"
                      }`}
                    >
                      {busy === `join-${offer.id}` ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
                      )}
                      {joined ? "Fahre mit ✓" : "Ich fahre mit"}
                    </Button>
                  )}
                </div>

                {pax.length ? (
                  <div className="mt-3 border-t border-white/[0.06] pt-2">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-white/30">
                      <UsersRound className="h-3.5 w-3.5" />
                      Mitfahrer
                    </div>
                    <div className="text-xs font-semibold text-white/65">
                      {pax.map((x) => x.player?.name || "Mitfahrer").join(" · ")}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] px-3 py-3 text-center text-xs font-semibold text-white/35">
          Noch niemand hat eine Fahrt angeboten.
        </div>
      )}

      {requests.length ? (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
            Brauchen Mitfahrt
          </div>
          <div className="flex flex-wrap gap-1.5">
            {requests.map((req) => (
              <span
                key={req.id}
                className="rounded-full border border-amber-300/10 bg-amber-500/[0.07] px-2.5 py-1 text-[11px] font-black text-amber-100"
              >
                🙋 {req.player?.name || "Spieler"} braucht Mitfahrt
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!locked && profile?.player_id ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!!busy || !!myOffer}
            onClick={() => setShowOfferForm((v) => !v)}
            className="h-10 rounded-xl border-sky-300/15 bg-sky-500/[0.06] px-2 text-[11px] font-black text-sky-100"
          >
            <Plus className="mr-1 h-4 w-4" />
            Fahrt anbieten
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!!busy || !!myOffer}
            onClick={() => void toggleNeedRide()}
            className={`h-10 rounded-xl px-2 text-[11px] font-black ${
              myRequest
                ? "border-amber-300/25 bg-amber-500/15 text-amber-100"
                : "border-white/10 bg-white/[0.03] text-white/60"
            }`}
          >
            {busy === "request" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {myRequest ? "Mitfahrt gesucht ✓" : "Ich brauche Mitfahrt"}
          </Button>
        </div>
      ) : null}

      {showOfferForm && !myOffer ? (
        <div className="mt-3 rounded-xl border border-sky-300/10 bg-black/20 p-3">
          <div className="text-xs font-black text-white">Fahrt anbieten</div>

          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-white/35">
              Freie Plätze
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSeats(n)}
                  className={`h-9 rounded-lg text-xs font-black ${
                    seats === n
                      ? "bg-sky-600 text-white"
                      : "border border-white/[0.07] bg-white/[0.03] text-white/55"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="border-white/10 bg-white/[0.04] text-white"
            />
            <Input
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="Treffpunkt, z. B. Vereinslokal"
              className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
            />
          </div>

          <Button
            type="button"
            disabled={!!busy}
            onClick={() => void createOffer()}
            className="mt-3 h-10 w-full rounded-xl bg-sky-600 text-xs font-black text-white hover:bg-sky-500"
          >
            {busy === "offer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Car className="mr-2 h-4 w-4" />}
            Fahrt veröffentlichen
          </Button>
        </div>
      ) : null}
    </div>
  );
}

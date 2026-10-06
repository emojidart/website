"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type LiveAlert = {
  id: string;
  created_at: string;
  expires_at: string;
  match_id: string | null;
  team_id: string | null;
  title: string;
  body: string;
  click_url: string | null;
  recipient_user_ids: string[] | null;
};

const STORAGE_KEY = "emd_messenger_lineup_alert_pending";

export default function ChatGlobalAlert({
  sectionKey,
  onOpenLineup,
}: {
  sectionKey: "chats" | "updates" | "lineup";
  onOpenLineup: (matchId: string | null, teamId: string | null) => void;
}) {
  const { session } = useAuth();
  const [alert, setAlert] = useState<LiveAlert | null>(null);

  const activeAlertRef = useRef<LiveAlert | null>(null);
  const dismissedSectionRef = useRef<string | null>(null);
  const suppressNextSectionRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sirenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSiren = useCallback(() => {
    if (sirenTimerRef.current) {
      clearInterval(sirenTimerRef.current);
      sirenTimerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }

    try {
      oscillatorRef.current?.stop();
    } catch {}
    try {
      oscillatorRef.current?.disconnect();
      gainRef.current?.disconnect();
    } catch {}

    oscillatorRef.current = null;
    gainRef.current = null;

    try {
      navigator.vibrate?.(0);
    } catch {}
  }, []);

  const startSiren = useCallback(async () => {
    stopSiren();

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        const ctx = audioContextRef.current ?? new AudioCtx();
        audioContextRef.current = ctx;

        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(760, ctx.currentTime);
        gain.gain.setValueAtTime(0.16, ctx.currentTime);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();

        oscillatorRef.current = oscillator;
        gainRef.current = gain;

        let high = false;
        sirenTimerRef.current = setInterval(() => {
          if (!audioContextRef.current || !oscillatorRef.current) return;
          high = !high;
          const now = audioContextRef.current.currentTime;
          oscillatorRef.current.frequency.cancelScheduledValues(now);
          oscillatorRef.current.frequency.linearRampToValueAtTime(high ? 1120 : 680, now + 0.28);
        }, 320);
      }
    } catch {
      // Visueller Alarm bleibt sichtbar, auch wenn WebAudio blockiert wird.
    }

    try {
      navigator.vibrate?.([500, 180, 500, 180, 1000, 250, 1000]);
    } catch {}

    // Nur der Ton endet automatisch. Der Alarm selbst bleibt aktiv,
    // bis die Aufstellung in Supabase bestätigt wurde.
    autoStopRef.current = setTimeout(stopSiren, 20000);
  }, [stopSiren]);

  const persistAlert = useCallback((next: LiveAlert | null) => {
    activeAlertRef.current = next;
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  const isLineupConfirmed = useCallback(async (next: LiveAlert) => {
    if (!next.match_id || !next.team_id) return false;

    const { data, error } = await supabase
      .from("match_lineup_headers")
      .select("status,current_version,confirmed_version")
      .eq("match_id", next.match_id)
      .eq("team_id", next.team_id)
      .maybeSingle();

    if (error) {
      // Fail-open: Bei einem kurzen DB-Fehler darf ein echter Alarm nicht verschwinden.
      return false;
    }

    return (
      data?.status === "confirmed" &&
      data?.confirmed_version != null &&
      data?.confirmed_version === data?.current_version
    );
  }, []);

  const clearResolvedAlert = useCallback(() => {
    stopSiren();
    setAlert(null);
    persistAlert(null);
    dismissedSectionRef.current = null;
    suppressNextSectionRef.current = null;
  }, [persistAlert, stopSiren]);

  const showIfStillActive = useCallback(
    async (next: LiveAlert, force = false) => {
      if (!next?.id) return;

      const confirmed = await isLineupConfirmed(next);
      if (confirmed) {
        clearResolvedAlert();
        return;
      }

      persistAlert(next);

      if (!force && dismissedSectionRef.current === sectionKey) {
        return;
      }

      setAlert(next);
      void startSiren();
    },
    [clearResolvedAlert, isLineupConfirmed, persistAlert, sectionKey, startSiren],
  );

  // Initial laden: zuerst lokaler Pending-Alarm, danach Supabase als Fallback.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;

    let cancelled = false;

    const loadPending = async () => {
      let stored: LiveAlert | null = null;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        stored = raw ? (JSON.parse(raw) as LiveAlert) : null;
      } catch {}

      if (stored?.id) {
        if (!cancelled) await showIfStillActive(stored, true);
        return;
      }

      const { data } = await supabase
        .from("emd_live_alerts")
        .select("id,created_at,expires_at,match_id,team_id,title,body,click_url,recipient_user_ids")
        .contains("recipient_user_ids", [uid])
        .order("created_at", { ascending: false })
        .limit(20);

      for (const row of (data as LiveAlert[] | null) ?? []) {
        if (cancelled) return;
        const confirmed = await isLineupConfirmed(row);
        if (!confirmed) {
          persistAlert(row);
          await showIfStillActive(row, true);
          return;
        }
      }
    };

    void loadPending();

    const liveChannel = supabase
      .channel(`emd-live-alert-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emd_live_alerts" },
        (payload) => {
          const next = payload.new as LiveAlert;
          const recipients = Array.isArray(next?.recipient_user_ids)
            ? next.recipient_user_ids
            : [];

          if (!recipients.includes(uid)) return;

          dismissedSectionRef.current = null;
          suppressNextSectionRef.current = null;
          void showIfStillActive(next, true);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(liveChannel);
    };
  }, [
    isLineupConfirmed,
    persistAlert,
    session?.user?.id,
    showIfStillActive,
  ]);

  // Genau das gewünschte Verhalten:
  // nach "Alarm bestätigen" ist er auf der aktuellen Seite weg,
  // beim nächsten Wechsel Chats/Aktuell/Aufstellung kommt er wieder,
  // solange die echte Aufstellung nicht bestätigt wurde.
  useEffect(() => {
    const pending = activeAlertRef.current;
    if (!pending) return;

    if (suppressNextSectionRef.current === sectionKey) {
      suppressNextSectionRef.current = null;
      dismissedSectionRef.current = sectionKey;
      return;
    }

    if (dismissedSectionRef.current !== sectionKey) {
      dismissedSectionRef.current = null;
      void showIfStillActive(pending, true);
    }
  }, [sectionKey, showIfStillActive]);

  // Sobald Captain/Co-Captain die Aufstellung wirklich bestätigt,
  // verschwindet der Alarm endgültig. Polling ist absichtlich zusätzlich
  // zu Realtime drin, damit das auch bei einer verpassten Realtime-Nachricht klappt.
  useEffect(() => {
    const check = async () => {
      const pending = activeAlertRef.current;
      if (!pending) return;

      if (await isLineupConfirmed(pending)) {
        clearResolvedAlert();
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), 5000);

    const headerChannel = supabase
      .channel(`emd-alert-header-${session?.user?.id || "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineup_headers" },
        (payload) => {
          const pending = activeAlertRef.current;
          const row = (payload.new || payload.old) as {
            match_id?: string;
            team_id?: string;
          };

          if (
            pending?.match_id &&
            pending?.team_id &&
            row?.match_id === pending.match_id &&
            row?.team_id === pending.team_id
          ) {
            void check();
          }
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(headerChannel);
    };
  }, [clearResolvedAlert, isLineupConfirmed, session?.user?.id]);

  // Component-Unmount: nur Sirene stoppen. Pending-Alarm bleibt gespeichert.
  useEffect(() => {
    return () => stopSiren();
  }, [stopSiren]);

  if (!alert) return null;

  const acknowledge = () => {
    stopSiren();
    dismissedSectionRef.current = sectionKey;
    setAlert(null);
  };

  const openTarget = () => {
    stopSiren();

    // Beim direkten Sprung zur Aufstellung nicht sofort denselben Dialog
    // noch einmal darüber legen. Beim NÄCHSTEN Seitenwechsel erscheint er wieder,
    // falls die Aufstellung weiterhin unbestätigt ist.
    suppressNextSectionRef.current = "lineup";
    dismissedSectionRef.current = sectionKey;
    setAlert(null);

    onOpenLineup(alert.match_id, alert.team_id);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border-2 border-red-300/40 bg-gradient-to-b from-red-600 via-red-700 to-[#260507] p-1 shadow-[0_0_80px_rgba(239,68,68,.65)]">
        <div className="absolute inset-0 animate-pulse bg-red-400/10" />

        <div className="relative rounded-[26px] border border-white/15 bg-black/20 px-5 py-7 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 shadow-[0_0_35px_rgba(255,255,255,.18)]">
            <BellRing className="h-10 w-10 animate-pulse text-white" />
          </div>

          <div className="mt-5 text-[11px] font-black uppercase tracking-[0.34em] text-red-100/75">
            EMD NOTFALL-ALARM
          </div>

          <div className="mt-2 text-3xl font-black tracking-tight text-white">
            {alert.title || "🚨 EMD ALERT"}
          </div>

          <div className="mx-auto mt-4 max-w-sm whitespace-pre-line text-[15px] font-bold leading-6 text-white/90">
            {alert.body}
          </div>

          <div className="mt-6 grid gap-2">
            <Button
              type="button"
              onClick={acknowledge}
              className="h-14 rounded-2xl bg-white text-base font-black text-red-700 hover:bg-red-50"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              ALARM BESTÄTIGEN
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={openTarget}
              className="h-12 rounded-2xl border-white/25 bg-white/5 font-black text-white hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Jetzt zur Aufstellung
            </Button>
          </div>

          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
            Bleibt aktiv bis die Aufstellung bestätigt wurde
          </div>
        </div>
      </div>
    </div>
  );
}

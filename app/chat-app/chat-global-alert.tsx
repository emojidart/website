"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type LiveAlert = {
  id: string;
  created_at: string;
  expires_at: string;
  title: string;
  body: string;
  click_url: string | null;
  recipient_user_ids: string[] | null;
};

export default function ChatGlobalAlert() {
  const { session } = useAuth();
  const [alert, setAlert] = useState<LiveAlert | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sirenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSiren = () => {
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
  };

  const startSiren = async () => {
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
      // Der visuelle Alarm bleibt immer sichtbar, auch wenn Audio blockiert wird.
    }

    try {
      navigator.vibrate?.([500, 180, 500, 180, 1000, 250, 1000]);
    } catch {}

    autoStopRef.current = setTimeout(stopSiren, 20000);
  };

  const showAlert = (next: LiveAlert) => {
    if (!next?.id) return;
    if (new Date(next.expires_at).getTime() <= Date.now()) return;
    setAlert(next);
    void startSiren();
  };

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;

    let cancelled = false;

    const loadLatest = async () => {
      const { data } = await supabase
        .from("emd_live_alerts")
        .select("id,created_at,expires_at,title,body,click_url,recipient_user_ids")
        .contains("recipient_user_ids", [uid])
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && data) showAlert(data as LiveAlert);
    };

    void loadLatest();

    const channel = supabase
      .channel(`emd-live-alert-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emd_live_alerts" },
        (payload) => {
          const next = payload.new as LiveAlert;
          const recipients = Array.isArray(next?.recipient_user_ids)
            ? next.recipient_user_ids
            : [];
          if (recipients.includes(uid)) showAlert(next);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      stopSiren();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  if (!alert) return null;

  const confirm = () => {
    stopSiren();
    setAlert(null);
  };

  const openTarget = () => {
    const target = alert.click_url || "/chat-app?tab=aufstellung";
    stopSiren();
    setAlert(null);
    window.location.href = target;
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
              onClick={confirm}
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
              Aufstellung öffnen
            </Button>
          </div>

          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
            Alarmton stoppt spätestens nach 20 Sekunden
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Mic2 } from "lucide-react";

const fmt = (seconds: number) => {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const parseStoredDuration = (attachmentName?: string | null) => {
  if (!attachmentName) return 0;

  // Gespeichert wird z. B. "Sprachnachricht · 0:07".
  const match = attachmentName.match(/(\d+):(\d{2})\s*$/);
  if (!match) return 0;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0;

  return Math.max(0, minutes * 60 + seconds);
};

export default function ChatVoiceMessage({
  src,
  own = false,
  attachmentName,
}: {
  src: string;
  own?: boolean;
  attachmentName?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const storedDuration = useMemo(
    () => parseStoredDuration(attachmentName),
    [attachmentName],
  );

  // WebM liefert in Android WebView bei kurzen Aufnahmen öfter 0, Infinity
  // oder einen falschen Duration-Wert. Für die Anzeige vertrauen wir deshalb
  // zuerst auf die beim Senden gespeicherte Aufnahmezeit.
  const displayDuration =
    storedDuration > 0
      ? storedDuration
      : Number.isFinite(mediaDuration) && mediaDuration > 0
        ? mediaDuration
        : 0;

  const seekDuration =
    Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : displayDuration;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      const value = audio.duration;

      if (Number.isFinite(value) && value > 0) {
        setMediaDuration(value);
        return;
      }

      // Android/WebM-Fallback: Ende des seekable Bereichs ist oft korrekt,
      // auch wenn audio.duration 0 oder Infinity liefert.
      try {
        if (audio.seekable?.length) {
          const end = audio.seekable.end(audio.seekable.length - 1);
          if (Number.isFinite(end) && end > 0) {
            setMediaDuration(end);
          }
        }
      } catch {}
    };

    const time = () => setCurrent(audio.currentTime || 0);
    const ended = () => {
      setPlaying(false);
      setCurrent(0);
    };

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("canplay", syncDuration);
    audio.addEventListener("progress", syncDuration);
    audio.addEventListener("timeupdate", time);
    audio.addEventListener("ended", ended);

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("canplay", syncDuration);
      audio.removeEventListener("progress", syncDuration);
      audio.removeEventListener("timeupdate", time);
      audio.removeEventListener("ended", ended);
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {}
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !seekDuration) return;

    const clamped = Math.max(0, Math.min(value, seekDuration));

    try {
      audio.currentTime = clamped;
      setCurrent(clamped);
    } catch {}
  };

  return (
    <div className="min-w-[235px] max-w-[285px] py-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            own
              ? "bg-white/15 text-white hover:bg-white/20"
              : "bg-orange-500/15 text-orange-200 hover:bg-orange-500/20"
          }`}
          aria-label={playing ? "Pause" : "Abspielen"}
        >
          {playing ? (
            <Pause className="h-4.5 w-4.5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4.5 w-4.5 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(seekDuration, 1)}
            step={0.05}
            value={Math.min(current, Math.max(seekDuration, 1))}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-orange-400"
            aria-label="Sprachnachricht Position"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-white/45">
            <span>{fmt(current)}</span>
            <span className="inline-flex items-center gap-1">
              <Mic2 className="h-3 w-3" />
              {fmt(displayDuration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

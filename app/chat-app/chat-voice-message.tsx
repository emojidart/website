"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Mic2 } from "lucide-react";

const fmt = (seconds: number) => {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function ChatVoiceMessage({
  src,
  own = false,
}: {
  src: string;
  own?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const loaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const time = () => setCurrent(audio.currentTime || 0);
    const ended = () => {
      setPlaying(false);
      setCurrent(0);
    };

    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("durationchange", loaded);
    audio.addEventListener("timeupdate", time);
    audio.addEventListener("ended", ended);

    return () => {
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("durationchange", loaded);
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
    if (!audio || !duration) return;
    audio.currentTime = value;
    setCurrent(value);
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
          {playing ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="ml-0.5 h-4.5 w-4.5 fill-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.05}
            value={Math.min(current, Math.max(duration, 1))}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-orange-400"
            aria-label="Sprachnachricht Position"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-white/45">
            <span>{fmt(current)}</span>
            <span className="inline-flex items-center gap-1">
              <Mic2 className="h-3 w-3" />
              {fmt(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

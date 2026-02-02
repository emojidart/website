"use client"

import React, { useEffect, useMemo, useState } from "react"

type VoiceRow = SpeechSynthesisVoice

export default function VoicesPage() {
  const [supported, setSupported] = useState(false)
  const [voices, setVoices] = useState<VoiceRow[]>([])
  const [query, setQuery] = useState("")
  const [onlyGerman, setOnlyGerman] = useState(true)

  const [rate, setRate] = useState(0.92)
  const [pitch, setPitch] = useState(0.75)
  const [volume, setVolume] = useState(1)

  const [text, setText] = useState(
    "Zweiter Aufruf. Max Mustermann gegen Erika Musterfrau auf Automat 7.",
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("speechSynthesis" in window)) return

    setSupported(true)

    const load = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      console.log(
        "[voices] loaded:",
        v.map((x) => `${x.name} | ${x.lang} | ${x.voiceURI}`),
      )
    }

    // First load
    load()

    // Some browsers populate async
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return voices
      .filter((v) => {
        if (onlyGerman && !v.lang.toLowerCase().startsWith("de")) return false
        if (!q) return true
        return (
          v.name.toLowerCase().includes(q) ||
          v.lang.toLowerCase().includes(q) ||
          (v.voiceURI ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        // Prefer de-DE first, then alphabetical
        const aDeDE = a.lang === "de-DE" ? 0 : 1
        const bDeDE = b.lang === "de-DE" ? 0 : 1
        if (aDeDE !== bDeDE) return aDeDE - bDeDE
        return a.name.localeCompare(b.name)
      })
  }, [voices, query, onlyGerman])

  const speakWith = (voice: SpeechSynthesisVoice) => {
    if (!supported) return
    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(text)
    u.lang = voice.lang || "de-DE"
    u.voice = voice
    u.rate = rate
    u.pitch = pitch
    u.volume = volume

    window.speechSynthesis.speak(u)
  }

  const stop = () => {
    if (!supported) return
    window.speechSynthesis.cancel()
  }

  if (!supported) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Stimmen testen</h1>
        <p>
          Dein Browser unterstützt <code>speechSynthesis</code> leider nicht.
          Bitte teste in Chrome/Edge/Safari.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Stimmen testen</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={onlyGerman}
            onChange={(e) => setOnlyGerman(e.target.checked)}
          />
          Nur Deutsch (de-*)
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Suche (Name / Sprache):</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='z.B. "Google", "de-DE", "Anna" …'
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Text zum Testen:</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Rate: {rate.toFixed(2)}</span>
            <input
              type="range"
              min={0.5}
              max={1.2}
              step={0.01}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Pitch: {pitch.toFixed(2)}</span>
            <input
              type="range"
              min={0.3}
              max={1.6}
              step={0.01}
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Volume: {volume.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={stop}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Stop
          </button>

          <span style={{ opacity: 0.8 }}>
            Gefundene Stimmen: <b>{filtered.length}</b> / {voices.length}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((v) => (
          <div
            key={v.voiceURI}
            style={{
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 12,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 700 }}>{v.name}</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                <span>Lang: {v.lang}</span>
                {" · "}
                <span>Default: {v.default ? "ja" : "nein"}</span>
                {" · "}
                <span>Local: {v.localService ? "ja" : "nein"}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
                URI: {v.voiceURI}
              </div>
            </div>

            <button
              onClick={() => speakWith(v)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ▶ Anhören
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

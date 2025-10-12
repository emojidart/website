"use client"

import { useEffect, useState, useCallback } from "react"

interface SpeechAnnouncerProps {
  enabled: boolean
}

export function useSpeechAnnouncer({ enabled }: SpeechAnnouncerProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
        console.log(
          "[v0] Available voices:",
          availableVoices.map((v) => v.name),
        )
      }

      // Load voices immediately
      loadVoices()

      // Also listen for voiceschanged event (some browsers need this)
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices)

      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
      }
    }
  }, [])

  const announce = useCallback(
    (player1: string, player2: string, machineNumber: number, callNumber = 1) => {
      if (!enabled || !isSupported) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      let text = `${player1} gegen ${player2} auf Automat ${machineNumber}`
      if (callNumber === 2) {
        text = `Zweiter Aufruf. ${text}`
      } else if (callNumber === 3) {
        text = `Letzter Aufruf. ${text}`
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "de-DE"
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const germanVoice =
        voices.find((voice) => voice.name.includes("Google Deutsch")) ||
        voices.find((voice) => voice.name.includes("Google") && voice.lang === "de-DE") ||
        voices.find((voice) => voice.lang === "de-DE" && !voice.name.includes("Hedda")) ||
        voices.find((voice) => voice.lang.startsWith("de") && !voice.name.includes("Hedda")) ||
        voices.find((voice) => voice.lang === "de-DE") ||
        voices.find((voice) => voice.lang.startsWith("de"))

      if (germanVoice) {
        utterance.voice = germanVoice
        console.log("[v0] Using voice:", germanVoice.name)
      } else {
        console.log("[v0] No German voice found, using default")
      }

      window.speechSynthesis.speak(utterance)
    },
    [enabled, isSupported, voices],
  )

  return { announce, isSupported }
}

export function SpeechAnnouncerSettings({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="speech-enabled"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
      />
      <label htmlFor="speech-enabled" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
        Ansagen aktivieren
      </label>
    </div>
  )
}

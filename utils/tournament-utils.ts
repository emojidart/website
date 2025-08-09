import type { Board } from "@/types/tournament"

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function getDefaultLives(ligastatus: string): number {
  switch (ligastatus) {
    case "A":
      return 3
    case "B":
      return 3
    case "C":
      return 3
    default:
      return 3
  }
}

export function calculatePrizeMoney(
  entryFee: number,
  paidPlayersCount: number,
  percentages: number[],
): { totalPrizeMoney: number; distribution: { place: number; amount: number }[] } {
  const totalPrizeMoney = entryFee * paidPlayersCount
  const distribution = percentages.map((percentage, index) => ({
    place: index + 1,
    amount: Number.parseFloat(((totalPrizeMoney * percentage) / 100).toFixed(2)),
  }))
  return { totalPrizeMoney, distribution }
}

export function createBoard(id: number): Board {
  return {
    id: id,
    players: [],
    startTime: null,
    timer: null,
  }
}

export function speakText(text: string, speechEnabled: boolean) {
  if (!speechEnabled || !("speechSynthesis" in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)

  const allVoices = window.speechSynthesis.getVoices()

  const germanVoices = allVoices.filter(
    (voice) =>
      voice.lang.startsWith("de") ||
      voice.name.toLowerCase().includes("german") ||
      voice.name.toLowerCase().includes("deutsch"),
  )

  let selectedVoice: SpeechSynthesisVoice | null = null

  selectedVoice = germanVoices.find(
    (voice) => voice.name.toLowerCase().includes("google") && voice.name.toLowerCase().includes("rewin"),
  )

  if (!selectedVoice) {
    selectedVoice = germanVoices.find(
      (voice) => voice.name.toLowerCase().includes("google") && !voice.name.toLowerCase().includes("hedda"),
    )
  }

  if (!selectedVoice) {
    selectedVoice = germanVoices.find(
      (voice) => voice.name.toLowerCase().includes("microsoft") && !voice.name.toLowerCase().includes("hedda"),
    )
  }

  if (!selectedVoice && germanVoices.length > 0) {
    selectedVoice = germanVoices.find((voice) => !voice.name.toLowerCase().includes("hedda"))
  }

  if (!selectedVoice && allVoices.length > 0) {
    selectedVoice = allVoices.find((voice) => !voice.name.toLowerCase().includes("hedda"))
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice
  }

  utterance.rate = 1.0
  utterance.pitch = 1.0
  utterance.volume = 1.0

  utterance.onerror = (event) => {
    console.error("Sprachausgabe Fehler:", event.error)
  }

  window.speechSynthesis.speak(utterance)
}

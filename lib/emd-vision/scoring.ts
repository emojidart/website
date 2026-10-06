export type VisionHit = {
  label: string
  score: number
  multiplier: number
  sector: number | null
  ring: "single" | "double" | "triple" | "single_bull" | "double_bull" | "miss"
  x: number
  y: number
  confidence: number
}

const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

export function scoreNormalized(x: number, y: number, confidence = 1): VisionHit {
  const r = Math.hypot(x, y)

  if (r > 1.06) {
    return { label: "MISS", score: 0, multiplier: 0, sector: null, ring: "miss", x, y, confidence }
  }

  const bullInner = 6.35 / 170
  const bullOuter = 15.9 / 170
  const tripleInner = 99 / 170
  const tripleOuter = 107 / 170
  const doubleInner = 162 / 170
  const doubleOuter = 1

  if (r <= bullInner) {
    return { label: "DBULL", score: 50, multiplier: 2, sector: 25, ring: "double_bull", x, y, confidence }
  }
  if (r <= bullOuter) {
    return { label: "BULL", score: 25, multiplier: 1, sector: 25, ring: "single_bull", x, y, confidence }
  }

  const angle = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360
  const idx = Math.floor((angle + 9) / 18) % 20
  const sector = SECTORS[idx]

  if (r >= tripleInner && r <= tripleOuter) {
    return { label: `T${sector}`, score: sector * 3, multiplier: 3, sector, ring: "triple", x, y, confidence }
  }

  if (r >= doubleInner && r <= doubleOuter) {
    return { label: `D${sector}`, score: sector * 2, multiplier: 2, sector, ring: "double", x, y, confidence }
  }

  if (r <= doubleOuter) {
    return { label: `S${sector}`, score: sector, multiplier: 1, sector, ring: "single", x, y, confidence }
  }

  return { label: "MISS", score: 0, multiplier: 0, sector: null, ring: "miss", x, y, confidence }
}

export function hitFromLabel(label: string): VisionHit {
  const value = label.toUpperCase().trim()

  if (value === "DBULL") return { label: value, score: 50, multiplier: 2, sector: 25, ring: "double_bull", x: 0, y: 0, confidence: 1 }
  if (value === "BULL") return { label: value, score: 25, multiplier: 1, sector: 25, ring: "single_bull", x: 0, y: 0, confidence: 1 }
  if (value === "MISS") return { label: value, score: 0, multiplier: 0, sector: null, ring: "miss", x: 0, y: 0, confidence: 1 }

  const match = /^([STD])(\d{1,2})$/.exec(value)
  if (!match) return { label: "MISS", score: 0, multiplier: 0, sector: null, ring: "miss", x: 0, y: 0, confidence: 1 }

  const sector = Number(match[2])
  const multiplier = match[1] === "T" ? 3 : match[1] === "D" ? 2 : 1
  const ring = multiplier === 3 ? "triple" : multiplier === 2 ? "double" : "single"

  return {
    label: `${match[1]}${sector}`,
    score: sector * multiplier,
    multiplier,
    sector,
    ring,
    x: 0,
    y: 0,
    confidence: 1,
  }
}

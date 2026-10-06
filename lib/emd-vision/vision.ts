import { scoreNormalized, type VisionHit } from "./scoring"

export type Point = { x: number; y: number }

export type Calibration = {
  center: Point
  top: Point
  right: Point
  bottom: Point
  left: Point
  width: number
  height: number
  savedAt: number
}

export type DetectionResult = {
  hit: VisionHit
  pixel: Point
  changedRatio: number
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function grayAt(data: Uint8ClampedArray, index: number) {
  return (data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114)
}

export function sceneDifference(
  a: ImageData,
  b: ImageData,
  threshold = 30,
): { ratio: number; points: Point[] } {
  const points: Point[] = []
  let changed = 0
  const step = 2

  for (let y = 0; y < a.height; y += step) {
    for (let x = 0; x < a.width; x += step) {
      const i = (y * a.width + x) * 4
      const d = Math.abs(grayAt(a.data, i) - grayAt(b.data, i))
      if (d >= threshold) {
        changed++
        points.push({ x, y })
      }
    }
  }

  const total = Math.ceil(a.width / step) * Math.ceil(a.height / step)
  return { ratio: total ? changed / total : 0, points }
}

export function estimateBoardPoint(
  calibration: Calibration,
  pixel: Point,
): Point {
  const c = calibration.center

  const rx = (
    distance(c, calibration.left) +
    distance(c, calibration.right)
  ) / 2

  const ry = (
    distance(c, calibration.top) +
    distance(c, calibration.bottom)
  ) / 2

  return {
    x: rx ? (pixel.x - c.x) / rx : 0,
    y: ry ? (pixel.y - c.y) / ry : 0,
  }
}

export function detectDart(
  previous: ImageData,
  current: ImageData,
  calibration: Calibration,
  lastTip: Point | null,
): DetectionResult | null {
  const diff = sceneDifference(previous, current, 28)

  // Large changes are usually a hand/body or camera movement.
  if (diff.ratio < 0.00025 || diff.ratio > 0.045 || diff.points.length < 12) {
    return null
  }

  const c = calibration.center
  const rx = (distance(c, calibration.left) + distance(c, calibration.right)) / 2
  const ry = (distance(c, calibration.top) + distance(c, calibration.bottom)) / 2

  const boardPoints = diff.points.filter((p) => {
    const nx = rx ? (p.x - c.x) / rx : 99
    const ny = ry ? (p.y - c.y) / ry : 99
    return Math.hypot(nx, ny) <= 1.1
  })

  if (boardPoints.length < 10) return null

  // A dart enters from outside and the tip is the changed point closest to Bull.
  // Use the lower percentile instead of a single noisy pixel.
  const sorted = boardPoints
    .map((p) => ({ p, d: distance(p, c) }))
    .sort((a, b) => a.d - b.d)

  const shortlist = sorted.slice(0, Math.max(4, Math.ceil(sorted.length * 0.08)))
  const pixel = {
    x: shortlist.reduce((sum, item) => sum + item.p.x, 0) / shortlist.length,
    y: shortlist.reduce((sum, item) => sum + item.p.y, 0) / shortlist.length,
  }

  if (lastTip && distance(pixel, lastTip) < Math.max(8, current.width * 0.012)) {
    return null
  }

  const normalized = estimateBoardPoint(calibration, pixel)
  const confidence = Math.max(0.35, Math.min(0.93, 0.55 + Math.min(boardPoints.length / 900, 0.3)))
  const hit = scoreNormalized(normalized.x, normalized.y, confidence)

  return { hit, pixel, changedRatio: diff.ratio }
}

export function referenceSimilarity(reference: ImageData, current: ImageData) {
  return sceneDifference(reference, current, 26).ratio
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Camera, FileImage, Loader2, ScanLine, RotateCcw, AlertTriangle } from "lucide-react"
import jsQR from "jsqr"

const HEADERS = [
  "LEGS W", "LEGS L", "20", "19", "18", "17", "16", "15", "BULL", "180", "171", "H. TONNE", "TONNE", "SHANG", "95+", "<26", "<30", "SEMP",
] as const

type TeamMembership = {
  team_id: string
  role: string | null
  teams: { id: string; name: string } | null
}

type TeamMember = {
  player_id: string
  club_players: { id: string; name: string } | null
}

type ScanRow = {
  rowIndex: number
  rawName: string
  matchedPlayerId: string
  matchedPlayerName: string
  matchConfidence: number
  values: Record<string, number>
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function levenshtein(a: string, b: string) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function similarity(a: string, b: string) {
  const aa = normalizeName(a)
  const bb = normalizeName(b)
  if (!aa || !bb) return 0
  const dist = levenshtein(aa, bb)
  return Math.max(0, 1 - dist / Math.max(aa.length, bb.length, 1))
}


type SheetQrPayload = {
  teamToken: string
  playerTokens: string[]
}

function compactId(id: string) {
  return String(id || "").replace(/-/g, "").toLowerCase().slice(0, 10)
}

function parseSheetQr(text: string | null | undefined): SheetQrPayload | null {
  const raw = String(text || "").trim()
  if (!raw.startsWith("DPSTAT2|")) return null
  const parts = raw.split("|")
  if (parts.length !== 3) return null
  const teamToken = parts[1]?.trim().toLowerCase()
  const playerTokens = (parts[2] || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)
  if (!teamToken || !playerTokens.length) return null
  return { teamToken, playerTokens }
}

function readQr(canvas: HTMLCanvasElement): SheetQrPayload | null {
  const tryCanvas = (c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d", { willReadFrequently: true })!
    const img = ctx.getImageData(0, 0, c.width, c.height)
    const code = jsQR(new Uint8ClampedArray(img.data), img.width, img.height, { inversionAttempts: "attemptBoth" })
    return parseSheetQr(code?.data)
  }

  const full = tryCanvas(canvas)
  if (full) return full

  // QR sitzt oben rechts. Für A4-Screenshots separat vergrößern.
  const crop = document.createElement("canvas")
  crop.width = Math.max(1, Math.round(canvas.width * 0.45 * 4))
  crop.height = Math.max(1, Math.round(canvas.height * 0.42 * 4))
  const ctx = crop.getContext("2d", { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    canvas,
    Math.floor(canvas.width * 0.55),
    0,
    Math.ceil(canvas.width * 0.45),
    Math.ceil(canvas.height * 0.42),
    0,
    0,
    crop.width,
    crop.height,
  )
  return tryCanvas(crop)
}

function resolveQr(
  payload: SheetQrPayload,
  memberships: TeamMembership[],
  members: any[],
) {
  const teamMatches = memberships.filter((m) => compactId(m.team_id) === payload.teamToken)
  if (teamMatches.length !== 1) return null
  const teamId = teamMatches[0].team_id
  const teamMembers = members.filter((m: any) => m.team_id === teamId)
  const playerIds: string[] = []

  for (const token of payload.playerTokens) {
    const matches = teamMembers.filter((m: any) => compactId(m.player_id) === token)
    if (matches.length !== 1) return null
    playerIds.push(matches[0].player_id)
  }

  return { teamId, playerIds }
}


type MarkerPoint = { x: number; y: number; size: number; score: number }
type MarkerQuad = { tl: MarkerPoint; tr: MarkerPoint; br: MarkerPoint; bl: MarkerPoint }

function downscaleCanvas(source: HTMLCanvasElement, maxDimension = 1800) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height))
  if (scale === 1) return { canvas: source, scale: 1 }
  const out = document.createElement("canvas")
  out.width = Math.max(1, Math.round(source.width * scale))
  out.height = Math.max(1, Math.round(source.height * scale))
  const ctx = out.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, out.width, out.height)
  return { canvas: out, scale }
}

function detectCornerMarkers(source: HTMLCanvasElement): MarkerQuad | null {
  const { canvas, scale } = downscaleCanvas(source)
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { width, height, data } = img
  const stride = width + 1
  const integral = new Uint32Array((width + 1) * (height + 1))

  for (let y = 1; y <= height; y++) {
    let row = 0
    for (let x = 1; x <= width; x++) {
      const i = ((y - 1) * width + (x - 1)) * 4
      const dark = data[i] < 145 && data[i + 1] < 145 && data[i + 2] < 145 ? 1 : 0
      row += dark
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row
    }
  }

  const areaSum = (x: number, y: number, w: number, h: number) => {
    const x2 = x + w
    const y2 = y + h
    return integral[y2 * stride + x2] - integral[y * stride + x2] - integral[y2 * stride + x] + integral[y * stride + x]
  }

  const candidates: MarkerPoint[] = []
  const minSide = Math.max(6, Math.round(Math.min(width, height) * 0.006))
  const maxSide = Math.max(minSide + 3, Math.round(Math.min(width, height) * 0.05))

  for (let side = minSide; side <= maxSide; side += Math.max(2, Math.round(minSide / 3))) {
    const step = Math.max(2, Math.round(side / 4))
    const required = side * side * 0.68
    for (let y = 0; y <= height - side; y += step) {
      for (let x = 0; x <= width - side; x += step) {
        const sum = areaSum(x, y, side, side)
        if (sum < required) continue
        const density = sum / (side * side)
        candidates.push({ x: x + side / 2, y: y + side / 2, size: side, score: density * side })
      }
    }
  }

  if (candidates.length < 4) return null
  candidates.sort((a, b) => b.score - a.score)
  const picked: MarkerPoint[] = []
  for (const c of candidates) {
    if (picked.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < Math.max(p.size, c.size) * 1.8)) continue
    picked.push(c)
    if (picked.length >= 36) break
  }
  if (picked.length < 4) return null

  let best: MarkerQuad | null = null
  let bestScore = -Infinity
  const n = Math.min(picked.length, 28)
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
    const pts = [picked[a], picked[b], picked[c], picked[d]]
    const sortedY = [...pts].sort((p, q) => p.y - q.y)
    const top = sortedY.slice(0, 2).sort((p, q) => p.x - q.x)
    const bottom = sortedY.slice(2).sort((p, q) => p.x - q.x)
    const [tl, tr] = top
    const [bl, br] = bottom
    const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y)
    const bottomW = Math.hypot(br.x - bl.x, br.y - bl.y)
    const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y)
    const rightH = Math.hypot(br.x - tr.x, br.y - tr.y)
    const avgW = (topW + bottomW) / 2
    const avgH = (leftH + rightH) / 2
    if (avgW < width * 0.42 || avgH < height * 0.18) continue
    const aspect = avgW / Math.max(1, avgH)
    if (aspect < 1.25 || aspect > 4.2) continue
    const skewPenalty = Math.abs(topW - bottomW) / avgW + Math.abs(leftH - rightH) / avgH
    const score = (avgW * avgH) / (width * height) - skewPenalty * 0.14
    if (score > bestScore) { bestScore = score; best = { tl, tr, br, bl } }
  }

  if (!best) return null
  const unscale = (p: MarkerPoint): MarkerPoint => ({ ...p, x: p.x / scale, y: p.y / scale, size: p.size / scale })
  return { tl: unscale(best.tl), tr: unscale(best.tr), br: unscale(best.br), bl: unscale(best.bl) }
}

function solveLinearSystem(a: number[][], b: number[]) {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
    if (Math.abs(m[pivot][col]) < 1e-10) throw new Error("Perspektive konnte nicht korrigiert werden.")
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    const div = m[col][col]
    for (let j = col; j <= n; j++) m[col][j] /= div
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = m[row][col]
      for (let j = col; j <= n; j++) m[row][j] -= factor * m[col][j]
    }
  }
  return m.map((row) => row[n])
}

function homographyDestinationToSource(quad: MarkerQuad, outW: number, outH: number) {
  const dst = [
    { x: 0, y: 0, p: quad.tl }, { x: outW - 1, y: 0, p: quad.tr },
    { x: outW - 1, y: outH - 1, p: quad.br }, { x: 0, y: outH - 1, p: quad.bl },
  ]
  const A: number[][] = []
  const B: number[] = []
  for (const { x, y, p } of dst) {
    A.push([x, y, 1, 0, 0, 0, -p.x * x, -p.x * y]); B.push(p.x)
    A.push([0, 0, 0, x, y, 1, -p.y * x, -p.y * y]); B.push(p.y)
  }
  const h = solveLinearSystem(A, B)
  return (x: number, y: number) => {
    const d = h[6] * x + h[7] * y + 1
    return { x: (h[0] * x + h[1] * y + h[2]) / d, y: (h[3] * x + h[4] * y + h[5]) / d }
  }
}

function rectifyWithMarkers(source: HTMLCanvasElement, quad: MarkerQuad) {
  const topW = Math.hypot(quad.tr.x - quad.tl.x, quad.tr.y - quad.tl.y)
  const bottomW = Math.hypot(quad.br.x - quad.bl.x, quad.br.y - quad.bl.y)
  const leftH = Math.hypot(quad.bl.x - quad.tl.x, quad.bl.y - quad.tl.y)
  const rightH = Math.hypot(quad.br.x - quad.tr.x, quad.br.y - quad.tr.y)
  const aspect = ((topW + bottomW) / 2) / Math.max(1, (leftH + rightH) / 2)
  const outW = 1900
  const outH = Math.max(650, Math.min(1250, Math.round(outW / Math.max(1.25, aspect))))
  const map = homographyDestinationToSource(quad, outW, outH)
  const src = source.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, source.width, source.height)
  const out = document.createElement("canvas")
  out.width = outW; out.height = outH
  const outCtx = out.getContext("2d", { willReadFrequently: true })!
  const dst = outCtx.createImageData(outW, outH)
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    const p = map(x, y)
    const sx = Math.max(0, Math.min(source.width - 1, Math.round(p.x)))
    const sy = Math.max(0, Math.min(source.height - 1, Math.round(p.y)))
    const si = (sy * source.width + sx) * 4, di = (y * outW + x) * 4
    dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1]; dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = 255
  }
  outCtx.putImageData(dst, 0, 0)
  return out
}

function clusterIndexes(indexes: number[], maxGap = 2) {
  if (!indexes.length) return []
  const groups: number[][] = [[indexes[0]]]
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] - indexes[i - 1] <= maxGap) groups[groups.length - 1].push(indexes[i])
    else groups.push([indexes[i]])
  }
  return groups.map((g) => Math.round(g.reduce((a, b) => a + b, 0) / g.length))
}

function selectVerticalGrid(lines: number[]) {
  // Exakt unsere 19 Druckspalten: Spieler 18%, LEGS 5/5%, danach 16 x 4%.
  // Damit werden Browser-/Bildränder sicher von echten Tabellenlinien unterschieden.
  const expected = [18, 5, 5, ...Array(16).fill(4)]
  if (lines.length < 20) return null

  let best: number[] | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let start = 0; start <= lines.length - 20; start++) {
    const win = lines.slice(start, start + 20)
    const gaps = win.slice(1).map((x, i) => x - win[i])
    const scale = gaps.reduce((a, b) => a + b, 0) / expected.reduce((a, b) => a + b, 0)
    if (scale <= 0) continue

    const score = gaps.reduce((sum, gap, i) => {
      const target = expected[i] * scale
      return sum + Math.abs(gap - target) / Math.max(1, target)
    }, 0) / gaps.length

    if (score < bestScore) {
      bestScore = score
      best = win
    }
  }

  return bestScore <= 0.35 ? best : null
}

function selectHorizontalGrid(lines: number[]) {
  // Druckblatt hat immer: 1 Kopfzeile + 12 Datenzeilen = 14 horizontale Linien.
  // Die 12 Datenzeilen sind gleich hoch; dadurch fliegen Seiten-/Screenshot-Ränder raus.
  if (lines.length < 14) return null

  let best: number[] | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let start = 0; start <= lines.length - 14; start++) {
    const win = lines.slice(start, start + 14)
    const gaps = win.slice(1).map((y, i) => y - win[i])
    const rowGaps = gaps.slice(1)
    const sorted = [...rowGaps].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] || 1
    if (median <= 0) continue

    const rowError = rowGaps.reduce((sum, gap) => sum + Math.abs(gap - median) / median, 0) / rowGaps.length
    const headerError = Math.abs(gaps[0] - median) / median
    const score = rowError + headerError * 0.25

    if (score < bestScore) {
      bestScore = score
      best = win
    }
  }

  return bestScore <= 0.30 ? best : null
}

function detectGrid(img: ImageData) {
  const { width, height, data } = img
  const dark = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    dark[i] = r < 120 && g < 120 && b < 120 ? 1 : 0
  }

  const vCandidates: number[] = []
  for (let x = 0; x < width; x++) {
    let count = 0
    for (let y = Math.floor(height * 0.12); y < Math.floor(height * 0.96); y++) count += dark[y * width + x]
    if (count > height * 0.34) vCandidates.push(x)
  }

  const hCandidates: number[] = []
  for (let y = 0; y < height; y++) {
    let count = 0
    for (let x = Math.floor(width * 0.02); x < Math.floor(width * 0.98); x++) count += dark[y * width + x]
    if (count > width * 0.55) hCandidates.push(y)
  }

  const allXs = clusterIndexes(vCandidates, 2)
  const allYs = clusterIndexes(hCandidates, 2)
  const xs = selectVerticalGrid(allXs)
  const ys = selectHorizontalGrid(allYs)

  if (!xs || !ys) return null
  return { xs, ys }
}

function countInkComponents(img: ImageData, x1: number, x2: number, y1: number, y2: number) {
  const { width, data } = img
  const left = Math.max(0, x1 + 4)
  const right = Math.min(img.width - 1, x2 - 4)
  const top = Math.max(0, y1 + 4)
  const bottom = Math.min(img.height - 1, y2 - 4)
  const w = Math.max(0, right - left + 1)
  const h = Math.max(0, bottom - top + 1)
  if (w <= 0 || h <= 0) return 0

  const mask = new Uint8Array(w * h)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const gx = left + xx
      const gy = top + yy
      const idx = (gy * width + gx) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const isRed = r > 140 && g < 130 && b < 130
      const isDark = r < 85 && g < 85 && b < 85
      mask[yy * w + xx] = isRed || isDark ? 1 : 0
    }
  }

  const seen = new Uint8Array(w * h)
  let count = 0
  const dirs = [-1, 0, 1]

  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const start = yy * w + xx
      if (!mask[start] || seen[start]) continue

      const stack = [start]
      seen[start] = 1
      let area = 0
      let minX = xx, maxX = xx, minY = yy, maxY = yy

      while (stack.length) {
        const pos = stack.pop()!
        const py = Math.floor(pos / w)
        const px = pos % w
        area++
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py

        for (const dy of dirs) {
          for (const dx of dirs) {
            if (dx === 0 && dy === 0) continue
            const nx = px + dx
            const ny = py + dy
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
            const np = ny * w + nx
            if (mask[np] && !seen[np]) {
              seen[np] = 1
              stack.push(np)
            }
          }
        }
      }

      const cw = maxX - minX + 1
      const ch = maxY - minY + 1
      // Ein handschriftlicher Strich ist typischerweise schmal und mindestens einige Pixel hoch.
      if (area >= 7 && ch >= 6 && cw <= Math.max(18, Math.floor(w * 0.45)) && ch <= Math.max(40, Math.floor(h * 0.95))) {
        count++
      }
    }
  }

  return count
}

async function canvasFromFile(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.drawImage(image, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function ocrNames(canvas: HTMLCanvasElement, xs: number[], ys: number[]) {
  try {
    const mod = await import("tesseract.js")
    const worker = await mod.createWorker("deu+eng")
    await worker.setParameters({ tessedit_pageseg_mode: "6" as any })

    const bodyTop = ys[1]
    const bodyBottom = ys[ys.length - 1]
    const x1 = xs[0] + 4
    const x2 = xs[1] - 4
    const crop = document.createElement("canvas")
    crop.width = Math.max(1, x2 - x1)
    crop.height = Math.max(1, bodyBottom - bodyTop)
    crop.getContext("2d")!.drawImage(canvas, x1, bodyTop, crop.width, crop.height, 0, 0, crop.width, crop.height)

    const result = await worker.recognize(crop)
    await worker.terminate()

    const byRow = new Map<number, string[]>()
    const words = (result.data as any).words || []
    for (const word of words) {
      const text = String(word.text || "").trim()
      if (!text) continue
      const cy = ((word.bbox?.y0 ?? 0) + (word.bbox?.y1 ?? 0)) / 2 + bodyTop
      for (let r = 1; r < ys.length - 1; r++) {
        if (cy >= ys[r] && cy < ys[r + 1]) {
          const arr = byRow.get(r) || []
          arr.push(text)
          byRow.set(r, arr)
          break
        }
      }
    }

    return Array.from({ length: Math.max(0, ys.length - 2) }, (_, i) => (byRow.get(i + 1) || []).join(" ").trim())
  } catch (error) {
    console.warn("OCR konnte nicht geladen werden:", error)
    return Array.from({ length: Math.max(0, ys.length - 2) }, () => "")
  }
}

export default function TeamScanSheetTestPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [rows, setRows] = useState<ScanRow[]>([])
  const [scanInfo, setScanInfo] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, session, router])

  useEffect(() => {
    if (!session?.user) return
    const run = async () => {
      setLoading(true)
      try {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("player_id")
          .eq("user_id", session.user.id)
          .single()

        const myPlayerId = profileData?.player_id
        if (!myPlayerId) return

        const { data: mData } = await supabase
          .from("team_members")
          .select("team_id, role, teams (id, name)")
          .eq("player_id", myPlayerId)
          .is("left_at", null)

        const manageable = ((mData || []) as TeamMembership[]).filter((m) => m.role === "Captain" || m.role === "Co-Captain")
        setMemberships(manageable)
        const first = manageable[0]?.team_id || ""
        setSelectedTeamId(first)

        if (manageable.length) {
          const ids = manageable.map((m) => m.team_id)
          const { data: memberData } = await supabase
            .from("team_members")
            .select("player_id, team_id, club_players:club_players!team_members_player_id_fkey (id, name)")
            .in("team_id", ids)
            .is("left_at", null)
          setMembers((memberData || []) as any)
        }
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [session])

  useEffect(() => {
    if (!file) {
      setPreviewUrl("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const teamMembers = useMemo(
    () => members.filter((m: any) => m.team_id === selectedTeamId).sort((a: any, b: any) => (a.club_players?.name || "").localeCompare(b.club_players?.name || "")),
    [members, selectedTeamId],
  )

  const runScan = async () => {
    if (!file) return
    setAnalyzing(true)
    setError("")
    setRows([])
    setScanInfo("")

    try {
      const originalCanvas = await canvasFromFile(file)

      // v8.1: Screenshots bleiben exakt auf dem alten Weg. Nur wenn das Raster auf
      // einem Handyfoto wegen Perspektive nicht erkannt wird, greifen die 4 Eckmarken.
      let scanCanvas = originalCanvas
      let scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true })!
      let imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height)
      let grid = detectGrid(imageData)
      let usedPerspectiveFix = false

      if (!grid) {
        const markers = detectCornerMarkers(originalCanvas)
        if (markers) {
          scanCanvas = rectifyWithMarkers(originalCanvas, markers)
          scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true })!
          imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height)
          grid = detectGrid(imageData)
          usedPerspectiveFix = Boolean(grid)
        }
      }

      if (!grid) throw new Error("Tabellenraster wurde nicht erkannt. Bei Handyfotos müssen die vier schwarzen Eckmarken der Tabelle vollständig sichtbar sein.")
      const { xs, ys } = grid

      // WICHTIG: Strich-Erkennung bleibt exakt die alte funktionierende Logik.
      // QR ersetzt ausschließlich die unsichere Namens-OCR.
      const qrPayload = readQr(originalCanvas)
      const qrResolved = qrPayload ? resolveQr(qrPayload, memberships, members) : null

      if (qrPayload && !qrResolved) {
        throw new Error("QR erkannt, aber Team/Spieler konnten nicht eindeutig zugeordnet werden.")
      }

      if (qrResolved && qrResolved.teamId !== selectedTeamId) {
        setSelectedTeamId(qrResolved.teamId)
      }

      const rawNames = qrResolved ? [] : await ocrNames(scanCanvas, xs, ys)
      const bodyRows = Math.max(0, ys.length - 2)
      const result: ScanRow[] = []

      for (let r = 1; r <= bodyRows; r++) {
        const values: Record<string, number> = {}
        let hasAny = false
        HEADERS.forEach((header, idx) => {
          const value = countInkComponents(imageData, xs[idx + 1], xs[idx + 2], ys[r], ys[r + 1])
          values[header] = value
          if (value > 0) hasAny = true
        })

        const qrPlayerId = qrResolved?.playerIds[r - 1] || ""
        const qrMember = qrPlayerId
          ? members.find((m: any) => m.team_id === qrResolved?.teamId && m.player_id === qrPlayerId)
          : null

        const rawName = qrResolved ? (qrMember?.club_players?.name || "") : (rawNames[r - 1] || "")
        let best: any = qrMember
        let bestScore = qrMember ? 1 : 0

        if (!qrResolved) {
          const currentTeamMembers = members
            .filter((m: any) => m.team_id === selectedTeamId)
            .sort((a: any, b: any) => (a.club_players?.name || "").localeCompare(b.club_players?.name || ""))

          for (const member of currentTeamMembers) {
            const name = member.club_players?.name || ""
            const score = similarity(rawName, name)
            if (score > bestScore) {
              bestScore = score
              best = member
            }
          }
        }

        if (qrPlayerId || rawName || hasAny) {
          result.push({
            rowIndex: r,
            rawName: qrResolved ? "QR-Zuordnung" : rawName,
            matchedPlayerId: bestScore >= 0.55 ? best?.player_id || "" : "",
            matchedPlayerName: bestScore >= 0.55 ? best?.club_players?.name || "" : "",
            matchConfidence: bestScore,
            values,
          })
        }
      }

      setRows(result)
      setScanInfo(`Scan abgeschlossen · ${result.length} Zeilen erkannt.`)
    } catch (e: any) {
      setError(e?.message || "Scan fehlgeschlagen.")
    } finally {
      setAnalyzing(false)
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header variant="app" title="Statistikblatt" subtitle="Statistikblatt scannen" backHref="/team-print-sheet" />
      <main className="w-full pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-8">
          <section className="overflow-hidden rounded-[26px] bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15"><ScanLine className="h-6 w-6 text-orange-400" /></div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Statistik erfassen</div>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">Spielerblatt scannen</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-white/55">Foto oder Screenshot des Statistikblatts auswählen. Achte darauf, dass das gesamte Blatt gut sichtbar und möglichst gerade fotografiert ist.</p>
              </div>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="rounded-[24px]">
              <CardHeader><CardTitle className="text-base">1. Blatt auswählen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-bold text-slate-500">Team</div>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger><SelectValue placeholder="Team wählen" /></SelectTrigger>
                    <SelectContent>{memberships.map((m) => <SelectItem key={m.team_id} value={m.team_id}>{m.teams?.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    setRows([])
                    setError("")
                  }}
                />

                <Button type="button" variant="outline" className="h-12 w-full rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> Foto / Bild auswählen
                </Button>

                {previewUrl ? <img src={previewUrl} alt="Scan Vorschau" className="max-h-[360px] w-full rounded-2xl border object-contain bg-white" /> : (
                  <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed bg-slate-50 text-sm font-semibold text-slate-400"><FileImage className="mr-2 h-5 w-5" />Noch kein Bild</div>
                )}

                <Button disabled={!file || analyzing || !selectedTeamId} onClick={() => void runScan()} className="h-12 w-full rounded-2xl bg-orange-500 font-black hover:bg-orange-600">
                  {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                  {analyzing ? "Wird gescannt…" : "Blatt scannen"}
                </Button>

                <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
                  <AlertTriangle className="mr-1 inline h-4 w-4" /> Tipp: Fotografiere das Blatt vollständig, gut beleuchtet und ohne starke Schatten. Die vier Eckmarken sollten sichtbar sein.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div><CardTitle className="text-base">2. Werte prüfen</CardTitle>{scanInfo ? <p className="mt-1 text-xs font-semibold text-slate-500">{scanInfo}</p> : null}</div>
                {rows.length ? <Badge variant="secondary">{rows.length} Zeilen</Badge> : null}
              </CardHeader>
              <CardContent>
                {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
                {!rows.length && !error ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm font-semibold text-slate-400">Nach dem Scannen erscheinen hier die erkannten Werte.</div> : null}

                {rows.length ? (
                  <div className="overflow-x-auto rounded-2xl border">
                    <table className="min-w-[1450px] w-full border-collapse text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="sticky left-0 z-10 min-w-[230px] border-b bg-slate-100 p-2 text-left">Spieler</th>
                          {HEADERS.map((h) => <th key={h} className="min-w-[68px] border-b p-2 text-center">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIdx) => (
                          <tr key={row.rowIndex} className="bg-white">
                            <td className="sticky left-0 z-10 border-b bg-white p-2 align-top">
                              <Select
                                value={row.matchedPlayerId || "__none__"}
                                onValueChange={(value) => setRows((prev) => prev.map((x, i) => i === rowIdx ? { ...x, matchedPlayerId: value === "__none__" ? "" : value, matchedPlayerName: teamMembers.find((m) => m.player_id === value)?.club_players?.name || "" } : x))}
                              >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Spieler zuordnen" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Nicht zugeordnet</SelectItem>
                                  {teamMembers.map((m) => <SelectItem key={m.player_id} value={m.player_id}>{m.club_players?.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            {HEADERS.map((h) => (
                              <td key={h} className="border-b p-1.5 text-center">
                                <Input
                                  inputMode="numeric"
                                  value={row.values[h]}
                                  onChange={(e) => {
                                    const n = Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0)
                                    setRows((prev) => prev.map((x, i) => i === rowIdx ? { ...x, values: { ...x.values, [h]: n } } : x))
                                  }}
                                  className="h-8 w-14 text-center"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {rows.length ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-semibold text-slate-500">Prüfe die erkannten Werte und korrigiere sie bei Bedarf.</div>
                    <Button variant="outline" onClick={() => { setRows([]); setScanInfo(""); setError("") }}><RotateCcw className="mr-2 h-4 w-4" />Ergebnis zurücksetzen</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { saveAs } from "file-saver"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type LegStatRow = {
  player_id: string
  player_legs_won?: number | null
  opponent_legs_won?: number | null

  throws_180?: number | null
  throws_171?: number | null
  throws_high_tonne?: number | null
  throws_tonne?: number | null
  throws_95_plus?: number | null
  throws_shanghai?: number | null
  throws_bull?: number | null

  throws_20?: number | null
  throws_19?: number | null
  throws_18?: number | null
  throws_17?: number | null
  throws_16?: number | null
  throws_15?: number | null

  player?: { name?: string | null } | null
}

type PlayerAgg = {
  player_id: string
  name: string

  total_legs: number
  total_wins: number
  win_percentage: number
  total_points: number

  throws_180: number
  throws_171: number
  throws_high_tonne: number
  throws_tonne: number
  throws_95_plus: number
  throws_shanghai: number
  throws_bull: number

  throws_20: number
  throws_19: number
  throws_18: number
  throws_17: number
  throws_16: number
  throws_15: number
}

type LayoutConfig = {
  debugGuides: boolean
  placeBar: { x: number; y: number; w: number; h: number }
  nameLine: { x: number; y: number; w: number; nameOffsetY: number }
  stats: { x: number; topY: number; safeW: number; colGap: number }
}

function n(v: any) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function safeFileName(name: string) {
  return name
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
}

function calculatePlayerPoints(p: PlayerAgg) {
  const legWinPoints = p.total_wins * 3
  const throw180Points = p.throws_180 * 25
  const throw171Points = p.throws_171 * 25
  const highTonnePoints = p.throws_high_tonne * 18
  const tonnePoints = p.throws_tonne * 15
  const throw95PlusPoints = p.throws_95_plus * 12
  const shanghaiPoints = p.throws_shanghai * 10
  const bullPoints = p.throws_bull * 8
  const throw20Points = p.throws_20 * 6
  const throw19Points = p.throws_19 * 5
  const throw18Points = p.throws_18 * 4
  const throw17Points = p.throws_17 * 3
  const throw16Points = p.throws_16 * 2
  const throw15Points = p.throws_15 * 1

  return (
    legWinPoints +
    throw180Points +
    throw171Points +
    highTonnePoints +
    tonnePoints +
    throw95PlusPoints +
    shanghaiPoints +
    bullPoints +
    throw20Points +
    throw19Points +
    throw18Points +
    throw17Points +
    throw16Points +
    throw15Points
  )
}

async function fetchAsBytes(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Nicht ladbar: ${url}`)
  return new Uint8Array(await res.arrayBuffer())
}

function drawCenteredShrinkToFit(args: {
  page: any
  font: any
  text: string
  x: number
  y: number
  w: number
  sizeMax: number
  sizeMin: number
  color: any
}) {
  const { page, font, text, x, y, w, sizeMax, sizeMin, color } = args

  let size = sizeMax
  while (size > sizeMin) {
    const tw = font.widthOfTextAtSize(text, size)
    if (tw <= w) break
    size -= 1
  }
  const tw = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: x + (w - tw) / 2, y, size, font, color })
}

function drawDebugBoxes(page: any, cfg: LayoutConfig) {
  if (!cfg.debugGuides) return
  const c = rgb(1, 0, 0)

  page.drawRectangle({
    x: cfg.placeBar.x,
    y: cfg.placeBar.y,
    width: cfg.placeBar.w,
    height: cfg.placeBar.h,
    borderColor: c,
    borderWidth: 1,
    opacity: 0.4,
  })

  page.drawRectangle({
    x: cfg.nameLine.x,
    y: cfg.nameLine.y - 12,
    width: cfg.nameLine.w,
    height: 28,
    borderColor: c,
    borderWidth: 1,
    opacity: 0.4,
  })

  page.drawRectangle({
    x: cfg.stats.x,
    y: cfg.stats.topY - 8 * 26 - 10,
    width: cfg.stats.safeW,
    height: 8 * 26 + 40,
    borderColor: c,
    borderWidth: 1,
    opacity: 0.25,
  })
}

/**
 * Berechnet eine „Key-Spalte“-Breite, sodass die Values nicht so weit rechts kleben.
 * Dadurch wird der Abstand zwischen "Punkte" und "9234" usw. deutlich kleiner.
 */
function computeKeyW(args: { keys: string[]; font: any; keySize: number; colW: number }) {
  const { keys, font, keySize, colW } = args
  const maxKeyW = keys.reduce((m, k) => Math.max(m, font.widthOfTextAtSize(k, keySize)), 0)
  const padded = maxKeyW + 20
  // nicht zu groß werden lassen, sonst bleibt kein Platz für Values
  return Math.min(padded, colW * 0.68)
}

async function generateCertificateOnTemplate(args: {
  templateUrl: string
  place: number
  player: PlayerAgg
  layout: LayoutConfig
}) {
  const { templateUrl, place, player, layout } = args

  const templateBytes = await fetchAsBytes(templateUrl)
  const pdfDoc = await PDFDocument.load(templateBytes)

  const page = pdfDoc.getPage(0)
  const { height } = page.getSize()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const ink = rgb(0.12, 0.12, 0.12)
  const muted = rgb(0.28, 0.28, 0.28)
  const white = rgb(1, 1, 1)

  drawDebugBoxes(page, layout)

  // 1) Platz im roten Balken (zentriert)
  drawCenteredShrinkToFit({
    page,
    font: fontBold,
    text: `${place}. PLATZ`,
    x: layout.placeBar.x,
    y: layout.placeBar.y + layout.placeBar.h / 2 - 7,
    w: layout.placeBar.w,
    sizeMax: 20,
    sizeMin: 12,
    color: white,
  })

  // 2) Name auf/in der Linie (zentriert)
  drawCenteredShrinkToFit({
    page,
    font: fontBold,
    text: player.name,
    x: layout.nameLine.x,
    y: layout.nameLine.y + layout.nameLine.nameOffsetY,
    w: layout.nameLine.w,
    sizeMax: 28,
    sizeMin: 16,
    color: ink,
  })

  // 3) Statistik ohne Hintergrund
  const rows: Array<[string, string]> = [
    ["Punkte", `${player.total_points.toFixed(0)}`],
    ["Wins", `${player.total_wins}`],
    ["Win %", `${player.win_percentage.toFixed(1)}%`],
    ["180", `${player.throws_180}`],
    ["171", `${player.throws_171}`],
    ["High Tonne (HT)", `${player.throws_high_tonne}`],
    ["Tonne (T)", `${player.throws_tonne}`],
    ["95+", `${player.throws_95_plus}`],

    ["Shanghai", `${player.throws_shanghai}`],
    ["Bull", `${player.throws_bull}`],
    ["20er", `${player.throws_20}`],
    ["19er", `${player.throws_19}`],
    ["18er", `${player.throws_18}`],
    ["17er", `${player.throws_17}`],
    ["16er", `${player.throws_16}`],
    ["15er", `${player.throws_15}`],
  ]

  const left = rows.slice(0, 8)
  const right = rows.slice(8)

  const colW = (layout.stats.safeW - layout.stats.colGap) / 2
  const col1X = layout.stats.x
  const col2X = layout.stats.x + colW + layout.stats.colGap

  const lineH = 26
  const keySize = 12
  const valSize = 12

  // ✅ Values näher an die Keys: feste Key-Spalte + kleiner Gap
  const keyWLeft = computeKeyW({ keys: left.map(([k]) => k), font, keySize, colW })
  const keyWRight = computeKeyW({ keys: right.map(([k]) => k), font, keySize, colW })
  const kvGap = 35

  const drawRow = (x: number, y: number, k: string, v: string, keyW: number) => {
    // ✅ KEY in der Key-Zelle zentrieren
    const keyCellX = x
    const keyCellW = Math.max(0, keyW)

    const kW = font.widthOfTextAtSize(k, keySize)
    const keyCenteredX = keyCellX + Math.max(0, (keyCellW - kW) / 2)

    page.drawText(k, {
      x: keyCenteredX,
      y,
      size: keySize,
      font,
      color: white,
    })

    // ✅ VALUE in der Value-Zelle zentrieren (damit "0" nicht links klebt und "628" nicht zu weit rechts wirkt)
    const valueCellX = x + keyW + kvGap
    const valueCellW = Math.max(0, colW - (keyW + kvGap))

    const vW = fontBold.widthOfTextAtSize(v, valSize)
    const valueCenteredX = valueCellX + Math.max(0, (valueCellW - vW) / 2)

    page.drawText(v, {
      x: valueCenteredX,
      y,
      size: valSize,
      font: fontBold,
      color: white,
    })
  }

  left.forEach(([k, v], i) => drawRow(col1X, layout.stats.topY - i * lineH, k, v, keyWLeft))
  right.forEach(([k, v], i) => drawRow(col2X, layout.stats.topY - i * lineH, k, v, keyWRight))

  // Optional: schnelle Info, falls man mal testen will ob Koordinaten total daneben sind
  if (layout.debugGuides) {
    page.drawText(`height:${Math.round(height)}`, { x: 10, y: 10, size: 8, font, color: rgb(1, 0, 0) })
  }

  const out = await pdfDoc.save()
  return new Blob([out], { type: "application/pdf" })
}

function SliderRow(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const { label, value, min, max, step = 1, onChange } = props
  return (
    <div className="grid grid-cols-[140px_1fr_70px] items-center gap-3">
      <div className="text-sm text-gray-700">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="text-sm font-mono text-gray-700 text-right">{value}</div>
    </div>
  )
}

export default function UrkundenPage() {
  const [legStatistics, setLegStatistics] = useState<LegStatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const templateUrl = "/templates/Urkunde.pdf"

  // ✅ Default-Werte (aus deinem Layout-Tester Screenshot übernommen)
  const [layout, setLayout] = useState<LayoutConfig>({
    debugGuides: false,
    placeBar: { x: 68, y: 396, w: 300, h: 44 },
    nameLine: { x: 0, y: 310, w: 459, nameOffsetY: 6 },
    stats: { x: 18, topY: 245, safeW: 543, colGap: 60 },
  })

  // Hinweis:
  // PDF-Koordinaten: (0,0) ist unten links.
  // Wenn du bei “y” nach oben willst -> y erhöhen.

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("leg_statistics")
        .select(
          `
          *,
          player:club_players!leg_statistics_player_id_fkey(name)
        `
        )

      if (error) {
        console.error(error)
        setLegStatistics([])
      } else {
        setLegStatistics((data as any) || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const playerStatistics = useMemo<PlayerAgg[]>(() => {
    const map = new Map<string, PlayerAgg>()

    for (const stat of legStatistics) {
      const playerId = stat.player_id
      if (!playerId) continue

      if (!map.has(playerId)) {
        map.set(playerId, {
          player_id: playerId,
          name: stat.player?.name || "Unbekannt",

          total_legs: 0,
          total_wins: 0,
          win_percentage: 0,
          total_points: 0,

          throws_180: 0,
          throws_171: 0,
          throws_high_tonne: 0,
          throws_tonne: 0,
          throws_95_plus: 0,
          throws_shanghai: 0,
          throws_bull: 0,

          throws_20: 0,
          throws_19: 0,
          throws_18: 0,
          throws_17: 0,
          throws_16: 0,
          throws_15: 0,
        })
      }

      const p = map.get(playerId)!

      const legsWon = n(stat.player_legs_won)
      const oppWon = n(stat.opponent_legs_won)
      p.total_legs += legsWon + oppWon
      p.total_wins += legsWon

      p.throws_180 += n(stat.throws_180)
      p.throws_171 += n(stat.throws_171)
      p.throws_high_tonne += n(stat.throws_high_tonne)
      p.throws_tonne += n(stat.throws_tonne)
      p.throws_95_plus += n(stat.throws_95_plus)
      p.throws_shanghai += n(stat.throws_shanghai)
      p.throws_bull += n(stat.throws_bull)

      p.throws_20 += n(stat.throws_20)
      p.throws_19 += n(stat.throws_19)
      p.throws_18 += n(stat.throws_18)
      p.throws_17 += n(stat.throws_17)
      p.throws_16 += n(stat.throws_16)
      p.throws_15 += n(stat.throws_15)
    }

    const arr = Array.from(map.values()).map((p) => {
      p.win_percentage = p.total_legs > 0 ? (p.total_wins / p.total_legs) * 100 : 0
      p.total_points = calculatePlayerPoints(p)
      return p
    })

    // Ranking: Punkte, dann Wins, dann 180
    arr.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
      return b.throws_180 - a.throws_180
    })

    return arr
  }, [legStatistics])

  useEffect(() => {
    if (!selectedPlayerId && playerStatistics.length > 0) {
      setSelectedPlayerId(playerStatistics[0].player_id)
    }
  }, [playerStatistics, selectedPlayerId])

  const selected = playerStatistics.find((p) => p.player_id === selectedPlayerId) || null
  const place = selected ? playerStatistics.findIndex((p) => p.player_id === selected.player_id) + 1 : 0

  const downloadPdf = async () => {
    if (!selected) return
    const blob = await generateCertificateOnTemplate({
      templateUrl,
      place,
      player: selected,
      layout,
    })
    saveAs(blob, `Urkunde_${place}_${safeFileName(selected.name)}.pdf`)
  }

  const downloadTopN = async (nPlayers: number) => {
    const top = playerStatistics.slice(0, Math.max(1, nPlayers))
    for (let i = 0; i < top.length; i++) {
      const p = top[i]
      const blob = await generateCertificateOnTemplate({
        templateUrl,
        place: i + 1,
        player: p,
        layout,
      })
      saveAs(blob, `Urkunde_${i + 1}_${safeFileName(p.name)}.pdf`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Urkunden Generator</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-sm text-gray-600">Lade Statistiken…</div>
              ) : playerStatistics.length === 0 ? (
                <div className="text-sm text-gray-600">Keine Spieler/Statistiken gefunden.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Spieler auswählen</label>
                    <select
                      className="w-full border rounded px-3 py-2 bg-white"
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                    >
                      {playerStatistics.map((p, idx) => (
                        <option key={p.player_id} value={p.player_id}>
                          #{idx + 1} – {p.name} ({p.total_points.toFixed(0)} Punkte)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={downloadPdf} disabled={!selected}>
                      PDF-Urkunde erstellen
                    </Button>
                    <Button variant="outline" onClick={() => downloadTopN(3)}>
                      Top 3
                    </Button>
                    <Button variant="outline" onClick={() => downloadTopN(10)}>
                      Top 10
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500">
                    Vorlage: <span className="font-mono">{templateUrl}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout Tester (Slider)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Debug Hilfsrahmen</div>
                <input
                  type="checkbox"
                  checked={layout.debugGuides}
                  onChange={(e) => setLayout((s) => ({ ...s, debugGuides: e.target.checked }))}
                />
              </div>

              <div className="text-sm font-semibold">Platz-Balken</div>
              <SliderRow
                label="placeBar.x"
                value={layout.placeBar.x}
                min={0}
                max={600}
                onChange={(v) => setLayout((s) => ({ ...s, placeBar: { ...s.placeBar, x: v } }))}
              />
              <SliderRow
                label="placeBar.y"
                value={layout.placeBar.y}
                min={0}
                max={560}
                onChange={(v) => setLayout((s) => ({ ...s, placeBar: { ...s.placeBar, y: v } }))}
              />
              <SliderRow
                label="placeBar.w"
                value={layout.placeBar.w}
                min={120}
                max={560}
                onChange={(v) => setLayout((s) => ({ ...s, placeBar: { ...s.placeBar, w: v } }))}
              />
              <SliderRow
                label="placeBar.h"
                value={layout.placeBar.h}
                min={24}
                max={80}
                onChange={(v) => setLayout((s) => ({ ...s, placeBar: { ...s.placeBar, h: v } }))}
              />

              <div className="text-sm font-semibold pt-2">Name-Linie</div>
              <SliderRow
                label="nameLine.x"
                value={layout.nameLine.x}
                min={0}
                max={300}
                onChange={(v) => setLayout((s) => ({ ...s, nameLine: { ...s.nameLine, x: v } }))}
              />
              <SliderRow
                label="nameLine.y"
                value={layout.nameLine.y}
                min={0}
                max={560}
                onChange={(v) => setLayout((s) => ({ ...s, nameLine: { ...s.nameLine, y: v } }))}
              />
              <SliderRow
                label="nameLine.w"
                value={layout.nameLine.w}
                min={200}
                max={700}
                onChange={(v) => setLayout((s) => ({ ...s, nameLine: { ...s.nameLine, w: v } }))}
              />
              <SliderRow
                label="nameOffsetY"
                value={layout.nameLine.nameOffsetY}
                min={-20}
                max={20}
                onChange={(v) => setLayout((s) => ({ ...s, nameLine: { ...s.nameLine, nameOffsetY: v } }))}
              />

              <div className="text-sm font-semibold pt-2">Statistiken</div>
              <SliderRow
                label="stats.x"
                value={layout.stats.x}
                min={0}
                max={300}
                onChange={(v) => setLayout((s) => ({ ...s, stats: { ...s.stats, x: v } }))}
              />
              <SliderRow
                label="stats.topY"
                value={layout.stats.topY}
                min={0}
                max={560}
                onChange={(v) => setLayout((s) => ({ ...s, stats: { ...s.stats, topY: v } }))}
              />
              <SliderRow
                label="stats.safeW"
                value={layout.stats.safeW}
                min={300}
                max={760}
                onChange={(v) => setLayout((s) => ({ ...s, stats: { ...s.stats, safeW: v } }))}
              />
              <SliderRow
                label="colGap"
                value={layout.stats.colGap}
                min={20}
                max={120}
                onChange={(v) => setLayout((s) => ({ ...s, stats: { ...s.stats, colGap: v } }))}
              />

              <div className="text-xs text-gray-600">
                Tipp: PDF-Koordinaten starten unten links. <br />
                Wenn etwas höher soll → <b>Y erhöhen</b>. Wenn nach rechts → <b>X erhöhen</b>.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

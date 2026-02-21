"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    cv: any
  }
}

type RoiPx = { x: number; y: number; w: number; h: number }
type Counts = Record<string, any>

// ======= WARP TARGET (stabile Geometrie) =======
const WARP_W = 1600
const WARP_H = 1130

// ======= HEADERS (wie PrintSheet) =======
const HEADERS = [
  "SPIELER",
  "LEGS W",
  "LEGS L",
  "20",
  "19",
  "18",
  "17",
  "16",
  "15",
  "BULL",
  "180",
  "171",
  "H. TONNE",
  "TONNE",
  "SHANG",
  "95+",
  "<26",
  "<30",
  "SEMP",
]

function buildColFractions(headers: string[]) {
  const weights = headers.map((h) => {
    if (h === "SPIELER") return 18
    if (h === "LEGS W" || h === "LEGS L") return 5
    return 4
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => w / sum)
}

// ======= TUNING (FIX gegen false positives) =======
const INNER_PAD_RATIO = 0.45 // vorher 0.28 -> mehr Rand ignorieren (Linien/Text!)
const INK_RATIO_THRESHOLD = 0.06 // vorher 0.02 -> weniger false positives
const MIN_CELL_AREA_PX = 200

export default function SheetScanDemo() {
  const [cvReady, setCvReady] = useState(false)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [log, setLog] = useState<string>("")
  const [zoom, setZoom] = useState(1.8)

  // ✅ Default rows = 8, weil PrintSheet Math.max(..., 8)
  const [rows, setRows] = useState(8)

  const [counts, setCounts] = useState<Counts | null>(null)
  const [debug, setDebug] = useState(true)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const warpedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const colFracs = useMemo(() => buildColFractions(HEADERS), [])

  // ---------- OpenCV Loader ----------
  useEffect(() => {
    const existing = document.getElementById("opencvjs")
    if (existing) return

    const script = document.createElement("script")
    script.id = "opencvjs"
    script.async = true
    script.src = "/opencv/opencv.js"
    script.onload = () => {
      const check = () => {
        if (window.cv && window.cv.Mat) {
          setCvReady(true)
          setLog("OpenCV.js geladen ✅")
        } else {
          setTimeout(check, 60)
        }
      }
      check()
    }
    script.onerror = () => setLog("Fehler: /public/opencv/opencv.js fehlt.")
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    drawOverlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, imgUrl, debug, rows])

  // ---------- Helpers ----------
  function cleanup(cv: any, ...mats: any[]) {
    mats.forEach((m) => m && m.delete && m.delete())
  }

  function orderPoints(pts: { x: number; y: number }[]) {
    const sum = pts.map((p) => p.x + p.y)
    const diff = pts.map((p) => p.x - p.y)
    const tl = pts[sum.indexOf(Math.min(...sum))]
    const br = pts[sum.indexOf(Math.max(...sum))]
    const tr = pts[diff.indexOf(Math.min(...diff))]
    const bl = pts[diff.indexOf(Math.max(...diff))]
    return { tl, tr, br, bl }
  }

  function safeRect(cv: any, x: number, y: number, w: number, h: number, cols: number, rows_: number) {
    const rx = Math.max(0, Math.min(cols - 1, Math.round(x)))
    const ry = Math.max(0, Math.min(rows_ - 1, Math.round(y)))
    const rw = Math.max(0, Math.min(cols - rx, Math.round(w)))
    const rh = Math.max(0, Math.min(rows_ - ry, Math.round(h)))
    if (rw <= 1 || rh <= 1) return null
    return new cv.Rect(rx, ry, rw, rh)
  }

  // ---------- File handling ----------
  function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    setCounts(null)
    setLog("Foto geladen ✅ -> 1) Scannen  2) Zählen")
    setTimeout(() => drawImageToCanvas(url), 30)
  }

  function drawImageToCanvas(url: string) {
    const canvas = originalCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      const maxW = 1600
      const scale = Math.min(1, maxW / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const w = warpedCanvasRef.current
      if (w) {
        w.width = canvas.width
        w.height = canvas.height
        w.getContext("2d")!.drawImage(canvas, 0, 0)
      }
      drawOverlay()
    }
    img.src = url
  }

  // ---------- Grid mask ----------
  function buildGridMaskAggressive(cv: any, bin: any) {
    const W = bin.cols
    const H = bin.rows

    const horiz = bin.clone()
    const vert = bin.clone()

    const hK = Math.max(22, Math.floor(W / 14))
    const vK = Math.max(22, Math.floor(H / 14))

    const hKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(hK, 1))
    const vKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, vK))

    cv.erode(horiz, horiz, hKernel)
    cv.dilate(horiz, horiz, hKernel)

    cv.erode(vert, vert, vKernel)
    cv.dilate(vert, vert, vKernel)

    const grid = new cv.Mat()
    cv.bitwise_or(horiz, vert, grid)

    // ✅ stärker: 2x dilate, damit Linien wirklich rausgehen
    const dilK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.dilate(grid, grid, dilK)
    cv.dilate(grid, grid, dilK)

    const closeK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
    cv.morphologyEx(grid, grid, cv.MORPH_CLOSE, closeK)

    cleanup(cv, horiz, vert, hKernel, vKernel, dilK, closeK)
    return grid
  }

  // ---------- AUTO: Tabellen-ROI aus Grid bestimmen ----------
  function findTableRoiFromWarp(cv: any, warpRGBA: any): RoiPx | null {
    const gray = new cv.Mat()
    cv.cvtColor(warpRGBA, gray, cv.COLOR_RGBA2GRAY)

    const bin = new cv.Mat()
    cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 9)

    const gridMask = buildGridMaskAggressive(cv, bin)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(gridMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let bestRect: any = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      if (area > bestArea) {
        bestArea = area
        bestRect = cv.boundingRect(cnt)
      }
      cnt.delete()
    }

    contours.delete()
    hierarchy.delete()

    if (!bestRect || bestArea < 5000) {
      cleanup(cv, gray, bin, gridMask)
      return null
    }

    const pad = 10
    const x = Math.max(0, bestRect.x - pad)
    const y = Math.max(0, bestRect.y - pad)
    const w = Math.min(warpRGBA.cols - x, bestRect.width + pad * 2)
    const h = Math.min(warpRGBA.rows - y, bestRect.height + pad * 2)

    cleanup(cv, gray, bin, gridMask)
    return { x, y, w, h }
  }

  // ---------- Warp Scan (Marker tolerant) ----------
  function scan() {
    if (!cvReady) return setLog("OpenCV noch nicht bereit…")
    const cv = window.cv
    const srcCanvas = originalCanvasRef.current
    const warpCanvas = warpedCanvasRef.current
    if (!srcCanvas || !warpCanvas) return

    try {
      setLog("Scanne… (Marker erkennen → entzerren)")
      setCounts(null)

      const src = cv.imread(srcCanvas)
      const gray = new cv.Mat()
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

      const bin = new cv.Mat()
      cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 7)

      const contours = new cv.MatVector()
      const hierarchy = new cv.Mat()
      cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

      const candidates: { cx: number; cy: number; score: number }[] = []

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i)
        const area = cv.contourArea(cnt)
        if (area < 200) {
          cnt.delete()
          continue
        }

        const rect = cv.boundingRect(cnt)
        const ar = rect.width / rect.height
        if (ar < 0.6 || ar > 1.4) {
          cnt.delete()
          continue
        }

        const boxArea = rect.width * rect.height
        if (boxArea <= 0) {
          cnt.delete()
          continue
        }

        const solidity = area / boxArea
        if (solidity < 0.08 || solidity > 1.05) {
          cnt.delete()
          continue
        }

        const m = cv.moments(cnt)
        if (!m.m00) {
          cnt.delete()
          continue
        }
        const cx = m.m10 / m.m00
        const cy = m.m01 / m.m00

        const score = boxArea * (0.6 + Math.min(0.6, solidity))
        candidates.push({ cx, cy, score })

        cnt.delete()
      }

      let warpedMat: any = null

      if (candidates.length >= 4) {
        candidates.sort((a, b) => b.score - a.score)
        const pts = candidates.slice(0, 4).map((c) => ({ x: c.cx, y: c.cy }))
        const ordered = orderPoints(pts)

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          ordered.tl.x,
          ordered.tl.y,
          ordered.tr.x,
          ordered.tr.y,
          ordered.br.x,
          ordered.br.y,
          ordered.bl.x,
          ordered.bl.y,
        ])
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, WARP_W, 0, WARP_W, WARP_H, 0, WARP_H])

        const M = cv.getPerspectiveTransform(srcTri, dstTri)
        const dst = new cv.Mat()
        cv.warpPerspective(src, dst, M, new cv.Size(WARP_W, WARP_H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
        warpedMat = dst

        srcTri.delete()
        dstTri.delete()
        M.delete()

        setLog("Entzerrt über Marker ✅ -> Jetzt Zählen")
      } else {
        warpedMat = new cv.Mat()
        cv.resize(src, warpedMat, new cv.Size(WARP_W, WARP_H), 0, 0, cv.INTER_AREA)
        setLog("Marker nicht sicher erkannt → nur Resize ✅ (druck besser SolidSquare Marker!)")
      }

      warpCanvas.width = WARP_W
      warpCanvas.height = WARP_H
      cv.imshow(warpCanvas, warpedMat)

      cleanup(cv, src, gray, bin, contours, hierarchy, warpedMat)
      drawOverlay()
    } catch (e) {
      console.error(e)
      setLog("OpenCV Fehler in scan(): " + String(e))
    }
  }

  // ---------- Counting ----------
  function countNow() {
    if (!cvReady) return setLog("OpenCV noch nicht bereit…")
    const cv = window.cv
    const warp = warpedCanvasRef.current
    if (!warp) return
    if (!imgUrl) return setLog("Bitte erst ein Foto aufnehmen/hochladen.")

    try {
      setLog("Zähle… (AUTO Table ROI → Grid entfernen → Ink-Density)")

      const src = cv.imread(warp)

      const roi = findTableRoiFromWarp(cv, src)
      if (!roi) {
        src.delete()
        setLog("Tabelle nicht gefunden. Tipp: näher ran + gerade + gutes Licht.")
        return
      }

      const rect = safeRect(cv, roi.x, roi.y, roi.w, roi.h, src.cols, src.rows)
      if (!rect) {
        src.delete()
        setLog("AUTO ROI ungültig.")
        return
      }

      const table = src.roi(rect)
      rect.delete?.()

      const gray = new cv.Mat()
      cv.cvtColor(table, gray, cv.COLOR_RGBA2GRAY)

      const bin = new cv.Mat()
      cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 9)

      const gridMask = buildGridMaskAggressive(cv, bin)
      const invGrid = new cv.Mat()
      cv.bitwise_not(gridMask, invGrid)
      const marks = new cv.Mat()
      cv.bitwise_and(bin, invGrid, marks)

      const openK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
      cv.morphologyEx(marks, marks, cv.MORPH_OPEN, openK)
      openK.delete()

      const out: any = {}
      const R = rows
      const C = HEADERS.length

      const xCuts: number[] = [0]
      for (let i = 0; i < colFracs.length; i++) xCuts.push(xCuts[i] + colFracs[i])
      const last = xCuts[xCuts.length - 1]
      for (let i = 0; i < xCuts.length; i++) xCuts[i] = xCuts[i] / last

      const tableW = marks.cols
      const tableH = marks.rows
      const rowH = tableH / R

      const inkRatioInCell = (x: number, y: number, w: number, h: number) => {
        if (w * h < MIN_CELL_AREA_PX) return 0

        const padX = Math.floor(w * INNER_PAD_RATIO)
        const padY = Math.floor(h * INNER_PAD_RATIO)
        const rx = x + padX
        const ry = y + padY
        const rw = Math.max(2, w - padX * 2)
        const rh = Math.max(2, h - padY * 2)

        const r = safeRect(cv, rx, ry, rw, rh, marks.cols, marks.rows)
        if (!r) return 0
        const sub = marks.roi(r)
        r.delete?.()

        const nz = cv.countNonZero(sub)
        const ratio = nz / (sub.cols * sub.rows)
        sub.delete()
        return ratio
      }

      for (let rr = 0; rr < R; rr++) {
        const rowKey = `row_${rr + 1}`
        out[rowKey] = {}
        const y0 = Math.round(rr * rowH)
        const h0 = Math.max(2, Math.round(rowH))

        for (let cc = 0; cc < C; cc++) {
          const x0 = Math.round(xCuts[cc] * tableW)
          const x1 = Math.round(xCuts[cc + 1] * tableW)
          const w0 = Math.max(2, x1 - x0)

          const header = HEADERS[cc]
          if (header === "SPIELER") {
            out[rowKey]["player"] = null
            continue
          }

          const ratio = inkRatioInCell(x0, y0, w0, h0)
          out[rowKey][header] = {
            marked: ratio >= INK_RATIO_THRESHOLD ? 1 : 0,
            ink: Number(ratio.toFixed(4)),
          }
        }
      }

      setCounts(out)
      setLog("Gezählt ✅")

      cleanup(cv, src, table, gray, bin, gridMask, invGrid, marks)
    } catch (e) {
      console.error(e)
      setLog("OpenCV Fehler in countNow(): " + String(e))
    }
  }

  // ---------- Overlay ----------
  function drawOverlay() {
    const warp = warpedCanvasRef.current
    const overlay = overlayCanvasRef.current
    if (!warp || !overlay) return

    overlay.width = Math.round(warp.width * zoom)
    overlay.height = Math.round(warp.height * zoom)

    const ctx = overlay.getContext("2d")!
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    ctx.drawImage(warp, 0, 0, overlay.width, overlay.height)

    // rote Scanner-Ecken
    const pad = Math.round(Math.min(overlay.width, overlay.height) * 0.045)
    const x = pad
    const y = pad
    const w = overlay.width - pad * 2
    const h = overlay.height - pad * 2
    const arm = Math.round(Math.min(w, h) * 0.12)

    ctx.strokeStyle = "rgba(255,0,0,0.85)"
    ctx.lineWidth = 6
    ctx.setLineDash([])

    // TL
    ctx.beginPath()
    ctx.moveTo(x, y + arm)
    ctx.lineTo(x, y)
    ctx.lineTo(x + arm, y)
    ctx.stroke()

    // TR
    ctx.beginPath()
    ctx.moveTo(x + w - arm, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + arm)
    ctx.stroke()

    // BL
    ctx.beginPath()
    ctx.moveTo(x, y + h - arm)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x + arm, y + h)
    ctx.stroke()

    // BR
    ctx.beginPath()
    ctx.moveTo(x + w - arm, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w, y + h - arm)
    ctx.stroke()

    if (!debug) return
    ctx.font = "bold 16px system-ui"
    ctx.fillStyle = "rgba(0,0,0,0.6)"
    ctx.fillText("Blatt in die roten Ecken halten", 16, 26)
  }

  return (
    <main style={{ padding: 14, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        <button
          onClick={scan}
          disabled={!imgUrl || !cvReady}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#111",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            fontWeight: 900,
            opacity: !imgUrl || !cvReady ? 0.5 : 1,
          }}
        >
          1) Scannen
        </button>

        <button
          onClick={countNow}
          disabled={!imgUrl || !cvReady}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#0a7",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            fontWeight: 900,
            opacity: !imgUrl || !cvReady ? 0.5 : 1,
          }}
        >
          2) Zählen
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          Zoom
          <input type="range" min={1} max={3.5} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
          <span style={{ width: 50 }}>{zoom.toFixed(1)}x</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Rows
          <input
            type="number"
            value={rows}
            min={6}
            max={30}
            onChange={(e) => {
              const v = Math.max(6, Math.min(30, parseInt(e.target.value || "8", 10)))
              setRows(v)
            }}
            style={{ width: 70 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Debug
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
        </label>
      </div>

      <div style={{ marginBottom: 10, color: "#333", fontWeight: 800 }}>{log}</div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fafafa", overflow: "auto" }}>
        <canvas ref={originalCanvasRef} style={{ display: "none" }} />
        <canvas ref={warpedCanvasRef} style={{ display: "none" }} />
        <canvas
          ref={overlayCanvasRef}
          style={{
            borderRadius: 12,
            border: "1px solid #ccc",
            background: "#fff",
            width: "100%",
            maxWidth: 980,
          }}
        />
      </div>

      <h3 style={{ marginTop: 14, marginBottom: 8 }}>Counts (JSON)</h3>
      <pre
        style={{
          background: "#0b1020",
          color: "#d6e1ff",
          padding: 12,
          borderRadius: 12,
          overflowX: "auto",
          minHeight: 140,
        }}
      >
        {counts ? JSON.stringify(counts, null, 2) : "Noch nichts gezählt…"}
      </pre>

      {/* ✅ ROW SUMMARY (damit du SOFORT siehst ob es stimmt) */}
      {counts ? (
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 900 }}>
          {Object.entries(counts).map(([rowKey, rowObj]: any) => {
            const markedCount = Object.entries(rowObj)
              .filter(([k]) => k !== "player")
              .reduce((acc, [, v]: any) => acc + (v?.marked ? 1 : 0), 0)

            return (
              <div key={rowKey}>
                {rowKey}: {markedCount} marks
              </div>
            )
          })}
        </div>
      ) : null}
    </main>
  )
}
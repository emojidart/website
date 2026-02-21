"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    cv: any
  }
}

type Roi = {
  x: number // 0..1
  y: number // 0..1
  w: number // 0..1
  h: number // 0..1
  rows: number
  cols: number
}

type Counts = Record<string, any>

const STAT_COLS = ["legs_w", "legs_l", "t20", "t19", "t18", "t17", "t16", "t15"]

// Mini-Grid pro Stat-Zelle (Formularannahme)
const MINI_COLS = 5
const MINI_ROWS = 9

// Warp-Zielgröße (für stabilere Geometrie)
const WARP_W = 1600
const WARP_H = 1130

// === Mark-Detection Tuning (gegen Linien-Reste) ===
const INNER_PAD_RATIO = 0.45 // größer = mehr Rand ignorieren
const MIN_COMP_AREA = 18 // Mindestfläche eines zusammenhängenden Blobs
const MIN_BBOX_FILL = 0.18 // area/(bbox_w*bbox_h) -> dünne Linien raus
const MAX_COMP_AREA_RATIO = 0.55 // zu groß => eher Schatten/Restfläche als X

export default function SheetScanDemo() {
  const [cvReady, setCvReady] = useState(false)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [log, setLog] = useState<string>("")
  const [zoom, setZoom] = useState(1.8)
  const [rows, setRows] = useState(5)
  const [roi, setRoi] = useState<Roi | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [debug, setDebug] = useState(true)

  const inputRef = useRef<HTMLInputElement | null>(null)

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const warpedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

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
    script.onerror = () => setLog("Fehler: opencv.js nicht gefunden. Lege /public/opencv/opencv.js ab.")
    document.body.appendChild(script)
  }, [])

  // ---------- ROI in Pixeln ----------
  const roiPx = useMemo(() => {
    if (!roi) return null
    const warp = warpedCanvasRef.current
    if (!warp) return null
    const W = warp.width
    const H = warp.height
    return {
      x: Math.round(roi.x * W),
      y: Math.round(roi.y * H),
      w: Math.round(roi.w * W),
      h: Math.round(roi.h * H),
      W,
      H,
    }
  }, [roi])

  // ---------- Overlay redraw ----------
  useEffect(() => {
    drawOverlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roi, zoom, imgUrl, debug])

  // ---------- Helpers ----------
  function cleanup(cv: any, ...mats: any[]) {
    mats.forEach((m) => m && m.delete && m.delete())
  }

  function orderPoints(pts: { x: number; y: number }[]) {
    // TL = min(x+y), BR = max(x+y), TR = min(x-y), BL = max(x-y)
    const sum = pts.map((p) => p.x + p.y)
    const diff = pts.map((p) => p.x - p.y)
    const tl = pts[sum.indexOf(Math.min(...sum))]
    const br = pts[sum.indexOf(Math.max(...sum))]
    const tr = pts[diff.indexOf(Math.min(...diff))]
    const bl = pts[diff.indexOf(Math.max(...diff))]
    return { tl, tr, br, bl }
  }

  function safeRect(cv: any, x: number, y: number, w: number, h: number, cols: number, rows: number) {
    const rx = Math.max(0, Math.min(cols - 1, Math.round(x)))
    const ry = Math.max(0, Math.min(rows - 1, Math.round(y)))
    const rw = Math.max(0, Math.min(cols - rx, Math.round(w)))
    const rh = Math.max(0, Math.min(rows - ry, Math.round(h)))
    if (rw <= 1 || rh <= 1) return null
    return new cv.Rect(rx, ry, rw, rh)
  }

  // ---------- File handling ----------
  function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    setCounts(null)
    setRoi(null)
    setLog("Bild geladen. Klicke 'Scannen'.")
    setTimeout(() => drawImageToCanvas(url), 30)
  }

  function drawImageToCanvas(url: string) {
    const canvas = originalCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      const maxW = 1400
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

  // ---------- AUTO ROI: Find mini checkbox block (bottom-left) ----------
  // Wichtig: auf dein Blatt/Screenshot getrimmt: Mini-Grid unten links.
  function autoDetectGridROI(cv: any, warpedMat: any): { x: number; y: number; w: number; h: number } | null {
    const W = warpedMat.cols
    const H = warpedMat.rows

    // Suchbereich: unten links
    const sx = Math.round(W * 0.05)
    const sy = Math.round(H * 0.45)
    const sw = Math.round(W * 0.45)
    const sh = Math.round(H * 0.45)

    const srect = safeRect(cv, sx, sy, sw, sh, W, H)
    if (!srect) return null

    const search = warpedMat.roi(srect)
    srect.delete?.()

    if (search.cols <= 2 || search.rows <= 2) {
      search.delete()
      return null
    }

    const g = new cv.Mat()
    cv.cvtColor(search, g, cv.COLOR_RGBA2GRAY)

    const bin = new cv.Mat()
    cv.adaptiveThreshold(g, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 5)

    // Close, damit der Block zusammenhängend wird
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, kernel)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let best: { x: number; y: number; w: number; h: number; area: number } | null = null

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const r = cv.boundingRect(cnt)
      const area = r.width * r.height

      if (area > 20000 && r.width > 200 && r.height > 200) {
        const ar = r.width / r.height
        if (ar > 0.7 && ar < 2.2) {
          if (!best || area > best.area) best = { x: r.x, y: r.y, w: r.width, h: r.height, area }
        }
      }
      cnt.delete()
    }

    cleanup(cv, g, bin, contours, hierarchy, kernel)
    search.delete()

    if (!best) return null

    // etwas padding rein (gegen Randlinien)
    const pad = 6
    const bx = best.x + pad
    const by = best.y + pad
    const bw = best.w - pad * 2
    const bh = best.h - pad * 2

    const frect = safeRect(cv, sx + bx, sy + by, bw, bh, W, H)
    if (!frect) return null
    const out = { x: frect.x, y: frect.y, w: frect.width, h: frect.height }
    frect.delete?.()
    return out
  }

  // ---------- Grid mask (aggressiv!) ----------
  // Ziel: Kästchen-Ränder wirklich komplett maskieren, damit sie nicht als Mark zählen.
  function buildGridMaskAggressive(cv: any, bin: any) {
    const W = bin.cols
    const H = bin.rows

    const horiz = bin.clone()
    const vert = bin.clone()

    // Größer als vorher => trifft die Kästchenlinien sicherer
    const hK = Math.max(22, Math.floor(W / 16))
    const vK = Math.max(22, Math.floor(H / 16))

    const hKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(hK, 1))
    const vKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, vK))

    cv.erode(horiz, horiz, hKernel)
    cv.dilate(horiz, horiz, hKernel)

    cv.erode(vert, vert, vKernel)
    cv.dilate(vert, vert, vKernel)

    const grid = new cv.Mat()
    cv.bitwise_or(horiz, vert, grid)

    // Grid dicker machen (kritisch!)
    const dilK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.dilate(grid, grid, dilK)
    cv.dilate(grid, grid, dilK)

    // Close, um kleine Lücken zu schließen
    const closeK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
    cv.morphologyEx(grid, grid, cv.MORPH_CLOSE, closeK)

    cleanup(cv, horiz, vert, hKernel, vKernel, dilK, closeK)
    return grid
  }

  // ---------- Mark cleanup ----------
  function cleanupMarks(cv: any, marks: any) {
    // Entfernt dünne Linienreste
    const openK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.morphologyEx(marks, marks, cv.MORPH_OPEN, openK)

    // optional leicht erodieren, damit Linienreste eher verschwinden
    const erK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.erode(marks, marks, erK)

    openK.delete()
    erK.delete()
  }

  // ---------- Count marks per mini-cell (strenger) ----------
  function countMiniMarksInCell(cv: any, marksRoi: any, rr: number, cc: number, rowsN: number, colsN: number) {
    const W = marksRoi.cols
    const H = marksRoi.rows

    const cellW = W / colsN
    const cellH = H / rowsN

    const x0 = Math.round(cc * cellW)
    const y0 = Math.round(rr * cellH)
    const w0 = Math.max(2, Math.round(cellW))
    const h0 = Math.max(2, Math.round(cellH))

    const miniW = w0 / MINI_COLS
    const miniH = h0 / MINI_ROWS

    let count = 0

    for (let r = 0; r < MINI_ROWS; r++) {
      for (let c = 0; c < MINI_COLS; c++) {
        const mx = Math.round(x0 + c * miniW)
        const my = Math.round(y0 + r * miniH)
        const mw = Math.max(2, Math.round(miniW))
        const mh = Math.max(2, Math.round(miniH))

        // Innenbereich (viel Rand ignorieren!)
        const padX = Math.max(1, Math.floor(mw * INNER_PAD_RATIO))
        const padY = Math.max(1, Math.floor(mh * INNER_PAD_RATIO))

        const rx = mx + padX
        const ry = my + padY
        const rw = mw - padX * 2
        const rh = mh - padY * 2
        if (rw < 4 || rh < 4) continue

        const rect = safeRect(cv, rx, ry, rw, rh, W, H)
        if (!rect) continue

        const sub = marksRoi.roi(rect)
        rect.delete?.()

        if (sub.cols <= 3 || sub.rows <= 3) {
          sub.delete()
          continue
        }

        // Connected components
        const labels = new cv.Mat()
        const stats = new cv.Mat()
        const centroids = new cv.Mat()
        const num = cv.connectedComponentsWithStats(sub, labels, stats, centroids, 8, cv.CV_32S)

        let hasMark = false
        const maxArea = sub.cols * sub.rows * MAX_COMP_AREA_RATIO

        for (let i = 1; i < num; i++) {
          const area = stats.intAt(i, cv.CC_STAT_AREA)
          const bw = stats.intAt(i, cv.CC_STAT_WIDTH)
          const bh = stats.intAt(i, cv.CC_STAT_HEIGHT)

          if (bw < 3 || bh < 3) continue
          if (area < MIN_COMP_AREA) continue
          if (area > maxArea) continue

          const fill = area / (bw * bh) // dünne Linien => sehr kleines fill
          if (fill < MIN_BBOX_FILL) continue

          // Wenn wir hier sind, ist es sehr wahrscheinlich ein echtes Kreuz/Mark
          hasMark = true
          break
        }

        labels.delete()
        stats.delete()
        centroids.delete()
        sub.delete()

        if (hasMark) count++
      }
    }

    return count
  }

  // ---------- SCAN ----------
  function scan() {
    if (!cvReady) return setLog("OpenCV noch nicht bereit…")
    const cv = window.cv
    const srcCanvas = originalCanvasRef.current
    const warpCanvas = warpedCanvasRef.current
    if (!srcCanvas || !warpCanvas) return

    try {
      setLog("Scanne: Marker suchen → entzerren → Mini-Kästchenblock finden…")
      setCounts(null)
      setRoi(null)

      const src = cv.imread(srcCanvas)
      const gray = new cv.Mat()
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

      // Marker-Kandidaten (schwarz)
      const bin = new cv.Mat()
      cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 7)

      const contours = new cv.MatVector()
      const hierarchy = new cv.Mat()
      cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

      const candidates: { cx: number; cy: number; area: number; approx: any }[] = []
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i)
        const area = cv.contourArea(cnt)
        if (area < 250) {
          cnt.delete()
          continue
        }
        const peri = cv.arcLength(cnt, true)
        const approx = new cv.Mat()
        cv.approxPolyDP(cnt, approx, 0.03 * peri, true)

        if (approx.rows === 4) {
          const rect = cv.boundingRect(cnt)
          const ar = rect.width / rect.height
          if (ar > 0.75 && ar < 1.25) {
            const m = cv.moments(cnt)
            const cx = m.m10 / m.m00
            const cy = m.m01 / m.m00
            candidates.push({ cx, cy, area, approx })
          } else {
            approx.delete()
          }
        } else {
          approx.delete()
        }
        cnt.delete()
      }

      let warpedMat: any = null

      if (candidates.length >= 4) {
        candidates.sort((a, b) => b.area - a.area)
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
        candidates.forEach((c) => c.approx.delete())
      } else {
        // Kein Marker: einfach resize
        warpedMat = new cv.Mat()
        cv.resize(src, warpedMat, new cv.Size(WARP_W, WARP_H), 0, 0, cv.INTER_AREA)
      }

      // in Canvas schreiben
      warpCanvas.width = WARP_W
      warpCanvas.height = WARP_H
      cv.imshow(warpCanvas, warpedMat)

      // Auto-ROI (unten links)
      const auto = autoDetectGridROI(cv, warpedMat)
      if (!auto) {
        setLog("Entzerrt ✅ Aber Mini-Kästchenblock nicht erkannt. Debug an → Foto gerader/heller.")
        setRoi(null)
      } else {
        const newRoi: Roi = {
          x: auto.x / WARP_W,
          y: auto.y / WARP_H,
          w: auto.w / WARP_W,
          h: auto.h / WARP_H,
          rows,
          cols: STAT_COLS.length,
        }
        setRoi(newRoi)
        setLog("Entzerrt ✅ Mini-Kästchenblock erkannt ✅ Jetzt 'Zählen'.")
      }

      cleanup(cv, src, gray, bin, contours, hierarchy, warpedMat)
      drawOverlay()
    } catch (e) {
      console.error("OpenCV scan error:", e)
      setLog("OpenCV Fehler in scan(): " + String(e))
    }
  }

  // ---------- COUNT ----------
  function countNow() {
    if (!cvReady) return setLog("OpenCV noch nicht bereit…")
    const cv = window.cv
    const warp = warpedCanvasRef.current
    if (!warp) return
    if (!roiPx || !roi) return setLog("Kein ROI erkannt. Erst 'Scannen'.")

    try {
      setLog("Zähle… (Grid aggressiv entfernen → Marks filtern → Components prüfen)")

      const src = cv.imread(warp)

      const rect = safeRect(cv, roiPx.x, roiPx.y, roiPx.w, roiPx.h, src.cols, src.rows)
      if (!rect) {
        src.delete()
        setLog("ROI ungültig/out of bounds. Bitte erneut scannen.")
        return
      }

      const roiMat = src.roi(rect)
      rect.delete?.()

      if (roiMat.cols <= 2 || roiMat.rows <= 2) {
        roiMat.delete()
        src.delete()
        setLog("ROI ist leer/zu klein. Bitte erneut scannen.")
        return
      }

      const gray = new cv.Mat()
      cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY)

      // Etwas konservativer threshold
      const bin = new cv.Mat()
      cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 9)

      // GridMask (aggressiv)
      const gridMask = buildGridMaskAggressive(cv, bin)

      // marks = bin & ~gridMask
      const invGrid = new cv.Mat()
      cv.bitwise_not(gridMask, invGrid)

      const marks = new cv.Mat()
      cv.bitwise_and(bin, invGrid, marks)

      // Marks cleanup gegen Linienreste
      cleanupMarks(cv, marks)

      const out: any = {}
      const R = roi.rows
      const C = roi.cols

      for (let rr = 0; rr < R; rr++) {
        const rowKey = `row_${rr + 1}`
        out[rowKey] = {}
        for (let cc = 0; cc < C; cc++) {
          const key = STAT_COLS[cc] ?? `c${cc + 1}`
          out[rowKey][key] = countMiniMarksInCell(cv, marks, rr, cc, R, C)
        }
      }

      setCounts(out)
      setLog("Gezählt ✅")

      cleanup(cv, src, roiMat, gray, bin, gridMask, invGrid, marks)
    } catch (e) {
      console.error("OpenCV count error:", e)
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

    if (!debug || !roi) return

    const x = roi.x * overlay.width
    const y = roi.y * overlay.height
    const w = roi.w * overlay.width
    const h = roi.h * overlay.height

    ctx.strokeStyle = "rgba(0,200,0,0.95)"
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)

    // Big grid lines
    ctx.strokeStyle = "rgba(30,120,255,0.55)"
    ctx.lineWidth = 2

    for (let r = 1; r < roi.rows; r++) {
      const yy = y + (h * r) / roi.rows
      ctx.beginPath()
      ctx.moveTo(x, yy)
      ctx.lineTo(x + w, yy)
      ctx.stroke()
    }
    for (let c = 1; c < roi.cols; c++) {
      const xx = x + (w * c) / roi.cols
      ctx.beginPath()
      ctx.moveTo(xx, y)
      ctx.lineTo(xx, y + h)
      ctx.stroke()
    }
  }

  // ---------- UI ----------
  return (
    <main style={{ padding: 14, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
            fontWeight: 800,
            opacity: !imgUrl || !cvReady ? 0.5 : 1,
          }}
        >
          Scannen (Auto-ROI)
        </button>

        <button
          onClick={countNow}
          disabled={!imgUrl || !cvReady || !roi}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#0a7",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            fontWeight: 900,
            opacity: !imgUrl || !cvReady || !roi ? 0.5 : 1,
          }}
        >
          Zählen
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
            min={1}
            max={10}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, parseInt(e.target.value || "5", 10)))
              setRows(v)
              setRoi((prev) => (prev ? { ...prev, rows: v } : prev))
            }}
            style={{ width: 60 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Debug
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
        </label>
      </div>

      <div style={{ marginBottom: 10, color: "#333", fontWeight: 700 }}>{log}</div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fafafa", overflow: "auto" }}>
        <canvas ref={originalCanvasRef} style={{ display: "none" }} />
        <canvas ref={warpedCanvasRef} style={{ display: "none" }} />

        <canvas
          ref={overlayCanvasRef}
          style={{
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
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
          minHeight: 120,
        }}
      >
        {counts ? JSON.stringify(counts, null, 2) : "Noch nichts gezählt…"}
      </pre>

      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>
        Wenn noch zu viel gezählt wird: erhöhe <code>INNER_PAD_RATIO</code> leicht (0.48) oder <code>MIN_COMP_AREA</code> (22).
      </div>
    </main>
  )
}
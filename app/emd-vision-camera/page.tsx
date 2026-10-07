"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addThrow, createGame, gameStats, replaceLastThrow, undoLastThrow, type VisionGameState } from "@/lib/emd-vision/game"
import { hitFromLabel, type VisionHit } from "@/lib/emd-vision/scoring"
import { detectDart, referenceSimilarity, type Calibration, type Point } from "@/lib/emd-vision/vision"

const CALIBRATION_KEY = "emd-vision-camera-calibration-v1"
const CAMERA_KEY = "emd-vision-camera-device-v1"

const CALIBRATION_LABELS = [
  "Bull",
  "D20 oben",
  "D6 rechts",
  "D3 unten",
  "D11 links",
]

const CORRECTION_LABELS = [
  "T20", "S20", "D20", "T19", "S19", "D19",
  "T18", "S18", "D18", "T17", "S17", "D17",
  "T16", "S16", "D16", "T15", "S15", "D15",
  "BULL", "DBULL", "MISS",
]

type CameraDevice = { deviceId: string; label: string }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function nowLabel() {
  return new Intl.DateTimeFormat("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date())
}

export default function EmdVisionCameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const previousFrameRef = useRef<ImageData | null>(null)
  const referenceFrameRef = useRef<ImageData | null>(null)
  const lastTipRef = useRef<Point | null>(null)
  const stableSinceRef = useRef<number | null>(null)
  const clearSinceRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastAcceptedAtRef = useRef(0)
  const wakeLockRef = useRef<any>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([])
  const [cameraDeviceId, setCameraDeviceId] = useState("")
  const [calibration, setCalibration] = useState<Calibration | null>(null)
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [calibrating, setCalibrating] = useState(false)
  const [calibrationDraft, setCalibrationDraft] = useState<Point | null>(null)
  const [calibrationZoom, setCalibrationZoom] = useState(5)
  const [nudgeStep, setNudgeStep] = useState(1)
  const [referenceReady, setReferenceReady] = useState(false)
  const [recognitionEnabled, setRecognitionEnabled] = useState(false)
  const [waitingForClear, setWaitingForClear] = useState(false)
  const [lastHit, setLastHit] = useState<VisionHit | null>(null)
  const [lastHitTime, setLastHitTime] = useState("")
  const [game, setGame] = useState<VisionGameState>(() => createGame())
  const [manualMode, setManualMode] = useState<"replace" | "add">("replace")
  const [message, setMessage] = useState("Kamera starten")
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 })
  const [zoom, setZoom] = useState(1)

  const stats = useMemo(() => gameStats(game), [game])

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = null

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Kamera ${index + 1}`,
        }))
      setCameraDevices(cams)
    } catch {
      setCameraDevices([])
    }
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      wakeLockRef.current = await (navigator as any).wakeLock?.request?.("screen")
    } catch {}
  }, [])

  const applyTrackFeatures = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as any

    if (caps?.torch) setTorchSupported(true)
    else setTorchSupported(false)

    if (caps?.zoom) {
      setZoomSupported(true)
      const next = {
        min: Number(caps.zoom.min ?? 1),
        max: Number(caps.zoom.max ?? 1),
        step: Number(caps.zoom.step ?? 0.1),
      }
      setZoomRange(next)
      setZoom(clamp(Number(track.getSettings?.().zoom ?? next.min), next.min, next.max))
    } else {
      setZoomSupported(false)
    }
  }, [])

  const startCamera = useCallback(async (preferredDeviceId?: string) => {
    stopCamera()

    try {
      const saved = preferredDeviceId || localStorage.getItem(CAMERA_KEY) || ""
      const video: MediaTrackConstraints = {
        facingMode: saved ? undefined : { ideal: "environment" },
        deviceId: saved ? { exact: saved } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      }

      let stream: MediaStream

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        })
      }

      streamRef.current = stream
      const element = videoRef.current
      if (!element) return

      element.srcObject = stream
      await element.play()

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()
      if (settings.deviceId) {
        setCameraDeviceId(settings.deviceId)
        localStorage.setItem(CAMERA_KEY, settings.deviceId)
      }

      setCameraReady(true)
      setMessage("Kamera bereit")
      applyTrackFeatures(stream)
      await refreshDevices()
      void requestWakeLock()
    } catch {
      setMessage("Kamerazugriff erlauben")
      setCameraReady(false)
    }
  }, [applyTrackFeatures, refreshDevices, requestWakeLock, stopCamera])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CALIBRATION_KEY)
      if (stored) setCalibration(JSON.parse(stored))
    } catch {}

    void startCamera()

    return () => {
      stopCamera()
      try { wakeLockRef.current?.release?.() } catch {}
    }
  }, [startCamera, stopCamera])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void requestWakeLock()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [requestWakeLock])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = sampleCanvasRef.current
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null

    // Process at max 960px width to keep mobile CPU usage low.
    const scale = Math.min(1, 960 / video.videoWidth)
    const width = Math.max(320, Math.round(video.videoWidth * scale))
    const height = Math.max(240, Math.round(video.videoHeight * scale))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height)
  }, [])

  const calibrationForFrame = useCallback((frame: ImageData): Calibration | null => {
    if (!calibration) return null

    if (calibration.width === frame.width && calibration.height === frame.height) {
      return calibration
    }

    const sx = frame.width / calibration.width
    const sy = frame.height / calibration.height
    const scalePoint = (p: Point) => ({ x: p.x * sx, y: p.y * sy })

    return {
      ...calibration,
      center: scalePoint(calibration.center),
      top: scalePoint(calibration.top),
      right: scalePoint(calibration.right),
      bottom: scalePoint(calibration.bottom),
      left: scalePoint(calibration.left),
      width: frame.width,
      height: frame.height,
    }
  }, [calibration])

  const drawOverlay = useCallback(() => {
    const video = videoRef.current
    const canvas = overlayCanvasRef.current
    if (!video || !canvas) return

    const rect = video.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const cw = rect.width
    const ch = rect.height

    const points = calibrating
      ? calibrationPoints
      : calibration
        ? [calibration.center, calibration.top, calibration.right, calibration.bottom, calibration.left].map((p) => {
            const sample = sampleCanvasRef.current
            if (!sample?.width || !sample.height) return p
            return { x: p.x / sample.width * cw, y: p.y / sample.height * ch }
          })
        : []

    points.forEach((p, index) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, index === 0 ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = index === 0 ? "#fb923c" : "#fed7aa"
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = "rgba(0,0,0,.75)"
      ctx.stroke()
    })

    if (points.length >= 5) {
      ctx.beginPath()
      ctx.moveTo(points[1].x, points[1].y)
      ctx.lineTo(points[2].x, points[2].y)
      ctx.lineTo(points[3].x, points[3].y)
      ctx.lineTo(points[4].x, points[4].y)
      ctx.closePath()
      ctx.strokeStyle = "rgba(251,146,60,.72)"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  }, [calibrating, calibrationPoints, calibration])

  useEffect(() => {
    drawOverlay()
    window.addEventListener("resize", drawOverlay)
    return () => window.removeEventListener("resize", drawOverlay)
  }, [drawOverlay])

  useEffect(() => {
    if (!cameraReady) return

    let lastSampleAt = 0

    const loop = (time: number) => {
      animationRef.current = requestAnimationFrame(loop)

      // Around 8 FPS analysis is enough for dart detection and easy on a phone.
      if (time - lastSampleAt < 125) return
      lastSampleAt = time

      const frame = captureFrame()
      if (!frame) return

      const previous = previousFrameRef.current
      previousFrameRef.current = frame

      if (!recognitionEnabled || !referenceReady || !calibration || !previous || game.finished) {
        stableSinceRef.current = null
        return
      }

      const cal = calibrationForFrame(frame)
      if (!cal) return

      if (waitingForClear) {
        const reference = referenceFrameRef.current
        if (!reference || reference.width !== frame.width || reference.height !== frame.height) return

        const ratio = referenceSimilarity(reference, frame)
        if (ratio < 0.018) {
          if (clearSinceRef.current === null) clearSinceRef.current = performance.now()

          if (performance.now() - clearSinceRef.current > 650) {
            previousFrameRef.current = frame
            lastTipRef.current = null
            clearSinceRef.current = null
            stableSinceRef.current = null
            setWaitingForClear(false)
            setMessage("Bereit für den nächsten Wurf")
          }
        } else {
          clearSinceRef.current = null
        }

        return
      }

      // First determine whether the scene is sufficiently stable.
      let changedPixels = 0
      const step = 4
      for (let y = 0; y < frame.height; y += step) {
        for (let x = 0; x < frame.width; x += step) {
          const i = (y * frame.width + x) * 4
          const a = (frame.data[i] + frame.data[i + 1] + frame.data[i + 2]) / 3
          const b = (previous.data[i] + previous.data[i + 1] + previous.data[i + 2]) / 3
          if (Math.abs(a - b) > 30) changedPixels++
        }
      }

      const sampled = Math.ceil(frame.width / step) * Math.ceil(frame.height / step)
      const motionRatio = sampled ? changedPixels / sampled : 0

      if (motionRatio < 0.006) {
        if (stableSinceRef.current === null) stableSinceRef.current = performance.now()
      } else {
        stableSinceRef.current = null
        return
      }

      if (
        stableSinceRef.current !== null &&
        performance.now() - stableSinceRef.current >= 360 &&
        performance.now() - lastAcceptedAtRef.current > 650
      ) {
        const detection = detectDart(previous, frame, cal, lastTipRef.current)

        if (detection && detection.hit.confidence >= 0.42) {
          lastTipRef.current = detection.pixel
          lastAcceptedAtRef.current = performance.now()
          stableSinceRef.current = null

          setLastHit(detection.hit)
          setLastHitTime(nowLabel())

          setGame((old) => {
            const beforeTurns = old.turns.length
            const next = addThrow(old, detection.hit)
            const turnFinished = next.turns.length > beforeTurns

            if (turnFinished && !next.finished) {
              setWaitingForClear(true)
              setMessage(next.bust ? "Bust · Darts entfernen" : "Darts entfernen")
            } else if (next.finished) {
              setMessage("Leg beendet")
            } else {
              setMessage(`${detection.hit.label} erkannt`)
            }

            return next
          })
        }
      }
    }

    animationRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [
    cameraReady,
    recognitionEnabled,
    referenceReady,
    calibration,
    game.finished,
    waitingForClear,
    captureFrame,
    calibrationForFrame,
  ])

  useEffect(() => {
    if (!calibrating || !calibrationDraft) return

    let raf = 0

    const drawMagnifier = () => {
      const video = videoRef.current
      const sample = sampleCanvasRef.current
      const canvas = magnifierCanvasRef.current
      if (!video || !sample || !canvas || !video.videoWidth || !video.videoHeight) {
        raf = requestAnimationFrame(drawMagnifier)
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const size = 360
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size
        canvas.height = size
      }

      // calibrationDraft is stored in processing-frame coordinates. Convert it to video coordinates.
      const videoX = calibrationDraft.x / Math.max(1, sample.width) * video.videoWidth
      const videoY = calibrationDraft.y / Math.max(1, sample.height) * video.videoHeight
      const sourceSize = Math.max(70, Math.min(video.videoWidth, video.videoHeight) / calibrationZoom)
      const sx = clamp(videoX - sourceSize / 2, 0, Math.max(0, video.videoWidth - sourceSize))
      const sy = clamp(videoY - sourceSize / 2, 0, Math.max(0, video.videoHeight - sourceSize))

      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(video, sx, sy, sourceSize, sourceSize, 0, 0, size, size)

      // Fixed crosshair: the point being saved is always exactly here.
      const c = size / 2
      ctx.save()
      ctx.strokeStyle = "rgba(251,146,60,.98)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(c - 42, c)
      ctx.lineTo(c + 42, c)
      ctx.moveTo(c, c - 42)
      ctx.lineTo(c, c + 42)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(c, c, 9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      raf = requestAnimationFrame(drawMagnifier)
    }

    raf = requestAnimationFrame(drawMagnifier)
    return () => cancelAnimationFrame(raf)
  }, [calibrating, calibrationDraft, calibrationZoom])

  const moveCalibrationDraft = useCallback((dx: number, dy: number) => {
    const sample = sampleCanvasRef.current
    if (!sample) return
    setCalibrationDraft((old) => old ? ({
      x: clamp(old.x + dx, 0, sample.width - 1),
      y: clamp(old.y + dy, 0, sample.height - 1),
    }) : old)
  }, [])

  const confirmCalibrationDraft = useCallback(() => {
    if (!calibrationDraft) return
    const sample = sampleCanvasRef.current
    if (!sample) return

    const next = [...calibrationPoints, calibrationDraft]
    setCalibrationPoints(next)
    setCalibrationDraft(null)

    if (next.length < 5) {
      setMessage(`${CALIBRATION_LABELS[next.length]} grob antippen`)
      return
    }

    const nextCalibration: Calibration = {
      center: next[0],
      top: next[1],
      right: next[2],
      bottom: next[3],
      left: next[4],
      width: sample.width,
      height: sample.height,
      savedAt: Date.now(),
    }

    setCalibration(nextCalibration)
    setCalibrating(false)
    setMessage("Kalibrierung gespeichert")
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(nextCalibration))
  }, [calibrationDraft, calibrationPoints])

  const beginCalibration = () => {
    setRecognitionEnabled(false)
    setReferenceReady(false)
    referenceFrameRef.current = null
    previousFrameRef.current = null
    setCalibrationPoints([])
    setCalibrationDraft(null)
    setCalibrationZoom(5)
    setNudgeStep(1)
    setCalibrating(true)
    setMessage(`${CALIBRATION_LABELS[0]} grob antippen`)
  }

  const onOverlayClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!calibrating || calibrationDraft) return

    const canvas = overlayCanvasRef.current
    const sample = sampleCanvasRef.current
    if (!canvas || !sample) return

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width * sample.width
    const y = (event.clientY - rect.top) / rect.height * sample.height

    setCalibrationDraft({ x, y })
    setMessage(`${CALIBRATION_LABELS[calibrationPoints.length]} fein einstellen`)
  }

  const captureReference = () => {
    const frame = captureFrame()
    if (!frame || !calibration) {
      setMessage("Zuerst Board kalibrieren")
      return
    }

    referenceFrameRef.current = frame
    previousFrameRef.current = frame
    lastTipRef.current = null
    setWaitingForClear(false)
    setReferenceReady(true)
    setRecognitionEnabled(true)
    setMessage("Bereit für den ersten Wurf")
  }

  const newLeg = () => {
    setGame(createGame())
    setLastHit(null)
    setLastHitTime("")
    setWaitingForClear(false)
    lastTipRef.current = null

    const frame = captureFrame()
    if (frame && calibration) {
      referenceFrameRef.current = frame
      previousFrameRef.current = frame
      setReferenceReady(true)
      setRecognitionEnabled(true)
      setMessage("Bereit für den ersten Wurf")
    } else {
      setRecognitionEnabled(false)
      setReferenceReady(false)
      setMessage("Leeres Board bestätigen")
    }
  }

  const undo = () => {
    setGame((old) => undoLastThrow(old))
    setWaitingForClear(false)
    lastTipRef.current = null
    setMessage("Letzter Wurf zurückgenommen")
  }

  const applyManual = (label: string) => {
    const hit = hitFromLabel(label)

    if (manualMode === "replace") {
      setGame((old) => replaceLastThrow(old, hit))
      setMessage(`${label} korrigiert`)
    } else {
      setGame((old) => addThrow(old, hit, { manual: true }))
      setMessage(`${label} nachgetragen`)
    }

    setLastHit(hit)
    setLastHitTime(nowLabel())
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as any
    if (!track) return

    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {}
  }

  const changeZoom = async (nextZoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0] as any
    if (!track) return

    const value = clamp(nextZoom, zoomRange.min, zoomRange.max)
    try {
      await track.applyConstraints({ advanced: [{ zoom: value }] })
      setZoom(value)
    } catch {}
  }

  const chooseCamera = async (deviceId: string) => {
    setCameraDeviceId(deviceId)
    localStorage.setItem(CAMERA_KEY, deviceId)
    await startCamera(deviceId)
  }

  const toggleRecognition = () => {
    if (!referenceReady) {
      setMessage("Leeres Board bestätigen")
      return
    }

    setRecognitionEnabled((old) => {
      const next = !old
      setMessage(next ? "Erkennung aktiv" : "Erkennung pausiert")
      return next
    })
  }

  return (
    <main className="min-h-[100dvh] bg-[#030303] text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1550px] flex-col p-3 sm:p-4 lg:p-5">
        <header className="flex items-center justify-between gap-4 rounded-[22px] border border-white/[.08] bg-black/40 px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,.30)] backdrop-blur-xl sm:px-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[.28em] text-orange-300/75">EMD</div>
            <div className="text-xl font-black tracking-[-.04em] sm:text-2xl">VISION</div>
          </div>

          <div className="rounded-full border border-orange-300/15 bg-orange-500/[.07] px-3 py-2 text-right text-[11px] font-black uppercase tracking-[.12em] text-orange-100 sm:px-4 sm:text-xs">
            {message}
          </div>
        </header>

        <div className="mt-3 grid flex-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <section className="flex min-h-0 flex-col rounded-[24px] border border-white/[.08] bg-black/35 p-3 shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:p-4">
            <div className="relative min-h-[48dvh] flex-1 overflow-hidden rounded-[18px] bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full object-contain"
              />
              <canvas
                ref={overlayCanvasRef}
                onClick={onOverlayClick}
                className={`absolute inset-0 h-full w-full ${calibrating ? "cursor-crosshair" : "pointer-events-none"}`}
              />
              <canvas ref={sampleCanvasRef} className="hidden" />

              {!cameraReady ? (
                <div className="absolute inset-0 grid place-items-center bg-[#070707] px-5 text-center">
                  <button
                    onClick={() => startCamera()}
                    className="rounded-2xl bg-orange-400 px-6 py-4 text-base font-black text-black"
                  >
                    Kamera starten
                  </button>
                </div>
              ) : null}

              {calibrating ? (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-orange-300/20 bg-black/70 px-4 py-3 text-center font-black backdrop-blur-xl">
                  {calibrationDraft
                    ? `${CALIBRATION_LABELS[Math.min(calibrationPoints.length, 4)]} fein einstellen`
                    : `${CALIBRATION_LABELS[Math.min(calibrationPoints.length, 4)]} grob antippen`}
                </div>
              ) : null}

              {calibrating && calibrationDraft ? (
                <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/88 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4">
                  <div className="my-auto w-full max-w-[430px] rounded-[22px] border border-orange-300/20 bg-[#090909] p-3 shadow-[0_30px_100px_rgba(0,0,0,.75)] sm:p-4">
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-[.20em] text-orange-300/70 sm:text-[11px]">Feineinstellung</div>
                      <div className="mt-0.5 text-lg font-black sm:mt-1 sm:text-xl">
                        {CALIBRATION_LABELS[Math.min(calibrationPoints.length, 4)]}
                      </div>
                      <div className="mt-0.5 text-[11px] font-bold text-white/45 sm:mt-1 sm:text-xs">Punkt genau unter das Fadenkreuz schieben</div>
                    </div>

                    <div className="mx-auto mt-2 aspect-square w-full max-w-[250px] overflow-hidden rounded-[16px] border border-white/[.10] bg-black sm:mt-3 sm:max-w-[320px]">
                      <canvas
                        ref={magnifierCanvasRef}
                        className="h-full w-full touch-none"
                        onClick={(event) => {
                          const canvas = magnifierCanvasRef.current
                          const sample = sampleCanvasRef.current
                          if (!canvas || !sample) return
                          const rect = canvas.getBoundingClientRect()
                          const dxDisplay = event.clientX - (rect.left + rect.width / 2)
                          const dyDisplay = event.clientY - (rect.top + rect.height / 2)
                          const approxSourcePerDisplay = (Math.min(videoRef.current?.videoWidth || 1, videoRef.current?.videoHeight || 1) / calibrationZoom) / rect.width
                          const sx = sample.width / Math.max(1, videoRef.current?.videoWidth || sample.width)
                          const sy = sample.height / Math.max(1, videoRef.current?.videoHeight || sample.height)
                          moveCalibrationDraft(dxDisplay * approxSourcePerDisplay * sx, dyDisplay * approxSourcePerDisplay * sy)
                        }}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mt-3">
                      <button
                        onClick={() => setCalibrationZoom((z) => clamp(z - 1, 3, 9))}
                        className="min-h-11 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2.5 text-sm font-black"
                      >
                        − Zoom
                      </button>
                      <div className="min-w-10 px-1 text-center text-sm font-black text-orange-200">{calibrationZoom}×</div>
                      <button
                        onClick={() => setCalibrationZoom((z) => clamp(z + 1, 3, 9))}
                        className="min-h-11 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2.5 text-sm font-black"
                      >
                        + Zoom
                      </button>
                    </div>

                    <div className="mx-auto mt-2 grid w-[174px] grid-cols-3 gap-1.5 sm:mt-3 sm:w-[192px] sm:gap-2">
                      <div />
                      <button onClick={() => moveCalibrationDraft(0, -nudgeStep)} className="grid min-h-11 place-items-center rounded-xl border border-white/[.09] bg-white/[.05] text-xl font-black">↑</button>
                      <div />
                      <button onClick={() => moveCalibrationDraft(-nudgeStep, 0)} className="grid min-h-11 place-items-center rounded-xl border border-white/[.09] bg-white/[.05] text-xl font-black">←</button>
                      <button
                        onClick={() => setNudgeStep((s) => s === 1 ? 5 : 1)}
                        className="min-h-11 rounded-xl border border-orange-300/15 bg-orange-500/[.07] px-1 text-xs font-black text-orange-100"
                      >
                        {nudgeStep === 1 ? "1 px" : "5 px"}
                      </button>
                      <button onClick={() => moveCalibrationDraft(nudgeStep, 0)} className="grid min-h-11 place-items-center rounded-xl border border-white/[.09] bg-white/[.05] text-xl font-black">→</button>
                      <div />
                      <button onClick={() => moveCalibrationDraft(0, nudgeStep)} className="grid min-h-11 place-items-center rounded-xl border border-white/[.09] bg-white/[.05] text-xl font-black">↓</button>
                      <div />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
                      <button
                        onClick={() => {
                          setCalibrationDraft(null)
                          setMessage(`${CALIBRATION_LABELS[calibrationPoints.length]} grob antippen`)
                        }}
                        className="min-h-11 rounded-xl border border-white/[.09] bg-white/[.04] px-3 py-2.5 text-sm font-black"
                      >
                        Neu antippen
                      </button>
                      <button
                        onClick={confirmCalibrationDraft}
                        className="min-h-11 rounded-xl bg-orange-400 px-3 py-2.5 text-sm font-black text-black"
                      >
                        Punkt übernehmen
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {waitingForClear ? (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-white/[.10] bg-black/75 px-4 py-3 text-center text-base font-black backdrop-blur-xl">
                  Darts entfernen
                </div>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                onClick={beginCalibration}
                className="rounded-xl border border-white/[.09] bg-white/[.04] px-4 py-3 text-sm font-black"
              >
                Kalibrieren
              </button>

              <button
                onClick={captureReference}
                disabled={!calibration}
                className="rounded-xl border border-white/[.09] bg-white/[.04] px-4 py-3 text-sm font-black disabled:opacity-35"
              >
                Leeres Board
              </button>

              <button
                onClick={toggleRecognition}
                className={`rounded-xl border px-4 py-3 text-sm font-black ${
                  recognitionEnabled
                    ? "border-emerald-300/20 bg-emerald-400/[.08] text-emerald-100"
                    : "border-white/[.09] bg-white/[.04]"
                }`}
              >
                {recognitionEnabled ? "Erkennung läuft" : "Erkennung starten"}
              </button>

              {torchSupported ? (
                <button
                  onClick={toggleTorch}
                  className={`rounded-xl border px-4 py-3 text-sm font-black ${
                    torchOn
                      ? "border-orange-300/20 bg-orange-400/[.10] text-orange-100"
                      : "border-white/[.09] bg-white/[.04]"
                  }`}
                >
                  Licht {torchOn ? "an" : "aus"}
                </button>
              ) : null}
            </div>

            {cameraDevices.length > 1 || zoomSupported ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {cameraDevices.length > 1 ? (
                  <select
                    value={cameraDeviceId}
                    onChange={(event) => chooseCamera(event.target.value)}
                    className="w-full rounded-xl border border-white/[.09] bg-[#111] px-3 py-3 text-sm font-bold"
                  >
                    {cameraDevices.map((camera, index) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Kamera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                ) : <div />}

                {zoomSupported ? (
                  <label className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.03] px-3 py-2">
                    <span className="shrink-0 text-xs font-black uppercase tracking-[.14em] text-white/45">Zoom</span>
                    <input
                      type="range"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={zoom}
                      onChange={(event) => void changeZoom(Number(event.target.value))}
                      className="w-full"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col rounded-[24px] border border-white/[.08] bg-black/35 p-4 shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[.22em] text-white/35">501 · Double Out</div>
                <div className="mt-1 text-[clamp(5rem,15vw,9rem)] font-black leading-[.82] tracking-[-.085em]">
                  {game.remaining}
                </div>
              </div>

              {lastHit ? (
                <div className="rounded-2xl border border-orange-300/15 bg-orange-500/[.07] px-3 py-2 text-right">
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-200/60">{lastHitTime}</div>
                  <div className="mt-1 text-2xl font-black text-orange-200">{lastHit.label}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="grid min-h-20 place-items-center rounded-2xl border border-white/[.08] bg-white/[.025] text-2xl font-black"
                >
                  {game.currentTurn[index]?.label || "–"}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={newLeg}
                className="rounded-xl bg-orange-400 px-3 py-3 text-sm font-black text-black"
              >
                Neues Leg
              </button>
              <button
                onClick={undo}
                className="rounded-xl border border-white/[.09] bg-white/[.04] px-3 py-3 text-sm font-black"
              >
                Zurück
              </button>
              <button
                onClick={() => {
                  const data = JSON.stringify({ game, stats, savedAt: new Date().toISOString() }, null, 2)
                  localStorage.setItem("emd-vision-last-session", data)
                  setMessage("Spiel gespeichert")
                }}
                className="rounded-xl border border-white/[.09] bg-white/[.04] px-3 py-3 text-sm font-black"
              >
                Speichern
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="3-Dart-Average" value={stats.threeDartAverage.toFixed(2)} />
              <Stat label="Würfe" value={stats.throws} />
              <Stat label="100+" value={stats.hundredPlus} />
              <Stat label="140+" value={stats.hundredFortyPlus} />
              <Stat label="180" value={stats.maxes} />
              <Stat label="Triple" value={stats.triples} />
            </div>

            <div className="mt-5">
              <div className="text-sm font-black">Wurf anpassen</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setManualMode("replace")}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-black ${
                    manualMode === "replace"
                      ? "border-orange-300/20 bg-orange-400/[.10] text-orange-100"
                      : "border-white/[.08] bg-white/[.03]"
                  }`}
                >
                  Letzten korrigieren
                </button>
                <button
                  onClick={() => setManualMode("add")}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-black ${
                    manualMode === "add"
                      ? "border-orange-300/20 bg-orange-400/[.10] text-orange-100"
                      : "border-white/[.08] bg-white/[.03]"
                  }`}
                >
                  Wurf nachtragen
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {CORRECTION_LABELS.map((label) => (
                  <button
                    key={label}
                    onClick={() => applyManual(label)}
                    className="rounded-lg border border-white/[.075] bg-[#0c0c0c] px-1 py-2 text-xs font-black"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-3">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  )
}

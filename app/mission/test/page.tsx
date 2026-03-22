"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Trophy, Target, Sparkles } from "lucide-react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"

type HitZone = "MISS" | "SINGLE" | "DOUBLE" | "TRIPLE" | "OUTER_BULL" | "BULL"

type ThrowResult = {
  label: string
  zone: HitZone
  value: number
  multiplier: number
  segment?: number
}

type Point = {
  x: number
  y: number
}

type LandedDart = {
  id: number
  x: number
  y: number
  angle: number
  result: ThrowResult
}

type FlyingDart = {
  id: number
  start: Point
  end: Point
  angle: number
  result: ThrowResult
}

const SECRET_HINT = "OSTEREI"
const TARGET_SEGMENT = 20
const TARGET_HITS_REQUIRED = 3
const MAX_THROWS = 9

const BOARD_SIZE = 520
const CENTER = 260
const OUTER_RADIUS = 220
const DOUBLE_OUTER = 220
const DOUBLE_INNER = 198
const TRIPLE_OUTER = 132
const TRIPLE_INNER = 110
const OUTER_BULL_RADIUS = 26
const INNER_BULL_RADIUS = 12
const SEGMENT_ANGLE = 360 / 20
const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

const DART_HOME = { x: CENTER, y: BOARD_SIZE - 10 }
const DART_TOUCH_RADIUS = 60

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

const describeArc = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ")
}

const getSegmentIndexFromAngle = (angleDeg: number) => {
  const normalized = (angleDeg + 360) % 360
  return Math.floor(normalized / SEGMENT_ANGLE) % 20
}

const getThrowResult = (x: number, y: number): ThrowResult => {
  const dx = x - CENTER
  const dy = y - CENTER
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > OUTER_RADIUS) {
    return { label: "Daneben", zone: "MISS", value: 0, multiplier: 0 }
  }

  if (distance <= INNER_BULL_RADIUS) {
    return { label: "Bull", zone: "BULL", value: 50, multiplier: 1, segment: 25 }
  }

  if (distance <= OUTER_BULL_RADIUS) {
    return { label: "Outer Bull", zone: "OUTER_BULL", value: 25, multiplier: 1, segment: 25 }
  }

  const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI
  const boardAngle = (rawAngle + 90 + 360) % 360
  const segmentIndex = getSegmentIndexFromAngle(boardAngle)
  const baseValue = SEGMENTS[segmentIndex]

  if (distance >= DOUBLE_INNER && distance <= DOUBLE_OUTER) {
    return {
      label: `Doppel ${baseValue}`,
      zone: "DOUBLE",
      value: baseValue * 2,
      multiplier: 2,
      segment: baseValue,
    }
  }

  if (distance >= TRIPLE_INNER && distance <= TRIPLE_OUTER) {
    return {
      label: `Triple ${baseValue}`,
      zone: "TRIPLE",
      value: baseValue * 3,
      multiplier: 3,
      segment: baseValue,
    }
  }

  return {
    label: `Single ${baseValue}`,
    zone: "SINGLE",
    value: baseValue,
    multiplier: 1,
    segment: baseValue,
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern)
  }
}

function DartGraphic({
  x,
  y,
  angle,
  scale = 1,
  opacity = 1,
}: {
  x: number
  y: number
  angle: number
  scale?: number
  opacity?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} opacity={opacity}>
      <path d="M 0 0 L 5 16 L -5 16 Z" fill="#f5f5f5" />
      <path d="M 8 18 L 9 60 L -9 60 L -8 18 Z" fill="#d4aa6a" />
      <path d="M 2.5 60 L 2.5 105 L -2.5 105 L -2.5 60 Z" fill="#ffffff" />
      <path d="M 0 105 L 18 130 L 0 123 Z" fill="#f97316" />
      <path d="M 0 105 L -18 130 L 0 123 Z" fill="#fdba74" />
    </g>
  )
}

export default function DartFlickPage() {
  const arenaRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<SVGSVGElement | null>(null)

  const [landedDarts, setLandedDarts] = useState<LandedDart[]>([])
  const [flyingDart, setFlyingDart] = useState<FlyingDart | null>(null)
  const [lastResult, setLastResult] = useState<ThrowResult | null>(null)
  const [statusText, setStatusText] = useState("Unten den Dart greifen")
  const [unlocked, setUnlocked] = useState(false)
  const [failed, setFailed] = useState(false)

  const [dragging, setDragging] = useState(false)
  const [dragStartClient, setDragStartClient] = useState<Point | null>(null)
  const [dragCurrentClient, setDragCurrentClient] = useState<Point | null>(null)
  const [dartPosition, setDartPosition] = useState<Point>(DART_HOME)
  const [guidePoint, setGuidePoint] = useState<Point>({ x: CENTER, y: 90 })

  const triple20Hits = useMemo(() => {
    return landedDarts.filter(
      (dart) => dart.result.zone === "TRIPLE" && dart.result.segment === TARGET_SEGMENT
    ).length
  }, [landedDarts])

  const throwsLeft = MAX_THROWS - landedDarts.length

  const accuracy = useMemo(() => {
    if (landedDarts.length === 0) return 0
    return Math.round((triple20Hits / landedDarts.length) * 100)
  }, [landedDarts.length, triple20Hits])

  const score = useMemo(() => {
    return landedDarts.reduce((sum, dart) => sum + dart.result.value, 0)
  }, [landedDarts])

  useEffect(() => {
    if (triple20Hits >= TARGET_HITS_REQUIRED) {
      setUnlocked(true)
      setStatusText("Hinweis freigeschaltet")
      vibrate([20, 40, 20])
    }
  }, [triple20Hits])

  useEffect(() => {
    if (!unlocked && landedDarts.length >= MAX_THROWS && triple20Hits < TARGET_HITS_REQUIRED) {
      setFailed(true)
      setStatusText("Challenge verfehlt")
      vibrate(100)
    }
  }, [landedDarts.length, triple20Hits, unlocked])

  const resetDragState = () => {
    setDragging(false)
    setDragStartClient(null)
    setDragCurrentClient(null)
    setDartPosition(DART_HOME)
    setGuidePoint({ x: CENTER, y: 90 })
  }

  const getArenaPoint = (clientX: number, clientY: number): Point | null => {
    if (!arenaRef.current) return null
    const rect = arenaRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const getBoardPoint = (clientX: number, clientY: number): Point | null => {
    if (!boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const scaleX = BOARD_SIZE / rect.width
    const scaleY = BOARD_SIZE / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const touchStartsOnDart = (clientX: number, clientY: number) => {
    const point = getArenaPoint(clientX, clientY)
    if (!point) return false
    return Math.hypot(point.x - dartPosition.x, point.y - dartPosition.y) <= DART_TOUCH_RADIUS
  }

  const startDrag = (clientX: number, clientY: number) => {
    if (unlocked || failed || flyingDart) return
    if (!touchStartsOnDart(clientX, clientY)) return

    setDragging(true)
    setDragStartClient({ x: clientX, y: clientY })
    setDragCurrentClient({ x: clientX, y: clientY })
    setStatusText("Nach oben flicken")
  }

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragging || !dragStartClient) return

    setDragCurrentClient({ x: clientX, y: clientY })

    const dx = clientX - dragStartClient.x
    const dy = clientY - dragStartClient.y

    setDartPosition({
      x: clamp(DART_HOME.x + dx * 0.58, 85, BOARD_SIZE - 85),
      y: clamp(DART_HOME.y + dy * 0.72, CENTER + 95, BOARD_SIZE + 35),
    })

    const boardPoint = getBoardPoint(clientX, clientY)
    if (!boardPoint) return

    const boardDx = boardPoint.x - CENTER
    const boardDy = boardPoint.y - CENTER
    const boardDistance = Math.sqrt(boardDx * boardDx + boardDy * boardDy)

    if (boardDistance > OUTER_RADIUS + 14) {
      const angle = Math.atan2(boardDy, boardDx)
      setGuidePoint({
        x: CENTER + Math.cos(angle) * (OUTER_RADIUS + 14),
        y: CENTER + Math.sin(angle) * (OUTER_RADIUS + 14),
      })
    } else {
      setGuidePoint(boardPoint)
    }
  }

  const performThrow = (startClient: Point, endClient: Point) => {
    if (unlocked || failed || flyingDart) return

    const swipeDx = endClient.x - startClient.x
    const swipeDy = endClient.y - startClient.y
    const swipeDistance = Math.hypot(swipeDx, swipeDy)

    if (swipeDistance < 60 || swipeDy > -28) {
      setStatusText("Zu kurz – nochmal")
      resetDragState()
      return
    }

    const boardStart = getBoardPoint(startClient.x, startClient.y)
    const boardEnd = getBoardPoint(endClient.x, endClient.y)
    if (!boardStart || !boardEnd) {
      resetDragState()
      return
    }

    const vx = boardEnd.x - boardStart.x
    const vy = boardEnd.y - boardStart.y
    const vectorLength = Math.max(1, Math.hypot(vx, vy))
    const dirX = vx / vectorLength
    const dirY = vy / vectorLength

    const releaseX = clamp(boardEnd.x, 0, BOARD_SIZE)
    const releaseY = clamp(boardEnd.y, 0, BOARD_SIZE)

    const throwDistance = clamp(swipeDistance * 1.45, 130, 330)
    const targetX = releaseX + dirX * throwDistance
    const targetY = releaseY + dirY * throwDistance

    const inaccuracy = clamp(12 - swipeDistance / 20, 3.5, 10)
    const jitterAngle = Math.random() * Math.PI * 2
    const jitterRadius = Math.sqrt(Math.random()) * inaccuracy

    const finalX = targetX + Math.cos(jitterAngle) * jitterRadius
    const finalY = targetY + Math.sin(jitterAngle) * jitterRadius

    const result = getThrowResult(finalX, finalY)

    const approachBaseX = CENTER
    const approachBaseY = CENTER + 320
    const flightDx = finalX - approachBaseX
    const flightDy = finalY - approachBaseY
    const flightLength = Math.max(1, Math.hypot(flightDx, flightDy))
    const ux = flightDx / flightLength
    const uy = flightDy / flightLength
    const startDistance = 390

    const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI + 90

    const nextFlying: FlyingDart = {
      id: Date.now() + Math.random(),
      start: {
        x: finalX - ux * startDistance,
        y: finalY - uy * startDistance,
      },
      end: {
        x: finalX,
        y: finalY,
      },
      angle: angleDeg,
      result,
    }

    setStatusText("Dart fliegt")
    setFlyingDart(nextFlying)
    setLastResult(result)

    const strongHit = result.zone === "TRIPLE" && result.segment === 20
    vibrate(strongHit ? [15, 18, 15] : 20)

    window.setTimeout(() => {
      setLandedDarts((current) => [
        ...current,
        {
          id: nextFlying.id,
          x: finalX,
          y: finalY,
          angle: angleDeg,
          result,
        },
      ])
      setFlyingDart(null)
      setStatusText(result.label)
      resetDragState()
    }, 340)
  }

  const endDrag = () => {
    if (!dragging || !dragStartClient || !dragCurrentClient) {
      resetDragState()
      return
    }
    performThrow(dragStartClient, dragCurrentClient)
  }

  const resetGame = () => {
    setLandedDarts([])
    setFlyingDart(null)
    setLastResult(null)
    setUnlocked(false)
    setFailed(false)
    setStatusText("Unten den Dart greifen")
    resetDragState()
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-zinc-100 pb-20">
      <Header />

      <main className="relative min-h-screen pt-6 sm:pt-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(234,179,8,0.06),transparent_22%)]" />

        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-400">
                Swipe Dart Challenge
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-4xl">
                Triple 20 × 3
              </h1>
            </div>

            <Link href="/oster-mission">
              <Button
                variant="outline"
                className="rounded-2xl border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div
              ref={arenaRef}
              className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-[linear-gradient(180deg,#101114_0%,#030303_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
              onTouchStart={(e) => {
                const touch = e.touches[0]
                if (touch) startDrag(touch.clientX, touch.clientY)
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                if (touch) moveDrag(touch.clientX, touch.clientY)
              }}
              onTouchEnd={endDrag}
              onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
              onMouseMove={(e) => {
                if (!dragging) return
                moveDrag(e.clientX, e.clientY)
              }}
              onMouseUp={endDrag}
              onMouseLeave={() => {
                if (dragging) endDrag()
              }}
            >
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-3 backdrop-blur">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                    Status
                  </div>
                  <div className="mt-1 text-sm font-bold text-white sm:text-base">
                    {statusText}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Ziel", "T20"],
                    ["Treffer", `${triple20Hits}/3`],
                    ["Würfe", `${throwsLeft}`],
                    ["Quote", `${accuracy}%`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-[64px] rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {label}
                      </div>
                      <div className="mt-1 text-sm font-black text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative px-2 pt-16 pb-28 sm:px-4 sm:pt-20 sm:pb-32">
                <svg
                  ref={boardRef}
                  viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
                  className="mx-auto aspect-square w-full max-w-[760px] select-none"
                >
                  <defs>
                    <radialGradient id="boardGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                    <filter id="boardShadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow
                        dx="0"
                        dy="14"
                        stdDeviation="12"
                        floodColor="rgba(0,0,0,0.45)"
                      />
                    </filter>
                  </defs>

                  <g filter="url(#boardShadow)">
                    <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 18} fill="#050505" />
                    <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 5} fill="url(#boardGlow)" />

                    {SEGMENTS.map((value, index) => {
                      const startAngle = index * SEGMENT_ANGLE
                      const endAngle = startAngle + SEGMENT_ANGLE
                      const dark = index % 2 === 0

                      return (
                        <g key={`${value}-${index}`}>
                          <path
                            d={describeArc(
                              CENTER,
                              CENTER,
                              OUTER_BULL_RADIUS,
                              TRIPLE_INNER,
                              startAngle,
                              endAngle
                            )}
                            fill={dark ? "#f5f5f5" : "#121212"}
                          />
                          <path
                            d={describeArc(
                              CENTER,
                              CENTER,
                              TRIPLE_INNER,
                              TRIPLE_OUTER,
                              startAngle,
                              endAngle
                            )}
                            fill={dark ? "#b91c1c" : "#15803d"}
                          />
                          <path
                            d={describeArc(
                              CENTER,
                              CENTER,
                              TRIPLE_OUTER,
                              DOUBLE_INNER,
                              startAngle,
                              endAngle
                            )}
                            fill={dark ? "#f5f5f5" : "#121212"}
                          />
                          <path
                            d={describeArc(
                              CENTER,
                              CENTER,
                              DOUBLE_INNER,
                              DOUBLE_OUTER,
                              startAngle,
                              endAngle
                            )}
                            fill={dark ? "#b91c1c" : "#15803d"}
                          />

                          {(() => {
                            const textAngle = startAngle + SEGMENT_ANGLE / 2
                            const pos = polarToCartesian(
                              CENTER,
                              CENTER,
                              OUTER_RADIUS + 29,
                              textAngle
                            )
                            return (
                              <text
                                x={pos.x}
                                y={pos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="16"
                                fontWeight="900"
                                fill="#f59e0b"
                              >
                                {value}
                              </text>
                            )
                          })()}
                        </g>
                      )
                    })}

                    <circle cx={CENTER} cy={CENTER} r={OUTER_BULL_RADIUS} fill="#15803d" />
                    <circle cx={CENTER} cy={CENTER} r={INNER_BULL_RADIUS} fill="#b91c1c" />
                    <line
                      x1={CENTER}
                      y1={14}
                      x2={CENTER}
                      y2={35}
                      stroke="rgba(245,158,11,0.95)"
                      strokeWidth="2.5"
                    />
                    <line
                      x1={CENTER - 11}
                      y1={24}
                      x2={CENTER + 11}
                      y2={24}
                      stroke="rgba(245,158,11,0.95)"
                      strokeWidth="2.5"
                    />
                  </g>

                  {landedDarts.map((dart) => (
                    <DartGraphic
                      key={dart.id}
                      x={dart.x}
                      y={dart.y}
                      angle={dart.angle}
                    />
                  ))}

                  {flyingDart && (
                    <motion.g
                      initial={{
                        x: flyingDart.start.x,
                        y: flyingDart.start.y,
                        rotate: flyingDart.angle,
                        scale: 1.03,
                      }}
                      animate={{
                        x: flyingDart.end.x,
                        y: flyingDart.end.y,
                        rotate: flyingDart.angle,
                        scale: 1,
                      }}
                      transition={{ duration: 0.34, ease: "easeOut" }}
                    >
                      <DartGraphic x={0} y={0} angle={0} />
                    </motion.g>
                  )}

                  {!unlocked && !failed && (
                    <g pointerEvents="none">
                      <circle
                        cx={guidePoint.x}
                        cy={guidePoint.y}
                        r={16}
                        fill="transparent"
                        stroke="rgba(245,158,11,0.75)"
                        strokeWidth="2"
                      />
                      <circle
                        cx={guidePoint.x}
                        cy={guidePoint.y}
                        r={6}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </svg>

                {!unlocked && !failed && (
                  <motion.div
                    className="absolute left-1/2 top-full z-20"
                    animate={{
                      x: dartPosition.x - CENTER,
                      y: dartPosition.y - (BOARD_SIZE + 18),
                      rotate: dragging
                        ? clamp((dartPosition.x - CENTER) * 0.1, -18, 18)
                        : 0,
                      scale: dragging ? 1.04 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 240,
                      damping: 22,
                      mass: 0.72,
                    }}
                  >
                    <svg
                      width="210"
                      height="210"
                      viewBox="0 0 210 210"
                      className="overflow-visible drop-shadow-[0_18px_24px_rgba(0,0,0,0.5)]"
                    >
                      <g transform="translate(105,20)">
                        <path d="M 0 0 L 5 16 L -5 16 Z" fill="#f4f4f5" />
                        <path d="M 9 18 L 10 60 L -10 60 L -9 18 Z" fill="#d1a867" />
                        <path d="M 3 60 L 3 108 L -3 108 L -3 60 Z" fill="#ffffff" />
                        <path d="M 0 108 L 22 136 L 0 129 Z" fill="#f97316" />
                        <path d="M 0 108 L -22 136 L 0 129 Z" fill="#fdba74" />
                      </g>
                    </svg>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Challenge
                </div>
                <h2 className="mt-2 text-xl font-black text-white">3× Triple 20</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Starte direkt auf dem Dart unten und flicke kräftig nach oben.
                </p>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-300"
                    style={{ width: `${Math.min((triple20Hits / TARGET_HITS_REQUIRED) * 100, 100)}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {Array.from({ length: TARGET_HITS_REQUIRED }).map((_, index) => {
                    const active = index < triple20Hits
                    return (
                      <div
                        key={index}
                        className={`rounded-2xl border p-3 text-center text-sm font-black ${
                          active
                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                            : "border-zinc-800 bg-black text-zinc-500"
                        }`}
                      >
                        T20
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Live
                </div>
                <p className="mt-2 text-xl font-black text-white">{statusText}</p>
                <p className="mt-3 text-sm text-zinc-400">
                  Letzter Dart:{" "}
                  <span className="font-bold text-white">{lastResult ? lastResult.label : "-"}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Punkte: <span className="font-bold text-white">{score}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Würfe übrig: <span className="font-bold text-white">{throwsLeft}</span>
                </p>
              </div>

              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <p className="text-sm leading-relaxed text-zinc-300">
                  Anleitung: <span className="font-bold text-white">unten den Dart berühren</span>,{" "}
                  <span className="font-bold text-white">nach oben flicken</span>.
                </p>

                <div className="mt-4">
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="w-full rounded-2xl border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {unlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="rounded-[2rem] border border-green-500/20 bg-green-500/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10">
                        <Trophy className="h-5 w-5 text-green-300" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-green-400">
                          Hinweis freigeschaltet
                        </p>
                        <h3 className="mt-1 text-lg font-black text-green-100">
                          Challenge bestanden
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-green-500/20 bg-black/20 p-4">
                      <p className="text-sm text-green-100">
                        Dein Hinweis:{" "}
                        <span className="font-black text-yellow-300">{SECRET_HINT}</span>
                      </p>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-200">
                      <Sparkles className="h-4 w-4" />
                      Swipe-Challenge geschafft
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {failed && !unlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.25em] text-red-400">
                      Challenge verfehlt
                    </p>
                    <h3 className="mt-2 text-lg font-black text-red-100">
                      Nicht genug T20-Treffer
                    </h3>
                    <p className="mt-2 text-sm text-red-200/90">
                      Du hast alle 9 Würfe verbraucht. Reset und nochmal versuchen.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
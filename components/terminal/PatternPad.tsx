"use client"

import { useMemo, useRef, useState, type PointerEvent } from "react"

type Props = {
  value: number[]
  onChange: (value: number[]) => void
  disabled?: boolean
  tone?: "light" | "dark"
  size?: "sm" | "md"
}

export default function PatternPad({
  value,
  onChange,
  disabled = false,
  tone = "dark",
  size = "md",
}: Props) {
  const [drawing, setDrawing] = useState(false)
  const activeRef = useRef<number[]>(value)

  const isDark = tone === "dark"
  const box = size === "sm" ? "max-w-[260px]" : "max-w-[330px]"
  const dot = size === "sm" ? "h-12 w-12" : "h-16 w-16"

  const active = useMemo(() => new Set(value), [value])

  const addNode = (node: number) => {
    if (disabled || activeRef.current.includes(node)) return
    const next = [...activeRef.current, node]
    activeRef.current = next
    onChange(next)
  }

  const nodeFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const nodeEl = el?.closest?.("[data-pattern-node]") as HTMLElement | null
    const raw = nodeEl?.dataset.patternNode
    if (raw == null) return
    const node = Number(raw)
    if (Number.isInteger(node) && node >= 0 && node <= 8) addNode(node)
  }

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activeRef.current = []
    onChange([])
    setDrawing(true)
    nodeFromPoint(event.clientX, event.clientY)
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drawing || disabled) return
    nodeFromPoint(event.clientX, event.clientY)
  }

  const finish = () => setDrawing(false)

  return (
    <div className={`mx-auto w-full ${box}`}>
      <div
        className={`grid touch-none select-none grid-cols-3 gap-5 rounded-[30px] border p-5 ${
          isDark
            ? "border-white/10 bg-black/25"
            : "border-slate-200 bg-slate-50"
        }`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {Array.from({ length: 9 }).map((_, node) => {
          const selected = active.has(node)
          const order = value.indexOf(node)
          return (
            <div key={node} className="flex items-center justify-center">
              <div
                data-pattern-node={node}
                className={`${dot} relative flex items-center justify-center rounded-full border-2 transition ${
                  selected
                    ? isDark
                      ? "border-orange-300 bg-orange-500/20 shadow-[0_0_34px_rgba(249,115,22,.25)]"
                      : "border-orange-500 bg-orange-50"
                    : isDark
                      ? "border-white/15 bg-white/[0.04]"
                      : "border-slate-300 bg-white"
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 rounded-full ${
                    selected
                      ? "bg-orange-400"
                      : isDark
                        ? "bg-white/25"
                        : "bg-slate-400"
                  }`}
                />
                {selected ? (
                  <span
                    className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                      isDark
                        ? "bg-orange-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {order + 1}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div
        className={`mt-3 text-center text-xs font-semibold ${
          isDark ? "text-white/35" : "text-slate-500"
        }`}
      >
        Mindestens 4 Punkte in einem Zug verbinden.
      </div>
    </div>
  )
}

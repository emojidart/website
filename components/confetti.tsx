"use client"

import { useEffect, useState } from "react"

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  delay: number
  duration: number
  shape: "circle" | "square" | "streamer"
}

const CARNIVAL_COLORS = [
  "#FF1493", // Deep Pink
  "#00CED1", // Turquoise
  "#FFD700", // Gold
  "#FF6347", // Tomato Red
  "#9400D3", // Violet
  "#00FF7F", // Spring Green
  "#FF4500", // Orange Red
  "#1E90FF", // Dodger Blue
  "#FFFF00", // Yellow
  "#FF69B4", // Hot Pink
]

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    const generatePieces = () => {
      const newPieces: ConfettiPiece[] = []
      for (let i = 0; i < 80; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          rotation: Math.random() * 360,
          color: CARNIVAL_COLORS[Math.floor(Math.random() * CARNIVAL_COLORS.length)],
          size: 6 + Math.random() * 10,
          delay: Math.random() * 5,
          duration: 4 + Math.random() * 4,
          shape: ["circle", "square", "streamer"][Math.floor(Math.random() * 3)] as "circle" | "square" | "streamer",
        })
      }
      setPieces(newPieces)
    }

    generatePieces()
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        >
          {piece.shape === "circle" && (
            <div
              className="rounded-full"
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          )}
          {piece.shape === "square" && (
            <div
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          )}
          {piece.shape === "streamer" && (
            <div
              style={{
                width: piece.size * 0.3,
                height: piece.size * 2,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                borderRadius: "2px",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function CarnivalBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 py-3">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48L3N2Zz4=')] opacity-50" />
      <div className="container mx-auto px-4 flex items-center justify-center gap-3 text-white relative">
        <span className="text-2xl">🎭</span>
        <span className="font-bold text-sm sm:text-base tracking-wide">Faschingsgschnaas beim EMD!!
Am 14.02. wird’s narrisch!!</span>
        <span className="text-2xl">🎉</span>
      </div>
    </div>
  )
}

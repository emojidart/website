"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface MatchVsAnimationProps {
  player1: string
  player2: string
  isVisible: boolean
  onComplete?: () => void
}

export function MatchVsAnimation({ player1, player2, isVisible, onComplete }: MatchVsAnimationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onComplete?.()
      }, 3000) // Animation verschwindet nach 3 Sekunden

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-8 md:gap-16 px-4">
            {/* Player 1 */}
            <motion.div
              initial={{ x: -200, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 md:p-10 shadow-2xl"
              >
                <p className="text-3xl md:text-6xl font-extrabold text-white uppercase tracking-tight break-words max-w-[200px] md:max-w-[400px]">
                  {player1}
                </p>
              </motion.div>
            </motion.div>

            {/* VS */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "backOut" }}
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <div className="text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(249,115,22,0.8)]">
                  VS
                </div>
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-orange-500 blur-3xl -z-10"
                />
              </motion.div>
            </motion.div>

            {/* Player 2 */}
            <motion.div
              initial={{ x: 200, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: 0.75,
                }}
                className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 md:p-10 shadow-2xl"
              >
                <p className="text-3xl md:text-6xl font-extrabold text-white uppercase tracking-tight break-words max-w-[200px] md:max-w-[400px]">
                  {player2}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

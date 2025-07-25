"use client"

import { motion } from "framer-motion"

interface PotDisplayProps {
  amount: number | undefined | null // Erlaube undefined oder null als Typ
}

export function PotDisplay({ amount }: PotDisplayProps) {
  // Stelle sicher, dass amount immer eine Zahl ist, standardmäßig 0
  const displayAmount = amount ?? 0

  return (
    <motion.div
      className="relative flex items-center justify-center bg-gradient-to-r from-brutal-accent-gold to-brutal-accent-red text-brutal-bg rounded-full px-6 py-3 shadow-2xl overflow-hidden"
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 10 }}
      whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(243, 156, 18, 0.8)" }}
    >
      {/* Hintergrund-Glühen/Effekt */}
      <motion.div
        className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <span className="relative z-10 text-lg md:text-xl font-bold uppercase tracking-wide">
        Aktueller Pot: <span className="text-2xl md:text-3xl font-extrabold ml-2">{displayAmount.toFixed(2)} €</span>
      </span>
    </motion.div>
  )
}

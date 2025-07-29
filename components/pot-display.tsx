"use client"

import { motion } from "framer-motion"
import { Trophy, TrendingUp, Euro, Sparkles } from "lucide-react"

interface PotDisplayProps {
  amount: number
}

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 12 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center max-w-lg mx-auto hover:shadow-2xl transition-shadow duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-full p-3 mr-4 shadow-lg">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <div className="text-left">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Aktueller Pot</h2>
          <p className="text-sm text-gray-500 font-medium">Competition 2025</p>
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-center mb-3">
          <Euro className="h-8 w-8 text-red-600 mr-2" />
          <span className="text-6xl font-extrabold text-gray-900 tracking-tight">
            {amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-center text-gray-600">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          <span className="text-lg font-semibold">Steigt mit jedem Antritt um €4,00!</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center text-gray-700">
        <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
        <span className="text-base font-bold uppercase tracking-wide">-------------</span>
        <Sparkles className="h-5 w-5 ml-2 text-yellow-500" />
      </div>
    </motion.div>
  )
}

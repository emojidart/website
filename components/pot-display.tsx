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
      className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 lg:p-8 text-center max-w-lg mx-auto hover:shadow-2xl transition-shadow duration-300"
    >
      {/* Header - Mobile optimiert */}
      <div className="flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-full p-2 sm:p-3 mb-3 sm:mb-0 sm:mr-4 shadow-lg">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 uppercase tracking-wide">
            Aktueller Pot
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Competition 2025</p>
        </div>
      </div>

      {/* Amount Display - Mobile optimiert */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-center mb-2 sm:mb-3">
          <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mb-2 sm:mb-0 sm:mr-2" />
          <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
            {amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center text-gray-600">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0 sm:mr-2 text-green-600" />
          <span className="text-sm sm:text-base lg:text-lg font-semibold text-center">
            Steigt mit jedem Antritt um €4,00!
          </span>
        </div>
      </div>

      {/* Footer - Mobile optimiert */}
      <div className="flex items-center justify-center text-gray-700">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-500" />
        <span className="text-sm sm:text-base font-bold uppercase tracking-wide text-center">
          STARTGELD 4€!
        </span>
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 ml-2 text-yellow-500" />
      </div>
    </motion.div>
  )
}

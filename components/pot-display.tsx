"use client"

import { motion } from "framer-motion"
import { Trophy, TrendingUp, Euro, Sparkles, Zap, Crown } from "lucide-react"

interface PotDisplayProps {
  amount: number
}

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.1 }}
      className="relative bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl shadow-2xl border border-gray-200/50 p-6 sm:p-8 lg:p-10 text-center max-w-2xl mx-auto hover:shadow-3xl transition-all duration-500 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-yellow-500/5 rounded-3xl" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/10 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-400/10 to-transparent rounded-full blur-xl" />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center mb-6 sm:mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-0 sm:mr-5 shadow-xl"
          >
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
          </motion.div>
          <div className="text-center sm:text-left">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-gray-900 bg-clip-text text-transparent uppercase tracking-wide"
            >
              Aktueller Pot
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm sm:text-base text-gray-600 font-semibold mt-1"
            >
              EMD - LION CUP II 2025
            </motion.p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
          className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border-2 border-gray-100 shadow-inner"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-yellow-500/5 to-red-500/5 rounded-2xl" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6"
          >
            <motion.div whileHover={{ scale: 1.1 }} className="flex items-center mb-3 sm:mb-0 sm:mr-4">
              <Euro className="h-8 w-8 sm:h-10 sm:w-10 text-red-600 drop-shadow-sm" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 120 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent tracking-tight drop-shadow-sm"
            >
              {amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center text-gray-700"
          >
            <div className="flex items-center mb-2 sm:mb-0 sm:mr-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mr-2" />
              <span className="text-base sm:text-lg lg:text-xl font-bold">Steigt mit jedem Antritt um €4,00!</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="flex items-center"
            >
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mr-1" />
              <span className="text-sm sm:text-base font-semibold text-yellow-600">Extra Preisgeld</span>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="relative bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 rounded-xl p-4 sm:p-5 border border-yellow-200"
        >
          <div className="flex items-center justify-center text-gray-800">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-yellow-500" />
            </motion.div>
            <span className="text-base sm:text-lg font-black uppercase tracking-wider text-center">Startgeld 4€!</span>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3, delay: 0.5 }}
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 ml-3 text-yellow-500" />
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex items-center justify-center mt-2"
          >
            <Crown className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm font-semibold text-yellow-700">Jeder Antritt zählt zum Finale!</span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

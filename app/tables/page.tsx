"use client"

import { motion } from "framer-motion"
import { Trophy, Crown, Medal, Star, Sparkles, Target, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { Header } from "@/components/header"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
}

const trophyVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 10,
    },
  },
}

const WinnerCard = ({
  place,
  name,
  group,
  delay = 0,
}: { place: number; name: string; group: string; delay?: number }) => {
  const getPlaceIcon = () => {
    switch (place) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500" />
      case 2:
        return <Trophy className="h-7 w-7 text-gray-400" />
      case 3:
        return <Medal className="h-7 w-7 text-yellow-600" />
      default:
        return <Star className="h-6 w-6 text-red-500" />
    }
  }

  const getCardStyle = () => {
    switch (place) {
      case 1:
        return "bg-white shadow-2xl shadow-red-500/20 border-2 border-red-500"
      case 2:
        return "bg-white shadow-2xl shadow-gray-400/20 border-2 border-gray-400"
      case 3:
        return "bg-white shadow-2xl shadow-yellow-500/20 border-2 border-yellow-500"
      default:
        return "bg-white shadow-2xl shadow-red-400/20 border-2 border-red-400"
    }
  }

  return (
    <motion.div
      variants={trophyVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={`${getCardStyle()} rounded-xl p-6 text-gray-900 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 right-2 sparkle-animation">
          <Sparkles className="h-4 w-4 text-red-500" />
        </div>
        <div className="absolute bottom-2 left-2 sparkle-animation" style={{ animationDelay: "0.5s" }}>
          <Target className="h-5 w-5 text-red-500" />
        </div>
      </div>

      <div className="text-center relative z-10">
        <motion.div
          className="bg-red-50 rounded-full p-3 w-14 h-14 mx-auto mb-4 border border-red-200 float-animation"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
        >
          {getPlaceIcon()}
        </motion.div>
        <motion.h3
          className="text-xl font-bold mb-2 text-balance text-gray-900"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay }}
        >
          {place}. Platz
        </motion.h3>
        <p className="text-lg font-bold mb-2 text-pretty text-gray-900">{name}</p>
        <div className="bg-red-50 rounded-full px-3 py-1 border border-red-200">
          <p className="text-sm font-semibold text-red-700">{group}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function HallOfFamePage() {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        })
      }, 500)

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        })
      }, 1000)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header />
      <main className="pt-6 pb-12">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-6 max-w-6xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-red-500 p-8 md:p-10 text-gray-900 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <motion.div
                  className="absolute top-4 left-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <Target className="h-8 w-8 text-red-500" />
                </motion.div>
                <motion.div
                  className="absolute top-4 right-4"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <Zap className="h-6 w-6 text-red-500" />
                </motion.div>
                <motion.div
                  className="absolute bottom-4 left-1/4"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Sparkles className="h-5 w-5 text-red-500" />
                </motion.div>
              </div>

              <div className="relative z-10">
                <motion.div
                  className="bg-red-50 rounded-full p-4 w-20 h-20 mx-auto mb-6 border-2 border-red-200"
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
                </motion.div>

                <motion.h1
                  className="text-3xl md:text-5xl font-black uppercase leading-none tracking-tighter mb-4 text-balance"
                  animate={{
                    textShadow: [
                      "0 0 20px rgba(239, 68, 68, 0.3)",
                      "0 0 40px rgba(239, 68, 68, 0.5)",
                      "0 0 20px rgba(239, 68, 68, 0.3)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <span className="block text-gray-900 drop-shadow-lg">HALL OF</span>
                  <span className="block text-red-600 drop-shadow-lg">FAME</span>
                </motion.h1>

                <motion.div
                  className="bg-red-50 rounded-xl p-4 border-2 border-red-200 mb-4"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  <p className="text-lg md:text-xl font-bold uppercase text-gray-900 mb-1">
                    Summer Special Dart Competition
                  </p>
                  <p className="text-2xl md:text-3xl font-black text-red-600">2025</p>
                </motion.div>

                <motion.div
                  className="bg-red-50 rounded-xl p-3 border border-red-200"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <p className="text-base font-semibold flex items-center justify-center gap-2 text-pretty text-gray-900">
                    <Sparkles className="h-4 w-4 sparkle-animation text-red-500" />
                    Herzlichen Glückwunsch an alle Gewinner!
                    <Sparkles className="h-4 w-4 sparkle-animation text-red-500" />
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            {/* Gruppe A */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">A</div>
                <h2 className="text-lg font-bold text-gray-900">Gruppe A</h2>
              </div>
              <div className="space-y-3">
                <WinnerCard place={1} name="Medine K." group="Gruppe A" delay={0.5} />
                <WinnerCard place={2} name="Jimmy W." group="Gruppe A" delay={0.7} />
                <WinnerCard place={3} name="Hubert L." group="Gruppe A" delay={0.9} />
              </div>
            </motion.div>

            {/* Gruppe B */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">B</div>
                <h2 className="text-lg font-bold text-gray-900">Gruppe B</h2>
              </div>
              <div className="space-y-3">
                <WinnerCard place={1} name="Orhan A." group="Gruppe B" delay={1.1} />
                <WinnerCard place={2} name="Sabina S." group="Gruppe B" delay={1.3} />
                <motion.div
                  className="bg-gray-50 rounded-lg p-4 text-center border border-dashed border-red-300"
                  animate={{ opacity: [0.6, 0.8, 0.6] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Star className="h-5 w-5 mx-auto mb-2 text-red-500" />
                  <p className="text-gray-700 font-medium text-sm">3. Platz nicht besetzt</p>
                </motion.div>
              </div>
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="text-center bg-white rounded-2xl p-8 text-gray-900 shadow-xl relative overflow-hidden border-2 border-red-500"
          >
            <div className="absolute inset-0 opacity-20">
              <motion.div
                className="absolute top-4 left-4"
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
              >
                <Sparkles className="h-6 w-6 text-red-500" />
              </motion.div>
              <motion.div
                className="absolute top-4 right-4"
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY }}
              >
                <Target className="h-7 w-7 text-red-500" />
              </motion.div>
            </div>

            <div className="relative z-10">
              <motion.div
                className="float-animation mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              >
                <Crown className="h-16 w-16 mx-auto text-yellow-500 drop-shadow-lg" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-black mb-4 text-balance text-gray-900">
                Glückwunsch an alle Teilnehmer!
              </h3>
              <p className="text-lg md:text-xl font-semibold max-w-3xl mx-auto text-pretty leading-relaxed text-gray-700">
                Ein großartiges Turnier mit fantastischen Leistungen. Wir freuen uns schon auf das nächste Event!
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

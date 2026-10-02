"use client"

import { useEffect, useState } from "react"

export function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 text-center">
      <div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black">{timeLeft.days}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Tage</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black">{timeLeft.hours}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Std</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black">{timeLeft.minutes}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Min</div>
      </div>
      <div className="text-xl sm:text-2xl lg:text-4xl font-bold">:</div>
      <div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black">{timeLeft.seconds}</div>
        <div className="text-[10px] sm:text-xs lg:text-sm opacity-90 mt-1">Sek</div>
      </div>
    </div>
  )
}

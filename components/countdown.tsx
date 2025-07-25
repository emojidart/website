"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { JSX } from "react/jsx-runtime"

interface CountdownProps {
  targetDate: string
}

const Countdown: React.FC<CountdownProps> = ({ targetDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date()
    let timeLeft = {}

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      }
    }
    return timeLeft
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearTimeout(timer)
  })

  const timerComponents: JSX.Element[] = []
  ;(Object.keys(timeLeft) as Array<keyof typeof timeLeft>).forEach((interval) => {
    if (!timeLeft[interval]) {
      return
    }

    timerComponents.push(
      <div
        key={interval}
        className="flex flex-col items-center justify-center rounded-xl bg-white/10 p-5 text-white backdrop-blur-md border border-white/20 shadow-xl"
      >
        <span className="text-5xl font-bold">{String(timeLeft[interval]).padStart(2, "0")}</span>
        <span className="text-base uppercase">{interval}</span>
      </div>,
    )
  })

  return (
    <div className="flex gap-4 justify-center">
      {timerComponents.length ? timerComponents : <span className="text-white text-lg">Event has started!</span>}
    </div>
  )
}

export default Countdown

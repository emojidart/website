"use client"

import { useEffect, useState } from "react"

export function useSekundenTick() {
  const [nowTick, setNowTick] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)

    return () => window.clearInterval(id)
  }, [])

  return nowTick
}

"use client"

import { useRef, useState } from "react"

type DkoModalState = {
  isOpen: boolean
  title: string
  dateLabel: string
  timeLabel: string
  seriesId: string | null
  startgeld: number | null
}

export function useStartseitenTurnierModal() {
  const [dkoModal, setDkoModal] = useState<DkoModalState>({
    isOpen: false,
    title: "",
    dateLabel: "",
    timeLabel: "",
    seriesId: null,
    startgeld: null,
  })

  const [liveInfoOpen, setLiveInfoOpen] = useState(false)

  const modalOpenedAtRef = useRef<number>(0)

  const [toast, setToast] = useState<{ show: boolean; text: string }>({
    show: false,
    text: "",
  })

  const showToast = (text: string) => {
    setToast({ show: true, text })
    window.setTimeout(() => {
      setToast({ show: false, text: "" })
    }, 2500)
  }

  return {
    dkoModal,
    setDkoModal,
    liveInfoOpen,
    setLiveInfoOpen,
    modalOpenedAtRef,
    toast,
    showToast,
  }
}

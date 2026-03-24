"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play } from "lucide-react"

interface PauseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pauseMinutesRef: React.RefObject<HTMLInputElement>
  onStartPause: (minutes: number) => void
}

export function PauseModal({
  open,
  onOpenChange,
  pauseMinutesRef,
  onStartPause,
}: PauseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-6 rounded-2xl shadow-sm text-center bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-4xl font-extrabold text-orange-500 mb-6">PAUSE</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <Input
            type="number"
            placeholder="Minuten"
            min="1"
            max="60"
            defaultValue={5}
            ref={pauseMinutesRef}
            className="w-32 text-center bg-gray-800 text-white border-gray-700"
          />
        </div>

        <DialogFooter className="flex justify-center mt-6">
          <Button
            onClick={() => onStartPause(Number.parseInt(pauseMinutesRef.current?.value || "5"))}
            className="bg-orange-600 hover:bg-orange-700 text-lg px-6 py-3"
          >
            <Play className="h-5 w-5 mr-2" />
            Pause starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
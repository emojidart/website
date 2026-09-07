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
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[420px] rounded-[28px] shadow-2xl text-center bg-slate-950 text-white">
        <div className="px-6 pt-7"><DialogHeader>
          <DialogTitle className="text-3xl font-black text-white mb-2">PAUSE</DialogTitle>
        </DialogHeader></div>

        <div className="px-6 py-6">
          <Input
            type="number"
            placeholder="Minuten"
            min="1"
            max="60"
            defaultValue={5}
            ref={pauseMinutesRef}
            className="mx-auto h-14 w-40 rounded-2xl border-white/10 bg-white/10 text-center text-xl font-black text-white"
          />
        </div>

        <DialogFooter className="flex justify-center border-t border-white/10 px-6 py-5">
          <Button
            onClick={() => onStartPause(Number.parseInt(pauseMinutesRef.current?.value || "5"))}
            className="h-12 rounded-xl bg-orange-600 px-6 text-base font-black hover:bg-orange-700"
          >
            <Play className="h-5 w-5 mr-2" />
            Pause starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
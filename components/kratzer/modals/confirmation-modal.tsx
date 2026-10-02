"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  onConfirm: () => void
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#080b10] p-0 text-center text-white shadow-[0_30px_100px_-40px_rgba(0,0,0,.98)] sm:max-w-[460px]">
        <div className="border-b border-white/[0.07] bg-[#070a0f] px-6 py-6 text-white"><DialogHeader>
          <DialogTitle className="text-xl font-black text-white">{title}</DialogTitle>
        </DialogHeader></div>

        <DialogDescription className="mx-6 my-6 text-white/50">{message}</DialogDescription>

        <DialogFooter className="flex justify-center gap-3 border-t border-white/[0.07] bg-[#0a0e14] px-6 py-5">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="h-11 rounded-xl border-white/[0.10] bg-white/[0.025] text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white">
            Abbrechen
          </Button>

          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            variant="outline" className="h-11 rounded-xl border-rose-300/20 bg-rose-500/[0.10] font-black text-rose-200 hover:border-rose-300/30 hover:bg-rose-500/[0.16] hover:text-rose-100"
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
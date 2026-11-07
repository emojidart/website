"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: "post" | "comment"
}

export function DeleteModal({ isOpen, onClose, onConfirm, type }: DeleteModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-card">
        <DialogHeader>
          <div className="text-foreground flex items-center justify-center w-16 h-16 bg-card   rounded-2xl mx-auto mb-4 shadow-lg">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            {type === "post" ? "Beitrag löschen?" : "Kommentar löschen?"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-base pt-2">
            {type === "post"
              ? "Möchtest du diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
              : "Möchtest du diesen Kommentar wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto border-2 border-border hover:bg-muted font-semibold bg-transparent"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            className="w-full sm:w-auto bg-card     text-white font-bold shadow-lg"
          >
            Ja, löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

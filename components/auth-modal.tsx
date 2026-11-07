"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lock, Heart, MessageCircle, Send } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  action: "post" | "like" | "comment"
}

export function AuthModal({ isOpen, onClose, action }: AuthModalProps) {
  const getIcon = () => {
    switch (action) {
      case "like":
        return <Heart className="h-12 w-12 text-red-600" />
      case "comment":
        return <MessageCircle className="h-12 w-12 text-blue-600" />
      case "post":
        return <Send className="h-12 w-12 text-orange-600" />
    }
  }

  const getTitle = () => {
    switch (action) {
      case "like":
        return "Beiträge liken"
      case "comment":
        return "Kommentieren"
      case "post":
        return "Beitrag erstellen"
    }
  }

  const getDescription = () => {
    switch (action) {
      case "like":
        return "Melde dich an, um Beiträge zu liken und deine Unterstützung zu zeigen!"
      case "comment":
        return "Melde dich an, um Kommentare zu schreiben und mit der Community zu diskutieren!"
      case "post":
        return "Melde dich an, um eigene Beiträge zu erstellen und deine Erfolge zu teilen!"
    }
  }

  const handleLogin = () => {
    window.location.href = "/member-login"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-card">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">{getIcon()}</div>
          <DialogTitle className="text-2xl font-bold text-foreground">{getTitle()}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground leading-relaxed">{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleLogin}
            className="w-full bg-card     text-white font-bold py-6 text-base shadow-lg"
          >
            <Lock className="h-5 w-5 mr-2" />
            Jetzt anmelden
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full py-6 text-base bg-transparent">
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

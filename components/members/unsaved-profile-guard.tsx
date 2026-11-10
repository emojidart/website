"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function UnsavedProfileGuard({ dirty }: { dirty: boolean }) {
  const [open, setOpen] = useState(false)
  const destination = useRef<HTMLElement | null>(null)
  const allowNavigation = useRef(false)
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!allowNavigation.current) { event.preventDefault(); event.returnValue = "" } }
    const leave = (event: MouseEvent) => {
      if (allowNavigation.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest('a[href],button[aria-label="Zurück"]') : null
      if (!target) return
      if (target instanceof HTMLAnchorElement) {
        if (target.download || target.target === "_blank") return
        const next = new URL(target.href, location.href)
        if (next.pathname === location.pathname && next.search === location.search) return
      }
      event.preventDefault()
      event.stopPropagation()
      destination.current = target as HTMLElement
      setOpen(true)
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", leave, true)
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leave, true) }
  }, [dirty])
  return <Dialog open={open && dirty} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader><DialogTitle>Änderungen verwerfen?</DialogTitle><DialogDescription>Deine Änderungen wurden noch nicht gespeichert. Bleibe auf dieser Seite, um sie weiter zu bearbeiten.</DialogDescription></DialogHeader>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Weiter bearbeiten</Button>
        <Button type="button" variant="destructive" onClick={() => {
          const target = destination.current
          setOpen(false)
          allowNavigation.current = true
          target?.click()
          window.setTimeout(() => { allowNavigation.current = false }, 0)
        }}>Änderungen verwerfen</Button>
      </div>
    </DialogContent>
  </Dialog>
}

"use client"

export const membersCupContainerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

export const membersCupItemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

export function MembersCupBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />
  )
}

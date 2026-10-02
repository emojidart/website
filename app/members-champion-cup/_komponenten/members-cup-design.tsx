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
    <div className="pointer-events-none fixed inset-0 z-0 bg-[#050608]">
      <div
        className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-30"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.80),rgba(3,5,9,.96)_46%,rgba(2,4,7,.99))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(249,115,22,.16),transparent_26%),radial-gradient(circle_at_88%_22%,rgba(14,165,233,.10),transparent_27%)]" />
    </div>
  )
}

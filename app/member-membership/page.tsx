"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MemberMembership } from "@/components/member/membership/member-membership"

export default function MemberMembershipPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] font-sans text-white">
      <Header />

      {/* Gleicher High-End-Hintergrund wie im Member-Profil */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:68px_68px]" />
      </div>

      {/* Exakt gleiche Seitenbreite / Abstände wie im Member-Profil */}
      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <MemberMembership />
      </main>

      <MobileBottomNav />
    </div>
  )
}

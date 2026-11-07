"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MemberMembership } from "@/components/member/membership/member-membership"

export default function MemberMembershipPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-white">
      <Header />

      {/* Gleicher High-End-Hintergrund wie im Member-Profil */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

      {/* Exakt gleiche Seitenbreite / Abstände wie im Member-Profil */}
      <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
        <MemberMembership />
      </main>

      <MobileBottomNav />
    </div>
  )
}

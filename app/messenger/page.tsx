"use client"

import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

const APK_URL = "/downloads/emd-messenger.apk"

const features = [
  { icon: MessageCircle, title: "Teamchat", text: "Direkte Nachrichten und Teamkommunikation an einem Ort." },
  { icon: BellRing, title: "Sofort informiert", text: "Benachrichtigungen zu Nachrichten, Aufstellungen und Spielen." },
  { icon: Users, title: "Für EMD Mitglieder", text: "Direkt mit deinem bestehenden EMD Zugang verbunden." },
  { icon: ShieldCheck, title: "Sicher & vereinsintern", text: "Dein Messenger bleibt im EMD System und bei deinem Verein." },
]

export default function MessengerDownloadPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#060708] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[16rem] h-[30rem] w-[30rem] rounded-full bg-amber-400/10 blur-[140px]" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-orange-700/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,.15)]">
              <MessageCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-black tracking-[0.18em] text-white">EMD</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">Messenger</div>
            </div>
          </Link>
</header>

        <section className="grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:pt-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
              <Sparkles className="h-3.5 w-3.5" /> EMD Messenger
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Dein Verein.<br />
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">Deine Nachrichten.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-white/55 sm:text-lg">
              Der EMD Messenger bringt Teamchat, Aufstellungen und wichtige Vereinsinfos direkt auf dein Android-Smartphone – kostenlos für EMD Mitglieder und Gäste.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={APK_URL} download className="group inline-flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 text-base font-black text-white shadow-[0_18px_60px_-20px_rgba(249,115,22,.75)] transition hover:scale-[1.015] hover:from-orange-400 hover:to-orange-500 active:scale-[.99]">
                <Download className="mr-2 h-5 w-5" /> Für Android herunterladen
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
</div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/35">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-orange-400" /> Android</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-orange-400" /> Kostenlos für EMD Mitglieder und Gäste</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-orange-400" /> Sicherer Mitgliederzugang</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="absolute inset-0 rounded-[48px] bg-orange-500/20 blur-[80px]" />
            <div className="relative rounded-[42px] border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.025] p-3 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] backdrop-blur-2xl">
              <div className="overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#0b0d10]">
                <div className="bg-[linear-gradient(180deg,#121d29_0%,#0a131d_100%)]">
                  <div className="flex items-start justify-between px-5 pb-4 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_0_28px_rgba(249,115,22,.28)]">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[27px] font-black leading-none text-white">EMD Chat</div>
                        <div className="mt-1 text-sm font-semibold text-white/45">Chats</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] p-2 text-white/75">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex h-12 items-center rounded-2xl bg-[#07111b] px-4 text-sm font-semibold text-white/35">
                      <span className="mr-2 text-base">⌕</span> Suchen oder Chat finden
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div className="rounded-full border border-orange-300/25 bg-orange-500/15 px-4 py-2 text-xs font-black text-orange-100">Alle</div>
                      <div className="rounded-full border border-white/[0.10] bg-white/[0.02] px-4 py-2 text-xs font-black text-white/80">Ungelesen</div>
                      <div className="rounded-full border border-white/[0.10] bg-white/[0.02] px-4 py-2 text-xs font-black text-white/80">Favoriten</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[linear-gradient(180deg,#0c1621_0%,#09131d_100%)] px-2 pb-2 pt-1">
                  {[
                    { name: "EMD Community", message: "Willkommen im EMD Messenger 👋", time: "03:18" },
                    { name: "Vereinsinfo", message: "Aufstellung für Freitag ist online 🎯", time: "22:11" },
                    { name: "Freizeit", message: "Happy Birthday 🎉🍻🎯", time: "Gestern" },
                    { name: "Emoj!'s", message: "Training morgen um 19:00", time: "Mo" },
                  ].map((chat, index) => (
                    <div
                      key={chat.name}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3.5 ${index === 1 ? "bg-white/[0.05]" : ""}`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-orange-300">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black text-white">{chat.name}</div>
                        <div className="truncate text-sm font-semibold text-white/42">{chat.message}</div>
                      </div>
                      <div className="self-start pt-1 text-[11px] font-bold text-white/28">{chat.time}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.07] bg-black/70 px-5 py-4">
                  <div className="grid grid-cols-3 items-end text-center text-[11px] font-bold text-white/50">
                    <div>
                      <div className="text-orange-400">◔</div>
                      <div className="mt-1 text-orange-300">Chats</div>
                    </div>
                    <div>
                      <div>▣</div>
                      <div className="mt-1">Aktuell</div>
                    </div>
                    <div>
                      <div>▤</div>
                      <div className="mt-1">Aufstellung</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/10 bg-black/65 px-4 py-3 shadow-2xl backdrop-blur-xl sm:block">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-400" />
                <div>
                  <div className="text-xs font-black">Schnell erreichbar</div>
                  <div className="text-[10px] font-semibold text-white/35">direkt vom Homescreen</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[26px] border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl transition hover:border-orange-400/20 hover:bg-white/[0.05]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10">
                <Icon className="h-5 w-5 text-orange-400" />
              </div>
              <h2 className="mt-4 text-base font-black">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-white/42">{text}</p>
            </div>
          ))}
        </section>
</div>
    </main>
  )
}

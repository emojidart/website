"use client"

import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
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
    <main className="min-h-screen w-full overflow-x-hidden bg-[#060708] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[16rem] h-[30rem] w-[30rem] rounded-full bg-amber-400/10 blur-[140px]" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-orange-700/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,.15)]">
              <MessageCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-black tracking-[0.18em] text-white">EMD</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">Messenger</div>
            </div>
          </div>
        </header>

        <section className="grid min-w-0 items-center gap-8 pb-10 pt-9 sm:gap-10 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-12 lg:pt-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
              <Sparkles className="h-3.5 w-3.5" /> EMD Messenger
            </div>

            <h1 className="max-w-full break-words text-[clamp(2.55rem,12vw,4.5rem)] font-black leading-[0.96] tracking-[-0.045em]">
              Dein Verein.<br />
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">Deine Nachrichten.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-white/55 sm:mt-6 sm:text-lg sm:leading-7">
              Der EMD Messenger bringt Teamchat, Aufstellungen und wichtige Vereinsinfos direkt auf dein Android-Smartphone – kostenlos für EMD Mitglieder und Gäste.
            </p>

            <div className="mt-7 flex w-full min-w-0 flex-col gap-3 sm:mt-8 sm:flex-row">
              <a href={APK_URL} download className="group inline-flex min-h-14 w-full min-w-0 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 text-center text-[15px] font-black text-white shadow-[0_18px_60px_-20px_rgba(249,115,22,.75)] transition hover:from-orange-400 hover:to-orange-500 active:scale-[.99] sm:w-auto sm:px-6 sm:text-base sm:hover:scale-[1.015]">
                <Download className="mr-2 h-5 w-5" /> Für Android herunterladen
                <ArrowRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </a>
</div>

            <div className="mt-5 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-white/35 sm:text-xs">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-orange-400" /> Android</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-orange-400" /> Kostenlos für EMD Mitglieder und Gäste</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-orange-400" /> Sicherer Mitgliederzugang</span>
            </div>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-[430px] px-0 sm:px-1">
            <div className="absolute inset-0 rounded-[48px] bg-orange-500/20 blur-[80px]" />
            <div className="relative w-full min-w-0 rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.025] p-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] backdrop-blur-2xl sm:rounded-[42px] sm:p-3">
              <div className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0b0d10] sm:rounded-[34px]">
                <div className="bg-[linear-gradient(180deg,#121d29_0%,#0a131d_100%)]">
                  <div className="flex items-start justify-between px-5 pb-4 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_0_28px_rgba(249,115,22,.28)]">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[23px] font-black leading-none text-white sm:text-[27px]">EMD Chat</div>
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
                    <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="rounded-full border border-orange-300/25 bg-orange-500/15 px-4 py-2 text-xs font-black text-orange-100"><span className="whitespace-nowrap">Alle</span></div>
                      <div className="rounded-full border border-white/[0.10] bg-white/[0.02] px-4 py-2 text-xs font-black text-white/80"><span className="whitespace-nowrap">Ungelesen</span></div>
                      <div className="rounded-full border border-white/[0.10] bg-white/[0.02] px-4 py-2 text-xs font-black text-white/80"><span className="whitespace-nowrap">Favoriten</span></div>
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
                      className={`flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3.5 ${index === 1 ? "bg-white/[0.05]" : ""}`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-orange-300">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black text-white">{chat.name}</div>
                        <div className="truncate text-sm font-semibold text-white/42">{chat.message}</div>
                      </div>
                      <div className="shrink-0 self-start pt-1 text-[10px] font-bold text-white/28 sm:text-[11px]">{chat.time}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.07] bg-black/70 px-3 py-3 sm:px-5 sm:py-4">
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

        <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="min-w-0 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl transition hover:border-orange-400/20 hover:bg-white/[0.05] sm:rounded-[26px] sm:p-5">
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

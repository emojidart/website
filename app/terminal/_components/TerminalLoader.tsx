"use client"

function splitLabel(label: string) {
  if (label.endsWith(" wird geöffnet")) {
    return {
      title: label.replace(" wird geöffnet", ""),
      subtitle: "wird geöffnet",
    }
  }

  if (label.endsWith(" wird geladen")) {
    return {
      title: label.replace(" wird geladen", ""),
      subtitle: "wird geladen",
    }
  }

  if (label.endsWith(" wird vorbereitet")) {
    return {
      title: label.replace(" wird vorbereitet", ""),
      subtitle: "wird vorbereitet",
    }
  }

  return {
    title: label,
    subtitle: "bitte kurz warten",
  }
}

export default function TerminalLoader({
  label = "Bereich wird geöffnet",
}: {
  label?: string
}) {
  const parts = splitLabel(label)

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#050608] text-white isolate">
      <div
        className="pointer-events-none absolute inset-0 scale-[1.02] bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.55]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.54),rgba(3,5,8,.78)),radial-gradient(circle_at_18%_80%,rgba(249,115,22,.12),transparent_30%),radial-gradient(circle_at_80%_22%,rgba(34,211,238,.08),transparent_24%)]" />
      <div className="pointer-events-none absolute left-[10%] top-[18%] h-64 w-64 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[10%] h-72 w-72 rounded-full bg-cyan-400/8 blur-[130px]" />

      <div className="relative w-full max-w-[560px] px-6">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-black/28 px-7 py-8 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-[18px] sm:px-10 sm:py-10">
          <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.32em] text-white/48">
            Bitte warten
          </div>

          <div className="mt-7 text-center">
            <div className="flex min-h-[112px] items-center justify-center sm:min-h-[128px]">
              <div
                className={[
                  "line-clamp-2 max-w-[460px] font-black tracking-[-0.045em] text-white",
                  "drop-shadow-[0_8px_30px_rgba(0,0,0,.28)]",
                  parts.title.length > 44
                    ? "text-[clamp(1.65rem,3.6vw,2.45rem)] leading-[1.02]"
                    : parts.title.length > 28
                      ? "text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.0]"
                      : "text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.95]",
                ].join(" ")}
              >
                {parts.title}
              </div>
            </div>
            <div className="mt-3 text-sm font-black uppercase tracking-[0.34em] text-orange-300/88 sm:text-base">
              {parts.subtitle}
            </div>
          </div>

          <div className="mt-8">
            <div className="relative mx-auto h-[4px] w-full max-w-[320px] overflow-hidden rounded-full bg-white/[0.08]">
              <div className="absolute inset-y-0 left-0 w-full origin-left animate-[terminalProgress_2s_cubic-bezier(.2,.8,.2,1)_forwards] rounded-full bg-gradient-to-r from-orange-500 via-orange-300 to-cyan-300 shadow-[0_0_18px_rgba(249,115,22,.45)]" />
            </div>

            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-[loaderDot_1.4s_ease-in-out_infinite] rounded-full bg-orange-300/90" />
              <span className="h-2.5 w-2.5 animate-[loaderDot_1.4s_ease-in-out_.18s_infinite] rounded-full bg-white/65" />
              <span className="h-2.5 w-2.5 animate-[loaderDot_1.4s_ease-in-out_.36s_infinite] rounded-full bg-cyan-300/80" />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes terminalProgress {
          0% { transform: scaleX(0); opacity: .72; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes loaderDot {
          0%, 80%, 100% { transform: translateY(0) scale(.85); opacity: .35; }
          40% { transform: translateY(-4px) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

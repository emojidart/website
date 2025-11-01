"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function IntroPage() {
  const router = useRouter()
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => {
      router.push("/home")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <>
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% { transform: translate(10%, 10%) scale(1.1); opacity: 0.8; }
        }
        
        @keyframes gradient-shift-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% { transform: translate(-10%, -10%) scale(1.1); opacity: 0.8; }
        }
        
        @keyframes particle-float {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(20px, -30px); opacity: 0.8; }
        }
        
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        
        @keyframes orb-float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.1); }
        }
        
        @keyframes orb-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.2; }
        }
        
        @keyframes grid-flow {
          0% { transform: translate(0, 0); }
          100% { transform: translate(100px, 100px); }
        }
        
        @keyframes logo-entrance {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes logo-3d {
          0%, 100% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
          25% { transform: perspective(1000px) rotateY(5deg) rotateX(5deg); }
          50% { transform: perspective(1000px) rotateY(0deg) rotateX(10deg); }
          75% { transform: perspective(1000px) rotateY(-5deg) rotateX(5deg); }
        }
        
        @keyframes logo-reveal {
          0% { opacity: 0; transform: scale(0.5); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        
        @keyframes ring-rotate {
          0% { transform: rotate(0deg) scale(1); opacity: 0.4; }
          50% { transform: rotate(180deg) scale(1.1); opacity: 0.6; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.4; }
        }
        
        @keyframes ring-rotate-reverse {
          0% { transform: rotate(360deg) scale(1); opacity: 0.3; }
          50% { transform: rotate(180deg) scale(1.15); opacity: 0.5; }
          100% { transform: rotate(0deg) scale(1); opacity: 0.3; }
        }
        
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }
        
        @keyframes text-entrance {
          0% { transform: translateY(50px); opacity: 0; filter: blur(10px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3); }
          50% { text-shadow: 0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.5), 0 0 80px rgba(255,255,255,0.3); }
        }
        
        @keyframes letter-float {
          0%, 100% { transform: translateY(0px); text-shadow: 0 0 20px rgba(255,255,255,0.6); }
          50% { transform: translateY(-10px); text-shadow: 0 0 40px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6); }
        }
        
        @keyframes line-expand {
          0% { width: 0; opacity: 0; }
          100% { width: 8rem; opacity: 0.8; }
        }
        
        @keyframes subtitle-reveal {
          0% { opacity: 0; letter-spacing: 1em; }
          100% { opacity: 0.9; letter-spacing: 0.3em; }
        }
        
        @keyframes dots-entrance {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes dot-wave {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.3); }
        }
        
        @keyframes progress-bar {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        
        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }
        
        .animate-gradient-shift-reverse {
          animation: gradient-shift-reverse 10s ease-in-out infinite;
        }
        
        .animate-particle-float {
          animation: particle-float 6s ease-in-out infinite;
        }
        
        .animate-orb-float {
          animation: orb-float 20s ease-in-out infinite;
        }
        
        .animate-orb-float-reverse {
          animation: orb-float-reverse 25s ease-in-out infinite;
        }
        
        .animate-orb-pulse {
          animation: orb-pulse 15s ease-in-out infinite;
        }
        
        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }
        
        .animate-logo-entrance {
          animation: logo-entrance 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        .animate-logo-3d {
          animation: logo-3d 6s ease-in-out infinite;
        }
        
        .animate-logo-reveal {
          animation: logo-reveal 1.2s ease-out 0.3s forwards;
          opacity: 0;
        }
        
        .animate-ring-rotate {
          animation: ring-rotate 8s linear infinite;
        }
        
        .animate-ring-rotate-reverse {
          animation: ring-rotate-reverse 10s linear infinite;
        }
        
        .animate-ring-pulse {
          animation: ring-pulse 4s ease-in-out infinite;
        }
        
        .animate-text-entrance {
          animation: text-entrance 1s ease-out 0.5s forwards;
          opacity: 0;
        }
        
        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }
        
        .animate-letter-float {
          animation: letter-float 2s ease-in-out infinite;
        }
        
        .animate-line-expand {
          animation: line-expand 0.8s ease-out 1.2s forwards;
          width: 0;
        }
        
        .animate-subtitle-reveal {
          animation: subtitle-reveal 1s ease-out 1.5s forwards;
          opacity: 0;
        }
        
        .animate-dots-entrance {
          animation: dots-entrance 0.6s ease-out 1.8s forwards;
          opacity: 0;
        }
        
        .animate-dot-wave {
          animation: dot-wave 1.5s ease-in-out infinite;
        }
        
        .animate-progress-bar {
          animation: progress-bar 5s linear forwards;
        }
      `}</style>

      <div className="fixed inset-0 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/40 via-transparent to-orange-700/40 animate-gradient-shift" />
          <div className="absolute inset-0 bg-gradient-to-tl from-amber-500/30 via-transparent to-orange-600/30 animate-gradient-shift-reverse" />
        </div>

        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/40 rounded-full animate-particle-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}

        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-orb-float" />
          <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl animate-orb-float-reverse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-3xl animate-orb-pulse" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] animate-grid-flow" />

        <div className="relative z-10 flex flex-col items-center gap-12">
          <div className="animate-logo-entrance">
            <div className="relative w-56 h-56 md:w-72 md:h-72">
              <div className="absolute inset-0 bg-white rounded-full blur-3xl opacity-40 animate-ring-rotate" />
              <div className="absolute inset-2 bg-gradient-to-br from-white to-amber-200 rounded-full blur-2xl opacity-30 animate-ring-rotate-reverse" />
              <div className="absolute inset-4 bg-gradient-to-tl from-amber-100 to-white rounded-full blur-xl opacity-20 animate-ring-pulse" />

              <div className="relative w-full h-full bg-white/95 backdrop-blur-xl rounded-3xl border-4 border-white/50 flex items-center justify-center shadow-2xl shadow-black/30 animate-logo-3d">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-3xl" />
                <Image
                  src="/images/emd-logo.png"
                  alt="EMD Dart Logo"
                  width={240}
                  height={240}
                  className="object-contain p-8 animate-logo-reveal relative z-10"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="text-center animate-text-entrance">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-4 tracking-tight drop-shadow-2xl animate-text-glow relative">
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "0ms" }}>
                E
              </span>
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "100ms" }}>
                M
              </span>
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "200ms" }}>
                D
              </span>
              <span className="mx-4" />
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "300ms" }}>
                D
              </span>
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "400ms" }}>
                A
              </span>
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "500ms" }}>
                R
              </span>
              <span className="relative inline-block animate-letter-float" style={{ animationDelay: "600ms" }}>
                T
              </span>
            </h1>
            <div className="h-1 w-32 bg-white/80 mx-auto mb-4 rounded-full animate-line-expand" />
            <p className="text-2xl md:text-3xl text-white/90 font-bold tracking-[0.3em] uppercase animate-subtitle-reveal">
              Salzburg
            </p>
          </div>

          <div className="flex gap-3 animate-dots-entrance">
            <div className="w-3 h-3 bg-white rounded-full animate-dot-wave shadow-lg shadow-white/50" />
            <div
              className="w-3 h-3 bg-white rounded-full animate-dot-wave shadow-lg shadow-white/50"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-3 h-3 bg-white rounded-full animate-dot-wave shadow-lg shadow-white/50"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white via-amber-200 to-white animate-progress-bar origin-left shadow-lg shadow-white/50" />
        </div>
      </div>
    </>
  )
}

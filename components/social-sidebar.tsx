"use client"

import { Facebook, Instagram, Youtube, MessageCircle } from "lucide-react"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

export function SocialSidebar() {
  const socialLinks = [
    {
      name: "Instagram",
      url: "https://www.instagram.com/emojsdartverein/",
      icon: Instagram,
      bgColor: "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500",
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/groups/1902196843213608",
      icon: Facebook,
      bgColor: "bg-blue-600",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/@emojsdartvereinev.9194",
      icon: Youtube,
      bgColor: "bg-red-600",
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@emojizyy3md?_t=8ahlStO563y&_r=1",
      icon: TikTokIcon,
      bgColor: "bg-black",
    },
    {
      name: "WhatsApp",
      url: "https://api.whatsapp.com/send/?phone=436604696464&text&type=phone_number&app_absent=0",
      icon: MessageCircle,
      bgColor: "bg-green-600",
    },
  ]

  return (
    <>
      <div className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 flex-col gap-2">
        {socialLinks.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.bgColor} p-3 text-white hover:scale-110 transition-transform duration-200 shadow-lg group relative`}
              aria-label={link.name}
            >
              <Icon className="w-6 h-6" />
              <span className="absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {link.name}
              </span>
            </a>
          )
        })}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center gap-1 bg-white/95 backdrop-blur-sm shadow-lg py-2 px-2">
        {socialLinks.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.bgColor} p-2.5 text-white hover:scale-105 transition-transform duration-200 shadow-md rounded-lg`}
              aria-label={link.name}
            >
              <Icon className="w-5 h-5" />
            </a>
          )
        })}
      </div>
    </>
  )
}

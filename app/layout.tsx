// layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SplashScreen } from "@/components/splash-screen"
import { PresenceTracker } from "@/components/presence-tracker"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Emoj's Dartverein",
  description: "Offizielle Website des Emoj's Dartvereins",
  generator: "grafikguru",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Emoj's Dartverein",
  },
  icons: {
    apple: "/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d97706" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SplashScreen />
        <PresenceTracker />
        {children}
      </body>
    </html>
  )
}

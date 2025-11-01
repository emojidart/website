import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Emoj's Dartverein",
  description: "Offizielle Website des Emoj's Dartvereins",
  generator: "v0.app",
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

export const viewport: Viewport = {
  themeColor: "#d97706",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}

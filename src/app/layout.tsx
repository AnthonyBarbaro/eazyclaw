import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "EazyClaw",
  description: "Turn your Telegram bot into an AI assistant in minutes.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  )
}

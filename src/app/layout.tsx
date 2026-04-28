import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { MobileNav } from '@/components/layout/MobileNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TripMate | Find your perfect travel companion',
  description: 'Connect with travelers, join group trips, and make local friends.',
  icons: {
    icon: "/icon.svg",
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  )
}

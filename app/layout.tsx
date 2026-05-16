import type { Metadata } from 'next'
import { Anton, Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 Predictor',
  description: 'Predict match results and compete with friends.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="bg-bg-base text-fg-primary font-sans min-h-screen flex flex-col">
        {/* Trophy watermark — sits behind all content */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/images/trophy-bg.avif')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
            opacity: 0.12,
            zIndex: 0,
          }}
        />
        {/* All page content sits above the watermark */}
        <div className="relative flex flex-col min-h-screen" style={{ zIndex: 1 }}>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
